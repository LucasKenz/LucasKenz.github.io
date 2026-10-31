// Fonte única de verdade: data/gmt-data.json (números do GMT) e data/materials.json (propriedades dos materiais).
let DATA = null;
let MATS = null;

export async function carregarDados() {
  const url = (f) => new URL(`../data/${f}`, import.meta.url);
  const [d, m] = await Promise.all([fetch(url('gmt-data.json')).then((r) => r.json()), fetch(url('materials.json')).then((r) => r.json())]);
  DATA = d;
  MATS = m;
  return { DATA, MATS };
}

export const dados = () => DATA;
export const materiais = () => MATS;

/** Entrada completa ({valor, fonte, confidence, nota}) por caminho "secao.chave". */
export function entrada(caminho) {
  let o = DATA;
  for (const k of caminho.split('.')) o = o?.[k];
  return o;
}

/** Só o valor numérico/texto. */
export function val(caminho) {
  const e = entrada(caminho);
  return e && typeof e === 'object' && 'valor' in e ? e.valor : e;
}

export function fonte(chave) {
  return DATA?._meta.fontes[chave] ?? { titulo: chave, url: '' };
}

export function selo(conf, chaveFonte) {
  const f = chaveFonte ? fonte(chaveFonte) : null;
  const titulo = f ? `${f.titulo}` : conf;
  const href = f?.url || '#fontes';
  return `<a class="conf ${conf}" href="${href}" target="${f?.url ? '_blank' : '_self'}" rel="noopener" title="${esc(titulo)}">${conf}</a>`;
}

/** Selo a partir de um caminho do JSON. */
export function seloDe(caminho) {
  const e = entrada(caminho);
  if (!e || typeof e !== 'object') return '';
  return selo(e.confidence, e.fonte);
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
