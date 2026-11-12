// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/architecture/bom.js, commit 6efe428).
// Quantitativos por peça (medidos na malha) e soma da obra. Tudo recebe a BASE como parâmetro
// (peças + materiais do pacote do projeto); não há preço de componente embutido no código:
// peça com `preco_un` vira um item "componentes" com preço próprio.
import { medirPeca } from './geom.js';
import { fmt } from '../util.js';

const caches = new Map(); // base.id -> { q: Map, med: Map }
const ORDEM_CONF = { oficial: 0, artigo: 1, estimado: 2 };
const pior = (a, b) => ((ORDEM_CONF[a] ?? 2) >= (ORDEM_CONF[b] ?? 2) ? a : b);
function cachesDe(base) {
  let c = caches.get(base.id);
  if (!c) {
    if (caches.size > 6) caches.clear();
    c = { q: new Map(), med: new Map() };
    caches.set(base.id, c);
  }
  return c;
}
/** Esquece as medições de uma base (ex.: depois de trocar a marcação no assistente). */
export const limparCache = (base) => { caches.delete(base.id); };

/** Preço unitário (US$) de um material na unidade em que ele é cobrado. ctx.precos (cliente) tem prioridade. */
export const precoDe = (base, mat, ctx = null) => ctx?.precos?.[mat] ?? base.materiais[mat]?.preco ?? null;

/** Chave estável de um objeto de opções (para cache). */
const chave = (o) => (o && Object.keys(o).length ? JSON.stringify(o, Object.keys(o).sort()) : '');

/** Mede a malha de uma peça (com opções) uma vez e guarda. Peças do pacote sem opções: média das cópias do modelo. */
function medida(base, id, opcoes) {
  const C = cachesDe(base);
  const k = `${id}|${chave(opcoes)}`;
  if (C.med.has(k)) return C.med.get(k);
  if (C.med.size > 400) C.med.clear();
  let med = !chave(opcoes) && base.medir ? base.medir(id) : null;
  let semCache = false;
  if (!med) {
    const raiz = base.construir(id, true, opcoes ?? undefined);
    med = medirPeca(raiz);
    // malhas compartilhadas (modelo do pacote, modelos extras) não são descartadas
    raiz.traverse((o) => { if (o.isMesh && !o.userData.compartilhada) o.geometry.dispose(); });
    semCache = !!raiz.userData.semCache;
  }
  if (!semCache) C.med.set(k, med);
  return med;
}

/** Contexto de um item: o global (preços do cliente) com o do item por cima; os preços são mesclados. */
export function juntarCtx(g, it) {
  if (!it && !g) return null;
  const c = { ...g, ...it };
  if (g?.precos && it?.precos) c.precos = { ...g.precos, ...it.precos };
  return c;
}

/** Formata dinheiro em US$ (mil, mi, bi). */
export function fmtUSD(x) {
  if (!Number.isFinite(x) || x <= 0) return '–';
  if (x >= 1e9) return `US$ ${fmt(x / 1e9, 2)} bi`;
  if (x >= 1e6) return `US$ ${fmt(x / 1e6, x >= 1e8 ? 0 : 1)} mi`;
  if (x >= 1e3) return `US$ ${fmt(x / 1e3, x >= 1e5 ? 0 : 1)} mil`;
  return `US$ ${fmt(x, 0)}`;
}

/** Material que recebe armadura pela taxa da peça (kg/m³): o concreto (chave "concreto" ou "concreto_…"). */
const ehConcreto = (mat) => mat === 'concreto' || mat.startsWith('concreto_');

/**
 * Quantitativo de UMA peça: volume, área e massa por material (medidos na geometria),
 * calibrado pela massa informada (massa_t) quando ela existe, mais os itens contados (extras).
 * opcoes: parâmetros da peça (cabo, modelo extra...). ctx: { precos, trocas }.
 * Sem opcoes nem ctx, o resultado é exatamente o da base (e fica em cache).
 */
