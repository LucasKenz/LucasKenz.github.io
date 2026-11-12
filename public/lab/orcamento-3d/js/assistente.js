// Assistente "Importar meu projeto": monta o pacote em seis passos, com voltar/avançar.
// 1 leitura e conferência (unidade, eixo, tamanho) · 2 peças encontradas (marcar clicando no 3D) ·
// 3 catálogo (com .csv) · 4 materiais que faltam · 5 chão e pontos de rota · 6 salvar e começar a orçar.
// A lógica fica em base/montagem.js; aqui só a interface e a pré-visualização no 3D.
import * as THREE from 'three';
import * as M from './base/montagem.js';
import { UNIDADES, textoTamanho, nomeBruto, caminhos } from './formatos/comum.js';
import { lerCatalogo, MODELO_CSV } from './formatos/csv.js';
import { validarPacote, montarBase, UNIDADES_MAT, FORMATO_PACOTE } from './base/pacote.js';
import { totalObra, fmtUSD, baixar, limparCache } from './nucleo/bom.js';
import { lerJSON, serializar } from './nucleo/projeto.js';
import { slug } from './nucleo/exportar.js';
import { esc, fmt, fmtA, aviso, slugId } from './util.js';

const $ = (id) => document.getElementById(id);
const PASSOS = ['Leitura', 'Peças', 'Catálogo', 'Materiais', 'Chão e rotas', 'Concluir'];
const PALETA = ['#5d86ff', '#3fd18b', '#ffc21a', '#e2733a', '#c084fc', '#56c7e8', '#ff6b6b', '#d6b46a', '#9fb7ff', '#f472b6', '#a3e635', '#fb923c'];

