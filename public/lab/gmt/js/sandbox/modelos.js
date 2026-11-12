// Modelos 3D externos (.glb) do Sandbox: ler o arquivo, validar e registrar a malha para a peça "modelo-externo".
// O arquivo é lido só como dado pelo GLTFLoader (geometria, materiais e texturas); nada dele é executado.
import * as THREE from 'three';
import { obterExterno, registrarExterno } from '../model/externos.js';
import { fnv, MAX_MODELO_BYTES } from './projeto.js';

export const MAX_TRIANGULOS = 300000;

export function base64De(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function bufferDe(b64) {
  const s = atob(b64);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b.buffer;
}

let carregador = null;
async function lerGLB(buf) {
  if (!carregador) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    carregador = new GLTFLoader();
  }
  let gltf;
  try { gltf = await carregador.parseAsync(buf, ''); } catch (e) { throw new Error(`Não foi possível ler o .glb (${e?.message ?? 'formato inválido'}).`); }
  const cena = gltf.scene;
  cena.updateMatrixWorld(true);
  let tris = 0, malhas = 0;
  cena.traverse((o) => {
    if (!o.isMesh) return;
    malhas++;
    const g = o.geometry;
    const n = (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
    o.castShadow = o.receiveShadow = true;
  });
  if (!malhas) throw new Error('O arquivo não tem nenhuma malha 3D.');
  // a origem da peça vira o centro da base do modelo (fica apoiado no ponto clicado)
  const box = new THREE.Box3().setFromObject(cena);
  const c = box.getCenter(new THREE.Vector3());
  const raiz = new THREE.Group();
  cena.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  raiz.add(cena);
  const tam = box.getSize(new THREE.Vector3());
  return { cena: raiz, tris: Math.round(tris), tam: [tam.x, tam.y, tam.z] };
}

/** Lê um arquivo .glb escolhido pelo usuário. Devolve { hash, nome, dados (base64), tris, tam, avisos }. */
export async function importarArquivo(f) {
  if (f.size > MAX_MODELO_BYTES) throw new Error(`Modelo grande demais (${(f.size / 1e6).toFixed(1)} MB; máx. 4 MB). Simplifique a malha ou comprima no Blender.`);
  const buf = await f.arrayBuffer();
  const cab = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (String.fromCharCode(...cab) !== 'glTF') throw new Error('Só arquivos .glb (glTF binário) são aceitos.');
  const dados = base64De(buf);
  const hash = fnv(dados);
  const nome = f.name.replace(/\.glb$/i, '').slice(0, 80) || 'modelo';
  const info = obterExterno(hash) ?? { ...(await lerGLB(buf)), nome, dados };
  registrarExterno(hash, info);
  const avisos = [];
  if (info.tris > MAX_TRIANGULOS) avisos.push(`Modelo pesado (${info.tris.toLocaleString('pt-BR')} triângulos; recomendado até 300 mil): a página pode ficar lenta.`);
  return { hash, nome, dados, tris: info.tris, tam: info.tam, avisos };
}

/** Garante que todos os modelos de um projeto estão lidos e registrados (antes de calcular e desenhar). */
export async function carregarModelos(projeto) {
  const falhas = [];
  for (const [hash, m] of Object.entries(projeto.modelos ?? {})) {
    if (obterExterno(hash)) continue;
    try { registrarExterno(hash, { ...(await lerGLB(bufferDe(m.dados))), nome: m.nome, dados: m.dados }); }
    catch (e) { falhas.push(`${m.nome}: ${e.message}`); }
  }
  return falhas;
}
