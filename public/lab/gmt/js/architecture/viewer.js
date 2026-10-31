// Visualizador de UMA peça isolada: sólido, arame, raio-X, corte e explodida; cotas, escala humana
// e janela (picture-in-picture) mostrando onde a peça fica no telescópio.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PECAS, PECA, construir } from '../model/parts.js';
import { humano } from '../model/visual.js';
import { SUB, sisDaPeca } from '../model/subsistemas.js';
import { htmlQuantitativos } from './bom.js';
import { selo, esc } from '../data.js';
import { fmt, tween } from '../util.js';

const $ = (id) => document.getElementById(id);

export function criarVisor({ renderer, M, modeloCompleto, cenaCompleta, ocultarNoPip = [], aoVerNoModelo, aoVoltar }) {
  const cena = new THREE.Scene();
  cena.background = new THREE.Color(0x070b17);
  // estúdio para os reflexos (sem ele o espelho e o metal ficam pretos)
  cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.6;
  const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
  const ctl = new OrbitControls(cam, renderer.domElement);
  ctl.enableDamping = true;
  ctl.enabled = false;
  cena.add(new THREE.HemisphereLight(0xdfe8ff, 0x303848, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(5, 9, 6);
  cena.add(sol);
  const grade = new THREE.GridHelper(1, 20, 0x2a3866, 0x18213f);
  cena.add(grade);
  const plano = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const camPip = new THREE.PerspectiveCamera(35, 260 / 190, 1, 2000);

  let id = null, peca = null, modo = 'solido', explode = 0, tamanho = 1, centro = new THREE.Vector3();
  let homem = null, cotas = null, ativo = false;
  const rotulos = $('rotulosPeca');
  const materiaisOrig = new Map();
  const matArame = new THREE.MeshBasicMaterial({ color: 0x9fb4ff, wireframe: true, transparent: true, opacity: 0.6 });
  const matRaio = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0);
      #ifdef USE_INSTANCING
        p = modelViewMatrix * instanceMatrix * vec4(position,1.0);
      #endif
      vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(vec3(0.45,0.7,1.0) * (0.15 + f), 0.12 + f * 0.6); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const matDestaque = new THREE.MeshBasicMaterial({ color: 0xffc21a });
  const matFundo = new THREE.MeshBasicMaterial({ color: 0x3a4566 });

  function limpar() {
    if (peca) { cena.remove(peca); peca.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
    if (homem) cena.remove(homem);
    if (cotas) cena.remove(cotas);
    rotulos.innerHTML = '';
    materiaisOrig.clear();
  }

  function abrir(novoId) {
    if (!PECA[novoId]) return;
    limpar();
    id = novoId;
    const p = PECA[id];
    peca = construir(id, true);
    // centraliza a peça e apoia no chão
    const box = new THREE.Box3().setFromObject(peca);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    peca.position.set(-c.x, -box.min.y, -c.z);
    const raiz = new THREE.Group();
    raiz.add(peca);
    peca = raiz;
    cena.add(peca);
    tamanho = Math.max(s.x, s.y, s.z);
    centro.set(0, s.y / 2, 0);
    peca.traverse((o) => {
      if (!o.isMesh) return;
      materiaisOrig.set(o, o.material);
      o.userData.base = o.position.clone();
      const bb = new THREE.Box3().setFromObject(o);
      o.userData.dirExp = bb.isEmpty() ? new THREE.Vector3() : bb.getCenter(new THREE.Vector3()).sub(new THREE.Vector3(0, s.y / 2, 0));
    });
    grade.scale.setScalar(Math.max(4, tamanho * 2.2));
    // escala humana ao lado
    homem = humano(M);
    homem.position.set(s.x / 2 + Math.max(0.5, tamanho * 0.08), 0, s.z / 2);
    cena.add(homem);
    desenharCotas(s);
    // câmera
    const d = tamanho * 1.8 + 1.5;
    cam.position.set(d * 0.8, s.y * 0.6 + d * 0.45, d * 0.9);
    cam.near = Math.max(0.005, tamanho / 500); cam.far = tamanho * 60 + 200; cam.updateProjectionMatrix();
    ctl.target.copy(centro);
    ctl.update();
    explode = 0;
    aplicarModo(modo);
    preencherCard(p);
    prepararPip();
    if (location.hash !== `#peca/${id}`) history.replaceState(null, '', `#peca/${id}`);
  }

  function desenharCotas(s) {
    cotas = new THREE.Group();
    const lin = (a, b) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); cotas.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffc21a }))); };
    const off = Math.max(0.15, tamanho * 0.06), x0 = -s.x / 2, x1 = s.x / 2, z0 = -s.z / 2, z1 = s.z / 2;
    lin(new THREE.Vector3(x0, 0, z1 + off), new THREE.Vector3(x1, 0, z1 + off));
    lin(new THREE.Vector3(x1 + off, 0, z0), new THREE.Vector3(x1 + off, 0, z1));
    lin(new THREE.Vector3(x0 - off, 0, z1), new THREE.Vector3(x0 - off, s.y, z1));
    cena.add(cotas);
    const fmtM = (v) => (v >= 1 ? `${fmt(v, 2)} m` : `${fmt(v * 1000, 0)} mm`);
    cotas.userData.rot = [
      [new THREE.Vector3(0, 0, z1 + off * 1.8), fmtM(s.x)],
      [new THREE.Vector3(x1 + off * 1.8, 0, 0), fmtM(s.z)],
      [new THREE.Vector3(x0 - off * 1.8, s.y / 2, z1), fmtM(s.y)],
    ];
    rotulos.innerHTML = cotas.userData.rot.map(([, t]) => `<span class="cota" style="position:absolute">${t}</span>`).join('') + '<span class="cota humano" style="position:absolute">pessoa 1,75 m</span>';
  }

  function aplicarModo(m) {
    modo = m;
    document.querySelectorAll('[data-vm]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vm === m)));
    $('corteCtl').hidden = m !== 'corte';
    renderer.localClippingEnabled = true;
    for (const [o, orig] of materiaisOrig) {
      if (m === 'arame') o.material = matArame;
      else if (m === 'raiox') o.material = matRaio;
      else if (m === 'corte') {
        o.material = (Array.isArray(orig) ? orig : [orig]).map((x) => { const c = x.clone(); c.clippingPlanes = [plano]; c.side = THREE.DoubleSide; return c; });
        if (!Array.isArray(orig)) o.material = o.material[0];
      } else o.material = orig;
    }
    const alvo = m === 'explodida' ? 1 : 0, ini = explode;
    tween({ dur: 0.9, update: (k) => { explode = ini + (alvo - ini) * k; posicionarExplodida(); } });
  }
  function posicionarExplodida() {
    for (const [o] of materiaisOrig) {
      if (o.isInstancedMesh) continue;
      o.position.copy(o.userData.base).addScaledVector(o.userData.dirExp, explode * 0.9);
    }
  }

  function preencherCard(p) {
    const sis = SUB[sisDaPeca(p)];
    const [n, f, conf, nota] = p.qtd;
    $('visorCard').innerHTML = `<p class="sist">${esc(p.sistema)} · ${esc(sis?.nome ?? '')}</p>
      <h2>${esc(p.nome)}</h2>
      <p><b style="color:var(--acc);font:700 1.4rem var(--mono)">× ${fmt(n, 0)}</b> unidades no telescópio ${selo(conf, f)}${nota ? `<br><small>${esc(nota)}</small>` : ''}</p>
      <h3>Função</h3><p>${esc(p.funcao)}</p>
      <h3>Como é</h3><p>${esc(p.descricao)}</p>
      <h3>Fabricação</h3><p>${esc(p.fabricacao)}</p>
      <h3>Quem faz</h3><p>${esc(p.fornecedor)}</p>
      <h3>Curiosidade</h3><p>${esc(p.curiosidade)}</p>
      <h3>Materiais e quantitativos</h3>
      <p class="dica">Volume e área medidos na geometria 3D desta peça (sólidos fechados, teorema da divergência); massa = volume × densidade.</p>
      <div id="tabPeca"><p class="dica">Calculando…</p></div>`;
    setTimeout(() => { const el = $('tabPeca'); if (el && id === p.id) el.innerHTML = htmlQuantitativos(p.id); }, 30);
  }

  // ---------- picture-in-picture ----------
  let pipAlvos = [];
  function prepararPip() {
    for (const o of pipAlvos) o.layers.disable(1);
    pipAlvos = [];
    modeloCompleto.raiz.traverse((o) => { if (o.isMesh && o.userData.peca === id) { o.layers.enable(1); pipAlvos.push(o); } });
    const box = new THREE.Box3();
    for (const o of pipAlvos) box.expandByObject(o);
    const c = box.isEmpty() ? new THREE.Vector3(0, 30, 0) : box.getCenter(new THREE.Vector3());
    camPip.position.set(c.x * 0.3 + 95, 70, c.z * 0.3 + 110);
    camPip.lookAt(c.x * 0.5, Math.max(15, c.y * 0.8), c.z * 0.5);
  }
  function renderPip() {
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    const w = Math.min(260, W * 0.4), h = (w * 190) / 260;
    if (W < 820) return; // no celular, a janela fica oculta
    const x = 12, y = 12;
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h);
    renderer.setClearColor(0x0b1124, 1); renderer.clear();
    const bg = cenaCompleta.background, fog = cenaCompleta.fog;
    cenaCompleta.background = null; cenaCompleta.fog = null;
    const vis = ocultarNoPip.map((o) => o.visible);
    for (const o of ocultarNoPip) o.visible = false;
    cenaCompleta.overrideMaterial = matFundo;
    camPip.layers.set(0);
    renderer.render(cenaCompleta, camPip);
    renderer.clearDepth();
    cenaCompleta.overrideMaterial = matDestaque;
    camPip.layers.set(1);
    renderer.render(cenaCompleta, camPip);
    cenaCompleta.overrideMaterial = null;
    cenaCompleta.background = bg; cenaCompleta.fog = fog;
    ocultarNoPip.forEach((o, i) => { o.visible = vis[i]; });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
  }

  // ---------- quadro ----------
  const _v = new THREE.Vector3();
  function render() {
    ctl.update();
    renderer.setClearColor(0x070b17, 1);
    renderer.render(cena, cam);
    // rótulos das cotas
    if (cotas) {
      const W = innerWidth, H = innerHeight, els = rotulos.children;
      cotas.userData.rot.forEach(([p], i) => {
        _v.copy(p).project(cam);
        els[i].style.transform = `translate(${((_v.x + 1) / 2) * W}px, ${((1 - _v.y) / 2) * H}px) translate(-50%,-50%)`;
      });
      _v.copy(homem.position).setY(1.9).project(cam);
      els[els.length - 1].style.transform = `translate(${((_v.x + 1) / 2) * W}px, ${((1 - _v.y) / 2) * H}px) translate(-50%,-100%)`;
    }
    renderPip();
  }

  function ativar(on) {
    ativo = on;
    ctl.enabled = on;
    $('visor').hidden = !on;
    rotulos.hidden = !on;
    if (!on) { for (const o of pipAlvos) o.layers.disable(1); pipAlvos = []; limpar(); id = null; }
  }
  function redimensionar(w, h) { cam.aspect = w / h; cam.updateProjectionMatrix(); }

  // ---------- controles ----------
  document.querySelectorAll('[data-vm]').forEach((b) => b.addEventListener('click', () => aplicarModo(b.dataset.vm)));
  $('corteX').addEventListener('input', (e) => { plano.constant = +e.target.value * tamanho * 0.55; });
  const ordem = () => PECAS.map((p) => p.id);
  $('vAnt').addEventListener('click', () => { const o = ordem(); abrir(o[(o.indexOf(id) - 1 + o.length) % o.length]); });
  $('vProx').addEventListener('click', () => { const o = ordem(); abrir(o[(o.indexOf(id) + 1) % o.length]); });
  $('vVoltar').addEventListener('click', aoVoltar);
  $('vModelo').addEventListener('click', () => aoVerNoModelo(id));

  return { abrir, ativar, render, redimensionar, get ativo() { return ativo; }, get id() { return id; } };
}
