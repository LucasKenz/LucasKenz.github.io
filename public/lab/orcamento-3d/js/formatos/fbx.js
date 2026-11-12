// Leitor .fbx. Peças vêm do nome do nó; material do nome do material.
// Unidade do arquivo: UnitScaleFactor (centímetros por unidade; 1 = cm, 100 = m).
import { criarManager } from './recursos.js';

export async function ler(arquivo, apoio) {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const buf = await arquivo.arrayBuffer();
  const cab = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(64, buf.byteLength)));
  if (!cab.startsWith('Kaydara FBX Binary') && !/FBXHeaderExtension|; FBX/.test(new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(2048, buf.byteLength))))) {
    throw new Error('O arquivo .fbx não tem o cabeçalho FBX (corrompido ou de outro formato).');
  }
  const { manager, faltas, liberar } = criarManager(apoio);
  let cena;
  try { cena = new FBXLoader(manager).parse(buf, ''); }
  catch (e) { throw new Error(`Não foi possível ler o .fbx: ${e?.message ?? 'formato inválido'}.`); }
  finally { setTimeout(liberar, 5000); }
  // nomes originais (o FBXLoader limpa ".", ":" e "/")
  cena.traverse((o) => { if (typeof o.userData.originalName === 'string' && o.userData.originalName) o.userData.nome0 = o.userData.originalName.slice(0, 200); });
  const usf = Number(cena.userData.unitScaleFactor);
  const avisos = [];
  if (faltas.size) avisos.push(`Texturas não encontradas: ${[...faltas].slice(0, 8).join(', ')} (segue com a cor do material).`);
  return { cena, fator: Number.isFinite(usf) && usf > 0 ? usf / 100 : 0.01, unidadeDoArquivo: Number.isFinite(usf) && usf > 0, eixoDoArquivo: false, avisos };
}
