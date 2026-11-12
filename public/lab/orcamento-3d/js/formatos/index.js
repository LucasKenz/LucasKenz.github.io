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
};
/** Formatos fechados, sem leitor livre no navegador: a ajuda ensina a exportar. */
export const NAO_LIDOS = {
  skp: 'SketchUp: exporte em .dae (nativo) ou .glb.',
  rvt: 'Revit: exporte .fbx da vista 3D (ou .ifc, na fase 2).',
  rfa: 'Revit (família): exporte .fbx.',
  dwg: 'AutoCAD 3D: exporte .fbx ou .dae.',
  max: '3ds Max: exporte .fbx.',
  blend: 'Blender: exporte .glb (com "Propriedades personalizadas").',
  ifc: 'IFC fica para a fase 2: por enquanto, exporte .fbx ou .glb.',
  step: 'STEP fica para a fase 2: exporte .stl (uma peça por arquivo) ou .obj.',
  stp: 'STEP fica para a fase 2: exporte .stl ou .obj.',
  iges: 'IGES fica para a fase 2: exporte .stl ou .obj.',
  igs: 'IGES fica para a fase 2: exporte .stl ou .obj.',
  '3dm': 'Rhino fica para a fase 2: exporte .obj ou .fbx.',
  dxf: 'DXF 2D fica para a fase 2.',
};
export const ext = (nome) => (String(nome).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');

/**
 * Separa os arquivos recebidos: modelos 3D (na ordem), arquivos de apoio (.bin, .mtl, texturas),
 * catálogos (.csv), JSON (pacote/projeto) e recusados (com o motivo).
 */
export function classificar(arquivos) {
  const r = { modelos: [], apoio: new Map(), csv: [], json: [], recusados: [] };
  for (const f of arquivos) {
    const e = ext(f.name);
    if (FORMATOS_3D[e]) r.modelos.push(f);
    else if (e === 'csv') r.csv.push(f);
    else if (e === 'json') r.json.push(f);
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
  const r = await comTempo(mod.ler(arquivo, apoio), 60000, `${arquivo.name}: a leitura passou de 60 s (arquivo grande demais ou corrompido).`);
  return { ...r, formato, nome: arquivo.name };
}
