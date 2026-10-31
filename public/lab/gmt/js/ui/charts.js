// Gráficos em canvas: linhas com tooltip, rosa dos ventos, histograma e barras horizontais.
// Paleta categórica (validada para o fundo escuro): azul, laranja, água, amarelo, magenta, verde.
import { fmt, fmtA } from '../util.js';

export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
const TINTA = '#eef1fa', TINTA2 = '#a8b2cc', GRADE = 'rgba(168,178,204,.14)', EIXO = 'rgba(168,178,204,.4)';
const FONTE = '11px "IBM Plex Mono", monospace';

function preparar(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!cv.dataset.w) { cv.dataset.w = cv.width; cv.dataset.h = cv.height; }
  const w = +cv.dataset.w, h = +cv.dataset.h;
  const cw = cv.clientWidth || w;
  const esc = cw / w;
  const W = Math.round(w * esc * dpr), H = Math.round(h * esc * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d');
  g.setTransform(dpr * esc, 0, 0, dpr * esc, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}

function passoBonito(faixa, n = 4) {
  const bruto = faixa / n, p = Math.pow(10, Math.floor(Math.log10(bruto))), m = bruto / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

/**
 * Gráfico de linhas. series: [{nome, x, y, cor?, tracejado?}], refs: [{y, rotulo}] (linhas horizontais de referência),
 * marcaX: x destacado (linha vertical).
 */
export function linhas(cv, { series, unidade = '', xUnidade = '', refs = [], marcaX = null, yMin = 0, rotuloX }) {
  cv._args = arguments[1];
  const { g, w, h } = preparar(cv);
  const m = { l: 44, r: 10, t: series.length > 1 ? 20 : 10, b: 22 };
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity, y0 = yMin;
  for (const s of series) for (let i = 0; i < s.x.length; i++) {
    x0 = Math.min(x0, s.x[i]); x1 = Math.max(x1, s.x[i]); y1 = Math.max(y1, s.y[i]);
    if (yMin === null) y0 = Math.min(y0 ?? Infinity, s.y[i]);
  }
  for (const r of refs) y1 = Math.max(y1, r.y * 1.05);
  if (yMin === null) { const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad; }
  if (!(y1 > y0)) y1 = y0 + 1;
  const passo = passoBonito(y1 - y0);
  y1 = Math.ceil(y1 / passo) * passo;
  if (yMin === null) y0 = Math.floor(y0 / passo) * passo;
  const X = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * (w - m.l - m.r);
  const Y = (v) => h - m.b - ((v - y0) / (y1 - y0)) * (h - m.t - m.b);
  g.font = FONTE;
  g.textBaseline = 'middle';
  // grade e eixo y
  for (let v = y0; v <= y1 + 1e-9; v += passo) {
    g.strokeStyle = GRADE; g.lineWidth = 1;
    g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(w - m.r, Y(v)); g.stroke();
    g.fillStyle = TINTA2; g.textAlign = 'right';
    g.fillText(fmtA(v), m.l - 5, Y(v));
  }
  // eixo x
  const px = passoBonito(x1 - x0, 6);
  g.textAlign = 'center'; g.textBaseline = 'top';
  for (let v = Math.ceil(x0 / px) * px; v <= x1 + 1e-9; v += px) g.fillText(fmtA(v), X(v), h - m.b + 5);
  g.strokeStyle = EIXO; g.beginPath(); g.moveTo(m.l, h - m.b); g.lineTo(w - m.r, h - m.b); g.stroke();
  if (rotuloX) { g.textAlign = 'right'; g.fillStyle = TINTA2; g.fillText(rotuloX, w - m.r, h - m.b - 13); }
  // referências
  for (const r of refs) {
    g.strokeStyle = 'rgba(238,241,250,.55)'; g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(m.l, Y(r.y)); g.lineTo(w - m.r, Y(r.y)); g.stroke(); g.setLineDash([]);
    g.fillStyle = TINTA; g.textAlign = 'right'; g.textBaseline = 'bottom';
    g.fillText(r.rotulo, w - m.r - 2, Y(r.y) - 2);
  }
  if (marcaX !== null) {
    g.strokeStyle = 'rgba(255,194,26,.8)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(marcaX), m.t); g.lineTo(X(marcaX), h - m.b); g.stroke();
  }
  // séries
  series.forEach((s, k) => {
    g.strokeStyle = s.cor ?? SERIES[k]; g.lineWidth = 2; g.lineJoin = 'round';
    g.setLineDash(s.tracejado ? [5, 4] : []);
    g.beginPath();
    const n = s.x.length, pulo = Math.max(1, Math.floor(n / (w * 1.5)));
    for (let i = 0; i < n; i += pulo) { const px2 = X(s.x[i]), py = Y(s.y[i]); if (i === 0) g.moveTo(px2, py); else g.lineTo(px2, py); }
    g.stroke();
    g.setLineDash([]);
  });
  // legenda (2+ séries)
  if (series.length > 1) {
    let lx = m.l;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    series.forEach((s, k) => {
      g.strokeStyle = s.cor ?? SERIES[k]; g.lineWidth = 2; g.setLineDash(s.tracejado ? [5, 4] : []);
      g.beginPath(); g.moveTo(lx, 9); g.lineTo(lx + 16, 9); g.stroke(); g.setLineDash([]);
      g.fillStyle = TINTA2; g.fillText(s.nome, lx + 20, 9);
      lx += 30 + g.measureText(s.nome).width;
    });
  }
  // tooltip (cruz + valores), desenhado por cima
  const hover = cv._hover;
  if (hover !== undefined && hover !== null) {
    const s0 = series[0];
    let i = 0, best = Infinity;
    const xv = x0 + ((hover - m.l) / (w - m.l - m.r)) * (x1 - x0);
    for (let j = 0; j < s0.x.length; j++) { const d = Math.abs(s0.x[j] - xv); if (d < best) { best = d; i = j; } }
    const hx = X(s0.x[i]);
    g.strokeStyle = 'rgba(238,241,250,.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(hx, m.t); g.lineTo(hx, h - m.b); g.stroke();
    const linhasTxt = [`${fmtA(s0.x[i])} ${xUnidade}`];
    series.forEach((s, k) => {
      const yv = s.y[i];
      g.fillStyle = s.cor ?? SERIES[k];
      g.beginPath(); g.arc(hx, Y(yv), 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#0f1730'; g.lineWidth = 2; g.stroke();
      linhasTxt.push(`${series.length > 1 ? s.nome + ': ' : ''}${fmtA(yv)} ${unidade}`);
    });
    g.font = FONTE;
    const tw = Math.max(...linhasTxt.map((t) => g.measureText(t).width)) + 12, th = linhasTxt.length * 14 + 8;
    const bx = hx + 10 + tw > w ? hx - 10 - tw : hx + 10;
    g.fillStyle = 'rgba(7,11,23,.92)'; g.strokeStyle = '#263256'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(bx, m.t, tw, th, 4); g.fill(); g.stroke();
    g.fillStyle = TINTA; g.textAlign = 'left'; g.textBaseline = 'top';
    linhasTxt.forEach((t, k) => g.fillText(t, bx + 6, m.t + 5 + k * 14));
  }
  ligarHover(cv, () => linhas(cv, cv._args), m.l, w);
}

function ligarHover(cv, redesenhar, ml, wLog) {
  if (cv._ligado) { cv._redesenhar = redesenhar; return; }
  cv._ligado = true;
  cv._redesenhar = redesenhar;
  const mover = (e) => {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * wLog;
    cv._hover = x >= ml ? x : null;
    cv._redesenhar();
  };
  cv.addEventListener('pointermove', mover);
  cv.addEventListener('pointerleave', () => { cv._hover = null; cv._redesenhar(); });
}

/** Rosa dos ventos: frações por setor (16), com destaque da direção escolhida. */
export function rosa(cv, fracoes, dirAtual) {
  const { g, w, h } = preparar(cv);
  const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 26;
  const max = Math.max(...fracoes);
  g.font = FONTE; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const k of [0.25, 0.5, 0.75, 1]) {
    g.strokeStyle = GRADE; g.beginPath(); g.arc(cx, cy, R * k, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = TINTA2;
  g.fillText(`${fmt(max * 100, 0)}%`, cx + 4, cy - R - 2 + 10);
  const n = fracoes.length, da = (Math.PI * 2) / n;
  fracoes.forEach((f, i) => {
    // 0 = N no topo, sentido horário
    const a0 = -Math.PI / 2 + i * da - da / 2 + 0.03, a1 = a0 + da - 0.06;
    const rr = R * (f / max);
    g.fillStyle = SERIES[0];
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, Math.max(rr, 1), a0, a1); g.closePath(); g.fill();
  });
  // direção escolhida
  const a = -Math.PI / 2 + (dirAtual * Math.PI) / 180;
  g.strokeStyle = '#ffc21a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
  g.fillStyle = TINTA;
  for (const [t, ang] of [['N', 0], ['L', 90], ['S', 180], ['O', 270]]) {
    const b = -Math.PI / 2 + (ang * Math.PI) / 180;
    g.fillText(t, cx + Math.cos(b) * (R + 13), cy + Math.sin(b) * (R + 13));
  }
}

/** Histograma (barras) com linhas verticais de referência rotuladas. */
export function histograma(cv, { bordas, valores, refs = [], atual, unidade = 'm/s' }) {
  const { g, w, h } = preparar(cv);
  const m = { l: 34, r: 8, t: 12, b: 22 };
  const x0 = bordas[0], x1 = bordas[bordas.length - 1], max = Math.max(...valores) * 1.15;
  const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (w - m.l - m.r);
  const Y = (v) => h - m.b - (v / max) * (h - m.t - m.b);
  g.font = FONTE;
  const passo = passoBonito(max);
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let v = 0; v <= max; v += passo) {
    g.strokeStyle = GRADE; g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(w - m.r, Y(v)); g.stroke();
    g.fillStyle = TINTA2; g.fillText(`${fmt(v * 100, 0)}%`, m.l - 4, Y(v));
  }
  valores.forEach((v, i) => {
    const a = X(bordas[i]) + 1, b = X(bordas[i + 1]) - 1;
    g.fillStyle = SERIES[0];
    g.beginPath(); g.roundRect(a, Y(v), Math.max(1, b - a), h - m.b - Y(v), [3, 3, 0, 0]); g.fill();
  });
  g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = TINTA2;
  for (let v = x0; v <= x1; v += 5) g.fillText(fmt(v, 0), X(v), h - m.b + 5);
  g.textAlign = 'right'; g.fillText(unidade, w - m.r, h - m.b - 12);
  refs.forEach((r, k) => {
    g.strokeStyle = 'rgba(238,241,250,.6)'; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(X(r.x), m.t); g.lineTo(X(r.x), h - m.b); g.stroke(); g.setLineDash([]);
    g.fillStyle = TINTA; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(r.rotulo, X(r.x) + 3, m.t + k * 13);
  });
  if (atual !== undefined) {
    g.strokeStyle = '#ffc21a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(Math.min(atual, x1)), m.t); g.lineTo(X(Math.min(atual, x1)), h - m.b); g.stroke();
  }
}

/** Barras horizontais com rótulo e valor. itens: [{nome, valor, cor?}]. */
export function barras(cv, itens, unidade = 't') {
  const { g, w, h } = preparar(cv);
  const max = Math.max(...itens.map((i) => i.valor));
  const m = { l: 130, r: 90 }, alt = Math.min(30, (h - 10) / itens.length);
  g.font = '12px "IBM Plex Sans", sans-serif';
  itens.forEach((it, k) => {
    const y = 5 + k * alt;
    g.fillStyle = TINTA; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText(it.nome, m.l - 8, y + alt / 2);
    const bw = Math.max(2, ((w - m.l - m.r) * it.valor) / max);
    g.fillStyle = it.cor ?? SERIES[0];
    g.beginPath(); g.roundRect(m.l, y + 4, bw, alt - 8, [0, 4, 4, 0]); g.fill();
    g.fillStyle = TINTA2; g.textAlign = 'left'; g.font = FONTE;
    g.fillText(`${fmtA(it.valor)} ${unidade}`, m.l + bw + 6, y + alt / 2);
    g.font = '12px "IBM Plex Sans", sans-serif';
  });
}
