// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/model/parts.js, só o fim; commit 6efe428).
// Peças ocultas do editor, presentes em toda base: trecho de cabo, eletrocalha e modelo 3D extra.
// Elas só entram na obra quando um projeto as usa; aí passam pelo mesmo cálculo das peças do pacote.
import * as THREE from 'three';
import { tubo, alinhar } from './geom.js';
import { obterExterno } from './externos.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mk(geo, mat, q, sub) {
  const m = new THREE.Mesh(geo, mat);
  m.userData.mat = q;
  m.userData.sub = sub;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function caixa(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function tuboEntre(a, b, r, parede, mat, q, sub, seg = 10) {
  const L = a.distanceTo(b);
  const m = mk(tubo(r, parede, L, seg), mat, q, sub);
  alinhar(m, a, b);
  m.userData.comp = L;
  return m;
}
const grupo = (...filhos) => { const g = new THREE.Group(); filhos.flat().forEach((f) => f && g.add(f)); return g; };

/** Tipos de instalação de um trecho de cabo. */
export const INSTALACOES = {
  estrutura: { nome: 'Preso à estrutura', mat: null },
  canaleta: { nome: 'Canaleta no chão', mat: 'canaleta' },
  vala: { nome: 'Enterrado em vala', mat: 'vala_cabos' },
};
export const CATEGORIAS_CABO = {
  energia: { nome: 'Energia', mat: 'cabo_energia', cor: '#e2733a' },
  fibra: { nome: 'Fibra óptica', mat: 'cabo_fibra', cor: '#3fd18b' },
  dados: { nome: 'Dados e sinal', mat: 'cabo_dados', cor: '#5d86ff' },
  refrigerante: { nome: 'Refrigerante', mat: 'mangueira_refrigerante', cor: '#56c7e8' },
};
/** Comprimento do caminho (m): soma dos segmentos, ou o valor digitado (comprimento_m) quando não há desenho. */
export function comprimentoCabo(op = {}) {
  if (op.comprimento_m != null) return Math.max(0, +op.comprimento_m || 0);
  const p = op.pontos ?? [];
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
  return L;
}
const matsCabo = new Map();
function matCabo(cor) {
  if (!matsCabo.has(cor)) matsCabo.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.1, emissive: cor, emissiveIntensity: 0.25 }));
  return matsCabo.get(cor);
}
/** Alfinete translúcido: marca um trecho orçado sem desenho. */
function marcador(cor) {
  const m = new THREE.MeshStandardMaterial({ color: cor, transparent: true, opacity: 0.55, emissive: cor, emissiveIntensity: 0.35, depthWrite: false });
  const haste = mk(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8).translate(0, 1.2, 0), m, null, 'marcador');
  const cabeca = mk(new THREE.SphereGeometry(0.5, 16, 12).translate(0, 2.8, 0), m, null, 'marcador');
  const ponta = mk(new THREE.ConeGeometry(0.2, 0.5, 10).rotateX(Math.PI).translate(0, 0.25, 0), m, null, 'marcador');
  return grupo(haste, cabeca, ponta);
}
/** Grupo com um segmento por par de pontos (e juntas esféricas). */
function caminho(op, seg, rJunta) {
  let pts = (op.pontos ?? []).map((p) => V(p[0], p[1], p[2]));
  if (pts.length < 2) pts = [V(0, 0, 0), V(0, Math.min(6, Math.max(0.5, comprimentoCabo(op))), 0)];
  const g = grupo();
  for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) > 1e-4) g.add(seg(pts[i - 1], pts[i]));
  if (rJunta > 0) for (let i = 1; i < pts.length - 1; i++) {
    const s = mk(new THREE.SphereGeometry(rJunta, 10, 8), g.children[0]?.material ?? matCabo('#888888'), null, 'junta');
    s.position.copy(pts[i]);
    g.add(s);
  }
  return g;
}

