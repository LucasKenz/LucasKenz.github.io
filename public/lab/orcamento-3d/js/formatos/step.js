// Leitor .step/.stp e .iges/.igs com occt-import-js (OpenCascade em WASM).
// Peças vêm do nome de cada produto/corpo; malhas tesseladas pelo OCCT (fechadas: volume confiável).
// Unidade: o OCCT converte para metro. CAD costuma ser Z para cima: o assistente já sugere "Girar".
import * as THREE from 'three';
import { CDN, carregarScript } from './cdn.js';
import { slugId } from '../util.js';

let occtP = null;
async function occt() {
  occtP ??= (async () => {
    await carregarScript(`${CDN.occt}occt-import-js.js`);
    if (typeof window.occtimportjs !== 'function') throw new Error('Biblioteca occt-import-js não carregou.');
    return window.occtimportjs({ locateFile: (f) => CDN.occt + f });
  })().catch((e) => { occtP = null; throw e; });
  return occtP;
}

export async function ler(arquivo) {
  const iges = /\.(iges|igs)$/i.test(arquivo.name);
  const buf = new Uint8Array(await arquivo.arrayBuffer());
  const cab = new TextDecoder().decode(buf.subarray(0, Math.min(400, buf.length)));
  if (!iges && !cab.startsWith('ISO-10303-21')) throw new Error('O arquivo .step não começa com "ISO-10303-21" (corrompido ou de outro formato).');
  if (iges && !/^.{72}S/.test(cab.split(/\r?\n/)[0] ?? '')) throw new Error('O arquivo .iges não tem a seção inicial (corrompido ou de outro formato).');
  const o = await occt();
  const params = { linearUnit: 'meter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 };
  let r;
  try { r = iges ? o.ReadIgesFile(buf, params) : o.ReadStepFile(buf, params); } catch (e) { throw new Error(`Não foi possível ler o ${iges ? '.iges' : '.step'}: ${e?.message ?? e}.`); }
  if (!r?.success || !r.meshes?.length) throw new Error(`O ${iges ? '.iges' : '.step'} não tem sólidos legíveis.`);
  const mats = new Map();
  const mat = (c) => {
    const k = c ? c.map((x) => x.toFixed(3)).join(',') : 'sem';
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c ? new THREE.Color(c[0], c[1], c[2]) : 0xa8b0c0, roughness: 0.7 }));
    return mats.get(k);
  };
  const malha = (m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal) g.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    else g.computeVertexNormals();
    if (m.index?.array) g.setIndex(m.index.array);
    const me = new THREE.Mesh(g, mat(m.color));
    if (m.name) { me.name = m.name; me.userData.nome0 = String(m.name).slice(0, 200); }
    return me;
  };
  // nomes genéricos do OCCT (tipo de forma) não identificam peça
  const generico = (s) => !s || /^(COMPOUND|COMPSOLID|SOLID|SHELL|FACE|mesh_\d+|Open CASCADE STEP translator.*)$/i.test(String(s).trim());
  for (const m of r.meshes) if (generico(m.name)) m.name = '';
  let nomes = 0;
  const no = (n) => {
    const g = new THREE.Group();
    if (!generico(n.name)) { g.name = n.name; g.userData.nome0 = String(n.name).slice(0, 200); nomes++; }
    for (const i of n.meshes ?? []) g.add(malha(r.meshes[i]));
    for (const f of n.children ?? []) g.add(no(f));
    return g;
  };
  const cena = no(r.root);
  // sem nomes (comum em IGES): o arquivo inteiro vira uma peça, com o nome do arquivo
  const umaPeca = !nomes && !r.meshes.some((m) => m.name);
  if (umaPeca) {
    const nome = arquivo.name.replace(/\.(iges|igs|step|stp)$/i, '');
    const g = new THREE.Group();
    g.name = slugId(nome) || 'peca';
    g.userData.nome0 = nome.slice(0, 120);
    g.add(cena);
    return { cena: g, fator: 1, unidadeDoArquivo: true, eixoDoArquivo: false, zUp: true, avisos: [], umaPeca: true };
  }
  return { cena, fator: 1, unidadeDoArquivo: true, eixoDoArquivo: false, zUp: true, avisos: [] };
}
