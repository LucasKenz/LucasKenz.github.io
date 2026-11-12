// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/sandbox/projeto.js, commit 6efe428).
// Projeto do cliente = base (pacote do projeto) + lista de edições. Nunca altera o pacote.
// Este módulo é só dados: criar, validar contra a base, serializar, comprimir para link, histórico e autosave.
import { CATEGORIAS_CABO, INSTALACOES } from './pecas-editor.js';

export const FORMATO = 'orcamento-3d';
export const VERSAO = 1;
export const ANCORAS = ['fixo'];
export const TIPOS = ['cabo', 'adicionar', 'remover', 'mover', 'quantidade', 'material', 'externo'];
const CHAVE_LOCAL = 'orcamento-3d-projeto';
const MAX_EDICOES = 400;
const MAX_PONTOS = 300;
const MAX_TEXTO = 140;
export const MAX_MODELO_BYTES = 4 * 1024 * 1024; // .glb extra
export const MAX_MODELOS = 6;
export const MAX_ARQUIVO = 40e6 * 1.05 + MAX_MODELOS * MAX_MODELO_BYTES * 1.4 + 2e6; // pacote + modelos em base64 + edições

/** Hash FNV-1a (32 bits, hex) de um texto. */
export function fnv(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const novoId = () => 'e' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export function novoProjeto(base) {
  const agora = new Date().toISOString();
  return {
    formato: FORMATO, versao: VERSAO,
    nome: 'Meu orçamento', autor: '',
    criado: agora, atualizado: agora,
    base: { hash: base.id, nome: base.nome, biblioteca: base.biblioteca },
    precos: {}, cambio_brl: null,
    edicoes: [],
    modelos: {},
  };
}

// ---------- validação (tudo o que vem de arquivo ou link passa por aqui) ----------
export const num = (x, min, max, padrao = null) => {
  const v = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN;
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao;
};
export const txt = (x, padrao = '', max = MAX_TEXTO) => (typeof x === 'string' ? x.slice(0, max) : padrao);
const vet3 = (v, lim = 1e5) => (Array.isArray(v) && v.length === 3 && v.every((c) => Number.isFinite(+c)) ? v.map((c) => num(+c, -lim, lim, 0)) : null);
const matriz = (m) => (Array.isArray(m) && m.length === 16 && m.every((c) => Number.isFinite(+c)) ? m.map((c) => num(+c, -1e6, 1e6, 0)) : null);

/** Valida e normaliza uma edição contra a base. Devolve null se não der para aproveitar. */
export function validarEdicao(e, base) {
  if (!e || typeof e !== 'object' || !TIPOS.includes(e.tipo)) return null;
  const pecaOk = (id) => typeof id === 'string' && !!base.PECA[id] && !base.PECA[id].oculto;
  const sistema = (s, padrao) => (base.sistemas.includes(s) ? s : padrao);
  const r0 = { id: typeof e.id === 'string' && /^[\w-]{1,24}$/.test(e.id) ? e.id : novoId(), tipo: e.tipo, ativo: e.ativo !== false, nome: txt(e.nome) };
  const MAT = base.materiais;
  switch (e.tipo) {
    case 'cabo': {
      const pontos = Array.isArray(e.pontos) ? e.pontos.slice(0, MAX_PONTOS).map((p) => vet3(p)).filter(Boolean) : [];
      const comprimento_m = e.comprimento_m != null ? num(e.comprimento_m, 0, 100000, null) : null;
      if (pontos.length < 2 && comprimento_m === null) return null;
      const r = {
        ...r0,
        categoria: CATEGORIAS_CABO[e.categoria] ? e.categoria : 'energia',
        ancora: 'fixo',
        sistema: sistema(e.sistema, base.sistemaCabos),
        feixe: Math.round(num(e.feixe, 1, 500, 1)),
        folga_pct: num(e.folga_pct, 0, 200, 0),
        eletrocalha: e.eletrocalha && typeof e.eletrocalha === 'object' ? { largura_m: num(e.eletrocalha.largura_m, 0.05, 2, 0.3) } : null,
        instalacao: INSTALACOES[e.instalacao] ? e.instalacao : 'estrutura',
      };
      if (e.rota && typeof e.rota === 'object') r.rota = { origem: txt(e.rota.origem, '', 60), destino: txt(e.rota.destino, '', 60) };
      if (pontos.length >= 2) r.pontos = pontos;
      else { r.comprimento_m = comprimento_m; r.pos = vet3(e.pos) ?? [0, 0, 0]; r.local = txt(e.local); }
      return r;
    }
    case 'adicionar': {
      if (!pecaOk(e.peca)) return null;
      return { ...r0, peca: e.peca, ancora: 'fixo', pos: vet3(e.pos) ?? [0, 0, 0], rot: vet3(e.rot, 360) ?? [0, 0, 0], matriz: matriz(e.matriz) };
    }
    case 'remover': {
      if (!pecaOk(e.peca)) return null;
      return { ...r0, peca: e.peca, chave: txt(e.chave, '', 60), n: Math.round(num(e.n, 1, 1e6, 1)) };
    }
    case 'mover': {
      const m = matriz(e.matriz);
      if (!pecaOk(e.peca) || !m || !e.chave) return null;
      return { ...r0, peca: e.peca, chave: txt(e.chave, '', 60), matriz: m };
    }
    case 'quantidade': {
      if (!pecaOk(e.peca)) return null;
      const q = num(e.qtd, 0, 1e7, null);
      return q === null ? null : { ...r0, peca: e.peca, qtd: Math.round(q) };
    }
    case 'material': {
      if (!pecaOk(e.peca) || !MAT[e.de] || !MAT[e.para] || e.de === e.para || !MAT[e.para].densidade) return null;
      return { ...r0, peca: e.peca, de: e.de, para: e.para };
    }
    case 'externo': {
      if (typeof e.modelo !== 'string' || !/^[0-9a-f]{8}$/.test(e.modelo)) return null;
      // material cobrado por volume (precisa ter densidade e preço); null = sem custo de material
      const material = typeof e.material === 'string' && MAT[e.material]?.densidade ? e.material : null;
      return {
        ...r0, modelo: e.modelo, ancora: 'fixo',
        pos: vet3(e.pos) ?? [0, 0, 0], rot: vet3(e.rot, 360) ?? [0, 0, 0], matriz: matriz(e.matriz),
        escala: num(e.escala, 0.001, 1000, 1),
        material,
        preco_usd: e.preco_usd != null ? num(e.preco_usd, 0, 1e10, null) : null,
        sistema: sistema(e.sistema, base.sistemas[base.sistemas.length - 1]),
        qtd: Math.round(num(e.qtd, 1, 10000, 1)),
      };
    }
  }
  return null;
}

/** Chaves de preço que o cliente pode trocar: materiais com preço e peças com preço por unidade. */
export function chavesDePreco(base) {
  const r = {};
  for (const [k, m] of Object.entries(base.materiais)) if (k !== '_meta' && m?.preco) r[k] = m.preco;
  for (const p of base.pecas) if (p.preco_un != null) r[`componentes:${p.id}`] = { usd: p.preco_un, por: 'un' };
  return r;
}

/**
 * Valida um projeto vindo de fora (arquivo, link, localStorage) contra a base atual. Nunca executa nada:
 * só copia campos conhecidos, com tipos e limites. O pacote (se vier) é tratado antes, por quem chama.
 * Devolve { projeto, avisos }.
 */
export function validarProjeto(obj, base) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('O arquivo não é um projeto do Orçamento 3D.');
  if (obj.formato !== FORMATO) throw new Error('Formato desconhecido (esperado "orcamento-3d").');
  const avisos = [];
  if (+obj.versao > VERSAO) avisos.push(`Projeto feito numa versão mais nova (v${num(obj.versao, 0, 1e6, 0)}); campos novos foram ignorados.`);
  const p = novoProjeto(base);
  p.nome = txt(obj.nome, p.nome).trim() || p.nome;
  p.autor = txt(obj.autor);
  if (typeof obj.criado === 'string' && obj.criado.length < 40 && !isNaN(Date.parse(obj.criado))) p.criado = obj.criado;
  if (typeof obj.atualizado === 'string' && obj.atualizado.length < 40 && !isNaN(Date.parse(obj.atualizado))) p.atualizado = obj.atualizado;
  const chaves = chavesDePreco(base);
  if (obj.precos && typeof obj.precos === 'object') {
    for (const [mat, pr] of Object.entries(obj.precos).slice(0, 500)) {
      const ref = chaves[mat];
      const usd = num(pr?.usd, 0, 1e10, null);
      if (!ref || usd === null) { avisos.push(`Preço ignorado: ${String(mat).slice(0, 40)}.`); continue; }
      p.precos[mat] = { usd, por: ref.por, nota: txt(pr.nota) };
    }
  }
  p.cambio_brl = obj.cambio_brl != null ? num(obj.cambio_brl, 0.01, 1000, null) : null;
  const eds = Array.isArray(obj.edicoes) ? obj.edicoes.slice(0, MAX_EDICOES) : [];
  if (Array.isArray(obj.edicoes) && obj.edicoes.length > MAX_EDICOES) avisos.push(`Só as primeiras ${MAX_EDICOES} edições foram lidas.`);
  const ids = new Set();
  let descartadas = 0;
  for (const e of eds) {
    const v = validarEdicao(e, base);
    if (!v) { descartadas++; continue; }
    while (ids.has(v.id)) v.id = novoId();
    ids.add(v.id);
    p.edicoes.push(v);
  }
  if (descartadas) avisos.push(`${descartadas} edição(ões) inválida(s) ou com peça desconhecida foram descartadas.`);
  // modelos 3D extras: só base64 de até 4 MB, com o hash conferido (o conteúdo é lido depois pelo GLTFLoader, como dado)
  if (obj.modelos && typeof obj.modelos === 'object') {
    for (const [h, m] of Object.entries(obj.modelos).slice(0, MAX_MODELOS)) {
      const d = m?.dados;
      if (typeof d !== 'string' || d.length > MAX_MODELO_BYTES * 1.37 + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(d) || fnv(d) !== h) {
        avisos.push(`Modelo 3D ignorado (dados inválidos): ${txt(m?.nome, String(h)).slice(0, 40)}.`);
        continue;
      }
      p.modelos[h] = { nome: txt(m.nome, 'modelo') || 'modelo', dados: d };
    }
  }
  const faltam = new Set(p.edicoes.filter((e) => e.tipo === 'externo' && !p.modelos[e.modelo]).map((e) => e.modelo));
  if (faltam.size) avisos.push(`${faltam.size} modelo(s) 3D extra(s) não vieram junto (o link não leva modelos): aparecem como caixas roxas e ficam fora do cálculo.`);
  const bh = obj.base?.hash;
  if (typeof bh === 'string' && /^[0-9a-f]{8}$/.test(bh)) {
    if (obj.base?.biblioteca && obj.base.biblioteca !== base.biblioteca) avisos.push('Projeto feito com outra versão da biblioteca de materiais; os números foram recalculados com a atual.');
  }
  return { projeto: p, avisos };
}

