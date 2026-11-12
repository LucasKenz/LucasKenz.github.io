// Pacote de projeto (.orc3d-pacote.json) -> base. O pacote é o que a pessoa monta uma vez:
// catálogo de peças, materiais, preços, marcação dos nós do modelo e o próprio modelo (.glb em base64).
// Tudo passa por validação (campos conhecidos, tipos, faixas, tamanhos); o modelo é lido como dado.
import * as THREE from 'three';
import { fnv, num, txt } from '../nucleo/projeto.js';
import { pecasOcultas } from '../nucleo/pecas-editor.js';
import { medirPeca } from '../nucleo/geom.js';
import { clonarOriginal } from '../nucleo/cinza.js';
import { parseGLB, bufferDe } from '../nucleo/modelos.js';
import { caminhos, nomeBruto } from '../formatos/comum.js';

export const FORMATO_PACOTE = 'orcamento-3d-pacote';
export const VERSAO_PACOTE = 1;
export const MAX_PACOTE = 40e6;          // caracteres do arquivo
export const MAX_PECAS = 300;
export const MAX_NOS = 20000;
export const UNIDADES_MAT = ['m³', 't', 'kg', 'm²', 'm', 'un'];
const RESERVADOS = new Set(pecasOcultas().map((p) => p.id));
const RE_ID = /^[a-z0-9-]{1,40}$/;
const RE_MAT = /^[a-z0-9_]{1,40}$/;
const RE_B64 = /^[A-Za-z0-9+/]*={0,2}$/;

function validarMaterial(k, m) {
  if (!m || typeof m !== 'object') return null;
  const r = { nome: txt(m.nome, k, 80).trim() || k, unidade: UNIDADES_MAT.includes(m.unidade) ? m.unidade : 'm³', confidence: 'estimado', fonte: 'pacote' };
  const d = num(m.densidade, 1, 30000, null); if (d !== null) r.densidade = d;
  const da = num(m.densidade_area, 0, 2000, null); if (da !== null) r.densidade_area = da;
  const km = num(m.kg_m, 0, 10000, null); if (km !== null) r.kg_m = km;
  if (typeof m.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(m.cor)) r.cor = m.cor;
  if (m.spec) r.spec = txt(m.spec, '', 140);
  if (m.nota) r.nota = txt(m.nota, '', 300);
  if (m.preco && typeof m.preco === 'object') {
    const usd = num(m.preco.usd, 0, 1e9, null);
    const por = UNIDADES_MAT.includes(m.preco.por) ? m.preco.por : r.unidade;
    if (usd !== null) r.preco = { usd, por, confidence: 'estimado', nota: txt(m.preco.nota, 'Preço definido no pacote.', 300) };
  }
  return r;
}

/**
 * Valida um pacote vindo de fora. Lança erro se não der para aproveitar; devolve { pacote, avisos }.
 * biblioteca: data/materiais.json (os materiais do pacote somam-se a ela; chave repetida = vale a do pacote).
 */
