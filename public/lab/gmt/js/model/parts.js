// Registro de TIPOS de estrutura. Cada tipo é modelado uma vez (build) e multiplicado pela quantidade.
// O mesmo registro alimenta o modelo completo, o catálogo, o visualizador isolado e o BOM.
import * as THREE from 'three';
import { setor, tubo, alinhar, placa, prisma } from './geom.js';
import { DEG } from '../util.js';

// ---------- geometria global (metros) ----------
export const G = {
  F: 0.71 * 25.4,          // distância focal do M1 (f/0,71 × 25,4 m)
  A_OFF: 8.71,             // distância centro-a-centro dos segmentos off-axis (estimada: 8,417 m + vão)
  R_SEG: 8.417 / 2,
  ESP: 0.9,                // espessura do espelho (favo de mel)
  FURO: 0.6,               // raio do furo do segmento central (estimado)
  Y_PIER: 12,              // topo do pier (= piso de observação)
  Y_TRILHO: 12,            // base do trilho de azimute
  Y_DISCO: 13.4,           // fundo do disco de azimute
  Y_DECK: 15.2,            // convés do disco de azimute
  Y_EL: 26.7,              // eixo de elevação
  M1_Z: 1.2,               // vértice do M1 acima do eixo de elevação
  M1M2: 20.3,              // distância M1–M2 (estimada para Gregoriano f/0,71 → f/8,2)
  X_CRING: 7.0,
  R_CRING: 9.5,
  R_ENC: 30.5,
  Y_ANEL: 12.9,            // base do anel rotativo
  Y_PAREDE0: 15.3,         // início das paredes superiores
  Y_FENDA: 19,             // parte de baixo da abertura (fenda) do domo
  Y_TOPO_PAREDE: 59,
  Y_TETO: 64,
  MEIA_FENDA: Math.asin(13.5 / 30.5), // abertura de ~27 m de largura
  Z_FENDA_TETO: -14,       // a fenda do teto passa do eixo para o M1 ver o zênite inteiro
};
G.R_TRILHO_ENC = [27.675, 29.525];

/** Altura local da face do espelho off-axis (no referencial tangente do centro do segmento). */
export function faceSegmento(a) {
  const F = G.F;
  const Cy = (a * a) / (4 * F);
  const nl = Math.hypot(a / (2 * F), 1), nx = -a / (2 * F) / nl, ny = 1 / nl;
  const tl = Math.hypot(1, a / (2 * F)), tx = 1 / tl, ty = a / (2 * F) / tl;
  const A = (nx * nx) / (4 * F);
  return (x, z) => {
    const gx = a + x * tx, gy = Cy + x * ty, gz = z;
    const B = (gx * nx) / (2 * F) - ny;
    const Cc = (gx * gx + gz * gz) / (4 * F) - gy;
    const D = Math.max(0, B * B - 4 * A * Cc);
    return (2 * Cc) / (-B + Math.sqrt(D));
  };
}

let M = null;
export function usarMateriais(m) { M = m; }

// ---------- auxiliares ----------
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
function tuboEntre(a, b, r, parede, mat, q = 'aco_estrutural', sub = 'tubos', seg = 10) {
  const L = a.distanceTo(b);
  const m = mk(tubo(r, parede, L, seg), mat, q, sub);
  alinhar(m, a, b);
  m.userData.comp = L;
  return m;
}
function inst(geo, mat, q, matrizes, sub) {
  const m = new THREE.InstancedMesh(geo, mat, matrizes.length);
  matrizes.forEach((mm, i) => m.setMatrixAt(i, mm));
  m.userData.mat = q;
  m.userData.sub = sub;
  m.castShadow = m.receiveShadow = true;
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const grupo = (...filhos) => { const g = new THREE.Group(); filhos.flat().forEach((f) => f && g.add(f)); return g; };
const mat4 = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V(s, s, s));
const mat4s = (x, y, z, sx, sy, sz, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(sx, sy, sz));

/** Corrimão simples ao longo de um segmento (postes + duas barras). */
function corrimao(a, b, mat, postes = 4) {
  const g = [];
  for (let i = 0; i <= postes; i++) {
    const p = a.clone().lerp(b, i / postes);
    g.push(tuboEntre(p, p.clone().add(V(0, 1.1, 0)), 0.025, 0.004, mat, 'aco_estrutural', 'corrimão', 6));
  }
  g.push(tuboEntre(a.clone().add(V(0, 1.1, 0)), b.clone().add(V(0, 1.1, 0)), 0.025, 0.004, mat, 'aco_estrutural', 'corrimão', 6));
  g.push(tuboEntre(a.clone().add(V(0, 0.55, 0)), b.clone().add(V(0, 0.55, 0)), 0.02, 0.004, mat, 'aco_estrutural', 'corrimão', 6));
  return g;
}

