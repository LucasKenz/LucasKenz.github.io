// Leitor .stl: o arquivo inteiro é UMA peça (id = nome do arquivo). Material escolhido no assistente.
// Sem unidade no arquivo (padrão: milímetros, como sai da maioria dos programas de CAD).
import * as THREE from 'three';
import { slugId } from '../util.js';

export async function ler(arquivo) {
  const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
  const buf = await arquivo.arrayBuffer();
  if (buf.byteLength < 84) throw new Error('O arquivo .stl é pequeno demais (corrompido).');
  let geo;
  try { geo = new STLLoader().parse(buf); } catch (e) { throw new Error(`Não foi possível ler o .stl: ${e?.message ?? 'formato inválido'}.`); }
  const n = geo.attributes.position?.count ?? 0;
  if (!n || !Number.isFinite(geo.attributes.position.array[0])) throw new Error('O .stl não tem triângulos válidos.');
  const nome = arquivo.name.replace(/\.stl$/i, '');
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xa8b0c0, roughness: 0.7, vertexColors: !!geo.attributes.color }));
  m.name = slugId(nome) || 'peca';
  m.userData.nome0 = nome.slice(0, 120);
  const g = new THREE.Group();
  g.add(m);
  return { cena: g, fator: null, unidadeDoArquivo: false, eixoDoArquivo: false, avisos: [], umaPeca: true };
}
