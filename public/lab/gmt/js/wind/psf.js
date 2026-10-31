// Imagem de uma estrela pelo GMT: pupila de 7 discos, tela de fase de von Kármán (fluxo congelado) e FFT.
// Três versões: limite de difração, sem óptica adaptativa e com o ASM corrigindo as baixas frequências.
import { rng, gauss, clamp } from '../util.js';

const N = 256;          // grade da pupila / imagem
const DX = 0.27;        // m por pixel na pupila (25,8 m ≈ 96 px; preenchimento ×2,7)
const M = 512;          // tela de fase (138 m)

// ---------- FFT complexa radix-2 ----------
const tab = new Map();
function tabela(n) {
  if (tab.has(n)) return tab.get(n);
  const rev = new Uint32Array(n), bits = Math.log2(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n); }
  const t = { rev, cos, sin };
  tab.set(n, t);
  return t;
}
function fft1(re, im, off, passo, n, inv) {
  const { rev, cos, sin } = tabela(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const a = off + i * passo, b = off + j * passo;
      let t = re[a]; re[a] = re[b]; re[b] = t;
      t = im[a]; im[a] = im[b]; im[b] = t;
    }
  }
  const s = inv ? -1 : 1;
  for (let tam = 2; tam <= n; tam <<= 1) {
    const meio = tam >> 1, k = n / tam;
    for (let i = 0; i < n; i += tam) {
      for (let j = 0; j < meio; j++) {
        const wr = cos[j * k], wi = s * sin[j * k];
        const a = off + (i + j) * passo, b = off + (i + j + meio) * passo;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}
export function fft2(re, im, n, inv = false) {
  for (let y = 0; y < n; y++) fft1(re, im, y * n, 1, n, inv);
  for (let x = 0; x < n; x++) fft1(re, im, x, n, n, inv);
  if (inv) { const k = 1 / (n * n); for (let i = 0; i < n * n; i++) { re[i] *= k; im[i] *= k; } }
}

// ---------- pupila ----------
function pupila() {
  const P = new Float32Array(N * N);
  const r = 8.417 / 2, a = 8.71, furo = 0.6, c = N / 2;
  const centros = [[0, 0]];
  for (let k = 0; k < 6; k++) centros.push([a * Math.cos((k * Math.PI) / 3), a * Math.sin((k * Math.PI) / 3)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const X = (x - c + 0.5) * DX, Y = (y - c + 0.5) * DX;
    let dentro = 0;
    for (const [cx, cy] of centros) { const d = Math.hypot(X - cx, Y - cy); if (d < r) dentro = 1; }
    if (Math.hypot(X, Y) < furo) dentro = 0;
    // sombra das 6 pernas da torre (0,9 m), nos ângulos 30° + k·60°
    for (let k = 0; k < 6 && dentro; k++) {
      const ang = (k * Math.PI) / 3 + Math.PI / 6, ux = Math.cos(ang), uy = Math.sin(ang);
      const ao = X * ux + Y * uy, perp = Math.abs(-X * uy + Y * ux);
      if (ao > 9.5 && perp < 0.45) dentro = 0;
    }
    P[y * N + x] = dentro;
  }
  return P;
}

// ---------- tela de fase de von Kármán (normalizada para r0 = 1 m) ----------
function telas(L0 = 25, pitch = 0.287, sem = 5) {
  const r = rng(sem);
  const re = new Float32Array(M * M), im = new Float32Array(M * M), reAO = new Float32Array(M * M), imAO = new Float32Array(M * M);
  const df = 1 / (M * DX), fc = 1 / (2 * pitch);
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
    const fx = (x < M / 2 ? x : x - M) * df, fy = (y < M / 2 ? y : y - M) * df;
    const f2 = fx * fx + fy * fy;
    const psd = 0.023 * Math.pow(f2 + 1 / (L0 * L0), -11 / 6);
    const amp = x === 0 && y === 0 ? 0 : Math.sqrt(psd) * df;
    const a = gauss(r) * amp, b = gauss(r) * amp;
    const i = y * M + x;
    re[i] = a; im[i] = b;
    // o ASM remove o que tem frequência espacial abaixo de 1/(2·passo); sobra ~8% (atraso e ruído)
    const k = Math.sqrt(f2) < fc ? 0.08 : 1;
    reAO[i] = a * k; imAO[i] = b * k;
  }
  fft2(re, im, M);
  fft2(reAO, imAO, M);
  return { cheia: re, ao: reAO };
}

let P = null, T = null, IDEAL = null, PICO_IDEAL = 1;
const bufRe = new Float32Array(N * N), bufIm = new Float32Array(N * N);

function intensidade(fase, escala, ox, oy, tilt = [0, 0], out = new Float32Array(N * N)) {
  // campo na pupila
  const c = N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (!P[i]) { bufRe[i] = 0; bufIm[i] = 0; continue; }
    let ph = 0;
    if (fase) {
      const sx = ((((x + ox) | 0) % M) + M) % M, sy = ((((y + oy) | 0) % M) + M) % M;
      ph = fase[sy * M + sx] * escala;
    }
    ph += tilt[0] * (x - c) + tilt[1] * (y - c);
    bufRe[i] = Math.cos(ph);
    bufIm[i] = Math.sin(ph);
  }
  fft2(bufRe, bufIm, N);
  // |E|² com fftshift
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, j = ((y + N / 2) % N) * N + ((x + N / 2) % N);
    out[j] = bufRe[i] * bufRe[i] + bufIm[i] * bufIm[i];
  }
  return out;
}