export function quantitativos(base, id, opcoes = null, ctx = null) {
  const C = cachesDe(base);
  const simples = !chave(opcoes) && !ctx;
  if (simples && C.q.has(id)) return C.q.get(id);
  const p = base.PECA[id], MAT = base.materiais;
  const med = medida(base, id, simples ? null : opcoes);
  const trocas = ctx?.trocas ?? {};
  const linhas = [];
  let massaModelo = 0, aberta = false;
  for (const [mat0, m] of Object.entries(med)) {
    const mat = trocas[mat0] && MAT[trocas[mat0]] ? trocas[mat0] : mat0;
    const info = MAT[mat];
    if (!info) continue;
    const massa = info.densidade ? (m.vol * info.densidade) / 1000 : 0; // t
    massaModelo += massa;
    if (m.aberta) aberta = true;
    linhas.push({ mat, vol: m.vol, area: m.area, comprimento: m.comprimento, massa, aberta: !!m.aberta, conf: mat === mat0 ? info.confidence ?? 'estimado' : 'estimado' });
  }
  const pesq = p.pesquisado;
  // peça alterada (outras opções ou outro material) mantém o fator de calibração da peça original
  const alterada = !simples && (chave(opcoes) || Object.keys(trocas).length);
  const fator = alterada && pesq?.massa_t ? quantitativos(base, id).fator : pesq?.massa_t && massaModelo > 0 ? pesq.massa_t / massaModelo : 1;
  for (const l of linhas) {
    l.massaCal = l.massa * fator;
    const pr = precoDe(base, l.mat, ctx);
    const q = !pr ? 0 : pr.por === 't' ? l.massaCal : pr.por === 'kg' ? l.massaCal * 1000 : pr.por === 'm³' ? l.vol * fator : pr.por === 'm²' ? l.area : 0;
    l.custo = pr ? q * pr.usd : 0;
  }
  // derivado: armadura do concreto pela taxa da peça
  const extras = [];
  const conc = linhas.filter((l) => ehConcreto(l.mat)).reduce((s, l) => s + l.vol * fator, 0);
  if (conc > 0 && p.taxa) extras.push({ mat: 'armadura', qtd: (conc * p.taxa) / 1000, un: 't', massa: (conc * p.taxa) / 1000, fonte: 'calculo', conf: 'estimado', nota: `Taxa de ${p.taxa} kg/m³ de concreto.` });
  const listaExtras = typeof p.extras === 'function' ? p.extras(opcoes ?? {}) : p.extras ?? [];
  for (const [mat, q, fonte, conf, nota] of listaExtras) {
    const info = MAT[mat] ?? {};
    // massa: por área (telhas, painéis, eletrocalha) ou por metro (cabos)
    const massa = info.densidade_area ? (q * info.densidade_area) / 1000 : info.kg_m ? (q * info.kg_m) / 1000 : 0;
    extras.push({ mat, qtd: q, un: info.unidade ?? 'un', massa, fonte, conf, nota });
  }
  for (const e of extras) {
    const pr = precoDe(base, e.mat, ctx);
    const prComp = ctx?.precos?.[`componentes:${id}`];
    if (e.mat === 'componentes' && (prComp || p.preco_un != null)) {
      e.custo = e.qtd * (prComp?.usd ?? p.preco_un);
      e.notaPreco = prComp ? 'Preço definido no projeto.' : 'Preço por unidade definido no pacote.';
    } else e.custo = pr ? e.qtd * pr.usd : 0;
  }
  const massaTotal = linhas.reduce((s, l) => s + l.massaCal, 0) + extras.reduce((s, e) => s + e.massa, 0);
  const custo = linhas.reduce((s, l) => s + l.custo, 0) + extras.reduce((s, e) => s + e.custo, 0);
  const r = { id, linhas, extras, massaModelo, fator, pesq, massaTotal, custo, aberta };
  if (simples) C.q.set(id, r);
  return r;
}

export const nomeMat = (base, mat) => base.materiais[mat]?.nome ?? mat;
export const corMat = (base, mat) => base.materiais[mat]?.cor ?? '#888';

/**
 * Soma de toda a obra: por material e por sistema.
 * itens: [{ id, n, opcoes?, ctx?, sistema?, conf? }] (padrão: a obra base). Cada item passa pelo mesmo
 * quantitativos(); ctxGlobal (preços do cliente) vale para todos os itens.
 */
