// Leitor próprio de .dxf 2D (texto) para ROTAS de cabo: não é modelo, vira trechos de cabo no editor.
// Lê só LINE, LWPOLYLINE e POLYLINE (com VERTEX); agrupa por camada. Nada do arquivo é executado.
// Unidade do cabeçalho ($INSUNITS); planta: X do DXF -> x da cena, Y do DXF -> −z (norte para "trás").

const INSUNITS = { 1: 'pol', 2: 'pe', 4: 'mm', 5: 'cm', 6: 'm' };
export const MAX_DXF = 10 * 1024 * 1024;

/** Lê o texto do DXF. Devolve { camadas: { nome: [[ [x, y], ... ], ...] }, unidade, avisos }. */
export function lerDXF(texto) {
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('O .dxf está vazio.');
  if (texto.length > MAX_DXF) throw new Error('O .dxf é grande demais (máx. 10 MB).');
  if (texto.startsWith('AutoCAD Binary DXF')) throw new Error('DXF binário não é lido: salve como DXF em texto (ASCII).');
  const l = texto.split(/\r?\n/);
  if (l.length < 4 || !/^\s*\d+\s*$/.test(l[0])) throw new Error('O .dxf não está no formato de pares código/valor (corrompido?).');
  const pares = [];
  for (let i = 0; i + 1 < l.length; i += 2) pares.push([parseInt(l[i], 10), l[i + 1].trim()]);
  let unidade = null;
  const camadas = {};
  const avisos = [];
  const add = (cam, pts) => {
    const ok = pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (ok.length < 2) return;
    (camadas[cam || '0'] ??= []).push(ok.slice(0, 2000));
  };
  let ignorados = 0;
  for (let i = 0; i < pares.length; i++) {
    const [c, val] = pares[i];
    if (c === 9 && val === '$INSUNITS') { const u = pares.find((p, k) => k > i && p[0] === 70); unidade = INSUNITS[+u?.[1]] ?? null; continue; }
    if (c !== 0) continue;
    if (val === 'LINE') {
      const e = { 8: '0' }; let k = i + 1;
      for (; k < pares.length && pares[k][0] !== 0; k++) e[pares[k][0]] = pares[k][1];
      add(e[8], [[+e[10], +e[20]], [+e[11], +e[21]]]);
      i = k - 1;
    } else if (val === 'LWPOLYLINE') {
      let cam = '0', fechada = false; const pts = []; let k = i + 1;
      for (; k < pares.length && pares[k][0] !== 0; k++) {
        const [cc, vv] = pares[k];
        if (cc === 8) cam = vv;
        else if (cc === 70) fechada = (+vv & 1) === 1;
        else if (cc === 10) pts.push([+vv, NaN]);
        else if (cc === 20 && pts.length) pts[pts.length - 1][1] = +vv;
      }
      if (fechada && pts.length > 2) pts.push(pts[0]);
      add(cam, pts);
      i = k - 1;
    } else if (val === 'POLYLINE') {
      let cam = '0', fechada = false; const pts = []; let k = i + 1;
      for (; k < pares.length && pares[k][0] !== 0; k++) { if (pares[k][0] === 8) cam = pares[k][1]; if (pares[k][0] === 70) fechada = (+pares[k][1] & 1) === 1; }
      while (k < pares.length && pares[k][1] === 'VERTEX') {
        const e = {}; let j = k + 1;
        for (; j < pares.length && pares[j][0] !== 0; j++) e[pares[j][0]] = pares[j][1];
        pts.push([+e[10], +e[20]]);
        k = j;
      }
      if (fechada && pts.length > 2) pts.push(pts[0]);
      add(cam, pts);
      i = k - 1;
    } else if (['ARC', 'CIRCLE', 'SPLINE', 'ELLIPSE'].includes(val)) ignorados++;
  }
  if (ignorados) avisos.push(`${ignorados} arco(s)/curva(s) ignorado(s): use linhas ou polilinhas para as rotas.`);
  if (!Object.keys(camadas).length) throw new Error('O .dxf não tem linhas nem polilinhas.');
  return { camadas, unidade, avisos };
}

export const comprimento2D = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