/** As três peças ocultas (mesmo formato das peças do pacote, já convertidas para a base). */
export function pecasOcultas() {
  return [
    {
      id: 'trecho-cabo', nome: 'Trecho de cabos', sistema: null, oculto: true,
      qtd: [0, 'usuario', 'estimado'],
      extras: (op = {}) => {
        const c = CATEGORIAS_CABO[op.categoria] ?? CATEGORIAS_CABO.energia;
        const L = comprimentoCabo(op), feixe = op.feixe ?? 1, folga = op.folga_pct ?? 0;
        const r = [[c.mat, L * feixe * (1 + folga / 100), 'usuario', 'estimado', `${feixe} cabo(s) × ${L.toFixed(1)} m de caminho + ${folga}% de folga.`]];
        // instalação no chão: um item por metro de caminho (não depende do número de cabos)
        const inst = INSTALACOES[op.instalacao];
        if (inst?.mat) r.push([inst.mat, L, 'usuario', 'estimado', `${inst.nome}: ${L.toFixed(1)} m de caminho.`]);
        return r;
      },
      build(d, op = {}) {
        const c = CATEGORIAS_CABO[op.categoria] ?? CATEGORIAS_CABO.energia;
        if (!(op.pontos?.length >= 2)) return marcador(c.cor);
        // raio só visual (os cabos não têm malha medida: comprimento e massa saem dos extras)
        const r = 0.06 + 0.015 * Math.sqrt(op.feixe ?? 1);
        const g = caminho(op, (a, b) => tuboEntre(a, b, r, r, matCabo(c.cor), null, 'cabos', 10), r);
        if (INSTALACOES[op.instalacao]?.mat) {
          const cor = op.instalacao === 'vala' ? '#8d7660' : '#b7a38a';
          g.add(caminho(op, (a, b) => {
            const m = mk(caixa(0.5, 0.05, a.distanceTo(b)), matCabo(cor), null, 'faixa');
            const y = -r - 0.04;
            m.position.copy(a).add(b).multiplyScalar(0.5).setY((a.y + b.y) / 2 + y);
            m.lookAt(b.x, b.y + y, b.z);
            return m;
          }, 0));
        }
        return g;
      },
    },
    {
      id: 'eletrocalha', nome: 'Eletrocalha', sistema: null, oculto: true,
      qtd: [0, 'usuario', 'estimado'],
      extras: (op = {}) => [['eletrocalha', (op.largura_m ?? 0.3) * comprimentoCabo(op), 'usuario', 'estimado', `${((op.largura_m ?? 0.3) * 100).toFixed(0)} cm × ${comprimentoCabo(op).toFixed(1)} m.`]],
      build(d, op = {}) {
        const w = op.largura_m ?? 0.3;
        if (!(op.pontos?.length >= 2)) return grupo();
        return caminho(op, (a, b) => {
          const L = a.distanceTo(b);
          const m = mk(caixa(w, L, 0.04, 0, L / 2, -0.1), matCabo('#9aa3b5'), null, 'bandeja');
          alinhar(m, a, b);
          return m;
        }, 0);
      },
    },
    {
      id: 'modelo-externo', nome: 'Modelo 3D extra', sistema: null, oculto: true,
      qtd: [0, 'usuario', 'estimado'],
      // preço informado pelo usuário: um "conjunto" por peça, com o preço vindo do item (ctx.precos['componentes:modelo-externo'])
      extras: (op = {}) => (op.com_preco ? [['componentes', 1, 'usuario', 'estimado', 'Preço informado no editor.']] : []),
      build(d, op = {}) {
        const ext = obterExterno(op.modelo);
        const g = grupo();
        if (!ext) {
          // modelo ainda não carregado (ou ausente): marcador sem material, fora do cálculo e do cache
          g.add(mk(caixa(1, 1, 1, 0, 0.5, 0), matCabo('#c084fc'), null, 'modelo ausente'));
          g.userData.semCache = true;
          return g;
        }
        const c = ext.cena.clone(true);
        c.scale.multiplyScalar(op.escala ?? 1);
        c.traverse((m) => { if (m.isMesh) { m.userData.mat = op.material ?? null; m.userData.sub = m.name || 'malha'; m.userData.compartilhada = true; } });
        g.add(c);
        return g;
      },
    },
  ];
}
