// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/util.js e js/data.js, commit 6efe428).
// Funções pequenas usadas em toda a página: formatação de números, aviso, escape de texto e selos.

export const DEG = Math.PI / 180;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const ehToque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

const nf = new Map();
export function fmt(x, d = 1) {
  if (!Number.isFinite(x)) return '–';
  let f = nf.get(d);
  if (!f) { f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); nf.set(d, f); }
  return f.format(x);
}
/** Formata com dígitos significativos razoáveis. */
export function fmtA(x) {
  const a = Math.abs(x);
  if (!Number.isFinite(x)) return '–';
  if (a === 0) return '0';
  if (a >= 100) return fmt(x, 0);
  if (a >= 10) return fmt(x, 1);
  if (a >= 1) return fmt(x, 2);
  if (a >= 0.01) return fmt(x, 3);
  return x.toExponential(1).replace('.', ',');
}

/** Mensagem curta no topo da tela. */
export function aviso(txt, ms = 2600) {
  const el = document.getElementById('aviso');
  if (!el) return;
  el.textContent = txt;
  el.classList.add('on');
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => el.classList.remove('on'), Math.max(ms, Math.min(9000, txt.length * 55)));
}

/** Escapa texto para entrar em HTML (inclusive em atributos). Todo texto vindo de arquivo passa por aqui. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let FONTES = {};
export function usarFontes(f) { FONTES = f && typeof f === 'object' ? f : {}; }
/** Selo de confiança (oficial, artigo, estimado), com a fonte no título. */
export function selo(conf, chaveFonte) {
  const c = ['oficial', 'artigo', 'estimado'].includes(conf) ? conf : 'estimado';
  const f = chaveFonte ? FONTES[chaveFonte] : null;
  const titulo = f?.titulo ?? (chaveFonte === 'ifc' ? 'Quantidade oficial do arquivo IFC (IfcElementQuantity)' : chaveFonte === 'pacote' ? 'Valor definido no pacote do projeto' : chaveFonte === 'usuario' ? 'Valor definido no projeto' : c);
  return `<span class="conf ${c}" title="${esc(titulo)}">${c}</span>`;
}

/** Normaliza um texto para id: sem acento, minúsculo, espaços e símbolos viram "-". */
export function slugId(s, max = 40) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
}

/** Promessa com tempo-limite (leitura de arquivos). */
export function comTempo(p, ms, msg) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })]).finally(() => clearTimeout(t));
}
