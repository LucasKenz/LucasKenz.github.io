// Montagem do pacote a partir dos arquivos do usuário (o "miolo" do assistente, sem interface):
// leitura -> limpeza da cena -> unidade e eixo -> conversão para .glb (cena canônica) -> peças detectadas
// -> marcação -> catálogo -> materiais -> pacote. A mesma função serve à interface e aos testes.
import * as THREE from 'three';
import { classificar, lerModelo } from '../formatos/index.js';
import { lerCatalogo } from '../formatos/csv.js';
import { UNIDADES, idSugerido, ehGenerico, pareceTerreno, nomeBruto, materialDetectado, caminhos, unidadeSugerida } from '../formatos/comum.js';
import { parseGLB, base64De } from '../nucleo/modelos.js';
import { fnv } from '../nucleo/projeto.js';
import { FORMATO_PACOTE, VERSAO_PACOTE, MAX_NOS, MAX_PECAS } from './pacote.js';
import { slugId } from '../util.js';

export const MAX_TRIS_AVISO = 1.5e6;

// ---------- limpeza da cena lida ----------
/** Remove luzes, câmeras, linhas e pontos; expande instâncias em malhas; troca materiais exóticos por Standard. */
function limpar(cena) {
  const tirar = [];
  const instancias = [];
  cena.traverse((o) => {
    if (o.isLight || o.isCamera || o.isLine || o.isPoints || o.isSprite || o.isBone) tirar.push(o);
    else if (o.isInstancedMesh) instancias.push(o);
    if (o.name && typeof o.userData.nome0 !== 'string') o.userData.nome0 = String(o.name).slice(0, 200);
  });
  for (const o of tirar) o.parent?.remove(o);
  const _m = new THREE.Matrix4();
  for (const im of instancias) {
    const pai = im.parent;
    im.updateMatrix();
    for (let k = 0; k < im.count; k++) {
      im.getMatrixAt(k, _m);
      const m = new THREE.Mesh(im.geometry, im.material);
      m.name = `${im.name || 'instancia'}_${k}`;
      m.userData = { ...im.userData, nome0: `${nomeBruto(im) || 'instancia'}_${k}` };
      _m.premultiply(im.matrix).decompose(m.position, m.quaternion, m.scale);
      pai.add(m);
    }
    pai.remove(im);
  }
  const conv = new Map();
  const padrao = (mat) => {
    if (!mat || mat.isMeshStandardMaterial || mat.isMeshBasicMaterial) return mat ?? new THREE.MeshStandardMaterial({ color: 0xa8b0c0 });
    if (!conv.has(mat)) {
      const s = new THREE.MeshStandardMaterial({
        name: mat.name, color: mat.color ? mat.color.clone() : 0xa8b0c0, map: mat.map ?? null,
        transparent: !!mat.transparent, opacity: mat.opacity ?? 1, side: mat.side ?? THREE.FrontSide,
        roughness: 0.75, metalness: 0.05, vertexColors: !!mat.vertexColors,
      });
      conv.set(mat, s);
    }
    return conv.get(mat);
  };
  cena.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(padrao) : padrao(o.material);
  });
  return cena;
}

function contar(raiz) {
  let nos = 0, tris = 0, malhas = 0;
  raiz.traverse((o) => {
    nos++;
    if (o.isMesh) {
      malhas++;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
    }
  });
  return { nos, tris: Math.round(tris), malhas };
}

