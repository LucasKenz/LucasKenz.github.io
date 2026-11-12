// Leitor .dae (Collada). Peças vêm do nome do nó; material do nome do material.
// Unidade e eixo do próprio arquivo (<unit meter> e <up_axis>), aplicados pelo ColladaLoader.
import { criarManager } from './recursos.js';

export async function ler(arquivo, apoio) {
  const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
  const texto = await arquivo.text();
  if (!/<COLLADA[\s>]/.test(texto.slice(0, 4000))) throw new Error('O arquivo .dae não é um Collada válido (falta a marca <COLLADA>).');
  if (/<!DOCTYPE|<!ENTITY/i.test(texto.slice(0, 4000))) throw new Error('O arquivo .dae declara entidades XML, que não são aceitas.');
  const { manager, faltas, liberar } = criarManager(apoio);
  let r;
  try { r = new ColladaLoader(manager).parse(texto, ''); }
  catch (e) { throw new Error(`Não foi possível ler o .dae: ${e?.message ?? 'formato inválido'}.`); }
  finally { setTimeout(liberar, 5000); }
  if (!r?.scene) throw new Error('O .dae não tem cena.');
  const avisos = [];
  if (faltas.size) avisos.push(`Texturas não encontradas: ${[...faltas].slice(0, 8).join(', ')} (segue com a cor do material).`);
  return { cena: r.scene, fator: 1, unidadeDoArquivo: true, eixoDoArquivo: true, avisos };
}
