// Projeto do Sandbox -> lista de itens -> mesmo totalObra() do BOM. Nenhum cálculo paralelo:
// cada edição vira um item (tipo de peça + quantidade + opções) como se a peça já existisse na base.
import { PECA, PECAS_BASE, SISTEMAS, CATEGORIAS_CABO, comprimentoCabo } from '../model/parts.js';
import { totalObra, gerarCSV, itensBase } from '../architecture/bom.js';
import { materiais } from '../data.js';
import { fmt, fmtA } from '../util.js';

/** Opções da peça trecho-cabo a partir de uma edição "cabo". */
export function opcoesCabo(e) {
  const o = { categoria: e.categoria, feixe: e.feixe, folga_pct: e.folga_pct };
  if (e.pontos?.length >= 2) o.pontos = e.pontos;
  else o.comprimento_m = e.comprimento_m;
  return o;
}
export function opcoesCalha(e) {
  const o = { largura_m: e.eletrocalha?.largura_m ?? 0.3 };
  if (e.pontos?.length >= 2) o.pontos = e.pontos;
  else o.comprimento_m = e.comprimento_m;
  return o;
}

/**
 * Itens da obra editada. Ordem das regras, edição por edição (só as ativas):
 * quantidade fixa o total do tipo; remover tira uma cópia; adicionar cria um item novo (n = 1);
 * parâmetro e material valem para todas as cópias do tipo (base e adicionadas); cabo cria trecho-cabo (+ eletrocalha).
 */
