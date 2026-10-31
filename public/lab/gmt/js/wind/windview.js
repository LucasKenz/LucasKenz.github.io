// Visualização do campo de vento no estilo CFD: planos de corte coloridos, partículas com trilha,
// linhas de corrente, vetores e pressão na superfície do domo e do M1.
import * as THREE from 'three';
import { cfd, divergente, rng } from '../util.js';
import { R_DOMO, H_DOMO } from './field.js';

const TAU = Math.PI * 2;

export function criarVisVento(campo, modelo, qualidade = 'media') {
  const g = new THREE.Group();
  g.name = 'vento';
  g.visible = false;
  const c = campo.c;
  const o = [0, 0, 0];
  const vMax = () => Math.max(2, campo.perfil(80) * 1.45);

  // ---------- planos de corte ----------
  function plano(w, h, nx, ny) {
    const dados = new Uint8Array(nx * ny * 4);
    const tex = new THREE.DataTexture(dados, nx, ny, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.renderOrder = 2;
    return { m, tex, dados, nx, ny, w, h };
  }
  const W = 280, Hh = 115, X0 = 35; // o plano começa 105 m a barlavento e vai até 175 m na esteira
  const pv = plano(W, Hh, 140, 58), ph = plano(W, W, 120, 120);
  g.add(pv.m, ph.m);
  const opc = { plano: false, part: false, linhas: true, volume: false, setas: false, pressao: false, horiz: false, off: 0, alt: 40 };

  // referenciais dos planos (atualizados quando muda a direção do vento)
  const eixoV = { o: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3(0, 1, 0) };
  const eixoH = { o: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3() };
  function posicionarPlanos() {
    const e = new THREE.Vector3(c.ex, 0, c.ez), p = new THREE.Vector3(-c.ez, 0, c.ex);
    eixoV.o.copy(e).multiplyScalar(X0).addScaledVector(p, opc.off).setY(Hh / 2);
    eixoV.u.copy(e);
    pv.m.position.copy(eixoV.o);
    pv.m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e, new THREE.Vector3(0, 1, 0), e.clone().cross(new THREE.Vector3(0, 1, 0))));
    eixoH.o.copy(e).multiplyScalar(X0).setY(opc.alt);
    eixoH.u.copy(e); eixoH.v.copy(p).negate();
    ph.m.position.copy(eixoH.o);
    // a PlaneGeometry fica em XY: giramos para que "v" da textura vá ao longo de −p (horizontal)
    ph.m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e, p.clone().negate(), e.clone().cross(p.clone().negate())));
  }
  const cor = [0, 0, 0];
  function pintar(P, eixo, t) {
    const { nx, ny, w, h, dados } = P;
    const vm = vMax();
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = (i / (nx - 1) - 0.5) * w, b = (j / (ny - 1) - 0.5) * h;
      const x = eixo.o.x + eixo.u.x * a + eixo.v.x * b, y = eixo.o.y + eixo.u.y * a + eixo.v.y * b, z = eixo.o.z + eixo.u.z * a + eixo.v.z * b;
      const k = (j * nx + i) * 4;
      if (y < 0.3) { dados[k + 3] = 0; continue; }
      const s = campo.amostrar(x, y, z, t, o);
      cfd(s / vm, cor);
      dados[k] = cor[0] * 255; dados[k + 1] = cor[1] * 255; dados[k + 2] = cor[2] * 255; dados[k + 3] = 235;
    }
    P.tex.needsUpdate = true;
  }

  // ---------- partículas 3D: cápsulas orientadas pela velocidade ----------
  const NP = { baixa: 600, media: 1200, alta: 2400 }[qualidade] ?? 1200;
  const pos = new Float32Array(NP * 3), vida = new Float32Array(NP);
  const r = rng(9);
  function nascer(i, qualquer) {
    const e = [c.ex, c.ez], p = [-c.ez, c.ex];
    let xp, zp, y;
    if (r() < 0.14 && c.kInt > 0.05) {
      // parte das partículas nasce dentro do domo para mostrar o fluxo interno
      const a = r() * TAU, rr = Math.sqrt(r()) * (R_DOMO - 2);
      const x = rr * Math.cos(a), z = rr * Math.sin(a);
      xp = x * e[0] + z * e[1]; zp = x * p[0] + z * p[1]; y = 16 + r() * 46;
    } else {
      xp = qualquer ? -110 + r() * 280 : -112 + r() * 8;
      zp = (r() - 0.5) * 140;
      y = 1 + Math.pow(r(), 1.4) * 105;
    }
    pos[i * 3] = xp * e[0] + zp * p[0]; pos[i * 3 + 1] = y; pos[i * 3 + 2] = xp * e[1] + zp * p[1];
    vida[i] = 8 + r() * 14;
  }
  for (let i = 0; i < NP; i++) nascer(i, true);
  // cápsula ao longo de +Y com sombreamento embutido nas cores dos vértices (lê como 3D com qualquer luz)
  const capsula = new THREE.CapsuleGeometry(0.42, 1, 2, 7);
  {
    const n = capsula.attributes.normal, cc = new Float32Array(n.count * 3);
    for (let k = 0; k < n.count; k++) {
      const l = 0.45 + 0.55 * Math.max(0, n.getX(k) * 0.55 + n.getZ(k) * 0.65 + n.getY(k) * 0.3 + 0.35);
      cc[k * 3] = cc[k * 3 + 1] = cc[k * 3 + 2] = Math.min(1.15, l);
    }
    capsula.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  }
  const gotas = new THREE.InstancedMesh(capsula, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), NP);
  gotas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3);
  gotas.frustumCulled = false;
  gotas.userData.semCinza = true;
  g.add(gotas);
  const linhasP = gotas; // nome usado no ciclo abaixo
  const _gm = new THREE.Matrix4(), _gq = new THREE.Quaternion(), _gv = new THREE.Vector3(), _gs = new THREE.Vector3(), _gp = new THREE.Vector3(), _gc = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  function moverParticulas(dt, t) {
    const vm = vMax();
    for (let i = 0; i < NP; i++) {
      let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const s = campo.amostrar(x, y, z, t, o);
      x += o[0] * dt; y += o[1] * dt; z += o[2] * dt;
      vida[i] -= dt;
      const xp = x * c.ex + z * c.ez, zp = -x * c.ez + z * c.ex;
      if (vida[i] < 0 || xp > 175 || Math.abs(zp) > 110 || y < 0.2 || y > 125 || (s < 0.02 && r() < 0.05)) { nascer(i, false); x = pos[i * 3]; y = pos[i * 3 + 1]; z = pos[i * 3 + 2]; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      // comprimento proporcional ao caminho percorrido em ~0,35 s (com mínimo, para não sumir no ar parado)
      const comp = 0.6 + Math.min(9, s * 0.35);
      _gq.setFromUnitVectors(Y, s > 0.01 ? _gv.set(o[0] / s, o[1] / s, o[2] / s) : Y);
      _gm.compose(_gp.set(x, y, z), _gq, _gs.set(1, comp / 1.84, 1));
      gotas.setMatrixAt(i, _gm);
      cfd(s / vm, cor);
      gotas.setColorAt(i, _gc.setRGB(cor[0], cor[1], cor[2]));
    }
    gotas.instanceMatrix.needsUpdate = true;
    gotas.instanceColor.needsUpdate = true;
  }

  // ---------- tubos de corrente 3D ----------
  // Cada linha de corrente (RK2 sobre o campo congelado) vira um tubo sombreado e colorido pela velocidade;
  // pulsos de luz percorrem o tubo no tempo de voo real do ar (atributo "voo", em segundos).
  const NL = 32, PASSOS = 170, LADOS = 8, RAIO = 0.5;
  const MAXV = NL * PASSOS * LADOS;
  const tPos = new Float32Array(MAXV * 3), tNor = new Float32Array(MAXV * 3), tCor = new Float32Array(MAXV * 3), tVoo = new Float32Array(MAXV);
  const tIdx = new Uint32Array(NL * (PASSOS - 1) * LADOS * 6);
  const gl = new THREE.BufferGeometry();
  gl.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  gl.setAttribute('normal', new THREE.BufferAttribute(tNor, 3));
  gl.setAttribute('color', new THREE.BufferAttribute(tCor, 3));
  gl.setAttribute('voo', new THREE.BufferAttribute(tVoo, 1));
  gl.setIndex(new THREE.BufferAttribute(tIdx, 1));
  const matTubo = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: `attribute float voo; varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vVoo;
      void main(){ vC = color; vVoo = voo; vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform float uT; varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vVoo;
      void main(){
        vec3 n = normalize(vN), L = normalize(vec3(0.35, 0.8, 0.5));
        float dif = 0.38 + 0.62 * max(dot(n, L), 0.0);
        float esp = pow(max(dot(reflect(-L, n), vV), 0.0), 24.0) * 0.35;
        float pulso = smoothstep(0.82, 1.0, fract(vVoo / 6.0 - uT / 6.0));
        gl_FragColor = vec4(vC * dif + esp + pulso * 0.55, 1.0);
        #include <colorspace_fragment>
      }`,
    vertexColors: true,
  });
  const linhasC = new THREE.Mesh(gl, matTubo);
  linhasC.frustumCulled = false;
  linhasC.userData.semCinza = true;
  g.add(linhasC);
  const _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _ref = new THREE.Vector3();
  function tracarLinhas(t) {
    const vm = vMax();
    let nv = 0, ni = 0;
    const pts = [];
    // poucas sementes, onde o domo perturba o escoamento: ±42 m de lado, de 8 a 68 m de altura
    for (let a = 0; a < 8; a++) for (let b = 0; b < 4; b++) {
      const zp = -42 + a * 12, y = 8 + b * 20;
      let x = -100 * c.ex - zp * c.ez, z = -100 * c.ez + zp * c.ex, yy = y, voo = 0;
      pts.length = 0;
      for (let s = 0; s < PASSOS; s++) {
        const v = campo.amostrar(x, yy, z, t, o);
        if (v < 0.05) break;
        const ds = 2.2 / v;
        const mx = x + o[0] * ds * 0.5, my = yy + o[1] * ds * 0.5, mz = z + o[2] * ds * 0.5;
        const v2 = campo.amostrar(mx, my, mz, t, o);
        if (v2 < 0.05) break;
        pts.push([x, yy, z, v2, voo]);
        const d2 = 2.2 / v2;
        x += o[0] * d2; yy += o[1] * d2; z += o[2] * d2;
        voo += d2;
        if (yy < 0.2) break;
      }
      if (pts.length < 2) continue;
      // anéis com um quadro de referência transportado ao longo da linha (sem torção brusca)
      const base = nv;
      _ref.set(0, 1, 0);
      for (let k = 0; k < pts.length; k++) {
        const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(pts.length - 1, k + 1)];
        _t.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
        _a.crossVectors(_t, _ref);
        if (_a.lengthSq() < 1e-6) _a.crossVectors(_t, _ref.set(1, 0, 0));
        _a.normalize();
        _b.crossVectors(_a, _t).normalize();
        _ref.copy(_b);
        cfd(pts[k][3] / vm, cor);
        for (let l = 0; l < LADOS; l++) {
          const ang = (l / LADOS) * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
          _n.set(_a.x * ca + _b.x * sa, _a.y * ca + _b.y * sa, _a.z * ca + _b.z * sa);
          tPos[nv * 3] = pts[k][0] + _n.x * RAIO; tPos[nv * 3 + 1] = pts[k][1] + _n.y * RAIO; tPos[nv * 3 + 2] = pts[k][2] + _n.z * RAIO;
          tNor[nv * 3] = _n.x; tNor[nv * 3 + 1] = _n.y; tNor[nv * 3 + 2] = _n.z;
          tCor[nv * 3] = cor[0]; tCor[nv * 3 + 1] = cor[1]; tCor[nv * 3 + 2] = cor[2];
          tVoo[nv] = pts[k][4];
          nv++;
        }
        if (k > 0) for (let l = 0; l < LADOS; l++) {
          const i0 = base + (k - 1) * LADOS + l, i1 = base + (k - 1) * LADOS + ((l + 1) % LADOS), j0 = i0 + LADOS, j1 = i1 + LADOS;
          tIdx[ni++] = i0; tIdx[ni++] = j0; tIdx[ni++] = i1;
          tIdx[ni++] = i1; tIdx[ni++] = j0; tIdx[ni++] = j1;
        }
      }
    }
    gl.setDrawRange(0, ni);
    for (const k of ['position', 'normal', 'color', 'voo']) gl.attributes[k].needsUpdate = true;
    gl.index.needsUpdate = true;
  }

  // ---------- vetores ----------
  const seta = (() => {
    const haste = new THREE.CylinderGeometry(0.18, 0.18, 0.7, 6).translate(0, 0.35, 0);
    const ponta = new THREE.ConeGeometry(0.5, 0.3, 8).translate(0, 0.85, 0);
    const pos = [...haste.toNonIndexed().attributes.position.array, ...ponta.toNonIndexed().attributes.position.array];
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.computeVertexNormals();
    return gg;
  })();
  const NVX = 28, NVY = 11;
  const setas = new THREE.InstancedMesh(seta, new THREE.MeshBasicMaterial({ toneMapped: false }), NVX * NVY);
  setas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NVX * NVY * 3), 3);
  setas.frustumCulled = false;
  g.add(setas);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
  function atualizarSetas(t) {
    const vm = vMax();
    let i = 0;
    for (let a = 0; a < NVX; a++) for (let b = 0; b < NVY; b++) {
      const u = (a / (NVX - 1) - 0.5) * W, w = 4 + (b / (NVY - 1)) * (Hh - 10);
      _p.copy(eixoV.o).addScaledVector(eixoV.u, u).setY(w);
      const s = campo.amostrar(_p.x, _p.y, _p.z, t, o);
      _v.set(o[0], o[1], o[2]);
      if (s < 0.01) _s.set(0.001, 0.001, 0.001); else { const k = 2 + (s / vm) * 7; _s.set(k, k, k); }
      _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s < 0.01 ? new THREE.Vector3(0, 1, 0) : _v.normalize());
      _m.compose(_p.clone().addScaledVector(new THREE.Vector3(-c.ez, 0, c.ex), 0.4), _q, _s);
      setas.setMatrixAt(i, _m);
      cfd(s / vm, cor);
      setas.setColorAt(i, _c.setRGB(cor[0], cor[1], cor[2]));
      i++;
    }
    setas.instanceMatrix.needsUpdate = true;
    setas.instanceColor.needsUpdate = true;
  }

  // ---------- pressão na superfície ----------
  const dA = Math.asin(13.5 / 30.5), fora0 = Math.PI / 2 + dA, fora1 = Math.PI / 2 - dA + TAU;
  const NA = 96, NY = 20;
  const casca = new THREE.BufferGeometry();
  {
    const p = [], idx = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NA; i++) {
      const a = fora0 + (i / NA) * (fora1 - fora0), y = 15.3 + (j / NY) * (H_DOMO - 15.3);
      p.push(30.75 * Math.cos(a), y, 30.75 * Math.sin(a));
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i, b = a + 1, d = a + NA + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    // teto (anel de discos, sem a fenda: simplificado em disco inteiro abaixo da fenda)
    const base = p.length / 3;
    const NR = 8;
    for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
      const a = fora0 + (i / NA) * (fora1 - fora0), rr = 28.6 * (j / NR);
      p.push(rr * Math.cos(a), H_DOMO + 0.15, rr * Math.sin(a));
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
      const a = base + j * (NA + 1) + i, b = a + 1, d = a + NA + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    casca.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    casca.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(p.length), 3));
    casca.setIndex(idx);
  }
  const pressaoDomo = new THREE.Mesh(casca, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  pressaoDomo.visible = false;
  modelo.domo.add(pressaoDomo);
  const discoM1 = new THREE.Mesh(new THREE.CircleGeometry(13, 48, 0, TAU).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  discoM1.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(discoM1.geometry.attributes.position.count * 3), 3));
  discoM1.position.y = 1.2 + 0.6;
  discoM1.visible = false;
  modelo.el.add(discoM1);
  const _w = new THREE.Vector3();
  function pintarPressao(t) {
    modelo.domo.updateMatrixWorld();
    const P = casca.attributes.position, C = casca.attributes.color;
    const nParede = (NY + 1) * (NA + 1);
    for (let i = 0; i < P.count; i++) {
      _w.fromBufferAttribute(P, i).applyMatrix4(modelo.domo.matrixWorld);
      const rr = Math.hypot(_w.x, _w.z) || 1;
      const cp = campo.cpDomo(_w.x / rr, _w.z / rr, i >= nParede);
      divergente(cp / 1.5, cor);
      C.setXYZ(i, cor[0], cor[1], cor[2]);
    }
    C.needsUpdate = true;
    // M1: flutuação de pressão dinâmica do ar que passa sobre o espelho
    modelo.el.updateMatrixWorld();
    const Pm = discoM1.geometry.attributes.position, Cm = discoM1.geometry.attributes.color;
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(modelo.el.getWorldQuaternion(new THREE.Quaternion()));
    const vref = Math.max(0.3, campo.perfil(30) * 0.5);
    for (let i = 0; i < Pm.count; i++) {
      _w.fromBufferAttribute(Pm, i).applyMatrix4(discoM1.matrixWorld);
      const s = campo.amostrar(_w.x, _w.y, _w.z, t, o);
      const vn = -(o[0] * n.x + o[1] * n.y + o[2] * n.z);
      const cp = (2 * vn * Math.abs(vn) - 0.5 * s * s) / (vref * vref);
      divergente(cp / 1.2, cor);
      Cm.setXYZ(i, cor[0], cor[1], cor[2]);
    }
    Cm.needsUpdate = true;
  }

  // ---------- volume 3D (estilo CFD) ----------
  // O mesmo campo dos planos de corte, amostrado numa grade 3D no referencial do vento (e, y, lateral) e desenhado
  // por ray marching. Cor = |v| no colormap CFD; opacidade = quanto o escoamento local se desvia do perfil livre
  // (esteira, recirculação, aceleração nas bordas), para o ar não perturbado ficar quase transparente.
  // A grade é recalculada aos poucos (algumas fatias por quadro) para acompanhar os vórtices.
  const VX = 112, VY = 40, VZ = 56, VL = 150, VH = 100;
  const volDados = new Uint8Array(VX * VY * VZ * 4);
  const volTex = new THREE.Data3DTexture(volDados, VX, VY, VZ);
  volTex.format = THREE.RGBAFormat;
  volTex.minFilter = volTex.magFilter = THREE.LinearFilter;
  volTex.unpackAlignment = 1;
  volTex.needsUpdate = true;
  const matVol = new THREE.ShaderMaterial({
    uniforms: { uVol: { value: volTex }, uEsc: { value: new THREE.Vector3(W, VH, VL) }, uCentro: { value: new THREE.Vector3(X0, VH / 2, 0) }, uDens: { value: 1 }, uRDomo: { value: R_DOMO }, uHDomo: { value: H_DOMO } },
    vertexShader: `
      varying vec3 vOrigem; varying vec3 vDir;
      void main(){
        vOrigem = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vDir = position - vOrigem;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision highp float; precision highp sampler3D;
      uniform sampler3D uVol; uniform vec3 uEsc; uniform vec3 uCentro; uniform float uDens; uniform float uRDomo; uniform float uHDomo;
      varying vec3 vOrigem; varying vec3 vDir;
      vec2 caixa(vec3 o, vec3 d){ vec3 inv = 1.0 / d; vec3 t0 = (vec3(-0.5) - o) * inv, t1 = (vec3(0.5) - o) * inv;
        vec3 tmin = min(t0, t1), tmax = max(t0, t1); return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z)); }
      void main(){
        vec3 d = normalize(vDir);
        vec2 t = caixa(vOrigem, d);
        if (t.x > t.y) discard;
        t.x = max(t.x, 0.0);
        // o domo (cilindro r = uRDomo, até uHDomo) é opaco: o raio para ao chegar nele
        vec3 o = vOrigem * uEsc + uCentro, dm = d * uEsc;
        float a = dot(dm.xz, dm.xz), b = 2.0 * dot(o.xz, dm.xz), c = dot(o.xz, o.xz) - uRDomo * uRDomo, disc = b * b - 4.0 * a * c;
        if (disc > 0.0) {
          float tc = (-b - sqrt(disc)) / (2.0 * a);
          if (tc > t.x && tc < t.y && o.y + dm.y * tc < uHDomo) t.y = tc;
          else if (c < 0.0 && o.y < uHDomo) discard; // câmera dentro do cilindro
        }
        const int N = 160;
        float passo = (t.y - t.x) / float(N);
        float metros = passo * length(dm);
        vec4 acc = vec4(0.0);
        float j = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); // desfaz faixas
        // corte como na ref6: some a metade do volume do lado da câmera (plano vertical pelo eixo do domo),
        // então o domo fica na frente e o campo aparece atrás e em volta dele
        vec2 nh = normalize(o.xz + vec2(1e-4, 0.0));
        for (int i = 0; i < N; i++) {
          vec3 p = vOrigem + d * (t.x + (float(i) + j) * passo);
          vec3 q = p * uEsc + uCentro;
          if (q.y < uHDomo && dot(q.xz, q.xz) < uRDomo * uRDomo) break; // entrou no domo (pelo teto ou pela parede)
          if (dot(q.xz, nh) > 0.0) continue;
          vec4 s = texture(uVol, p + 0.5);
          s.rgb = pow(s.rgb, vec3(2.2)); // a textura guarda o colormap em sRGB; a soma é feita em linear
          float al = 1.0 - exp(-s.a * uDens * metros * 0.32);
          acc.rgb += (1.0 - acc.a) * al * s.rgb;
          acc.a += (1.0 - acc.a) * al;
          if (acc.a > 0.97) break;
        }
        if (acc.a < 0.003) discard;
        gl_FragColor = vec4(acc.rgb / max(acc.a, 1e-4), acc.a);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const volume = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matVol);
  volume.frustumCulled = false;
  volume.renderOrder = 3;
  volume.userData.semCinza = true;
  volume.visible = false;
  g.add(volume);
  function posicionarVolume() {
    const e = new THREE.Vector3(c.ex, 0, c.ez), p = new THREE.Vector3(-c.ez, 0, c.ex);
    volume.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(e, new THREE.Vector3(0, 1, 0), p));
    volume.position.copy(e).multiplyScalar(X0).setY(VH / 2);
    volume.scale.set(W, VH, VL);
  }
  let fatia = 0;
  function atualizarVolume(t, fatias) {
    const vm = vMax();
    for (let f = 0; f < fatias; f++) {
      const i = fatia;
      fatia = (fatia + 1) % VX;
      const a = (i / (VX - 1) - 0.5) * W + X0;
      for (let k = 0; k < VZ; k++) {
        const l = (k / (VZ - 1) - 0.5) * VL;
        const bx = a * c.ex - l * c.ez, bz = a * c.ez + l * c.ex;
        for (let jy = 0; jy < VY; jy++) {
          const y = Math.max(0.5, (jy / (VY - 1)) * VH);
          const idx = (i + VX * (jy + VY * k)) * 4;
          const s = campo.amostrar(bx, y, bz, t, o);
          const livre = Math.max(0.3, campo.perfil(y));
          // desvio do escoamento livre: velocidade (módulo e direção) comparada ao perfil logarítmico
          const dv = Math.hypot(o[0] - c.ex * livre, o[1], o[2] - c.ez * livre) / livre;
          cfd(s / vm, cor);
          volDados[idx] = cor[0] * 255; volDados[idx + 1] = cor[1] * 255; volDados[idx + 2] = cor[2] * 255;
          volDados[idx + 3] = 255 * Math.min(1, Math.max(0, (dv - 0.1) / 0.45)) ** 1.8;
        }
      }
    }
    volTex.needsUpdate = true;
  }

  // ---------- ciclo ----------
  let acum = 0, acumL = 0, vez = 0, sujo = true;
  function atualizar(dt, t) {
    if (!g.visible) return;
    pv.m.visible = opc.plano;
    volume.visible = opc.volume;
    ph.m.visible = opc.horiz;
    linhasP.visible = opc.part;
    linhasC.visible = opc.linhas;
    setas.visible = opc.setas;
    pressaoDomo.visible = discoM1.visible = opc.pressao;
    if (sujo) { posicionarPlanos(); posicionarVolume(); if (opc.volume) atualizarVolume(t, VX); sujo = false; acum = 1; acumL = 1; }
    if (opc.volume) atualizarVolume(t, 6);
    if (opc.part) moverParticulas(Math.min(dt, 0.05), t);
    acum += dt; acumL += dt;
    if (acum > 0.12) {
      acum = 0;
      vez = (vez + 1) % 4;
      if (vez === 0 && opc.plano) pintar(pv, eixoV, t);
      if (vez === 1 && opc.horiz) pintar(ph, eixoH, t);
      if (vez === 2 && opc.setas) atualizarSetas(t);
      if (vez === 3 && opc.pressao) pintarPressao(t);
    }
    matTubo.uniforms.uT.value = t;
    if (opc.linhas && acumL > 1.2) { acumL = 0; tracarLinhas(t); }
  }
  function opcoes(o2) {
    Object.assign(opc, o2);
    sujo = true;
  }
  function mostrar(v) {
    g.visible = v;
    if (!v) pressaoDomo.visible = discoM1.visible = false;
    sujo = true;
  }
  return { grupo: g, atualizar, opcoes, mostrar, reiniciar: () => { for (let i = 0; i < NP; i++) nascer(i, true); sujo = true; }, vMax };
}

/** Troca os materiais do modelo por cinza (estilo pós-processador de CFD) e volta. */
export function modoCinza(raiz, ligar, clipados) {
  const cinza = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.75, metalness: 0.05 });
  const cinzaClip = cinza.clone();
  raiz.traverse((o) => {
    if (!o.isMesh || o.userData.semCinza) return;
    if (ligar) {
      if (o.userData.matCor === undefined) o.userData.matCor = o.material;
      const clip = Array.isArray(o.material) ? o.material[0].clippingPlanes : o.material.clippingPlanes;
      if (clip && clip.length) {
        if (!clipados.has(clip)) { const m = cinzaClip.clone(); m.clippingPlanes = clip; m.clipIntersection = true; clipados.set(clip, m); }
        o.material = clipados.get(clip);
      } else o.material = cinza;
    } else if (o.userData.matCor !== undefined) {
      o.material = o.userData.matCor;
      delete o.userData.matCor;
    }
  });
}
