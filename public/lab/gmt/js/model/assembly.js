// Monta o modelo completo a partir do registro de peças (parts.js).
// Hierarquia: fixo (pier, trilhos, enclosure inferior) | az (gira em azimute) > el (gira em elevação) | domo (gira com o domo).
import * as THREE from 'three';
import { G, PECA, construir } from './parts.js';
import { setor, prisma } from './geom.js';
import { SUBS, SUB } from './subsistemas.js';
import { DEG } from '../util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const m4 = (x, y, z, ry = 0, rx = 0, rz = 0, s = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V(...s));
/** Rotação em Y que leva o +Z local para a direção radial do ângulo a (x = cos a, z = sin a). */
const voltadoPara = (a) => Math.PI / 2 - a;

/**
 * Várias cópias de um tipo de peça como InstancedMesh (uma por malha do protótipo).
 * Malhas que já são instanciadas no protótipo viram n×m instâncias.
 */
export function instanciar(id, matrizes, opcoes) {
  const proto = construir(id, false, opcoes);
  proto.updateMatrixWorld(true);
  const g = new THREE.Group();
  g.userData.peca = id;
  g.userData.copias = matrizes.length;
  const _l = new THREE.Matrix4();
  proto.traverse((o) => {
    if (!o.isMesh) return;
    const locais = [];
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, _l); locais.push(o.matrixWorld.clone().multiply(_l)); }
    else locais.push(o.matrixWorld.clone());
    const im = new THREE.InstancedMesh(o.geometry, o.material, matrizes.length * locais.length);
    const pares = [];
    let i = 0;
    for (const M of matrizes) for (const L of locais) { im.setMatrixAt(i++, M.clone().multiply(L)); pares.push([M, L]); }
    im.userData = { ...o.userData, peca: id, pares };
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    g.add(im);
  });
  return g;
}

function colocar(id, x, y, z, ry = 0, rx = 0, rz = 0, opcoes, detalhe = false) {
  const g = construir(id, detalhe, opcoes);
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz, 'YXZ');
  return g;
}

function marcar(obj, peca) {
  obj.userData.peca = peca;
  obj.traverse((o) => { if (o.isMesh) { o.userData.peca = peca; o.castShadow = o.receiveShadow = true; } });
  return obj;
}

/** Referencial de um segmento do M1 (k = -1 para o central), no sistema do grupo de elevação. */
export function quadroSegmento(k) {
  const o = new THREE.Object3D();
  if (k < 0) { o.position.set(0, G.M1_Z, 0); return o; }
  const a = G.A_OFF, th = (k * Math.PI) / 3;
  o.position.set(a * Math.cos(th), G.M1_Z + (a * a) / (4 * G.F), a * Math.sin(th));
  o.rotation.set(0, -th, Math.atan(a / (2 * G.F)), 'YXZ');
  return o;
}