/** Prepara uma leitura: cena limpa dentro de um grupo "ajuste" (escala da unidade e giro do eixo). */
export function preparar(leitura) {
  const cena = limpar(leitura.cena);
  const ajuste = new THREE.Group();
  ajuste.name = 'ajuste';
  ajuste.add(cena);
  const c = contar(cena);
  if (!c.malhas) throw new Error(`${leitura.nome}: o arquivo não tem nenhuma malha 3D.`);
  if (c.nos > MAX_NOS) throw new Error(`${leitura.nome}: ${c.nos.toLocaleString('pt-BR')} nós (máx. ${MAX_NOS.toLocaleString('pt-BR')}). Junte objetos repetidos ou divida o modelo.`);
  // tamanho em unidades do arquivo (para sugerir a unidade e o eixo)
  const box = new THREE.Box3().setFromObject(cena);
  const t = box.getSize(new THREE.Vector3());
  const item = { ...leitura, ajuste, ...c, avisos: [...(leitura.avisos ?? [])] };
  if (leitura.fator != null) {
    item.unidade = Object.entries(UNIDADES).find(([, u]) => Math.abs(u.fator - leitura.fator) < 1e-9)?.[0] ?? 'arquivo';
  } else item.unidade = unidadeSugerida(Math.max(t.x, t.y, t.z), leitura.formato);
  item.fatorArquivo = leitura.fator;
  // Z para cima: altura em Z bem maior que em Y, em formatos sem eixo definido
  item.girar = !leitura.eixoDoArquivo && t.z > 3 * t.y && t.z > 1e-9;
  if (c.tris > MAX_TRIS_AVISO) item.avisos.push(`Modelo pesado (${c.tris.toLocaleString('pt-BR')} triângulos; recomendado até 1,5 milhão): a página pode ficar lenta.`);
  aplicarAjuste(item);
  return item;
}

/** Aplica unidade e eixo no grupo "ajuste". */
export function aplicarAjuste(item, { unidade = item.unidade, girar = item.girar } = {}) {
  item.unidade = unidade;
  item.girar = !!girar;
  const f = unidade === 'arquivo' ? item.fatorArquivo ?? 1 : UNIDADES[unidade]?.fator ?? 1;
  item.fator = f;
  item.ajuste.scale.setScalar(f);
  item.ajuste.rotation.set(girar ? -Math.PI / 2 : 0, 0, 0);
  item.ajuste.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(item.ajuste);
  item.tamanho = box.getSize(new THREE.Vector3());
  item.caixa = box;
  return item;
}

/**
 * Converte as leituras numa cena canônica: tudo dentro de "modelo", exportado em .glb (já em metros)
 * e lido de novo. A marcação usa os caminhos dessa cena, que são os mesmos ao reabrir o pacote.
 */
