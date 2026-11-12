// Leitor .obj (+ .mtl e texturas juntos). Peças vêm de "o" / "g"; material de "usemtl".
// O arquivo não diz a unidade: o assistente pergunta (m, cm, mm, pol, pé).
import { criarManager } from './recursos.js';

export async function ler(arquivo, apoio) {
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
  const texto = await arquivo.text();
  if (!/^\s*(v|f|o|g)\s/m.test(texto)) throw new Error('O arquivo .obj não tem vértices nem faces (corrompido ou de outro formato).');
  const avisos = [];
  const loader = new OBJLoader();
  // .mtl: o citado em "mtllib" ou qualquer .mtl que veio junto
  const citado = (texto.match(/^\s*mtllib\s+(.+)$/m)?.[1] ?? '').trim().replace(/\\/g, '/').split('/').pop().toLowerCase();
  const mtl = apoio.get(citado) ?? [...apoio.entries()].find(([n]) => n.endsWith('.mtl'))?.[1];
  const { manager, faltas, liberar } = criarManager(apoio);
  try {
    if (mtl) {
      const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
      const mats = new MTLLoader(manager).parse(await mtl.text(), '');
      mats.preload();
      loader.setMaterials(mats);
    } else if (citado) avisos.push(`O .obj cita "${citado}", que não veio junto: as cores ficam neutras, mas os nomes dos materiais continuam valendo.`);
    const cena = loader.parse(texto);
    // sem .mtl, o OBJLoader cria materiais com o nome do usemtl: mantém o nome
    if (faltas.size) avisos.push(`Arquivo(s) não encontrado(s): ${[...faltas].slice(0, 8).join(', ')}.`);
    return { cena, fator: null, unidadeDoArquivo: false, eixoDoArquivo: false, avisos };
  } finally { setTimeout(liberar, 5000); }
}
