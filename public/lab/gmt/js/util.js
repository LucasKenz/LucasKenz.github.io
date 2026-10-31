import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}
export function fbm2(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
export function ridged2(x, y, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * (1 - Math.abs(noise2(x * f, y * f)));
    f *= 2.1;
    a *= 0.5;
  }
  return s;
}

// Mapa de cores no estilo CFD (ref6): azul-escuro → ciano → verde → amarelo → laranja → vermelho.
const CFD = [
  [0, [0.04, 0.1, 0.42]],
  [0.18, [0.1, 0.36, 0.86]],
  [0.36, [0.12, 0.77, 0.88]],
  [0.53, [0.25, 0.78, 0.35]],
  [0.68, [0.95, 0.88, 0.2]],
  [0.84, [0.95, 0.53, 0.14]],
  [1, [0.82, 0.12, 0.12]],
];
export function cfd(t, out = [0, 0, 0]) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < CFD.length; i++) {
    if (t <= CFD[i][0]) {
      const [t0, c0] = CFD[i - 1], [t1, c1] = CFD[i];
      const k = (t - t0) / (t1 - t0);
      out[0] = lerp(c0[0], c1[0], k);
      out[1] = lerp(c0[1], c1[1], k);
      out[2] = lerp(c0[2], c1[2], k);
      return out;
    }
  }
  return out;
}
export const cfdCss = (t) => {
  const c = cfd(t);
  return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
};
export function divergente(t, out = [0, 0, 0]) {
  // -1 azul, 0 branco, +1 vermelho
  t = clamp(t, -1, 1);
  if (t < 0) { out[0] = 1 + t * 0.85; out[1] = 1 + t * 0.6; out[2] = 1; }
  else { out[0] = 1; out[1] = 1 - t * 0.75; out[2] = 1 - t * 0.85; }
  return out;
}

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
  if (a === 0) return '0';
  if (a >= 1000) return fmt(x, 0);
  if (a >= 100) return fmt(x, 0);
  if (a >= 10) return fmt(x, 1);
  if (a >= 1) return fmt(x, 2);
  if (a >= 0.01) return fmt(x, 3);
  return x.toExponential(1).replace('.', ',');
}

// ---------- tweens ----------
const tweens = new Set();
export function tween({ dur = 1, ease = easeInOut, update, done }) {
  const t = { t0: performance.now(), dur: reduzMovimento ? 0.001 : dur * 1000, ease, update, done, vivo: true };
  tweens.add(t);
  return t;
}
export function atualizarTweens(agora) {
  for (const t of tweens) {
    const k = clamp((agora - t.t0) / t.dur, 0, 1);
    t.update(t.ease(k));
    if (k >= 1) {
      tweens.delete(t);
      t.done?.();
    }
  }
}
export function pararTween(t) { if (t) tweens.delete(t); }

const _p = new THREE.Vector3(), _q = new THREE.Vector3();
export function voarCamera(camera, controls, pos, alvo, dur = 1.6) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  return tween({
    dur,
    update: (k) => {
      _p.lerpVectors(p0, pos, k);
      _q.lerpVectors(t0, alvo, k);
      // arco suave: sobe um pouco no meio do voo
      _p.y += Math.sin(k * Math.PI) * p0.distanceTo(pos) * 0.12;
      camera.position.copy(_p);
      controls.target.copy(_q);
      camera.lookAt(_q);
    },
  });
}

export function aviso(txt) {
  const el = document.getElementById('aviso');
  el.textContent = txt;
  el.classList.add('on');
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => el.classList.remove('on'), 2200);
}

export const ehToque = matchMedia('(pointer: coarse)').matches;
