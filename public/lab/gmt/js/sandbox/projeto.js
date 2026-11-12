// Projeto do Sandbox = base (registro de peças + dados) + lista de edições. Nunca altera parts.js nem os JSON.
// Este módulo é só dados: criar, validar, serializar, comprimir para link, histórico e autosave.
import { PECA, SISTEMAS, CATEGORIAS_CABO, INSTALACOES } from '../model/parts.js';
import { dados, materiais } from '../data.js';

export const FORMATO = 'gmt-sandbox';
export const VERSAO = 1;
export const ANCORAS = ['fixo', 'az', 'el', 'domo'];
export const TIPOS = ['cabo', 'adicionar', 'remover', 'mover', 'quantidade', 'parametro', 'material', 'externo'];
const CHAVE_LOCAL = 'gmt-sandbox-projeto';
const MAX_EDICOES = 400;
const MAX_PONTOS = 300;
const MAX_TEXTO = 140;
export const MAX_MODELO_BYTES = 4 * 1024 * 1024; // .glb
export const MAX_MODELOS = 6;
const MAX_ARQUIVO = 6 * MAX_MODELO_BYTES * 1.4 + 2e6; // modelos em base64 + edições

/** Hash FNV-1a (32 bits, hex) de um texto. */
export function fnv(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Assinatura dos dados da base (gmt-data.json + materials.json): muda quando a base muda. */
export const assinaturaBase = () => fnv(JSON.stringify(dados()) + JSON.stringify(materiais()));

export const novoId = () => 'e' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export function novoProjeto() {
  const agora = new Date().toISOString();
  return {
    formato: FORMATO, versao: VERSAO,
    nome: 'Meu projeto', autor: '',
    criado: agora, atualizado: agora,
    base: { assinatura: assinaturaBase(), data: agora.slice(0, 10) },
    precos: {}, cambio_brl: null,
    edicoes: [],
    modelos: {},
  };
}

// ---------- validação (tudo o que vem de arquivo ou link passa por aqui) ----------
const num = (x, min, max, padrao = null) => {
  const v = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN;
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao;
};
const txt = (x, padrao = '') => (typeof x === 'string' ? x.slice(0, MAX_TEXTO) : padrao);
const vet3 = (v, lim = 3000) => (Array.isArray(v) && v.length === 3 && v.every((c) => Number.isFinite(+c)) ? v.map((c) => num(+c, -lim, lim, 0)) : null);
const matriz = (m) => (Array.isArray(m) && m.length === 16 && m.every((c) => Number.isFinite(+c)) ? m.map((c) => num(+c, -1e4, 1e4, 0)) : null);
const pecaOk = (id) => typeof id === 'string' && !!PECA[id] && !PECA[id].oculto;

function validarParam(peca, valores) {
  const defs = PECA[peca]?.parametros ?? [];
  const r = {};
  for (const d of defs) {
    const v = num(valores?.[d.chave], d.min, d.max, null);
    if (v !== null) r[d.chave] = v;
  }
  return Object.keys(r).length ? r : null;
}

/** Valida e normaliza uma edição. Devolve null se não der para aproveitar. */
export function validarEdicao(e) {
  if (!e || typeof e !== 'object' || !TIPOS.includes(e.tipo)) return null;
  const base = { id: typeof e.id === 'string' && /^[\w-]{1,24}$/.test(e.id) ? e.id : novoId(), tipo: e.tipo, ativo: e.ativo !== false, nome: txt(e.nome) };
  const MAT = materiais();
  switch (e.tipo) {
    case 'cabo': {
      const pontos = Array.isArray(e.pontos) ? e.pontos.slice(0, MAX_PONTOS).map((p) => vet3(p)).filter(Boolean) : [];
      const comprimento_m = e.comprimento_m != null ? num(e.comprimento_m, 0, 100000, null) : null;
      if (pontos.length < 2 && comprimento_m === null) return null;
      const r = {
        ...base,
        categoria: CATEGORIAS_CABO[e.categoria] ? e.categoria : 'energia',
        ancora: ANCORAS.includes(e.ancora) ? e.ancora : 'fixo',
        sistema: SISTEMAS.includes(e.sistema) ? e.sistema : 'Instrumentação',
        feixe: Math.round(num(e.feixe, 1, 500, 1)),
        folga_pct: num(e.folga_pct, 0, 200, 0),
        eletrocalha: e.eletrocalha && typeof e.eletrocalha === 'object' ? { largura_m: num(e.eletrocalha.largura_m, 0.05, 2, 0.3) } : null,
        instalacao: INSTALACOES[e.instalacao] ? e.instalacao : 'estrutura',
      };
      if (e.rota && typeof e.rota === 'object') r.rota = { origem: txt(e.rota.origem).slice(0, 40), destino: txt(e.rota.destino).slice(0, 40) };
      if (pontos.length >= 2) r.pontos = pontos;
      else { r.comprimento_m = comprimento_m; r.pos = vet3(e.pos) ?? [0, 0, 0]; r.subsistema = txt(e.subsistema); }
      return r;
    }
    case 'adicionar': {
      if (!pecaOk(e.peca)) return null;
      return { ...base, peca: e.peca, ancora: ANCORAS.includes(e.ancora) ? e.ancora : 'fixo', pos: vet3(e.pos) ?? [0, 0, 0], rot: vet3(e.rot, 360) ?? [0, 0, 0], matriz: matriz(e.matriz), opcoes: validarParam(e.peca, e.opcoes) };
    }
    case 'remover': {
      if (!pecaOk(e.peca)) return null;
      return { ...base, peca: e.peca, chave: txt(e.chave), n: Math.round(num(e.n, 1, 1e6, 1)) };
    }
    case 'mover': {
      const m = matriz(e.matriz);
      if (!pecaOk(e.peca) || !m || !e.chave) return null;
      return { ...base, peca: e.peca, chave: txt(e.chave), matriz: m };
    }
    case 'quantidade': {
      if (!pecaOk(e.peca)) return null;
      const q = num(e.qtd, 0, 1e7, null);
      return q === null ? null : { ...base, peca: e.peca, qtd: Math.round(q) };
    }
    case 'parametro': {
      if (!pecaOk(e.peca)) return null;
      const v = validarParam(e.peca, e.valores);
      return v ? { ...base, peca: e.peca, valores: v } : null;
    }
    case 'material': {
      if (!pecaOk(e.peca) || !MAT[e.de] || !MAT[e.para] || e.de === e.para) return null;
      return { ...base, peca: e.peca, de: e.de, para: e.para };
    }
    case 'externo': {
      if (typeof e.modelo !== 'string' || !/^[0-9a-f]{8}$/.test(e.modelo)) return null;
      // material cobrado por volume (precisa ter densidade e preço); null = sem custo de material
      const material = typeof e.material === 'string' && MAT[e.material]?.densidade ? e.material : null;
      return {
        ...base, modelo: e.modelo,
        ancora: ANCORAS.includes(e.ancora) ? e.ancora : 'fixo',
        pos: vet3(e.pos) ?? [0, 0, 0], rot: vet3(e.rot, 360) ?? [0, 0, 0], matriz: matriz(e.matriz),
        escala: num(e.escala, 0.001, 1000, 1),
        material,
        preco_usd: e.preco_usd != null ? num(e.preco_usd, 0, 1e10, null) : null,
        sistema: SISTEMAS.includes(e.sistema) ? e.sistema : 'Apoio',
        qtd: Math.round(num(e.qtd, 1, 10000, 1)),
      };
    }
  }
  return null;
}

/**
 * Valida um projeto vindo de fora (arquivo, link, localStorage). Nunca executa nada do arquivo:
 * só copia campos conhecidos, com tipos e limites. Devolve { projeto, avisos }.
 */
export function validarProjeto(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Arquivo não é um projeto do Sandbox.');
  if (obj.formato !== FORMATO) throw new Error('Formato desconhecido (esperado "gmt-sandbox").');
  const avisos = [];
  if (+obj.versao > VERSAO) avisos.push(`Projeto feito numa versão mais nova do Sandbox (v${obj.versao}); campos novos foram ignorados.`);
  const p = novoProjeto();
  p.nome = txt(obj.nome, p.nome) || p.nome;
  p.autor = txt(obj.autor);
  if (typeof obj.criado === 'string' && !isNaN(Date.parse(obj.criado))) p.criado = obj.criado;
  if (typeof obj.atualizado === 'string' && !isNaN(Date.parse(obj.atualizado))) p.atualizado = obj.atualizado;
  const MAT = materiais();
  if (obj.precos && typeof obj.precos === 'object') {
    for (const [mat, pr] of Object.entries(obj.precos)) {
      const base = MAT[mat]?.preco;
      const usd = num(pr?.usd, 0, 1e10, null);
      if (!base || usd === null) { avisos.push(`Preço ignorado: ${String(mat).slice(0, 40)}.`); continue; }
      p.precos[mat] = { usd, por: base.por, nota: txt(pr.nota) };
    }
  }
  p.cambio_brl = obj.cambio_brl != null ? num(obj.cambio_brl, 0.01, 1000, null) : null;
  const eds = Array.isArray(obj.edicoes) ? obj.edicoes.slice(0, MAX_EDICOES) : [];
  if (Array.isArray(obj.edicoes) && obj.edicoes.length > MAX_EDICOES) avisos.push(`Só as primeiras ${MAX_EDICOES} edições foram lidas.`);
  const ids = new Set();
  let descartadas = 0;
  for (const e of eds) {
    const v = validarEdicao(e);
    if (!v) { descartadas++; continue; }
    while (ids.has(v.id)) v.id = novoId();
    ids.add(v.id);
    p.edicoes.push(v);
  }
  if (descartadas) avisos.push(`${descartadas} edição(ões) inválida(s) ou com peça desconhecida foram descartadas.`);
  // modelos 3D importados: só base64 de até 4 MB, com o hash conferido (o conteúdo é lido depois pelo GLTFLoader, como dado)
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
  if (faltam.size) avisos.push(`${faltam.size} modelo(s) 3D não vieram junto (o link não leva modelos): as peças aparecem como caixas roxas e o material delas não é medido.`);
  const bs = obj.base?.assinatura;
  if (typeof bs === 'string') {
    p.base = { assinatura: bs.slice(0, 16), data: txt(obj.base.data).slice(0, 10) };
    if (bs !== assinaturaBase()) avisos.push(`Projeto feito sobre outra versão dos dados (${p.base.data || 'data desconhecida'}); os números foram recalculados com a base atual.`);
  }
  return { projeto: p, avisos };
}

export const serializar = (p) => JSON.stringify(p, null, 1);

/** Lê texto JSON de um projeto (com limite de tamanho). */
export function lerTexto(texto) {
  if (typeof texto !== 'string' || texto.length > MAX_ARQUIVO) throw new Error(`Arquivo grande demais (máx. ${Math.round(MAX_ARQUIVO / 1e6)} MB).`);
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('O arquivo não é um JSON válido.'); }
  return validarProjeto(obj);
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
/** Projeto -> texto curto para o hash da URL (sem espaços nem campos vazios). */
export async function comprimir(p) {
  // o link não leva os modelos 3D importados (grandes demais para uma URL)
  const enxuto = JSON.stringify({ ...p, modelos: undefined }, (k, v) => (v === null || v === '' ? undefined : v));
  return b64url(await fluxo(new TextEncoder().encode(enxuto), new CompressionStream('deflate-raw')));
}
export async function descomprimir(s) {
  if (typeof s !== 'string' || s.length > 2e6 || !/^[\w-]+$/.test(s)) throw new Error('Link inválido.');
  let bytes;
  try { bytes = await fluxo(deB64url(s), new DecompressionStream('deflate-raw')); } catch { throw new Error('Link corrompido ou incompleto.'); }
  if (bytes.length > 5e6) throw new Error('Projeto do link grande demais.');
  return lerTexto(new TextDecoder().decode(bytes));
}

// ---------- histórico (desfazer/refazer) ----------
// Os modelos importados ficam fora das fotos do histórico (são grandes e só crescem); quem desfaz mantém os modelos atuais.
const semModelos = (p) => serializar({ ...p, modelos: undefined });
export function criarHistorico(inicial) {
  const pilha = [semModelos(inicial)];
  let i = 0;
  return {
    /** Registra o estado atual (depois de uma mudança). */
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
export function salvarLocal(p) {
  try { localStorage.setItem(CHAVE_LOCAL, serializar(p)); return true; } catch { return false; }
}
export function lerLocal() {
  try {
    const s = localStorage.getItem(CHAVE_LOCAL);
    return s ? lerTexto(s) : null;
  } catch { return null; }
}
export function limparLocal() {
  try { localStorage.removeItem(CHAVE_LOCAL); } catch { /* sem armazenamento */ }
}