export function itensDoProjeto(projeto, ignorar = null) {
  const base = new Map(itensBase().map((it) => [it.id, { ...it, origem: 'base', edicoes: [] }]));
  const novos = [];
  const params = {}, trocas = {};
  for (const e of projeto.edicoes) {
    if (!e.ativo || e.id === ignorar) continue;
    const it = e.peca ? base.get(e.peca) : null;
    switch (e.tipo) {
      case 'quantidade': if (it) { it.n = e.qtd; it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'remover': if (it) { it.n = Math.max(0, it.n - (e.n ?? 1)); it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'mover': if (it) { it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'adicionar': novos.push({ id: e.peca, n: 1, opcoes: e.opcoes ?? null, origem: 'adicionado', edicoes: [e.id], conf: 'estimado', nome: e.nome || undefined }); break;
      case 'parametro': params[e.peca] = { ...params[e.peca], ...e.valores }; if (it) { it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'material': (trocas[e.peca] ??= {})[e.de] = e.para; if (it) { it.origem = 'alterado'; it.edicoes.push(e.id); } break;
      case 'cabo': {
        const sis = SISTEMAS.includes(e.sistema) ? e.sistema : 'Instrumentação';
        const nome = e.nome || `Cabos de ${CATEGORIAS_CABO[e.categoria]?.nome.toLowerCase() ?? 'energia'}`;
        novos.push({ id: 'trecho-cabo', n: 1, opcoes: opcoesCabo(e), sistema: sis, nome, origem: 'adicionado', edicoes: [e.id], conf: 'estimado' });
        if (e.eletrocalha) novos.push({ id: 'eletrocalha', n: 1, opcoes: opcoesCalha(e), sistema: sis, nome: `Eletrocalha · ${nome}`, origem: 'adicionado', edicoes: [e.id], conf: 'estimado' });
        break;
      }
    }
  }
  const itens = [...base.values(), ...novos];
  for (const it of itens) {
    if (params[it.id]) it.opcoes = { ...it.opcoes, ...params[it.id] };
    if (trocas[it.id]) it.ctx = { trocas: trocas[it.id] };
    if (it.origem === 'alterado' && it.n === 0) it.origem = 'removido';
    it.edicoes = it.edicoes.join(' ');
  }
  return itens;
}

const ctxDe = (projeto) => (projeto.precos && Object.keys(projeto.precos).length ? { precos: projeto.precos } : null);
export const cambioDe = (projeto) => projeto.cambio_brl ?? materiais()._meta?.cambio_brl?.valor ?? 5.4;

/** Todas as métricas de um projeto (ou da base, com projeto vazio). */
export function calcular(projeto, { semPrecos = false, ignorar = null } = {}) {
  const itens = itensDoProjeto(projeto, ignorar);
  const T = totalObra(itens, semPrecos ? null : ctxDe(projeto));
  const q = (mat) => T.porMat[mat]?.qtd ?? 0;
  const cabos = Object.fromEntries(Object.entries(CATEGORIAS_CABO).map(([k, c]) => [k, q(c.mat)]));
  cabos.outros = q('cabo');
  let planta = 0;
  for (const it of itens) if (PECA[it.id]?.areaPlanta && it.n > 0) planta += it.n * PECA[it.id].areaPlanta(it.opcoes ?? {});
  return {
    itens, T, cabos,
    areas: { planta, calha: q('eletrocalha'), pintura: q('pintura'), revestimento: q('painel') },
    massa: T.massa, custo: T.custo, custoSis: T.custoSis, porSis: T.porSis,
    cambio: cambioDe(projeto),
  };
}

export const projetoVazio = (p) => ({ ...p, edicoes: [], precos: {} });

/** Impacto de cada edição ativa no custo (custo total − custo sem a edição). */
export function impactos(projeto, custoTotal) {
  const r = {};
  for (const e of projeto.edicoes) {
    if (!e.ativo) continue;
    const sem = calcular(projeto, { ignorar: e.id });
    r[e.id] = { custo: custoTotal - sem.custo };
  }
  return r;
}

export function csvDoProjeto(projeto) {
  return gerarCSV(itensDoProjeto(projeto), ctxDe(projeto));
}

/** Linhas de métricas: [rótulo, unidade, chave, formatação]. */
export function linhasMetricas(r) {
  const L = [];
  for (const [k, c] of Object.entries(CATEGORIAS_CABO)) L.push([`Cabo · ${c.nome}`, 'm', (x) => x.cabos[k]]);
  L.push(['Cabos e mangueiras (já na base)', 'm', (x) => x.cabos.outros]);
  L.push(['Área de planta (prédios e plataformas)', 'm²', (x) => x.areas.planta]);
  L.push(['Área de eletrocalha', 'm²', (x) => x.areas.calha]);
  L.push(['Área de pintura do aço', 'm²', (x) => x.areas.pintura]);
  L.push(['Área de painéis de revestimento', 'm²', (x) => x.areas.revestimento]);
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
export function descrever(e) {
  const P = (id) => PECA[id]?.nome ?? id;
  const MAT = materiais();
  switch (e.tipo) {
    case 'cabo': {
      const L = comprimentoCabo(opcoesCabo(e));
      const c = CATEGORIAS_CABO[e.categoria]?.nome ?? e.categoria;
      return `${c}: ${fmtA(L)} m de caminho × ${e.feixe} cabo(s)${e.folga_pct ? ` + ${fmt(e.folga_pct, 0)}% de folga` : ''} · ${e.sistema}${e.eletrocalha ? ` · eletrocalha ${fmt(e.eletrocalha.largura_m * 100, 0)} cm` : ''}${e.pontos ? '' : e.subsistema ? ` · em ${e.subsistema}` : ' · sem desenho'}`;
    }
    case 'adicionar': return `Adicionar 1 × ${P(e.peca)}`;
    case 'remover': return `Remover ${e.n ?? 1} × ${P(e.peca)}`;
    case 'mover': return `Mover ${P(e.peca)} (${e.chave})`;
    case 'quantidade': return `Quantidade de ${P(e.peca)}: ${fmt(e.qtd, 0)} (base ${fmt(PECA[e.peca]?.qtd[0] ?? 0, 0)})`;
    case 'parametro': {
      const defs = PECA[e.peca]?.parametros ?? [];
      return `${P(e.peca)}: ${defs.filter((d) => d.chave in e.valores).map((d) => `${d.nome.toLowerCase()} ${fmt(e.valores[d.chave], d.passo < 1 ? 1 : 0)} ${d.un}`).join(', ')}`;
    }
    case 'material': return `${P(e.peca)}: ${MAT[e.de]?.nome ?? e.de} → ${MAT[e.para]?.nome ?? e.para}`;
  }
  return e.tipo;
}

export const ROTULO_TIPO = { cabo: 'Cabo', adicionar: 'Adicionar', remover: 'Remover', mover: 'Mover', quantidade: 'Quantidade', parametro: 'Planta', material: 'Material' };
export { PECAS_BASE };
