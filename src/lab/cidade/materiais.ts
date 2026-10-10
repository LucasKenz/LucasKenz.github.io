import * as THREE from 'three';
import { BLOCO, RUA } from './gerador';

// Shared uniforms: time, night amount (0 day .. 1 night), sun direction.
export const uniformes = {
  uTempo: { value: 0 },
  uNoite: { value: 0.65 },
  uSol: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
  uNevoa: { value: new THREE.Color('#0b1224') },
  uNevoaPerto: { value: 300 },
  uNevoaLonge: { value: 1100 },
  uBrilho: { value: 1.35 }, // lit-window intensity (higher in the cinematic mode, for bloom)
  uDourado: { value: 0 }, // 0..1, peaks at dusk: low warm sun and orange horizon
};

/** Golden-hour amount for a night value: a bump centred between day and night. */
export const dourado = (noite: number) => Math.exp(-((noite - 0.42) ** 2) / (2 * 0.13 * 0.13));

const nevoaGLSL = /* glsl */ `
  uniform vec3 uNevoa; uniform float uNevoaPerto; uniform float uNevoaLonge;
  // Distance fog plus a low ground fog layer that thickens with distance (height fog).
  vec3 nevoa(vec3 c, float dist, float y) {
    float f = smoothstep(uNevoaPerto, uNevoaLonge, dist);
    float baixa = exp(-max(y, 0.0) / 22.0) * smoothstep(60.0, 700.0, dist) * 0.75;
    return mix(c, uNevoa, max(f, baixa));
  }
`;

