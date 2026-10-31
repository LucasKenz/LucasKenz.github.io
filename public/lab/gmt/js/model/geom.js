// Primitivas fechadas (sólidos estanques), para que volume e área possam ser medidos na própria malha.
import * as THREE from 'three';

const TAU = Math.PI * 2;

/** Construtor de malha com normais explícitas; corrige a orientação de cada triângulo pela normal pedida. */
export class MB {
  constructor(escalaUv = 3) {
    this.p = [];
    this.n = [];
    this.uv = [];
    this.s = escalaUv;
  }
  tri(a, b, c, na, nb, nc) {
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
    const mx = na[0] + nb[0] + nc[0], my = na[1] + nb[1] + nc[1], mz = na[2] + nb[2] + nc[2];
    if (cx * mx + cy * my + cz * mz < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    for (const [v, n] of [[a, na], [b, nb], [c, nc]]) {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(n[0], n[1], n[2]);
      if (Math.abs(n[1]) > 0.7) this.uv.push(v[0] / this.s, v[2] / this.s);
      else this.uv.push((Math.atan2(v[2], v[0]) * Math.hypot(v[0], v[2])) / this.s, v[1] / (this.s * 2));
    }
  }
  quad(a, b, c, d, na, nb = na, nc = na, nd = na) {
    this.tri(a, b, c, na, nb, nc);
    this.tri(a, c, d, na, nc, nd);
  }
  /** quad com normal plana calculada (aponta para "fora", dado um ponto interior de referência). */
  quadPlano(a, b, c, d, interior) {
    const n = normalPlana(a, b, c);
    const cx = (a[0] + c[0]) / 2 - interior[0], cy = (a[1] + c[1]) / 2 - interior[1], cz = (a[2] + c[2]) / 2 - interior[2];
    if (n[0] * cx + n[1] * cy + n[2] * cz < 0) { n[0] = -n[0]; n[1] = -n[1]; n[2] = -n[2]; }
    this.quad(a, b, c, d, n);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}
function normalPlana(a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/**
 * Setor anular sólido em torno do eixo Y (anel, tubo, disco, tronco de cone, arco de trilho...).
 * Raios interno/externo podem variar da base (0) ao topo (1). Fechado, com tampas nas pontas se não for 360°.
 */
export function setor({ ri = 0, ro = 1, ri1 = ri, ro1 = ro, y0 = 0, y1 = 1, a0 = 0, a1 = TAU, seg = 48, plano = false }) {
  const b = new MB();
  const cheio = Math.abs(a1 - a0) >= TAU - 1e-6;
  const h = y1 - y0;
  const P = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];
  const ym = (y0 + y1) / 2, rm = (ri + ro + ri1 + ro1) / 4;
  for (let i = 0; i < seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg, c = a0 + ((a1 - a0) * (i + 1)) / seg;
    const ca = Math.cos(a), sa = Math.sin(a), cc = Math.cos(c), sc = Math.sin(c);
    const am = (a + c) / 2, cm = Math.cos(am), sm = Math.sin(am);
    const interior = [rm * cm, ym, rm * sm];
    // externa
    const ko = (ro - ro1) / h;
    const no = (cx, sx) => { const l = Math.hypot(1, ko); return [cx / l, ko / l, sx / l]; };
    if (plano) b.quadPlano(P(ro, y0, a), P(ro, y0, c), P(ro1, y1, c), P(ro1, y1, a), interior);
    else b.quad(P(ro, y0, a), P(ro, y0, c), P(ro1, y1, c), P(ro1, y1, a), no(ca, sa), no(cc, sc), no(cc, sc), no(ca, sa));
    // interna
    if (ri > 1e-6 || ri1 > 1e-6) {
      const ki = (ri - ri1) / h;
      const ni = (cx, sx) => { const l = Math.hypot(1, ki); return [-cx / l, -ki / l, -sx / l]; };
      if (plano) b.quadPlano(P(ri, y0, a), P(ri, y0, c), P(ri1, y1, c), P(ri1, y1, a), [rm * 2 * cm, ym, rm * 2 * sm]);
      else b.quad(P(ri, y0, a), P(ri, y0, c), P(ri1, y1, c), P(ri1, y1, a), ni(ca, sa), ni(cc, sc), ni(cc, sc), ni(ca, sa));
    }
    // topo e base
    b.quad(P(ri1, y1, a), P(ri1, y1, c), P(ro1, y1, c), P(ro1, y1, a), [0, 1, 0]);
    b.quad(P(ri, y0, a), P(ri, y0, c), P(ro, y0, c), P(ro, y0, a), [0, -1, 0]);
  }
  if (!cheio) {
    const n0 = [Math.sin(a0), 0, -Math.cos(a0)], n1 = [-Math.sin(a1), 0, Math.cos(a1)];
    b.quad(P(ri, y0, a0), P(ro, y0, a0), P(ro1, y1, a0), P(ri1, y1, a0), n0);
    b.quad(P(ri, y0, a1), P(ro, y0, a1), P(ro1, y1, a1), P(ri1, y1, a1), n1);
  }
  return b.geometry();
}

/** Tubo (oco, fechado) ao longo de Y, base em y=0. */
export const tubo = (r, parede, L, seg = 12) => setor({ ri: Math.max(0, r - parede), ro: r, y0: 0, y1: L, seg });
export const cilindro = (r, y0, y1, seg = 32) => setor({ ri: 0, ro: r, y0, y1, seg });

const _up = new THREE.Vector3(0, 1, 0);
/** Posiciona um objeto (com geometria ao longo de +Y a partir de 0) entre os pontos a e b. */
export function alinhar(obj, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  obj.position.copy(a);
  obj.quaternion.setFromUnitVectors(_up, d.clone().normalize());
  return d.length();
}

/**
 * Placa sólida com face superior e inferior dadas por funções y=f(x,z), sobre um disco (rIn..rOut).
 * Retorna geometria com grupos: 0 = face superior, 1 = resto (para material diferente no espelho).
 */
export function placa({ rIn = 0, rOut, topo, base, nr = 16, ns = 64 }) {
  const sup = new MB(), resto = new MB();
  const pt = (r, a, f) => { const x = r * Math.cos(a), z = r * Math.sin(a); return [x, f(x, z), z]; };
  const normF = (x, z, f, sinal) => {
    const e = 0.01;
    const dx = (f(x + e, z) - f(x - e, z)) / (2 * e), dz = (f(x, z + e) - f(x, z - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    return [(-dx / l) * sinal, (1 / l) * sinal, (-dz / l) * sinal];
  };
  const raios = [];
  for (let i = 0; i <= nr; i++) raios.push(rIn + ((rOut - rIn) * i) / nr);
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < ns; j++) {
      const a = (TAU * j) / ns, c = (TAU * (j + 1)) / ns;
      const r0 = raios[i], r1 = raios[i + 1];
      const q = [pt(r0, a, topo), pt(r0, c, topo), pt(r1, c, topo), pt(r1, a, topo)];
      sup.quad(...q, ...q.map((p) => normF(p[0], p[2], topo, 1)));
      const w = [pt(r0, a, base), pt(r0, c, base), pt(r1, c, base), pt(r1, a, base)];
      resto.quad(...w, ...w.map((p) => normF(p[0], p[2], base, -1)));
    }
  }
  for (let j = 0; j < ns; j++) {
    const a = (TAU * j) / ns, c = (TAU * (j + 1)) / ns;
    const na = [Math.cos(a), 0, Math.sin(a)], nc = [Math.cos(c), 0, Math.sin(c)];
    resto.quad(pt(rOut, a, base), pt(rOut, c, base), pt(rOut, c, topo), pt(rOut, a, topo), na, nc, nc, na);
    if (rIn > 0) {
      const ia = na.map((v) => -v), ic = nc.map((v) => -v);
      resto.quad(pt(rIn, a, base), pt(rIn, c, base), pt(rIn, c, topo), pt(rIn, a, topo), ia, ic, ic, ia);
    }
  }
  const gs = sup.geometry(), gr = resto.geometry();
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(gs.attributes.position.count * 3 + gr.attributes.position.count * 3);
  const nor = new Float32Array(pos.length), uv = new Float32Array((pos.length / 3) * 2);
  pos.set(gs.attributes.position.array); pos.set(gr.attributes.position.array, gs.attributes.position.array.length);
  nor.set(gs.attributes.normal.array); nor.set(gr.attributes.normal.array, gs.attributes.normal.array.length);
  uv.set(gs.attributes.uv.array); uv.set(gr.attributes.uv.array, gs.attributes.uv.array.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.addGroup(0, gs.attributes.position.count, 0);
  g.addGroup(gs.attributes.position.count, gr.attributes.position.count, 1);
  g.computeBoundingSphere();
  return g;
}

/** Prisma a partir de um polígono 2D (x, z) extrudado em Y. */
export function prisma(pontos, y0, y1) {
  const s = new THREE.Shape(pontos.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

// ---------- medição de volume e área (para os quantitativos) ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3();

/** Volume (m³, pelo teorema da divergência) e área (m²) de uma BufferGeometry fechada. */
export function medirGeometria(g) {
  if (g.userData.medida) return g.userData.medida;
  const pos = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : pos.count;
  let vol = 0, area = 0;
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    _a.fromBufferAttribute(pos, i0); _b.fromBufferAttribute(pos, i1); _c.fromBufferAttribute(pos, i2);
    vol += _a.dot(_x.crossVectors(_b, _c)) / 6;
    area += _x.crossVectors(_b.clone().sub(_a), _c.clone().sub(_a)).length() / 2;
  }
  g.userData.medida = { vol: Math.abs(vol), area };
  return g.userData.medida;
}

const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _inv = new THREE.Matrix4();
/**
 * Mede uma peça inteira por material (userData.mat). Respeita escala de objetos e instâncias.
 * Retorna { [mat]: { vol, area, comprimento, n } }.
 */
export function medirPeca(raiz) {
  raiz.updateMatrixWorld(true);
  _inv.copy(raiz.matrixWorld).invert();
  const r = {};
  raiz.traverse((o) => {
    if (!o.isMesh || !o.userData.mat) return;
    const med = medirGeometria(o.geometry);
    const acc = (r[o.userData.mat] ??= { vol: 0, area: 0, comprimento: 0, n: 0 });
    _m.multiplyMatrices(_inv, o.matrixWorld);
    const cont = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < cont; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, _mi); _mi.premultiply(_m); } else _mi.copy(_m);
      const det = Math.abs(_mi.determinant());
      acc.vol += med.vol * det;
      acc.area += med.area * Math.pow(det, 2 / 3);
      acc.comprimento += (o.userData.comp ?? 0);
      acc.n += 1;
    }
  });
  return r;
}