// =====================================================================================
// PEÇAS
// qtd: [n, fonte, confiança, nota]   extras: [material, qtd por peça, fonte, confiança, nota]
// pesquisado: massa por peça (t) quando há dado; o BOM calibra a massa modelada por ela.
// =====================================================================================
export const PECAS = [
  // ------------------------------- FUNDAÇÃO -------------------------------
  {
    id: 'fundacao', nome: 'Fundação (radier + sapata anelar)', sistema: 'Fundação', sub: 'pier',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Transmite à rocha do cume o peso do telescópio (2.100 t), do pier e do domo giratório (~5.660 t).',
    descricao: 'Radier circular sob o pier e sapata anelar sob a parede do enclosure, assentados na rocha escavada em 2018–2019.',
    fabricacao: 'Concreto armado moldado in loco sobre rocha escavada a fogo e martelete.',
    fornecedor: 'Projeto IDOM; obra a contratar (2028).',
    curiosidade: 'A escavação em rocha dura da fundação terminou em 2019; o cume foi detonado e nivelado a partir de 2012.',
    taxa: 120,
    build() {
      return grupo(
        mk(setor({ ro: 13.5, y0: -5.6, y1: -2.6, seg: 64 }), M.concreto, 'concreto', 'radier'),
        mk(setor({ ri: 28.6, ro: 32.4, y0: -2.4, y1: -0.4, seg: 96 }), M.concreto, 'concreto', 'sapata anelar'),
      );
    },
  },
  {
    id: 'isolador', nome: 'Isolador sísmico (pêndulo de atrito)', sistema: 'Fundação', sub: 'pier',
    qtd: [24, 'enr', 'artigo'],
    funcao: 'Desacopla o pier do chão num terremoto: o telescópio "flutua" sobre pêndulos que deixam o solo andar até 700 mm por baixo.',
    descricao: 'Placa base, prato côncavo de aço usinado, deslizador articulado e placa superior. Fusíveis mantêm tudo rígido em operação normal.',
    fabricacao: 'Aço usinado com superfície côncava de baixo atrito; protótipo testado (Fernández et al., SPIE 2024).',
    fornecedor: 'Projeto IDOM.',
    curiosidade: 'Sem isolamento, as acelerações em M1 e M2 num sismo forte poderiam chegar a 3–5 g.',
    pesquisado: null,
    extras: [['parafuso', 16, 'calculo', 'estimado', '16 chumbadores por isolador (estimado).']],
    build() {
      return grupo(
        mk(setor({ ro: 0.85, y0: 0, y1: 0.12, seg: 32 }), M.cinzaEsc, 'aco_estrutural', 'placa base'),
        mk(setor({ ro: 0.75, ro1: 0.6, y0: 0.12, y1: 0.32, seg: 32 }), M.cinza, 'aco_usinado', 'prato côncavo'),
        mk(setor({ ro: 0.32, y0: 0.32, y1: 0.5, seg: 24 }), M.aluminio, 'aco_inox', 'deslizador'),
        mk(setor({ ro: 0.85, y0: 0.5, y1: 0.62, seg: 32 }), M.cinzaEsc, 'aco_estrutural', 'placa superior'),
      );
    },
  },
  {
    id: 'pier', nome: 'Pier de concreto', sistema: 'Fundação', sub: 'pier',
    qtd: [1, 'wiki', 'artigo'],
    funcao: 'Coluna oca de 22 m de diâmetro que leva o telescópio até o piso de observação, separada da estrutura do domo para não transmitir vibração.',
    descricao: 'Cilindro de concreto armado com portas de acesso na base e viga de coroamento onde o trilho de azimute é chumbado.',
    fabricacao: 'Concreto armado com insertos de aço embutidos para as chapas de base do trilho de azimute.',
    fornecedor: 'Projeto IDOM (pier + sistema de isolamento sísmico).',
    curiosidade: 'O pier não toca o piso do domo: uma junta o separa, para que o vento no domo não sacuda o telescópio.',
    taxa: 150,
    build() {
      const porta = 1.3 / 11;
      const g = grupo();
      for (let k = 0; k < 4; k++) {
        const c = Math.PI / 4 + (k * Math.PI) / 2;
        g.add(mk(setor({ ri: 9.5, ro: 11, y0: -2, y1: 2.6, a0: c + porta, a1: c + Math.PI / 2 - porta, seg: 16 }), M.concreto, 'concreto', 'base com portas'));
      }
      g.add(mk(setor({ ri: 9.5, ro: 11, y0: 2.6, y1: 11, seg: 64 }), M.concreto, 'concreto', 'fuste'));
      g.add(mk(setor({ ri: 9.0, ro: 11.3, y0: 11, y1: 12, seg: 64 }), M.concreto, 'concreto', 'viga de coroamento'));
      return g;
    },
  },
  {
    id: 'laje-terrea', nome: 'Laje térrea do enclosure', sistema: 'Fundação', sub: 'enclosure',
    qtd: [1, 'hms2024', 'oficial'],
    funcao: 'Piso dos laboratórios, sala de controle e área de carga no enclosure inferior, com junta sísmica em volta do pier.',
    descricao: 'Laje anular de concreto armado de 40 cm entre o pier e a parede externa.',
    fabricacao: 'Concreto armado moldado in loco.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'O vão entre laje e pier é o "fosso" que deixa o pier isolado se mover num terremoto.',
    taxa: 90,
    build() { return grupo(mk(setor({ ri: 11.8, ro: 29.9, y0: -0.4, y1: 0, seg: 96 }), M.concreto, 'concreto', 'laje')); },
  },
  {
    id: 'parede-inferior', nome: 'Parede do enclosure inferior (fixo)', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [1, 'hms2024', 'oficial'],
    funcao: 'Base fixa de ~12 m que carrega o trilho do domo giratório e abriga sala de controle, laboratórios e depósitos.',
    descricao: 'Parede anular de concreto armado com porta de acesso de cargas voltada para o sul.',
    fabricacao: 'Concreto armado moldado in loco.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Toda a operação noturna (sala de controle, servidores) fica aqui, abaixo da parte que gira.',
    taxa: 110,
    build() {
      const c = Math.PI / 2, d = 2.2 / 30.25;
      return grupo(
        mk(setor({ ri: 29.9, ro: 30.6, y0: 0, y1: 12, a0: c + d, a1: c - d + Math.PI * 2, seg: 96 }), M.concreto, 'concreto', 'parede'),
        mk(setor({ ri: 29.9, ro: 30.6, y0: 5, y1: 12, a0: c - d, a1: c + d, seg: 3 }), M.concreto, 'concreto', 'verga da porta'),
      );
    },
  },
  {
    id: 'piso-observacao', nome: 'Piso de observação', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [1, 'hms2024', 'oficial'],
    funcao: 'Piso no nível do topo do pier (12 m), por onde circulam pessoas e equipamentos em volta do telescópio.',
    descricao: 'Laje mista (concreto sobre forma de aço) apoiada em 48 vigas radiais de aço.',
    fabricacao: 'Steel deck + concreto; vigas I soldadas.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Tem alçapões para descer células de espelho até o térreo com a ponte rolante.',
    taxa: 100,
    build() {
      const vigas = [];
      for (let i = 0; i < 48; i++) vigas.push(mat4(Math.cos((i / 48) * Math.PI * 2) * 20.75, 11.35, Math.sin((i / 48) * Math.PI * 2) * 20.75, -(i / 48) * Math.PI * 2));
      return grupo(
        mk(setor({ ri: 11.6, ro: 29.9, y0: 11.75, y1: 12, seg: 96 }), M.concreto, 'concreto', 'laje'),
        inst(caixa(18.3, 0.8, 0.3), M.cinzaEsc, 'aco_estrutural', vigas, 'vigas radiais'),
      );
    },
  },

  // ------------------------------- MONTAGEM -------------------------------
  {
    id: 'trilho-azimute', nome: 'Segmento do trilho de azimute', sistema: 'Montagem', sub: 'azimute',
    qtd: [8, 'status2026', 'oficial'],
    funcao: 'Pista circular sobre a qual o telescópio inteiro gira em azimute, flutuando em mancais hidrostáticos.',
    descricao: 'Viga-caixão em arco de 45° com pistas axial e radial usinadas. O anel completo tem 21,5 m de diâmetro externo e 2,4 m de largura.',
    fabricacao: 'Soldado e usinado na maior fresadora pórtico da América do Norte (Ingersoll). Planicidade de 200 µm global e 20 µm local.',
    fornecedor: 'OHB Digital Connect (projeto) + Ingersoll Machine Tools (fabricação).',
    curiosidade: 'Em 2026, três segmentos já estavam aparafusados e alinhados para a usinagem final da pista.',
    pesquisado: { massa_t: 172 / 8, fonte: 'status2026', conf: 'oficial', nota: 'O anel inteiro pesa 172 t (8 segmentos).' },
    extras: [['parafuso', 96, 'calculo', 'estimado', 'Chumbadores e parafusos de emenda por segmento (estimado).']],
    build() {
      const a0 = -Math.PI / 8, a1 = Math.PI / 8, s = 12;
      return grupo(
        mk(setor({ ri: 8.35, ro: 10.75, y0: 0, y1: 0.1, a0, a1, seg: s }), M.cinzaEsc, 'aco_estrutural', 'mesa inferior'),
        mk(setor({ ri: 8.35, ro: 8.41, y0: 0.1, y1: 0.9, a0, a1, seg: s }), M.laranja, 'aco_estrutural', 'alma interna'),
        mk(setor({ ri: 9.52, ro: 9.58, y0: 0.1, y1: 0.9, a0, a1, seg: s }), M.laranja, 'aco_estrutural', 'alma central'),
        mk(setor({ ri: 10.69, ro: 10.75, y0: 0.1, y1: 0.9, a0, a1, seg: s }), M.laranja, 'aco_estrutural', 'alma externa'),
        mk(setor({ ri: 8.35, ro: 10.75, y0: 0.9, y1: 1.0, a0, a1, seg: s }), M.laranja, 'aco_usinado', 'mesa superior'),
        mk(setor({ ri: 9.0, ro: 10.2, y0: 1.0, y1: 1.04, a0, a1, seg: s }), M.aluminio, 'aco_usinado', 'pista usinada'),
      );
    },
  },
  {
    id: 'mancal-hidrostatico', nome: 'Mancal hidrostático (HBS)', sistema: 'Montagem', sub: 'azimute',
    qtd: [24, 'calculo', 'estimado', 'Quantidade não publicada; 24 sapatas é a ordem de grandeza para 2.100 t.'],
    funcao: 'Sapata que injeta óleo sob pressão e faz o telescópio flutuar num filme de ~50 µm: quase sem atrito, sem desgaste.',
    descricao: 'Sapata de aço usinado com bolsões de óleo, montada sob a estrutura de azimute sobre a pista do trilho.',
    fabricacao: 'Aço usinado; circuito hidráulico de alta pressão com recuperação de óleo.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'O filme de óleo tem a espessura de meio fio de cabelo e carrega duas mil toneladas.',
    extras: [['sensor', 2, 'calculo', 'estimado', 'Pressão e folga.']],
    build() {
      return grupo(
        mk(caixa(1.1, 0.32, 0.8, 0, 0.16, 0), M.aluminio, 'aco_usinado', 'sapata'),
        mk(caixa(1.3, 0.5, 1.0, 0, 0.57, 0), M.azul, 'aco_estrutural', 'corpo'),
      );
    },
  },
  {
    id: 'amortecedor-eds', nome: 'Amortecedor sísmico vertical (EDS)', sistema: 'Montagem', sub: 'azimute',
    qtd: [8, 'calculo', 'estimado', 'Sistema proprietário; quantidade estimada.'],
    funcao: 'Absorve as acelerações verticais de um sismo, que o isolamento do pier (só lateral) deixa passar.',
    descricao: 'Unidade de amortecimento incorporada à estrutura de azimute, com caminho de carga pela pista do trilho.',
    fabricacao: 'Sistema proprietário (Earthquake Damping System).', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'O mesmo trilho é o caminho de carga do EDS nas posições sísmica, de frenagem e de estacionamento.',
    build() {
      return grupo(
        mk(setor({ ro: 0.3, y0: 0.08, y1: 1.08, seg: 24 }), M.amarelo, 'aco_usinado', 'cilindro'),
        mk(caixa(0.9, 0.08, 0.9, 0, 0.04, 0), M.cinzaEsc, 'aco_estrutural', 'base'),
        mk(caixa(0.9, 0.08, 0.9, 0, 1.12, 0), M.cinzaEsc, 'aco_estrutural', 'topo'),
      );
    },
  },
  {
    id: 'motor-azimute', nome: 'Motor linear de azimute (forçador)', sistema: 'Montagem', sub: 'azimute',
    qtd: [16, 'calculo', 'estimado', 'Acionamento direto: número de forçadores estimado.'],
    funcao: 'Gira o telescópio por acionamento direto: ímãs no trilho e bobinas na parte que gira, sem engrenagens nem folgas.',
    descricao: 'Forçador de bobinas que trabalha sobre a fita de ímãs do trilho; leitura de posição por fita de encoder.',
    fabricacao: 'Motor linear de ímã permanente.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Sem engrenagem, não há folga: o apontamento é limitado pelo encoder e pelo controle.',
    extras: [['motor', 1, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(caixa(1.6, 0.4, 0.5, 0, 0.2, 0), M.cinzaEsc, 'aco_estrutural', 'carcaça'),
        mk(caixa(1.4, 0.18, 0.45, 0, -0.09, 0), M.cobre, 'cobre', 'bobinas'),
      );
    },
  },
  {
    id: 'disco-azimute', nome: 'Disco de azimute (plataforma giratória)', sistema: 'Montagem', sub: 'azimute',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'A plataforma que gira com o telescópio e carrega os berços dos C-rings, a estação de gravidade invariante (G-CLEF) e as plataformas de acesso.',
    descricao: 'Grande disco celular de chapas soldadas (convés, fundo, 16 almas radiais e saias interna e externa).',
    fabricacao: 'Grandes peças soldadas na Ingersoll (Rockford, EUA); em 2026 as soldagens do disco estavam prontas.',
    fornecedor: 'OHB Digital Connect + Ingersoll Machine Tools.',
    curiosidade: 'Nas renderizações do GMT, é o anel verde e laranja com convés claro sob os espelhos (ref. 1).',
    build() {
      const almas = [];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; almas.push(mat4(Math.cos(a) * 7.7, 0.9, Math.sin(a) * 7.7, -a)); }
      return grupo(
        mk(setor({ ri: 4.2, ro: 11.2, y0: 1.775, y1: 1.8, seg: 64 }), M.creme, 'aco_estrutural', 'convés'),
        mk(setor({ ri: 4.2, ro: 11.0, y0: 0, y1: 0.025, seg: 64 }), M.cinzaEsc, 'aco_estrutural', 'fundo'),
        inst(caixa(6.8, 1.75, 0.04), M.cinzaEsc, 'aco_estrutural', almas, 'almas radiais'),
        mk(setor({ ri: 11.15, ro: 11.2, y0: 0, y1: 1.8, seg: 64 }), M.verde, 'aco_estrutural', 'saia externa'),
        mk(setor({ ri: 4.2, ro: 4.25, y0: 0, y1: 1.8, seg: 48 }), M.cinzaEsc, 'aco_estrutural', 'saia interna'),
        mk(setor({ ri: 10.9, ro: 11.25, y0: 1.8, y1: 1.9, seg: 64 }), M.laranja, 'aco_estrutural', 'borda'),
      );
    },
  },
  {
    id: 'berco-c-ring', nome: 'Berço dos C-rings (mancal de elevação)', sistema: 'Montagem', sub: 'montagem',
    qtd: [2, 'overview2016', 'artigo'],
    funcao: 'Apoia cada C-ring em mancais hidrostáticos e deixa o tubo do telescópio rolar em elevação.',
    descricao: 'Caixão de chapas soldadas sobre o disco de azimute com duas sapatas curvas de mancal no topo.',
    fabricacao: 'Chapas soldadas e sapatas usinadas.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Com C-rings em vez de munhões, a carga entra perto do chão e a estrutura fica mais baixa e rígida.',
    build() {
      const diafr = [-3, -1.5, 0, 1.5, 3].map((z) => mat4(0, 0.9, z));
      return grupo(
        mk(caixa(0.05, 1.8, 7, -0.95, 0.9, 0), M.azul, 'aco_estrutural', 'chapa lateral'),
        mk(caixa(0.05, 1.8, 7, 0.95, 0.9, 0), M.azul, 'aco_estrutural', 'chapa lateral'),
        mk(caixa(2, 0.06, 7, 0, 1.77, 0), M.azul, 'aco_estrutural', 'mesa'),
        mk(caixa(2, 0.05, 7, 0, 0.025, 0), M.azul, 'aco_estrutural', 'base'),
        inst(caixa(1.85, 1.7, 0.04), M.azul, 'aco_estrutural', diafr, 'diafragmas'),
        mk(caixa(1.2, 0.2, 1.4, 0, 1.9, -2.2), M.aluminio, 'aco_usinado', 'sapata'),
        mk(caixa(1.2, 0.2, 1.4, 0, 1.9, 2.2), M.aluminio, 'aco_usinado', 'sapata'),
      );
    },
  },
  {
    id: 'c-ring', nome: 'C-ring de elevação', sistema: 'Montagem', sub: 'montagem',
    qtd: [2, 'overview2016', 'artigo'],
    funcao: 'Arcos gigantes que rolam sobre os berços: são o "eixo" de elevação do telescópio, levando-o de 25° a 90°.',
    descricao: 'Viga-caixão curva de raio 9,5 m (mesas interna e externa e duas almas), abraçando a parte de baixo da estrutura óptica.',
    fabricacao: 'Segmentos soldados e usinados na face de rolamento.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'É o mesmo conceito dos C-rings do Magellan, só que com 19 m de diâmetro.',
    build() {
      const a0 = 75 * DEG, a1 = 285 * DEG, s = 40;
      const pecas = [
        ['mesa externa', { ri: 9.4, ro: 9.5, y0: -0.4, y1: 0.4 }, 'aco_usinado'],
        ['mesa interna', { ri: 8.5, ro: 8.6, y0: -0.4, y1: 0.4 }, 'aco_estrutural'],
        ['alma', { ri: 8.6, ro: 9.4, y0: -0.4, y1: -0.35 }, 'aco_estrutural'],
        ['alma', { ri: 8.6, ro: 9.4, y0: 0.35, y1: 0.4 }, 'aco_estrutural'],
      ];
      return grupo(pecas.map(([n, o, q]) => {
        const g = setor({ ...o, a0, a1, seg: s });
        g.rotateZ(Math.PI / 2);
        return mk(g, M.azul, q, n);
      }));
    },
  },
  {
    id: 'oss', nome: 'Estrutura de suporte óptico (OSS)', sistema: 'Montagem', sub: 'montagem',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'O "berço" principal que liga as sete células de espelho aos C-rings e à torre do secundário, girando em elevação.',
    descricao: 'Anel hexagonal e vigas radiais tubulares sob as células, com escoras até os C-rings.',
    fabricacao: 'Tubos e nós soldados.', fornecedor: 'OHB Digital Connect + Ingersoll Machine Tools.',
    curiosidade: 'As próprias células dos espelhos são estruturais e dão parte da rigidez do conjunto.',
    build() {
      const y = G.M1_Z - 4.1, a = G.A_OFF, t = [];
      const P = (k) => V(a * Math.cos(k * Math.PI / 3), y, a * Math.sin(k * Math.PI / 3));
      for (let k = 0; k < 6; k++) {
        t.push(tuboEntre(P(k), P(k + 1), 0.55, 0.03, M.azul, 'aco_estrutural', 'anel hexagonal', 12));
        t.push(tuboEntre(V(0, y, 0), P(k), 0.45, 0.03, M.azul, 'aco_estrutural', 'vigas radiais', 12));
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const topo = V(sx * G.X_CRING, 2.2, sz * 9.0);
        t.push(tuboEntre(topo, V(sx * a * 0.5, y, sz * a * 0.866), 0.4, 0.025, M.azul, 'aco_estrutural', 'escoras', 12));
        const baixo = V(sx * G.X_CRING, -4.5, sz * 7.8);
        t.push(tuboEntre(baixo, V(sx * a * 0.5, y, sz * a * 0.866), 0.4, 0.025, M.azul, 'aco_estrutural', 'escoras', 12));
        t.push(tuboEntre(V(sx * G.X_CRING, -8.5, 0), V(0, y, 0), 0.45, 0.025, M.azul, 'aco_estrutural', 'escoras centrais', 12));
      }
      return grupo(t);
    },
  },
  {
    id: 'celula-offaxis', nome: 'Célula do espelho off-axis', sistema: 'Montagem', sub: 'celulas',
    qtd: [6, 'sef2026', 'oficial'],
    funcao: 'Caixa estrutural que segura um segmento de 8,4 m, com 160 atuadores, 6 hardpoints e ventilação que mantém o vidro na temperatura do ar.',
    descricao: 'Caixão de 12 lados em chapas soldadas, com nervuras radiais. A "solda da célula" (ref. 5) une a casca externa ao fundo.',
    fabricacao: 'Chapas de aço soldadas; o protótipo (Test Cell) foi testado com o segmento S3 em 2025.',
    fornecedor: 'Projeto GMTO / Univ. do Arizona (célula de teste).',
    curiosidade: 'A célula é retirada inteira com o espelho para realuminizar no prédio de apoio.',
    extras: [['parafuso', 400, 'calculo', 'estimado', 'Ligações aparafusadas à OSS e ao anel de suporte.']],
    build: (d) => celula(false, d),
  },
  {
    id: 'celula-central', nome: 'Célula do espelho central', sistema: 'Montagem', sub: 'celulas',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Igual às off-axis, mas com uma abertura no centro por onde a luz desce até o foco Gregoriano e os instrumentos.',
    descricao: 'Caixão de 12 lados com furo central e base para o cone defletor.',
    fabricacao: 'Chapas de aço soldadas.', fornecedor: 'Projeto GMTO.',
    curiosidade: 'Sob ela fica o rotador de instrumentos Gregorianos (GIR).',
    extras: [['parafuso', 400, 'calculo', 'estimado']],
    build: (d) => celula(true, d),
  },
  {
    id: 'atuador-m1', nome: 'Atuador de suporte do M1', sistema: 'Óptica', sub: 'celulas',
    qtd: [7 * 160, 'm1cell', 'artigo', '160 por célula (célula de teste) × 7.'],
    funcao: 'Empurra o fundo do espelho com força controlada (pneumática, em 1 ou 3 eixos) para sustentar 17 t sem deformar a superfície.',
    descricao: 'Cilindro pneumático com célula de carga, acoplado ao favo de mel por placas coladas no vidro.',
    fabricacao: 'Atuadores de 1 e 3 eixos; calibrados num hexápode de teste.', fornecedor: 'Univ. do Arizona / GMTO.',
    curiosidade: 'Óptica ativa: os atuadores também corrigem a forma do espelho em baixa ordem, várias vezes por minuto.',
    extras: [['atuador', 1, 'm1cell', 'artigo'], ['sensor', 1, 'calculo', 'estimado', 'Célula de carga.']],
    build() {
      return grupo(
        mk(caixa(0.2, 0.03, 0.2, 0, 0.015, 0), M.cinzaEsc, 'aco_estrutural', 'base'),
        mk(setor({ ro: 0.07, y0: 0.03, y1: 0.58, seg: 16 }), M.aluminio, 'aco_inox', 'cilindro'),
        mk(setor({ ro: 0.045, y0: 0.58, y1: 0.7, seg: 12 }), M.cinza, 'aco_inox', 'haste'),
      );
    },
  },
  {
    id: 'hardpoint', nome: 'Hardpoint (atuador de posição)', sistema: 'Óptica', sub: 'celulas',
    qtd: [42, 'status2026', 'oficial', '6 por segmento × 7.'],
    funcao: 'Seis escoras rígidas por espelho que fixam sua posição nos 6 graus de liberdade (como um hexápode).',
    descricao: 'Atuador linear de alta rigidez com rótulas nas pontas e célula de carga de segurança.',
    fabricacao: 'Atuador linear de precisão.', fornecedor: 'GMTO / Univ. do Arizona.',
    curiosidade: 'Se a força num hardpoint passa do limite, ele cede para proteger o vidro.',
    extras: [['atuador', 1, 'status2026', 'oficial']],
    build() {
      return grupo(
        tuboEntre(V(0, 0.1, 0), V(0, 1.2, 0), 0.06, 0.012, M.cinza, 'aco_inox', 'corpo', 12),
        mk(setor({ ro: 0.1, y0: 0, y1: 0.1, seg: 16 }), M.cinzaEsc, 'aco_estrutural', 'rótula'),
        mk(setor({ ro: 0.1, y0: 1.2, y1: 1.3, seg: 16 }), M.cinzaEsc, 'aco_estrutural', 'rótula'),
      );
    },
  },
  {
    id: 'ventilador', nome: 'Unidade de ventilação térmica do M1', sistema: 'Óptica', sub: 'celulas',
    qtd: [84, 'calculo', 'estimado', '12 por célula (estimado).'],
    funcao: 'Sopra ar no interior do favo de mel para o vidro acompanhar a temperatura do ar e não criar "mirror seeing".',
    descricao: 'Ventilador com trocador de calor, montado no fundo da célula.',
    fabricacao: 'Ventilador + trocador refrigerado.', fornecedor: 'GMTO.',
    curiosidade: 'O teste de 2025 mostrou que reduzir a vibração desses ventiladores era um dos riscos do projeto.',
    extras: [['motor', 1, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(caixa(0.6, 0.8, 0.6, 0, 0.4, 0), M.aluminio, 'aluminio', 'caixa'),
        mk(setor({ ro: 0.24, y0: 0.8, y1: 0.86, seg: 20 }), M.cinzaEsc, 'aco_estrutural', 'grade'),
      );
    },
  },

  // ------------------------------- ÓPTICA -------------------------------
  {
    id: 'segmento-m1-offaxis', nome: 'Segmento off-axis do M1', sistema: 'Óptica', sub: 'm1',
    qtd: [6, 'sef2026', 'oficial'],
    funcao: 'Um dos seis espelhos de 8,4 m em volta do central. Juntos, os sete formam um espelho parabólico de 25,4 m, f/0,71.',
    descricao: 'Vidro borossilicato em favo de mel (face de ~28 mm, fundo de ~25 mm, nervuras hexagonais). A superfície é um pedaço fora do eixo de uma parábola, portanto assimétrica.',
    fabricacao: 'Fundido por rotação no forno do Richard F. Caris Mirror Lab (Arizona); geração e polimento levam anos. Erro de superfície do S1: 19 nm rms.',
    fornecedor: 'Richard F. Caris Mirror Lab, Univ. do Arizona.',
    curiosidade: 'O 1º segmento foi fundido em 2005 e o 7º em 2023. Em 2026, três estavam prontos.',
    pesquisado: { massa_t: 17, fonte: 'wiki', conf: 'estimado', nota: 'Entram 20 t de vidro no forno (SPIE 2016); parte é removida na usinagem. Wikipedia diz 18 t.' },
    extras: [['aluminizacao', Math.PI * (8.417 / 2) ** 2, 'calculo', 'estimado', 'Área da face aluminizada.']],
    build: (d) => segmentoM1(G.A_OFF, 0, d),
  },
  {
    id: 'segmento-m1-central', nome: 'Segmento central do M1', sistema: 'Óptica', sub: 'm1',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'O espelho do meio, simétrico, com um furo central por onde a luz refletida pelo secundário desce até os instrumentos.',
    descricao: 'Mesmo favo de mel de vidro E6, superfície no eixo da parábola, com furo central.',
    fabricacao: 'Fundido por rotação no Caris Mirror Lab.', fornecedor: 'Richard F. Caris Mirror Lab, Univ. do Arizona.',
    curiosidade: 'O furo central tem raio estimado de 0,6 m (premissa do modelo).',
    pesquisado: { massa_t: 17, fonte: 'wiki', conf: 'estimado', nota: 'Mesma massa nominal dos off-axis.' },
    extras: [['aluminizacao', Math.PI * ((8.417 / 2) ** 2 - 0.36), 'calculo', 'estimado']],
    build: (d) => segmentoM1(0, G.FURO, d),
  },
  {
    id: 'capa-petala', nome: 'Pétala da capa protetora do M1', sistema: 'Óptica', sub: 'capas',
    qtd: [42, 'calculo', 'estimado', '6 pétalas por segmento (estimado a partir da ref. 5).'],
    funcao: 'Fecha sobre o espelho durante o dia e em manutenção, protegendo a aluminização de poeira e de objetos caídos.',
    descricao: 'Painel trapezoidal leve de alumínio articulado na borda da célula.',
    fabricacao: 'Painel sanduíche de alumínio com dobradiça motorizada.', fornecedor: 'OHB/Ingersoll (escopo da montagem).',
    curiosidade: 'As capas do primário fazem parte do escopo da montagem, junto com o defletor cônico.',
    extras: [['motor', 1, 'calculo', 'estimado']],
    build() {
      const p = prisma([[-2.15, 0], [2.15, 0], [0.3, -3.45], [-0.3, -3.45]], 0, 0.06);
      const dob = new THREE.CylinderGeometry(0.06, 0.06, 4.3, 10); dob.rotateZ(Math.PI / 2);
      return grupo(mk(p, M.aluminio, 'aluminio', 'painel'), mk(dob, M.cinzaEsc, 'aco_estrutural', 'dobradiça'));
    },
  },
  {
    id: 'cone-defletor', nome: 'Cone defletor do M1', sistema: 'Óptica', sub: 'capas',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'Tubo sobre o furo central que bloqueia luz espúria do céu de chegar direto aos instrumentos.',
    descricao: 'Tronco de cone de chapa fina enrijecido por anéis (o cilindro amarelo no centro da ref. 1).',
    fabricacao: 'Chapa de alumínio calandrada.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Nas renderizações oficiais ele aparece amarelo, no meio do segmento central.',
    build() {
      return grupo(
        mk(setor({ ri: 0.62, ro: 0.64, ri1: 0.85, ro1: 0.87, y0: 0, y1: 3.2, seg: 32 }), M.amarelo, 'aluminio', 'cone'),
        mk(setor({ ri: 0.64, ro: 0.72, y0: 0, y1: 0.08, seg: 32 }), M.cinzaEsc, 'aco_estrutural', 'flange'),
        mk(setor({ ri: 0.87, ro: 0.95, y0: 3.12, y1: 3.2, seg: 32 }), M.cinzaEsc, 'aco_estrutural', 'anel'),
      );
    },
  },
  {
    id: 'perna-torre', nome: 'Perna da torre do secundário', sistema: 'Montagem', sub: 'torre',
    qtd: [6, 'calculo', 'estimado', 'Leitura das refs. 1 e 4 (tripé duplo).'],
    funcao: 'Segura o secundário a 20 m acima do primário. Tem de ser rígida para o vento não sacudir o espelho, e fina para não fazer sombra.',
    descricao: 'Tubo de aço de grande diâmetro, ligado por nós fundidos à OSS e ao anel do topo.',
    fabricacao: 'Tubo calandrado e soldado.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'É a parte mais exposta ao vento: um mícron de deslocamento do M2 já vira ~0,02″ de erro de apontamento (estimado).',
    build(d, o = {}) {
      const L = o.L ?? 23;
      return grupo(tuboEntre(V(0, 0, 0), V(0, L, 0), 0.45, 0.025, M.branco, 'aco_estrutural', 'tubo', 16));
    },
  },
  {
    id: 'no-trelica', nome: 'Nó da treliça', sistema: 'Montagem', sub: 'torre',
    qtd: [12, 'calculo', 'estimado', 'Um em cada ponta das 6 pernas.'],
    funcao: 'Peça fundida onde as pernas encontram a estrutura: distribui as forças sem concentrar tensão nas soldas.',
    descricao: 'Nó de aço fundido com tocos de ligação.', fabricacao: 'Aço fundido usinado.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Nós fundidos evitam soldas complexas em pontos de alta fadiga.',
    extras: [['parafuso', 48, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(new THREE.IcosahedronGeometry(0.7, 1), M.cinza, 'aco_estrutural', 'núcleo'),
        tuboEntre(V(0, 0, 0), V(0, 1.2, 0), 0.5, 0.05, M.cinza, 'aco_estrutural', 'toco', 12),
      );
    },
  },
  {
    id: 'travamento-torre', nome: 'Travamento da torre', sistema: 'Montagem', sub: 'torre',
    qtd: [6, 'calculo', 'estimado'],
    funcao: 'Liga as pernas na altura média e aumenta a frequência natural da torre.',
    descricao: 'Tubo leve entre pernas vizinhas.', fabricacao: 'Tubo de aço soldado.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Quanto maior a frequência natural, menos o vento consegue fazer a torre vibrar.',
    build(d, o = {}) { return grupo(tuboEntre(V(0, 0, 0), V(0, o.L ?? 8, 0), 0.18, 0.012, M.branco, 'aco_estrutural', 'tubo', 12)); },
  },
  {
    id: 'anel-top-end', nome: 'Anel do topo (top end)', sistema: 'Montagem', sub: 'torre',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'Estrutura no alto da torre que segura os sete segmentos do secundário (adaptativo ou de apontamento rápido).',
    descricao: 'Caixão hexagonal com vigas transversais, onde se fixam os hexápodes do M2.',
    fabricacao: 'Chapas soldadas e usinadas.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'O conjunto inteiro do topo pode ser trocado: ASM para óptica adaptativa ou FSM para comissionamento.',
    build() {
      return grupo(
        mk(setor({ ri: 2.95, ro: 3.0, y0: 0, y1: 1.2, seg: 6, plano: true }), M.branco, 'aco_estrutural', 'parede externa'),
        mk(setor({ ri: 2.4, ro: 2.45, y0: 0, y1: 1.2, seg: 6, plano: true }), M.branco, 'aco_estrutural', 'parede interna'),
        mk(setor({ ri: 2.4, ro: 3.0, y0: 1.16, y1: 1.2, seg: 6, plano: true }), M.branco, 'aco_estrutural', 'mesa'),
        mk(setor({ ri: 2.4, ro: 3.0, y0: 0, y1: 0.04, seg: 6, plano: true }), M.branco, 'aco_estrutural', 'mesa'),
        mk(caixa(4.8, 0.4, 0.3, 0, 1.0, 0), M.branco, 'aco_estrutural', 'viga'),
        mk(caixa(0.3, 0.4, 4.8, 0, 1.0, 0), M.branco, 'aco_estrutural', 'viga'),
      );
    },
  },
  {
    id: 'hexapode-m2', nome: 'Hexápode posicionador do M2', sistema: 'Óptica', sub: 'asm',
    qtd: [7, 'status2026', 'oficial'],
    funcao: 'Posiciona cada segmento do secundário em 6 graus de liberdade (até 7 Hz), compensando flexões por gravidade e temperatura.',
    descricao: 'Plataforma de Stewart: duas placas e seis atuadores lineares.',
    fabricacao: 'Atuadores lineares de precisão.', fornecedor: 'AdOptica / GMTO.',
    curiosidade: 'No banco de testes de fase, o hexápode também injeta perturbações de vento de propósito.',
    extras: [['atuador', 6, 'status2026', 'oficial']],
    build() {
      const t = [];
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3, b = a + (k % 2 ? 1 : -1) * 0.6;
        t.push(tuboEntre(V(0.42 * Math.cos(a), 0.05, 0.42 * Math.sin(a)), V(0.32 * Math.cos(b), 0.75, 0.32 * Math.sin(b)), 0.035, 0.008, M.cinza, 'aco_inox', 'atuadores', 8));
      }
      return grupo(
        mk(setor({ ro: 0.5, y0: 0, y1: 0.05, seg: 24 }), M.cinzaEsc, 'aco_estrutural', 'placa base'),
        mk(setor({ ro: 0.4, y0: 0.75, y1: 0.8, seg: 24 }), M.cinzaEsc, 'aco_estrutural', 'placa móvel'),
        t,
      );
    },
  },
  {
    id: 'segmento-asm', nome: 'Segmento do secundário adaptativo (ASM)', sistema: 'Óptica', sub: 'asm',
    qtd: [7, 'asm2021', 'oficial'],
    funcao: 'Casca de vidro de 2 mm que se deforma 2.000 vezes por segundo, empurrada por 675 bobinas, para desfazer a turbulência da atmosfera.',
    descricao: 'Casca fina de Zerodur (1,05 m, 2 mm) flutuando a dezenas de mícrons de um corpo de referência de Zerodur, com 675 atuadores de bobina (sem contato) e sensores capacitivos; placa fria de alumínio atrás.',
    fabricacao: 'Bloco Schott de ~100 mm desbastado e polido pela Safran-Reosc até 2 mm (98% removido). Montagem final na AdOptica (Itália).',
    fornecedor: 'AdOptica (Itália), Safran-Reosc (França), Schott (Alemanha).',
    curiosidade: 'É a 4ª geração de secundários adaptativos e a primeira fora do eixo.',
    extras: [['atuador', 675, 'asm2021', 'oficial', 'Bobinas de voz (voice coil).'], ['sensor', 675, 'asm2021', 'oficial', 'Sensores capacitivos.'], ['cabo', 40, 'calculo', 'estimado']],
    build(d) {
      const g = grupo(
        mk(setor({ ro: 0.525, y0: 0, y1: 0.002, seg: 48 }), M.espelho, 'zerodur', 'casca fina'),
        mk(setor({ ro: 0.525, y0: 0.006, y1: 0.106, seg: 48 }), M.zerodur, 'zerodur', 'corpo de referência'),
        mk(setor({ ro: 0.55, y0: 0.11, y1: 0.19, seg: 48 }), M.aluminio, 'aluminio', 'placa fria'),
        mk(setor({ ri: 0.56, ro: 0.6, y0: 0, y1: 0.6, seg: 48 }), M.cinzaEsc, 'aco_estrutural', 'carcaça'),
      );
      if (d) {
        const ms = [];
        const passo = 1.05 / Math.sqrt((675 * 4) / Math.PI);
        for (let x = -0.5; x <= 0.5; x += passo) for (let z = -0.5; z <= 0.5; z += passo) if (x * x + z * z < 0.5 * 0.5) ms.push(mat4(x, 0.03, z));
        const b = inst(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6).translate(0, 0.09, 0), M.cobre, null, ms, 'atuadores (bobinas)');
        g.add(b);
      }
      return g;
    },
  },

  // ------------------------------- INSTRUMENTAÇÃO -------------------------------
  {
    id: 'gir', nome: 'Rotador de instrumentos Gregorianos (GIR)', sistema: 'Instrumentação', sub: 'instrumentos',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'Gira os instrumentos para compensar a rotação do campo enquanto o telescópio acompanha o céu.',
    descricao: 'Cilindro oco sob o espelho central, com rolamento de grande diâmetro. Carrega 3 instrumentos Gregorianos diretos (2 grandes e 1 pequeno) e 3 de porta dobrada.',
    fabricacao: 'Estrutura soldada com rolamento usinado.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'Os instrumentos no GIR sentem a gravidade mudar em duas direções; por isso o G-CLEF fica fora dele.',
    extras: [['motor', 4, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(setor({ ri: 3.75, ro: 3.8, y0: 0, y1: 3.6, seg: 48 }), M.azul, 'aco_estrutural', 'parede externa'),
        mk(setor({ ri: 1.2, ro: 1.25, y0: 0, y1: 3.6, seg: 32 }), M.azul, 'aco_estrutural', 'parede interna'),
        mk(setor({ ri: 1.2, ro: 3.8, y0: 3.55, y1: 3.6, seg: 48 }), M.azul, 'aco_estrutural', 'mesa superior'),
        mk(setor({ ri: 1.2, ro: 3.8, y0: 0, y1: 0.05, seg: 48 }), M.azul, 'aco_estrutural', 'mesa inferior'),
        mk(setor({ ri: 3.4, ro: 3.85, y0: 3.6, y1: 3.9, seg: 48 }), M.aluminio, 'aco_usinado', 'rolamento'),
      );
    },
  },
  {
    id: 'instrumento-dg', nome: 'Instrumento Gregoriano direto (DG)', sistema: 'Instrumentação', sub: 'instrumentos',
    qtd: [3, 'status2026', 'oficial', 'Duas posições grandes e uma pequena no GIR (ex.: GMTIFS, GMTNIRS, ComCam).'],
    funcao: 'Recebe a luz depois de só duas reflexões (M1 e M2), com a máxima eficiência: imageadores e espectrógrafos infravermelhos.',
    descricao: 'Caixa estrutural com criostato a vácuo; representação genérica do volume alocado.',
    fabricacao: 'Estrutura de alumínio e criostato de inox.', fornecedor: 'ANU (GMTIFS), UT Austin + KASI (GMTNIRS), GMTO (ComCam).',
    curiosidade: 'O GMTNIRS cobre de 1 a 5 µm numa única exposição, recorde de "alcance espectral".',
    extras: [['componentes', 1, 'calculo', 'estimado', 'Ótica, detectores e eletrônica.']],
    build() { return instrumento(2.6, 3.2, 2.6, M.branco); },
  },
  {
    id: 'instrumento-fp', nome: 'Instrumento de porta dobrada (FP)', sistema: 'Instrumentação', sub: 'instrumentos',
    qtd: [3, 'status2026', 'oficial'],
    funcao: 'Posições sobre o GIR alimentadas por um espelho dobrável: MANIFEST, GMagAO-X e corretores de campo.',
    descricao: 'Volume alocado idêntico para os três FPs.', fabricacao: 'Estrutura de alumínio.', fornecedor: 'Vários (consórcio).',
    curiosidade: 'O GMagAO-X usa um espelho deformável por segmento para estudar exoplanetas em luz refletida.',
    extras: [['componentes', 1, 'calculo', 'estimado']],
    build() { return instrumento(1.6, 2.0, 2.0, M.verdeInstr); },
  },
  {
    id: 'gclef', nome: 'Espectrógrafo G-CLEF (estação GIS)', sistema: 'Instrumentação', sub: 'instrumentos',
    qtd: [1, 'status2026', 'oficial'],
    funcao: 'Espectrógrafo de altíssima estabilidade para medir velocidades radiais de estrelas e achar planetas como a Terra.',
    descricao: 'Câmara de vácuo cilíndrica dentro de um invólucro térmico, na estação de gravidade invariante sobre o disco de azimute, alimentado por fibras.',
    fabricacao: 'Câmara de vácuo concluída; ótica principal adquirida (2026).', fornecedor: 'Harvard & Smithsonian Center for Astrophysics.',
    curiosidade: 'Vai estrear antes num dos telescópios Magellan, ao lado do GMT.',
    extras: [['componentes', 1, 'status2026', 'oficial']],
    build() {
      const cil = setor({ ri: 1.45, ro: 1.5, y0: -3, y1: 3, seg: 32 }); cil.rotateZ(Math.PI / 2); cil.translate(0, 1.9, 0);
      return grupo(
        mk(cil, M.aluminio, 'aco_inox', 'câmara de vácuo'),
        ...painel6(7, 4, 4, 0, 2, 0, M.verdeInstr, 0.015, 'aluminio', 'invólucro térmico'),
      );
    },
  },
  {
    id: 'plataforma-instrumento', nome: 'Plataforma de instrumentos', sistema: 'Instrumentação', sub: 'plataformas',
    qtd: [2, 'status2026', 'oficial', 'IP e GIS.'],
    funcao: 'Plataforma no disco de azimute para instrumentos e equipamentos que não giram em elevação.',
    descricao: 'Grade de piso sobre pilares tubulares com guarda-corpo.', fabricacao: 'Aço galvanizado.', fornecedor: 'OHB/Ingersoll.',
    curiosidade: 'O GMT pode ter até 10 instrumentos montados ao mesmo tempo.',
    build() {
      const p = [];
      for (const x of [-2.8, 2.8]) for (const z of [-2.3, 2.3]) p.push(tuboEntre(V(x, 0, z), V(x, 2.4, z), 0.12, 0.008, M.amarelo, 'aco_estrutural', 'pilares', 10));
      return grupo(mk(caixa(6, 0.08, 5, 0, 2.44, 0), M.grade, 'aco_estrutural', 'piso'), p, corrimao(V(-3, 2.48, 2.5), V(3, 2.48, 2.5), M.amarelo, 4));
    },
  },
  {
    id: 'escada', nome: 'Escada metálica', sistema: 'Montagem', sub: 'plataformas',
    qtd: [30, 'calculo', 'estimado', 'Lances de 3 m, contados no modelo.'],
    funcao: 'Acesso de manutenção às células, ao GIR e às plataformas (ref. 1 e 4).',
    descricao: 'Lance de 3 m de altura com longarinas, degraus de grade e corrimãos.', fabricacao: 'Aço galvanizado pintado.', fornecedor: '—',
    curiosidade: 'As passarelas e escadas amarelas dão a escala humana nas renderizações do GMT.',
    build() {
      const deg = [];
      for (let i = 0; i < 15; i++) deg.push(mat4(0, (i + 1) * 0.2, (i + 0.5) * 0.3));
      const lad = (x) => { const m = mk(caixa(0.02, 0.3, 5.41), M.amarelo, 'aco_estrutural', 'longarina'); m.position.set(x, 1.5, 2.25); m.rotation.x = -Math.atan2(3, 4.5); return m; };
      return grupo(lad(-0.5), lad(0.5), inst(caixa(1.0, 0.03, 0.26), M.grade, 'aco_estrutural', deg, 'degraus'),
        corrimao(V(-0.5, 0, 0), V(-0.5, 3, 4.5), M.amarelo, 3), corrimao(V(0.5, 0, 0), V(0.5, 3, 4.5), M.amarelo, 3));
    },
  },
  {
    id: 'patamar', nome: 'Patamar de escada', sistema: 'Montagem', sub: 'plataformas',
    qtd: [40, 'calculo', 'estimado', 'Contados no modelo 3D.'],
    funcao: 'Descanso entre lances e ligação das escadas com os anéis de passarela do domo.',
    descricao: 'Plataforma de grade de 1,2 × 1,2 m sobre perfis; os patamares de chegada são esticados até o anel.', fabricacao: 'Aço galvanizado.', fornecedor: '—',
    curiosidade: 'Normas de segurança limitam a altura de um lance (aqui, até 3 m) e exigem um patamar entre lances.',
    build() {
      return grupo(
        mk(caixa(1.2, 0.06, 1.2, 0, 0, 0), M.grade, 'aco_estrutural', 'piso'),
        mk(caixa(1.2, 0.2, 0.08, 0, -0.13, -0.56), M.amarelo, 'aco_estrutural', 'perfil'),
        mk(caixa(1.2, 0.2, 0.08, 0, -0.13, 0.56), M.amarelo, 'aco_estrutural', 'perfil'),
      );
    },
  },
  {
    id: 'passarela', nome: 'Passarela com guarda-corpo (6 m)', sistema: 'Enclosure', sub: 'plataformas',
    qtd: [140, 'calculo', 'estimado', 'Módulos de 6 m nas plataformas e nos três anéis internos do domo.'],
    funcao: 'Caminhos de serviço em volta do telescópio e nas paredes do domo (ref. 4, com pessoas nas passarelas).',
    descricao: 'Piso de grade de 1,2 m sobre perfis, com guarda-corpo de 1,1 m.', fabricacao: 'Aço galvanizado.', fornecedor: '—',
    curiosidade: 'Depois do FDR, o projeto revisou passarelas e plataformas do domo para facilitar a manutenção.',
    build() {
      return grupo(
        mk(caixa(6, 0.06, 1.2, 0, 0, 0), M.grade, 'aco_estrutural', 'piso'),
        mk(caixa(6, 0.2, 0.08, 0, -0.13, -0.56), M.amarelo, 'aco_estrutural', 'perfil'),
        mk(caixa(6, 0.2, 0.08, 0, -0.13, 0.56), M.amarelo, 'aco_estrutural', 'perfil'),
        corrimao(V(-3, 0.03, 0.58), V(3, 0.03, 0.58), M.amarelo, 3),
      );
    },
  },
  {
    id: 'lancador-lgs', nome: 'Lançador de laser (LGS)', sistema: 'Instrumentação', sub: 'lgs',
    qtd: [6, 'lgsf2013', 'artigo'],
    funcao: 'Dispara um laser de 589 nm que excita o sódio da mesosfera a ~90 km e cria uma "estrela artificial" para a óptica adaptativa.',
    descricao: 'Caixa com laser, sistema de condicionamento do feixe e um pequeno telescópio de lançamento, na borda do primário.',
    fabricacao: 'Laser de estado sólido sintonizado na linha D do sódio.', fornecedor: 'Australian National University (ANU).',
    curiosidade: 'Seis lasers formam um asterismo de 1′ (tomografia) ou 7′ (correção da camada do solo).',
    extras: [['laser', 1, 'lgsf2013', 'artigo'], ['componentes', 1, 'calculo', 'estimado']],
    build() {
      return grupo(
        ...painel6(1.0, 1.2, 1.0, 0, 0.6, 0, M.branco, 0.01, 'aluminio', 'caixa do laser'),
        tuboEntre(V(0, 1.2, 0), V(0, 2.2, 0), 0.25, 0.01, M.branco, 'aluminio', 'telescópio de lançamento', 16),
      );
    },
  },

  // ------------------------------- ENCLOSURE -------------------------------
  {
    id: 'bogie-rotacao', nome: 'Par de bogies de rotação do domo', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [33, 'hms2024', 'oficial', '33 pares de bogies motorizados e complacentes.'],
    funcao: 'Carrinhos com rodas e motorredutores que giram as ~5.660 t do domo sobre o trilho duplo, numa volta completa em 4 minutos.',
    descricao: 'Dois truques (um por trilho) ligados por quadro superior, com braços de ligação radiais e molas de disco.',
    fabricacao: 'Aço soldado, rodas forjadas, motorredutores.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'A distribuição dos 33 bogies foi otimizada para minimizar o pico de carga em qualquer roda.',
    extras: [['roda', 8, 'calculo', 'estimado'], ['motor', 2, 'calculo', 'estimado']],
    build() {
      const truque = (x) => {
        const rodas = [];
        for (const z of [-0.8, 0.8]) for (const dx of [-0.18, 0.18]) { const r = new THREE.CylinderGeometry(0.4, 0.4, 0.14, 20); r.rotateZ(Math.PI / 2); r.translate(x + dx, 0.4, z); rodas.push(mk(r, M.cinzaEsc, 'aco_usinado', 'rodas')); }
        return [
          mk(caixa(0.04, 0.8, 2.6, x - 0.3, 0.75, 0), M.azul, 'aco_estrutural', 'quadro'),
          mk(caixa(0.04, 0.8, 2.6, x + 0.3, 0.75, 0), M.azul, 'aco_estrutural', 'quadro'),
          ...rodas,
        ];
      };
      const m = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16); m.rotateZ(Math.PI / 2); m.translate(0, 1.0, 1.0);
      return grupo(truque(-0.925), truque(0.925), mk(caixa(2.6, 0.06, 2.6, 0, 1.18, 0), M.azul, 'aco_estrutural', 'quadro superior'), mk(m, M.cinza, 'aco_estrutural', 'motorredutor'));
    },
  },
  {
    id: 'trilho-enclosure', nome: 'Segmento do trilho do domo (A150)', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [30, 'calculo', 'estimado', '2π·(27,675 + 29,525) m ÷ 12 m por barra ≈ 30.'],
    funcao: 'Os dois trilhos circulares (raios 27,675 e 29,525 m) sobre os quais rodam os bogies do domo.',
    descricao: 'Trilho de ponte rolante DIN A150 (~147 kg/m) em barras de 12 m, fixado sobre a parede do enclosure inferior.',
    fabricacao: 'Trilho laminado, curvado e soldado.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'É o mesmo tipo de trilho de pontes rolantes industriais, só que em círculo de 59 m.',
    extras: [['parafuso', 48, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(caixa(0.22, 0.04, 12, 0, 0.02, 0), M.cinzaEsc, 'aco_trilho', 'patim'),
        mk(caixa(0.04, 0.1, 12, 0, 0.09, 0), M.cinzaEsc, 'aco_trilho', 'alma'),
        mk(caixa(0.15, 0.04, 12, 0, 0.16, 0), M.aluminio, 'aco_trilho', 'boleto'),
      );
    },
  },
  {
    id: 'anel-base', nome: 'Anel-base rotativo do domo', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [1, 'hms2024', 'oficial'],
    funcao: 'Viga-caixão circular que recebe todo o peso do domo superior e o distribui entre os 33 pares de bogies.',
    descricao: 'Viga-caixão anular de 3,2 m × 2,4 m com mesas e almas soldadas.', fabricacao: 'Segmentos soldados na obra.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Precisa ser rígida o bastante para o domo não "ovalizar" ao girar.',
    build() {
      return grupo(
        mk(setor({ ri: 27.0, ro: 30.2, y0: 2.35, y1: 2.4, seg: 96 }), M.cinzaEsc, 'aco_estrutural', 'mesa superior'),
        mk(setor({ ri: 27.0, ro: 30.2, y0: 0, y1: 0.05, seg: 96 }), M.cinzaEsc, 'aco_estrutural', 'mesa inferior'),
        mk(setor({ ri: 27.0, ro: 27.05, y0: 0.05, y1: 2.35, seg: 96 }), M.cinzaEsc, 'aco_estrutural', 'alma interna'),
        mk(setor({ ri: 30.15, ro: 30.2, y0: 0.05, y1: 2.35, seg: 96 }), M.cinzaEsc, 'aco_estrutural', 'alma externa'),
      );
    },
  },
  {
    id: 'coluna-enclosure', nome: 'Coluna do domo superior', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [21, 'calculo', 'estimado', 'Colunas a cada ~8 m, fora da fenda.'],
    funcao: 'Pilares verticais que sobem do anel-base ao teto e sustentam paredes, persianas e a ponte rolante.',
    descricao: 'Pilar-caixão de 1,0 × 1,6 m e 44 m de altura em chapas soldadas.', fabricacao: 'Chapas soldadas em módulos transportáveis.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'A massa do domo é dimensionada para resposta sísmica elástica: o domo não pode plastificar num terremoto.',
    build() {
      const h = G.Y_TOPO_PAREDE - G.Y_PAREDE0;
      return grupo(
        mk(caixa(1.0, h, 0.04, 0, h / 2, -0.78), M.cinza, 'aco_estrutural', 'mesa'),
        mk(caixa(1.0, h, 0.04, 0, h / 2, 0.78), M.cinza, 'aco_estrutural', 'mesa'),
        mk(caixa(0.04, h, 1.52, -0.48, h / 2, 0), M.cinza, 'aco_estrutural', 'alma'),
        mk(caixa(0.04, h, 1.52, 0.48, h / 2, 0), M.cinza, 'aco_estrutural', 'alma'),
      );
    },
  },
  {
    id: 'viga-anelar', nome: 'Viga anelar horizontal do domo', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [4, 'calculo', 'estimado'],
    funcao: 'Anéis horizontais que amarram as colunas e enrijecem a casca cilíndrica contra o vento.',
    descricao: 'Viga-caixão circular interrompida na fenda.', fabricacao: 'Chapas soldadas.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Nos níveis das vigas ficam também as passarelas internas.',
    build() {
      const a0 = Math.PI / 2 + G.MEIA_FENDA, a1 = Math.PI / 2 - G.MEIA_FENDA + Math.PI * 2;
      return grupo(
        mk(setor({ ri: 29.4, ro: 30.2, y0: 0.95, y1: 1.0, a0, a1, seg: 80 }), M.cinza, 'aco_estrutural', 'mesa'),
        mk(setor({ ri: 29.4, ro: 30.2, y0: 0, y1: 0.05, a0, a1, seg: 80 }), M.cinza, 'aco_estrutural', 'mesa'),
        mk(setor({ ri: 29.4, ro: 29.44, y0: 0.05, y1: 0.95, a0, a1, seg: 80 }), M.cinza, 'aco_estrutural', 'alma'),
      );
    },
  },
  {
    id: 'trelica-teto', nome: 'Treliça do teto', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [8, 'calculo', 'estimado'],
    funcao: 'Vence os ~55 m do teto, sustentando o revestimento e os trilhos da ponte rolante de 75 t.',
    descricao: 'Treliça plana de 3 m de altura com banzos tubulares e diagonais (comprimento representativo de 50 m).',
    fabricacao: 'Tubos soldados em módulos.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'O vão do teto é definido pela abertura do telescópio mais o alçapão do piso.',
    build(d, o = {}) {
      const L = o.L ?? 50, t = [];
      t.push(tuboEntre(V(0, 3, -L / 2), V(0, 3, L / 2), 0.2, 0.015, M.cinza, 'aco_estrutural', 'banzo superior', 10));
      t.push(tuboEntre(V(0, 0, -L / 2), V(0, 0, L / 2), 0.2, 0.015, M.cinza, 'aco_estrutural', 'banzo inferior', 10));
      const n = Math.max(2, Math.round(L / 5));
      for (let i = 0; i < n; i++) {
        const z0 = -L / 2 + (L * i) / n, z1 = -L / 2 + (L * (i + 1)) / n;
        t.push(tuboEntre(V(0, 0, z0), V(0, 3, z1), 0.1, 0.008, M.cinza, 'aco_estrutural', 'diagonais', 8));
        t.push(tuboEntre(V(0, 0, z1), V(0, 3, z1), 0.1, 0.008, M.cinza, 'aco_estrutural', 'montantes', 8));
      }
      return grupo(t);
    },
  },
  {
    id: 'painel-revestimento', nome: 'Painel de revestimento', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [560, 'calculo', 'estimado', 'Área revestida do domo superior (~10.100 m²) ÷ 18 m² por painel.'],
    funcao: 'Pele isolada do domo: barra sol, chuva e poeira de dia e não guarda calor que vire turbulência à noite.',
    descricao: 'Painel sanduíche de 3 × 6 m com chapas de aço pré-pintadas e núcleo isolante.', fabricacao: 'Painel industrializado.', fornecedor: '—',
    curiosidade: 'A cor clara reflete o sol: o domo precisa amanhecer à noite já perto da temperatura do ar.',
    extras: [['painel', 18, 'calculo', 'estimado']],
    build() { return grupo(mk(caixa(3, 6, 0.1, 0, 3, 0), M.painel, null, 'painel')); },
  },
  {
    id: 'porta-shutter', nome: 'Porta bipartida em "L" (shutter)', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [2, 'hms2024', 'oficial'],
    funcao: 'As duas portas que abrem a fenda de observação: cobrem a parede e parte do teto, e giram em lados opostos para abrir.',
    descricao: 'Estrutura em "L" com vão vertical de ~47 m e horizontal de ~50 m, revestida, sobre 8 bogies (4 em baixo e 4 em cima).',
    fabricacao: 'Treliças tubulares revestidas por painéis.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'As duas portas somam 667 t, mais que um Airbus A380 lotado na decolagem (~575 t, comparação aproximada).',
    pesquisado: { massa_t: 667 / 2, fonte: 'hms2024', conf: 'oficial', nota: '667 t para as duas portas.' },
    extras: [['painel', 1060, 'calculo', 'estimado', 'Área revestida de uma porta.'], ['motor', 4, 'calculo', 'estimado']],
    build() {
      const R = 31.1, dA = G.MEIA_FENDA, c = Math.PI / 2, y0 = G.Y_FENDA - 1, y1 = G.Y_TOPO_PAREDE + 1;
      const t = [];
      for (let k = 0; k <= 3; k++) {
        const a = c - dA + (dA * k) / 3;
        t.push(tuboEntre(V(R * 1.01 * Math.cos(a), y0, R * 1.01 * Math.sin(a)), V(R * 1.01 * Math.cos(a), y1, R * 1.01 * Math.sin(a)), 0.35, 0.02, M.cinza, 'aco_estrutural', 'montantes', 10));
      }
      for (let y = y0; y <= y1; y += 6) for (let k = 0; k < 3; k++) {
        const a = c - dA + (dA * k) / 3, b = c - dA + (dA * (k + 1)) / 3;
        t.push(tuboEntre(V(R * Math.cos(a), y, R * Math.sin(a)), V(R * Math.cos(b), y, R * Math.sin(b)), 0.2, 0.012, M.cinza, 'aco_estrutural', 'travessas', 8));
      }
      const yt = G.Y_TETO + 0.6, zA = G.Z_FENDA_TETO, zB = Math.sqrt(R * R - 13.5 * 13.5);
      for (const x of [0.4, 4.5, 9, 13.2]) t.push(tuboEntre(V(x, yt, zA), V(x, yt, zB), 0.35, 0.02, M.cinza, 'aco_estrutural', 'longarinas do teto', 10));
      const pele = setor({ ri: R + 0.25, ro: R + 0.4, y0, y1, a0: c - dA, a1: c, seg: 10 });
      const teto = caixa(13.6, 0.2, zB - zA, 6.8, yt + 0.45, (zA + zB) / 2);
      return grupo(t, mk(pele, M.painel, null, 'revestimento da parede'), mk(teto, M.painel, null, 'revestimento do teto'));
    },
  },
  {
    id: 'bogie-porta', nome: 'Bogie das portas', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [8, 'hms2024', 'oficial'],
    funcao: 'Rodas que carregam as portas pelo trilho da base e pelo do teto enquanto abrem.',
    descricao: 'Truque compacto com duas rodas e quadro soldado, preso a um nó da estrutura da porta.', fabricacao: 'Aço soldado e rodas forjadas.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Cada bogie coincide com um nó estrutural da porta para dividir melhor a carga.',
    extras: [['roda', 2, 'calculo', 'estimado'], ['motor', 1, 'calculo', 'estimado']],
    build() {
      const r = [];
      for (const z of [-0.5, 0.5]) { const g = new THREE.CylinderGeometry(0.35, 0.35, 0.16, 18); g.rotateZ(Math.PI / 2); g.translate(0, 0.35, z); r.push(mk(g, M.cinzaEsc, 'aco_usinado', 'rodas')); }
      return grupo(r, mk(caixa(0.5, 0.5, 1.6, 0, 0.8, 0), M.azul, 'aco_estrutural', 'quadro'));
    },
  },
  {
    id: 'respiro', nome: 'Persiana / respiro de ventilação', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [300, 'hms2024', 'oficial', '"Mais de 300" respiros.'],
    funcao: 'Aberturas que deixam o vento atravessar o domo e lavar o ar quente de dentro, reduzindo o "dome seeing".',
    descricao: 'Moldura de aço de ~3,2 × 4 m com porta de enrolar comercial motorizada (abertura ajustável).',
    fabricacao: 'Porta de enrolar industrial.', fornecedor: 'Fornecedor comercial (projeto IDOM).',
    curiosidade: 'Número, tamanho e forma dos respiros foram definidos por várias rodadas de CFD e testes em túnel de vento e de água.',
    extras: [['porta_enrolar', 1, 'hms2024', 'oficial'], ['motor', 1, 'calculo', 'estimado']],
    build() {
      return grupo(
        mk(caixa(3.5, 0.15, 0.15, 0, 4.08, 0), M.cinza, 'aco_estrutural', 'moldura'),
        mk(caixa(3.5, 0.15, 0.15, 0, -0.08, 0), M.cinza, 'aco_estrutural', 'moldura'),
        mk(caixa(0.15, 4, 0.15, -1.68, 2, 0), M.cinza, 'aco_estrutural', 'moldura'),
        mk(caixa(0.15, 4, 0.15, 1.68, 2, 0), M.cinza, 'aco_estrutural', 'moldura'),
        mk(caixa(3.4, 0.4, 0.4, 0, 4.4, 0.15), M.aluminio, 'aluminio', 'rolo'),
        mk(caixa(3.2, 2, 0.03, 0, 3, 0), M.aluminio, 'aluminio', 'cortina (50%)'),
      );
    },
  },
  {
    id: 'para-vento', nome: 'Para-vento (wind screen)', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [1, 'hms2024', 'oficial'],
    funcao: 'Tela que sobe na fenda e corta o vento que bate no telescópio, deixando passar ~25% do fluxo.',
    descricao: 'Painel de ~27 m × 30 m em treliça com tela perfurada, içado por talhas de corrente.',
    fabricacao: 'Treliça tubular + chapa perfurada; içado por talhas.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Dá para observar com vento forte subindo a tela até a altura do espelho.',
    pesquisado: { massa_t: 164, fonte: 'hms2024', conf: 'oficial' },
    extras: [['motor', 4, 'hms2024', 'oficial', 'Talhas de corrente.']],
    build() {
      const t = [];
      for (let x = -13.5; x <= 13.5; x += 4.5) t.push(tuboEntre(V(x, 0, 0), V(x, 30, 0), 0.25, 0.015, M.cinza, 'aco_estrutural', 'montantes', 10));
      for (let y = 0; y <= 30; y += 3) t.push(tuboEntre(V(-13.5, y, 0), V(13.5, y, 0), 0.18, 0.012, M.cinza, 'aco_estrutural', 'travessas', 8));
      return grupo(t, mk(caixa(27, 30, 0.004, 0, 15, 0.3), M.tela, 'aluminio', 'tela perfurada'));
    },
  },
  {
    id: 'ponte-rolante', nome: 'Ponte rolante de 75 t', sistema: 'Enclosure', sub: 'enclosure',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Retira células de espelho, o topo do telescópio e instrumentos e os desce pelo alçapão até o térreo.',
    descricao: 'Duas vigas-caixão de ~50 m com carro e talha, correndo em trilhos no alto do domo superior.',
    fabricacao: 'Vigas-caixão soldadas.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'É ela que leva cada espelho de 17 t ao prédio de apoio para lavar e realuminizar.',
    extras: [['motor', 6, 'calculo', 'estimado'], ['roda', 8, 'calculo', 'estimado']],
    build() {
      const viga = (x) => [
        mk(caixa(1.2, 0.03, 50, x, 2.5, 0), M.amarelo, 'aco_estrutural', 'viga'),
        mk(caixa(1.2, 0.03, 50, x, 0, 0), M.amarelo, 'aco_estrutural', 'viga'),
        mk(caixa(0.025, 2.5, 50, x - 0.6, 1.25, 0), M.amarelo, 'aco_estrutural', 'viga'),
        mk(caixa(0.025, 2.5, 50, x + 0.6, 1.25, 0), M.amarelo, 'aco_estrutural', 'viga'),
      ];
      return grupo(viga(-2.5), viga(2.5),
        mk(caixa(7, 1.6, 2, 0, 1.25, -25), M.amarelo, 'aco_estrutural', 'cabeceira'),
        mk(caixa(7, 1.6, 2, 0, 1.25, 25), M.amarelo, 'aco_estrutural', 'cabeceira'),
        mk(caixa(6, 2, 5, 0, 3.6, 6), M.cinzaEsc, 'aco_estrutural', 'carro'),
        mk(caixa(1.2, 1.5, 1.2, 0, -3, 6), M.cinzaEsc, 'aco_estrutural', 'moitão'));
    },
  },

  // ------------------------------- APOIO -------------------------------
  {
    id: 'ssb', nome: 'Prédio de apoio do cume (SSB)', sistema: 'Apoio', sub: 'apoio',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Onde os espelhos são lavados, removidos e realuminizados, e onde se integram M1, M2 e a óptica adaptativa.',
    descricao: 'Térreo de ~2.452 m² (câmara de aluminização, lavagem, integração) e 4º andar de ~563 m² (escritórios, laboratório de eletrônica).',
    fabricacao: 'Concreto + estrutura metálica + painéis.', fornecedor: 'Projeto IDOM (60% em maio de 2026; FDR previsto para nov. 2026).',
    curiosidade: 'Cresceu desde 2024 com lições da fábrica de revestimento do Observatório Rubin.',
    taxa: 100,
    extras: [['painel', 2600, 'calculo', 'estimado', 'Fachadas e cobertura (estimado).']],
    build() {
      return predio([
        [70, 10, 35, 0, 0], [24, 8, 24, 18, 10],
      ]);
    },
  },
  {
    id: 'sub', nome: 'Prédio de utilidades do cume (SUB)', sistema: 'Apoio', sub: 'apoio',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Equipamentos de refrigeração (CO₂), ar e energia que atendem o domo pelo túnel de utilidades.',
    descricao: 'Prédio técnico ligado ao enclosure pelo túnel de utilidades (SUT).', fabricacao: 'Concreto + estrutura metálica.', fornecedor: 'Projeto IDOM.',
    curiosidade: 'Fica afastado para que o calor das máquinas não chegue ao ar em volta do telescópio.',
    taxa: 100,
    extras: [['painel', 900, 'calculo', 'estimado']],
    build() { return predio([[30, 7, 15, 0, 0]]); },
  },
  {
    id: 'torre-ambiental', nome: 'Torre de monitoramento ambiental', sistema: 'Apoio', sub: 'apoio',
    qtd: [2, 'sef2026', 'oficial'],
    funcao: 'Mastros de ~50 m com anemômetros e sensores que medem vento, temperatura e turbulência no cume.',
    descricao: 'Treliça triangular estaiada de 1,5 m de lado.', fabricacao: 'Tubos galvanizados.', fornecedor: '—',
    curiosidade: 'O cume também tem um monitor de seeing MASS/DIMM.',
    extras: [['sensor', 12, 'calculo', 'estimado']],
    build() {
      const t = [], H = 50, P = (k, y) => V(0.866 * Math.cos((k * 2 * Math.PI) / 3), y, 0.866 * Math.sin((k * 2 * Math.PI) / 3));
      for (let k = 0; k < 3; k++) t.push(tuboEntre(P(k, 0), P(k, H), 0.06, 0.005, M.cinza, 'aco_estrutural', 'pernas', 6));
      const diag = [];
      for (let y = 0; y < H; y += 2.5) for (let k = 0; k < 3; k++) {
        const a = P(k, y), b = P(k + 1, y + 2.5);
        const m = new THREE.Object3D(); alinhar(m, a, b); m.updateMatrix(); diag.push(m.matrix.clone());
      }
      const dg = inst(tubo(0.025, 0.004, P(0, 0).distanceTo(P(1, 2.5)), 6), M.cinza, 'aco_estrutural', diag, 'diagonais');
      return grupo(t, dg, mk(caixa(0.6, 0.3, 0.6, 0, H + 0.15, 0), M.branco, 'aluminio', 'sensores'));
    },
  },
  {
    id: 'tanque-agua', nome: 'Tanque de água do cume', sistema: 'Apoio', sub: 'apoio',
    qtd: [1, 'sef2026', 'oficial'],
    funcao: 'Reserva de 270 m³ para água potável e combate a incêndio, com cloração gerada no local a partir de sal.',
    descricao: 'Tanque cilíndrico de aço sobre base de concreto.', fabricacao: 'Chapas de aço soldadas.', fornecedor: 'Construído em 2021.',
    curiosidade: 'A recirculação de 67 m³/h renova o tanque inteiro a cada 4 horas.',
    taxa: 80,
    build() {
      return grupo(
        mk(setor({ ri: 4.98, ro: 5, y0: 0.3, y1: 3.9, seg: 48 }), M.branco, 'aco_estrutural', 'costado'),
        mk(setor({ ro: 5, ro1: 0.4, y0: 3.9, y1: 4.6, seg: 48 }), M.branco, 'aco_estrutural', 'teto'),
        mk(setor({ ro: 5.5, y0: 0, y1: 0.3, seg: 48 }), M.concreto, 'concreto', 'base'),
      );
    },
  },
];