export function iniciarPSF(L0, pitch) {
  P = pupila();
  T = telas(L0, pitch);
  IDEAL = intensidade(null, 0, 0, 0);
  PICO_IDEAL = IDEAL.reduce((m, v) => Math.max(m, v), 0);
}

/** Largura a meia altura (em pixels, diâmetro equivalente da área acima de 50% do pico). */
function fwhmPx(img) {
  let pico = 0;
  for (let i = 0; i < img.length; i++) pico = Math.max(pico, img[i]);
  let n = 0;
  for (let i = 0; i < img.length; i++) if (img[i] >= pico / 2) n++;
  return 2 * Math.sqrt(n / Math.PI);
}

// ---------- objetos do céu ----------
function objeto(alvo, pxArcsec) {
  const r = rng(3);
  if (alvo === 'binaria') return { pontos: [[-0.025 / pxArcsec, 0, 1], [0.025 / pxArcsec, 0, 0.6]] };
  if (alvo === 'aglomerado') {
    const p = [];
    for (let i = 0; i < 40; i++) p.push([gauss(r) * 0.18 / pxArcsec, gauss(r) * 0.18 / pxArcsec, Math.pow(r(), 3) * 0.9 + 0.1]);
    return { pontos: p };
  }
  if (alvo === 'galaxia') {
    const img = new Float32Array(N * N), c = N / 2, h = 0.12 / pxArcsec, b = 0.03 / pxArcsec;
    const inc = 0.55, ang = 0.6, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const X = x - c, Y = y - c, u = X * ca + Y * sa, v = (-X * sa + Y * ca) / inc;
      const rr = Math.hypot(u, v), th = Math.atan2(v, u);
      const bracos = 1 + 0.6 * Math.cos(2 * th - rr / (h * 0.6));
      img[y * N + x] = Math.exp(-rr / h) * bracos * 0.6 + Math.exp(-Math.pow(rr / b, 0.5) * 3) * 4;
    }
    return { imagem: img };
  }
  return { pontos: [[0, 0, 1]] };
}

const tmpRe = new Float32Array(N * N), tmpIm = new Float32Array(N * N), tmp2Re = new Float32Array(N * N), tmp2Im = new Float32Array(N * N);
function convolver(psf, obj) {
  if (obj.pontos) {
    const out = new Float32Array(N * N);
    for (const [dx, dy, f] of obj.pontos) {
      const ix = Math.floor(dx), iy = Math.floor(dy), fx = dx - ix, fy = dy - iy;
      for (const [ox, oy, w] of [[ix, iy, (1 - fx) * (1 - fy)], [ix + 1, iy, fx * (1 - fy)], [ix, iy + 1, (1 - fx) * fy], [ix + 1, iy + 1, fx * fy]]) {
        if (w < 1e-4) continue;
        for (let y = 0; y < N; y++) {
          const ys = y - oy;
          if (ys < 0 || ys >= N) continue;
          for (let x = 0; x < N; x++) {
            const xs = x - ox;
            if (xs < 0 || xs >= N) continue;
            out[y * N + x] += psf[ys * N + xs] * w * f;
          }
        }
      }
    }
    return out;
  }
  // imagem extensa: convolução por FFT
  tmpRe.set(psf); tmpIm.fill(0); tmp2Re.set(obj.imagem); tmp2Im.fill(0);
  fft2(tmpRe, tmpIm, N); fft2(tmp2Re, tmp2Im, N);
  for (let i = 0; i < N * N; i++) {
    const a = tmpRe[i] * tmp2Re[i] - tmpIm[i] * tmp2Im[i], b = tmpRe[i] * tmp2Im[i] + tmpIm[i] * tmp2Re[i];
    tmpRe[i] = a; tmpIm[i] = b;
  }
  fft2(tmpRe, tmpIm, N, true);
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[y * N + x] = Math.max(0, tmpRe[((y + N / 2) % N) * N + ((x + N / 2) % N)]);
  return out;
}

