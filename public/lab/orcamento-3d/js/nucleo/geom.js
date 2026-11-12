// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/model/geom.js, commit 6efe428).
// Só as funções genéricas: tubo fechado (para desenhar cabos), alinhar e medição de volume/área na malha.
import * as THREE from 'three';

const TAU = Math.PI * 2;

/** Construtor de malha com normais explícitas; corrige a orientação de cada triângulo pela normal pedida. */
class MB {
  constructor() { this.p = []; this.n = []; }
  tri(a, b, c, na, nb, nc) {
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
    const mx = na[0] + nb[0] + nc[0], my = na[1] + nb[1] + nc[1], mz = na[2] + nb[2] + nc[2];
    if (cx * mx + cy * my + cz * mz < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; }
    for (const [v, n] of [[a, na], [b, nb], [c, nc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); }
  }
  quad(a, b, c, d, na, nb = na, nc = na, nd = na) { this.tri(a, b, c, na, nb, nc); this.tri(a, c, d, na, nc, nd); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.computeBoundingSphere();
    return g;
  }
}

/** Setor anular sólido em torno do eixo Y (tubo, disco). Fechado. */
export function setor({ ri = 0, ro = 1, y0 = 0, y1 = 1, seg = 12 }) {
  const b = new MB();
  const P = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];
  for (let i = 0; i < seg; i++) {
    const a = (TAU * i) / seg, c = (TAU * (i + 1)) / seg;
    const ca = Math.cos(a), sa = Math.sin(a), cc = Math.cos(c), sc = Math.sin(c);
    b.quad(P(ro, y0, a), P(ro, y0, c), P(ro, y1, c), P(ro, y1, a), [ca, 0, sa], [cc, 0, sc], [cc, 0, sc], [ca, 0, sa]);
    if (ri > 1e-6) b.quad(P(ri, y0, a), P(ri, y0, c), P(ri, y1, c), P(ri, y1, a), [-ca, 0, -sa], [-cc, 0, -sc], [-cc, 0, -sc], [-ca, 0, -sa]);
    b.quad(P(ri, y1, a), P(ri, y1, c), P(ro, y1, c), P(ro, y1, a), [0, 1, 0]);
    b.quad(P(ri, y0, a), P(ri, y0, c), P(ro, y0, c), P(ro, y0, a), [0, -1, 0]);
  }
  return b.geometry();
}

/** Tubo (oco, fechado) ao longo de Y, base em y=0. */
export const tubo = (r, parede, L, seg = 12) => setor({ ri: Math.max(0, r - parede), ro: r, y0: 0, y1: L, seg });

const _up = new THREE.Vector3(0, 1, 0);
/** Posiciona um objeto (com geometria ao longo de +Y a partir de 0) entre os pontos a e b. */
export function alinhar(obj, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  obj.position.copy(a);
  obj.quaternion.setFromUnitVectors(_up, d.clone().normalize());
  return d.length();
}

// ---------- medição de volume e área (para os quantitativos) ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3();

/**
 * Volume (m³, pelo teorema da divergência) e área (m²) de uma BufferGeometry.
 * O volume só vale para malha fechada; `aberta` indica arestas sem par (malha com furos).
 */
export function medirGeometria(g) {
  if (g.userData.medida) return g.userData.medida;
  const pos = g.attributes.position, idx = g.index;
  if (!pos) return (g.userData.medida = { vol: 0, area: 0, aberta: false, tris: 0 });
  const n = idx ? idx.count : pos.count;
  let vol = 0, area = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    _a.fromBufferAttribute(pos, i0); _b.fromBufferAttribute(pos, i1); _c.fromBufferAttribute(pos, i2);
    vol += _a.dot(_x.crossVectors(_b, _c)) / 6;
    area += _x.crossVectors(_y.subVectors(_b, _a), _c.clone().sub(_a)).length() / 2;
  }
  g.userData.medida = { vol: Math.abs(vol), area, aberta: malhaAberta(g), tris: Math.floor(n / 3) };
  return g.userData.medida;
}

/** Verifica se a malha tem arestas de borda (soldando vértices pela posição). Limite de 200 mil triângulos. */
function malhaAberta(g) {
  const pos = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : pos.count;
  if (n / 3 > 200000) return false;
  const chave = new Map();
  const id = (i) => {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let v = chave.get(k);
    if (v === undefined) { v = chave.size; chave.set(k, v); }
    return v;
  };
  const arestas = new Map();
  for (let i = 0; i + 2 < n; i += 3) {
    const t = [idx ? idx.getX(i) : i, idx ? idx.getX(i + 1) : i + 1, idx ? idx.getX(i + 2) : i + 2].map(id);
    for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      if (a === b) continue;
      const e = a < b ? `${a}_${b}` : `${b}_${a}`;
      arestas.set(e, (arestas.get(e) ?? 0) + 1);
    }
  }
  for (const c of arestas.values()) if (c % 2) return true;
  return false;
}

const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _inv = new THREE.Matrix4();
/**
 * Mede uma peça inteira por material (userData.mat). Respeita escala de objetos e instâncias.
 * mundo = true: usa a matriz mundo de cada malha (a escala dos pais conta), sem referência à raiz.
 * Retorna { [mat]: { vol, area, comprimento, n, aberta } }.
 */
export function medirPeca(raiz, mundo = false) {
  raiz.updateMatrixWorld(true);
  if (mundo) _inv.identity(); else _inv.copy(raiz.matrixWorld).invert();
  const r = {};
  raiz.traverse((o) => {
    if (!o.isMesh || !o.userData.mat) return;
    const med = medirGeometria(o.geometry);
    const acc = (r[o.userData.mat] ??= { vol: 0, area: 0, comprimento: 0, n: 0, aberta: false });
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
    if (med.aberta) acc.aberta = true;
  });
  return r;
}
