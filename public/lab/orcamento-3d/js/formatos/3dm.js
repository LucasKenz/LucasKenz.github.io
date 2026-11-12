// Leitor .3dm (Rhino) com o Rhino3dmLoader do three.js e o rhino3dm (WASM).
// Peças vêm do nome do objeto; a camada (layer) é guardada e vira sugestão de sistema no catálogo.
// Unidade do arquivo (ModelUnitSystem); Rhino é Z para cima: o assistente já sugere "Girar".
import { CDN } from './cdn.js';

// ModelUnitSystem do Rhino -> metros
const UNIDADES_RHINO = { 2: 0.001, 3: 0.01, 4: 1, 8: 0.0254, 9: 0.3048, 1: 1e-6, 5: 1000 };
let loaderP = null;

export async function ler(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const cab = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(32, buf.byteLength)));
  if (!cab.startsWith('3D Geometry File Format')) throw new Error('O arquivo .3dm não tem o cabeçalho do Rhino (corrompido ou de outro formato).');
  loaderP ??= import('three/addons/loaders/3DMLoader.js').then(({ Rhino3dmLoader }) => {
    const l = new Rhino3dmLoader();
    l.setLibraryPath(CDN.rhino3dm);
    l.setWorkerLimit(1);
    return l;
  });
  const loader = await loaderP;
  const obj = await new Promise((ok, erro) => loader.parse(buf, ok, (e) => erro(new Error(`Não foi possível ler o .3dm: ${e?.message ?? e}.`))));
  const camadas = (obj.userData?.layers ?? []).map((l) => String(l?.name ?? '').slice(0, 40));
  const us = obj.userData?.settings?.modelUnitSystem;
  const cod = typeof us === 'number' ? us : us?.value;
  const fator = UNIDADES_RHINO[cod] ?? null;
  const avisos = (obj.userData?.warnings ?? []).slice(0, 5).map((w) => `Rhino: ${String(w?.message ?? w).slice(0, 120)}`);
  // userData do loader é enorme (configurações de render): fica só o que serve ao orçamento
  obj.traverse((o) => {
    const a = o.userData?.attributes;
    const ud = {};
    if (o.name) ud.nome0 = String(o.name).slice(0, 200);
    if (a && Number.isInteger(a.layerIndex) && camadas[a.layerIndex]) ud.camada = camadas[a.layerIndex];
    o.userData = ud;
  });
  obj.name = '';
  return { cena: obj, fator, unidadeDoArquivo: fator != null, eixoDoArquivo: false, zUp: true, avisos };
}
