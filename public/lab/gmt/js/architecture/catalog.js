// Catálogo: uma entrada por TIPO de peça, com miniatura renderizada, busca e filtro por sistema.
import * as THREE from 'three';
import { PECAS_BASE as PECAS, SISTEMAS, construir } from '../model/parts.js';
import { esc, selo } from '../data.js';
import { fmt } from '../util.js';

const $ = (id) => document.getElementById(id);

export function criarCatalogo({ aoAbrir }) {
  const grade = $('gradeCat'), busca = $('busca'), filtros = $('filtroSistema');
  let sistema = null, miniaturas = false;
  filtros.innerHTML = ['Todos', ...SISTEMAS].map((s) => `<button type="button" aria-pressed="${s === 'Todos'}" data-sis="${s}">${s}</button>`).join('');
  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    sistema = b.dataset.sis === 'Todos' ? null : b.dataset.sis;
    filtros.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    filtrar();
  });
  busca.addEventListener('input', filtrar);

  grade.innerHTML = PECAS.map((p) => `<button type="button" class="item-cat" data-id="${p.id}" data-sis="${esc(p.sistema)}" data-busca="${esc((p.nome + ' ' + p.funcao + ' ' + p.sistema).toLowerCase())}">
      <img alt="" data-mini="${p.id}" hidden><span class="ph" aria-hidden="true"></span>
      <div><strong>${esc(p.nome)}</strong><small>${esc(p.sistema)} · <span class="qtd">× ${fmt(p.qtd[0], 0)}</span></small> ${selo(p.qtd[2], p.qtd[1])}</div>
    </button>`).join('');
  grade.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const b = e.target.closest('.item-cat');
    if (b) aoAbrir(b.dataset.id);
  });

  function filtrar() {
    const q = busca.value.trim().toLowerCase();
    grade.querySelectorAll('.item-cat').forEach((b) => {
      b.hidden = (sistema && b.dataset.sis !== sistema) || (q && !b.dataset.busca.includes(q));
    });
  }

  /** Renderiza as miniaturas uma a uma, num renderer pequeno e temporário. */
  function gerarMiniaturas() {
    if (miniaturas) return;
    miniaturas = true;
    const cv = document.createElement('canvas');
    cv.width = 240; cv.height = 180;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight(0xe6eeff, 0x2a3040, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(3, 6, 4); cena.add(sol);
    const cam = new THREE.PerspectiveCamera(32, 4 / 3, 0.01, 3000);
    const fila = PECAS.map((p) => p.id);
    const proximo = () => {
      const id = fila.shift();
      if (!id) { r.dispose(); r.forceContextLoss(); return; }
      const g = construir(id, false);
      cena.add(g);
      const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
      const d = Math.max(s.x, s.y, s.z) * 1.55 + 0.2;
      cam.position.set(c.x + d * 0.75, c.y + d * 0.5, c.z + d * 0.85);
      cam.near = d / 100; cam.far = d * 10; cam.updateProjectionMatrix();
      cam.lookAt(c);
      r.render(cena, cam);
      const img = grade.querySelector(`[data-mini="${id}"]`);
      img.src = cv.toDataURL('image/webp', 0.85);
      img.hidden = false;
      img.nextElementSibling.remove();
      cena.remove(g);
      g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      (window.requestIdleCallback ?? setTimeout)(proximo);
    };
    proximo();
  }
  return { gerarMiniaturas, filtrar };
}