export async function converter(itens) {
  const modelo = new THREE.Group();
  modelo.name = 'modelo';
  let x = null;
  for (const [i, it] of itens.entries()) {
    const g = new THREE.Group();
    g.name = i === 0 ? 'principal' : slugId(it.nome.replace(/\.[a-z0-9]+$/i, '')) || `extra-${i}`;
    g.userData.nome0 = i === 0 ? 'principal' : it.nome.replace(/\.[a-z0-9]+$/i, '');
    it.ajuste.position.set(0, 0, 0);
    g.add(it.ajuste);
    if (i > 0) {
      // modelos extras entram ao lado do principal, apoiados no chão
      it.ajuste.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(it.ajuste);
      g.position.set(x - b.min.x + 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    }
    modelo.add(g);
    modelo.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    x = Math.max(x ?? -Infinity, bb.max.x);
  }
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  let glb;
  try { glb = await new GLTFExporter().parseAsync(modelo, { binary: true, onlyVisible: false, maxTextureSize: 2048 }); }
  catch (e) { throw new Error(`Não foi possível converter o modelo para .glb: ${e?.message ?? e}.`); }
  const cena = (await parseGLB(glb, 'Não foi possível reler o modelo convertido')).scene;
  for (const it of itens) it.ajuste.removeFromParent();
  return { glb, cena };
}

// ---------- detecção das peças ----------
const temMalha = (o) => { let s = false; o.traverse((m) => { if (m.isMesh) s = true; }); return s; };
function trisDe(o) { let t = 0; o.traverse((m) => { if (m.isMesh) { const g = m.geometry; t += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3; } }); return Math.round(t); }
function primeiroMaterial(o) { let r = ''; o.traverse((m) => { if (!r && m.isMesh) r = materialDetectado(m); }); return r; }

/**
 * Peças candidatas na cena canônica. catalogo: Set de ids conhecidos (ou null).
 * Regras: id do catálogo vira cópia; nome de chão vira terreno; malha com nome vira cópia; grupo com nome
 * vira uma cópia quando repete entre irmãos ou quando os filhos não têm nome próprio; senão, desce.
 * Devolve { candidatos: [{ obj, caminho, id, tris, material }], terreno, semNome: [{ obj, caminho, tris }] }.
 */
export function detectar(cena, catalogo = null) {
  const { deObjeto } = caminhos(cena);
  const candidatos = [], semNome = [];
  let terreno = null;
  const temDoCatalogo = (o) => { if (!catalogo) return false; let s = false; o.traverse((f) => { if (f !== o && catalogo.has(idSugerido(f))) s = true; }); return s; };
  const add = (o, id) => candidatos.push({ obj: o, caminho: deObjeto.get(o), id, tris: trisDe(o), material: primeiroMaterial(o) });
  const visitar = (o) => {
    if (!temMalha(o)) return;
    const id = idSugerido(o);
    if (catalogo?.has(id)) { add(o, id); return; }
    if (!terreno && pareceTerreno(id)) { terreno = { obj: o, caminho: deObjeto.get(o) }; return; }
    if (o.isMesh) {
      if (!ehGenerico(id)) add(o, id); else semNome.push({ obj: o, caminho: deObjeto.get(o), tris: trisDe(o) });
      return;
    }
    if (!ehGenerico(id) && !temDoCatalogo(o)) {
      const irmaos = (o.parent?.children ?? []).filter((s) => s !== o && idSugerido(s) === id).length;
      const filhosProprios = o.children.filter((f) => temMalha(f) && !ehGenerico(idSugerido(f)) && idSugerido(f) !== id).length;
      if (irmaos > 0 || filhosProprios === 0) { add(o, id); return; }
    }
    for (const f of o.children) visitar(f);
  };
  for (const f of cena.children) visitar(f);
  return { candidatos, terreno, semNome };
}

// ---------- estado do assistente ----------
const ALIAS = { aco: 'aco_estrutural', steel: 'aco_estrutural', concrete: 'concreto', concreto_armado: 'concreto', aluminum: 'aluminio', aluminium: 'aluminio', inox: 'aco_inox', stainless: 'aco_inox', copper: 'cobre' };
/** Material detectado no arquivo -> chave conhecida (ou a própria chave, que aparece como "falta"). */
export function mapearMaterial(chave, MAT) {
  if (!chave) return null;
  if (MAT[chave]) return chave;
  if (ALIAS[chave] && MAT[ALIAS[chave]]) return ALIAS[chave];
  return chave;
}
const nomeBonito = (id, obj) => {
  const n = obj ? String(nomeBruto(obj)).replace(/(\.\d+|_\d+|\s*\(\d+\)|\s*#\d+)$/, '').split('__').pop().trim() : '';
  const t = n && !/^\w+\d+$/.test(n) ? n : id.replace(/-/g, ' ');
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 80);
};

export function novoEstado(biblioteca) {
  return {
    biblioteca,
    itens: [], canon: null, det: null,
    marcas: new Map(),          // caminho -> id da peça (cópia)
    catalogo: new Map(),        // id -> { id, nome, sistema, material, qtd, massa_t, taxa, preco_un, extras, descricao }
    sistemas: ['Fundação', 'Estrutura', 'Cobertura', 'Instalações'],
    materiais: {},              // materiais do pacote (criados ou ajustados)
    terreno: null,
    rotas: { origens: [], destinos: [] },
    nome: '', autor: '', cambio: null,
    avisos: [],
    temCatalogo: false,
  };
}
export const MAT = (estado) => ({ ...estado.biblioteca, ...estado.materiais });

/** Lê os arquivos (3D, .csv, pacote .json como catálogo) e prepara as leituras. */
export async function lerArquivos(estado, arquivos) {
  const c = classificar(arquivos);
  estado.avisos.push(...c.recusados);
  if (!c.modelos.length) throw new Error(c.recusados.length ? c.recusados.join(' ') : 'Nenhum arquivo 3D (.glb, .gltf, .obj, .fbx, .dae, .stl, .ply).');
  const itens = [];
  for (const f of c.modelos) itens.push(preparar(await lerModelo(f, c.apoio)));
  estado.itens = itens;
  estado.nome ||= itens[0].nome.replace(/\.[a-z0-9]+$/i, '');
  for (const f of c.csv) {
    const r = lerCatalogo(await f.text());
    estado.csv = r;
    estado.avisos.push(...r.avisos);
  }
  return c;
}

/** Converte, detecta e faz a marcação inicial (depois da conferência de unidade e eixo). */
export async function converterEDetectar(estado) {
  estado.canon = await converter(estado.itens);
  estado.det = detectar(estado.canon.cena, estado.temCatalogo || estado.csv ? new Set([...estado.catalogo.keys(), ...(estado.csv?.pecas ?? []).map((p) => p.id)]) : null);
  estado.marcas.clear();
  const comCatalogo = estado.temCatalogo || !!estado.csv;
  const ids = new Set([...estado.catalogo.keys(), ...(estado.csv?.pecas ?? []).map((p) => p.id)]);
  for (const c of estado.det.candidatos) if (!comCatalogo || ids.has(c.id)) estado.marcas.set(c.caminho, c.id);
  estado.terreno = estado.det.terreno?.caminho ?? null;
  sincronizarCatalogo(estado);
  if (estado.csv) aplicarCatalogo(estado, estado.csv.pecas);
}

/** Cópias por peça (pela marcação atual). */
export function copiasPorPeca(estado) {
  const r = new Map();
  for (const id of estado.marcas.values()) r.set(id, (r.get(id) ?? 0) + 1);
  return r;
}

/** Garante uma entrada de catálogo para cada peça marcada (com material detectado, se houver). */
export function sincronizarCatalogo(estado) {
  const M = MAT(estado);
  const { porCaminho } = caminhos(estado.canon.cena);
  for (const [caminho, id] of estado.marcas) {
    if (estado.catalogo.has(id)) continue;
    const obj = porCaminho.get(caminho);
    const det = estado.det.candidatos.find((c) => c.caminho === caminho)?.material ?? '';
    estado.catalogo.set(id, { id, nome: nomeBonito(id, obj), sistema: estado.sistemas[Math.min(1, estado.sistemas.length - 1)], material: mapearMaterial(det, M) });
  }
}

/** Junta um catálogo (.csv ou pacote) ao atual: atualiza os campos que vierem; ids novos entram como peças. */
export function aplicarCatalogo(estado, pecas, { materiais = null, sistemas = null, cambio = null } = {}) {
  if (materiais) Object.assign(estado.materiais, materiais);
  if (sistemas?.length) for (const s of sistemas) if (!estado.sistemas.includes(s)) estado.sistemas.push(s);
  if (cambio) estado.cambio = cambio;
  for (const p of pecas) {
    const id = slugId(p.id);
    if (!id) continue;
    const atual = estado.catalogo.get(id) ?? { id, nome: p.nome ?? id, sistema: estado.sistemas[0] };
    for (const k of ['nome', 'sistema', 'material', 'qtd', 'massa_t', 'taxa', 'preco_un', 'extras', 'descricao']) if (p[k] !== undefined && p[k] !== '') atual[k] = p[k];
    if (atual.sistema && !estado.sistemas.includes(atual.sistema)) estado.sistemas.push(atual.sistema);
    estado.catalogo.set(id, atual);
    // candidatos com este id que estavam fora (cenário) passam a ser peças
    if (estado.det) for (const c of estado.det.candidatos) if (c.id === id && !estado.marcas.has(c.caminho)) estado.marcas.set(c.caminho, id);
  }
  estado.temCatalogo = true;
}

/** Marca malhas (clicadas no 3D) como cópias de uma peça (nova ou existente). */
export function marcarMalhas(estado, objs, id, nome) {
  const pid = slugId(id);
  if (!pid) throw new Error('Dê um id à peça (letras minúsculas, números e "-").');
  const { deObjeto } = caminhos(estado.canon.cena);
  for (const o of objs) {
    const c = deObjeto.get(o);
    if (!c) continue;
    // tira marcas de ancestrais e descendentes (um nó não pode estar dentro de outra cópia)
    for (const k of [...estado.marcas.keys()]) if (k === c || k.startsWith(c + '/') || c.startsWith(k + '/')) estado.marcas.delete(k);
    estado.marcas.set(c, pid);
  }
  if (!estado.catalogo.has(pid)) estado.catalogo.set(pid, { id: pid, nome: (nome || nomeBonito(pid)).slice(0, 80), sistema: estado.sistemas[Math.min(1, estado.sistemas.length - 1)], material: null });
}

/** Chaves de material usadas pelo catálogo que não existem (nem na biblioteca, nem no pacote). */
export function materiaisFaltando(estado) {
  const M = MAT(estado), usados = new Set(copiasPorPeca(estado).keys());
  const r = new Map();
  for (const p of estado.catalogo.values()) {
    const em = usados.has(p.id) || p.qtd > 0;
    if (!em) continue;
    if (p.material && !M[p.material]) r.set(p.material, [...(r.get(p.material) ?? []), p.id]);
    for (const e of p.extras ?? []) if (!M[e[0]]) r.set(e[0], [...(r.get(e[0]) ?? []), p.id]);
  }
  return r;
}
/** Troca uma chave de material (que falta) por outra em todo o catálogo. */
export function mapearFaltante(estado, de, para) {
  for (const p of estado.catalogo.values()) {
    if (p.material === de) p.material = para || null;
    if (p.extras) p.extras = p.extras.map((e) => (e[0] === de ? [para, e[1], e[2]] : e)).filter((e) => e[0]);
  }
}

/** Pacote final (objeto pronto para validarPacote / salvar). */
export function montarPacote(estado) {
  const usados = copiasPorPeca(estado);
  const pecas = [];
  for (const p of estado.catalogo.values()) {
    if (!usados.has(p.id) && !(p.qtd > 0)) continue; // peça sem cópia e sem quantidade fica de fora
    const r = { id: p.id, nome: p.nome || p.id, sistema: p.sistema || estado.sistemas[0] };
    for (const k of ['material', 'qtd', 'massa_t', 'taxa', 'preco_un', 'extras', 'descricao']) if (p[k] != null && p[k] !== '' && !(Array.isArray(p[k]) && !p[k].length)) r[k] = p[k];
    pecas.push(r);
  }
  if (pecas.length > MAX_PECAS) throw new Error(`Peças demais (${pecas.length}; máx. ${MAX_PECAS}).`);
  const it = estado.itens[0];
  const marcacao = {};
  for (const [c, id] of estado.marcas) marcacao[c] = { peca: id };
  const dados = base64De(estado.canon.glb);
  const sistemas = estado.sistemas.filter((s) => pecas.some((p) => p.sistema === s) || ['Instalações'].includes(s));
  return {
    formato: FORMATO_PACOTE, versao: VERSAO_PACOTE,
    nome: (estado.nome || 'Meu projeto').slice(0, 140), autor: (estado.autor || '').slice(0, 140),
    origem: { arquivo: it.nome.slice(0, 120), formato: it.formato, unidade_original: it.unidade, escala: it.fator },
    cambio_brl: estado.cambio ?? estado.biblioteca._meta?.cambio_brl?.valor ?? 5.4,
    sistemas: sistemas.length ? sistemas : [estado.sistemas[0] ?? 'Geral'],
    materiais: estado.materiais,
    pecas,
    marcacao,
    terreno: estado.terreno,
    rotas: { origens: [...estado.rotas.origens], destinos: [...estado.rotas.destinos] },
    modelo: { formato: 'glb', hash: fnv(dados), dados },
  };
}

/**
 * Caminho completo sem interface (testes e "aceitar tudo"): arquivos -> pacote.
 * opcoes: { unidade, girar, catalogo: pacote existente (usa peças, materiais e sistemas), nome, terreno, rotas }.
 */
export async function automatico(biblioteca, arquivos, opcoes = {}) {
  const estado = novoEstado(biblioteca);
  if (opcoes.catalogo) {
    estado.sistemas = [...(opcoes.catalogo.sistemas ?? estado.sistemas)];
    aplicarCatalogo(estado, opcoes.catalogo.pecas ?? [], { materiais: opcoes.catalogo.materiais, cambio: opcoes.catalogo.cambio_brl });
  }
  await lerArquivos(estado, arquivos);
  if (opcoes.unidade || opcoes.girar != null) aplicarAjuste(estado.itens[0], { unidade: opcoes.unidade ?? estado.itens[0].unidade, girar: opcoes.girar ?? estado.itens[0].girar });
  await converterEDetectar(estado);
  if (opcoes.nome) estado.nome = opcoes.nome;
  const { porCaminho, deObjeto } = caminhos(estado.canon.cena);
  const porNome = (nome) => { for (const [c, o] of porCaminho) if (nomeBruto(o) === nome || o.name === nome) return deObjeto.get(o) ?? c; return null; };
  if (opcoes.terreno) estado.terreno = porNome(opcoes.terreno);
  for (const k of ['origens', 'destinos']) for (const n of opcoes.rotas?.[k] ?? []) { const c = porNome(n); if (c) estado.rotas[k].push(c); }
  return { estado, pacote: montarPacote(estado) };
}