export const PECA = Object.fromEntries(PECAS.map((p) => [p.id, p]));
export const SISTEMAS = ['Fundação', 'Montagem', 'Óptica', 'Instrumentação', 'Enclosure', 'Apoio'];

/** Constrói a peça e marca cada malha com o id do tipo. */
export function construir(id, detalhe = false, opcoes) {
  const p = PECA[id];
  const g = p.build(detalhe, opcoes);
  g.userData.peca = id;
  g.traverse((o) => { if (o.isMesh) o.userData.peca = id; });
  return g;
}

// ---------- construtores compartilhados ----------
function celula(central, d) {
  const y0 = -3.65, y1 = -0.92, r = 4.65, a0 = Math.PI / 12, s = 12;
  const ri = central ? 1.0 : 0;
  const nerv = [];
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const L = 4.55 - (central ? 1.1 : 0.4), rc = (central ? 1.1 : 0.4) + L / 2;
    nerv.push(mat4(Math.cos(a) * rc, (y0 + y1) / 2, Math.sin(a) * rc, -a, 0, 0));
  }
  const L = 4.55 - (central ? 1.1 : 0.4);
  const g = grupo(
    mk(setor({ ri: r - 0.05, ro: r, y0, y1, a0, a1: a0 + Math.PI * 2, seg: s, plano: true }), M.turq, 'aco_estrutural', 'casca'),
    mk(setor({ ri, ro: r, y0, y1: y0 + 0.05, a0, a1: a0 + Math.PI * 2, seg: s, plano: true }), M.turq, 'aco_estrutural', 'fundo'),
    mk(setor({ ri: 4.3, ro: r, y0: y1 - 0.03, y1, a0, a1: a0 + Math.PI * 2, seg: s, plano: true }), M.turq, 'aco_estrutural', 'anel superior'),
    inst(caixa(L, y1 - y0 - 0.1, 0.03), M.turq, 'aco_estrutural', nerv, 'nervuras'),
    mk(setor({ ri: r, ro: r + 0.02, y0: -2.32, y1: -2.26, a0, a1: a0 + Math.PI * 2, seg: s, plano: true }), M.solda, 'aco_estrutural', 'solda da célula'),
  );
  if (central) g.add(mk(setor({ ri: 0.95, ro: 1.0, y0, y1, seg: 24 }), M.turq, 'aco_estrutural', 'poço central'));
  if (d) {
    // atuadores, hardpoints e ventiladores só para visualização (contados nas peças próprias)
    const at = [], rr = 3.9;
    for (let i = 0; i < 160; i++) {
      const rad = Math.sqrt((i + 0.5) / 160) * rr, ang = i * 2.39996;
      if (central && rad < 1.2) continue;
      at.push(mat4(rad * Math.cos(ang), -1.7, rad * Math.sin(ang)));
    }
    g.add(inst(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8).translate(0, 0.375, 0), M.aluminio, null, at, 'atuadores (160)'));
    const hp = [];
    for (let k = 0; k < 6; k++) hp.push(mat4(2.6 * Math.cos(k * 1.047), -2.0, 2.6 * Math.sin(k * 1.047), 0, 0.5, 0));
    g.add(inst(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8).translate(0, 0.55, 0), M.amarelo, null, hp, 'hardpoints (6)'));
    const vt = [];
    for (let k = 0; k < 12; k++) vt.push(mat4(3.3 * Math.cos(k * 0.5236 + 0.26), -3.2, 3.3 * Math.sin(k * 0.5236 + 0.26)));
    g.add(inst(new THREE.BoxGeometry(0.6, 0.6, 0.6), M.cinza, null, vt, 'ventiladores (12)'));
  }
  return g;
}

