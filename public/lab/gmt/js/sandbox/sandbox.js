// Aba Sandbox: edita uma cópia lógica do modelo (projeto = base + edições) e mostra o impacto em
// quantidade, m² e custo. O modelo da base nunca é alterado de forma permanente: ao sair da aba,
// tudo volta ao original; as edições ficam no projeto (autosave, arquivo, link).
import * as THREE from 'three';
import { PECA, PECAS_BASE, SISTEMAS, CATEGORIAS_CABO, INSTALACOES, construir, comprimentoCabo } from '../model/parts.js';
import { alturaTerreno } from '../model/site.js';
import { obterExterno } from '../model/externos.js';
import { miniatura } from '../ui/miniaturas.js';
import { SUBS } from '../model/subsistemas.js';
import { materiais, esc } from '../data.js';
import { fmt, fmtA, aviso, DEG } from '../util.js';
import { fmtUSD, nomeMat, corMat, quantitativos } from '../architecture/bom.js';
import { modoCinza } from '../wind/windview.js';
import * as P from './projeto.js';
import * as C from './calculo.js';
import * as X from './exportar.js';
import * as MD from './modelos.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const arred = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const MINUSCULA = new THREE.Matrix4().makeScale(1e-5, 1e-5, 1e-5);
const PASSO_CHAO = 2;      // m entre pontos de um trecho que segue o terreno
const ACIMA_CHAO = 0.15;   // m: o cabo fica logo acima do terreno
const R_PAREDE = 31;       // m: raio externo do enclosure (parede inferior em 30,6 m) + folga
const R_CONTORNO = 32;     // m: raio do contorno quando a rota precisa dar a volta no enclosure
// estruturas externas que podem ser origem de uma rota pelo chão: [id da peça, cópia, nome]
const ORIGENS = {
  ssb: ['ssb', 0, 'SSB'], sub: ['sub', 0, 'SUB'], tanque: ['tanque-agua', 0, 'Tanque de água'],
  torre1: ['torre-ambiental', 0, 'Torre ambiental 1'], torre2: ['torre-ambiental', 1, 'Torre ambiental 2'],
};
const DESTINOS = { porta: 'Porta do enclosure', parede: 'Parede do enclosure' };