export function validarPacote(obj, biblioteca) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('O arquivo não é um pacote do Orçamento 3D.');
  if (obj.formato !== FORMATO_PACOTE) throw new Error('Formato desconhecido (esperado "orcamento-3d-pacote").');
  const avisos = [];
  if (+obj.versao > VERSAO_PACOTE) avisos.push('Pacote feito numa versão mais nova; campos novos foram ignorados.');
  const p = { formato: FORMATO_PACOTE, versao: VERSAO_PACOTE, nome: txt(obj.nome, 'Projeto sem nome').trim() || 'Projeto sem nome', autor: txt(obj.autor) };
  const o = obj.origem && typeof obj.origem === 'object' ? obj.origem : {};
  p.origem = { arquivo: txt(o.arquivo, '', 120), formato: txt(o.formato, '', 10), unidade_original: txt(o.unidade_original, '', 10), escala: num(o.escala, 1e-6, 1e6, 1) };
  p.cambio_brl = num(obj.cambio_brl, 0.01, 1000, null);
  // sistemas
  const sis = Array.isArray(obj.sistemas) ? obj.sistemas.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 40)) : [];
  p.sistemas = [...new Set(sis)].slice(0, 20);
  if (!p.sistemas.length) p.sistemas = ['Geral'];
  // materiais
  p.materiais = {};
  if (obj.materiais && typeof obj.materiais === 'object') {
    for (const [k, m] of Object.entries(obj.materiais).slice(0, 200)) {
      if (!RE_MAT.test(k) || k === '_meta') { avisos.push(`Material ignorado (chave inválida): ${String(k).slice(0, 40)}.`); continue; }
      const v = validarMaterial(k, m);
      if (v) p.materiais[k] = v; else avisos.push(`Material ignorado: ${k}.`);
    }
  }
  const MAT = { ...biblioteca, ...p.materiais };
  const matOk = (k) => typeof k === 'string' && k !== '_meta' && !!MAT[k];
  // peças
  p.pecas = [];
  const ids = new Set();
  const lista = Array.isArray(obj.pecas) ? obj.pecas : [];
  if (lista.length > MAX_PECAS) avisos.push(`Só as primeiras ${MAX_PECAS} peças foram lidas.`);
  for (const q of lista.slice(0, MAX_PECAS)) {
    if (!q || typeof q !== 'object' || typeof q.id !== 'string' || !RE_ID.test(q.id) || RESERVADOS.has(q.id) || ids.has(q.id)) {
      avisos.push(`Peça ignorada (id inválido ou repetido): ${String(q?.id ?? '?').slice(0, 40)}.`);
      continue;
    }
    ids.add(q.id);
    let sistema = typeof q.sistema === 'string' ? q.sistema.trim().slice(0, 40) : '';
    if (!p.sistemas.includes(sistema)) {
      if (sistema && p.sistemas.length < 20) p.sistemas.push(sistema); else sistema = p.sistemas[0];
    }
    const r = { id: q.id, nome: txt(q.nome, q.id, 80).trim() || q.id, sistema };
    if (q.material != null && q.material !== '') {
      if (matOk(q.material)) r.material = q.material; else avisos.push(`Peça ${q.id}: material "${String(q.material).slice(0, 40)}" não existe; ficou sem material.`);
    }
    const qtd = num(q.qtd, 0, 1e7, null); if (qtd !== null) r.qtd = Math.round(qtd);
    const massa = num(q.massa_t, 0, 1e6, null); if (massa !== null && massa > 0) r.massa_t = massa;
    const taxa = num(q.taxa, 0, 1000, null); if (taxa !== null && taxa > 0) r.taxa = taxa;
    const pu = num(q.preco_un, 0, 1e10, null); if (pu !== null) r.preco_un = pu;
    if (q.descricao) r.descricao = txt(q.descricao, '', 500);
    if (Array.isArray(q.extras)) {
      const ex = [];
      for (const e of q.extras.slice(0, 20)) {
        if (!Array.isArray(e) || !matOk(e[0])) { avisos.push(`Peça ${q.id}: item extra ignorado.`); continue; }
        const v = num(e[1], 0, 1e9, null);
        if (v === null) continue;
        ex.push([e[0], v, txt(e[2], '', 140)]);
      }
      if (ex.length) r.extras = ex;
    }
    p.pecas.push(r);
  }
  // marcação: caminho do nó -> { peca, material? }
  p.marcacao = {};
  if (obj.marcacao && typeof obj.marcacao === 'object') {
    const ent = Object.entries(obj.marcacao);
    if (ent.length > MAX_NOS) avisos.push(`Só os primeiros ${MAX_NOS} nós marcados foram lidos.`);
    let ruins = 0;
    for (const [c, m] of ent.slice(0, MAX_NOS)) {
      if (typeof c !== 'string' || c.length > 600 || !m || typeof m !== 'object' || !ids.has(m.peca)) { ruins++; continue; }
      p.marcacao[c] = matOk(m.material) ? { peca: m.peca, material: m.material } : { peca: m.peca };
    }
    if (ruins) avisos.push(`${ruins} marcação(ões) inválida(s) ou de peça desconhecida foram ignoradas.`);
  }
  p.terreno = typeof obj.terreno === 'string' && obj.terreno.length <= 600 ? obj.terreno : null;
  const lst = (a) => (Array.isArray(a) ? a.filter((c) => typeof c === 'string' && c.length <= 600).slice(0, 50) : []);
  p.rotas = { origens: lst(obj.rotas?.origens), destinos: lst(obj.rotas?.destinos) };
  // modelo .glb em base64, com hash conferido
  const md = obj.modelo;
  if (md && typeof md === 'object') {
    if (md.formato !== 'glb' || typeof md.dados !== 'string' || md.dados.length > MAX_PACOTE || !RE_B64.test(md.dados)) throw new Error('O modelo 3D do pacote é inválido (precisa ser .glb em base64).');
    const h = fnv(md.dados);
    if (md.hash != null && md.hash !== h) throw new Error('O modelo 3D do pacote foi alterado ou corrompido (hash não confere).');
    p.modelo = { formato: 'glb', hash: h, dados: md.dados };
  } else {
    p.modelo = null;
    avisos.push('O pacote não tem modelo 3D: só as peças com quantidade e preço entram no orçamento.');
  }
  return { pacote: p, avisos };
}

