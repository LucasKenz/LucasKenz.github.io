// Materiais de renderização (PBR) e texturas procedurais.
import * as THREE from 'three';
import { rng, fbm2 } from '../util.js';

function canvasTex(w, h, desenhar, repetir = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function texConcreto() {
  return canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm2(x / 22, y / 22, 5) * 0.5 + fbm2(x / 3, y / 3, 2) * 0.2;
      const v = 180 + n * 60;
      const i = (y * w + x) * 4;
      img.data[i] = v; img.data[i + 1] = v * 0.985; img.data[i + 2] = v * 0.96; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // juntas de concretagem
    g.strokeStyle = 'rgba(80,80,80,.35)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
  });
}

function texPainel() {
  // painel de 3 m × 6 m: juntas nas bordas e um leve gradiente de chapa
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#e9e7e1'); gr.addColorStop(0.5, '#f4f2ec'); gr.addColorStop(1, '#e6e4de');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.06)';
    for (let x = 8; x < w; x += 16) g.fillRect(x, 0, 2, h); // nervuras da chapa trapezoidal
    g.strokeStyle = 'rgba(40,45,55,.55)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  });
}

function texGrade() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#c9a21c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a6210';
    for (let i = 0; i < w; i += 8) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 1); }
  });
}

export function criarMateriais() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const conc = texConcreto(); conc.repeat.set(1 / 4, 1 / 4);
  const pain = texPainel(); pain.repeat.set(1, 1);
  const grade = texGrade();
  const M = {
    azul: std({ color: 0x2c5cc5, metalness: 0.35, roughness: 0.42 }),
    turq: std({ color: 0x1fb3c0, metalness: 0.35, roughness: 0.42 }),
    branco: std({ color: 0xe4e6ea, metalness: 0.25, roughness: 0.5 }),
    cinza: std({ color: 0x8b95a3, metalness: 0.55, roughness: 0.42 }),
    cinzaEsc: std({ color: 0x3e4651, metalness: 0.5, roughness: 0.55 }),
    amarelo: std({ color: 0xf0bf27, metalness: 0.2, roughness: 0.5 }),
    laranja: std({ color: 0xe0702a, metalness: 0.25, roughness: 0.5 }),
    verde: std({ color: 0x2f9e4b, metalness: 0.2, roughness: 0.55 }),
    verdeInstr: std({ color: 0x39b54a, metalness: 0.15, roughness: 0.6 }),
    creme: std({ color: 0xe8dcbc, metalness: 0.05, roughness: 0.85 }),
    concreto: std({ color: 0xc3c0ba, roughness: 0.95, map: conc }),
    espelho: new THREE.MeshPhysicalMaterial({ color: 0xeef2f7, metalness: 1, roughness: 0.06, envMapIntensity: 1.3 }),
    vidroCorpo: std({ color: 0x6f8f9c, metalness: 0.1, roughness: 0.35 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: 0x9fd2e2, metalness: 0, roughness: 0.2, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    zerodur: new THREE.MeshPhysicalMaterial({ color: 0xdba36a, metalness: 0, roughness: 0.25, transparent: true, opacity: 0.85 }),
    aluminio: std({ color: 0xc9ced6, metalness: 0.85, roughness: 0.32 }),
    painel: std({ color: 0xffffff, metalness: 0.25, roughness: 0.55, map: pain, side: THREE.DoubleSide }),
    escuro: std({ color: 0x14171d, roughness: 0.9, side: THREE.DoubleSide }),
    borracha: std({ color: 0x1e1f22, roughness: 0.95 }),
    cobre: std({ color: 0xb87333, metalness: 0.9, roughness: 0.35 }),
    grade: std({ color: 0xffffff, map: grade, metalness: 0.3, roughness: 0.6 }),
    humano: std({ color: 0x2a2f38, roughness: 0.8 }),
    capacete: std({ color: 0xf5f5f5, roughness: 0.5 }),
    solda: std({ color: 0xffd24a, emissive: 0x5a3a00, roughness: 0.4 }),
    luz: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
    luzVermelha: new THREE.MeshBasicMaterial({ color: 0xff3020 }),
    janela: std({ color: 0x1b2433, emissive: 0xffb860, emissiveIntensity: 0.6, roughness: 0.3 }),
    tela: std({ color: 0xc8ccd2, metalness: 0.4, roughness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    terreno: std({ vertexColors: true, roughness: 1, metalness: 0 }),
  };
  for (const [k, m] of Object.entries(M)) m.name = k;
  return M;
}

/** Silhueta humana de 1,75 m (escala). */
export function humano(M, altura = 1.75, sem = 1) {
  const g = new THREE.Group();
  const r = rng(sem);
  const k = altura / 1.75;
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.19 * k, 0.75 * k, 4, 8), M.humano);
  corpo.position.y = 1.0 * k;
  const pernas = new THREE.Mesh(new THREE.CapsuleGeometry(0.13 * k, 0.55 * k, 4, 8), M.humano);
  pernas.position.y = 0.45 * k; pernas.scale.x = 1.6;
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.12 * k, 12, 8), M.humano);
  cabeca.position.y = 1.62 * k;
  const capacete = new THREE.Mesh(new THREE.SphereGeometry(0.13 * k, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), r() > 0.5 ? M.capacete : M.amarelo);
  capacete.position.y = 1.66 * k;
  g.add(corpo, pernas, cabeca, capacete);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.humano = true; } });
  g.userData.humano = true;
  return g;
}