function segmentoM1(a, furo, d) {
  const R = G.R_SEG, face = faceSegmento(a);
  if (!d) {
    const g = placa({ rIn: furo, rOut: R, topo: face, base: () => -G.ESP, nr: 10, ns: 64 });
    const m = mk(g, [M.espelho, M.vidroCorpo], 'vidro_e6', 'espelho');
    return grupo(m);
  }
  // detalhado: face frontal, fundo, parede e favo de mel (nervuras hexagonais)
  const frente = placa({ rIn: furo, rOut: R, topo: face, base: (x, z) => face(x, z) - 0.028, nr: 12, ns: 72 });
  const fundo = placa({ rIn: furo, rOut: R, topo: () => -G.ESP + 0.025, base: () => -G.ESP, nr: 4, ns: 72 });
  let minRim = Infinity;
  for (let k = 0; k < 72; k++) minRim = Math.min(minRim, face(R * Math.cos((k * Math.PI) / 36), R * Math.sin((k * Math.PI) / 36)));
  const g = grupo(
    mk(frente, [M.espelho, M.vidro], 'vidro_e6', 'face frontal (28 mm)'),
    mk(fundo, [M.vidro, M.vidro], 'vidro_e6', 'placa traseira (25 mm)'),
    mk(setor({ ri: R - 0.025, ro: R, y0: -G.ESP + 0.025, y1: minRim - 0.028, seg: 72 }), M.vidro, 'vidro_e6', 'parede externa'),
  );
  if (furo) g.add(mk(setor({ ri: furo, ro: furo + 0.025, y0: -G.ESP + 0.025, y1: -0.03, seg: 24 }), M.vidro, 'vidro_e6', 'parede do furo'));
  // favo de mel: células hexagonais de 0,5 m entre faces; paredes de 12 mm (6 mm por célula, compartilhadas)
  const p = 0.5, rc = p / Math.sqrt(3), t = 0.006 / Math.cos(Math.PI / 6);
  const hex = setor({ ri: rc - t, ro: rc, y0: 0, y1: 1, a0: Math.PI / 6, a1: Math.PI / 6 + Math.PI * 2, seg: 6, plano: true });
  const ms = [];
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
    const x = p * (i + (j & 1 ? 0.5 : 0)), z = ((p * Math.sqrt(3)) / 2) * j;
    const rr = Math.hypot(x, z);
    if (rr > R - 0.3 || rr < furo + 0.25) continue;
    const yb = -G.ESP + 0.025, yt = face(x, z) - 0.028;
    ms.push(mat4s(x, yb, z, 1, yt - yb, 1));
  }
  g.add(inst(hex, M.vidro, 'vidro_e6', ms, 'favo de mel (nervuras)'));
  return g;
}