/** Identidade do pacote (muda quando qualquer coisa do pacote muda). */
export const hashPacote = (p) => fnv(JSON.stringify({ ...p, modelo: p.modelo ? p.modelo.hash : null }));

/** Lê o modelo do pacote e monta a base. */
export async function carregarBase(pacote, biblioteca) {
  const cena = pacote.modelo ? (await parseGLB(bufferDe(pacote.modelo.dados), 'Não foi possível ler o modelo do pacote')).scene : new THREE.Group();
  return montarBase(pacote, biblioteca, cena);
}

/**
 * Monta a base a partir do pacote validado e da cena canônica (o .glb já lido).
 * Interface usada por todo o núcleo:
 * { id, nome, pecas, PECA, sistemas, materiais, construir(id, detalhe, opcoes), medir(id), itensBase(),
 *   cena, pais: { fixo }, terreno?, rotas?, copias }
 */
export function montarBase(pacote, biblioteca, cena) {
  const avisos = [];
  const materiais = { ...biblioteca, ...pacote.materiais };
  cena.updateMatrixWorld(true);
  const { porCaminho, deObjeto } = caminhos(cena);
  // nós marcados (na ordem da árvore, para a numeração das cópias ser estável)
  const marcados = new Map();
  let faltam = 0;
  for (const [c, m] of Object.entries(pacote.marcacao)) {
    const o = porCaminho.get(c);
    if (!o) { faltam++; continue; }
    marcados.set(o, m);
  }
  if (faltam) avisos.push(`${faltam} nó(s) marcado(s) não existem no modelo e foram ignorados.`);
  const copias = new Map(pacote.pecas.map((p) => [p.id, []]));
  const terreno = pacote.terreno ? porCaminho.get(pacote.terreno) ?? null : null;
  if (pacote.terreno && !terreno) avisos.push('O chão marcado no pacote não existe no modelo.');
  let aninhados = 0;
  const visitar = (o, dentro) => {
    const m = marcados.get(o);
    let marca = dentro;
    if (m && dentro) aninhados++;
    else if (m) {
      marca = m;
      o.userData.peca = m.peca;
      copias.get(m.peca).push(o);
    }
    if (o.isMesh) {
      o.userData.compartilhada = true;
      o.castShadow = o.receiveShadow = true;
      if (marca) {
        const def = pacote.pecas.find((p) => p.id === marca.peca);
        o.userData.peca = marca.peca;
        o.userData.mat = marca.material ?? def?.material ?? null;
        o.userData.cenario = false;
      } else {
        o.userData.mat = null;
        o.userData.cenario = true;
      }
    }
    for (const f of o.children) visitar(f, marca);
  };
  for (const f of cena.children) visitar(f, null);
  if (aninhados) avisos.push(`${aninhados} nó(s) marcado(s) dentro de outra cópia foram tratados como parte dela.`);
  if (terreno) terreno.traverse((o) => { if (o.isMesh) { o.userData.terreno = true; o.userData.cenario = true; o.userData.mat = null; } });

  // peças do pacote no formato do núcleo
  const PECA = {};
  for (const p of pacote.pecas) {
    const n = copias.get(p.id).length;
    const extras = (p.extras ?? []).map(([mat, q, nota]) => [mat, q, 'pacote', 'estimado', nota]);
    if (p.preco_un != null) extras.push(['componentes', 1, 'pacote', 'estimado', 'Preço por unidade definido no pacote.']);
    PECA[p.id] = {
      ...p,
      qtd: [p.qtd ?? n, p.qtd != null ? 'pacote' : 'modelo', 'estimado'],
      pesquisado: p.massa_t ? { massa_t: p.massa_t, conf: 'estimado', fonte: 'pacote' } : null,
      extras,
      copias: n,
    };
  }
  for (const h of pecasOcultas()) PECA[h.id] = h;
  const sistemas = [...pacote.sistemas];
  const sistemaCabos = sistemas.find((s) => /instala|eletric|elétric/i.test(s)) ?? sistemas[sistemas.length - 1];

  /** Volume/área por material: média das cópias do modelo (cada cópia na sua escala real). */
  function medir(id) {
    if (!copias.has(id)) return null;
    const cs = copias.get(id);
    const r = {};
    if (!cs.length) return r;
    cena.updateMatrixWorld(true);
    for (const o of cs) {
      for (const [mat, m] of Object.entries(medirPeca(o, true))) {
        const a = (r[mat] ??= { vol: 0, area: 0, comprimento: 0, n: 0, aberta: false });
        a.vol += m.vol / cs.length; a.area += m.area / cs.length; a.comprimento += m.comprimento / cs.length; a.n += m.n;
        if (m.aberta) a.aberta = true;
      }
    }
    return r;
  }

  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  /** Constrói uma peça: as ocultas pelo build; as do pacote = clone da primeira cópia, com a base no centro. */
  function construir(id, detalhe = false, opcoes) {
    const def = PECA[id];
    let g;
    if (def?.build) g = def.build(detalhe, opcoes);
    else {
      g = new THREE.Group();
      const src = copias.get(id)?.[0];
      if (src) {
        cena.updateMatrixWorld(true);
        const c = clonarOriginal(src);
        src.matrixWorld.decompose(_p, _q, _s);
        c.position.set(0, 0, 0); c.quaternion.copy(_q); c.scale.copy(_s);
        c.visible = true; // a cópia original pode estar escondida (removida no editor)
        c.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(c);
        const ctr = box.getCenter(new THREE.Vector3());
        c.position.set(-ctr.x, -box.min.y, -ctr.z);
        c.traverse((m) => { if (m.isMesh) m.userData.mat = m.userData.mat ?? null; });
        g.add(c);
      } else {
        // peça só de catálogo (sem malha): caixa de referência, fora da medição
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8a94b8, roughness: 0.8 }));
        m.userData.mat = null;
        g.add(m);
      }
    }
    g.userData.peca = id;
    g.traverse((o) => { if (o.isMesh) o.userData.peca = id; });
    return g;
  }

  const rotas = { origens: [], destinos: [] };
  for (const k of ['origens', 'destinos']) for (const c of pacote.rotas[k]) {
    const o = porCaminho.get(c);
    if (o) rotas[k].push({ no: c, nome: nomeBruto(o) || c.split('/').pop(), obj: o });
  }

  return {
    id: hashPacote(pacote),
    biblioteca: fnv(JSON.stringify(biblioteca)),
    nome: pacote.nome,
    pacote,
    pecas: pacote.pecas.map((p) => PECA[p.id]),
    PECA, sistemas, sistemaCabos, materiais,
    cambio: pacote.cambio_brl ?? biblioteca._meta?.cambio_brl?.valor ?? 5.4,
    construir, medir,
    itensBase: () => pacote.pecas.map((p) => ({ id: p.id, n: PECA[p.id].qtd[0] })),
    cena, pais: { fixo: cena }, terreno, rotas, copias, caminhos: { porCaminho, deObjeto },
    avisos,
  };
}