export function criarSandbox({ renderer, scene, camera, controls, composer, modelo, sitio = null }) {
  const pais = { fixo: modelo.fixo, az: modelo.az, el: modelo.el, domo: modelo.domo };
  const nomePai = new Map(Object.entries(pais).map(([k, g]) => [g, k]));
  const cortaveis = new Set(modelo.cortaveis);
  const cinzas = new Map();
  let projeto = null, hist = null, ativo = false, iniciado = false;
  let ferramenta = 'navegar';
  let catAtual = 'energia', instAtual = 'estrutura', filtroLista = 'todas', modeloAtual = null, avisouSalvar = false;
  const terreno = sitio?.terreno ?? null, terrenoGrupo = sitio?.terrenoGrupo ?? null, cinzasTerreno = new Map();
  let base = null, res = null, semPrecos = null, comparacao = null, imp = {};

  // =====================================================================
  // Registro das cópias do modelo (para selecionar, esconder e mover)
  // =====================================================================
  const copias = [], porChave = new Map(), daMalha = new Map();
  function registrar() {
    const cont = {};
    const prox = (id) => `${id}:${(cont[id] = (cont[id] ?? -1) + 1)}`;
    const visitar = (o) => {
      const id = o.userData.peca;
      if (id && !o.isMesh && PECA[id]) {
        if (o.userData.copias) {
          const malhas = o.children.filter((m) => m.isInstancedMesh && m.userData.pares);
          const n = o.userData.copias;
          if (!malhas.length) return;
          const nl0 = malhas[0].count / n;
          const entradas = [];
          for (let c = 0; c < n; c++) {
            const M = malhas[0].userData.pares[c * nl0][0];
            const e = { chave: prox(id), peca: id, tipo: 'inst', grupo: o, copia: c, n, malhas, M, orig: M.clone() };
            entradas.push(e); copias.push(e); porChave.set(e.chave, e);
          }
          for (const m of malhas) daMalha.set(m, { entradas, nl: m.count / n });
        } else {
          const e = { chave: prox(id), peca: id, tipo: 'obj', obj: o, orig: [o.position.clone(), o.quaternion.clone(), o.scale.clone()] };
          copias.push(e); porChave.set(e.chave, e);
          o.traverse((m) => { if (m.isMesh) daMalha.set(m, e); });
        }
        return;
      }
      for (const f of o.children) visitar(f);
    };
    visitar(modelo.raiz);
  }
  const _t = new THREE.Matrix4();
  function matrizInst(e, M) {
    e.M.copy(M);
    for (const m of e.malhas) {
      const nl = m.count / e.n;
      for (let l = 0; l < nl; l++) {
        const i = e.copia * nl + l;
        m.setMatrixAt(i, _t.copy(e.M).multiply(m.userData.pares[i][1]));
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.computeBoundingBox?.();
    }
  }
  const matrizDe = (e) => (e.tipo === 'inst' ? e.M.clone() : (e.obj.updateMatrix(), e.obj.matrix.clone()));
  const paiDe = (e) => (e.tipo === 'inst' ? e.grupo : e.obj.parent);

  // =====================================================================
  // Aplicar as edições no 3D (e desfazer tudo ao sair)
  // =====================================================================
  const sobreposicoes = [];   // objetos criados pelo Sandbox
  const alteradas = new Set(); // cópias escondidas ou movidas
  function reverterVisual() {
    for (const o of sobreposicoes) {
      o.parent?.remove(o);
      o.traverse((m) => { if (m.isMesh && m.userData.descartavel) m.geometry.dispose(); });
    }
    sobreposicoes.length = 0;
    for (const e of alteradas) {
      if (e.tipo === 'inst') matrizInst(e, e.orig);
      else { e.obj.visible = true; e.obj.position.copy(e.orig[0]); e.obj.quaternion.copy(e.orig[1]); e.obj.scale.copy(e.orig[2]); }
    }
    alteradas.clear();
  }
  function sobrepor(obj, pai, edicaoId) {
    obj.userData.sandbox = edicaoId;
    obj.traverse((m) => { if (m.isMesh) { m.userData.sandbox = edicaoId; m.userData.semCinza = true; m.userData.descartavel = !m.userData.compartilhada; m.castShadow = m.receiveShadow = true; } });
    pai.add(obj);
    sobreposicoes.push(obj);
    return obj;
  }
  const matrizDeEdicao = (e) => (e.matriz ? new THREE.Matrix4().fromArray(e.matriz)
    : new THREE.Matrix4().compose(V(...e.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(e.rot[0] * DEG, e.rot[1] * DEG, e.rot[2] * DEG, 'YXZ')), V(1, 1, 1)));

  function aplicarVisual() {
    reverterVisual();
    if (!ativo) return;
    const params = {};
    for (const e of projeto.edicoes) if (e.ativo && e.tipo === 'parametro') params[e.peca] = { ...params[e.peca], ...e.valores };
    // planta: troca as cópias soltas do tipo pela versão com os novos parâmetros
    for (const [id, op] of Object.entries(params)) {
      for (const c of copias) {
        if (c.peca !== id || c.tipo !== 'obj') continue;
        c.obj.visible = false; alteradas.add(c);
        const novo = construir(id, false, op);
        novo.position.copy(c.obj.position); novo.quaternion.copy(c.obj.quaternion); novo.scale.copy(c.obj.scale);
        novo.userData.substitui = c.chave;
        sobrepor(novo, c.obj.parent, `param:${id}`);
      }
    }
    for (const e of projeto.edicoes) {
      if (!e.ativo) continue;
      if (e.tipo === 'remover' && porChave.has(e.chave)) {
        const c = porChave.get(e.chave);
        if (c.tipo === 'inst') matrizInst(c, MINUSCULA); else c.obj.visible = false;
        alteradas.add(c);
        // a versão paramétrica (se houver) também some
        for (const o of sobreposicoes) if (o.userData.substitui === c.chave) o.visible = false;
      }
      if (e.tipo === 'mover' && porChave.has(e.chave)) {
        const c = porChave.get(e.chave), M = new THREE.Matrix4().fromArray(e.matriz);
        if (c.tipo === 'inst') matrizInst(c, M);
        else M.decompose(c.obj.position, c.obj.quaternion, c.obj.scale);
        alteradas.add(c);
        for (const o of sobreposicoes) if (o.userData.substitui === c.chave) M.decompose(o.position, o.quaternion, o.scale);
      }
      if (e.tipo === 'adicionar') {
        const g = construir(e.peca, false, { ...params[e.peca], ...e.opcoes });
        matrizDeEdicao(e).decompose(g.position, g.quaternion, g.scale);
        sobrepor(g, pais[e.ancora], e.id);
      }
      if (e.tipo === 'externo') {
        const g = construir('modelo-externo', false, C.opcoesExterno(e));
        matrizDeEdicao(e).decompose(g.position, g.quaternion, g.scale);
        sobrepor(g, pais[e.ancora], e.id);
      }
      if (e.tipo === 'cabo') {
        const g = construir('trecho-cabo', false, C.opcoesCabo(e));
        if (!e.pontos) g.position.set(...e.pos);
        sobrepor(g, pais[e.ancora], e.id);
        if (e.eletrocalha) {
          const k = construir('eletrocalha', false, C.opcoesCalha(e));
          if (!e.pontos) k.position.set(...e.pos);
          sobrepor(k, pais[e.ancora], e.id);
        }
      }
    }
    // o TransformControls pode ter ficado preso a um objeto recriado: religa ao novo (ou solta)
    if (tc?.object && !tc.object.parent) {
      const o = objetoSel();
      if (o) tc.attach(o); else soltarTC();
    }
    atualizarSelecaoVisual();
  }

  // =====================================================================
  // Projeto: commit, desfazer, autosave, recálculo
  // =====================================================================
  let tSalvar = 0, tCalc = 0, tImp = 0;
  function commit(msg) {
    projeto.atualizado = new Date().toISOString();
    hist.registrar(projeto);
    clearTimeout(tSalvar);
    tSalvar = setTimeout(salvar, 300);
    atualizarTudo();
    if (msg) aviso(msg);
  }
  function atualizarTudo() {
    aplicarVisual();
    agendarCalculo();
    desenharLista();
    sincronizarCampos();
  }
  /** Projeto como vai para arquivo e autosave: só com os modelos 3D que alguma edição usa. */
  function paraArquivo() {
    const usados = new Set(projeto.edicoes.filter((e) => e.tipo === 'externo').map((e) => e.modelo));
    return { ...projeto, modelos: Object.fromEntries(Object.entries(projeto.modelos ?? {}).filter(([h]) => usados.has(h))) };
  }
  function salvar() {
    if (P.salvarLocal(paraArquivo()) || avisouSalvar) return;
    avisouSalvar = true;
    aviso('O projeto ficou grande demais para o salvamento automático do navegador (modelos 3D). Exporte o arquivo .gmt.json para não perder.');
  }
  async function trocarProjeto(p, msg) {
    const falhas = await MD.carregarModelos(p);
    soltarTC();
    projeto = p;
    sel = null;
    cancelarCabo();
    commit(msg);
    if (falhas.length) setTimeout(() => aviso(`Modelo(s) 3D não lido(s): ${falhas.join('; ')}`), 2300);
  }
  function voltarPara(p, msg) {
    soltarTC();
    p.modelos = { ...p.modelos, ...projeto.modelos }; // o histórico não guarda os modelos
    projeto = p; sel = null;
    salvar(); atualizarTudo(); aviso(msg);
  }
  function desfazer() { const p = hist.desfazer(); if (p) voltarPara(p, 'Desfeito'); }
  function refazer() { const p = hist.refazer(); if (p) voltarPara(p, 'Refeito'); }
  const edicao = (id) => projeto.edicoes.find((e) => e.id === id);
  function addEdicao(e, msg) {
    const v = P.validarEdicao({ ...e, id: P.novoId() });
    if (!v) { aviso('Edição inválida.'); return null; }
    projeto.edicoes.push(v);
    commit(msg);
    return v;
  }
  function removerEdicao(id) {
    projeto.edicoes = projeto.edicoes.filter((e) => e.id !== id);
    if (sel?.edicao === id) sel = null;
    commit('Edição excluída');
  }

  function agendarCalculo() {
    clearTimeout(tCalc);
    tCalc = setTimeout(recalcular, 60);
  }
  function recalcular() {
    if (!base) base = C.calcular(C.projetoVazio(projeto));
    res = C.calcular(projeto);
    semPrecos = Object.keys(projeto.precos).length ? C.calcular(projeto, { semPrecos: true }) : res;
    mostrarResultados();
    clearTimeout(tImp);
    tImp = setTimeout(() => { imp = C.impactos(projeto, res.custo); desenharLista(); desenharBarras(); }, 350);
  }

  // =====================================================================
  // Painel de resultados
  // =====================================================================
  const brl = (x) => X.brl(x, res.cambio);
  function mostrarResultados() {
    const dC = res.custo - base.custo;
    const caboB = Object.keys(CATEGORIAS_CABO).reduce((s, k) => s + base.cabos[k], 0);
    const caboE = Object.keys(CATEGORIAS_CABO).reduce((s, k) => s + res.cabos[k], 0);
    const partes = [];
    partes.push(`<b>${X.usdDif(dC)}</b> <span>(${dC >= 0 ? '+' : ''}${brl(dC)})</span>`);
    if (Math.abs(caboE - caboB) > 1e-6) partes.push(`<b>${C.dif(caboB, caboE, 'm')}</b> de cabo`);
    if (Math.abs(res.areas.planta - base.areas.planta) > 1e-6) partes.push(`<b>${C.dif(base.areas.planta, res.areas.planta, 'm²')}</b> de planta`);
    if (Math.abs(res.areas.calha - base.areas.calha) > 1e-6) partes.push(`<b>${C.dif(base.areas.calha, res.areas.calha, 'm²')}</b> de eletrocalha`);
    if (Math.abs(res.massa - base.massa) > 1e-6) partes.push(`<b>${C.dif(base.massa, res.massa, 't')}</b>`);
    $('sbManchete').innerHTML = projeto.edicoes.some((e) => e.ativo) || Object.keys(projeto.precos).length
      ? `Sua versão custa ${partes.join(' · ')}`
      : 'Sem edições ainda: escolha uma ferramenta à esquerda. Os números abaixo são a obra base.';
    const dEd = semPrecos.custo - base.custo, dPr = res.custo - semPrecos.custo;
    const num = (v, r, sub = '') => `<div class="num"><b>${v}</b><small>${r}</small>${sub ? `<small>${sub}</small>` : ''}</div>`;
    $('sbNums').innerHTML = [
      num(fmtUSD(res.custo), 'custo da obra editada', brl(res.custo)),
      num(X.usdDif(dEd), 'por edições', 'peças, quantidades, cabos, planta'),
      num(X.usdDif(dPr), 'por preços do cliente', `${Object.keys(projeto.precos).length} preço(s) trocado(s)`),
      num(`${fmtA(caboE)} m`, 'cabo cobrado (todas as categorias)', `base ${fmtA(caboB)} m`),
      num(`${fmtA(res.areas.planta)} m²`, 'área de planta', `base ${fmtA(base.areas.planta)} m²`),
      num(`${fmtA(res.massa)} t`, 'massa total', C.dif(base.massa, res.massa, 't')),
    ].join('');
    const linhas = C.linhasMetricas(res).map(([rot, un, f]) => {
      const a = f(base), b = f(res);
      if (!a && !b) return '';
      const mudou = Math.abs(b - a) > 1e-9;
      return `<tr${mudou ? ' class="mudou"' : ''}><td>${esc(rot)}</td><td class="n">${fmtA(a)} ${un}</td><td class="n">${fmtA(b)} ${un}</td><td class="n">${mudou ? C.dif(a, b, un) : '–'}</td><td class="n">${C.difPct(a, b)}</td></tr>`;
    }).join('');
    $('sbTabMet').innerHTML = `<thead><tr><th>Métrica</th><th>Base</th><th>Editado</th><th>Diferença</th><th>%</th></tr></thead><tbody>${linhas}
      <tr class="${Math.abs(dC) > 0.5 ? 'mudou' : ''}"><td>Custo total</td><td class="n">${fmtUSD(base.custo)}</td><td class="n">${fmtUSD(res.custo)}</td><td class="n">${Math.abs(dC) > 0.5 ? X.usdDif(dC) : '–'}</td><td class="n">${C.difPct(base.custo, res.custo)}</td></tr></tbody>`;
    desenharBarras();
    $('sbTabSis').innerHTML = `<thead><tr><th>Sistema</th><th>Base</th><th>Editado</th><th>Diferença</th></tr></thead><tbody>${SISTEMAS.map((s) => {
      const a = base.custoSis[s], b = res.custoSis[s], m = Math.abs(b - a) > 0.5;
      return `<tr${m ? ' class="mudou"' : ''}><td>${esc(s)}</td><td class="n">${fmtUSD(a)}</td><td class="n">${fmtUSD(b)}</td><td class="n">${m ? X.usdDif(b - a) : '–'}</td></tr>`;
    }).join('')}</tbody>`;
    mostrarComparacao();
  }
  /** Barras divergentes (diferença de custo por sistema) e composição do custo das edições. */
  function desenharBarras() {
    const difs = SISTEMAS.map((s) => [s, res.custoSis[s] - base.custoSis[s]]);
    const max = Math.max(...difs.map(([, d]) => Math.abs(d)));
    $('sbBarSis').innerHTML = max < 0.5 ? '<p class="dica">Nenhum sistema mudou de custo.</p>' : difs.map(([s, d]) => {
      const w = Math.abs(d) < 0.5 ? 0 : Math.max(2, (Math.abs(d) / max) * 50);
      return `<div class="sb-div${d < -0.5 ? ' menos' : d > 0.5 ? ' mais' : ''}"><span class="rot">${esc(s)}</span>
        <span class="trilho"><i style="${d < 0 ? 'right:50%' : 'left:50%'};width:${w}%"></i></span><span class="val">${Math.abs(d) < 0.5 ? '–' : X.usdDif(d)}</span></div>`;
    }).join('');
    // composição: impacto das edições ativas agrupado por tipo (|valor|, com sinal na legenda)
    const grupos = {};
    for (const e of projeto.edicoes) {
      if (!e.ativo || !imp[e.id]) continue;
      const k = e.tipo === 'cabo' ? (C.soOrcamento(e) ? 'cabo-orc' : 'cabo') : e.tipo;
      grupos[k] = (grupos[k] ?? 0) + imp[e.id].custo;
    }
    const dPr = res.custo - semPrecos.custo;
    if (Math.abs(dPr) > 0.5) grupos.precos = dPr;
    const ent = Object.entries(grupos).filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const tot = ent.reduce((t, [, v]) => t + Math.abs(v), 0);
    const nome = (k) => ({ 'cabo-orc': 'Cabo (só orçamento)', precos: 'Preços do cliente' })[k] ?? C.ROTULO_TIPO[k];
    $('sbComposicao').innerHTML = !ent.length ? '' : `<h3>De onde vem a diferença</h3>
      <div class="sb-comp-barra">${ent.map(([k, v]) => `<span class="t-${k}" style="width:${(Math.abs(v) / tot) * 100}%" title="${esc(nome(k))}: ${X.usdDif(v)}"></span>`).join('')}</div>
      <ul class="sb-comp-leg">${ent.map(([k, v]) => `<li><i class="t-${k}"></i>${esc(nome(k))} <b>${X.usdDif(v)}</b></li>`).join('')}</ul>`;
  }
  function mostrarComparacao() {
    const el = $('sbComp');
    if (!comparacao) { el.hidden = true; return; }
    const { nome, r } = comparacao;
    const linhas = C.linhasMetricas(res).map(([rot, un, f]) => {
      const a = f(res), b = f(r);
      if (!a && !b) return '';
      return `<tr${Math.abs(b - a) > 1e-9 ? ' class="mudou"' : ''}><td>${esc(rot)}</td><td class="n">${fmtA(a)} ${un}</td><td class="n">${fmtA(b)} ${un}</td><td class="n">${C.dif(a, b, un)}</td></tr>`;
    }).join('');
    el.hidden = false;
    el.innerHTML = `<h3>Comparação: esta versão × "${esc(nome)}"</h3>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Métrica</th><th>Esta versão</th><th>Arquivo</th><th>Diferença</th></tr></thead><tbody>${linhas}
      <tr class="mudou"><td>Custo total</td><td class="n">${fmtUSD(res.custo)}</td><td class="n">${fmtUSD(r.custo)}</td><td class="n">${X.usdDif(r.custo - res.custo)}</td></tr>
      ${SISTEMAS.map((s) => `<tr><td>· ${esc(s)}</td><td class="n">${fmtUSD(res.custoSis[s])}</td><td class="n">${fmtUSD(r.custoSis[s])}</td><td class="n">${X.usdDif(r.custoSis[s] - res.custoSis[s])}</td></tr>`).join('')}
      </tbody></table></div><div class="linha-btn"><button type="button" id="sbCompFechar">Fechar comparação</button></div>`;
    $('sbCompFechar').onclick = () => { comparacao = null; mostrarComparacao(); };
  }

  // =====================================================================
  // Lista de edições
  // =====================================================================
  function desenharLista() {
    const n = projeto.edicoes.length;
    $('sbEdN').textContent = n ? `(${n})` : '';
    $('sbDesfazer').disabled = !hist.podeDesfazer();
    $('sbRefazer').disabled = !hist.podeRefazer();
    const visiveis = projeto.edicoes.filter((e) => filtroLista === 'todas' || (filtroLista === 'orcamento') === C.soOrcamento(e));
    $('sbFiltro').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtroLista)));
    $('sbLista').innerHTML = !n ? '<li class="vazio">Nenhuma edição. O projeto é igual à base.</li>'
      : !visiveis.length ? '<li class="vazio">Nenhuma edição neste filtro.</li>'
      : visiveis.map((e) => `<li data-id="${e.id}" class="${e.ativo ? '' : 'off'}${sel?.edicao === e.id ? ' sel' : ''}">
      <label class="sb-liga" title="Liga/desliga esta edição"><input type="checkbox" data-acao="ativo" ${e.ativo ? 'checked' : ''} aria-label="Edição ativa"></label>
      ${iconeEdicao(e)}
      <div class="sb-ed">
        <span class="sb-selos"><span class="sb-tipo t-${e.tipo}">${C.ROTULO_TIPO[e.tipo]}</span>${C.soOrcamento(e) ? '<span class="sb-onde orc" title="Entra no orçamento, sem desenho no 3D (aparece como um marcador)">só orçamento</span>' : ['remover', 'quantidade', 'parametro', 'material'].includes(e.tipo) ? '' : '<span class="sb-onde" title="Desenhado no modelo 3D">no modelo</span>'}</span>
        <input type="text" data-acao="nome" value="${esc(e.nome || '')}" placeholder="Dar um nome…" maxlength="140" aria-label="Nome da edição">
        <small>${esc(C.descrever(e))}</small>
        <small class="sb-imp">${e.ativo ? (imp[e.id] ? X.usdDif(imp[e.id].custo) : '…') : 'desligada'}</small>
      </div>
      <div class="sb-ed-acoes">
        ${podeFocar(e) ? '<button type="button" data-acao="focar" title="Selecionar no modelo" aria-label="Selecionar no modelo">◎</button>' : ''}
        <button type="button" data-acao="excluir" title="Excluir edição" aria-label="Excluir edição">×</button>
      </div></li>`).join('');
    preencherMiniaturas($('sbLista'));
    desenharSemDesenho();
  }
  const pecaDaEdicao = (e) => (e.peca ? e.peca : null);
  /** Ícone da edição: miniatura da peça, cor do cabo ou cubo do modelo importado. */
  function iconeEdicao(e) {
    if (e.tipo === 'cabo') return `<span class="sb-ico cabo${C.soOrcamento(e) ? ' orc' : ''}" style="--c:${CATEGORIAS_CABO[e.categoria]?.cor ?? '#888'}" aria-hidden="true"></span>`;
    if (e.tipo === 'externo') return '<span class="sb-ico ext" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2 3 7v10l9 5 9-5V7z M3 7l9 5 9-5 M12 12v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>';
    const id = pecaDaEdicao(e);
    return id ? `<img class="sb-ico" alt="" data-mini-sb="${id}" hidden><span class="sb-ico ph" aria-hidden="true"></span>` : '<span class="sb-ico ph" aria-hidden="true"></span>';
  }
  /** Troca os espaços reservados [data-mini-sb] pelas miniaturas (geradas aos poucos, em cache). */
  function preencherMiniaturas(raiz) {
    raiz.querySelectorAll('img[data-mini-sb][hidden]').forEach((img) => {
      miniatura(img.dataset.miniSb).then((url) => {
        if (!img.isConnected) return;
        img.src = url; img.hidden = false;
        if (img.nextElementSibling?.classList.contains('ph')) img.nextElementSibling.remove();
      }).catch(() => { /* sem WebGL: fica o espaço reservado */ });
    });
  }
  const podeFocar = (e) => ['cabo', 'adicionar', 'externo', 'mover', 'remover'].includes(e.tipo) && (['cabo', 'adicionar', 'externo'].includes(e.tipo) || porChave.has(e.chave));
  $('sbLista').addEventListener('change', (ev) => {
    const li = ev.target.closest('li[data-id]'), e = li && edicao(li.dataset.id);
    if (!e) return;
    if (ev.target.dataset.acao === 'ativo') { e.ativo = ev.target.checked; commit(e.ativo ? 'Edição ligada' : 'Edição desligada'); }
    if (ev.target.dataset.acao === 'nome') { e.nome = ev.target.value.slice(0, 140); commit(); }
  });
  $('sbLista').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-acao]');
    const li = ev.target.closest('li[data-id]');
    if (!b || !li) return;
    const e = edicao(li.dataset.id);
    if (b.dataset.acao === 'excluir') removerEdicao(li.dataset.id);
    if (b.dataset.acao === 'focar' && e) {
      setFerramenta('selecionar');
      if (['cabo', 'adicionar', 'externo'].includes(e.tipo)) selecionar({ edicao: e.id });
      else if (porChave.has(e.chave)) selecionar({ copia: porChave.get(e.chave) });
    }
  });

  // =====================================================================
  // Interação no 3D: raio, ferramentas, pré-visualização
  // =====================================================================
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const visivel = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const ehPrevia = (o) => { for (; o; o = o.parent) if (o.userData.previa) return true; return false; };
  function alvo(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const alvos = terrenoVisivel() ? [modelo.raiz, terreno] : [modelo.raiz];
    for (const h of ray.intersectObjects(alvos, true)) {
      if (!h.object.isMesh || !visivel(h.object) || ehPrevia(h.object)) continue;
      if (cortaveis.has(h.object) && modelo.cortado(h.point)) continue;
      h.chao = h.object === terreno;
      return h;
    }
    return null;
  }

  // ---------- terreno (cinza, para traçar cabos pelo chão) ----------
  const terrenoVisivel = () => !!terreno && ativo && $('sbTerreno').checked;
  function mostrarTerreno() {
    if (!terrenoGrupo) return;
    const ligar = ativo && $('sbTerreno').checked;
    terrenoGrupo.visible = ligar;
    modoCinza(terrenoGrupo, ligar, cinzasTerreno);
  }
  /** Ponto no chão (mundo x, z) no referencial de uma âncora, logo acima do terreno. */
  function pontoNoChao(x, z, ancora = 'fixo') {
    pais[ancora].updateMatrixWorld(true);
    const l = pais[ancora].worldToLocal(V(x, alturaTerreno(x, z) + ACIMA_CHAO, z));
    return [arred(l.x), arred(l.y), arred(l.z)];
  }
  const mundo = (p, ancora) => pais[ancora].localToWorld(V(...p));
  /** Pontos intermediários (a cada ~2 m) entre a e b acompanhando o terreno; não inclui a, inclui b. */
  function seguirTerreno(a, b, ancora, max = 280) {
    const A = mundo(a, ancora), B = mundo(b, ancora);
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    const n = Math.max(1, Math.min(max, Math.ceil(d / PASSO_CHAO)));
    const r = [];
    for (let i = 1; i < n; i++) r.push(pontoNoChao(A.x + ((B.x - A.x) * i) / n, A.z + ((B.z - A.z) * i) / n, ancora));
    r.push(b);
    return r;
  }
  function paiDoAcerto(o) {
    for (; o; o = o.parent) if (nomePai.has(o)) return nomePai.get(o);
    return 'fixo';
  }
  function identificar(h) {
    for (let o = h.object; o; o = o.parent) if (o.userData.sandbox) {
      const id = o.userData.sandbox;
      if (id.startsWith('param:')) { const c = porChave.get(o.userData.substitui); return c ? { copia: c } : null; }
      return { edicao: id };
    }
    const d = daMalha.get(h.object);
    if (!d) return null;
    if (d.entradas) return h.instanceId != null ? { copia: d.entradas[Math.floor(h.instanceId / d.nl)] } : null;
    return { copia: d };
  }

  // ---------- cabo ----------
  const cabo = { pontos: [], ancora: null, hover: null, chao: false, cliques: [] };
  const previa = new THREE.Group();
  previa.userData.previa = true;
  const matPrevia = new THREE.LineBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true });
  const linhaPrevia = new THREE.Line(new THREE.BufferGeometry(), matPrevia);
  linhaPrevia.renderOrder = 999; linhaPrevia.frustumCulled = false;
  const geoPonto = new THREE.SphereGeometry(0.22, 12, 8);
  const matPonto = new THREE.MeshBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true });
  const cursor = new THREE.Mesh(geoPonto, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.85 }));
  cursor.renderOrder = 999; cursor.userData.previa = true; cursor.visible = false;
  scene.add(cursor);
  previa.add(linhaPrevia);

  function pontoLocal(h, ancora) {
    if (h.chao) {
      // no terreno: a grade vale em x/z e a altura acompanha o chão
      let x = h.point.x, z = h.point.z;
      if ($('sbGrade').checked) { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
      return pontoNoChao(x, z, ancora);
    }
    // um pouco para fora da superfície (na direção da câmera) para o cabo não sumir dentro da peça
    const p = h.point.clone().addScaledVector(ray.ray.direction, -0.12);
    pais[ancora].updateMatrixWorld(true);
    const l = pais[ancora].worldToLocal(p);
    if ($('sbGrade').checked) l.set(Math.round(l.x * 2) / 2, Math.round(l.y * 2) / 2, Math.round(l.z * 2) / 2);
    const ant = cabo.pontos[cabo.pontos.length - 1];
    if ($('sbOrto').checked && ant) {
      const d = [l.x - ant[0], l.y - ant[1], l.z - ant[2]].map(Math.abs);
      const k = d.indexOf(Math.max(...d));
      const q = [...ant]; q[k] = [l.x, l.y, l.z][k];
      l.set(...q);
    }
    return [arred(l.x), arred(l.y), arred(l.z)];
  }
  function desenharPrevia() {
    const pts = [...cabo.pontos];
    if (cabo.hover) pts.push(cabo.hover);
    linhaPrevia.geometry.setFromPoints(pts.map((p) => V(...p)));
    while (previa.children.length > 1) previa.remove(previa.children[1]);
    for (const p of cabo.pontos) { const s = new THREE.Mesh(geoPonto, matPonto); s.renderOrder = 999; s.position.set(...p); previa.add(s); }
    if (cabo.ancora && previa.parent !== pais[cabo.ancora]) pais[cabo.ancora].add(previa);
    if (!cabo.ancora) previa.parent?.remove(previa);
    const L = comprimentoCabo({ pontos: pts });
    const feixe = Math.max(1, +$('sbFeixe').value || 1), folga = Math.max(0, +$('sbFolga').value || 0);
    $('sbCaboStatus').textContent = cabo.pontos.length
      ? `${cabo.cliques.length} clique(s) · ${fmt(L, 1)} m de caminho · ${fmt(L * feixe * (1 + folga / 100), 1)} m cobrados. Enter conclui.`
      : 'Clique numa superfície do modelo ou no terreno para pôr o primeiro ponto.';
  }
  function cancelarCabo() {
    cabo.pontos = []; cabo.ancora = null; cabo.hover = null; cabo.chao = false; cabo.cliques = [];
    desenharPrevia();
  }
  /** Novo clique do cabo. Dois cliques seguidos no chão: o trecho entre eles segue o terreno. */
  function porPonto(h) {
    if (!cabo.ancora) cabo.ancora = paiDoAcerto(h.object);
    const p = pontoLocal(h, cabo.ancora);
    const ant = cabo.pontos[cabo.pontos.length - 1];
    const novos = h.chao && cabo.chao && ant ? seguirTerreno(ant, p, cabo.ancora) : [p];
    if (cabo.pontos.length + novos.length > 300) { aviso('Máximo de 300 pontos por trecho: conclua este e comece outro.'); return; }
    cabo.cliques.push({ n: cabo.pontos.length, chao: cabo.chao });
    cabo.pontos.push(...novos);
    cabo.chao = h.chao;
    cabo.hover = null;
    desenharPrevia();
  }
  function voltarPonto() {
    const c = cabo.cliques.pop();
    if (!c) return;
    cabo.pontos.length = c.n; cabo.chao = c.chao;
    if (!cabo.pontos.length) cabo.ancora = null;
    desenharPrevia();
  }
  function concluirCabo() {
    if (cabo.pontos.length < 2) { aviso('O trecho precisa de pelo menos 2 pontos.'); return; }
    const e = addEdicao({ tipo: 'cabo', ...configCabo(), ancora: cabo.ancora, pontos: cabo.pontos }, `Trecho de cabo adicionado (${fmt(comprimentoCabo({ pontos: cabo.pontos }), 1)} m)`);
    cancelarCabo();
    if (e) $('sbCaboNome').value = '';
  }
  function configCabo() {
    return {
      categoria: catAtual, instalacao: instAtual, feixe: +$('sbFeixe').value || 1, folga_pct: +$('sbFolga').value || 0,
      sistema: $('sbSis').value, nome: $('sbCaboNome').value.trim(),
      eletrocalha: $('sbCalha').checked ? { largura_m: (+$('sbCalhaLarg').value || 30) / 100 } : null,
    };
  }

  // ---------- rota pelo chão (estrutura externa -> enclosure) ----------
  /** Caixa (mundo) de uma cópia da base, com mover e planta aplicados. Null se a cópia foi removida. */
  function caixaCopia(c) {
    modelo.raiz.updateMatrixWorld(true);
    if (projeto.edicoes.some((e) => e.ativo && e.tipo === 'remover' && e.chave === c.chave)) return null;
    const box = new THREE.Box3();
    if (c.tipo === 'obj') {
      const sub = sobreposicoes.find((o) => o.userData.substitui === c.chave);
      return box.setFromObject(sub ?? c.obj);
    }
    for (const m of c.malhas) {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const nl = m.count / c.n;
      for (let l = 0; l < nl; l++) {
        m.getMatrixAt(c.copia * nl + l, _m);
        box.union(_b.copy(m.geometry.boundingBox).applyMatrix4(_m.premultiply(m.matrixWorld)));
      }
    }
    return box;
  }
  const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // normaliza em (−π, π]
  /**
   * Trecho de cabo pelo chão, da estrutura de origem até a porta (ou a parede mais próxima) do enclosure.
   * Sai da borda da estrutura em linha reta; se a reta cruzaria o enclosure, contorna a parede.
   */
  function rotaPeloChao(origem, destino) {
    let S, box = null, nomeO;
    if (origem === 'ponto') {
      if (!cabo.pontos.length) throw new Error('Clique primeiro no terreno para marcar a origem, depois gere a rota.');
      S = mundo(cabo.pontos[0], cabo.ancora); nomeO = 'ponto clicado';
    } else {
      const [id, k, nome] = ORIGENS[origem] ?? [];
      const c = copias.filter((x) => x.peca === id)[k];
      box = c ? caixaCopia(c) : null;
      if (!box || box.isEmpty()) throw new Error(`${nome ?? origem} não está no modelo (foi removido?).`);
      S = box.getCenter(V()); nomeO = nome;
    }
    const rS = Math.hypot(S.x, S.z);
    if (rS < R_CONTORNO + 0.5) throw new Error('A origem fica junto ou dentro do enclosure: use a ferramenta Cabo.');
    const thS = Math.atan2(S.z, S.x);
    const thD = destino === 'porta' ? Math.PI / 2 : thS; // porta de cargas voltada para o sul (+z)
    const dTh = angulo(thD - thS);
    // pontos de passagem no plano xz
    const via = [];
    if (Math.abs(dTh) <= Math.acos(R_PAREDE / rS)) via.push([R_PAREDE * Math.cos(thD), R_PAREDE * Math.sin(thD)]);
    else {
      const beta = Math.acos(R_CONTORNO / rS), lado = Math.sign(dTh);
      const thT = thS + lado * beta, arco = angulo(thD - thT);
      const passos = Math.max(1, Math.ceil((Math.abs(arco) * R_CONTORNO) / PASSO_CHAO));
      for (let i = 0; i <= passos; i++) { const a = thT + (arco * i) / passos; via.push([R_CONTORNO * Math.cos(a), R_CONTORNO * Math.sin(a)]); }
      via.push([R_PAREDE * Math.cos(thD), R_PAREDE * Math.sin(thD)]);
    }
    // saída pela borda da estrutura, na direção do primeiro ponto de passagem
    let x0 = S.x, z0 = S.z;
    if (box) {
      const ux = via[0][0] - S.x, uz = via[0][1] - S.z, L = Math.hypot(ux, uz);
      const tx = Math.abs(ux) > 1e-9 ? ((ux > 0 ? box.max.x : box.min.x) + Math.sign(ux) * 0.3 - S.x) / ux : Infinity;
      const tz = Math.abs(uz) > 1e-9 ? ((uz > 0 ? box.max.z : box.min.z) + Math.sign(uz) * 0.3 - S.z) / uz : Infinity;
      const t = Math.min(tx, tz, 1 - 1 / L);
      x0 += ux * t; z0 += uz * t;
    }
    // densifica a cada ~2 m (no máximo ~300 pontos) e põe cada ponto no chão
    const xz = [[x0, z0], ...via];
    let total = 0;
    for (let i = 1; i < xz.length; i++) total += Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]);
    const passo = Math.max(PASSO_CHAO, total / 290);
    const pts = [pontoNoChao(x0, z0)];
    for (let i = 1; i < xz.length; i++) {
      const [ax, az] = xz[i - 1], [bx, bz] = xz[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / passo));
      for (let j = 1; j <= n; j++) pts.push(pontoNoChao(ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n));
    }
    const limpos = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[2] - pts[i - 1][2]) > 0.05);
    return { pontos: limpos.slice(0, 300), rota: { origem: nomeO, destino: DESTINOS[destino] } };
  }
  function gerarRota(origem = $('sbRotaOrig').value, destino = $('sbRotaDest').value) {
    try {
      const r = rotaPeloChao(origem, destino);
      if (origem === 'ponto') cancelarCabo();
      const cfg = configCabo();
      const e = addEdicao({ tipo: 'cabo', ...cfg, ancora: 'fixo', pontos: r.pontos, rota: r.rota, nome: cfg.nome || `${CATEGORIAS_CABO[cfg.categoria].nome}: ${r.rota.origem} → ${r.rota.destino}` },
        `Rota gerada: ${fmt(comprimentoCabo({ pontos: r.pontos }), 1)} m pelo chão`);
      if (e) $('sbCaboNome').value = '';
      return e;
    } catch (err) { aviso(err.message); return null; }
  }

  // ---------- trechos "orçar sem desenhar" ----------
  function desenharSemDesenho() {
    const eds = projeto.edicoes.filter(C.soOrcamento);
    $('sbSemN').textContent = eds.length ? `(${eds.length})` : '';
    $('sbSemLista').innerHTML = eds.length ? eds.map((e) => `<li data-id="${e.id}" class="${e.ativo ? '' : 'off'}">
      <span class="sb-ico cabo orc" style="--c:${CATEGORIAS_CABO[e.categoria]?.cor ?? '#888'}" aria-hidden="true"></span>
      <div><b>${esc(e.nome || CATEGORIAS_CABO[e.categoria]?.nome || 'Cabo')}</b><small>${esc(CATEGORIAS_CABO[e.categoria]?.nome ?? '')} · ${e.feixe} cabo(s) · ${esc(e.subsistema || 'sem local')}${e.instalacao !== 'estrutura' ? ' · ' + esc(INSTALACOES[e.instalacao]?.nome.toLowerCase() ?? '') : ''}</small></div>
      <label class="sb-L"><input type="number" min="0.1" max="100000" step="0.5" value="${e.comprimento_m}" data-acao="L" aria-label="Comprimento do caminho (m)"> m</label>
      <button type="button" data-acao="excluir" title="Excluir trecho" aria-label="Excluir trecho">×</button></li>`).join('')
      : '<li class="vazio">Nenhum trecho sem desenho.</li>';
  }

  // ---------- modelos 3D importados (.glb) ----------
  const ICONE_CUBO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z M3 7l9 5 9-5 M12 12v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const opcoesMaterial = (atual) => '<option value="">Sem custo de material</option>' + Object.entries(materiais())
    .filter(([k, m]) => k !== '_meta' && m.densidade && m.preco)
    .map(([k, m]) => `<option value="${k}"${k === atual ? ' selected' : ''}>${esc(m.nome)} · ${fmtUSD(m.preco.usd)}/${esc(m.preco.por)}</option>`).join('');
  function desenharModelos() {
    const ms = Object.entries(projeto.modelos ?? {});
    if (!ms.some(([h]) => h === modeloAtual)) modeloAtual = ms[ms.length - 1]?.[0] ?? null;
    $('sbGlbLista').innerHTML = ms.length ? ms.map(([h, m]) => {
      const x = obterExterno(h);
      return `<button type="button" class="sb-modelo" data-modelo="${h}" aria-pressed="${h === modeloAtual}">${ICONE_CUBO}<span>${esc(m.nome)}</span>
        <small>${x ? `${fmt(x.tam[0], 1)} × ${fmt(x.tam[1], 1)} × ${fmt(x.tam[2], 1)} m · ${fmt(x.tris, 0)} triângulos` : 'não carregado'}</small></button>`;
    }).join('') : '<p class="dica">Nenhum modelo importado ainda.</p>';
  }
  async function importarGLB(f) {
    try {
      const r = await MD.importarArquivo(f);
      projeto.modelos[r.hash] = { nome: r.nome, dados: r.dados };
      modeloAtual = r.hash;
      if (ferramenta !== 'modelo') setFerramenta('modelo'); else desenharModelos();
      aviso(`Modelo "${r.nome}" pronto (${fmt(r.tam[0], 1)} × ${fmt(r.tam[1], 1)} × ${fmt(r.tam[2], 1)} m). Clique no modelo ou no terreno para colocar.`);
      if (r.avisos.length) setTimeout(() => aviso(r.avisos.join(' ')), 2600);
      return r.hash;
    } catch (err) { aviso(err.message); return null; }
  }
  function colocarModelo(h) {
    if (!modeloAtual || !projeto.modelos[modeloAtual]) { aviso('Importe um modelo .glb primeiro.'); return; }
    const ancora = paiDoAcerto(h.object);
    pais[ancora].updateMatrixWorld(true);
    const l = pais[ancora].worldToLocal(h.point.clone());
    const preco = $('sbGlbPreco').value.trim();
    const nome = projeto.modelos[modeloAtual].nome;
    const ed = addEdicao({
      tipo: 'externo', modelo: modeloAtual, nome, ancora,
      pos: [arred(l.x), arred(l.y), arred(l.z)], rot: [0, +$('sbGlbGiro').value || 0, 0],
      escala: +$('sbGlbEscala').value || 1, material: $('sbGlbMat').value || null,
      preco_usd: preco === '' ? null : +preco, sistema: $('sbGlbSis').value, qtd: +$('sbGlbQtd').value || 1,
    }, `${nome} colocado`);
    if (ed) selecionar({ edicao: ed.id });
  }
  /** Volume medido na malha de um modelo importado (m³, já com a escala). */
  function volumeModelo(e) {
    if (!obterExterno(e.modelo)) return null;
    const q = quantitativos('modelo-externo', { ...C.opcoesExterno(e), material: e.material ?? 'concreto' });
    return q.linhas.reduce((t, l) => t + l.vol, 0);
  }

  // ---------- seleção ----------
  let sel = null; // { copia } | { edicao }
  const caixaSel = new THREE.Box3Helper(new THREE.Box3(), 0xffc21a);
  caixaSel.material.depthTest = false; caixaSel.material.transparent = true; caixaSel.renderOrder = 998;
  caixaSel.userData.previa = true; caixaSel.visible = false;
  scene.add(caixaSel);
  let tc = null, proxy = null, arrastando = false;

  function objetoSel() {
    if (!sel) return null;
    if (sel.edicao) return sobreposicoes.find((o) => o.userData.sandbox === sel.edicao) ?? null;
    return null;
  }
  const _b = new THREE.Box3(), _m = new THREE.Matrix4();
  function atualizarSelecaoVisual() {
    caixaSel.visible = false;
    if (!sel || !ativo) return;
    const box = caixaSel.box.makeEmpty();
    modelo.raiz.updateMatrixWorld(true);
    if (sel.edicao) {
      const objs = sobreposicoes.filter((o) => o.userData.sandbox === sel.edicao);
      if (!objs.length) { sel = null; desenharSel(); return; }
      for (const o of objs) box.expandByObject(o);
    } else if (sel.copia.tipo === 'obj') {
      const sub = sobreposicoes.find((o) => o.userData.substitui === sel.copia.chave);
      box.expandByObject(sub && sub.visible ? sub : sel.copia.obj);
      if (!sel.copia.obj.visible && !(sub && sub.visible)) return;
    } else {
      for (const m of sel.copia.malhas) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const nl = m.count / sel.copia.n;
        for (let l = 0; l < nl; l++) {
          m.getMatrixAt(sel.copia.copia * nl + l, _m);
          box.union(_b.copy(m.geometry.boundingBox).applyMatrix4(_m.premultiply(m.matrixWorld)));
        }
      }
    }
    if (!box.isEmpty() && box.getSize(V(0, 0, 0)).length() > 1e-3) caixaSel.visible = true;
  }
  function selecionar(s) {
    soltarTC();
    sel = s;
    atualizarSelecaoVisual();
    desenharSel();
    desenharLista();
  }

  function desenharSel() {
    const el = $('sbSel');
    $('sbSelVazio').hidden = !!sel;
    el.hidden = !sel;
    if (!sel) { el.innerHTML = ''; return; }
    if (sel.edicao) {
      const e = edicao(sel.edicao);
      if (!e) { sel = null; desenharSel(); return; }
      if (e.tipo === 'cabo') {
        el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(e.nome || 'Trecho de cabo')} <small class="sb-novo">${C.soOrcamento(e) ? 'só orçamento' : 'no modelo'}</small></h3></div><p class="dica">${esc(C.descrever(e))}</p>
          <label class="sel">Tipo <select id="sbSelCat">${Object.entries(CATEGORIAS_CABO).map(([k, c]) => `<option value="${k}"${k === e.categoria ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
          <div class="sb-grade2"><label class="campo">Cabos no feixe <input type="number" id="sbSelFeixe" min="1" max="500" value="${e.feixe}"></label>
          <label class="campo">Folga (%) <input type="number" id="sbSelFolga" min="0" max="200" value="${e.folga_pct}"></label></div>
          ${e.pontos ? '' : `<label class="campo">Comprimento do caminho (m) <input type="number" id="sbSelL" min="0.1" step="0.5" value="${e.comprimento_m}"></label>`}
          <label class="sel">Sistema <select id="sbSelSis">${SISTEMAS.map((s) => `<option${s === e.sistema ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
          <label class="sel">Instalação <select id="sbSelInst">${Object.entries(INSTALACOES).map(([k, i]) => `<option value="${k}"${k === e.instalacao ? ' selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></label>
          <label class="caixa"><input type="checkbox" id="sbSelCalha" ${e.eletrocalha ? 'checked' : ''}> Com eletrocalha (${fmt((e.eletrocalha?.largura_m ?? 0.3) * 100, 0)} cm)</label>
          <div class="linha-btn"><button type="button" id="sbSelAplicar">Aplicar</button><button type="button" id="sbSelExcluir">Excluir trecho</button></div>`;
        $('sbSelAplicar').onclick = () => {
          e.categoria = $('sbSelCat').value; e.feixe = Math.max(1, Math.round(+$('sbSelFeixe').value || 1)); e.folga_pct = Math.max(0, +$('sbSelFolga').value || 0);
          e.sistema = $('sbSelSis').value; e.instalacao = $('sbSelInst').value; e.eletrocalha = $('sbSelCalha').checked ? { largura_m: e.eletrocalha?.largura_m ?? 0.3 } : null;
          if (!e.pontos) e.comprimento_m = Math.max(0.1, +$('sbSelL').value || e.comprimento_m);
          Object.assign(e, P.validarEdicao(e));
          commit('Trecho atualizado');
          desenharSel();
        };
        $('sbSelExcluir').onclick = () => removerEdicao(e.id);
        return;
      }
      const o = objetoSel();
      const salvarM = (msg) => (M) => { e.matriz = M.toArray().map((x) => arred(x, 5)); commit(msg); };
      if (e.tipo === 'externo') {
        const vol = volumeModelo(e);
        el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(e.nome || 'Modelo 3D')} <small class="sb-novo">importado</small></h3></div>
          <p class="dica">${esc(C.descrever(e))}${obterExterno(e.modelo) ? '' : '<br><b>Modelo não carregado</b>: importe o arquivo do projeto (.gmt.json) que tem o modelo.'}</p>
          ${o ? camposPosicao(o) : ''}
          <div class="sb-grade2"><label class="campo">Escala <input type="number" id="sbSelEsc" min="0.001" max="1000" step="any" value="${e.escala}"></label>
          <label class="campo">Quantidade <input type="number" id="sbSelQtdM" min="1" max="10000" step="1" value="${e.qtd}"></label></div>
          <label class="sel">Material (custo pelo volume) <select id="sbSelMatM">${opcoesMaterial(e.material)}</select></label>
          <label class="campo">Preço informado (US$ por unidade) <input type="number" id="sbSelPreco" min="0" step="any" value="${e.preco_usd ?? ''}" placeholder="opcional"></label>
          <label class="sel">Sistema <select id="sbSelSisM">${SISTEMAS.map((s) => `<option${s === e.sistema ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
          ${vol != null ? `<p class="sb-status">Volume medido: <b>${fmtA(vol)} m³</b> por unidade. Só vale para malhas fechadas (sem furos).</p>` : ''}
          <div class="linha-btn"><button type="button" id="sbSelAplicar">Aplicar</button>${o ? `<button type="button" id="sbSelMover" aria-pressed="false">Mover</button><button type="button" id="sbSelGirar" aria-pressed="false">Girar</button>
          <button type="button" id="sbSelDuplicar">Duplicar</button>` : ''}<button type="button" id="sbSelExcluir">Excluir</button></div>`;
        $('sbSelAplicar').onclick = () => {
          const pr = $('sbSelPreco').value.trim();
          Object.assign(e, P.validarEdicao({ ...e, escala: +$('sbSelEsc').value || e.escala, qtd: +$('sbSelQtdM').value || e.qtd, material: $('sbSelMatM').value || null, preco_usd: pr === '' ? null : +pr, sistema: $('sbSelSisM').value }) ?? {});
          commit('Modelo atualizado');
          desenharSel();
        };
        if (o) {
          ligarPosicao(o, salvarM('Modelo reposicionado'));
          $('sbSelMover').onclick = () => alternarTC('translate', o, salvarM('Modelo movido'));
          $('sbSelGirar').onclick = () => alternarTC('rotate', o, salvarM('Modelo girado'));
          $('sbSelDuplicar').onclick = () => {
            const M2 = o.matrix.clone(), p = V(), q = new THREE.Quaternion(), sc = V();
            M2.decompose(p, q, sc); p.x += 2; p.z += 2; M2.compose(p, q, sc);
            const n = addEdicao({ ...e, matriz: M2.toArray().map((x) => arred(x, 5)) }, 'Cópia do modelo adicionada (2 m ao lado)');
            if (n) selecionar({ edicao: n.id });
          };
        }
        $('sbSelExcluir').onclick = () => removerEdicao(e.id);
        return;
      }
      // peça adicionada
      if (!o) { el.innerHTML = `<p class="dica">${esc(C.descrever(e))} (desligada ou sem desenho)</p>`; return; }
      el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(PECA[e.peca].nome)} <small class="sb-novo">adicionada</small></h3></div>
        ${camposPosicao(o)}
        <div class="linha-btn"><button type="button" id="sbSelMover" aria-pressed="false">Mover</button><button type="button" id="sbSelGirar" aria-pressed="false">Girar</button>
        <button type="button" id="sbSelDuplicar">Duplicar</button><button type="button" id="sbSelExcluir">Excluir</button></div>`;
      preencherMiniaturas(el);
      ligarPosicao(o, salvarM('Peça reposicionada'));
      $('sbSelMover').onclick = () => alternarTC('translate', o, salvarM('Peça movida'));
      $('sbSelGirar').onclick = () => alternarTC('rotate', o, salvarM('Peça girada'));
      $('sbSelDuplicar').onclick = () => duplicar(e.peca, e.ancora, o.matrix.clone());
      $('sbSelExcluir').onclick = () => removerEdicao(e.id);
      return;
    }
    // cópia da base
    const c = sel.copia, p = PECA[c.peca];
    const efetiva = res?.itens.filter((i) => i.id === c.peca).reduce((s, i) => s + i.n, 0) ?? p.qtd[0];
    const removida = projeto.edicoes.some((e) => e.ativo && e.tipo === 'remover' && e.chave === c.chave);
    const mats = [...new Set(quantitativos(c.peca).linhas.map((l) => l.mat))];
    const MAT = materiais();
    const destinos = Object.entries(MAT).filter(([k, m]) => k !== '_meta' && m.densidade);
    const trocaAtual = projeto.edicoes.filter((e) => e.ativo && e.tipo === 'material' && e.peca === c.peca);
    const proxyObj = c.tipo === 'obj' ? c.obj : null;
    el.innerHTML = `<div class="sb-sel-cab"><img class="sb-ico" alt="" data-mini-sb="${c.peca}" hidden><span class="sb-ico ph" aria-hidden="true"></span><h3>${esc(p.nome)}</h3></div>
      <p class="dica">${esc(p.sistema)} · cópia <code>${esc(c.chave)}</code>${removida ? ' · <b>removida</b>' : ''}<br>Quantidade do tipo na obra: <b>${fmt(efetiva, 0)}</b> (base ${fmt(p.qtd[0], 0)})${p.qtd[0] !== contarCopias(c.peca) ? ` · ${fmt(contarCopias(c.peca), 0)} cópia(s) desenhada(s) no modelo` : ''}</p>
      ${removida ? '' : camposPosicao(proxyObj, c)}
      <div class="linha-btn">
        ${removida ? '<button type="button" id="sbSelRestaurar">Restaurar</button>' : `<button type="button" id="sbSelMover" aria-pressed="false">Mover</button><button type="button" id="sbSelGirar" aria-pressed="false">Girar</button>
        <button type="button" id="sbSelDuplicar">Duplicar</button><button type="button" id="sbSelRemover">Remover</button>`}
      </div>
      <h3>Quantidade do tipo</h3>
      <div class="sb-linha"><input type="number" id="sbSelQtd" min="0" step="1" value="${efetiva}" aria-label="Quantidade do tipo"><button type="button" id="sbSelQtdOk">Aplicar</button></div>
      <p class="dica">Muda o total do tipo no BOM sem desenhar cada cópia (útil para itens contados, como atuadores).</p>
      ${mats.length ? `<h3>Material</h3>
      <div class="sb-linha"><select id="sbSelDe" aria-label="Material atual">${mats.map((m) => `<option value="${m}">${esc(nomeMat(m))}</option>`).join('')}</select> →
      <select id="sbSelPara" aria-label="Novo material">${destinos.map(([k, m]) => `<option value="${k}">${esc(m.nome)}</option>`).join('')}</select><button type="button" id="sbSelMatOk">Trocar</button></div>
      ${trocaAtual.length ? `<p class="dica">Trocas ativas: ${trocaAtual.map((t) => esc(`${nomeMat(t.de)} → ${nomeMat(t.para)}`)).join('; ')}</p>` : ''}` : ''}`;
    preencherMiniaturas(el);
    if (removida) {
      $('sbSelRestaurar').onclick = () => { projeto.edicoes = projeto.edicoes.filter((e) => !(e.tipo === 'remover' && e.chave === c.chave)); commit('Peça restaurada'); desenharSel(); };
    } else {
      const salvarMover = (M) => {
        const ex = projeto.edicoes.find((e) => e.tipo === 'mover' && e.chave === c.chave);
        const m = M.toArray().map((x) => arred(x, 5));
        if (ex) { ex.matriz = m; ex.ativo = true; commit('Peça movida'); } else addEdicao({ tipo: 'mover', peca: c.peca, chave: c.chave, matriz: m }, 'Peça movida');
      };
      ligarPosicao(proxyObj, salvarMover, c);
      $('sbSelMover').onclick = () => alternarTC('translate', null, salvarMover, c);
      $('sbSelGirar').onclick = () => alternarTC('rotate', null, salvarMover, c);
      $('sbSelDuplicar').onclick = () => duplicar(c.peca, nomePaiDe(paiDe(c)), mundoParaAncora(c));
      $('sbSelRemover').onclick = () => { addEdicao({ tipo: 'remover', peca: c.peca, chave: c.chave, n: 1 }, `${p.nome}: 1 cópia removida`); desenharSel(); };
    }
    $('sbSelQtdOk').onclick = () => definirQuantidade(c.peca, +$('sbSelQtd').value);
    if (mats.length) $('sbSelMatOk').onclick = () => {
      const de = $('sbSelDe').value, para = $('sbSelPara').value;
      if (de === para) return;
      addEdicao({ tipo: 'material', peca: c.peca, de, para }, 'Material trocado');
      desenharSel();
    };
  }
  const contarCopias = (id) => copias.filter((c) => c.peca === id).length;
  function nomePaiDe(o) { for (; o; o = o.parent) if (nomePai.has(o)) return nomePai.get(o); return 'fixo'; }
  /** Matriz da cópia no referencial do grupo âncora (fixo, az, el, domo). */
  function mundoParaAncora(c) {
    const pai = paiDe(c), anc = pais[nomePaiDe(pai)];
    modelo.raiz.updateMatrixWorld(true);
    const M = matrizDe(c).premultiply(pai.matrixWorld);
    return M.premultiply(_m.copy(anc.matrixWorld).invert());
  }
  function duplicar(peca, ancora, M) {
    const M2 = M.clone();
    const p = V(), q = new THREE.Quaternion(), s = V();
    M2.decompose(p, q, s);
    p.x += 2; p.z += 2;
    M2.compose(p, q, s);
    const e = addEdicao({ tipo: 'adicionar', peca, ancora, pos: [p.x, p.y, p.z], rot: [0, 0, 0], matriz: M2.toArray().map((x) => arred(x, 5)) }, 'Cópia adicionada (2 m ao lado)');
    if (e) selecionar({ edicao: e.id });
  }
  function definirQuantidade(peca, q) {
    if (!Number.isFinite(q) || q < 0) { aviso('Quantidade inválida.'); return; }
    const ex = [...projeto.edicoes].reverse().find((e) => e.tipo === 'quantidade' && e.peca === peca);
    if (ex) { ex.qtd = Math.round(q); ex.ativo = true; commit('Quantidade atualizada'); } else addEdicao({ tipo: 'quantidade', peca, qtd: q }, 'Quantidade alterada');
    desenharSel();
  }

  function camposPosicao(obj, c) {
    const M = obj ? (obj.updateMatrix(), obj.matrix) : c ? matrizDe(c) : null;
    if (!M) return '';
    const p = V(), q = new THREE.Quaternion(), s = V();
    M.decompose(p, q, s);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    const f = (x) => arred(x, 2);
    return `<div class="sb-pos" role="group" aria-label="Posição (m) e giro (°) no referencial da peça">
      <label>x <input type="number" step="0.5" id="sbPx" value="${f(p.x)}"></label><label>y <input type="number" step="0.5" id="sbPy" value="${f(p.y)}"></label>
      <label>z <input type="number" step="0.5" id="sbPz" value="${f(p.z)}"></label><label>giro° <input type="number" step="15" id="sbPr" value="${f(e.y / DEG)}"></label>
      <button type="button" id="sbPosOk">Aplicar</button></div>`;
  }
  function ligarPosicao(obj, salvar, c) {
    const b = $('sbPosOk');
    if (!b) return;
    b.onclick = () => {
      const M0 = obj ? (obj.updateMatrix(), obj.matrix.clone()) : matrizDe(c);
      const p = V(), q = new THREE.Quaternion(), s = V();
      M0.decompose(p, q, s);
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      e.y = (+$('sbPr').value || 0) * DEG;
      p.set(+$('sbPx').value || 0, +$('sbPy').value || 0, +$('sbPz').value || 0);
      salvar(new THREE.Matrix4().compose(p, q.setFromEuler(e), s));
    };
  }

  // ---------- TransformControls (mover / girar com o mouse) ----------
  async function alternarTC(modo, obj, salvar, c) {
    if (tc?.object && tc.mode === modo) { soltarTC(); desenharSel(); return; }
    if (!tc) {
      const { TransformControls } = await import('three/addons/controls/TransformControls.js');
      tc = new TransformControls(camera, renderer.domElement);
      const ajudante = tc.getHelper ? tc.getHelper() : tc;
      ajudante.userData.previa = true;
      scene.add(ajudante);
      tc.addEventListener('dragging-changed', (ev) => { arrastando = ev.value; controls.enabled = !ev.value; });
      tc.addEventListener('objectChange', () => { tc.userData.aoMudar?.(); atualizarSelecaoVisual(); });
      tc.addEventListener('mouseUp', () => { tc.userData.aoSoltar?.(); });
    }
    soltarTC();
    let alvoTC = obj;
    if (c) {
      if (c.tipo === 'obj') alvoTC = c.obj;
      else {
        proxy = new THREE.Object3D();
        proxy.userData.previa = true;
        c.M.decompose(proxy.position, proxy.quaternion, proxy.scale);
        c.grupo.add(proxy);
        alvoTC = proxy;
        tc.userData.aoMudar = () => { proxy.updateMatrix(); matrizInst(c, proxy.matrix); };
      }
    }
    if (!alvoTC) return;
    tc.setMode(modo);
    tc.setSpace(modo === 'rotate' ? 'local' : 'world');
    tc.showX = tc.showZ = true; tc.showY = true;
    if (modo === 'rotate') { tc.showX = false; tc.showZ = false; }
    tc.attach(alvoTC);
    tc.userData.aoSoltar = () => { const o = tc.object; if (!o) return; o.updateMatrix(); salvar(o.matrix.clone()); };
    for (const [id, m] of [['sbSelMover', 'translate'], ['sbSelGirar', 'rotate']]) $(id)?.setAttribute('aria-pressed', String(m === modo));
  }
  function soltarTC() {
    if (tc) { tc.detach(); tc.userData.aoMudar = null; tc.userData.aoSoltar = null; }
    if (proxy) { proxy.parent?.remove(proxy); proxy = null; }
    arrastando = false;
    controls.enabled = true;
  }

  // ---------- eventos do ponteiro ----------
  let baixo = null, ultMov = 0;
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', (e) => { if (ativo) baixo = [e.clientX, e.clientY]; });
  dom.addEventListener('pointermove', (e) => {
    if (!ativo || arrastando) return;
    const agora = performance.now();
    if (agora - ultMov < 40) return;
    ultMov = agora;
    if (ferramenta === 'cabo' || ferramenta === 'adicionar' || ferramenta === 'modelo') {
      const h = e.buttons ? null : alvo(e.clientX, e.clientY);
      cursor.visible = !!h;
      if (h) cursor.position.copy(h.point);
      if (ferramenta === 'cabo') {
        cabo.hover = h && cabo.ancora ? pontoLocal(h, cabo.ancora) : null;
        desenharPrevia();
      }
      dom.style.cursor = h ? 'crosshair' : '';
    } else if (ferramenta === 'selecionar' && e.pointerType === 'mouse' && !e.buttons) {
      const h = alvo(e.clientX, e.clientY);
      dom.style.cursor = h && identificar(h) ? 'pointer' : '';
    }
  });
  dom.addEventListener('pointerleave', () => { cursor.visible = false; cabo.hover = null; if (ativo && ferramenta === 'cabo') desenharPrevia(); });
  dom.addEventListener('pointerup', (e) => {
    if (!ativo || !baixo || arrastando || tc?.axis) { baixo = null; return; }
    const arrasto = Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]);
    baixo = null;
    if (arrasto > 6) return;
    const h = alvo(e.clientX, e.clientY);
    if (ferramenta === 'cabo') {
      if (h) porPonto(h);
    } else if (ferramenta === 'modelo') {
      if (!h) return;
      colocarModelo(h);
    } else if (ferramenta === 'adicionar') {
      if (!h) return;
      const peca = $('sbPeca').value;
      if (!PECA[peca]) return;
      const ancora = paiDoAcerto(h.object);
      pais[ancora].updateMatrixWorld(true);
      const l = pais[ancora].worldToLocal(h.point.clone());
      const giro = +$('sbGiro').value || 0;
      const ed = addEdicao({ tipo: 'adicionar', peca, ancora, pos: [arred(l.x), arred(l.y), arred(l.z)], rot: [0, giro, 0] }, `${PECA[peca].nome} adicionada`);
      if (ed) selecionar({ edicao: ed.id });
    } else if (ferramenta === 'selecionar') {
      const s = h ? identificar(h) : null;
      selecionar(s);
    }
  });

  addEventListener('keydown', (e) => {
    if (!ativo) return;
    const digitando = e.target.closest?.('input, select, textarea');
    if ((e.ctrlKey || e.metaKey) && !digitando && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); return; }
    if ((e.ctrlKey || e.metaKey) && !digitando && e.code === 'KeyY') { e.preventDefault(); refazer(); return; }
    if (digitando) return;
    if (ferramenta === 'cabo') {
      if (e.key === 'Enter') { e.preventDefault(); concluirCabo(); }
      if (e.key === 'Escape') cancelarCabo();
      if (e.key === 'Backspace') { e.preventDefault(); voltarPonto(); }
    }
    if (ferramenta === 'selecionar' && sel) {
      if (e.key === 'Escape') selecionar(null);
      if (e.key === 'Delete') {
        if (sel.edicao) removerEdicao(sel.edicao);
        else if (sel.copia) addEdicao({ tipo: 'remover', peca: sel.copia.peca, chave: sel.copia.chave, n: 1 }, '1 cópia removida');
        desenharSel();
      }
    }
  });

  // ---------- ferramentas ----------
  function setFerramenta(f) {
    ferramenta = f;
    document.querySelectorAll('[data-ferr]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ferr === f)));
    document.querySelectorAll('[data-ferr-painel]').forEach((s) => { s.hidden = s.dataset.ferrPainel !== f; });
    if (f !== 'cabo') cancelarCabo();
    if (f !== 'selecionar') { soltarTC(); sel = null; atualizarSelecaoVisual(); desenharSel(); }
    if (f === 'adicionar') preencherMiniaturas($('sbPecaGrade'));
    if (f === 'modelo') desenharModelos();
    cursor.visible = false;
    dom.style.cursor = '';
  }
  document.querySelectorAll('[data-ferr]').forEach((b) => b.addEventListener('click', () => setFerramenta(b.dataset.ferr)));

  // =====================================================================
  // Montagem dos controles do painel (uma vez)
  // =====================================================================
  function montarControles() {
    const MAT = materiais();
    // tipo de cabo e instalação: chips (a cor do chip é a cor do cabo no 3D)
    $('sbCat').innerHTML = Object.entries(CATEGORIAS_CABO).map(([k, c]) => `<button type="button" data-cat="${k}" aria-pressed="${k === catAtual}" style="--c:${c.cor}"><i aria-hidden="true"></i>${esc(c.nome)}<small>${fmtUSD(MAT[c.mat]?.preco?.usd)}/m</small></button>`).join('');
    $('sbCat').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cat]');
      if (!b) return;
      catAtual = b.dataset.cat;
      $('sbCat').querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('sbInst').innerHTML = Object.entries(INSTALACOES).map(([k, i]) => `<button type="button" data-inst="${k}" aria-pressed="${k === instAtual}">${esc(i.nome)}<small>${i.mat ? `+${fmtUSD(MAT[i.mat]?.preco?.usd)}/m` : 'sem custo extra'}</small></button>`).join('');
    $('sbInst').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-inst]');
      if (!b) return;
      instAtual = b.dataset.inst;
      $('sbInst').querySelectorAll('[data-inst]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('sbTerreno').addEventListener('change', () => { mostrarTerreno(); cursor.visible = false; });
    $('sbRotaOrig').innerHTML = [...Object.entries(ORIGENS).map(([k, o]) => [k, o[2]]), ['ponto', 'Ponto clicado (1º ponto do trecho)']].map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
    $('sbRotaDest').innerHTML = Object.entries(DESTINOS).map(([k, n]) => `<option value="${k}">${esc(n)}${k === 'parede' ? ' (mais próxima)' : ''}</option>`).join('');
    $('sbRotaGerar').addEventListener('click', () => gerarRota());
    $('sbSemLista').addEventListener('change', (ev) => {
      const li = ev.target.closest('li[data-id]'), e = li && edicao(li.dataset.id);
      if (!e || ev.target.dataset.acao !== 'L') return;
      const v = +ev.target.value;
      if (!(v > 0)) { aviso('Digite um comprimento maior que zero.'); desenharSemDesenho(); return; }
      e.comprimento_m = Math.min(100000, v);
      commit('Comprimento atualizado');
    });
    $('sbSemLista').addEventListener('click', (ev) => {
      const li = ev.target.closest('li[data-id]');
      if (li && ev.target.closest('button[data-acao="excluir"]')) removerEdicao(li.dataset.id);
    });
    $('sbFiltro').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-filtro]');
      if (!b) return;
      filtroLista = b.dataset.filtro;
      desenharLista();
    });
    $('sbSis').innerHTML = SISTEMAS.map((s) => `<option${s === 'Instrumentação' ? ' selected' : ''}>${esc(s)}</option>`).join('');
    $('sbCaboSub').innerHTML = SUBS.map((s) => `<option value="${s.id}">${esc(s.nome)}</option>`).join('');
    $('sbCalha').addEventListener('change', (e) => { $('sbCalhaL').hidden = !e.target.checked; });
    for (const id of ['sbFeixe', 'sbFolga']) $(id).addEventListener('input', desenharPrevia);
    $('sbCaboOk').addEventListener('click', concluirCabo);
    $('sbCaboVolta').addEventListener('click', voltarPonto);
    $('sbCaboCancela').addEventListener('click', cancelarCabo);
    $('sbCaboDigitar').addEventListener('click', () => {
      const L = +$('sbCaboL').value;
      if (!(L > 0)) { aviso('Digite um comprimento maior que zero.'); return; }
      const s = SUBS.find((x) => x.id === $('sbCaboSub').value) ?? SUBS[0];
      addEdicao({ tipo: 'cabo', ...configCabo(), ancora: s.pai, comprimento_m: L, pos: [s.ancora.x, s.ancora.y, s.ancora.z], subsistema: s.nome }, `${fmt(L, 1)} m de cabo em ${s.nome}`);
    });

    // peças para adicionar: grade de miniaturas com busca e filtro por sistema
    let sisPeca = null;
    $('sbPecaSis').innerHTML = ['Todos', ...SISTEMAS].map((s) => `<button type="button" data-sis="${esc(s)}" aria-pressed="${s === 'Todos'}">${esc(s)}</button>`).join('');
    $('sbPecaGrade').innerHTML = PECAS_BASE.map((p) => `<button type="button" class="sb-peca" data-peca="${p.id}" data-sis="${esc(p.sistema)}" data-busca="${esc((p.nome + ' ' + p.id + ' ' + p.sistema).toLowerCase())}" aria-pressed="false" title="${esc(p.nome)}">
      <img alt="" data-mini-sb="${p.id}" hidden><span class="ph" aria-hidden="true"></span><span class="nome">${esc(p.nome)}</span></button>`).join('');
    const escolherPeca = (id) => {
      $('sbPeca').value = id;
      $('sbPecaGrade').querySelectorAll('.sb-peca').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.peca === id)));
      $('sbPecaNome').textContent = PECA[id] ? `${PECA[id].nome} · ${PECA[id].sistema}` : '';
    };
    const filtrarPecas = () => {
      const q = $('sbBusca').value.trim().toLowerCase();
      let n = 0;
      $('sbPecaGrade').querySelectorAll('.sb-peca').forEach((b) => { b.hidden = (sisPeca && b.dataset.sis !== sisPeca) || (q && !b.dataset.busca.includes(q)); if (!b.hidden) n++; });
      $('sbPecaVazia').hidden = n > 0;
    };
    $('sbPecaGrade').addEventListener('click', (ev) => { const b = ev.target.closest('.sb-peca'); if (b) escolherPeca(b.dataset.peca); });
    $('sbPecaSis').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sis]');
      if (!b) return;
      sisPeca = b.dataset.sis === 'Todos' ? null : b.dataset.sis;
      $('sbPecaSis').querySelectorAll('[data-sis]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filtrarPecas();
    });
    $('sbBusca').addEventListener('input', filtrarPecas);
    escolherPeca('passarela');

    // modelos 3D (.glb)
    $('sbGlbMat').innerHTML = opcoesMaterial(null);
    $('sbGlbSis').innerHTML = SISTEMAS.map((s) => `<option${s === 'Apoio' ? ' selected' : ''}>${esc(s)}</option>`).join('');
    $('sbGlbImportar').addEventListener('click', () => $('sbGlbArquivo').click());
    $('sbGlbArquivo').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) await importarGLB(f);
    });
    $('sbGlbLista').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-modelo]');
      if (!b) return;
      modeloAtual = b.dataset.modelo;
      desenharModelos();
    });

    // planta
    const param = PECAS_BASE.filter((p) => p.parametros);
    $('sbPlantaPeca').innerHTML = param.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('');
    $('sbPlantaPeca').addEventListener('change', desenharPlanta);
    $('sbPlantaReset').addEventListener('click', () => {
      const id = $('sbPlantaPeca').value;
      const antes = projeto.edicoes.length;
      projeto.edicoes = projeto.edicoes.filter((e) => !(e.tipo === 'parametro' && e.peca === id));
      if (projeto.edicoes.length !== antes) commit('Planta original restaurada');
      desenharPlanta();
    });

    // preços
    $('sbPrecoBusca').addEventListener('input', desenharPrecos);
    $('sbPrecos').addEventListener('change', (e) => {
      const inp = e.target.closest('input[data-mat]');
      if (!inp) return;
      const mat = inp.dataset.mat, base = materiais()[mat]?.preco;
      const v = inp.value.trim() === '' ? null : +inp.value;
      if (v === null || !Number.isFinite(v) || v < 0) delete projeto.precos[mat];
      else projeto.precos[mat] = { usd: v, por: base.por, nota: 'Preço do cliente' };
      commit(v === null ? 'Preço base restaurado' : `Preço de ${nomeMat(mat)} trocado`);
      desenharPrecos();
    });
    $('sbPrecos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-reset]');
      if (!b) return;
      delete projeto.precos[b.dataset.reset];
      commit('Preço base restaurado');
      desenharPrecos();
    });
    $('sbCambio').addEventListener('change', (e) => {
      const v = +e.target.value;
      projeto.cambio_brl = e.target.value.trim() === '' || !(v > 0) ? null : v;
      commit('Câmbio atualizado');
    });

    // projeto
    $('sbNome').addEventListener('change', (e) => { projeto.nome = e.target.value.trim().slice(0, 140) || 'Meu projeto'; commit(); });
    $('sbAutor').addEventListener('change', (e) => { projeto.autor = e.target.value.trim().slice(0, 140); commit(); });
    $('sbDesfazer').addEventListener('click', desfazer);
    $('sbRefazer').addEventListener('click', refazer);
    $('sbNovo').addEventListener('click', () => {
      if (projeto.edicoes.length && !confirm('Começar um projeto novo? O atual sai da tela (dá para voltar com Desfazer).')) return;
      trocarProjeto(P.novoProjeto(), 'Projeto novo');
    });
    $('sbCorte').addEventListener('change', (e) => modelo.setCorte(e.target.checked));

    // exportar
    $('sbExpJson').addEventListener('click', () => { X.exportarProjeto(paraArquivo()); aviso('Projeto exportado'); });
    $('sbExpCsv').addEventListener('click', () => { X.exportarCSVProjeto(projeto); aviso('CSV exportado'); });
    $('sbExpLink').addEventListener('click', async () => {
      try {
        const { url, tamanho } = await X.gerarLink(projeto);
        $('sbLinkCampo').hidden = false;
        $('sbLink').value = url;
        $('sbLink').select();
        let copiado = false;
        try { await navigator.clipboard.writeText(url); copiado = true; } catch { /* sem permissão: o campo fica selecionado */ }
        const semModelos = projeto.edicoes.some((x) => x.tipo === 'externo') ? ' O link não leva os modelos 3D importados: para eles, envie o arquivo .gmt.json.' : '';
        aviso((tamanho > 8000 ? `Link longo (${fmt(tamanho, 0)} caracteres): prefira o arquivo .gmt.json.` : copiado ? 'Link copiado.' : 'Link gerado: copie do campo.') + semModelos);
      } catch (err) { aviso(`Não foi possível gerar o link: ${err.message}`); }
    });
    $('sbExpPng').addEventListener('click', () => {
      soltarTC();
      const url = X.capturarPNG(renderer, composer);
      const a = document.createElement('a'); a.href = url; a.download = `${X.slug(projeto.nome)}.png`; a.click();
      aviso('Imagem exportada');
    });
    $('sbExpRel').addEventListener('click', () => {
      soltarTC();
      const imagem = X.capturarPNG(renderer, composer);
      const html = X.relatorioHTML({ projeto, base, atual: res, semPrecos, impactos: C.impactos(projeto, res.custo), imagem });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const w = window.open(url, '_blank');
      if (!w) { const a = document.createElement('a'); a.href = url; a.download = `${X.slug(projeto.nome)}-relatorio.html`; a.click(); aviso('Relatório baixado (abra e imprima como PDF)'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    $('sbExpGlb').addEventListener('click', async () => {
      soltarTC();
      aviso('Gerando o modelo 3D…');
      const ocultos = [];
      for (const o of [previa, cursor, caixaSel]) if (o.visible) { o.visible = false; ocultos.push(o); }
      modoCinza(modelo.raiz, false, cinzas);
      try {
        const bytes = await X.exportarGLB(modelo.raiz, projeto.nome);
        aviso(`Modelo exportado (${fmt(bytes / 1e6, 1)} MB)`);
      } catch (err) { console.error(err); aviso(`Falha ao exportar: ${err.message}`); }
      finally {
        modoCinza(modelo.raiz, true, cinzas);
        for (const o of ocultos) o.visible = true;
      }
    });
    let modoArquivo = 'importar';
    $('sbImportar').addEventListener('click', () => { modoArquivo = 'importar'; $('sbArquivo').click(); });
    $('sbComparar').addEventListener('click', () => { modoArquivo = 'comparar'; $('sbArquivo').click(); });
    $('sbArquivo').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) await lerArquivo(f, modoArquivo);
    });
    addEventListener('dragover', (e) => { if (ativo && e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
    addEventListener('drop', (e) => {
      if (!ativo || !e.dataTransfer?.files?.length) return;
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (/\.glb$/i.test(f.name)) importarGLB(f); else lerArquivo(f, 'importar');
    });

    $('sbResMin').addEventListener('click', () => {
      const aberto = $('sbResCorpo').hidden;
      $('sbResCorpo').hidden = !aberto;
      $('sbResMin').setAttribute('aria-expanded', String(aberto));
      $('sbResMin').textContent = aberto ? '▾' : '▸';
    });
    if (innerWidth <= 820) $('sbResMin').click();
  }

  async function lerArquivo(f, modo) {
    if (/\.glb$/i.test(f.name) && modo === 'importar') { await importarGLB(f); return; }
    if (f.size > 40e6) { aviso('Arquivo grande demais (máx. 40 MB).'); return; }
    try {
      const { projeto: p, avisos } = P.lerTexto(await f.text());
      if (modo === 'comparar') {
        await MD.carregarModelos(p);
        comparacao = { nome: p.nome, r: C.calcular(p) };
        mostrarComparacao();
        $('sbRes').hidden = false;
        if ($('sbResCorpo').hidden) $('sbResMin').click();
        aviso('Comparação pronta no painel de resultados');
      } else {
        await trocarProjeto(p, `Projeto "${p.nome}" importado (Desfazer volta ao anterior)`);
      }
      if (avisos.length) setTimeout(() => aviso(avisos.join(' ')), 2300);
    } catch (err) { aviso(err.message); }
  }

  function desenharPlanta() {
    const id = $('sbPlantaPeca').value, p = PECA[id];
    if (!p) return;
    const atual = {};
    for (const e of projeto.edicoes) if (e.ativo && e.tipo === 'parametro' && e.peca === id) Object.assign(atual, e.valores);
    $('sbPlantaCampos').innerHTML = p.parametros.map((d) => {
      const v = atual[d.chave] ?? d.padrao;
      return `<label class="faixa">${esc(d.nome)} <output id="sbPO_${d.chave}">${fmt(v, d.passo < 1 ? 1 : 0)} ${d.un}</output>
        <input type="range" data-chave="${d.chave}" min="${d.min}" max="${d.max}" step="${d.passo}" value="${v}"></label>`;
    }).join('');
    const area = () => {
      const op = {};
      $('sbPlantaCampos').querySelectorAll('input[data-chave]').forEach((i) => { op[i.dataset.chave] = +i.value; });
      return op;
    };
    const mostrarArea = (op) => { $('sbPlantaArea').textContent = `Área de planta: ${fmtA(p.areaPlanta(op))} m² (original ${fmtA(p.areaPlanta({}))} m²) × ${fmt(p.qtd[0], 0)} peça(s)`; };
    mostrarArea(area());
    $('sbPlantaCampos').querySelectorAll('input[data-chave]').forEach((inp) => {
      const d = p.parametros.find((x) => x.chave === inp.dataset.chave);
      inp.addEventListener('input', () => {
        $(`sbPO_${d.chave}`).textContent = `${fmt(+inp.value, d.passo < 1 ? 1 : 0)} ${d.un}`;
        mostrarArea(area());
      });
      inp.addEventListener('change', () => {
        const valores = area();
        // remove os parâmetros que voltaram ao padrão
        for (const x of p.parametros) if (Math.abs(valores[x.chave] - x.padrao) < 1e-9) delete valores[x.chave];
        const ex = [...projeto.edicoes].reverse().find((e) => e.tipo === 'parametro' && e.peca === id);
        if (!Object.keys(valores).length) {
          projeto.edicoes = projeto.edicoes.filter((e) => !(e.tipo === 'parametro' && e.peca === id));
          commit('Planta original');
        } else if (ex) { ex.valores = valores; ex.ativo = true; commit('Planta atualizada'); }
        else addEdicao({ tipo: 'parametro', peca: id, valores }, 'Planta alterada');
      });
    });
  }

  function desenharPrecos() {
    const MAT = materiais(), f = $('sbPrecoBusca').value.trim().toLowerCase();
    const linhas = Object.entries(MAT).filter(([k, m]) => k !== '_meta' && m.preco && (!f || m.nome.toLowerCase().includes(f)));
    $('sbPrecos').innerHTML = `<thead><tr><th>Material</th><th>Base</th><th>Cliente (US$)</th><th></th></tr></thead><tbody>${linhas.map(([k, m]) => {
      const c = projeto.precos[k];
      return `<tr${c ? ' class="mudou"' : ''}><td><i class="sb-cor" style="background:${corMat(k)}"></i>${esc(m.nome)}</td><td class="n">${fmtUSD(m.preco.usd)}/${esc(m.preco.por)}</td>
        <td><input type="number" min="0" step="any" data-mat="${k}" value="${c ? c.usd : ''}" placeholder="${m.preco.usd}" aria-label="Preço do cliente para ${esc(m.nome)} em US$ por ${esc(m.preco.por)}"></td>
        <td>${c ? `<button type="button" data-reset="${k}" title="Voltar ao preço base" aria-label="Voltar ao preço base">↺</button>` : ''}</td></tr>`;
    }).join('')}</tbody>`;
  }

  function sincronizarCampos() {
    if (document.activeElement !== $('sbNome')) $('sbNome').value = projeto.nome;
    if (document.activeElement !== $('sbAutor')) $('sbAutor').value = projeto.autor;
    $('sbCambio').placeholder = fmt(materiais()._meta?.cambio_brl?.valor ?? 5.4, 2);
    if (document.activeElement !== $('sbCambio')) $('sbCambio').value = projeto.cambio_brl ?? '';
    if ($('sbPrecosDet').open) desenharPrecos();
    if ($('sbPlantaDet').open) desenharPlanta();
    if (sel) desenharSel();
  }
  $('sbPrecosDet').addEventListener('toggle', () => { if ($('sbPrecosDet').open) desenharPrecos(); });
  $('sbPlantaDet').addEventListener('toggle', () => { if ($('sbPlantaDet').open) desenharPlanta(); });

  // =====================================================================
  // API para o main.js
  // =====================================================================
  function iniciar() {
    iniciado = true;
    registrar();
    const local = P.lerLocal();
    projeto = local?.projeto ?? P.novoProjeto();
    hist = P.criarHistorico(projeto);
    montarControles();
    if (local?.projeto?.edicoes.length) setTimeout(() => aviso(`Projeto "${projeto.nome}" restaurado (${projeto.edicoes.length} edição(ões))`), 400);
    // modelos 3D do autosave: lidos em segundo plano; até lá aparecem como caixas e ficam fora do cálculo
    if (Object.keys(projeto.modelos ?? {}).length) MD.carregarModelos(projeto).then(() => { if (ativo) atualizarTudo(); });
  }

  async function carregarLink(dadosLink) {
    try {
      const { projeto: p, avisos } = await P.descomprimir(dadosLink);
      await trocarProjeto(p, `Projeto "${p.nome}" aberto pelo link (Desfazer volta ao anterior)`);
      if (avisos.length) setTimeout(() => aviso(avisos.join(' ')), 2300);
    } catch (err) { aviso(err.message); }
    history.replaceState(null, '', '#sandbox');
  }

  return {
    /** Entra/sai da aba. Ao sair, o modelo volta exatamente ao original. */
    ativar(ligar, sub = null) {
      if (ligar && !iniciado) iniciar();
      if (ligar === ativo) { if (ligar && sub) carregarLink(sub); return; }
      ativo = ligar;
      $('sbRes').hidden = !ligar;
      if (ligar) {
        modoCinza(modelo.raiz, true, cinzas);
        modelo.setCorte($('sbCorte').checked);
        mostrarTerreno();
        atualizarTudo();
        if (sub) carregarLink(sub);
      } else {
        soltarTC();
        cancelarCabo();
        cursor.visible = false;
        caixaSel.visible = false;
        reverterVisual();
        modoCinza(modelo.raiz, false, cinzas);
        mostrarTerreno(); // devolve as cores do terreno (a visibilidade fica com o main.js)
        dom.style.cursor = '';
      }
    },
    atualizar() { /* reservado: nada por quadro além do TransformControls, que se atualiza sozinho */ },
    get projeto() { return projeto; },
    get resultado() { return res; },
    get base() { return base; },
    /** Para testes: aplica um projeto (objeto) como se viesse de um arquivo. */
    async carregar(obj) { const { projeto: p } = P.validarProjeto(obj); await trocarProjeto(p); recalcular(); return res; },
    /** Para testes: rota pelo chão, edição direta e importação de .glb (File). */
    gerarRota: (origem, destino) => gerarRota(origem, destino),
    editar: (e) => addEdicao(e),
    importarGLB: (f) => importarGLB(f),
    filtrar(f) { filtroLista = f; desenharLista(); },
    arquivo: () => P.serializar(paraArquivo()),
    subsDe(id) { const r = []; for (const o of sobreposicoes) if (o.userData.sandbox === id) o.traverse((m) => { if (m.isMesh) r.push(m.userData.sub); }); return r; },
    recalcular() { recalcular(); return res; },
    csv: () => C.csvDoProjeto(projeto),
    gerarLink: () => X.gerarLink(projeto),
    exportarGLB: () => { modoCinza(modelo.raiz, false, cinzas); return X.exportarGLB(modelo.raiz, projeto.nome).finally(() => modoCinza(modelo.raiz, true, cinzas)); },
  };
}