/** Buildings: instanced boxes with procedural windows and a rise-in animation. */
export function materialPredios() {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniformes, uInicio: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDados; // cor, janelas, atraso
      uniform float uTempo; uniform float uInicio;
      varying vec3 vMundo; varying vec3 vNormal; varying vec3 vDados; varying vec3 vEscala; varying vec3 vLocal;
      void main() {
        vec3 escala = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        float t = clamp((uTempo - uInicio - aDados.z) / 0.9, 0.0, 1.0);
        float sobe = 1.0 - pow(1.0 - t, 3.0);
        vec3 p = position; p.y *= max(sobe, 0.001);
        vec4 mundo = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vMundo = mundo.xyz; vLocal = position; vEscala = escala; vDados = aDados;
        vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNoite; uniform vec3 uSol; uniform float uBrilho; uniform float uDourado;
      varying vec3 vMundo; varying vec3 vNormal; varying vec3 vDados; varying vec3 vEscala; varying vec3 vLocal;
      ${nevoaGLSL}
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 n = normalize(vNormal);
        // Palette: concrete, glass blue, warm stone, with a little jitter.
        vec3 a = vec3(0.56, 0.58, 0.62), b = vec3(0.24, 0.33, 0.52), c = vec3(0.62, 0.55, 0.47);
        vec3 base = vDados.x < 0.45 ? a : (vDados.x < 0.8 ? b : c);
        base *= 0.85 + 0.3 * fract(vDados.x * 13.7);
        float sol = max(dot(n, uSol), 0.0);
        float luz = 0.35 + 0.65 * sol;
        // At golden hour the sun is low but still strong: facades stay lit, warm on the sun side.
        luz = mix(luz, 0.07 + 0.1 * sol, uNoite * (1.0 - 0.65 * uDourado));
        vec3 tintSol = mix(vec3(1.0), vec3(1.45, 0.92, 0.55), uDourado * sol);
        vec3 tintSombra = mix(vec3(1.0), vec3(0.42, 0.48, 0.72), uDourado * (1.0 - sol));
        // Ground-contact darkening: cheap ambient occlusion at the base of each facade.
        float ao = mix(0.55, 1.0, smoothstep(0.0, 14.0, vMundo.y));
        vec3 cor = base * luz * tintSol * tintSombra * ao;
        bool lateral = abs(n.y) < 0.5;
        if (lateral) {
          // Window grid in metres along the face.
          float u = abs(n.x) > 0.5 ? vLocal.z * vEscala.z : vLocal.x * vEscala.x;
          float v = vLocal.y * vEscala.y;
          vec2 celula = vec2(floor(u / 3.2), floor(v / 3.6));
          vec2 f = vec2(fract(u / 3.2), fract(v / 3.6));
          // Anti-aliased window mask: soft edges sized by screen-space derivatives,
          // fading to an average tone far away instead of shimmering.
          vec2 w = fwidth(vec2(u / 3.2, v / 3.6)) * 1.5;
          float mx = smoothstep(0.18 - w.x, 0.18 + w.x, f.x) * (1.0 - smoothstep(0.82 - w.x, 0.82 + w.x, f.x));
          float my = smoothstep(0.25 - w.y, 0.25 + w.y, f.y) * (1.0 - smoothstep(0.8 - w.y, 0.8 + w.y, f.y));
          float longe = clamp(max(w.x, w.y) * 2.0, 0.0, 1.0);
          float janela = mix(mx * my, 0.42, longe) * step(2.0, v);
          float sorte = h21(celula + vec2(vDados.y * 91.0, vDados.x * 37.0));
          float acesa = step(0.8 - vDados.y * 0.12, sorte);
          vec3 quente = mix(vec3(1.0, 0.74, 0.4), vec3(0.85, 0.92, 1.0), step(0.93, sorte)) * (0.75 + 0.5 * fract(sorte * 7.3));
          vec3 vidroDia = mix(vec3(0.42, 0.55, 0.72), vec3(0.75, 0.85, 0.95), 0.3) * luz;
          vec3 vidroNoite = mix(vec3(0.015, 0.02, 0.045), quente * uBrilho * mix(1.0, 0.4, longe), mix(acesa, 0.16, longe));
          // Glass mirrors the orange sky at dusk.
          vidroDia = mix(vidroDia, vec3(1.0, 0.62, 0.32) * (0.5 + sol), uDourado * 0.6);
          cor = mix(cor, mix(vidroDia, vidroNoite, uNoite * (1.0 - 0.5 * uDourado)), janela);
        } else {
          cor *= 0.75; // roof
        }
        float dist = distance(cameraPosition, vMundo);
        gl_FragColor = vec4(nevoa(cor, dist, vMundo.y), 1.0);
      }`,
  });
}

/** Rooftop clutter (water tanks, antennas) and neon signs share this simple lit material. */
export function materialTelhado(neon = false) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniformes },
    vertexShader: /* glsl */ `
      varying vec3 vMundo; varying vec3 vNormal; varying vec3 vCor;
      void main() {
        vec4 m = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vMundo = m.xyz;
        vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        #ifdef USE_INSTANCING_COLOR
          vCor = instanceColor;
        #else
          vCor = vec3(0.5);
        #endif
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNoite; uniform vec3 uSol; uniform float uDourado; uniform float uTempo;
      varying vec3 vMundo; varying vec3 vNormal; varying vec3 vCor;
      ${nevoaGLSL}
      void main() {
        vec3 cor;
        if (${neon ? 'true' : 'false'}) {
          // Neon: off by day, glowing (> 1 for bloom) at night, with a slow flicker per sign.
          float pisca = 0.85 + 0.15 * step(0.08, fract(sin(dot(floor(vMundo.xz), vec2(12.9, 78.2))) * 437.5 + uTempo * 0.37));
          cor = mix(vCor * 0.35, vCor * 3.2 * pisca, smoothstep(0.35, 0.8, uNoite));
        } else {
          float sol = max(dot(normalize(vNormal), uSol), 0.0);
          float luz = mix(0.35 + 0.65 * sol, 0.06 + 0.08 * sol, uNoite);
          cor = vCor * luz * mix(vec3(1.0), vec3(1.5, 0.95, 0.6), uDourado * sol);
        }
        gl_FragColor = vec4(nevoa(cor, distance(cameraPosition, vMundo), vMundo.y), 1.0);
      }`,
  });
}

/** Ground: roads with lane marks drawn in world space, so the plane can follow the camera. */
export function materialChao() {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniformes },
    vertexShader: /* glsl */ `
      varying vec3 vMundo;
      void main() { vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`,
    fragmentShader: /* glsl */ `
      uniform float uNoite; varying vec3 vMundo;
      ${nevoaGLSL}
      void main() {
        float B = ${BLOCO.toFixed(1)}, R = ${RUA.toFixed(1)};
        vec2 q = mod(vMundo.xz, B);
        vec2 dr = min(q, B - q); // distance to the road centre lines
        bool rua = dr.x < R * 0.5 || dr.y < R * 0.5;
        vec3 asfalto = mix(vec3(0.22, 0.23, 0.26), vec3(0.025, 0.028, 0.04), uNoite);
        vec3 lote = mix(vec3(0.46, 0.5, 0.42), vec3(0.03, 0.04, 0.05), uNoite);
        vec3 cor = rua ? asfalto : lote;
        // Dashed yellow centre line (speed-bump yellow).
        float faixaX = step(dr.x, 0.18) * step(0.5, fract(vMundo.z / 6.0)) * step(R * 0.5, dr.y);
        float faixaZ = step(dr.y, 0.18) * step(0.5, fract(vMundo.x / 6.0)) * step(R * 0.5, dr.x);
        cor = mix(cor, vec3(1.0, 0.76, 0.1) * mix(1.0, 0.7, uNoite), clamp(faixaX + faixaZ, 0.0, 1.0));
        // Sidewalk edge.
        float meio = (abs(dr.x - R * 0.5) < 0.35 || abs(dr.y - R * 0.5) < 0.35) ? 1.0 : 0.0;
        cor = mix(cor, cor * 1.6 + 0.04, meio);
        gl_FragColor = vec4(nevoa(cor, distance(cameraPosition, vMundo), vMundo.y), 1.0);
      }`,
  });
}

/** Sky dome: day gradient to night blue with procedural stars and a soft horizon glow. */
export function materialCeu() {
  return new THREE.ShaderMaterial({
    uniforms: { uNoite: uniformes.uNoite, uNevoa: uniformes.uNevoa, uDourado: uniformes.uDourado, uSol: uniformes.uSol },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      uniform float uNoite; uniform vec3 uNevoa; uniform float uDourado; uniform vec3 uSol; varying vec3 vDir;
      float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        float y = clamp(vDir.y, 0.0, 1.0);
        vec3 diaTopo = vec3(0.36, 0.56, 0.86), noiteTopo = vec3(0.01, 0.02, 0.06);
        vec3 topo = mix(diaTopo, noiteTopo, uNoite);
        vec3 cor = mix(uNevoa, topo, pow(y, 0.55));
        // Golden hour: orange band on the horizon and a warm halo around the low sun.
        float halo = pow(max(dot(normalize(vDir), normalize(uSol)), 0.0), 12.0);
        cor = mix(cor, vec3(1.0, 0.55, 0.25), uDourado * exp(-y * 5.0) * 0.8);
        cor += vec3(1.6, 0.9, 0.45) * halo * uDourado;
        // City glow on the horizon at night.
        cor += vec3(0.9, 0.5, 0.25) * 0.18 * uNoite * exp(-y * 9.0);
        // Stars.
        vec3 c = floor(vDir * 420.0);
        float e = step(0.9975, h(c)) * smoothstep(0.08, 0.35, y) * uNoite;
        cor += vec3(e) * (0.8 + 1.6 * h(c + 1.0));
        gl_FragColor = vec4(cor, 1.0);
      }`,
  });
}
