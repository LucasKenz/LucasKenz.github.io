// Deterministic city generator: same seed -> same chunks, byte for byte.
// A chunk is CHUNK_BLOCOS x CHUNK_BLOCOS blocks; each block is a lot surrounded by roads.

export const BLOCO = 48; // m, block pitch (lot + road)
export const RUA = 12; // m, road width
export const CHUNK_BLOCOS = 6;
export const CHUNK = BLOCO * CHUNK_BLOCOS; // 288 m

export type Bairro = 'centro' | 'residencial' | 'industrial' | 'parque';

export interface Predio {
  x: number; // center (m)
  z: number;
  w: number; // footprint (m)
  d: number;
  h: number; // height (m)
  cor: number; // 0..1 hue jitter index
  janelas: number; // 0..1 seed for lit windows
}

export interface Arvore { x: number; z: number; s: number }

export interface Chunk {
  cx: number;
  cz: number;
  predios: Predio[];
  arvores: Arvore[];
}

/** 32-bit integer hash of (seed, a, b, c). */
export function hash(seed: number, a: number, b = 0, c = 0) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const v of [a, b, c]) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). */
export function rng(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const suave = (t: number) => t * t * (3 - 2 * t);

/** Value noise in [0,1) on a lattice of size `escala` metres. */
export function ruido(seed: number, x: number, z: number, escala: number) {
  const gx = x / escala;
  const gz = z / escala;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = suave(gx - x0);
  const tz = suave(gz - z0);
  const v = (i: number, j: number) => hash(seed, i, j, 7) / 4294967296;
  return lerp(lerp(v(x0, z0), v(x0 + 1, z0), tx), lerp(v(x0, z0 + 1), v(x0 + 1, z0 + 1), tx), tz);
}

/** Neighbourhood at a point: low-frequency noise plus distance to the city's main center. */
export function bairro(seed: number, x: number, z: number): Bairro {
  const n = ruido(seed, x, z, 900);
  const p = ruido(seed + 1, x, z, 420);
  if (p > 0.82) return 'parque';
  const centro = Math.exp(-Math.hypot(x, z) / 1400) * 0.55 + n * 0.6;
  if (centro > 0.72) return 'centro';
  if (n < 0.28) return 'industrial';
  return 'residencial';
}

export function gerarChunk(seed: number, cx: number, cz: number): Chunk {
  const predios: Predio[] = [];
  const arvores: Arvore[] = [];
  for (let i = 0; i < CHUNK_BLOCOS; i++) {
    for (let j = 0; j < CHUNK_BLOCOS; j++) {
      const bx = cx * CHUNK_BLOCOS + i;
      const bz = cz * CHUNK_BLOCOS + j;
      const r = rng(hash(seed, bx, bz, 1));
      // Lot origin (corner) and usable size.
      const x0 = bx * BLOCO + RUA / 2;
      const z0 = bz * BLOCO + RUA / 2;
      const lote = BLOCO - RUA;
      const tipo = bairro(seed, x0 + lote / 2, z0 + lote / 2);
      if (tipo === 'parque') {
        const n = 4 + Math.floor(r() * 7);
        for (let k = 0; k < n; k++) arvores.push({ x: x0 + 2 + r() * (lote - 4), z: z0 + 2 + r() * (lote - 4), s: 0.7 + r() * 0.8 });
        continue;
      }
      // Split the lot into a 1x1, 1x2, 2x1 or 2x2 grid of buildings.
      const nx = tipo === 'industrial' ? 1 : 1 + Math.floor(r() * 2);
      const nz = tipo === 'industrial' ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
      const cw = lote / nx;
      const cd = lote / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const recuo = 1.5 + r() * 2.5;
          const w = cw - recuo * 2;
          const d = cd - recuo * 2;
          let h: number;
          if (tipo === 'centro') h = 30 + Math.pow(r(), 2.2) * 170;
          else if (tipo === 'industrial') h = 8 + r() * 10;
          else h = 6 + Math.pow(r(), 1.6) * 34;
          predios.push({
            x: x0 + cw * a + cw / 2,
            z: z0 + cd * b + cd / 2,
            w,
            d,
            h: Math.round(h * 10) / 10,
            cor: r(),
            janelas: r(),
          });
        }
      }
      if (tipo === 'residencial' && r() > 0.5) arvores.push({ x: x0 - RUA / 4, z: z0 + r() * lote, s: 0.6 + r() * 0.4 });
    }
  }
  return { cx, cz, predios, arvores };
}

/** FNV-1a over the chunk's numbers: used by tests to prove determinism. */
export function hashChunk(c: Chunk) {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    const s = v.toFixed(3);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  };
  for (const p of c.predios) [p.x, p.z, p.w, p.d, p.h, p.cor, p.janelas].forEach(mix);
  for (const a of c.arvores) [a.x, a.z, a.s].forEach(mix);
  return h.toString(16);
}

/** Readable street name from the seed (used by the HUD). */
const prefixos = ['Rua', 'Avenida', 'Alameda', 'Travessa'];
const nomes = ['das Lombadas', 'do Anel', 'dos Sensores', 'do Kalman', 'da Faixa', 'do Pixel', 'da Semente', 'do Vértice', 'da Malha', 'do Shader', 'das Quadras', 'do Horizonte'];
export function nomeRua(seed: number, bx: number, bz: number) {
  const r = rng(hash(seed, bx, bz, 99));
  return `${prefixos[Math.floor(r() * prefixos.length)]} ${nomes[Math.floor(r() * nomes.length)]}`;
}
