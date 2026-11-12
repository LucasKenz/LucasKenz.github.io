// Leitor .glb (glTF binário) e .gltf (+ .bin e texturas soltos). Unidade: metro; eixo: Y para cima.
// Peças vêm do nome do nó (ou de extras.peca); material do nome do material (ou de extras.material).
import { criarManager } from './recursos.js';

/** Guarda o nome original de cada nó (o GLTFLoader limpa ".", ":" e "/" dos nomes). */
function nomesOriginais(gltf) {
  const nodes = gltf.parser?.json?.nodes ?? [];
  gltf.scene.traverse((o) => {
    const a = gltf.parser.associations.get(o);
    const n = a && a.nodes !== undefined ? nodes[a.nodes]?.name : null;
    if (typeof n === 'string' && n && typeof o.userData.nome0 !== 'string') o.userData.nome0 = n.slice(0, 200);
  });
}

export async function ler(arquivo, apoio) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const binario = /\.glb$/i.test(arquivo.name);
  const { manager, faltas, liberar } = criarManager(apoio);
  const loader = new GLTFLoader(manager);
  let dados;
  if (binario) {
    dados = await arquivo.arrayBuffer();
    const cab = String.fromCharCode(...new Uint8Array(dados, 0, Math.min(4, dados.byteLength)));
    if (cab !== 'glTF') throw new Error('O arquivo .glb não começa com a assinatura "glTF" (corrompido ou de outro formato).');
  } else dados = await arquivo.text();
  let gltf;
  try { gltf = await loader.parseAsync(dados, ''); }
  catch (e) { throw new Error(`Não foi possível ler o ${binario ? '.glb' : '.gltf'}${faltas.size ? ` (faltou: ${[...faltas].join(', ')})` : ''}: ${e?.message ?? 'formato inválido'}.`); }
  finally { liberar(); }
  nomesOriginais(gltf);
  const avisos = [];
  if (faltas.size) avisos.push(`Arquivo(s) não encontrado(s): ${[...faltas].slice(0, 8).join(', ')}. Texturas que faltam são trocadas pela cor do material.`);
  return { cena: gltf.scene, fator: 1, unidadeDoArquivo: true, eixoDoArquivo: true, avisos };
}
