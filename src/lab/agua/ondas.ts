// Gerstner waves shared by the water shader (GLSL) and the boat (JS), so the boat floats
// exactly on the surface the GPU draws.

export interface Onda { dir: [number, number]; comprimento: number; amplitude: number; inclinacao: number }

export const ONDAS: Onda[] = [
  { dir: [1, 0.25], comprimento: 34, amplitude: 0.42, inclinacao: 0.55 },
  { dir: [0.7, 0.9], comprimento: 19, amplitude: 0.22, inclinacao: 0.5 },
  { dir: [-0.35, 1], comprimento: 11, amplitude: 0.12, inclinacao: 0.45 },
  { dir: [0.95, -0.55], comprimento: 6.5, amplitude: 0.06, inclinacao: 0.4 },
];

const G = 9.81;

/** Displaced position and normal at (x, z), time t, amplitude scale k (wind). */
export function superficie(x: number, z: number, t: number, k: number) {
  let px = x, py = 0, pz = z;
  let nx = 0, ny = 1, nz = 0;
  for (const o of ONDAS) {
    const len = Math.hypot(o.dir[0], o.dir[1]);
    const dx = o.dir[0] / len, dz = o.dir[1] / len;
    const w = (2 * Math.PI) / o.comprimento;
    const fase = Math.sqrt(G * w) * t;
    const a = o.amplitude * k;
    const q = o.inclinacao / (w * a * ONDAS.length + 1e-6);
    const th = w * (dx * x + dz * z) - fase;
    const c = Math.cos(th), s = Math.sin(th);
    px += q * a * dx * c;
    pz += q * a * dz * c;
    py += a * s;
    nx -= dx * w * a * c;
    nz -= dz * w * a * c;
    ny -= q * w * a * s;
  }
  const n = Math.hypot(nx, ny, nz);
  return { x: px, y: py, z: pz, nx: nx / n, ny: ny / n, nz: nz / n };
}

/** The same sum in GLSL. Uniforms: uTempo, uVento. */
export const ondasGLSL = /* glsl */ `
  uniform float uTempo; uniform float uVento;
  // Sum of the horizontal pinch terms (1 - Jacobian): ~1 where the crest is about to fold.
  float gCrista;
  vec3 gerstner(vec2 p, out vec3 normal) {
    gCrista = 0.0;
    vec3 pos = vec3(p.x, 0.0, p.y);
    vec3 n = vec3(0.0, 1.0, 0.0);
    ${ONDAS.map((o) => {
      const len = Math.hypot(o.dir[0], o.dir[1]);
      const dx = (o.dir[0] / len).toFixed(5), dz = (o.dir[1] / len).toFixed(5);
      const w = ((2 * Math.PI) / o.comprimento).toFixed(5);
      return `{
      vec2 d = vec2(${dx}, ${dz}); float w = ${w};
      float a = ${o.amplitude.toFixed(4)} * uVento;
      float q = ${o.inclinacao.toFixed(4)} / (w * a * ${ONDAS.length.toFixed(1)} + 1e-6);
      float th = w * dot(d, p) - sqrt(9.81 * w) * uTempo;
      float c = cos(th), s = sin(th);
      pos.x += q * a * d.x * c; pos.z += q * a * d.y * c; pos.y += a * s;
      n.x -= d.x * w * a * c; n.z -= d.y * w * a * c; n.y -= q * w * a * s;
      gCrista += q * w * a * s;
    }`;
    }).join('\n')}
    normal = normalize(n);
    return pos;
  }
`;
