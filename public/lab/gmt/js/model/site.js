// Cume de Las Campanas: terreno, céu (dia / crepúsculo / noite com estrelas e Via Láctea), luzes e mapa de ambiente.
import * as THREE from 'three';
import { fbm2, ridged2, smooth, rng, clamp } from '../util.js';

const TAU = Math.PI * 2;

/** Altura do terreno (m) em relação ao platô do cume. O furo do enclosure fica em r < 30,6 m. */
export function alturaTerreno(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const rugoso = fbm2(x / 40, z / 40, 4) * 1.2 + fbm2(x / 7, z / 7, 2) * 0.15;
  if (r < 95) return rugoso * smooth(60, 95, r) * 0.6 + fbm2(x / 3, z / 3, 2) * 0.03;
  // a crista do cume corre de norte a sul: cai mais devagar nessas direções
  const crista = 0.55 - 0.32 * Math.abs(Math.cos(th));
  const queda = -(r - 95) * crista * smooth(95, 260, r) - Math.max(0, r - 260) * crista * 0.6;
  const morros = ridged2(x / 380, z / 380, 5) * 260 * smooth(500, 1600, r);
  // cordilheira dos Andes a leste (+x), no horizonte
  const andes = Math.max(0, x) / 4000 * 1400 * smooth(2000, 3600, r) * (0.6 + 0.4 * ridged2(z / 600, x / 600, 4));
  return rugoso + queda + morros + andes;
}

function terreno(M) {
  const radios = [];
  for (let r = 30.62; r < 4200; r *= 1.045) radios.push(r);
  const nA = 192, pos = [], cor = [], idx = [];
  const c = new THREE.Color(), pedra = new THREE.Color(0x8d8274), terra = new THREE.Color(0x7b5d45), ocre = new THREE.Color(0xa77c52), cascalho = new THREE.Color(0xa59c8f);
  for (let i = 0; i < radios.length; i++) {
    for (let j = 0; j < nA; j++) {
      const a = (j / nA) * TAU, r = radios[i];
      const x = r * Math.cos(a), z = r * Math.sin(a), y = alturaTerreno(x, z);
      pos.push(x, y, z);
      const n = fbm2(x / 25, z / 25, 3) * 0.5 + 0.5;
      if (r < 100) c.copy(cascalho).lerp(pedra, n * 0.6);
      else c.copy(pedra).lerp(n > 0.5 ? ocre : terra, clamp((r - 100) / 300, 0, 1) * (0.5 + n * 0.5));
      cor.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < radios.length - 1; i++) for (let j = 0; j < nA; j++) {
    const a = i * nA + j, b = i * nA + ((j + 1) % nA), d = (i + 1) * nA + j, e = (i + 1) * nA + ((j + 1) % nA);
    idx.push(a, b, d, b, e, d); // anti-horário visto de cima: a normal aponta para cima
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.terreno);
  m.receiveShadow = true;
  m.name = 'terreno';
  m.userData.piso = true;
  // pedras soltas no platô
  const r = rng(7), pedras = [];
  for (let i = 0; i < 260; i++) {
    const ang = r() * TAU, rr = 34 + r() * 70, x = rr * Math.cos(ang), z = rr * Math.sin(ang);
    const s = 0.2 + r() * 0.7;
    pedras.push(new THREE.Matrix4().compose(new THREE.Vector3(x, alturaTerreno(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s, s * 0.6, s)));
  }
  const ped = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x7d7368, roughness: 1 }), pedras.length);
  pedras.forEach((p, i) => ped.setMatrixAt(i, p));
  ped.castShadow = ped.receiveShadow = true;
  const g2 = new THREE.Group();
  g2.add(m, ped);
  return { grupo: g2, malha: m };
}

