// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/sandbox/calculo.js, commit 6efe428).
// Projeto -> lista de itens -> mesmo totalObra() da base. Nenhum cálculo paralelo:
// cada edição vira um item (tipo de peça + quantidade + opções) como se a peça já existisse na base.
import { CATEGORIAS_CABO, INSTALACOES, comprimentoCabo } from './pecas-editor.js';
import { obterExterno } from './externos.js';
import { totalObra, gerarCSV } from './bom.js';
import { fmt, fmtA } from '../util.js';

/** Opções da peça trecho-cabo a partir de uma edição "cabo". */
export function opcoesCabo(e) {
  const o = { categoria: e.categoria, feixe: e.feixe, folga_pct: e.folga_pct };
  if (e.instalacao && e.instalacao !== 'estrutura') o.instalacao = e.instalacao;
  if (e.pontos?.length >= 2) o.pontos = e.pontos;
  else o.comprimento_m = e.comprimento_m;
  return o;
}
/** Opções da peça modelo-externo a partir de uma edição "externo". */
export function opcoesExterno(e) {
  const o = { modelo: e.modelo, escala: e.escala };
  if (e.material) o.material = e.material;
  if (e.preco_usd != null) o.com_preco = true;
  return o;
}
export function opcoesCalha(e) {
  const o = { largura_m: e.eletrocalha?.largura_m ?? 0.3 };
  if (e.pontos?.length >= 2) o.pontos = e.pontos;
  else o.comprimento_m = e.comprimento_m;
  return o;
}
/** Edição que só entra no orçamento (não tem desenho no 3D). */
export const soOrcamento = (e) => e.tipo === 'cabo' && !(e.pontos?.length >= 2);

/**
 * Itens da obra editada. Edição por edição (só as ativas):
 * quantidade fixa o total do tipo; remover tira uma cópia; adicionar cria um item novo (n = 1);
 * material vale para todas as cópias do tipo (base e adicionadas); cabo cria trecho-cabo (+ eletrocalha).
 */
