import * as THREE from 'three';
import { ondasGLSL } from './ondas';

// Seabed height (m) shared by the water shader and the seabed mesh: a sandbar island
// plus low-frequency dunes. Water level is y = 0.
export const fundoGLSL = /* glsl */ `
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  float fundo(vec2 p) {
    float ilha = 9.5 * exp(-dot(p - vec2(26.0, -30.0), p - vec2(26.0, -30.0)) / (2.0 * 17.0 * 17.0));
    float banco = 2.5 * exp(-dot(p - vec2(-8.0, 6.0), p - vec2(-8.0, 6.0)) / (2.0 * 22.0 * 22.0));
    return -7.0 + ilha + banco + (fbm(p * 0.045) - 0.5) * 4.0;
  }
`;

// Exact JS port of fundo() (same hash, value noise and fbm) to seat props on the island.
const fr = (v: number) => v - Math.floor(v);
const h2 = (x: number, y: number) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
}
function fbm(x: number, y: number) { let s = 0, a = 0.5; for (let i = 0; i < 4; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }
export function fundoExato(x: number, z: number) {
  const ilha = 9.5 * Math.exp(-((x - 26) ** 2 + (z + 30) ** 2) / (2 * 17 * 17));
  const banco = 2.5 * Math.exp(-((x + 8) ** 2 + (z - 6) ** 2) / (2 * 22 * 22));
  return -7 + ilha + banco + (fbm(x * 0.045, z * 0.045) - 0.5) * 4;
}

export function fundoJS(x: number, z: number) {
  // Coarse JS version (no fbm) used only to keep the boat in deep water.
  const ilha = 9.5 * Math.exp(-((x - 26) ** 2 + (z + 30) ** 2) / (2 * 17 * 17));
  const banco = 4 * Math.exp(-((x + 8) ** 2 + (z - 6) ** 2) / (2 * 22 * 22));
  return -7 + ilha + banco;
}

export const uAgua = {
  uTempo: { value: 0 },
  uVento: { value: 1 },
  uSol: { value: new THREE.Vector3(0.45, 0.62, -0.64).normalize() },
  uBarco: { value: new THREE.Vector3() },
  uRumo: { value: 0 },
};

/** Water: Gerstner waves, fake depth colour from the analytic seabed, fresnel sky,
 *  sun glitter (bright enough for bloom), caustics in the shallows, foam at the shore. */
export function materialAgua() {
  return new THREE.ShaderMaterial({
    uniforms: uAgua,
    vertexShader: /* glsl */ `
      ${ondasGLSL}
      varying vec3 vMundo; varying vec3 vNormal; varying float vCrista;
      void main() {
        vec4 m = modelMatrix * vec4(position, 1.0);
        vec3 n;
        vec3 p = gerstner(m.xz, n);
        vMundo = p; vNormal = n; vCrista = gCrista;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTempo; uniform float uVento; uniform vec3 uSol; uniform vec3 uBarco; uniform float uRumo;
      varying vec3 vMundo; varying vec3 vNormal; varying float vCrista;
      ${fundoGLSL}
      // Small scrolling ripples: perturb the normal (this is what makes the glitter).
      vec3 ondinhas(vec2 p, float t) {
        vec2 g = vec2(0.0);
        g += vec2(cos(p.x * 1.9 + t * 1.7 + sin(p.y * 0.7)), cos(p.y * 2.3 - t * 1.3)) * 0.5;
        g += vec2(cos(dot(p, vec2(3.1, 2.2)) + t * 2.4), cos(dot(p, vec2(-2.7, 3.4)) - t * 2.1)) * 0.35;
        g += (vec2(vnoise(p * 2.7 + t * 0.6), vnoise(p * 2.7 - t * 0.5 + 9.0)) - 0.5) * 1.6;
        g += (vec2(vnoise(p * 7.1 - t * 1.1), vnoise(p * 6.3 + t * 0.9 + 3.0)) - 0.5) * 1.1;
        return normalize(vec3(-g.x * 0.16, 1.0, -g.y * 0.16));
      }
      float causticas(vec2 p, float t) {
        float c = 0.0;
        for (int i = 0; i < 2; i++) {
          vec2 q = p * (0.55 + float(i) * 0.31) + vec2(t * 0.25, -t * 0.18) * (1.0 + float(i));
          vec2 f = fract(q) - 0.5;
          vec2 id = floor(q);
          float d = 1.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(x, y);
            vec2 r = o + 0.5 * sin(6.2831 * (vec2(h2(id + o), h2(id + o + 7.3)) + t * 0.15)) - f;
            d = min(d, dot(r, r));
          }
          c += pow(1.0 - smoothstep(0.0, 0.32, sqrt(d)), 6.0);
        }
        return c;
      }
      void main() {
        vec3 V = normalize(cameraPosition - vMundo);
        vec3 r = ondinhas(vMundo.xz, uTempo);
        vec3 N = normalize(vec3(vNormal.x + r.x, vNormal.y, vNormal.z + r.z));
        float prof = max(vMundo.y - fundo(vMundo.xz), 0.0); // water column (m)
        // Colour through the water: sand -> turquoise -> deep blue.
        vec3 areia = vec3(0.86, 0.79, 0.62);
        vec3 raso = vec3(0.30, 0.82, 0.80);
        vec3 medio = vec3(0.10, 0.55, 0.72);
        vec3 fundoCor = vec3(0.03, 0.22, 0.42);
        vec3 agua = mix(raso, medio, smoothstep(0.8, 3.0, prof));
        agua = mix(agua, fundoCor, smoothstep(2.6, 7.5, prof));
        agua = mix(areia, agua, smoothstep(0.0, 1.4, prof));
        // Caustics on the shallow bed.
        float cau = causticas(vMundo.xz * 0.35, uTempo) * (1.0 - smoothstep(0.5, 5.0, prof));
        agua += vec3(0.75, 0.95, 1.0) * cau * 0.35;
        // Boat shadow on the bed, offset away from the sun.
        vec2 sombraC = uBarco.xz - uSol.xz / max(uSol.y, 0.2) * min(prof, 4.0) * 0.9;
        vec2 dl = vMundo.xz - sombraC;
        vec2 fwd = vec2(sin(uRumo), cos(uRumo));
        vec2 loc = vec2(dot(dl, vec2(fwd.y, -fwd.x)), dot(dl, fwd));
        float sombra = 1.0 - smoothstep(0.6, 1.0, length(loc / vec2(1.9, 4.4)));
        agua *= 1.0 - sombra * 0.45;
        // Sky reflection with fresnel.
        vec3 R = reflect(-V, N);
        vec3 ceu = mix(vec3(0.70, 0.84, 0.93), vec3(0.22, 0.50, 0.80), smoothstep(0.0, 0.6, R.y));
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 cor = mix(agua, ceu, fres * 0.6);
        // Sun: broad sheen + sharp glitter sparks (HDR so bloom picks them up).
        float s = max(dot(R, uSol), 0.0);
        cor += vec3(1.0, 0.96, 0.86) * pow(s, 90.0) * 0.6;
        float faisca = pow(s, 380.0) * 26.0 * step(0.62, vnoise(vMundo.xz * 11.0 + uTempo * 2.5));
        cor += vec3(1.0, 0.98, 0.92) * faisca;
        // Foam: near the shore and on the steepest crests.
        float espuma = (1.0 - smoothstep(0.0, 0.55, prof)) * smoothstep(0.35, 0.7, fbm(vMundo.xz * 0.9 + uTempo * 0.4));
        // Crest foam: thin bands where the Gerstner surface pinches (Jacobian close to folding),
        // broken into streaks by noise stretched along the main wave direction.
        float pinca = smoothstep(0.62, 0.86, vCrista) * smoothstep(0.35, 0.9, uVento);
        vec2 dirOnda = normalize(vec2(1.0, 0.25));
        vec2 qs = vec2(dot(vMundo.xz, dirOnda) * 3.2, dot(vMundo.xz, vec2(-dirOnda.y, dirOnda.x)) * 0.7);
        float fios = smoothstep(0.45, 0.8, fbm(qs + uTempo * 0.3)) * smoothstep(0.3, 0.75, vnoise(vMundo.xz * 1.7 - uTempo * 0.5));
        espuma += pinca * (0.35 + 0.65 * fios);
        cor = mix(cor, vec3(0.97), clamp(espuma, 0.0, 1.0) * 0.8);
        // Distance haze.
        float dist = length(cameraPosition - vMundo);
        cor = mix(cor, vec3(0.78, 0.88, 0.95), smoothstep(60.0, 190.0, dist));
        gl_FragColor = vec4(cor, 1.0);
      }`,
  });
}

/** Seabed / island: sand with wet darkening below the waterline and grass on top. */
export function materialFundo() {
  return new THREE.ShaderMaterial({
    uniforms: { uSol: uAgua.uSol, uTempo: uAgua.uTempo },
    vertexShader: /* glsl */ `
      ${fundoGLSL}
      varying vec3 vMundo; varying vec3 vNormal;
      void main() {
        vec4 m = modelMatrix * vec4(position, 1.0);
        float h = fundo(m.xz);
        float e = 0.4;
        vec3 n = normalize(vec3(fundo(m.xz - vec2(e, 0.0)) - fundo(m.xz + vec2(e, 0.0)), 2.0 * e, fundo(m.xz - vec2(0.0, e)) - fundo(m.xz + vec2(0.0, e))));
        vMundo = vec3(m.x, h, m.z); vNormal = n;
        gl_Position = projectionMatrix * viewMatrix * vec4(vMundo, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSol; uniform float uTempo;
      varying vec3 vMundo; varying vec3 vNormal;
      ${fundoGLSL}
      void main() {
        vec3 n = normalize(vNormal);
        float grao = vnoise(vMundo.xz * 6.0) * 0.08 + vnoise(vMundo.xz * 0.7) * 0.1;
        vec3 areia = vec3(0.92, 0.86, 0.72) - grao;
        vec3 molhada = vec3(0.70, 0.64, 0.52) - grao;
        vec3 grama = mix(vec3(0.36, 0.58, 0.28), vec3(0.52, 0.70, 0.32), vnoise(vMundo.xz * 0.4));
        vec3 cor = mix(molhada, areia, smoothstep(0.05, 0.45, vMundo.y));
        cor = mix(cor, grama, smoothstep(1.4, 2.2, vMundo.y + vnoise(vMundo.xz * 0.5) * 0.8));
        float luz = 0.55 + 0.6 * max(dot(n, uSol), 0.0);
        cor *= luz;
        float dist = length(cameraPosition - vMundo);
        cor = mix(cor, vec3(0.78, 0.88, 0.95), smoothstep(60.0, 190.0, dist));
        gl_FragColor = vec4(cor, 1.0);
      }`,
  });
}