const vertCeu = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // sempre no fundo
}`;
const fragCeu = /* glsl */ `
uniform float uHora;   // 0 noite, 0.5 crepúsculo, 1 dia
uniform vec3 uSol;
uniform float uVia;
varying vec3 vDir;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float t = clamp(y, -0.2, 1.0);
  // dia
  vec3 dia = mix(vec3(0.70, 0.80, 0.92), vec3(0.20, 0.42, 0.80), pow(max(t, 0.0), 0.5));
  // crepúsculo: horizonte laranja do lado do sol, zênite azul profundo
  // direção horizontal com proteção no zênite (normalize de vetor nulo dá NaN, que o bloom espalha em blocos pretos)
  vec2 hd = d.xz, hs = uSol.xz;
  float ladoSol = (length(hd) > 1e-4 && length(hs) > 1e-4) ? max(dot(hd / length(hd), hs / length(hs)), 0.0) : 0.0;
  vec3 crep = mix(mix(vec3(0.95, 0.52, 0.28), vec3(0.55, 0.42, 0.62), 1.0 - ladoSol), vec3(0.06, 0.10, 0.28), pow(max(t, 0.0), 0.45));
  // noite
  vec3 noite = mix(vec3(0.035, 0.05, 0.10), vec3(0.008, 0.012, 0.03), pow(max(t, 0.0), 0.6));
  vec3 c = uHora > 0.5 ? mix(crep, dia, (uHora - 0.5) * 2.0) : mix(noite, crep, uHora * 2.0);
  // Via Láctea: faixa em um grande círculo inclinado, com nuvens escuras
  vec3 nGal = normalize(vec3(0.35, 0.45, 0.82));
  float b = dot(d, nGal);
  float faixa = exp(-b * b / 0.018);
  float nuv = fbm(d * 7.0), poeira = smoothstep(0.45, 0.75, fbm(d * 13.0 + 3.0));
  float bojo = exp(-pow(length(d - normalize(vec3(-0.6, 0.25, -0.3))), 2.0) / 0.12);
  vec3 via = vec3(0.55, 0.58, 0.72) * faixa * (0.4 + 0.8 * nuv) * (1.0 - 0.7 * poeira * faixa) + vec3(0.9, 0.75, 0.55) * bojo * faixa * 0.6;
  float visNoite = 1.0 - smoothstep(0.0, 0.45, uHora);
  c += via * 0.22 * visNoite * uVia * smoothstep(-0.05, 0.25, y);
  // sol
  float s = max(dot(d, normalize(uSol)), 0.0);
  c += vec3(1.0, 0.85, 0.6) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.25) * smoothstep(0.2, 0.6, uHora);
  // chão abaixo do horizonte (o terreno cobre, mas evita costura)
  c = mix(c, c * 0.35, smoothstep(0.0, -0.15, y));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function estrelas() {
  const r = rng(42), n = 4200, pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n);
  const nGal = new THREE.Vector3(0.35, 0.45, 0.82).normalize();
  for (let i = 0; i < n; i++) {
    // concentra parte das estrelas no plano da galáxia
    let v;
    do {
      v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    } while (v.lengthSq() > 1 || v.lengthSq() < 0.01 || (i % 3 === 0 && Math.abs(v.clone().normalize().dot(nGal)) > 0.2));
    v.normalize();
    if (v.y < -0.05) v.y = -v.y;
    pos.set([v.x * 3800, v.y * 3800, v.z * 3800], i * 3);
    const t = r();
    const c = t < 0.15 ? [1, 0.8, 0.6] : t < 0.3 ? [0.75, 0.85, 1] : [1, 1, 1];
    cor.set(c, i * 3);
    tam[i] = Math.pow(r(), 6) * 3.5 + 0.8;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `attribute float tam; varying vec3 vC; varying float vT; uniform float uPx;
      void main(){ vC = color; vT = tam; vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; gl_PointSize = tam * uPx; }`,
    fragmentShader: `uniform float uOp; varying vec3 vC; varying float vT;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * uOp * min(1.0, vT), 1.0); }`,
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = -1;
  return p;
}

export function criarSitio(renderer, scene, M) {
  const t = terreno(M);
  scene.add(t.grupo);

  const ceuMat = new THREE.ShaderMaterial({
    uniforms: { uHora: { value: 0.5 }, uSol: { value: new THREE.Vector3(-0.6, 0.05, 0.4) }, uVia: { value: 1 } },
    vertexShader: vertCeu, fragmentShader: fragCeu, side: THREE.BackSide, depthWrite: false,
  });
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), ceuMat);
  ceu.frustumCulled = false;
  ceu.renderOrder = -2;
  ceu.name = 'ceu';
  scene.add(ceu);
  const est = estrelas();
  est.material.uniforms.uPx.value = Math.min(2, renderer.getPixelRatio());
  scene.add(est);

  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x5a4a3a, 0.8);
  const sol = new THREE.DirectionalLight(0xffffff, 2.5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 400 });
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.04;
  scene.add(hemi, sol, sol.target);
  // luz interna do domo (de manutenção) e luzes vermelhas de observação
  const interna = new THREE.PointLight(0xffd8a8, 0, 120, 1.4);
  interna.position.set(0, 52, -6);
  scene.add(interna);

  // mapa de ambiente gerado a partir do próprio céu (reflexos do espelho e do metal)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cenaCeu = new THREE.Scene();
  const ceuEnv = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), ceuMat);
  cenaCeu.add(ceuEnv);
  let rt = null;

  const fog = new THREE.FogExp2(0x9fb0c8, 0.00022);
  scene.fog = fog;

  function setHora(hh) {
    ceuMat.uniforms.uHora.value = hh;
    const solDir = hh >= 0.75 ? new THREE.Vector3(-0.45, 0.85, 0.35) : hh >= 0.25 ? new THREE.Vector3(-0.85, 0.08, 0.4) : new THREE.Vector3(0.35, 0.7, -0.45);
    ceuMat.uniforms.uSol.value.copy(solDir).normalize();
    sol.position.copy(solDir).normalize().multiplyScalar(220);
    if (hh >= 0.75) { sol.color.set(0xfff4e6); sol.intensity = 3.0; hemi.intensity = 1.0; hemi.color.set(0xcfe0ff); }
    else if (hh >= 0.25) { sol.color.set(0xffb27a); sol.intensity = 2.2; hemi.intensity = 0.75; hemi.color.set(0x9fa7d8); }
    else { sol.color.set(0x9db4ff); sol.intensity = 0.85; hemi.intensity = 0.55; hemi.color.set(0x5a6fa8); }
    interna.intensity = hh < 0.25 ? 260 : 0;
    est.material.uniforms.uOp.value = hh < 0.25 ? 1 : hh < 0.75 ? 0.35 : 0;
    fog.color.set(hh >= 0.75 ? 0xb4c4dc : hh >= 0.25 ? 0x6e6a8a : 0x0c1222);
    fog.density = hh < 0.25 ? 0.00035 : 0.00022;
    if (rt) rt.dispose();
    rt = pmrem.fromScene(cenaCeu, 0.02);
    scene.environment = rt.texture;
    scene.environmentIntensity = hh < 0.25 ? 0.35 : hh < 0.75 ? 0.7 : 1;
  }
  setHora(0.5);
  return { terreno: t.malha, terrenoGrupo: t.grupo, ceu, estrelas: est, sol, hemi, interna, setHora, ceuMat };
}