export function itensDoProjeto(base, projeto, ignorar = null) {
  const itens0 = new Map(base.itensBase().map((it) => [it.id, { ...it, origem: 'base', edicoes: [] }]));
  const novos = [];
  const trocas = {};
  for (const e of projeto.edicoes) {
    if (!e.ativo || e.id === ignorar) continue;
    const it = e.peca ? itens0.get(e.peca) : null;
    switch (e.tipo) {
      case 'quantidade': if (it) { it.n = e.qtd; it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'remover': if (it) { it.n = Math.max(0, it.n - (e.n ?? 1)); it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'mover': if (it) { it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'adicionar': novos.push({ id: e.peca, n: 1, opcoes: null, origem: 'adicionado', edicoes: [e.id], conf: 'estimado', nome: e.nome || undefined }); break;
      case 'material': (trocas[e.peca] ??= {})[e.de] = e.para; if (it) { it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'cabo': {
        const sis = base.sistemas.includes(e.sistema) ? e.sistema : base.sistemaCabos;
        const nome = e.nome || `Cabos de ${CATEGORIAS_CABO[e.categoria]?.nome.toLowerCase() ?? 'energia'}`;
        novos.push({ id: 'trecho-cabo', n: 1, opcoes: opcoesCabo(e), sistema: sis, nome, origem: 'adicionado', edicoes: [e.id], conf: 'estimado' });
        if (e.eletrocalha) novos.push({ id: 'eletrocalha', n: 1, opcoes: opcoesCalha(e), sistema: sis, nome: `Eletrocalha · ${nome}`, origem: 'adicionado', edicoes: [e.id], conf: 'estimado' });
        break;
      }
      case 'externo': {
        // preço informado: um "conjunto" por peça, com preço próprio deste item (mesclado aos preços do cliente)
        const ctx = e.preco_usd != null ? { precos: { 'componentes:modelo-externo': { usd: e.preco_usd, por: 'un' } } } : undefined;
        novos.push({ id: 'modelo-externo', n: e.qtd, opcoes: opcoesExterno(e), sistema: e.sistema, nome: e.nome || `Modelo 3D · ${obterExterno(e.modelo)?.nome ?? e.modelo}`, ctx, origem: 'adicionado', edicoes: [e.id], conf: 'estimado' });
        break;
      }
    }
  }
  const itens = [...itens0.values(), ...novos];
  for (const it of itens) {
    if (trocas[it.id]) it.ctx = { ...it.ctx, trocas: trocas[it.id] };
    if (it.origem === 'alterado' && it.n === 0) it.origem = 'removido';
    it.edicoes = it.edicoes.join(' ');
  }
  return itens;
}

const ctxDe = (projeto) => (projeto.precos && Object.keys(projeto.precos).length ? { precos: projeto.precos } : null);
export const cambioDe = (base, projeto) => projeto.cambio_brl ?? base.cambio ?? 5.4;

/** Todas as métricas de um projeto (ou da base, com projeto vazio). */
export function calcular(base, projeto, { semPrecos = false, ignorar = null } = {}) {
  const itens = itensDoProjeto(base, projeto, ignorar);
  const T = totalObra(base, itens, semPrecos ? null : ctxDe(projeto));
  const q = (mat) => T.porMat[mat]?.qtd ?? 0;
  const cabos = Object.fromEntries(Object.entries(CATEGORIAS_CABO).map(([k, c]) => [k, q(c.mat)]));
  return {
    itens, T, cabos,
    areas: { calha: q('eletrocalha') },
    massa: T.massa, custo: T.custo, custoSis: T.custoSis, porSis: T.porSis,
    cambio: cambioDe(base, projeto),
  };
}

export const projetoVazio = (p) => ({ ...p, edicoes: [], precos: {} });

/** Impacto de cada edição ativa no custo (custo total − custo sem a edição). */
export function impactos(base, projeto, custoTotal) {
  const r = {};
  for (const e of projeto.edicoes) {
    if (!e.ativo) continue;
    const sem = calcular(base, projeto, { ignorar: e.id });
    r[e.id] = { custo: custoTotal - sem.custo };
  }
  return r;
}

export function csvDoProjeto(base, projeto) {
  return gerarCSV(base, itensDoProjeto(base, projeto), ctxDe(projeto));
}

const UN_ORDEM = { 'm': 0, 'm²': 1, 'm³': 2, 't': 3, 'kg': 4, 'un': 5 };
/**
 * Linhas de métricas: [rótulo, unidade, f(resultado)]. Metros de cabo por categoria, depois a quantidade
 * de cada material na sua unidade (m, m², m³, t, kg, un), depois a massa total.
 */
export function linhasMetricas(base, ...rs) {
  const L = [];
  for (const [k, c] of Object.entries(CATEGORIAS_CABO)) L.push([`Cabo · ${c.nome}`, 'm', (x) => x.cabos[k]]);
  const cabosMat = new Set(Object.values(CATEGORIAS_CABO).map((c) => c.mat));
  const mats = new Map();
  for (const r of rs) for (const m of Object.values(r.T.porMat)) if (!cabosMat.has(m.mat) && !mats.has(m.mat)) mats.set(m.mat, m.un);
  const lista = [...mats.entries()].sort((a, b) => (UN_ORDEM[a[1]] ?? 9) - (UN_ORDEM[b[1]] ?? 9) || String(base.materiais[a[0]]?.nome ?? a[0]).localeCompare(base.materiais[b[0]]?.nome ?? b[0]));
  for (const [mat, un] of lista) L.push([base.materiais[mat]?.nome ?? mat, un, (x) => x.T.porMat[mat]?.qtd ?? 0]);
  L.push(['Massa total', 't', (x) => x.massa]);
  return L;
}

/** Diferença com sinal, formatada. */
export function dif(a, b, un, casas = null) {
  const d = b - a;
  if (Math.abs(d) < 1e-9) return '0';
  const s = d > 0 ? '+' : '−';
  return `${s}${casas === null ? fmtA(Math.abs(d)) : fmt(Math.abs(d), casas)}${un ? ' ' + un : ''}`;
}
export function difPct(a, b) {
  if (Math.abs(b - a) < 1e-9) return '';
  if (!a) return 'novo';
  const p = ((b - a) / a) * 100;
  return `${p > 0 ? '+' : '−'}${fmt(Math.abs(p), Math.abs(p) < 1 ? 2 : 1)}%`;
}

/** Descrição curta de uma edição (para a lista e o relatório). */
export function descrever(base, e) {
  const P = (id) => base.PECA[id]?.nome ?? id;
  const MAT = base.materiais;
  switch (e.tipo) {
    case 'cabo': {
      const L = comprimentoCabo(opcoesCabo(e));
      const c = CATEGORIAS_CABO[e.categoria]?.nome ?? e.categoria;
      const inst = e.instalacao && e.instalacao !== 'estrutura' ? ` · ${INSTALACOES[e.instalacao].nome.toLowerCase()}` : '';
      const rota = e.rota ? ` · ${e.rota.origem} → ${e.rota.destino}` : '';
      return `${c}: ${fmtA(L)} m de caminho × ${e.feixe} cabo(s)${e.folga_pct ? ` + ${fmt(e.folga_pct, 0)}% de folga` : ''} · ${e.sistema}${inst}${rota}${e.eletrocalha ? ` · eletrocalha ${fmt(e.eletrocalha.largura_m * 100, 0)} cm` : ''}${e.pontos ? '' : e.local ? ` · em ${e.local}` : ' · sem desenho'}`;
    }
    case 'adicionar': return `Adicionar 1 × ${P(e.peca)}`;
    case 'remover': return `Remover ${e.n ?? 1} × ${P(e.peca)}`;
    case 'mover': return `Mover ${P(e.peca)} (${e.chave})`;
    case 'quantidade': return `Quantidade de ${P(e.peca)}: ${fmt(e.qtd, 0)} (base ${fmt(base.PECA[e.peca]?.qtd[0] ?? 0, 0)})`;
    case 'material': return `${P(e.peca)}: ${MAT[e.de]?.nome ?? e.de} → ${MAT[e.para]?.nome ?? e.para}`;
    case 'externo': {
      const m = obterExterno(e.modelo);
      const custo = [e.material ? `${MAT[e.material]?.nome ?? e.material} pelo volume` : '', e.preco_usd != null ? `US$ ${fmt(e.preco_usd, 0)}/un.` : ''].filter(Boolean).join(' + ') || 'sem custo';
      return `${e.qtd} × ${m?.nome ?? 'modelo não carregado'} · escala ${fmt(e.escala, e.escala < 1 ? 3 : 1)} · ${custo} · ${e.sistema}`;
    }
  }
  return e.tipo;
}

export const ROTULO_TIPO = { cabo: 'Cabo', adicionar: 'Adicionar', remover: 'Remover', mover: 'Mover', quantidade: 'Quantidade', material: 'Material', externo: 'Modelo 3D' };