function painel6(w, h, d, x, y, z, mat, e, q, sub) {
  return [
    mk(caixa(w, e, d, x, y + h / 2 - e / 2, z), mat, q, sub), mk(caixa(w, e, d, x, y - h / 2 + e / 2, z), mat, q, sub),
    mk(caixa(e, h - 2 * e, d, x - w / 2 + e / 2, y, z), mat, q, sub), mk(caixa(e, h - 2 * e, d, x + w / 2 - e / 2, y, z), mat, q, sub),
    mk(caixa(w - 2 * e, h - 2 * e, e, x, y, z - d / 2 + e / 2), mat, q, sub), mk(caixa(w - 2 * e, h - 2 * e, e, x, y, z + d / 2 - e / 2), mat, q, sub),
  ];
}

function instrumento(w, h, d, cor) {
  const cri = setor({ ri: 0.6, ro: 0.62, y0: -h / 2 + 0.3, y1: h / 2 - 0.3, seg: 24 });
  cri.translate(0, h / 2, 0);
  return grupo(...painel6(w, h, d, 0, h / 2, 0, cor, 0.012, 'aluminio', 'invólucro'), mk(cri, M.aluminio, 'aco_inox', 'criostato'));
}

function predio(blocos) {
  const g = grupo();
  for (const [w, h, d, x0, y0] of blocos) {
    const e = 0.25;
    g.add(...painel6(w, h, d, x0, y0 + h / 2, 0, M.branco, e, 'concreto', 'paredes e lajes'));
    // faixa de janelas
    const jan = caixa(w * 0.8, 1.2, 0.05, x0, y0 + h * 0.6, d / 2 + 0.03);
    g.add(mk(jan, M.janela, null, 'janelas'));
    const jan2 = caixa(0.05, 1.2, d * 0.6, x0 + w / 2 + 0.03, y0 + h * 0.6, 0);
    g.add(mk(jan2, M.janela, null, 'janelas'));
  }
  return g;
}
