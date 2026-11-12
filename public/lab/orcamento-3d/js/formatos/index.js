// Escolhe o leitor de cada arquivo (import dinâmico: cada leitor só é carregado quando chega um arquivo dele).
// Todo formato vira a mesma cena Three.js; daí em diante o fluxo é um só (base/montagem.js).
import { comTempo } from '../util.js';
import { ehImagem } from './recursos.js';

export const MAX_ENTRADA = 25 * 1024 * 1024; // 25 MB por arquivo
export const FORMATOS_3D = {
  glb: { nome: 'glTF binário (.glb)', leitor: () => import('./glb.js') },
  gltf: { nome: 'glTF (.gltf + .bin)', leitor: () => import('./glb.js') },
  obj: { nome: 'Wavefront (.obj)', leitor: () => import('./obj.js') },
  fbx: { nome: 'Autodesk FBX (.fbx)', leitor: () => import('./fbx.js') },
  dae: { nome: 'Collada (.dae)', leitor: () => import('./dae.js') },
  stl: { nome: 'STL (.stl)', leitor: () => import('./stl.js') },
  ply: { nome: 'PLY (.ply)', leitor: () => import('./ply.js') },
  // fase 2: bibliotecas WASM (CDN, versão fixa), com tempo maior
  ifc: { nome: 'IFC (.ifc)', leitor: () => import('./ifc.js'), tempo: 120000 },
  step: { nome: 'STEP (.step)', leitor: () => import('./step.js'), tempo: 120000 },
  stp: { nome: 'STEP (.stp)', leitor: () => import('./step.js'), tempo: 120000 },
  iges: { nome: 'IGES (.iges)', leitor: () => import('./step.js'), tempo: 120000 },
  igs: { nome: 'IGES (.igs)', leitor: () => import('./step.js'), tempo: 120000 },
  '3dm': { nome: 'Rhino (.3dm)', leitor: () => import('./3dm.js'), tempo: 120000 },
};
/** Formatos fechados, sem leitor livre no navegador: a ajuda ensina a exportar. */
export const NAO_LIDOS = {
  skp: 'SketchUp: exporte em .dae (nativo) ou .glb.',
  rvt: 'Revit: exporte .ifc ou .fbx da vista 3D.',
  rfa: 'Revit (família): exporte .fbx.',
  dwg: 'AutoCAD 3D: exporte .fbx ou .dae.',
  max: '3ds Max: exporte .fbx.',
  blend: 'Blender: exporte .glb (com "Propriedades personalizadas").',
  dwf: 'DWF não é lido: exporte .fbx, .ifc ou .dae.',
};
export const ext = (nome) => (String(nome).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');

/**
 * Separa os arquivos recebidos: modelos 3D (na ordem), arquivos de apoio (.bin, .mtl, texturas),
 * catálogos (.csv), JSON (pacote/projeto) e recusados (com o motivo).
 */
export function classificar(arquivos) {
  const r = { modelos: [], apoio: new Map(), csv: [], json: [], dxf: [], recusados: [] };
  for (const f of arquivos) {
    const e = ext(f.name);
    if (FORMATOS_3D[e]) r.modelos.push(f);
    else if (e === 'csv') r.csv.push(f);
    else if (e === 'json') r.json.push(f);
    else if (e === 'dxf') r.dxf.push(f);
    else if (e === 'bin' || e === 'mtl' || ehImagem(f.name)) r.apoio.set(f.name.toLowerCase().split(/[\\/]/).pop(), f);
    else if (NAO_LIDOS[e]) r.recusados.push(`${f.name}: formato não lido. ${NAO_LIDOS[e]}`);
    else r.recusados.push(`${f.name}: tipo de arquivo desconhecido.`);
  }
  return r;
}

/**
 * Lê um arquivo 3D. Devolve { cena, formato, nome, fator (null = perguntar), unidadeDoArquivo, eixoDoArquivo, avisos, umaPeca }.
 * Erros viram mensagem clara (arquivo grande, corrompido, tempo esgotado).
 */
export async function lerModelo(arquivo, apoio = new Map()) {
  const formato = ext(arquivo.name);
  const F = FORMATOS_3D[formato];
  if (!F) throw new Error(`${arquivo.name}: formato não lido.`);
  if (arquivo.size > MAX_ENTRADA) throw new Error(`${arquivo.name}: arquivo grande demais (${(arquivo.size / 1048576).toFixed(1)} MB; máx. 25 MB). Simplifique a malha ou divida em partes.`);
  if (!arquivo.size) throw new Error(`${arquivo.name}: arquivo vazio.`);
  for (const f of apoio.values()) if (f.size > MAX_ENTRADA) throw new Error(`${f.name}: arquivo grande demais (máx. 25 MB).`);
  const mod = await F.leitor();
  const r = await comTempo(mod.ler(arquivo, apoio), F.tempo ?? 60000, `${arquivo.name}: a leitura passou de ${(F.tempo ?? 60000) / 1000} s (arquivo grande demais ou corrompido).`);
  return { ...r, formato, nome: arquivo.name };
}
