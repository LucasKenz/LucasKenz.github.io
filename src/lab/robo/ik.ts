// Analytic two-bone inverse kinematics in a vertical plane, plus a critically damped spring.

export interface Angulos {
  ombro: number; // radians, from the horizontal (+x forward), positive = up
  cotovelo: number; // radians, relative bend (0 = straight)
  alcancou: boolean;
}

/**
 * Shoulder at the origin, target (x forward, y up). Segment lengths l1, l2.
 * Of the two elbow solutions, the one with the elbow further forward is used.
 */
export function ik2(l1: number, l2: number, x: number, y: number): Angulos {
  const dist = Math.hypot(x, y);
  const max = l1 + l2 - 1e-6;
  const min = Math.abs(l1 - l2) + 1e-6;
  const d = Math.min(Math.max(dist, min), max);
  const cosC = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2);
  const curva = Math.PI - Math.acos(Math.min(1, Math.max(-1, cosC)));
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const base = Math.atan2(y, x);
  const abre = Math.acos(Math.min(1, Math.max(-1, cosA)));
  // Two solutions (elbow up / elbow down). Keep the elbow in front of the body:
  // pick the one whose elbow is further forward; ties go to elbow up.
  const cima = { ombro: base + abre, cotovelo: -curva };
  const baixo = { ombro: base - abre, cotovelo: curva };
  const fx = (o: number) => Math.cos(o);
  const { ombro, cotovelo } = fx(cima.ombro) >= fx(baixo.ombro) - 1e-9 ? cima : baixo;
  return { ombro, cotovelo, alcancou: dist <= l1 + l2 && dist >= Math.abs(l1 - l2) };
}

/** End effector position from angles (forward kinematics), for checks and drawing. */
export function fk(l1: number, l2: number, a: Pick<Angulos, 'ombro' | 'cotovelo'>) {
  const ex = l1 * Math.cos(a.ombro);
  const ey = l1 * Math.sin(a.ombro);
  const t = a.ombro + a.cotovelo;
  return { cotovelo: { x: ex, y: ey }, ponta: { x: ex + l2 * Math.cos(t), y: ey + l2 * Math.sin(t) } };
}

/** Critically damped spring step (value, velocity) toward target. k = stiffness (1/s). */
export function mola(valor: number, vel: number, alvo: number, k: number, dt: number) {
  // Exact solution for critical damping, stable for any dt.
  const x = valor - alvo;
  const e = Math.exp(-k * dt);
  const tmp = (vel + k * x) * dt;
  return { valor: alvo + (x + tmp) * e, vel: (vel - k * tmp) * e };
}

/** Shortest signed angle difference a - b in (-PI, PI]. */
export function difAngulo(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