export function totalObra(base, itens = null, ctxGlobal = null) {
  const porMat = {}, porSis = Object.fromEntries(base.sistemas.map((s) => [s, 0]));
  const custoSis = Object.fromEntries(base.sistemas.map((s) => [s, 0]));
  const add = (mat, qtd, un, massa, conf, custo = 0) => {
    const a = (porMat[mat] ??= { mat, qtd: 0, un, massa: 0, conf, custo: 0 });
    a.qtd += qtd; a.massa += massa; a.custo += custo; a.conf = pior(a.conf, conf);
  };
  const MAT = base.materiais;
  for (const it of itens ?? base.itensBase()) {
    const p = base.PECA[it.id], n = it.n;
    if (!p || !(n > 0)) continue;
    const sis = it.sistema || p.sistema || base.sistemas[0];
    porSis[sis] ??= 0; custoSis[sis] ??= 0;
    const confQ = it.conf ?? p.qtd[2];
    const ctx = juntarCtx(ctxGlobal, it.ctx);
    const q = quantitativos(base, it.id, it.opcoes ?? null, ctx);
    for (const l of q.linhas) {
      const un = MAT[l.mat]?.unidade;
      const qtd = un === 'm³' ? l.vol : un === 'kg' ? l.massaCal * 1000 : un === 'm²' ? l.area : l.massaCal;
      add(l.mat, qtd * n, un === 'kg' ? 'kg' : un === 'm³' ? 'm³' : un === 'm²' ? 'm²' : 't', l.massaCal * n, pior(l.conf, confQ), l.custo * n);
      porSis[sis] += l.massaCal * n;
      custoSis[sis] += l.custo * n;
    }
    for (const e of q.extras) {
      add(e.mat, e.qtd * n, e.un, e.massa * n, pior(e.conf, confQ), e.custo * n);
      porSis[sis] += e.massa * n;
      custoSis[sis] += e.custo * n;
    }
  }
  const massa = Object.values(porMat).reduce((s, m) => s + m.massa, 0);
  const custo = Object.values(porMat).reduce((s, m) => s + m.custo, 0);
  return { porMat, porSis, massa, custo, custoSis };
}

/**
 * CSV do BOM (separador ;, com BOM UTF-8). Sem itens, é a obra base.
 * Itens com `origem` (projeto do editor) ganham as colunas origem e edicao_id.
 */
export function gerarCSV(base, itens = null, ctxGlobal = null) {
  const MAT = base.materiais;
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const editado = !!itens;
  const cab = ['tipo', 'peca', 'sistema', 'quantidade_pecas', 'fonte_quantidade', 'confianca_quantidade', 'material', 'especificacao', 'volume_m3_por_peca', 'area_m2_por_peca', 'massa_t_por_peca', 'massa_t_total', 'qtd_extra_por_peca', 'unidade_extra', 'fator_calibracao', 'custo_usd_por_peca', 'custo_usd_total'];
  const rows = [editado ? [...cab, 'origem', 'edicao_id'] : cab];
  for (const it of itens ?? base.itensBase()) {
    const p = base.PECA[it.id], n = it.n;
    if (!p) continue;
    if (editado && !(n > 0) && it.origem !== 'removido') continue;
    const ctx = juntarCtx(ctxGlobal, it.ctx);
    const r = quantitativos(base, it.id, it.opcoes ?? null, ctx);
    const nome = it.nome ?? p.nome, sis = it.sistema ?? p.sistema ?? '';
    const fonteQ = it.origem && it.origem !== 'base' ? 'usuario' : p.qtd[1], confQ = it.conf ?? p.qtd[2];
    const fim = editado ? [it.origem ?? 'base', it.edicoes ?? ''] : [];
    for (const l of r.linhas) rows.push(['material', nome, sis, n, fonteQ, confQ, nomeMat(base, l.mat), MAT[l.mat]?.spec ?? '', l.vol.toFixed(4), l.area.toFixed(3), l.massaCal.toFixed(4), (l.massaCal * n).toFixed(3), '', '', r.fator.toFixed(3), l.custo.toFixed(2), (l.custo * n).toFixed(2), ...fim]);
    for (const e of r.extras) rows.push(['item', nome, sis, n, e.fonte, e.conf, nomeMat(base, e.mat), MAT[e.mat]?.spec ?? '', '', '', e.massa.toFixed(4), (e.massa * n).toFixed(3), e.qtd.toFixed(3), e.un, '', e.custo.toFixed(2), (e.custo * n).toFixed(2), ...fim]);
  }
  return '﻿' + rows.map((r) => r.map(q).join(';')).join('\n');
}

/** Baixa um texto (ou Blob) como arquivo. */
export function baixar(texto, nome, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(texto instanceof Blob ? texto : new Blob([texto], { type: tipo }));
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