/** Confere se o projeto foi feito para esta base (mesmo pacote). */
export const mesmaBase = (obj, base) => obj?.base?.hash === base.id;

export const serializar = (p) => JSON.stringify(p, null, 1);

/** Lê texto JSON (com limite de tamanho). Devolve o objeto cru: quem chama decide se é pacote ou projeto. */
export function lerJSON(texto, max = MAX_ARQUIVO) {
  if (typeof texto !== 'string' || texto.length > max) throw new Error(`Arquivo grande demais (máx. ${Math.round(max / 1e6)} MB).`);
  try { return JSON.parse(texto); } catch { throw new Error('O arquivo não é um JSON válido (corrompido ou incompleto).'); }
}

// ---------- link compartilhável: deflate-raw + base64url ----------
const b64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const deB64url = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
async function fluxo(bytes, transform) {
  const resp = new Response(new Blob([bytes]).stream().pipeThrough(transform));
  return new Uint8Array(await resp.arrayBuffer());
}
/** Projeto -> texto curto para o hash da URL. O link não leva o pacote nem os modelos 3D extras. */
export async function comprimir(p) {
  const enxuto = JSON.stringify({ ...p, modelos: undefined, pacote: undefined }, (k, v) => (v === null || v === '' ? undefined : v));
  return b64url(await fluxo(new TextEncoder().encode(enxuto), new CompressionStream('deflate-raw')));
}
/** Texto do link -> objeto cru (validar depois com validarProjeto). */
export async function descomprimir(s) {
  if (typeof s !== 'string' || s.length > 2e6 || !/^[\w-]+$/.test(s)) throw new Error('Link inválido.');
  let bytes;
  try { bytes = await fluxo(deB64url(s), new DecompressionStream('deflate-raw')); } catch { throw new Error('Link corrompido ou incompleto.'); }
  if (bytes.length > 5e6) throw new Error('Projeto do link grande demais.');
  return lerJSON(new TextDecoder().decode(bytes), 5e6);
}