export function criarAssistente({ scene, camera, renderer, controls, biblioteca, enquadrar, aoSair, aoConcluir }) {
  let estado = null, passo = 0, ocupado = false, assinatura = '';
  const grupo = new THREE.Group(); // pré-visualização
  grupo.name = 'assistente';
  scene.add(grupo);
  const selecao = new Set();        // malhas clicadas (passo 2)
  let modoClique = null;            // 'marcar' | 'chao' | 'origem' | 'destino'
  const originais = new Map();      // malha -> material original (pré-visualização colorida)
  const cache = new Map();

  // ---------- pré-visualização ----------
  function limparPrevia() {
    restaurarCores();
    while (grupo.children.length) grupo.remove(grupo.children[0]);
  }
  function mostrarLeituras() {
    limparPrevia();
    for (const it of estado.itens) grupo.add(it.ajuste);
    enquadrar(grupo);
  }
  function mostrarCanonica() {
    limparPrevia();
    grupo.add(estado.canon.cena);
    enquadrar(grupo);
    pintar();
  }
  const matCor = (cor, op = 1) => {
    const k = `${cor}|${op}`;
    if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7, metalness: 0.05, transparent: op < 1, opacity: op, depthWrite: op >= 1 }));
    return cache.get(k);
  };
  const corDe = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETA[h % PALETA.length]; };
  /** Colore o modelo: cada peça numa cor, cenário cinza translúcido, chão escuro, seleção em amarelo. */
  function pintar() {
    if (!estado?.canon) return;
    const { deObjeto } = caminhos(estado.canon.cena);
    const marcaDe = (o) => { for (let p = o; p; p = p.parent) { const c = deObjeto.get(p); if (c && estado.marcas.has(c)) return estado.marcas.get(c); } return null; };
    const noChao = (o) => { for (let p = o; p; p = p.parent) if (estado.terreno && deObjeto.get(p) === estado.terreno) return true; return false; };
    const rota = (o) => { for (let p = o; p; p = p.parent) { const c = deObjeto.get(p); if (c && (estado.rotas.origens.includes(c) || estado.rotas.destinos.includes(c))) return estado.rotas.origens.includes(c) ? 'o' : 'd'; } return null; };
    estado.canon.cena.traverse((m) => {
      if (!m.isMesh) return;
      if (!originais.has(m)) originais.set(m, m.material);
      const id = marcaDe(m), r = passo >= 4 ? rota(m) : null;
      m.material = selecao.has(m) ? matCor('#ffe066') : r === 'o' ? matCor('#3fd18b') : r === 'd' ? matCor('#ff6b6b') : noChao(m) ? matCor('#2a3350') : id ? matCor(corDe(id)) : matCor('#6b7385', 0.35);
    });
  }
  function restaurarCores() {
    for (const [m, mat] of originais) m.material = mat;
    originais.clear();
  }

  // ---------- clique no 3D ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function malhaEm(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObject(grupo, true).find((h) => h.object.isMesh)?.object ?? null;
  }
  /** Nó a usar para chão/rota: a cópia que contém a malha, ou a própria malha. */
  function noDe(m) {
    const { deObjeto } = caminhos(estado.canon.cena);
    for (let p = m; p; p = p.parent) { const c = deObjeto.get(p); if (c && estado.marcas.has(c)) return c; }
    return deObjeto.get(m) ?? null;
  }
  function clicar(cx, cy) {
    if (document.body.dataset.tela !== 'assistente' || !modoClique || !estado?.canon) return null;
    const m = malhaEm(cx, cy);
    if (!m) return null;
    if (modoClique === 'marcar') {
      if (selecao.has(m)) selecao.delete(m); else selecao.add(m);
      desenhar();
    } else {
      const c = noDe(m);
      if (!c) return null;
      if (modoClique === 'chao') estado.terreno = estado.terreno === c ? null : c;
      else {
        const lista = estado.rotas[modoClique === 'origem' ? 'origens' : 'destinos'];
        const i = lista.indexOf(c);
        if (i >= 0) lista.splice(i, 1); else if (lista.length < 50) lista.push(c);
      }
      desenhar();
    }
    pintar();
    return m;
  }
  let baixo = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!baixo) return;
    const d = Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]);
    baixo = null;
    if (d <= 6) clicar(e.clientX, e.clientY);
  });

  // ---------- telas de cada passo ----------
  const nomeNo = (c) => {
    const o = caminhos(estado.canon.cena).porCaminho.get(c);
    return o ? nomeBruto(o) || c.split('/').pop() : c.split('/').pop();
  };
  const sistemasOpts = (atual) => estado.sistemas.map((s) => `<option${s === atual ? ' selected' : ''}>${esc(s)}</option>`).join('');
  function materiaisOpts(atual) {
    const MAT = M.MAT(estado);
    const lista = Object.entries(MAT).filter(([k, m]) => k !== '_meta' && m && (m.densidade || m.preco?.por === 'm²'));
    const falta = atual && !MAT[atual] ? `<option value="${esc(atual)}" selected>⚠ ${esc(atual)} (falta)</option>` : '';
    return `<option value="">(sem material: não mede volume)</option>${falta}${lista.map(([k, m]) => `<option value="${esc(k)}"${k === atual ? ' selected' : ''}>${esc(m.nome)}</option>`).join('')}`;
  }

  function telaLeitura() {
    const its = estado.itens.map((it, i) => `<div class="as-arq">
      <h3>${i === 0 ? 'Modelo principal' : 'Peça extra'}: ${esc(it.nome)}</h3>
      <p class="dica">${esc(it.formato.toUpperCase())} · ${fmt(it.malhas, 0)} malha(s) · ${fmt(it.tris, 0)} triângulos · ${fmt(it.nos, 0)} nós</p>
      <p class="as-tam" id="asTam${i}">${esc(textoTamanho(it.tamanho, fmt))}</p>
      <div class="sb-grade2">
        <label class="campo">Unidade do arquivo <select data-un="${i}">
          ${it.fatorArquivo != null ? `<option value="arquivo"${it.unidade === 'arquivo' ? ' selected' : ''}>do arquivo (×${fmt(it.fatorArquivo, it.fatorArquivo < 0.1 ? 3 : 2)})</option>` : ''}
          ${Object.entries(UNIDADES).map(([k, u]) => `<option value="${k}"${k === it.unidade ? ' selected' : ''}>${esc(u.nome)}</option>`).join('')}
        </select></label>
        <label class="caixa as-girar"><input type="checkbox" data-gira="${i}" ${it.girar ? 'checked' : ''}> Girar Z-up → Y-up</label>
      </div>
      ${it.avisos.length ? `<ul class="as-avisos">${it.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
    return `<p>Confira o <b>tamanho total</b> (largura × profundidade × altura). Se estiver 100 ou 1000 vezes errado, troque a unidade. Se o modelo aparecer deitado, marque "Girar".</p>
      ${its}
      ${estado.csv ? `<p class="dica">Catálogo .csv junto: <b>${estado.csv.pecas.length}</b> peça(s); ele preenche o passo 3.</p>` : ''}
      ${estado.avisos.length ? `<ul class="as-avisos">${estado.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}`;
  }

  function telaPecas() {
    const det = estado.det;
    const copias = M.copiasPorPeca(estado);
    const porId = new Map();
    for (const c of det.candidatos) {
      const g = porId.get(c.id) ?? { id: c.id, n: 0, tris: 0, mat: new Set(), incl: 0 };
      g.n++; g.tris += c.tris; if (c.material) g.mat.add(c.material);
      if (estado.marcas.get(c.caminho) === c.id) g.incl++;
      porId.set(c.id, g);
    }
    // peças criadas por clique (ids que não vieram da detecção)
    for (const [id, n] of copias) if (!porId.has(id)) porId.set(id, { id, n, tris: 0, mat: new Set(), incl: n, clique: true });
    const nCen = det.candidatos.filter((c) => !estado.marcas.has(c.caminho)).length + det.semNome.filter((s) => !estado.marcas.has(s.caminho)).length;
    const linhas = [...porId.values()].sort((a, b) => b.n - a.n || a.id.localeCompare(b.id)).map((g) => `<tr>
      <td><input type="checkbox" data-incl="${esc(g.id)}" ${g.incl ? 'checked' : ''} aria-label="Incluir ${esc(g.id)} no orçamento"></td>
      <td><i class="sb-cor" style="background:${corDe(g.id)}"></i><code>${esc(g.id)}</code></td>
      <td class="n">${fmt(g.incl, 0)}${g.incl !== g.n ? `/${fmt(g.n, 0)}` : ''}</td><td class="n">${g.clique ? '–' : fmt(g.tris, 0)}</td>
      <td>${esc([...g.mat].slice(0, 2).join(', ') || '–')}</td></tr>`).join('');
    return `<p>Cada linha é um <b>tipo de peça</b>; cada objeto com esse nome no modelo é uma <b>cópia</b>. O que ficar desmarcado vira <b>cenário</b> (cinza, fora do orçamento).</p>
      <div class="tabela-rolo"><table class="tabela as-tab"><thead><tr><th></th><th>Peça (id)</th><th>Cópias</th><th>Triâng.</th><th>Material no arquivo</th></tr></thead><tbody>${linhas || '<tr><td colspan="5">Nenhuma peça encontrada pelos nomes.</td></tr>'}</tbody></table></div>
      <p class="dica">Cenário: <b>${fmt(nCen, 0)}</b> objeto(s)${det.semNome.length ? ` · <b>${fmt(det.semNome.length, 0)}</b> malha(s) sem nome` : ''}${estado.terreno ? ` · chão detectado: <code>${esc(nomeNo(estado.terreno))}</code>` : ''}.</p>
      ${det.semNome.length || !porId.size ? '<p class="nota-div">Há malhas sem nome (comum em STL, PLY e OBJ sem grupos). Marque as peças clicando no 3D.</p>' : ''}
      <h3>Marcar peças clicando no 3D</h3>
      <div class="linha-btn"><button type="button" id="asModoMarcar" aria-pressed="${modoClique === 'marcar'}">${modoClique === 'marcar' ? 'Clicando… (clique de novo para parar)' : 'Selecionar malhas no 3D'}</button>
      ${selecao.size ? '<button type="button" id="asLimparSel">Limpar seleção</button>' : ''}</div>
      <p class="sb-status">${selecao.size ? `${selecao.size} malha(s) selecionada(s).` : 'Nenhuma malha selecionada.'}</p>
      <div class="sb-grade2"><label class="campo">Id da peça <input type="text" id="asNovoId" maxlength="40" placeholder="ex.: pilar"></label>
      <label class="campo">Nome <input type="text" id="asNovoNome" maxlength="80" placeholder="ex.: Pilar 40×40"></label></div>
      <div class="linha-btn"><button type="button" id="asCriar" ${selecao.size ? '' : 'disabled'}>Criar peça com estas malhas</button><button type="button" id="asCenario" ${selecao.size ? '' : 'disabled'}>Virar cenário</button></div>
      <p class="dica">Cada malha selecionada vira uma cópia da peça.</p>`;
  }

  function telaCatalogo() {
    const copias = M.copiasPorPeca(estado);
    const lista = [...estado.catalogo.values()].filter((p) => copias.has(p.id) || p.qtd > 0);
    const num = (p, k, passo = 'any') => `<input type="number" min="0" step="${passo}" data-cat="${esc(p.id)}" data-k="${k}" value="${p[k] ?? ''}" aria-label="${k} de ${esc(p.id)}">`;
    const linhas = lista.map((p) => `<tr>
      <td><code>${esc(p.id)}</code><br><small>${fmt(copias.get(p.id) ?? 0, 0)} cópia(s)</small></td>
      <td><input type="text" maxlength="80" data-cat="${esc(p.id)}" data-k="nome" value="${esc(p.nome ?? '')}" aria-label="Nome de ${esc(p.id)}"></td>
      <td><select data-cat="${esc(p.id)}" data-k="sistema" aria-label="Sistema de ${esc(p.id)}">${sistemasOpts(p.sistema)}</select></td>
      <td><select data-cat="${esc(p.id)}" data-k="material" aria-label="Material de ${esc(p.id)}">${materiaisOpts(p.material)}</select></td>
      <td>${num(p, 'massa_t')}</td><td>${num(p, 'taxa')}</td><td>${num(p, 'preco_un')}</td>
      <td><input type="number" min="0" step="1" data-cat="${esc(p.id)}" data-k="qtd" value="${p.qtd ?? ''}" placeholder="${copias.get(p.id) ?? 0}" aria-label="Quantidade de ${esc(p.id)}"></td>
      <td>${(p.extras ?? []).map((e) => `<small>${esc(e[0])}: ${fmtA(e[1])}</small>`).join('<br>') || '–'}</td></tr>`).join('');
    return `<p>Defina o que cada peça custa. <b>Material</b> mede o volume na malha (× densidade × preço). <b>massa_t</b> calibra a massa por peça. <b>taxa</b> = kg de armadura por m³ de concreto. <b>preco_un</b> = preço por unidade (US$), para equipamentos e malhas abertas. <b>qtd</b> vazia = número de cópias no modelo.</p>
      <label class="campo">Sistemas (separados por vírgula) <input type="text" id="asSistemas" value="${esc(estado.sistemas.join(', '))}"></label>
      <div class="tabela-rolo as-cat"><table class="tabela"><thead><tr><th>Id</th><th>Nome</th><th>Sistema</th><th>Material</th><th>massa_t</th><th>taxa</th><th>preco_un</th><th>qtd</th><th>Extras</th></tr></thead><tbody>${linhas || '<tr><td colspan="9">Nenhuma peça marcada.</td></tr>'}</tbody></table></div>
      <div class="linha-btn"><button type="button" id="asCsv">Importar catálogo (.csv ou pacote .json)…</button><button type="button" id="asCsvModelo">Baixar modelo de .csv</button></div>
      <input type="file" id="asCsvArq" accept=".csv,.json,text/csv,application/json" hidden>`;
  }

  function telaMateriais() {
    const falta = M.materiaisFaltando(estado);
    const MAT = M.MAT(estado);
    const opts = Object.entries(MAT).filter(([k, m]) => k !== '_meta' && m).map(([k, m]) => `<option value="${esc(k)}">${esc(m.nome)}</option>`).join('');
    const un = (sel) => UNIDADES_MAT.map((u) => `<option${u === sel ? ' selected' : ''}>${u}</option>`).join('');
    const itens = [...falta.entries()].map(([k, ids]) => `<div class="as-mat" data-mat="${esc(k)}">
      <h3>⚠ <code>${esc(k)}</code> <small>usado em ${esc(ids.join(', '))}</small></h3>
      <div class="sb-linha"><select data-mapa="${esc(k)}" aria-label="Material existente">${opts}</select><button type="button" data-acao="mapear" data-mat="${esc(k)}">Usar este</button></div>
      <p class="dica">ou crie:</p>
      <div class="as-grade4">
        <label class="campo">Nome <input type="text" data-novo="nome" maxlength="80" value="${esc(k.replace(/_/g, ' '))}"></label>
        <label class="campo">Unidade <select data-novo="unidade">${un('m³')}</select></label>
        <label class="campo">Densidade (kg/m³) <input type="number" min="1" max="30000" step="any" data-novo="densidade" placeholder="ex.: 2400"></label>
        <label class="campo">kg/m² (chapas) <input type="number" min="0" step="any" data-novo="densidade_area" placeholder="opcional"></label>
        <label class="campo">Preço (US$) <input type="number" min="0" step="any" data-novo="usd" placeholder="ex.: 450"></label>
        <label class="campo">por <select data-novo="por">${un('m³')}</select></label>
      </div>
      <div class="linha-btn"><button type="button" data-acao="criar" data-mat="${esc(k)}">Criar material</button></div></div>`).join('');
    const proprios = Object.entries(estado.materiais).map(([k, m]) => `<li><code>${esc(k)}</code> ${esc(m.nome)} · ${m.densidade ? `${fmt(m.densidade, 0)} kg/m³ · ` : ''}${m.preco ? `${fmtUSD(m.preco.usd)}/${esc(m.preco.por)}` : 'sem preço'} <button type="button" data-tirar="${esc(k)}" aria-label="Remover material ${esc(k)}">×</button></li>`).join('');
    return `${falta.size ? `<p>${falta.size} material(is) usado(s) no catálogo não existe(m) na biblioteca. Use um existente ou crie (fica no pacote, como <b>estimado</b>).</p>${itens}` : '<p>✓ Todos os materiais do catálogo existem.</p>'}
      <h3>Materiais do pacote</h3>${proprios ? `<ul class="as-lista">${proprios}</ul>` : '<p class="dica">Nenhum (só a biblioteca padrão).</p>'}
      <p class="dica">Densidade em kg/m³ (concreto ~2400, aço ~7850). Preço por m³, t, kg ou m² (fornecido e instalado, US$).</p>`;
  }

  function telaChao() {
    const item = (c, k) => `<li><code>${esc(nomeNo(c))}</code> <button type="button" data-tira="${k}" data-no="${esc(c)}" aria-label="Remover">×</button></li>`;
    const b = (m, rot) => `<button type="button" data-modo="${m}" aria-pressed="${modoClique === m}">${modoClique === m ? 'Clicando…' : rot}</button>`;
    return `<p>Opcional. O <b>chão</b> é onde os cabos seguem o relevo (sem chão marcado, usa um plano automático). <b>Origens</b> e <b>destinos</b> são os pontos entre os quais o editor gera rotas de cabo pelo chão (ex.: quadro → poste).</p>
      <div class="linha-btn">${b('chao', 'Marcar chão (clique)')}${b('origem', 'Marcar origens (clique)')}${b('destino', 'Marcar destinos (clique)')}</div>
      <p class="sb-status">${modoClique ? 'Clique no modelo. Clicar de novo no mesmo objeto desmarca.' : ''}</p>
      <h3>Chão</h3><p>${estado.terreno ? `<code>${esc(nomeNo(estado.terreno))}</code> <button type="button" data-tira="chao" aria-label="Tirar chão">×</button>` : '<span class="dica">plano automático</span>'}</p>
      <h3>Origens <span class="as-pt o"></span></h3><ul class="as-lista">${estado.rotas.origens.map((c) => item(c, 'origens')).join('') || '<li class="dica">nenhuma</li>'}</ul>
      <h3>Destinos <span class="as-pt d"></span></h3><ul class="as-lista">${estado.rotas.destinos.map((c) => item(c, 'destinos')).join('') || '<li class="dica">nenhum</li>'}</ul>`;
  }

  let resumo = null;
  function telaConcluir() {
    let txt = '';
    try {
      const pac = M.montarPacote(estado);
      const { pacote, avisos } = validarPacote(pac, biblioteca);
      const base = montarBase(pacote, biblioteca, estado.canon.cena);
      limparCache(base);
      const T = totalObra(base);
      resumo = { pacote: pac, avisos, custo: T.custo, pecas: pacote.pecas.length, copias: Object.keys(pacote.marcacao).length };
      pintar();
      txt = `<div class="nums"><div class="num"><b>${fmt(resumo.pecas, 0)}</b><small>tipos de peça</small></div><div class="num"><b>${fmt(resumo.copias, 0)}</b><small>cópias marcadas</small></div><div class="num"><b>${fmtUSD(resumo.custo)}</b><small>custo da base (estimado)</small></div></div>
        ${avisos.length ? `<ul class="as-avisos">${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}`;
    } catch (err) { resumo = null; txt = `<p class="nota-div">${esc(err.message)}</p>`; }
    return `<label class="campo">Nome do projeto <input type="text" id="asNome" maxlength="140" value="${esc(estado.nome)}"></label>
      <div class="sb-grade2"><label class="campo">Autor <input type="text" id="asAutor" maxlength="140" value="${esc(estado.autor)}" placeholder="opcional"></label>
      <label class="campo">Câmbio (R$ por US$) <input type="number" id="asCambio" min="0.01" max="1000" step="0.01" value="${estado.cambio ?? ''}" placeholder="${fmt(biblioteca._meta?.cambio_brl?.valor ?? 5.4, 2)}"></label></div>
      ${txt}
      <div class="linha-btn as-fim"><button type="button" id="asSalvar">Salvar pacote (.orc3d-pacote.json)</button><button type="button" id="asComecar" class="primario">Começar a orçar</button></div>
      <p class="dica">O pacote guarda o modelo (convertido para .glb), a marcação, o catálogo e os materiais num arquivo só. Abra-o depois em "Abrir pacote/projeto" ou mande junto do orçamento.</p>`;
  }

  // ---------- desenho e navegação ----------
  function desenhar() {
    $('asPassos').innerHTML = PASSOS.map((p, i) => `<li class="${i === passo ? 'atual' : i < passo ? 'feito' : ''}"><span>${i + 1}</span>${esc(p)}</li>`).join('');
    $('asTitulo').textContent = `${passo + 1}. ${PASSOS[passo]}`;
    const telas = [telaLeitura, telaPecas, telaCatalogo, telaMateriais, telaChao, telaConcluir];
    $('asCorpo').innerHTML = estado ? telas[passo]() : '';
    $('asVoltar').disabled = passo === 0 || ocupado;
    $('asAvancar').hidden = passo === PASSOS.length - 1;
    $('asAvancar').disabled = ocupado;
    ligar();
  }
  function ligar() {
    const corpo = $('asCorpo');
    if (passo === 0) {
      corpo.querySelectorAll('[data-un]').forEach((s) => s.addEventListener('change', () => { const it = estado.itens[+s.dataset.un]; M.aplicarAjuste(it, { unidade: s.value }); mostrarLeituras(); desenhar(); }));
      corpo.querySelectorAll('[data-gira]').forEach((c) => c.addEventListener('change', () => { const it = estado.itens[+c.dataset.gira]; M.aplicarAjuste(it, { girar: c.checked }); mostrarLeituras(); desenhar(); }));
    }
    if (passo === 1) {
      corpo.querySelectorAll('[data-incl]').forEach((c) => c.addEventListener('change', () => {
        const id = c.dataset.incl;
        for (const cand of estado.det.candidatos) if (cand.id === id) { if (c.checked) estado.marcas.set(cand.caminho, id); else estado.marcas.delete(cand.caminho); }
        if (!c.checked) for (const [k, v] of [...estado.marcas]) if (v === id) estado.marcas.delete(k);
        M.sincronizarCatalogo(estado);
        pintar(); desenhar();
      }));
      $('asModoMarcar').onclick = () => { modoClique = modoClique === 'marcar' ? null : 'marcar'; desenhar(); };
      if ($('asLimparSel')) $('asLimparSel').onclick = () => { selecao.clear(); pintar(); desenhar(); };
      $('asCriar').onclick = () => {
        try {
          M.marcarMalhas(estado, [...selecao], $('asNovoId').value || $('asNovoNome').value, $('asNovoNome').value.trim());
          aviso(`${selecao.size} malha(s) marcada(s) como "${slugId($('asNovoId').value || $('asNovoNome').value)}"`);
          selecao.clear(); pintar(); desenhar();
        } catch (err) { aviso(err.message); }
      };
      $('asCenario').onclick = () => {
        const { deObjeto } = caminhos(estado.canon.cena);
        for (const m of selecao) for (let p = m; p; p = p.parent) { const c = deObjeto.get(p); if (c) estado.marcas.delete(c); }
        selecao.clear(); pintar(); desenhar();
      };
    }
    corpo.onchange = null;
    if (passo === 2) {
      corpo.onchange = (ev) => {
        const el = ev.target.closest('[data-cat]');
        if (!el) return;
        const p = estado.catalogo.get(el.dataset.cat), k = el.dataset.k;
        if (!p) return;
        if (['massa_t', 'taxa', 'preco_un', 'qtd'].includes(k)) {
          const v = el.value.trim() === '' ? undefined : +el.value;
          if (v !== undefined && !(v >= 0)) { aviso('Número inválido.'); el.value = p[k] ?? ''; return; }
          if (v === undefined) delete p[k]; else p[k] = k === 'qtd' ? Math.round(v) : v;
        } else p[k] = k === 'material' ? el.value || null : el.value.slice(0, 80);
      };
      $('asSistemas').addEventListener('change', (e) => {
        const s = [...new Set(e.target.value.split(',').map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
        if (!s.length) { aviso('Informe pelo menos um sistema.'); return; }
        estado.sistemas = s;
        for (const p of estado.catalogo.values()) if (!s.includes(p.sistema)) p.sistema = s[0];
        desenhar();
      });
      $('asCsv').onclick = () => $('asCsvArq').click();
      $('asCsvModelo').onclick = () => baixar(MODELO_CSV, 'catalogo-modelo.csv', 'text/csv;charset=utf-8');
      $('asCsvArq').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await importarCatalogo(f); };
    }
    if (passo === 3) {
      corpo.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.mat;
        const box = corpo.querySelector(`.as-mat[data-mat="${CSS.escape(k)}"]`);
        if (b.dataset.acao === 'mapear') { M.mapearFaltante(estado, k, box.querySelector('[data-mapa]').value); aviso(`"${k}" agora usa um material da biblioteca`); }
        else {
          const v = (n) => box.querySelector(`[data-novo="${n}"]`).value;
          const m = { nome: v('nome').trim() || k, unidade: v('unidade') };
          if (v('densidade')) m.densidade = +v('densidade');
          if (v('densidade_area')) m.densidade_area = +v('densidade_area');
          if (v('usd') !== '') m.preco = { usd: +v('usd'), por: v('por') };
          if (!m.densidade && !m.preco && !m.densidade_area) { aviso('Informe a densidade ou o preço.'); return; }
          estado.materiais[k] = m;
          aviso(`Material "${m.nome}" criado (estimado)`);
        }
        desenhar();
      }));
      corpo.querySelectorAll('[data-tirar]').forEach((b) => b.addEventListener('click', () => { delete estado.materiais[b.dataset.tirar]; desenhar(); }));
    }
    if (passo === 4) {
      corpo.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { modoClique = modoClique === b.dataset.modo ? null : b.dataset.modo; desenhar(); }));
      corpo.querySelectorAll('[data-tira]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.tira === 'chao') estado.terreno = null;
        else estado.rotas[b.dataset.tira] = estado.rotas[b.dataset.tira].filter((c) => c !== b.dataset.no);
        pintar(); desenhar();
      }));
    }
    if (passo === 5) {
      $('asNome').addEventListener('change', (e) => { estado.nome = e.target.value.trim().slice(0, 140); });
      $('asAutor').addEventListener('change', (e) => { estado.autor = e.target.value.trim().slice(0, 140); });
      $('asCambio').addEventListener('change', (e) => { const v = +e.target.value; estado.cambio = e.target.value.trim() && v > 0 ? Math.min(1000, v) : null; desenhar(); });
      $('asSalvar').onclick = () => salvar();
      $('asComecar').onclick = () => comecar();
    }
  }
  async function importarCatalogo(f) {
    try {
      if (/\.json$/i.test(f.name)) {
        const obj = lerJSON(await f.text(), 45e6);
        if (obj?.formato !== FORMATO_PACOTE) throw new Error('O .json precisa ser um pacote (.orc3d-pacote.json).');
        const { pacote } = validarPacote({ ...obj, modelo: undefined }, biblioteca);
        estado.sistemas = [...new Set([...estado.sistemas, ...pacote.sistemas])];
        M.aplicarCatalogo(estado, pacote.pecas, { materiais: pacote.materiais, cambio: pacote.cambio_brl });
        aviso(`Catálogo de "${pacote.nome}" aplicado (${pacote.pecas.length} peças)`);
      } else {
        const r = lerCatalogo(await f.text());
        M.aplicarCatalogo(estado, r.pecas);
        aviso(`Catálogo lido: ${r.pecas.length} peça(s)${r.avisos.length ? ` · ${r.avisos.slice(0, 3).join(' ')}` : ''}`);
      }
      pintar(); desenhar();
    } catch (err) { aviso(err.message, 6000); }
  }
  async function irPara(n) {
    if (ocupado || !estado) return;
    n = Math.max(0, Math.min(PASSOS.length - 1, n));
    if (passo === 0 && n > 0) {
      const sig = estado.itens.map((it) => `${it.unidade}|${it.girar}`).join(';');
      if (!estado.canon || sig !== assinatura) {
        ocupado = true; $('asCorpo').innerHTML = '<p class="sb-status">Convertendo o modelo para .glb e procurando as peças…</p>'; $('asAvancar').disabled = true;
        try { await M.converterEDetectar(estado); assinatura = sig; }
        catch (err) { ocupado = false; aviso(err.message, 7000); desenhar(); return; }
        ocupado = false;
      }
      mostrarCanonica();
    }
    if (n === 0) { modoClique = null; selecao.clear(); mostrarLeituras(); }
    if (n !== 1 && modoClique === 'marcar') modoClique = null;
    if (n !== 4 && ['chao', 'origem', 'destino'].includes(modoClique)) modoClique = null;
    passo = n;
    if (passo > 0) pintar();
    desenhar();
    $('assist').scrollTop = 0;
  }
  function salvar() {
    if (!resumo) { aviso('Corrija os problemas antes de salvar.'); return null; }
    const txt = serializar({ ...resumo.pacote, nome: estado.nome || resumo.pacote.nome });
    baixar(txt, `${slug(estado.nome || 'projeto')}.orc3d-pacote.json`, 'application/json');
    aviso('Pacote salvo');
    return txt;
  }
  async function comecar() {
    if (!resumo) { aviso('Corrija os problemas antes de começar.'); return; }
    const pac = { ...M.montarPacote(estado) };
    fechar(false);
    await aoConcluir(pac);
  }
  function fechar(voltar = true) {
    modoClique = null; selecao.clear();
    limparPrevia();
    estado = null;
    if (voltar) aoSair();
  }

  $('asVoltar').addEventListener('click', () => irPara(passo - 1));
  $('asAvancar').addEventListener('click', () => irPara(passo + 1));
  $('asFechar').addEventListener('click', () => { if (confirm('Sair do assistente? O que foi feito aqui se perde (salve o pacote antes, no último passo).')) fechar(); });
  $('asMais').addEventListener('click', () => $('asMaisArq').click());
  $('asMaisArq').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; api.receber(f); });

  const api = {
    /** Começa com os arquivos recebidos (3D + apoio + .csv). */
    async abrir(arquivos) {
      estado = M.novoEstado(biblioteca);
      passo = 0; assinatura = ''; modoClique = null; selecao.clear(); resumo = null;
      $('asCorpo').innerHTML = '<p class="sb-status">Lendo os arquivos…</p>';
      $('asPassos').innerHTML = '';
      try { await M.lerArquivos(estado, arquivos); }
      catch (err) { aviso(err.message, 8000); fechar(); throw err; }
      mostrarLeituras();
      desenhar();
    },
    /** Arquivos soltos durante o assistente: .csv/.json no catálogo; 3D recomeça. */
    async receber(arquivos) {
      const csv = arquivos.find((f) => /\.(csv|json)$/i.test(f.name));
      if (csv && estado?.canon) { await importarCatalogo(csv); if (passo !== 2) irPara(2); return; }
      if (arquivos.some((f) => /\.(glb|gltf|obj|fbx|dae|stl|ply)$/i.test(f.name))) await api.abrir(arquivos);
    },
    irPara, clicar, salvar, comecar,
    get estado() { return estado; },
    get passo() { return passo; },
    get resumo() { return resumo; },
    modo(m) { modoClique = m; desenhar(); },
    selecionarMalha(m) { selecao.add(m); pintar(); desenhar(); },
  };
  return api;
}
