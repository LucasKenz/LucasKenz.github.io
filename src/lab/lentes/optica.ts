// Thin-lens photography math (all lengths in millimetres) and a 2D ray tracer
// through a thick biconvex lens using Snell's law in vector form.

/** Circle of confusion for full-frame 35 mm (36x24 mm), a common reference value. */
export const COC_FF = 0.03;

export interface Profundidade {
  hiperfocal: number;
  perto: number;
  longe: number; // Infinity when beyond the hyperfocal distance
}

/** Depth of field for focal length f, f-number N, focus distance s (mm). */
export function profundidade(f: number, N: number, s: number, c = COC_FF): Profundidade {
  const H = (f * f) / (N * c) + f;
  const perto = (s * (H - f)) / (H + s - 2 * f);
  const longe = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { hiperfocal: H, perto, longe };
}

/** Lens-to-sensor distance when focused at s (thin lens). */
export function distanciaImagem(f: number, s: number) {
  return s === Infinity ? f : (f * s) / (s - f);
}

/** Blur circle diameter on the sensor (mm) for an object at d when focused at s. */
export function desfoque(f: number, N: number, s: number, d: number) {
  if (s === Infinity) return (f * f) / (N * d);
  return ((f * f) / (N * (s - f))) * (Math.abs(d - s) / d);
}

export interface Vec { x: number; y: number }
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const norm = (a: Vec): Vec => mul(a, 1 / Math.hypot(a.x, a.y));

/** Refracts unit direction d at a surface with unit normal n (facing the incoming ray). */
export function refratar(d: Vec, n: Vec, n1: number, n2: number): Vec | null {
  const eta = n1 / n2;
  const cosi = -dot(n, d);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null; // total internal reflection
  return norm(add(mul(d, eta), mul(n, eta * cosi - Math.sqrt(k))));
}

export interface Lente {
  /** Front vertex position on the optical axis (x, mm). */
  x0: number;
  espessura: number;
  raio: number; // |R| of both surfaces (symmetric biconvex)
  indice: number; // refractive index
  abertura: number; // clear semi-diameter (mm)
}

/** Symmetric biconvex lens with focal length f (lensmaker, thin approximation). */
export function lenteBiconvexa(f: number, indice = 1.5168, espessura = 6): Omit<Lente, 'x0'> {
  return { raio: 2 * f * (indice - 1), indice, espessura, abertura: f / 3 };
}

/** Intersection of a ray with a sphere (circle) centered on the axis at cx with radius r. */
function intersecaoEsfera(o: Vec, d: Vec, cx: number, r: number, frente: boolean): Vec | null {
  const oc = sub(o, { x: cx, y: 0 });
  const b = dot(oc, d);
  const c = dot(oc, oc) - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  // Front surface: the near hit; back surface: the far hit of the other sphere.
  const t = frente ? -b - s : -b + s;
  return t > 1e-6 ? add(o, mul(d, t)) : null;
}

/** Traces a ray from point o in direction d through the lens and up to x = xSensor. */
export function tracar(o: Vec, d: Vec, L: Lente, xSensor: number): Vec[] | null {
  // Front surface: convex toward -x, sphere center at x0 + R.
  const c1 = L.x0 + L.raio;
  const p1 = intersecaoEsfera(o, d, c1, L.raio, true);
  if (!p1 || Math.abs(p1.y) > L.abertura) return null;
  const n1 = norm(sub(p1, { x: c1, y: 0 })); // outward normal, points toward -x on the front
  const d1 = refratar(d, n1, 1, L.indice);
  if (!d1) return null;
  // Back surface: convex toward +x, sphere center at x0 + t - R.
  const c2 = L.x0 + L.espessura - L.raio;
  const p2 = intersecaoEsfera(p1, d1, c2, L.raio, false);
  if (!p2 || Math.abs(p2.y) > L.abertura) return null;
  const n2 = mul(norm(sub(p2, { x: c2, y: 0 })), -1); // facing the incoming (internal) ray
  const d2 = refratar(d1, n2, L.indice, 1);
  if (!d2) return null;
  const t = (xSensor - p2.x) / d2.x;
  return [o, p1, p2, add(p2, mul(d2, t))];
}
