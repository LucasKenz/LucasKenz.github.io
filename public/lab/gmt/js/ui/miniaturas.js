// Miniaturas das peças (Catálogo e Sandbox): um renderer pequeno e temporário, uma peça por vez,
// nos intervalos livres do navegador. Cada imagem é gerada uma vez e fica em cache.
import * as THREE from 'three';
import { construir } from '../model/parts.js';

const cache = new Map(); // id -> Promise<dataURL>
const fila = [];         // [{ id, ok, erro }]
let r = null, cena = null, cam = null, rodando = false;
const ocioso = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 16));

function preparar() {
  const cv = document.createElement('canvas');
  cv.width = 240; cv.height = 180;
  r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, alpha: true });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xe6eeff, 0x2a3040, 2.2));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(3, 6, 4); cena.add(sol);
  cam = new THREE.PerspectiveCamera(32, 4 / 3, 0.01, 3000);
}

function render(id) {
  const g = construir(id, false);
  cena.add(g);
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const d = Math.max(s.x, s.y, s.z) * 1.55 + 0.2;
  cam.position.set(c.x + d * 0.75, c.y + d * 0.5, c.z + d * 0.85);
  cam.near = d / 100; cam.far = d * 10; cam.updateProjectionMatrix();
  cam.lookAt(c);
  r.render(cena, cam);
  const url = r.domElement.toDataURL('image/webp', 0.85);
  cena.remove(g);
  g.traverse((o) => { if (o.isMesh && !o.userData.compartilhada) o.geometry.dispose(); });
  return url;
}

function proximo() {
  const t = fila.shift();
  if (!t) {
    rodando = false;
    r.dispose(); r.forceContextLoss(); r = null;
    return;
  }
  try { t.ok(render(t.id)); } catch (e) { t.erro(e); }
  ocioso(proximo);
}

/** Miniatura (data URL, 240×180) de um tipo de peça. `urgente` passa na frente da fila. */
export function miniatura(id, urgente = false) {
  if (cache.has(id)) return cache.get(id);
  const p = new Promise((ok, erro) => { const t = { id, ok, erro }; urgente ? fila.unshift(t) : fila.push(t); });
  cache.set(id, p);
  if (!rodando) { rodando = true; if (!r) preparar(); ocioso(proximo); }
  return p;
}