export function montar(M) {
  const raiz = new THREE.Group();
  const fixo = new THREE.Group(), az = new THREE.Group(), el = new THREE.Group(), domo = new THREE.Group();
  fixo.name = 'fixo'; az.name = 'az'; el.name = 'el'; domo.name = 'domo';
  el.position.y = G.Y_EL;
  az.add(el);
  raiz.add(fixo, az, domo);
  const pais = { fixo, az, el, domo };

  // grupos de subsistema (um por pai em que o subsistema aparece)
  const gruposSub = {};
  const sg = (id, pai) => {
    const k = `${id}@${pai}`;
    if (!gruposSub[k]) {
      const g = new THREE.Group();
      g.userData.sis = id;
      g.userData.explode = SUB[id].explode;
      pais[pai].add(g);
      gruposSub[k] = g;
    }
    return gruposSub[k];
  };
  const contagem = {};
  const conta = (id, n = 1) => { contagem[id] = (contagem[id] ?? 0) + n; };
  const pisos = [];

  // ================= FIXO =================
  sg('pier', 'fixo').add(colocar('fundacao', 0, 0, 0), colocar('pier', 0, 0, 0));
  conta('fundacao'); conta('pier');
  const iso = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; iso.push(m4(10.25 * Math.cos(a), -2.6, 10.25 * Math.sin(a))); }
  sg('pier', 'fixo').add(instanciar('isolador', iso)); conta('isolador', 24);

  const laje = colocar('laje-terrea', 0, 0, 0);
  const piso = colocar('piso-observacao', 0, 0, 0);
  const paredeInf = colocar('parede-inferior', 0, 0, 0);
  sg('domo', 'fixo').add(laje, piso, paredeInf);
  conta('laje-terrea'); conta('piso-observacao'); conta('parede-inferior');
  pisos.push(laje, piso);

  // trilho de azimute: 8 segmentos de 45°
  const tri = [];
  for (let i = 0; i < 8; i++) tri.push(m4(0, G.Y_TRILHO, 0, -(i * Math.PI) / 4));
  sg('azimute', 'fixo').add(instanciar('trilho-azimute', tri)); conta('trilho-azimute', 8);

  // trilhos do domo: barras de 12 m tangentes aos dois círculos (14 + 16 = 30)
  const trilhos = [];
  for (const [r, n] of [[G.R_TRILHO_ENC[0], 14], [G.R_TRILHO_ENC[1], 16]]) {
    const L = (TAU * r) / n;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU;
      trilhos.push(m4(r * Math.cos(a), G.Y_PIER, r * Math.sin(a), -a, 0, 0, [1, 1, L / 12]));
    }
  }
  sg('domo', 'fixo').add(instanciar('trilho-enclosure', trilhos)); conta('trilho-enclosure', 30);

  // escadas do térreo ao piso de observação (lado sul, junto da porta)
  const escadasFixas = escadaria(0, G.Y_PIER, 25.2, 0.62 * Math.PI, -1);
  sg('domo', 'fixo').add(escadasFixas.grupo); conta('escada', escadasFixas.n); conta('patamar', escadasFixas.np); pisos.push(escadasFixas.grupo);

  // ================= AZIMUTE =================
  const disco = colocar('disco-azimute', 0, G.Y_DISCO, 0);
  sg('azimute', 'az').add(disco); conta('disco-azimute'); pisos.push(disco);
  const manc = [], mot = [], eds = [];
  for (let i = 0; i < 24; i++) { const a = ((i + 0.5) / 24) * TAU; manc.push(m4(9.6 * Math.cos(a), G.Y_TRILHO + 1.04, 9.6 * Math.sin(a), voltadoPara(a), 0, 0, [1, 0.44, 1])); }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; mot.push(m4(10.45 * Math.cos(a), G.Y_TRILHO + 1.2, 10.45 * Math.sin(a), -a + Math.PI / 2)); }
  for (let i = 0; i < 8; i++) { const a = ((i + 0.25) / 8) * TAU; eds.push(m4(8.0 * Math.cos(a), G.Y_TRILHO + 1.04, 8.0 * Math.sin(a), 0, 0, 0, [1, 0.3, 1])); }
  sg('azimute', 'az').add(instanciar('mancal-hidrostatico', manc), instanciar('motor-azimute', mot), instanciar('amortecedor-eds', eds));
  conta('mancal-hidrostatico', 24); conta('motor-azimute', 16); conta('amortecedor-eds', 8);

  for (const sx of [-1, 1]) sg('montagem', 'az').add(colocar('berco-c-ring', sx * G.X_CRING, G.Y_DECK, 0));
  conta('berco-c-ring', 2);

  // plataformas de instrumentos (IP e GIS) e G-CLEF
  const ip = colocar('plataforma-instrumento', -9.6, G.Y_DECK, 5, Math.PI / 2);
  const gis = colocar('plataforma-instrumento', 9.6, G.Y_DECK, -5, Math.PI / 2);
  sg('instrumentos', 'az').add(ip, gis, colocar('gclef', 9.6, G.Y_DECK + 2.48, -5, Math.PI / 2));
  conta('plataforma-instrumento', 2); conta('gclef');
  pisos.push(ip, gis);
  const escAz = [m4(-9.6, G.Y_DECK, 0.1, 0, 0, 0, [1, 2.44 / 3, 1]), m4(9.6, G.Y_DECK, -0.1, Math.PI, 0, 0, [1, 2.44 / 3, 1])];
  const ea = instanciar('escada', escAz);
  sg('montagem', 'az').add(ea); conta('escada', 2); pisos.push(ea);

  // ================= ELEVAÇÃO =================
  for (const sx of [-1, 1]) sg('montagem', 'el').add(colocar('c-ring', sx * G.X_CRING, 0, 0));
  conta('c-ring', 2);
  sg('montagem', 'el').add(colocar('oss', 0, 0, 0)); conta('oss');

  const capas = [];
  for (let k = -1; k < 6; k++) {
    const q = quadroSegmento(k);
    const qc = q.clone(), qs = q.clone(), qp = q.clone();
    qc.add(construir(k < 0 ? 'celula-central' : 'celula-offaxis', true));
    qs.add(construir(k < 0 ? 'segmento-m1-central' : 'segmento-m1-offaxis', false));
    sg('celulas', 'el').add(qc);
    sg('m1', 'el').add(qs);
    // seis pétalas da capa, articuladas na borda da célula
    for (let j = 0; j < 6; j++) {
      const psi = (j * Math.PI) / 3 + Math.PI / 6;
      const piv = new THREE.Group();
      piv.position.set(4.45 * Math.cos(psi), 0.42, 4.45 * Math.sin(psi));
      piv.rotation.set(0, voltadoPara(psi), 0, 'YXZ'); // -Z local (a pétala) aponta para o centro
      const petala = construir('capa-petala');
      piv.add(petala);
      qp.add(piv);
      capas.push(piv);
    }
    sg('capas', 'el').add(qp);
  }
  conta('celula-central'); conta('celula-offaxis', 6); conta('segmento-m1-central'); conta('segmento-m1-offaxis', 6); conta('capa-petala', 42);
  // atuadores, hardpoints e ventiladores já aparecem dentro das células detalhadas
  conta('atuador-m1', 1120); conta('hardpoint', 42); conta('ventilador', 84);
  sg('capas', 'el').add(colocar('cone-defletor', 0, G.M1_Z, 0)); conta('cone-defletor');

  // torre do secundário: 6 pernas da borda do M1 ao anel do topo
  const yM2 = G.M1_Z + G.M1M2, yTopo = yM2 + 1.4;
  const base = [], topo = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    base.push(V(12.6 * Math.cos(a), -1.0, 12.6 * Math.sin(a)));
    topo.push(V(2.75 * Math.cos(a), yTopo + 0.3, 2.75 * Math.sin(a)));
  }
  const torre = sg('torre', 'el');
  const noMats = [];
  for (let k = 0; k < 6; k++) {
    const L = base[k].distanceTo(topo[k]);
    const perna = construir('perna-torre', false, { L });
    perna.position.copy(base[k]);
    perna.quaternion.setFromUnitVectors(V(0, 1, 0), topo[k].clone().sub(base[k]).normalize());
    torre.add(perna);
    const o = new THREE.Object3D();
    for (const [p, d] of [[base[k], topo[k]], [topo[k], base[k]]]) {
      o.position.copy(p); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().sub(p).normalize()); o.updateMatrix();
      noMats.push(o.matrix.clone());
    }
  }
  torre.add(instanciar('no-trelica', noMats));
  for (let k = 0; k < 6; k++) {
    const a = base[k].clone().lerp(topo[k], 0.45), b = base[(k + 1) % 6].clone().lerp(topo[(k + 1) % 6], 0.45);
    const t = construir('travamento-torre', false, { L: a.distanceTo(b) });
    t.position.copy(a);
    t.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    torre.add(t);
  }
  torre.add(colocar('anel-top-end', 0, yTopo, 0));
  conta('perna-torre', 6); conta('no-trelica', 12); conta('travamento-torre', 6); conta('anel-top-end');

  // secundário: 7 ASM voltados para baixo + hexápodes invertidos
  const asmM = [], hexM = [];
  for (let k = -1; k < 6; k++) {
    const a = (k * Math.PI) / 3, r = k < 0 ? 0 : 1.09;
    asmM.push(m4(r * Math.cos(a), yM2, r * Math.sin(a)));
    hexM.push(m4(r * Math.cos(a), yTopo + 0.0, r * Math.sin(a), 0, Math.PI));
  }
  sg('asm', 'el').add(instanciar('segmento-asm', asmM), instanciar('hexapode-m2', hexM));
  conta('segmento-asm', 7); conta('hexapode-m2', 7);

  // instrumentos: GIR sob a célula central; DG e FP pendurados nele
  const yGir = G.M1_Z - 3.65 - 3.9;
  const ins = sg('instrumentos', 'el');
  ins.add(colocar('gir', 0, yGir, 0)); conta('gir');
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3, b = a + Math.PI / 3;
    ins.add(colocar('instrumento-dg', 1.6 * Math.cos(a), yGir - 3.2, 1.6 * Math.sin(a), -a));
    ins.add(colocar('instrumento-fp', 3.0 * Math.cos(b), yGir - 2.0, 3.0 * Math.sin(b), -b));
  }
  conta('instrumento-dg', 3); conta('instrumento-fp', 3);

  // lançadores de laser na borda do primário
  const lgsPos = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    const p = V(13.6 * Math.cos(a), 1.2, 13.6 * Math.sin(a));
    sg('lgs', 'el').add(colocar('lancador-lgs', p.x, p.y, p.z, -a));
    lgsPos.push(p.clone().setY(p.y + 2.2));
  }
  conta('lancador-lgs', 6);

  // ================= DOMO (gira) =================
  const D = sg('domo', 'domo'), Pt = sg('portas', 'domo'), Vt = sg('ventilacao', 'domo');
  const dA = G.MEIA_FENDA, cF = Math.PI / 2;
  const fora0 = cF + dA, fora1 = cF - dA + TAU; // arco fora da fenda

  D.add(colocar('anel-base', 0, G.Y_ANEL, 0)); conta('anel-base');
  const bog = [];
  for (let i = 0; i < 33; i++) { const a = (i / 33) * TAU; bog.push(m4(28.6 * Math.cos(a), G.Y_PIER + 0.18, 28.6 * Math.sin(a), -a)); }
  D.add(instanciar('bogie-rotacao', bog)); conta('bogie-rotacao', 33);

  const col = [];
  for (let i = 0; i < 21; i++) { const a = fora0 + ((i + 0.5) / 21) * (fora1 - fora0); col.push(m4(29.3 * Math.cos(a), G.Y_PAREDE0, 29.3 * Math.sin(a), voltadoPara(a))); }
  D.add(instanciar('coluna-enclosure', col)); conta('coluna-enclosure', 21);
  for (const y of [25, 35, 45, 55]) D.add(colocar('viga-anelar', 0, y, 0));
  conta('viga-anelar', 4);

  // respiros: 7 fileiras de 43 entre as colunas, fora da fenda
  const yResp = [], resp = [];
  for (let r = 0; r < 7; r++) yResp.push(19.4 + r * 4.8);
  for (const y of yResp) for (let i = 0; i < 43; i++) {
    const a = fora0 + ((i + 0.5) / 43) * (fora1 - fora0);
    resp.push(m4(30.55 * Math.cos(a), y, 30.55 * Math.sin(a), voltadoPara(a)));
  }
  const respiros = instanciar('respiro', resp);
  Vt.add(respiros); conta('respiro', resp.length);
  const cortina = respiros.children.find((m) => m.userData.sub?.startsWith('cortina'));

  // pele (painéis) entre as fileiras de respiros, chanfro e teto
  const pele = new THREE.Group();
  const faixa = (y0, y1, cheio) => pele.add(new THREE.Mesh(setor({ ri: 30.45, ro: 30.6, y0, y1, a0: cheio ? 0 : fora0, a1: cheio ? TAU : fora1, seg: cheio ? 128 : 112 }), M.painel));
  faixa(G.Y_PAREDE0, G.Y_FENDA, true);
  faixa(G.Y_FENDA, yResp[0], false);
  for (let r = 0; r < 6; r++) faixa(yResp[r] + 4.2, yResp[r + 1], false);
  faixa(yResp[6] + 4.2, G.Y_TOPO_PAREDE, false);
  pele.add(new THREE.Mesh(setor({ ri: 30.45, ro: 30.6, ri1: 28.35, ro1: 28.5, y0: G.Y_TOPO_PAREDE, y1: G.Y_TETO, a0: fora0, a1: fora1, seg: 112 }), M.painel));
  // teto plano com o rasgo da fenda (de z = Z_FENDA_TETO até a borda)
  const R = 28.5, d = Math.asin(13.5 / R), pts = [];
  for (let i = 0; i <= 96; i++) { const t = cF + d + (i / 96) * (TAU - 2 * d); pts.push([R * Math.cos(t), R * Math.sin(t)]); }
  pts.push([13.5, G.Z_FENDA_TETO], [-13.5, G.Z_FENDA_TETO]);
  pele.add(new THREE.Mesh(prisma(pts, G.Y_TETO - 0.3, G.Y_TETO), M.painel));
  D.add(marcar(pele, 'painel-revestimento')); conta('painel-revestimento', 560);

  // treliças do teto, fora da fenda
  for (const x of [-26, -22, -18.5, -15.5, 15.5, 18.5, 22, 26]) {
    const L = 2 * Math.sqrt(R * R - x * x);
    D.add(colocar('trelica-teto', x, G.Y_TETO - 3.4, 0, 0, 0, 0, { L }));
  }
  conta('trelica-teto', 8);

  // passarelas: três anéis internos nas vigas (fora da fenda)
  const pas = [];
  for (const y of [26.03, 36.03, 46.03]) {
    const n = Math.floor(((fora1 - fora0) * 27.6) / 6.05);
    // módulos levemente sobrepostos (+15 cm) para não deixar fresta nas juntas
    const L = (((fora1 - fora0) * 27.6) / n + 0.15) / 6;
    for (let i = 0; i < n; i++) { const a = fora0 + ((i + 0.5) / n) * (fora1 - fora0); pas.push(m4(27.6 * Math.cos(a), y, 27.6 * Math.sin(a), voltadoPara(a) + Math.PI, 0, 0, [L, 1, 1])); } // X tangente; guarda-corpo (+Z local) para o lado do vão
  }
  const pasG = instanciar('passarela', pas);
  D.add(pasG); conta('passarela', pas.length); pisos.push(pasG);
  // escadas do piso de observação até os anéis: correm por dentro do anel (r = 26,2 m, o anel ocupa 27,0–28,2 m)
  // e os patamares de saída/chegada avançam até a passarela
  for (const [y0, y1, a] of [[G.Y_PIER, 26.03, 1.25 * Math.PI], [26.03, 36.03, 1.55 * Math.PI], [36.03, 46.03, 1.85 * Math.PI]]) {
    const e = escadaria(y0, y1, 26.2, a, 1, { saida: y0 > G.Y_PIER, chegada: true, rAnel: 27.6 });
    D.add(e.grupo); conta('escada', e.n); conta('patamar', e.np); pisos.push(e.grupo);
  }

  D.add(colocar('ponte-rolante', -15, 56, 0)); conta('ponte-rolante');

  // portas em L: a porta 1 cobre x > 0; a porta 2 é o espelho
  const porta1 = new THREE.Group(), porta2 = new THREE.Group();
  porta1.add(construir('porta-shutter'));
  porta2.add(construir('porta-shutter'));
  porta2.scale.x = -1;
  const bp = [];
  for (const s of [1, -1]) for (const a of [cF - dA * 0.85, cF - dA * 0.15]) {
    const x = s * 31.3 * Math.cos(a), z = 31.3 * Math.sin(a);
    bp.push(m4(x, G.Y_FENDA - 2.6, z, voltadoPara(Math.atan2(z, x))));
  }
  const bpG = instanciar('bogie-porta', bp.slice(0, 2)), bpG2 = instanciar('bogie-porta', bp.slice(0, 2));
  porta1.add(bpG); porta2.add(bpG2);
  // bogies superiores (no trilho do teto)
  for (const p of [porta1, porta2]) p.add(instanciar('bogie-porta', [m4(4, G.Y_TETO + 0.2, -10), m4(9, G.Y_TETO + 0.2, 20)]));
  Pt.add(porta1, porta2); conta('porta-shutter', 2); conta('bogie-porta', 8);

  // para-vento na fenda
  const tela = colocar('para-vento', 0, G.Y_FENDA - 0.5, 30.5 * Math.cos(dA) - 0.8);
  Vt.add(tela); conta('para-vento');

  // ================= APOIO (prédios do cume) =================
  const ap = sg('apoio', 'fixo');
  ap.add(colocar('ssb', -10, 0, -85, 0.15), colocar('sub', 62, 0, -58, -0.4), colocar('tanque-agua', 78, 0, 12));
  ap.add(colocar('torre-ambiental', 48, 0, 46), colocar('torre-ambiental', -55, 0, 34));
  conta('ssb'); conta('sub'); conta('tanque-agua'); conta('torre-ambiental', 2);

  // âncoras dos hotspots
  const ancoras = {};
  for (const s of SUBS) {
    const o = new THREE.Object3D();
    o.position.copy(s.ancora);
    pais[s.pai].add(o);
    ancoras[s.id] = o;
  }

  // ---------- estado e animações ----------
  const estado = { az: 20, el: 60, azDomo: 20, sync: true, portas: 1, capas: 1, vent: 0.5, tela: 0, explode: 0 };
  const _S = new THREE.Matrix4(), _t1 = new THREE.Matrix4(), _t2 = new THREE.Matrix4(), _x = new THREE.Matrix4();

  function aplicar() {
    az.rotation.y = Math.PI - estado.az * DEG;
    el.rotation.x = (90 - estado.el) * DEG;
    domo.rotation.y = Math.PI - (estado.sync ? estado.az : estado.azDomo) * DEG;
    const abre = (2 * dA + 0.04) * estado.portas;
    porta1.rotation.y = abre;
    porta2.rotation.y = -abre;
    // capas: 0 = fechadas sobre o espelho, 1 = abertas (de pé, para fora)
    for (const p of capas) p.children[0].rotation.x = estado.capas * 1.75;
    // cortina dos respiros: altura = 4 m × (1 − abertura), presa no rolo de cima
    if (cortina) {
      const h = Math.max(0.02, 4 * (1 - estado.vent));
      _S.makeTranslation(0, 4, 0).multiply(_t1.makeScale(1, h / 2, 1)).multiply(_t2.makeTranslation(0, -4, 0));
      cortina.userData.pares.forEach(([Mi, L], i) => cortina.setMatrixAt(i, _x.copy(Mi).multiply(_S).multiply(L)));
      cortina.instanceMatrix.needsUpdate = true;
    }
    tela.scale.y = Math.max(0.001, estado.tela);
    tela.visible = estado.tela > 0.001;
    // vista explodida
    for (const g of Object.values(gruposSub)) g.position.copy(g.userData.explode).multiplyScalar(estado.explode);
  }
  aplicar();

  // ---------- corte do domo (cunha voltada para a câmera) ----------
  const planos = [new THREE.Plane(), new THREE.Plane()];
  const clipaveis = new Map();
  const comCorte = (mat) => {
    if (Array.isArray(mat)) return mat.map(comCorte);
    if (!clipaveis.has(mat)) {
      const c = mat.clone();
      c.clippingPlanes = planos;
      c.clipIntersection = true;
      c.clipShadows = true;
      clipaveis.set(mat, c);
    }
    return clipaveis.get(mat);
  };
  const cortaveis = [];
  for (const raizCorte of [domo, paredeInf]) raizCorte.traverse((o) => { if (o.isMesh) { o.userData.matOriginal = o.material; o.material = comCorte(o.material); cortaveis.push(o); } });
  let corteAtivo = true;
  const h = 62 * DEG;
  function atualizarCorte(camera) {
    const d = V(camera.position.x, 0, camera.position.z);
    if (!corteAtivo || d.lengthSq() < 1) { planos[0].set(V(0, 0, 0), -1e6); planos[1].set(V(0, 0, 0), -1e6); return; }
    d.normalize();
    const u1 = d.clone().applyAxisAngle(V(0, 1, 0), (90 * DEG - h)), u2 = d.clone().applyAxisAngle(V(0, 1, 0), -(90 * DEG - h));
    planos[0].set(u1.negate(), 0);
    planos[1].set(u2.negate(), 0);
  }
  /** O ponto (mundo) está no trecho cortado? Usado para ignorar cliques em geometria invisível. */
  function cortado(p) {
    if (!corteAtivo) return false;
    return planos[0].distanceToPoint(p) < 0 && planos[1].distanceToPoint(p) < 0;
  }
  function setCorte(v) {
    corteAtivo = v;
    if (!v) { planos[0].set(V(0, 0, 0), -1e6); planos[1].set(V(0, 0, 0), -1e6); }
  }

  // quantidades contadas no modelo para as peças cuja quantidade vem do próprio modelo
  for (const id of ['escada', 'passarela', 'patamar']) {
    const p = PECA[id];
    p.qtd = [contagem[id], 'calculo', 'estimado', `Contados no modelo 3D (${contagem[id]} unidades).`];
  }

  raiz.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    raiz, fixo, az, el, domo, gruposSub, ancoras, estado, aplicar, contagem, pisos, lgsPos, capas, porta1, porta2, tela,
    atualizarCorte, setCorte, cortado, cortaveis, yM2,
    /** Grupos (em vários pais) de um subsistema. */
    gruposDe: (id) => Object.entries(gruposSub).filter(([k]) => k.startsWith(id + '@')).map(([, g]) => g),
  };
}