/**
 * Calcula as três imagens.
 * r0L: r0 no comprimento de onda (m); jitter (″ rms); vento (m/s) arrasta a tela; t (s) é o instante.
 */
export function calcularImagens({ lambda, r0L, jitter, vento, dirX, dirZ, t, longa, alvo }) {
  if (!P) throw new Error('PSF não iniciada');
  const pxRad = lambda / (N * DX), pxArcsec = pxRad * 206265;
  const escala = Math.pow(Math.max(r0L, 0.02), -5 / 6);
  const quadros = longa ? 14 : 1;
  const r = rng(Math.floor(t * 10) + 1);
  const sem = new Float32Array(N * N), com = new Float32Array(N * N);
  const tmp = new Float32Array(N * N);
  // tilt de fase (rad/pixel) para um deslocamento de imagem de θ rad: 2π·θ·DX/λ
  const k = (2 * Math.PI * DX) / lambda;
  for (let q = 0; q < quadros; q++) {
    const tt = t + q * 0.05; // 50 ms entre quadros da exposição longa
    const ox = (dirX * vento * tt) / DX, oy = (dirZ * vento * tt) / DX;
    const jx = (gauss(r) * jitter) / 206265, jy = (gauss(r) * jitter) / 206265;
    intensidade(T.cheia, escala, ox, oy, [k * jx, k * jy], tmp);
    for (let i = 0; i < tmp.length; i++) sem[i] += tmp[i] / quadros;
    intensidade(T.ao, escala, ox, oy, [k * jx * 0.1, k * jy * 0.1], tmp);
    for (let i = 0; i < tmp.length; i++) com[i] += tmp[i] / quadros;
  }
  const pico = (a) => a.reduce((m, v) => Math.max(m, v), 0);
  const res = {
    pxArcsec,
    strehlSem: pico(sem) / PICO_IDEAL,
    strehlCom: pico(com) / PICO_IDEAL,
    fwhmIdeal: fwhmPx(IDEAL) * pxArcsec,
    fwhmSem: fwhmPx(sem) * pxArcsec,
    fwhmCom: fwhmPx(com) * pxArcsec,
  };
  const obj = objeto(alvo, pxArcsec);
  res.imgs = [convolver(IDEAL, obj), convolver(sem, obj), convolver(com, obj)];
  return res;
}

// mapa de cores sequencial (preto → vermelho → laranja → branco), luminosidade crescente
function quente(t, o, i) {
  t = clamp(t, 0, 1);
  o[i] = 255 * clamp(t * 2.2, 0, 1);
  o[i + 1] = 255 * clamp(t * 2.2 - 0.75, 0, 1);
  o[i + 2] = 255 * clamp(t * 3 - 2, 0, 1);
  o[i + 3] = 255;
}

/** Desenha com estiramento asinh, normalizado pelo próprio pico (ou por um pico de referência). */
export function desenhar(canvas, img, picoRef) {
  const g = canvas.getContext('2d'), d = g.createImageData(N, N);
  const pico = picoRef ?? img.reduce((m, v) => Math.max(m, v), 0);
  const s = 60, norm = Math.asinh(s);
  for (let i = 0; i < N * N; i++) quente(Math.asinh((img[i] / pico) * s) / norm, d.data, i * 4);
  g.putImageData(d, 0, 0);
  return pico;
}

export const PSF_N = N;