// ---------- histórico (desfazer/refazer) ----------
// Os modelos extras ficam fora das fotos do histórico (são grandes); quem desfaz mantém os modelos atuais.
const semModelos = (p) => serializar({ ...p, modelos: undefined });
export function criarHistorico(inicial) {
  const pilha = [semModelos(inicial)];
  let i = 0;
  return {
    registrar(p) {
      const s = semModelos(p);
      if (s === pilha[i]) return;
      pilha.splice(i + 1);
      pilha.push(s);
      if (pilha.length > 200) pilha.shift();
      i = pilha.length - 1;
    },
    desfazer: () => (i > 0 ? JSON.parse(pilha[--i]) : null),
    refazer: () => (i < pilha.length - 1 ? JSON.parse(pilha[++i]) : null),
    podeDesfazer: () => i > 0,
    podeRefazer: () => i < pilha.length - 1,
  };
}

// ---------- autosave (opcional: a página funciona sem ele) ----------
/** Salva o projeto (com o pacote, se couber). Devolve 'completo', 'sem-pacote' ou false. */
export function salvarLocal(p, pacote) {
  try { localStorage.setItem(CHAVE_LOCAL, serializar({ ...p, pacote })); return 'completo'; } catch { /* cheio */ }
  try { localStorage.setItem(CHAVE_LOCAL, serializar({ ...p, pacote: undefined, modelos: {} })); return 'sem-pacote'; } catch { return false; }
}
export function lerLocal() {
  try {
    const s = localStorage.getItem(CHAVE_LOCAL);
    return s ? lerJSON(s) : null;
  } catch { return null; }
}
export function limparLocal() {
  try { localStorage.removeItem(CHAVE_LOCAL); } catch { /* sem armazenamento */ }
}
