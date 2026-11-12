// Regras comuns a todos os formatos: nomes de nó -> id de peça, caminhos estáveis, unidades e eixos.
import { slugId } from '../util.js';

export const UNIDADES = {
  m: { nome: 'metros (m)', fator: 1 },
  cm: { nome: 'centímetros (cm)', fator: 0.01 },
  mm: { nome: 'milímetros (mm)', fator: 0.001 },
  pol: { nome: 'polegadas (pol)', fator: 0.0254 },
  pe: { nome: 'pés (ft)', fator: 0.3048 },
};

/** Nomes que não dizem nada (gerados pelos programas): não viram peça sozinhos. */
const GENERICOS = /^(scene|cena|root|rootnode|root-node|auxscene|group|grupo|object|objeto|obj|mesh|malha|node|no|default|defaultobject|model|modelo|ajuste|principal|extra-\d+|sketchup|layer\d*|camada\d*|geometry|geometria|mesh-\d+|node-\d+|material|untitled|sem-nome|stl|ply)$/;
const TERRENO = /^(chao|terreno|piso-externo|ground|terrain|solo|plano|plane|grade|lote)$/;

/** Último segmento depois de "__" (ex.: "bloco-a__pilar" -> "pilar"). */
function depoisDeDuplo(s) { const i = s.lastIndexOf('__'); return i >= 0 ? s.slice(i + 2) : s; }

/**
 * Nome do nó -> id da peça: sem acento, minúsculo, espaços -> "-"; o sufixo de duplicata
 * (".001", "_1", " (2)", "#3") é ignorado; "qualquer-coisa__pilar" = "pilar".
 */
export function idDeNome(nome) {
  let s = depoisDeDuplo(String(nome ?? '').trim());
  for (let i = 0; i < 4; i++) {
    const t = s.replace(/(\.\d+|_\d+|\s*\(\d+\)|\s*#\d+)$/, '');
    if (t === s) break;
    s = t;
  }
  return slugId(s);
}
export const ehGenerico = (id) => !id || GENERICOS.test(id);
export const pareceTerreno = (id) => TERRENO.test(id);

/** Nome original de um objeto (antes da limpeza que o GLTFLoader faz nos nomes). */
export const nomeBruto = (o) => (typeof o.userData?.nome0 === 'string' ? o.userData.nome0 : o.name ?? '');
/** Id sugerido de um objeto: extras.peca tem prioridade sobre o nome. */
export function idSugerido(o) {
  const p = o.userData?.peca;
  if (typeof p === 'string' && /^[a-z0-9-]{1,40}$/.test(p)) return p;
  return idDeNome(nomeBruto(o));
}
/** Nome do material de uma malha, normalizado como chave (extras.material tem prioridade). */
export function materialDetectado(m) {
  const ex = m.userData?.material;
  const nome = typeof ex === 'string' ? ex : (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? '';
  return slugId(nome).replace(/-/g, '_');
}

/**
 * Caminho estável de cada nó a partir da raiz: nomes separados por "/"; nome vazio ou repetido entre
 * irmãos ganha "#índice". Devolve { porCaminho: Map, deObjeto: Map }.
 */
export function caminhos(raiz) {
  const porCaminho = new Map(), deObjeto = new Map();
  const visitar = (o, pre) => {
    const cont = {};
    for (const f of o.children) cont[f.name] = (cont[f.name] ?? 0) + 1;
    o.children.forEach((f, i) => {
      const seg = f.name && cont[f.name] === 1 ? f.name.replace(/[/#]/g, '_') : `${(f.name || '').replace(/[/#]/g, '_')}#${i}`;
      const c = pre ? `${pre}/${seg}` : seg;
      porCaminho.set(c, f);
      deObjeto.set(f, c);
      visitar(f, c);
    });
  };
  visitar(raiz, '');
  return { porCaminho, deObjeto };
}

/** Unidade sugerida para formatos sem unidade no arquivo, pelo tamanho (o maior lado em unidades do arquivo). */
export function unidadeSugerida(maior, formato) {
  if (formato === 'stl') return maior > 50 ? 'mm' : 'm';
  if (maior > 50000) return 'mm';
  if (maior > 500) return 'cm';
  return 'm';
}

/** Tamanho formatado "42,0 × 18,5 × 9,2 m" (largura × profundidade × altura). */
export function textoTamanho(t, fmt) {
  return `${fmt(t.x, 1)} × ${fmt(t.z, 1)} × ${fmt(t.y, 1)} m`;
}
