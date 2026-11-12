// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/sandbox/sandbox.js, commit 6efe428).
// Editor do orçamento: edita uma cópia lógica do modelo (projeto = base + edições) e mostra o impacto em
// m, m², massa e custo. O modelo da base nunca é alterado de forma permanente; as edições ficam no projeto
// (autosave, arquivo, link). A base (pacote do projeto) pode ser trocada a qualquer momento.
import * as THREE from 'three';
import { CATEGORIAS_CABO, INSTALACOES, comprimentoCabo } from './nucleo/pecas-editor.js';
import { obterExterno } from './nucleo/externos.js';
import { miniatura } from './ui/miniaturas.js';
import { esc, fmt, fmtA, aviso, DEG } from './util.js';
import { fmtUSD, nomeMat, corMat, quantitativos } from './nucleo/bom.js';
import { modoCinza } from './nucleo/cinza.js';
import * as P from './nucleo/projeto.js';
import * as C from './nucleo/calculo.js';
import * as X from './nucleo/exportar.js';
import * as MD from './nucleo/modelos.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const arred = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const PASSO_CHAO = 2;      // m entre pontos de um trecho que segue o terreno
const ACIMA_CHAO = 0.15;   // m: o cabo fica logo acima do terreno

export function criarEditor({ renderer, scene, camera, controls, chaoVirtual, aoTrocarProjeto }) {
  let base = null, pais = null;
  let projeto = null, hist = null, ativo = false;
  let ferramenta = 'navegar';
  let catAtual = 'energia', instAtual = 'estrutura', filtroLista = 'todas', modeloAtual = null, avisouSalvar = false;
  let base0 = null, res = null, semPrecos = null, comparacao = null, imp = {};
  let cores = false;

  // =====================================================================
  // Registro das cópias do modelo (para selecionar, esconder e mover)
  // =====================================================================
  const copias = [], porChave = new Map(), daMalha = new Map();
  function registrar() {
    copias.length = 0; porChave.clear(); daMalha.clear();
    for (const [id, nos] of base.copias) {
      nos.forEach((o, k) => {
        const e = { chave: `${id}:${k}`, peca: id, tipo: 'obj', obj: o, orig: [o.position.clone(), o.quaternion.clone(), o.scale.clone(), o.visible] };
        copias.push(e); porChave.set(e.chave, e);
        o.traverse((m) => { if (m.isMesh) daMalha.set(m, e); });
      });
    }
  }
  const terreno = () => base?.terreno ?? chaoVirtual;

  // =====================================================================
  // Aplicar as edições no 3D (e desfazer tudo ao trocar)
  // =====================================================================
  const sobreposicoes = [];
  const alteradas = new Set();
  function reverterVisual() {
    for (const o of sobreposicoes) {
      o.parent?.remove(o);
      o.traverse((m) => { if (m.isMesh && m.userData.descartavel) m.geometry.dispose(); });
    }
    sobreposicoes.length = 0;
    for (const e of alteradas) { e.obj.visible = e.orig[3]; e.obj.position.copy(e.orig[0]); e.obj.quaternion.copy(e.orig[1]); e.obj.scale.copy(e.orig[2]); }
    alteradas.clear();
  }
  function sobrepor(obj, edicaoId) {
    obj.userData.editor = edicaoId;
    obj.traverse((m) => { if (m.isMesh) { m.userData.editor = edicaoId; m.userData.semCinza = true; m.userData.descartavel = !m.userData.compartilhada; m.castShadow = m.receiveShadow = true; } });
    pais.fixo.add(obj);
    sobreposicoes.push(obj);
    return obj;
  }
  const matrizDeEdicao = (e) => (e.matriz ? new THREE.Matrix4().fromArray(e.matriz)
    : new THREE.Matrix4().compose(V(...e.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(e.rot[0] * DEG, e.rot[1] * DEG, e.rot[2] * DEG, 'YXZ')), V(1, 1, 1)));

  function aplicarVisual() {
    reverterVisual();
    if (!ativo || !base) return;
    for (const e of projeto.edicoes) {
      if (!e.ativo) continue;
      if (e.tipo === 'remover' && porChave.has(e.chave)) {
        const c = porChave.get(e.chave);
        c.obj.visible = false;
        alteradas.add(c);
      }
      if (e.tipo === 'mover' && porChave.has(e.chave)) {
        const c = porChave.get(e.chave);
        new THREE.Matrix4().fromArray(e.matriz).decompose(c.obj.position, c.obj.quaternion, c.obj.scale);
        alteradas.add(c);
      }
      if (e.tipo === 'adicionar') {
        const g = base.construir(e.peca, false);
        matrizDeEdicao(e).decompose(g.position, g.quaternion, g.scale);
        sobrepor(g, e.id);
      }
      if (e.tipo === 'externo') {
        const g = base.construir('modelo-externo', false, C.opcoesExterno(e));
        matrizDeEdicao(e).decompose(g.position, g.quaternion, g.scale);
        sobrepor(g, e.id);
      }
      if (e.tipo === 'cabo') {
        const g = base.construir('trecho-cabo', false, C.opcoesCabo(e));
        if (!e.pontos) g.position.set(...e.pos);
        sobrepor(g, e.id);
        if (e.eletrocalha) {
          const k = base.construir('eletrocalha', false, C.opcoesCalha(e));
          if (!e.pontos) k.position.set(...e.pos);
          sobrepor(k, e.id);
        }
      }
    }
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
  /** Projeto como vai para arquivo: só com os modelos extras usados e com o pacote junto. */
  function paraArquivo(comPacote = true) {
    const usados = new Set(projeto.edicoes.filter((e) => e.tipo === 'externo').map((e) => e.modelo));
    const p = { ...projeto, modelos: Object.fromEntries(Object.entries(projeto.modelos ?? {}).filter(([h]) => usados.has(h))) };
    if (comPacote) p.pacote = base.pacote;
    return p;
  }
  function salvar() {
    const grande = (base.pacote.modelo?.dados.length ?? 0) > 3.5e6;
    const r = P.salvarLocal(paraArquivo(false), grande ? undefined : base.pacote);
    if (r === 'completo' || avisouSalvar) return;
    avisouSalvar = true;
    aviso('O projeto ficou grande demais para o salvamento automático do navegador. Exporte o arquivo .orc3d.json para não perder.');
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
    p.modelos = { ...p.modelos, ...projeto.modelos };
    projeto = p; sel = null;
    salvar(); atualizarTudo(); aviso(msg);
  }
  function desfazer() { const p = hist.desfazer(); if (p) voltarPara(p, 'Desfeito'); }
  function refazer() { const p = hist.refazer(); if (p) voltarPara(p, 'Refeito'); }
  const edicao = (id) => projeto.edicoes.find((e) => e.id === id);
  function addEdicao(e, msg) {
    const v = P.validarEdicao({ ...e, id: P.novoId() }, base);
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
    if (!base0) base0 = C.calcular(base, C.projetoVazio(projeto));
    res = C.calcular(base, projeto);
    semPrecos = Object.keys(projeto.precos).length ? C.calcular(base, projeto, { semPrecos: true }) : res;
    mostrarResultados();
    clearTimeout(tImp);
    tImp = setTimeout(() => { imp = C.impactos(base, projeto, res.custo); desenharLista(); desenharBarras(); }, 350);
    return res;
  }

  // =====================================================================
  // Painel de resultados
  // =====================================================================
  const brl = (x) => X.brl(x, res.cambio);
  const totCabo = (r) => Object.keys(CATEGORIAS_CABO).reduce((s, k) => s + r.cabos[k], 0);
  function mostrarResultados() {
    const dC = res.custo - base0.custo;
    const caboB = totCabo(base0), caboE = totCabo(res);
    const partes = [];
    partes.push(`<b>${X.usdDif(dC)}</b> <span>(${dC >= 0 ? '+' : ''}${brl(dC)})</span>`);
    if (Math.abs(caboE - caboB) > 1e-6) partes.push(`<b>${C.dif(caboB, caboE, 'm')}</b> de cabo`);
    if (Math.abs(res.massa - base0.massa) > 1e-6) partes.push(`<b>${C.dif(base0.massa, res.massa, 't')}</b>`);
    $('edManchete').innerHTML = projeto.edicoes.some((e) => e.ativo) || Object.keys(projeto.precos).length
      ? `Sua versão: ${partes.join(' · ')}`
      : 'Sem edições ainda: escolha uma ferramenta à esquerda. Os números abaixo são a obra base do pacote.';
    const dEd = semPrecos.custo - base0.custo, dPr = res.custo - semPrecos.custo;
    const num = (v, r, sub = '') => `<div class="num"><b>${v}</b><small>${r}</small>${sub ? `<small>${sub}</small>` : ''}</div>`;
    $('edNums').innerHTML = [
      num(fmtUSD(res.custo), 'custo da obra editada', brl(res.custo)),
      num(fmtUSD(base0.custo), 'custo da base', brl(base0.custo)),
      num(X.usdDif(dEd), 'por edições', 'peças, quantidades, cabos'),
      num(X.usdDif(dPr), 'por preços do cliente', `${Object.keys(projeto.precos).length} preço(s) trocado(s)`),
      num(`${fmtA(caboE)} m`, 'cabo cobrado', `base ${fmtA(caboB)} m`),
      num(`${fmtA(res.massa)} t`, 'massa total', C.dif(base0.massa, res.massa, 't')),
    ].join('');
    const linhas = C.linhasMetricas(base, base0, res).map(([rot, un, f]) => {
      const a = f(base0), b = f(res);
      if (!a && !b) return '';
      const mudou = Math.abs(b - a) > 1e-9;
      return `<tr${mudou ? ' class="mudou"' : ''}><td>${esc(rot)}</td><td class="n">${fmtA(a)} ${un}</td><td class="n">${fmtA(b)} ${un}</td><td class="n">${mudou ? C.dif(a, b, un) : '–'}</td><td class="n">${C.difPct(a, b)}</td></tr>`;
    }).join('');
    $('edTabMet').innerHTML = `<thead><tr><th>Métrica</th><th>Base</th><th>Editado</th><th>Diferença</th><th>%</th></tr></thead><tbody>${linhas}
      <tr class="${Math.abs(dC) > 0.5 ? 'mudou' : ''}"><td>Custo total</td><td class="n">${fmtUSD(base0.custo)}</td><td class="n">${fmtUSD(res.custo)}</td><td class="n">${Math.abs(dC) > 0.5 ? X.usdDif(dC) : '–'}</td><td class="n">${C.difPct(base0.custo, res.custo)}</td></tr></tbody>`;
    desenharBarras();
    const sis = sistemasDe();
    $('edTabSis').innerHTML = `<thead><tr><th>Sistema</th><th>Base</th><th>Editado</th><th>Diferença</th></tr></thead><tbody>${sis.map((s) => {
      const a = base0.custoSis[s] ?? 0, b = res.custoSis[s] ?? 0, m = Math.abs(b - a) > 0.5;
      return `<tr${m ? ' class="mudou"' : ''}><td>${esc(s)}</td><td class="n">${fmtUSD(a)}</td><td class="n">${fmtUSD(b)}</td><td class="n">${m ? X.usdDif(b - a) : '–'}</td></tr>`;
    }).join('')}</tbody>`;
    const abertas = base.pecas.filter((p) => quantitativos(base, p.id).aberta).map((p) => p.nome);
    $('edAbertas').hidden = !abertas.length;
    $('edAbertas').textContent = abertas.length ? `Malha aberta (o volume pode não valer): ${abertas.slice(0, 6).join(', ')}${abertas.length > 6 ? '…' : ''}. Para essas peças, prefira preço por unidade.` : '';
    mostrarComparacao();
  }
  const sistemasDe = () => [...new Set([...base.sistemas, ...Object.keys(res.custoSis), ...Object.keys(base0.custoSis)])];
  function desenharBarras() {
    const difs = sistemasDe().map((s) => [s, (res.custoSis[s] ?? 0) - (base0.custoSis[s] ?? 0)]);
    const max = Math.max(0, ...difs.map(([, d]) => Math.abs(d)));
    $('edBarSis').innerHTML = max < 0.5 ? '<p class="dica">Nenhum sistema mudou de custo.</p>' : difs.map(([s, d]) => {
      const w = Math.abs(d) < 0.5 ? 0 : Math.max(2, (Math.abs(d) / max) * 50);
      return `<div class="sb-div${d < -0.5 ? ' menos' : d > 0.5 ? ' mais' : ''}"><span class="rot">${esc(s)}</span>
        <span class="trilho"><i style="${d < 0 ? 'right:50%' : 'left:50%'};width:${w}%"></i></span><span class="val">${Math.abs(d) < 0.5 ? '–' : X.usdDif(d)}</span></div>`;
    }).join('');
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
    $('edComposicao').innerHTML = !ent.length ? '' : `<h3>De onde vem a diferença</h3>
      <div class="sb-comp-barra">${ent.map(([k, v]) => `<span class="t-${k}" style="width:${(Math.abs(v) / tot) * 100}%" title="${esc(nome(k))}: ${X.usdDif(v)}"></span>`).join('')}</div>
      <ul class="sb-comp-leg">${ent.map(([k, v]) => `<li><i class="t-${k}"></i>${esc(nome(k))} <b>${X.usdDif(v)}</b></li>`).join('')}</ul>`;
  }
  function mostrarComparacao() {
    const el = $('edComp');
    if (!comparacao) { el.hidden = true; return; }
    const { nome, r } = comparacao;
    const linhas = C.linhasMetricas(base, res, r).map(([rot, un, f]) => {
      const a = f(res), b = f(r);
      if (!a && !b) return '';
      return `<tr${Math.abs(b - a) > 1e-9 ? ' class="mudou"' : ''}><td>${esc(rot)}</td><td class="n">${fmtA(a)} ${un}</td><td class="n">${fmtA(b)} ${un}</td><td class="n">${C.dif(a, b, un)}</td></tr>`;
    }).join('');
    const sis = [...new Set([...Object.keys(res.custoSis), ...Object.keys(r.custoSis)])];
    el.hidden = false;
    el.innerHTML = `<h3>Comparação: esta versão × "${esc(nome)}"</h3>
      <div class="tabela-rolo"><table class="tabela"><thead><tr><th>Métrica</th><th>Esta versão</th><th>Arquivo</th><th>Diferença</th></tr></thead><tbody>${linhas}
      <tr class="mudou"><td>Custo total</td><td class="n">${fmtUSD(res.custo)}</td><td class="n">${fmtUSD(r.custo)}</td><td class="n">${X.usdDif(r.custo - res.custo)}</td></tr>
      ${sis.map((s) => `<tr><td>· ${esc(s)}</td><td class="n">${fmtUSD(res.custoSis[s] ?? 0)}</td><td class="n">${fmtUSD(r.custoSis[s] ?? 0)}</td><td class="n">${X.usdDif((r.custoSis[s] ?? 0) - (res.custoSis[s] ?? 0))}</td></tr>`).join('')}
      </tbody></table></div><div class="linha-btn"><button type="button" id="edCompFechar">Fechar comparação</button></div>`;
    $('edCompFechar').onclick = () => { comparacao = null; mostrarComparacao(); };
  }

  // =====================================================================
  // Lista de edições
  // =====================================================================
  function desenharLista() {
    const n = projeto.edicoes.length;
    $('edEdN').textContent = n ? `(${n})` : '';
    $('edDesfazer').disabled = !hist.podeDesfazer();
    $('edRefazer').disabled = !hist.podeRefazer();
    const visiveis = projeto.edicoes.filter((e) => filtroLista === 'todas' || (filtroLista === 'orcamento') === C.soOrcamento(e));
    $('edFiltro').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtroLista)));
    $('edLista').innerHTML = !n ? '<li class="vazio">Nenhuma edição. O projeto é igual à base.</li>'
      : !visiveis.length ? '<li class="vazio">Nenhuma edição neste filtro.</li>'
      : visiveis.map((e) => `<li data-id="${esc(e.id)}" class="${e.ativo ? '' : 'off'}${sel?.edicao === e.id ? ' sel' : ''}">
      <label class="sb-liga" title="Liga/desliga esta edição"><input type="checkbox" data-acao="ativo" ${e.ativo ? 'checked' : ''} aria-label="Edição ativa"></label>
      ${iconeEdicao(e)}
      <div class="sb-ed">
        <span class="sb-selos"><span class="sb-tipo t-${e.tipo}">${C.ROTULO_TIPO[e.tipo]}</span>${C.soOrcamento(e) ? '<span class="sb-onde orc" title="Entra no orçamento, sem desenho no 3D (aparece como um marcador)">só orçamento</span>' : ['remover', 'quantidade', 'material'].includes(e.tipo) ? '' : '<span class="sb-onde" title="Desenhado no modelo 3D">no modelo</span>'}</span>
        <input type="text" data-acao="nome" value="${esc(e.nome || '')}" placeholder="Dar um nome…" maxlength="140" aria-label="Nome da edição">
        <small>${esc(C.descrever(base, e))}</small>
        <small class="sb-imp">${e.ativo ? (imp[e.id] ? X.usdDif(imp[e.id].custo) : '…') : 'desligada'}</small>
      </div>
      <div class="sb-ed-acoes">
        ${podeFocar(e) ? '<button type="button" data-acao="focar" title="Selecionar no modelo" aria-label="Selecionar no modelo">◎</button>' : ''}
        <button type="button" data-acao="excluir" title="Excluir edição" aria-label="Excluir edição">×</button>
      </div></li>`).join('');
    preencherMiniaturas($('edLista'));
    desenharSemDesenho();
  }
  function iconeEdicao(e) {
    if (e.tipo === 'cabo') return `<span class="sb-ico cabo${C.soOrcamento(e) ? ' orc' : ''}" style="--c:${CATEGORIAS_CABO[e.categoria]?.cor ?? '#888'}" aria-hidden="true"></span>`;
    if (e.tipo === 'externo') return `<span class="sb-ico ext" aria-hidden="true">${ICONE_CUBO}</span>`;
    return e.peca ? `<img class="sb-ico" alt="" data-mini="${esc(e.peca)}" hidden><span class="sb-ico ph" aria-hidden="true"></span>` : '<span class="sb-ico ph" aria-hidden="true"></span>';
  }
  function preencherMiniaturas(raiz) {
    const b = base;
    raiz.querySelectorAll('img[data-mini][hidden]').forEach((img) => {
      miniatura(b, img.dataset.mini).then((url) => {
        if (!img.isConnected || b !== base) return;
        img.src = url; img.hidden = false;
        if (img.nextElementSibling?.classList.contains('ph')) img.nextElementSibling.remove();
      }).catch(() => { /* sem WebGL: fica o espaço reservado */ });
    });
  }
  const podeFocar = (e) => ['cabo', 'adicionar', 'externo'].includes(e.tipo) || (['mover', 'remover'].includes(e.tipo) && porChave.has(e.chave));

  // =====================================================================
  // Interação no 3D: raio, ferramentas, pré-visualização
  // =====================================================================
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const visivel = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const ehPrevia = (o) => { for (; o; o = o.parent) if (o.userData.previa) return true; return false; };
  const ehChao = (o) => o === chaoVirtual || !!o.userData.terreno;
  function alvo(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const alvos = base.terreno ? [base.cena] : [base.cena, chaoVirtual];
    for (const h of ray.intersectObjects(alvos, true)) {
      if (!h.object.isMesh || !visivel(h.object) || ehPrevia(h.object)) continue;
      h.chao = ehChao(h.object);
      return h;
    }
    return null;
  }
  const raioChao = new THREE.Raycaster(), _baixo = V(0, -1, 0);
  /** Altura do chão em (x, z): raio vertical de cima para baixo contra o terreno (malha) ou o chão virtual. */
  function alturaTerreno(x, z) {
    const t = terreno();
    t.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(t);
    raioChao.set(V(x, (box.isEmpty() ? 0 : box.max.y) + 50, z), _baixo);
    const h = raioChao.intersectObject(t, true).find((i) => i.object.isMesh);
    return h ? h.point.y : (box.isEmpty() ? 0 : box.max.y);
  }
  function pontoNoChao(x, z) { return [arred(x), arred(alturaTerreno(x, z) + ACIMA_CHAO), arred(z)]; }
  /** Pontos intermediários (a cada ~2 m) entre a e b acompanhando o terreno; não inclui a, inclui b. */
  function seguirTerreno(a, b, max = 280) {
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.max(1, Math.min(max, Math.ceil(d / PASSO_CHAO)));
    const r = [];
    for (let i = 1; i < n; i++) r.push(pontoNoChao(a[0] + ((b[0] - a[0]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n));
    r.push(b);
    return r;
  }
  function identificar(h) {
    for (let o = h.object; o; o = o.parent) if (o.userData.editor) return { edicao: o.userData.editor };
    const d = daMalha.get(h.object);
    return d ? { copia: d } : null;
  }

  // ---------- cabo ----------
  const cabo = { pontos: [], hover: null, chao: false, cliques: [] };
  const previa = new THREE.Group();
  previa.userData.previa = true;
  const linhaPrevia = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true }));
  linhaPrevia.renderOrder = 999; linhaPrevia.frustumCulled = false;
  const geoPonto = new THREE.SphereGeometry(0.15, 12, 8);
  const matPonto = new THREE.MeshBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true });
  const cursor = new THREE.Mesh(geoPonto, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.85 }));
  cursor.renderOrder = 999; cursor.userData.previa = true; cursor.visible = false;
  scene.add(cursor);
  previa.add(linhaPrevia);
  scene.add(previa);

  function pontoLocal(h) {
    if (h.chao) {
      let x = h.point.x, z = h.point.z;
      if ($('edGrade').checked) { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
      return pontoNoChao(x, z);
    }
    // um pouco para fora da superfície (na direção da câmera) para o cabo não sumir dentro da peça
    const l = h.point.clone().addScaledVector(ray.ray.direction, -0.08);
    if ($('edGrade').checked) l.set(Math.round(l.x * 2) / 2, Math.round(l.y * 2) / 2, Math.round(l.z * 2) / 2);
    const ant = cabo.pontos[cabo.pontos.length - 1];
    if ($('edOrto').checked && ant) {
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
    const L = comprimentoCabo({ pontos: pts });
    const feixe = Math.max(1, +$('edFeixe').value || 1), folga = Math.max(0, +$('edFolga').value || 0);
    $('edCaboStatus').textContent = cabo.pontos.length
      ? `${cabo.cliques.length} clique(s) · ${fmt(L, 1)} m de caminho · ${fmt(L * feixe * (1 + folga / 100), 1)} m cobrados. Enter conclui.`
      : 'Clique numa superfície do modelo ou no chão para pôr o primeiro ponto.';
  }
  function cancelarCabo() {
    cabo.pontos = []; cabo.hover = null; cabo.chao = false; cabo.cliques = [];
    desenharPrevia();
  }
  /** Novo clique do cabo. Dois cliques seguidos no chão: o trecho entre eles segue o terreno. */
  function porPonto(h) {
    const p = pontoLocal(h);
    const ant = cabo.pontos[cabo.pontos.length - 1];
    const novos = h.chao && cabo.chao && ant ? seguirTerreno(ant, p) : [p];
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
    desenharPrevia();
  }
  function concluirCabo() {
    if (cabo.pontos.length < 2) { aviso('O trecho precisa de pelo menos 2 pontos.'); return null; }
    const e = addEdicao({ tipo: 'cabo', ...configCabo(), ancora: 'fixo', pontos: cabo.pontos }, `Trecho de cabo adicionado (${fmt(comprimentoCabo({ pontos: cabo.pontos }), 1)} m)`);
    cancelarCabo();
    if (e) $('edCaboNome').value = '';
    return e;
  }
  function configCabo() {
    return {
      categoria: catAtual, instalacao: instAtual, feixe: +$('edFeixe').value || 1, folga_pct: +$('edFolga').value || 0,
      sistema: $('edSis').value, nome: $('edCaboNome').value.trim(),
      eletrocalha: $('edCalha').checked ? { largura_m: (+$('edCalhaLarg').value || 30) / 100 } : null,
    };
  }

  // ---------- rota pelo chão entre nós marcados como origem e destino ----------
  function caixaNo(o) {
    base.cena.updateMatrixWorld(true);
    if (!visivel(o)) return null;
    const b = new THREE.Box3().setFromObject(o);
    return b.isEmpty() ? null : b;
  }
  /** Ponto da borda da caixa (no plano xz, 0,3 m para fora) na direção de alvo. */
  function borda(box, S, alvoXZ) {
    const ux = alvoXZ[0] - S.x, uz = alvoXZ[1] - S.z, L = Math.hypot(ux, uz);
    if (L < 1e-6) return [S.x, S.z];
    const tx = Math.abs(ux) > 1e-9 ? ((ux > 0 ? box.max.x : box.min.x) + Math.sign(ux) * 0.3 - S.x) / ux : Infinity;
    const tz = Math.abs(uz) > 1e-9 ? ((uz > 0 ? box.max.z : box.min.z) + Math.sign(uz) * 0.3 - S.z) / uz : Infinity;
    const t = Math.min(tx, tz, 1);
    return [S.x + ux * t, S.z + uz * t];
  }
  /**
   * Trecho de cabo pelo chão, da borda do nó de origem até a borda do nó de destino (ou do ponto clicado),
   * em linha reta ou em "L" (primeiro em x, depois em z), seguindo a altura do terreno a cada ~2 m.
   */
  function rotaPeloChao(origem, destino, modo = 'reta') {
    let S, bS = null, nomeO;
    if (origem === 'ponto') {
      if (!cabo.pontos.length) throw new Error('Clique primeiro no chão para marcar a origem, depois gere a rota.');
      S = V(...cabo.pontos[0]); nomeO = 'ponto clicado';
    } else {
      const o = base.rotas.origens[+origem];
      if (!o) throw new Error('Escolha uma origem.');
      bS = caixaNo(o.obj);
      if (!bS) throw new Error(`${o.nome} não está no modelo (foi removido?).`);
      S = bS.getCenter(V()); nomeO = o.nome;
    }
    const d = base.rotas.destinos[+destino];
    if (!d) throw new Error('O pacote não tem destinos de rota marcados.');
    const bD = caixaNo(d.obj);
    if (!bD) throw new Error(`${d.nome} não está no modelo (foi removido?).`);
    const D = bD.getCenter(V());
    const via = modo === 'L' && Math.abs(D.x - S.x) > 0.5 && Math.abs(D.z - S.z) > 0.5 ? [[D.x, S.z]] : [];
    const p0 = bS ? borda(bS, S, via[0] ?? [D.x, D.z]) : [S.x, S.z];
    const ult = via.length ? via[via.length - 1] : p0;
    const p1 = borda(bD, D, ult);
    const xz = [p0, ...via, p1];
    let total = 0;
    for (let i = 1; i < xz.length; i++) total += Math.hypot(xz[i][0] - xz[i - 1][0], xz[i][1] - xz[i - 1][1]);
    if (total < 0.1) throw new Error('Origem e destino estão no mesmo lugar.');
    const passo = Math.max(PASSO_CHAO, total / 290);
    const pts = [pontoNoChao(p0[0], p0[1])];
    for (let i = 1; i < xz.length; i++) {
      const [ax, az] = xz[i - 1], [bx, bz] = xz[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / passo));
      for (let j = 1; j <= n; j++) pts.push(pontoNoChao(ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n));
    }
    const limpos = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[2] - pts[i - 1][2]) > 0.05);
    return { pontos: limpos.slice(0, 300), rota: { origem: nomeO, destino: d.nome } };
  }
  function gerarRota(origem = $('edRotaOrig').value, destino = $('edRotaDest').value, modo = $('edRotaModo').value) {
    try {
      const r = rotaPeloChao(origem, destino, modo);
      if (origem === 'ponto') cancelarCabo();
      const cfg = configCabo();
      const e = addEdicao({ tipo: 'cabo', ...cfg, ancora: 'fixo', pontos: r.pontos, rota: r.rota, nome: cfg.nome || `${CATEGORIAS_CABO[cfg.categoria].nome}: ${r.rota.origem} → ${r.rota.destino}` },
        `Rota gerada: ${fmt(comprimentoCabo({ pontos: r.pontos }), 1)} m pelo chão`);
      if (e) $('edCaboNome').value = '';
      return e;
    } catch (err) { aviso(err.message); return null; }
  }

  // ---------- trechos "orçar sem desenhar" ----------
  function desenharSemDesenho() {
    const eds = projeto.edicoes.filter(C.soOrcamento);
    $('edSemN').textContent = eds.length ? `(${eds.length})` : '';
    $('edSemLista').innerHTML = eds.length ? eds.map((e) => `<li data-id="${esc(e.id)}" class="${e.ativo ? '' : 'off'}">
      <span class="sb-ico cabo orc" style="--c:${CATEGORIAS_CABO[e.categoria]?.cor ?? '#888'}" aria-hidden="true"></span>
      <div><b>${esc(e.nome || CATEGORIAS_CABO[e.categoria]?.nome || 'Cabo')}</b><small>${esc(CATEGORIAS_CABO[e.categoria]?.nome ?? '')} · ${e.feixe} cabo(s) · ${esc(e.local || 'sem local')}${e.instalacao !== 'estrutura' ? ' · ' + esc(INSTALACOES[e.instalacao]?.nome.toLowerCase() ?? '') : ''}</small></div>
      <label class="sb-L"><input type="number" min="0.1" max="100000" step="0.5" value="${e.comprimento_m}" data-acao="L" aria-label="Comprimento do caminho (m)"> m</label>
      <button type="button" data-acao="excluir" title="Excluir trecho" aria-label="Excluir trecho">×</button></li>`).join('')
      : '<li class="vazio">Nenhum trecho sem desenho.</li>';
  }

  // ---------- modelos 3D extras (.glb) ----------
  const ICONE_CUBO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z M3 7l9 5 9-5 M12 12v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const opcoesMaterial = (atual) => '<option value="">Sem custo de material</option>' + Object.entries(base.materiais)
    .filter(([k, m]) => k !== '_meta' && m.densidade && m.preco)
    .map(([k, m]) => `<option value="${esc(k)}"${k === atual ? ' selected' : ''}>${esc(m.nome)} · ${fmtUSD(m.preco.usd)}/${esc(m.preco.por)}</option>`).join('');
  function desenharModelos() {
    const ms = Object.entries(projeto.modelos ?? {});
    if (!ms.some(([h]) => h === modeloAtual)) modeloAtual = ms[ms.length - 1]?.[0] ?? null;
    $('edGlbLista').innerHTML = ms.length ? ms.map(([h, m]) => {
      const x = obterExterno(h);
      return `<button type="button" class="sb-modelo" data-modelo="${esc(h)}" aria-pressed="${h === modeloAtual}">${ICONE_CUBO}<span>${esc(m.nome)}</span>
        <small>${x ? `${fmt(x.tam[0], 1)} × ${fmt(x.tam[2], 1)} × ${fmt(x.tam[1], 1)} m · ${fmt(x.tris, 0)} triângulos` : 'não carregado'}</small></button>`;
    }).join('') : '<p class="dica">Nenhum modelo extra ainda.</p>';
  }
  async function importarGLB(f) {
    try {
      const r = await MD.importarArquivo(f);
      projeto.modelos[r.hash] = { nome: r.nome, dados: r.dados };
      modeloAtual = r.hash;
      if (ferramenta !== 'modelo') setFerramenta('modelo'); else desenharModelos();
      aviso(`Modelo "${r.nome}" pronto (${fmt(r.tam[0], 1)} × ${fmt(r.tam[2], 1)} × ${fmt(r.tam[1], 1)} m). Clique no modelo ou no chão para colocar.`);
      if (r.avisos.length) setTimeout(() => aviso(r.avisos.join(' ')), 2600);
      return r.hash;
    } catch (err) { aviso(err.message); return null; }
  }
  function colocarModelo(h) {
    if (!modeloAtual || !projeto.modelos[modeloAtual]) { aviso('Importe um modelo .glb primeiro.'); return; }
    const l = h.point;
    const preco = $('edGlbPreco').value.trim();
    const nome = projeto.modelos[modeloAtual].nome;
    const ed = addEdicao({
      tipo: 'externo', modelo: modeloAtual, nome, ancora: 'fixo',
      pos: [arred(l.x), arred(l.y), arred(l.z)], rot: [0, +$('edGlbGiro').value || 0, 0],
      escala: +$('edGlbEscala').value || 1, material: $('edGlbMat').value || null,
      preco_usd: preco === '' ? null : +preco, sistema: $('edGlbSis').value, qtd: +$('edGlbQtd').value || 1,
    }, `${nome} colocado`);
    if (ed) selecionar({ edicao: ed.id });
  }
  function volumeModelo(e) {
    if (!obterExterno(e.modelo)) return null;
    const mat = Object.keys(base.materiais).find((k) => base.materiais[k]?.densidade) ?? 'concreto';
    const q = quantitativos(base, 'modelo-externo', { ...C.opcoesExterno(e), material: e.material ?? mat });
    return q.linhas.reduce((t, l) => t + l.vol, 0);
  }

  // ---------- seleção ----------
  let sel = null; // { copia } | { edicao }
  const caixaSel = new THREE.Box3Helper(new THREE.Box3(), 0xffc21a);
  caixaSel.material.depthTest = false; caixaSel.material.transparent = true; caixaSel.renderOrder = 998;
  caixaSel.userData.previa = true; caixaSel.visible = false;
  scene.add(caixaSel);
  let tc = null, arrastando = false;

  function objetoSel() {
    if (!sel?.edicao) return null;
    return sobreposicoes.find((o) => o.userData.editor === sel.edicao) ?? null;
  }
  function atualizarSelecaoVisual() {
    caixaSel.visible = false;
    if (!sel || !ativo) return;
    const box = caixaSel.box.makeEmpty();
    base.cena.updateMatrixWorld(true);
    if (sel.edicao) {
      const objs = sobreposicoes.filter((o) => o.userData.editor === sel.edicao);
      if (!objs.length) { sel = null; desenharSel(); return; }
      for (const o of objs) box.expandByObject(o);
    } else {
      if (!sel.copia.obj.visible) return;
      box.expandByObject(sel.copia.obj);
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

  /** Matriz local da cópia (relativa ao pai), como vai para a edição "mover". */
  const matrizDe = (c) => (c.obj.updateMatrix(), c.obj.matrix.clone());
  function desenharSel() {
    const el = $('edSel');
    $('edSelVazio').hidden = !!sel;
    el.hidden = !sel;
    if (!sel) { el.innerHTML = ''; return; }
    if (sel.edicao) {
      const e = edicao(sel.edicao);
      if (!e) { sel = null; desenharSel(); return; }
      if (e.tipo === 'cabo') {
        el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(e.nome || 'Trecho de cabo')} <small class="sb-novo">${C.soOrcamento(e) ? 'só orçamento' : 'no modelo'}</small></h3></div><p class="dica">${esc(C.descrever(base, e))}</p>
          <label class="sel">Tipo <select id="edSelCat">${Object.entries(CATEGORIAS_CABO).map(([k, c]) => `<option value="${k}"${k === e.categoria ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
          <div class="sb-grade2"><label class="campo">Cabos no feixe <input type="number" id="edSelFeixe" min="1" max="500" value="${e.feixe}"></label>
          <label class="campo">Folga (%) <input type="number" id="edSelFolga" min="0" max="200" value="${e.folga_pct}"></label></div>
          ${e.pontos ? '' : `<label class="campo">Comprimento do caminho (m) <input type="number" id="edSelL" min="0.1" step="0.5" value="${e.comprimento_m}"></label>`}
          <label class="sel">Sistema <select id="edSelSis">${base.sistemas.map((s) => `<option${s === e.sistema ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
          <label class="sel">Instalação <select id="edSelInst">${Object.entries(INSTALACOES).map(([k, i]) => `<option value="${k}"${k === e.instalacao ? ' selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></label>
          <label class="caixa"><input type="checkbox" id="edSelCalha" ${e.eletrocalha ? 'checked' : ''}> Com eletrocalha (${fmt((e.eletrocalha?.largura_m ?? 0.3) * 100, 0)} cm)</label>
          <div class="linha-btn"><button type="button" id="edSelAplicar">Aplicar</button><button type="button" id="edSelExcluir">Excluir trecho</button></div>`;
        $('edSelAplicar').onclick = () => {
          const novo = { ...e, categoria: $('edSelCat').value, feixe: Math.max(1, Math.round(+$('edSelFeixe').value || 1)), folga_pct: Math.max(0, +$('edSelFolga').value || 0),
            sistema: $('edSelSis').value, instalacao: $('edSelInst').value, eletrocalha: $('edSelCalha').checked ? { largura_m: e.eletrocalha?.largura_m ?? 0.3 } : null };
          if (!e.pontos) novo.comprimento_m = Math.max(0.1, +$('edSelL').value || e.comprimento_m);
          const v = P.validarEdicao(novo, base);
          if (v) Object.assign(e, v);
          commit('Trecho atualizado');
          desenharSel();
        };
        $('edSelExcluir').onclick = () => removerEdicao(e.id);
        return;
      }
      const o = objetoSel();
      const salvarM = (msg) => (M) => { e.matriz = M.toArray().map((x) => arred(x, 5)); commit(msg); };
      if (e.tipo === 'externo') {
        const vol = volumeModelo(e);
        el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(e.nome || 'Modelo 3D')} <small class="sb-novo">extra</small></h3></div>
          <p class="dica">${esc(C.descrever(base, e))}${obterExterno(e.modelo) ? '' : '<br><b>Modelo não carregado</b>: importe o arquivo do projeto (.orc3d.json) que tem o modelo.'}</p>
          ${o ? camposPosicao(o) : ''}
          <div class="sb-grade2"><label class="campo">Escala <input type="number" id="edSelEsc" min="0.001" max="1000" step="any" value="${e.escala}"></label>
          <label class="campo">Quantidade <input type="number" id="edSelQtdM" min="1" max="10000" step="1" value="${e.qtd}"></label></div>
          <label class="sel">Material (custo pelo volume) <select id="edSelMatM">${opcoesMaterial(e.material)}</select></label>
          <label class="campo">Preço informado (US$ por unidade) <input type="number" id="edSelPreco" min="0" step="any" value="${e.preco_usd ?? ''}" placeholder="opcional"></label>
          <label class="sel">Sistema <select id="edSelSisM">${base.sistemas.map((s) => `<option${s === e.sistema ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
          ${vol != null ? `<p class="sb-status">Volume medido: <b>${fmtA(vol)} m³</b> por unidade. Só vale para malhas fechadas (sem furos).</p>` : ''}
          <div class="linha-btn"><button type="button" id="edSelAplicar">Aplicar</button>${o ? `<button type="button" id="edSelMover" aria-pressed="false">Mover</button><button type="button" id="edSelGirar" aria-pressed="false">Girar</button>
          <button type="button" id="edSelDuplicar">Duplicar</button>` : ''}<button type="button" id="edSelExcluir">Excluir</button></div>`;
        $('edSelAplicar').onclick = () => {
          const pr = $('edSelPreco').value.trim();
          Object.assign(e, P.validarEdicao({ ...e, escala: +$('edSelEsc').value || e.escala, qtd: +$('edSelQtdM').value || e.qtd, material: $('edSelMatM').value || null, preco_usd: pr === '' ? null : +pr, sistema: $('edSelSisM').value }, base) ?? {});
          commit('Modelo atualizado');
          desenharSel();
        };
        if (o) {
          ligarPosicao(o, salvarM('Modelo reposicionado'));
          $('edSelMover').onclick = () => alternarTC('translate', o, salvarM('Modelo movido'));
          $('edSelGirar').onclick = () => alternarTC('rotate', o, salvarM('Modelo girado'));
          $('edSelDuplicar').onclick = () => {
            const M2 = o.matrix.clone(), p = V(), q = new THREE.Quaternion(), sc = V();
            M2.decompose(p, q, sc); p.x += 2; p.z += 2; M2.compose(p, q, sc);
            const n = addEdicao({ ...e, matriz: M2.toArray().map((x) => arred(x, 5)) }, 'Cópia do modelo adicionada (2 m ao lado)');
            if (n) selecionar({ edicao: n.id });
          };
        }
        $('edSelExcluir').onclick = () => removerEdicao(e.id);
        return;
      }
      // peça adicionada
      if (!o) { el.innerHTML = `<p class="dica">${esc(C.descrever(base, e))} (desligada)</p>`; return; }
      el.innerHTML = `<div class="sb-sel-cab">${iconeEdicao(e)}<h3>${esc(base.PECA[e.peca].nome)} <small class="sb-novo">adicionada</small></h3></div>
        ${camposPosicao(o)}
        <div class="linha-btn"><button type="button" id="edSelMover" aria-pressed="false">Mover</button><button type="button" id="edSelGirar" aria-pressed="false">Girar</button>
        <button type="button" id="edSelDuplicar">Duplicar</button><button type="button" id="edSelExcluir">Excluir</button></div>`;
      preencherMiniaturas(el);
      ligarPosicao(o, salvarM('Peça reposicionada'));
      $('edSelMover').onclick = () => alternarTC('translate', o, salvarM('Peça movida'));
      $('edSelGirar').onclick = () => alternarTC('rotate', o, salvarM('Peça girada'));
      $('edSelDuplicar').onclick = () => {
        const p = V(), q = new THREE.Quaternion(), s = V();
        o.updateMatrix(); o.matrix.decompose(p, q, s); p.x += 2; p.z += 2;
        const n = addEdicao({ tipo: 'adicionar', peca: e.peca, pos: [0, 0, 0], rot: [0, 0, 0], matriz: new THREE.Matrix4().compose(p, q, s).toArray().map((x) => arred(x, 5)) }, 'Cópia adicionada (2 m ao lado)');
        if (n) selecionar({ edicao: n.id });
      };
      $('edSelExcluir').onclick = () => removerEdicao(e.id);
      return;
    }
    // cópia da base
    const c = sel.copia, p = base.PECA[c.peca];
    const efetiva = res?.itens.filter((i) => i.id === c.peca).reduce((s, i) => s + i.n, 0) ?? p.qtd[0];
    const removida = projeto.edicoes.some((e) => e.ativo && e.tipo === 'remover' && e.chave === c.chave);
    const mats = [...new Set(quantitativos(base, c.peca).linhas.map((l) => l.mat))];
    const destinos = Object.entries(base.materiais).filter(([k, m]) => k !== '_meta' && m?.densidade);
    const trocaAtual = projeto.edicoes.filter((e) => e.ativo && e.tipo === 'material' && e.peca === c.peca);
    el.innerHTML = `<div class="sb-sel-cab"><img class="sb-ico" alt="" data-mini="${esc(c.peca)}" hidden><span class="sb-ico ph" aria-hidden="true"></span><h3>${esc(p.nome)}</h3></div>
      <p class="dica">${esc(p.sistema)} · cópia <code>${esc(c.chave)}</code>${removida ? ' · <b>removida</b>' : ''}<br>Quantidade do tipo na obra: <b>${fmt(efetiva, 0)}</b> (base ${fmt(p.qtd[0], 0)})${p.qtd[0] !== p.copias ? ` · ${fmt(p.copias, 0)} cópia(s) desenhada(s)` : ''}</p>
      ${removida ? '' : camposPosicao(c.obj, true)}
      <div class="linha-btn">
        ${removida ? '<button type="button" id="edSelRestaurar">Restaurar</button>' : `<button type="button" id="edSelMover" aria-pressed="false">Mover</button><button type="button" id="edSelGirar" aria-pressed="false">Girar</button>
        <button type="button" id="edSelDuplicar">Duplicar</button><button type="button" id="edSelRemover">Remover</button>`}
      </div>
      <h3>Quantidade do tipo</h3>
      <div class="sb-linha"><input type="number" id="edSelQtd" min="0" step="1" value="${efetiva}" aria-label="Quantidade do tipo"><button type="button" id="edSelQtdOk">Aplicar</button></div>
      <p class="dica">Muda o total do tipo no orçamento sem desenhar cada cópia.</p>
      ${mats.length ? `<h3>Material</h3>
      <div class="sb-linha"><select id="edSelDe" aria-label="Material atual">${mats.map((m) => `<option value="${esc(m)}">${esc(nomeMat(base, m))}</option>`).join('')}</select> →
      <select id="edSelPara" aria-label="Novo material">${destinos.map(([k, m]) => `<option value="${esc(k)}">${esc(m.nome)}</option>`).join('')}</select><button type="button" id="edSelMatOk">Trocar</button></div>
      ${trocaAtual.length ? `<p class="dica">Trocas ativas: ${trocaAtual.map((t) => esc(`${nomeMat(base, t.de)} → ${nomeMat(base, t.para)}`)).join('; ')}</p>` : ''}` : ''}`;
    preencherMiniaturas(el);
    if (removida) {
      $('edSelRestaurar').onclick = () => { projeto.edicoes = projeto.edicoes.filter((e) => !(e.tipo === 'remover' && e.chave === c.chave)); commit('Peça restaurada'); desenharSel(); };
    } else {
      const salvarMover = (M) => {
        const ex = projeto.edicoes.find((e) => e.tipo === 'mover' && e.chave === c.chave);
        const m = M.toArray().map((x) => arred(x, 6));
        if (ex) { ex.matriz = m; ex.ativo = true; commit('Peça movida'); } else addEdicao({ tipo: 'mover', peca: c.peca, chave: c.chave, matriz: m }, 'Peça movida');
      };
      ligarPosicao(c.obj, salvarMover, true);
      $('edSelMover').onclick = () => alternarTC('translate', c.obj, salvarMover);
      $('edSelGirar').onclick = () => alternarTC('rotate', c.obj, salvarMover);
      $('edSelDuplicar').onclick = () => {
        const b = new THREE.Box3().setFromObject(c.obj), ctr = b.getCenter(V());
        const n = addEdicao({ tipo: 'adicionar', peca: c.peca, pos: [arred(ctr.x + 2), arred(b.min.y), arred(ctr.z + 2)], rot: [0, 0, 0] }, 'Cópia adicionada (2 m ao lado)');
        if (n) selecionar({ edicao: n.id });
      };
      $('edSelRemover').onclick = () => { addEdicao({ tipo: 'remover', peca: c.peca, chave: c.chave, n: 1 }, `${p.nome}: 1 cópia removida`); desenharSel(); };
    }
    $('edSelQtdOk').onclick = () => definirQuantidade(c.peca, +$('edSelQtd').value);
    if (mats.length) $('edSelMatOk').onclick = () => {
      const de = $('edSelDe').value, para = $('edSelPara').value;
      if (de === para) return;
      addEdicao({ tipo: 'material', peca: c.peca, de, para }, 'Material trocado');
      desenharSel();
    };
  }
  function definirQuantidade(peca, q) {
    if (!Number.isFinite(q) || q < 0) { aviso('Quantidade inválida.'); return; }
    const ex = [...projeto.edicoes].reverse().find((e) => e.tipo === 'quantidade' && e.peca === peca);
    if (ex) { ex.qtd = Math.round(q); ex.ativo = true; commit('Quantidade atualizada'); } else addEdicao({ tipo: 'quantidade', peca, qtd: q }, 'Quantidade alterada');
    desenharSel();
  }

  /**
   * Campos de posição (m) e giro (°). Para cópias da base, mostra a posição no mundo (o pai pode ter a
   * escala da unidade original, ex.: centímetros) e converte de volta ao aplicar.
   */
  function camposPosicao(obj, mundo = false) {
    obj.updateMatrixWorld(true);
    const M = mundo ? obj.matrixWorld : (obj.updateMatrix(), obj.matrix);
    const p = V(), q = new THREE.Quaternion(), s = V();
    M.decompose(p, q, s);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    const f = (x) => arred(x, 2);
    return `<div class="sb-pos" role="group" aria-label="Posição (m) e giro (°)">
      <label>x <input type="number" step="0.5" id="edPx" value="${f(p.x)}"></label><label>y <input type="number" step="0.5" id="edPy" value="${f(p.y)}"></label>
      <label>z <input type="number" step="0.5" id="edPz" value="${f(p.z)}"></label><label>giro° <input type="number" step="15" id="edPr" value="${f(e.y / DEG)}"></label>
      <button type="button" id="edPosOk">Aplicar</button></div>`;
  }
  function ligarPosicao(obj, salvarFn, mundo = false) {
    const b = $('edPosOk');
    if (!b) return;
    b.onclick = () => {
      obj.updateMatrixWorld(true);
      const M0 = mundo ? obj.matrixWorld.clone() : (obj.updateMatrix(), obj.matrix.clone());
      const p = V(), q = new THREE.Quaternion(), s = V();
      M0.decompose(p, q, s);
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      e.y = (+$('edPr').value || 0) * DEG;
      p.set(+$('edPx').value || 0, +$('edPy').value || 0, +$('edPz').value || 0);
      let M = new THREE.Matrix4().compose(p, q.setFromEuler(e), s);
      if (mundo) M = M.premultiply(new THREE.Matrix4().copy(obj.parent.matrixWorld).invert());
      salvarFn(M);
    };
  }

  // ---------- TransformControls (mover / girar com o mouse) ----------
  async function alternarTC(modo, obj, salvarFn) {
    if (tc?.object && tc.mode === modo) { soltarTC(); desenharSel(); return; }
    if (!tc) {
      const { TransformControls } = await import('three/addons/controls/TransformControls.js');
      tc = new TransformControls(camera, renderer.domElement);
      const ajudante = tc.getHelper ? tc.getHelper() : tc;
      ajudante.userData.previa = true;
      scene.add(ajudante);
      tc.addEventListener('dragging-changed', (ev) => { arrastando = ev.value; controls.enabled = !ev.value; });
      tc.addEventListener('objectChange', () => atualizarSelecaoVisual());
      tc.addEventListener('mouseUp', () => { tc.userData.aoSoltar?.(); });
    }
    soltarTC();
    if (!obj) return;
    tc.setMode(modo);
    tc.setSpace(modo === 'rotate' ? 'local' : 'world');
    tc.showX = tc.showZ = true; tc.showY = true;
    if (modo === 'rotate') { tc.showX = false; tc.showZ = false; }
    tc.attach(obj);
    tc.userData.aoSoltar = () => { const o = tc.object; if (!o) return; o.updateMatrix(); salvarFn(o.matrix.clone()); };
    for (const [id, m] of [['edSelMover', 'translate'], ['edSelGirar', 'rotate']]) $(id)?.setAttribute('aria-pressed', String(m === modo));
  }
  function soltarTC() {
    if (tc) { tc.detach(); tc.userData.aoSoltar = null; }
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
        cabo.hover = h && cabo.pontos.length ? pontoLocal(h) : null;
        desenharPrevia();
      }
      dom.style.cursor = h ? 'crosshair' : '';
    } else if (ferramenta === 'selecionar' && e.pointerType === 'mouse' && !e.buttons) {
      const h = alvo(e.clientX, e.clientY);
      dom.style.cursor = h && identificar(h) ? 'pointer' : '';
    }
  });
  dom.addEventListener('pointerleave', () => { cursor.visible = false; cabo.hover = null; if (ativo && ferramenta === 'cabo') desenharPrevia(); });
  /** Clique (ou toque) no 3D, em coordenadas da tela. Exposto para os testes. */
  function clicar(cx, cy) {
    const h = alvo(cx, cy);
    if (ferramenta === 'cabo') { if (h) porPonto(h); }
    else if (ferramenta === 'modelo') { if (h) colocarModelo(h); }
    else if (ferramenta === 'adicionar') {
      if (!h) return null;
      const peca = $('edPeca').value;
      if (!base.PECA[peca]) return null;
      const l = h.point;
      const giro = +$('edGiro').value || 0;
      const ed = addEdicao({ tipo: 'adicionar', peca, ancora: 'fixo', pos: [arred(l.x), arred(l.y), arred(l.z)], rot: [0, giro, 0] }, `${base.PECA[peca].nome} adicionada`);
      if (ed) selecionar({ edicao: ed.id });
      return ed;
    } else if (ferramenta === 'selecionar') selecionar(h ? identificar(h) : null);
    return h;
  }
  dom.addEventListener('pointerup', (e) => {
    if (!ativo || !baixo || arrastando || tc?.axis) { baixo = null; return; }
    const arrasto = Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]);
    baixo = null;
    if (arrasto > 6) return;
    clicar(e.clientX, e.clientY);
  });

  addEventListener('keydown', (e) => {
    if (!ativo || document.body.dataset.tela !== 'editor') return;
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
    if (f === 'adicionar') preencherMiniaturas($('edPecaGrade'));
    if (f === 'modelo') desenharModelos();
    cursor.visible = false;
    dom.style.cursor = '';
  }
  document.querySelectorAll('[data-ferr]').forEach((b) => b.addEventListener('click', () => setFerramenta(b.dataset.ferr)));

  // =====================================================================
  // Controles do painel (uma vez) e o que depende da base (a cada troca)
  // =====================================================================
  let sisPeca = null;
  const escolherPeca = (id) => {
    $('edPeca').value = id;
    $('edPecaGrade').querySelectorAll('.sb-peca').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.peca === id)));
    $('edPecaNome').textContent = base.PECA[id] ? `${base.PECA[id].nome} · ${base.PECA[id].sistema}` : '';
  };
  const filtrarPecas = () => {
    const q = $('edBusca').value.trim().toLowerCase();
    let n = 0;
    $('edPecaGrade').querySelectorAll('.sb-peca').forEach((b) => { b.hidden = (sisPeca && b.dataset.sis !== sisPeca) || (q && !b.dataset.busca.includes(q)); if (!b.hidden) n++; });
    $('edPecaVazia').hidden = n > 0;
  };
  function montarDaBase() {
    const MAT = base.materiais;
    $('edCat').innerHTML = Object.entries(CATEGORIAS_CABO).map(([k, c]) => `<button type="button" data-cat="${k}" aria-pressed="${k === catAtual}" style="--c:${c.cor}"><i aria-hidden="true"></i>${esc(c.nome)}<small>${fmtUSD(MAT[c.mat]?.preco?.usd)}/m</small></button>`).join('');
    $('edInst').innerHTML = Object.entries(INSTALACOES).map(([k, i]) => `<button type="button" data-inst="${k}" aria-pressed="${k === instAtual}">${esc(i.nome)}<small>${i.mat ? `+${fmtUSD(MAT[i.mat]?.preco?.usd)}/m` : 'sem custo extra'}</small></button>`).join('');
    $('edSis').innerHTML = base.sistemas.map((s) => `<option${s === base.sistemaCabos ? ' selected' : ''}>${esc(s)}</option>`).join('');
    $('edGlbSis').innerHTML = base.sistemas.map((s, i) => `<option${i === base.sistemas.length - 1 ? ' selected' : ''}>${esc(s)}</option>`).join('');
    $('edGlbMat').innerHTML = opcoesMaterial(null);
    const ro = base.rotas.origens, rd = base.rotas.destinos;
    $('edRotaOrig').innerHTML = [...ro.map((o, i) => [String(i), o.nome]), ['ponto', 'Ponto clicado (1º ponto do trecho)']].map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('');
    $('edRotaDest').innerHTML = rd.length ? rd.map((o, i) => `<option value="${i}">${esc(o.nome)}</option>`).join('') : '<option value="">(o pacote não tem destinos)</option>';
    $('edRotaVazia').hidden = !!(rd.length && ro.length);
    sisPeca = null;
    $('edPecaSis').innerHTML = ['Todos', ...base.sistemas].map((s) => `<button type="button" data-sis="${esc(s)}" aria-pressed="${s === 'Todos'}">${esc(s)}</button>`).join('');
    $('edPecaGrade').innerHTML = base.pecas.map((p) => `<button type="button" class="sb-peca" data-peca="${esc(p.id)}" data-sis="${esc(p.sistema)}" data-busca="${esc((p.nome + ' ' + p.id + ' ' + p.sistema).toLowerCase())}" aria-pressed="false" title="${esc(p.nome)}">
      <img alt="" data-mini="${esc(p.id)}" hidden><span class="ph" aria-hidden="true"></span><span class="nome">${esc(p.nome)}</span></button>`).join('');
    escolherPeca(base.pecas.find((p) => p.copias > 0)?.id ?? base.pecas[0]?.id ?? '');
    $('edBusca').value = '';
    filtrarPecas();
    $('edPacoteNome').textContent = base.nome;
    $('edPacoteInfo').textContent = `${base.pecas.length} tipo(s) de peça · ${copias.length} cópia(s) no modelo · ${base.terreno ? 'chão marcado' : 'chão plano automático'}`;
  }

  function montarControles() {
    $('edCat').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-cat]');
      if (!b) return;
      catAtual = b.dataset.cat;
      $('edCat').querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('edInst').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-inst]');
      if (!b) return;
      instAtual = b.dataset.inst;
      $('edInst').querySelectorAll('[data-inst]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('edRotaGerar').addEventListener('click', () => gerarRota());
    $('edSemLista').addEventListener('change', (ev) => {
      const li = ev.target.closest('li[data-id]'), e = li && edicao(li.dataset.id);
      if (!e || ev.target.dataset.acao !== 'L') return;
      const v = +ev.target.value;
      if (!(v > 0)) { aviso('Digite um comprimento maior que zero.'); desenharSemDesenho(); return; }
      e.comprimento_m = Math.min(100000, v);
      commit('Comprimento atualizado');
    });
    $('edSemLista').addEventListener('click', (ev) => {
      const li = ev.target.closest('li[data-id]');
      if (li && ev.target.closest('button[data-acao="excluir"]')) removerEdicao(li.dataset.id);
    });
    $('edFiltro').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-filtro]');
      if (!b) return;
      filtroLista = b.dataset.filtro;
      desenharLista();
    });
    $('edLista').addEventListener('change', (ev) => {
      const li = ev.target.closest('li[data-id]'), e = li && edicao(li.dataset.id);
      if (!e) return;
      if (ev.target.dataset.acao === 'ativo') { e.ativo = ev.target.checked; commit(e.ativo ? 'Edição ligada' : 'Edição desligada'); }
      if (ev.target.dataset.acao === 'nome') { e.nome = ev.target.value.slice(0, 140); commit(); }
    });
    $('edLista').addEventListener('click', (ev) => {
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
    $('edCalha').addEventListener('change', (e) => { $('edCalhaL').hidden = !e.target.checked; });
    for (const id of ['edFeixe', 'edFolga']) $(id).addEventListener('input', desenharPrevia);
    $('edCaboOk').addEventListener('click', concluirCabo);
    $('edCaboVolta').addEventListener('click', voltarPonto);
    $('edCaboCancela').addEventListener('click', cancelarCabo);
    $('edCaboDigitar').addEventListener('click', () => {
      const L = +$('edCaboL').value;
      if (!(L > 0)) { aviso('Digite um comprimento maior que zero.'); return; }
      const box = new THREE.Box3().setFromObject(base.cena);
      const c = box.isEmpty() ? V() : box.getCenter(V());
      const local = $('edCaboLocal').value.trim();
      addEdicao({ tipo: 'cabo', ...configCabo(), ancora: 'fixo', comprimento_m: L, pos: pontoNoChao(c.x, c.z), local }, `${fmt(L, 1)} m de cabo${local ? ` em ${local}` : ''}`);
    });
    $('edPecaGrade').addEventListener('click', (ev) => { const b = ev.target.closest('.sb-peca'); if (b) escolherPeca(b.dataset.peca); });
    $('edPecaSis').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sis]');
      if (!b) return;
      sisPeca = b.dataset.sis === 'Todos' ? null : b.dataset.sis;
      $('edPecaSis').querySelectorAll('[data-sis]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      filtrarPecas();
    });
    $('edBusca').addEventListener('input', filtrarPecas);
    $('edGlbImportar').addEventListener('click', () => $('edGlbArquivo').click());
    $('edGlbArquivo').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) await importarGLB(f);
    });
    $('edGlbLista').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-modelo]');
      if (!b) return;
      modeloAtual = b.dataset.modelo;
      desenharModelos();
    });
    // preços
    $('edPrecoBusca').addEventListener('input', desenharPrecos);
    $('edPrecos').addEventListener('change', (e) => {
      const inp = e.target.closest('input[data-mat]');
      if (!inp) return;
      const k = inp.dataset.mat, ref = P.chavesDePreco(base)[k];
      if (!ref) return;
      const v = inp.value.trim() === '' ? null : +inp.value;
      if (v === null || !Number.isFinite(v) || v < 0) delete projeto.precos[k];
      else projeto.precos[k] = { usd: v, por: ref.por, nota: 'Preço do cliente' };
      commit(v === null ? 'Preço base restaurado' : 'Preço trocado');
      desenharPrecos();
    });
    $('edPrecos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-reset]');
      if (!b) return;
      delete projeto.precos[b.dataset.reset];
      commit('Preço base restaurado');
      desenharPrecos();
    });
    $('edCambio').addEventListener('change', (e) => {
      const v = +e.target.value;
      projeto.cambio_brl = e.target.value.trim() === '' || !(v > 0) ? null : Math.min(1000, v);
      commit('Câmbio atualizado');
    });
    $('edCores').addEventListener('change', (e) => { cores = e.target.checked; if (ativo) modoCinza(base.cena, !cores); });
    // projeto
    $('edNome').addEventListener('change', (e) => { projeto.nome = e.target.value.trim().slice(0, 140) || 'Meu orçamento'; commit(); });
    $('edAutor').addEventListener('change', (e) => { projeto.autor = e.target.value.trim().slice(0, 140); commit(); });
    $('edDesfazer').addEventListener('click', desfazer);
    $('edRefazer').addEventListener('click', refazer);
    $('edNovo').addEventListener('click', () => {
      if (projeto.edicoes.length && !confirm('Começar um orçamento novo sobre este pacote? O atual sai da tela (dá para voltar com Desfazer).')) return;
      trocarProjeto(P.novoProjeto(base), 'Orçamento novo');
    });
    // exportar
    $('edExpJson').addEventListener('click', () => { X.exportarProjeto(paraArquivo()); aviso('Projeto exportado (com o pacote junto)'); });
    $('edExpCsv').addEventListener('click', () => { X.exportarCSVProjeto(base, projeto); aviso('CSV exportado'); });
    $('edExpLink').addEventListener('click', async () => {
      try {
        const { url, tamanho } = await X.gerarLink(projeto);
        $('edLinkCampo').hidden = false;
        $('edLink').value = url;
        $('edLink').select();
        let copiado = false;
        try { await navigator.clipboard.writeText(url); copiado = true; } catch { /* sem permissão: o campo fica selecionado */ }
        aviso((tamanho > 8000 ? `Link longo (${fmt(tamanho, 0)} caracteres): prefira o arquivo .orc3d.json.` : copiado ? 'Link copiado.' : 'Link gerado: copie do campo.') + ' O link só abre onde este mesmo pacote já estiver aberto; para mandar tudo, use o arquivo .orc3d.json.');
      } catch (err) { aviso(`Não foi possível gerar o link: ${err.message}`); }
    });
    $('edExpPng').addEventListener('click', () => {
      soltarTC();
      const url = X.capturarPNG(renderer, scene, camera);
      const a = document.createElement('a'); a.href = url; a.download = `${X.slug(projeto.nome)}.png`; document.body.appendChild(a); a.click(); a.remove();
      aviso('Imagem exportada');
    });
    $('edExpRel').addEventListener('click', () => {
      soltarTC();
      const imagem = X.capturarPNG(renderer, scene, camera);
      const html = X.relatorioHTML({ base, projeto, base0, atual: res, semPrecos, impactos: C.impactos(base, projeto, res.custo), imagem });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const w = window.open(url, '_blank');
      if (!w) { const a = document.createElement('a'); a.href = url; a.download = `${X.slug(projeto.nome)}-relatorio.html`; document.body.appendChild(a); a.click(); a.remove(); aviso('Relatório baixado (abra e imprima como PDF)'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    $('edExpGlb').addEventListener('click', async () => {
      soltarTC();
      aviso('Gerando o modelo 3D…');
      try { const bytes = await exportarGLB(); aviso(`Modelo exportado (${fmt(bytes / 1e6, 1)} MB)`); }
      catch (err) { aviso(`Falha ao exportar: ${err.message}`); }
    });
    $('edResMin').addEventListener('click', () => {
      const aberto = $('edResCorpo').hidden;
      $('edResCorpo').hidden = !aberto;
      $('edResMin').setAttribute('aria-expanded', String(aberto));
      $('edResMin').textContent = aberto ? '▾' : '▸';
    });
    if (innerWidth <= 820) $('edResMin').click();
    $('edPrecosDet').addEventListener('toggle', () => { if ($('edPrecosDet').open) desenharPrecos(); });
  }
  async function exportarGLB() {
    const ocultos = [];
    for (const o of [previa, cursor, caixaSel]) if (o.visible) { o.visible = false; ocultos.push(o); }
    if (!cores) modoCinza(base.cena, false);
    try { return await X.exportarGLB(base.cena, projeto.nome); }
    finally {
      if (!cores) modoCinza(base.cena, true);
      for (const o of ocultos) o.visible = true;
    }
  }

  function desenharPrecos() {
    const f = $('edPrecoBusca').value.trim().toLowerCase();
    const chaves = P.chavesDePreco(base);
    const nome = (k) => (k.startsWith('componentes:') ? `Peça: ${base.PECA[k.slice(12)]?.nome ?? k}` : base.materiais[k]?.nome ?? k);
    const linhas = Object.entries(chaves).filter(([k]) => !f || nome(k).toLowerCase().includes(f));
    $('edPrecos').innerHTML = `<thead><tr><th>Item</th><th>Base</th><th>Cliente (US$)</th><th></th></tr></thead><tbody>${linhas.map(([k, pr]) => {
      const c = projeto.precos[k];
      return `<tr${c ? ' class="mudou"' : ''}><td><i class="sb-cor" style="background:${k.startsWith('componentes:') ? '#3fd18b' : corMat(base, k)}"></i>${esc(nome(k))}</td><td class="n">${fmtUSD(pr.usd)}/${esc(pr.por)}</td>
        <td><input type="number" min="0" step="any" data-mat="${esc(k)}" value="${c ? c.usd : ''}" placeholder="${pr.usd}" aria-label="Preço do cliente para ${esc(nome(k))} em US$ por ${esc(pr.por)}"></td>
        <td>${c ? `<button type="button" data-reset="${esc(k)}" title="Voltar ao preço base" aria-label="Voltar ao preço base">↺</button>` : ''}</td></tr>`;
    }).join('')}</tbody>`;
  }

  function sincronizarCampos() {
    if (document.activeElement !== $('edNome')) $('edNome').value = projeto.nome;
    if (document.activeElement !== $('edAutor')) $('edAutor').value = projeto.autor;
    $('edCambio').placeholder = fmt(base.cambio, 2);
    if (document.activeElement !== $('edCambio')) $('edCambio').value = projeto.cambio_brl ?? '';
    if ($('edPrecosDet').open) desenharPrecos();
    if (sel) desenharSel();
  }
  montarControles();

  // =====================================================================
  // API
  // =====================================================================
  return {
    /**
     * Troca a base (pacote) e o projeto. O modelo anterior volta ao original antes de sair.
     * projeto: objeto já validado contra a nova base (ou null para um projeto novo).
     */
    async usarBase(nova, p = null, msg = null) {
      const estavaAtivo = ativo;
      if (base) { soltarTC(); reverterVisual(); modoCinza(base.cena, false); }
      ativo = false;
      base = nova; pais = nova.pais; base0 = null; res = null; comparacao = null; imp = {}; sel = null;
      registrar();
      projeto = p ?? P.novoProjeto(base);
      projeto.base = { hash: base.id, nome: base.nome, biblioteca: base.biblioteca };
      hist = P.criarHistorico(projeto);
      montarDaBase();
      setFerramenta('navegar');
      ativo = true;
      modoCinza(base.cena, !cores);
      await trocarProjeto(projeto, msg);
      hist = P.criarHistorico(projeto); // pacote novo: nada para desfazer
      desenharLista();
      recalcular();
      aoTrocarProjeto?.();
      return estavaAtivo;
    },
    ativar(ligar) {
      if (!base || ligar === ativo) return;
      ativo = ligar;
      $('edRes').hidden = !ligar;
      if (!ligar) { soltarTC(); cancelarCabo(); cursor.visible = false; caixaSel.visible = false; }
    },
    get base() { return base; },
    get projeto() { return projeto; },
    get resultado() { return res; },
    get base0() { return base0; },
    paraArquivo,
    /** Aplica um projeto (objeto cru) sobre a base atual, como se viesse de um arquivo. */
    async carregar(obj, msg) { const { projeto: p, avisos } = P.validarProjeto(obj, base); await trocarProjeto(p, msg); recalcular(); return { res, avisos }; },
    comparar(obj, nome) {
      const { projeto: p } = P.validarProjeto(obj, base);
      comparacao = { nome: nome ?? p.nome, r: C.calcular(base, p) };
      mostrarComparacao();
      $('edRes').hidden = false;
      if ($('edResCorpo').hidden) $('edResMin').click();
      return comparacao.r;
    },
    gerarRota: (o, d, modo) => gerarRota(o, d, modo),
    editar: (e) => addEdicao(e),
    importarGLB: (f) => importarGLB(f),
    setFerramenta,
    clicar,
    concluirCabo,
    escolherPeca,
    filtrar(f) { filtroLista = f; desenharLista(); },
    arquivo: () => P.serializar(paraArquivo()),
    recalcular,
    csv: () => C.csvDoProjeto(base, projeto),
    gerarLink: () => X.gerarLink(projeto),
    exportarGLB,
    copias: () => copias.map((c) => c.chave),
  };
}