/**
 * Lances de escada de y0 a y1, ao longo de um círculo de raio r a partir do ângulo a (sentido s = ±1).
 * Cada lance é a peça "escada" (até 3 m de altura, 4,5 m de projeção) com altura ajustada; entre lances há um
 * patamar de 1,2 m. Opções: saida/chegada põem um patamar antes do primeiro e depois do último lance, esticado
 * no sentido radial até o anel de passarela de raio rAnel.
 */
function escadaria(y0, y1, r, a, s, { saida = false, chegada = false, rAnel = r } = {}) {
  const n = Math.max(1, Math.ceil((y1 - y0) / 3 - 0.05));
  const hL = (y1 - y0) / n, LANCE = 4.5, PAT = 1.2, mats = [], pats = [];
  const ponto = (ang, rr = r) => V(rr * Math.cos(ang), 0, rr * Math.sin(ang));
  // patamar centrado no ângulo ang e na altura y; "largo" estica no sentido radial até o anel
  const patamar = (ang, y, largo) => {
    const rMeio = largo ? (r - 0.6 + rAnel + 0.4) / 2 : r, prof = largo ? (rAnel + 0.4) - (r - 0.6) : PAT;
    const p = ponto(ang, rMeio), tang = V(-Math.sin(ang) * s, 0, Math.cos(ang) * s);
    pats.push(m4(p.x, y - 0.03, p.z, Math.atan2(tang.x, tang.z), 0, 0, [prof / PAT, 1, 1]));
  };
  let ang = a;
  if (saida) { patamar(ang + (s * PAT * 0.5) / r, y0, true); ang += (s * PAT) / r; }
  for (let i = 0; i < n; i++) {
    const angJ = ang + (s * LANCE) / r;
    const p0 = ponto(ang), dir = ponto(angJ).sub(p0);
    mats.push(m4(p0.x, y0 + i * hL, p0.z, Math.atan2(dir.x, dir.z), 0, 0, [1, hL / 3, 1]));
    ang = angJ;
    const ultimo = i === n - 1;
    if (!ultimo || chegada) patamar(ang + (s * PAT * 0.5) / r, y0 + (i + 1) * hL, ultimo);
    ang += (s * PAT) / r;
  }
  const grupo = new THREE.Group();
  grupo.add(instanciar('escada', mats));
  if (pats.length) grupo.add(instanciar('patamar', pats));
  return { grupo, n, np: pats.length };
}
