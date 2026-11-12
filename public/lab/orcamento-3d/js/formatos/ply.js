// Leitor .ply: o arquivo inteiro é UMA peça (id = nome do arquivo). Material escolhido no assistente.
// Sem unidade no arquivo: o assistente pergunta.
import * as THREE from 'three';
import { slugId } from '../util.js';

export async function ler(arquivo) {
  const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
  const buf = await arquivo.arrayBuffer();
  const cab = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(3, buf.byteLength)));
  if (cab !== 'ply') throw new Error('O arquivo .ply não começa com "ply" (corrompido ou de outro formato).');
  let geo;
  try { geo = new PLYLoader().parse(buf); } catch (e) { throw new Error(`Não foi possível ler o .ply: ${e?.message ?? 'formato inválido'}.`); }
  if (!geo.attributes.position?.count) throw new Error('O .ply não tem vértices.');
  if (!geo.index && geo.attributes.position.count % 3) throw new Error('O .ply não tem faces (nuvem de pontos não tem volume).');
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nome = arquivo.name.replace(/\.ply$/i, '');
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xa8b0c0, roughness: 0.7, vertexColors: !!geo.attributes.color }));
  m.name = slugId(nome) || 'peca';
  m.userData.nome0 = nome.slice(0, 120);
  const g = new THREE.Group();
  g.add(m);
  return { cena: g, fator: null, unidadeDoArquivo: false, eixoDoArquivo: false, avisos: [], umaPeca: true };
}
