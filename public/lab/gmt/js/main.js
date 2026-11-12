// Bootstrap: renderer, pós-processamento, modos (3D, Pessoa, Vento, Catálogo, BOM, Fontes), atalhos e estado na URL.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Saneia a imagem antes do contorno e do bloom: o reflexo especular do sol no M1 pode passar do limite
// do buffer half-float (65.504) e virar infinito; o bloom espalharia isso em blocos pretos que piscam.
const SANEADOR = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  // O teste é feito nos bits (expoente todo em 1 = NaN ou infinito): o compilador D3D do Chrome no Windows
  // pode remover isnan() por presumir que NaN não existe.
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    float san(float x, float seNaN) {
      uint u = floatBitsToUint(x);
      if ((u & 0x7f800000u) == 0x7f800000u) return (u & 0x007fffffu) != 0u ? seNaN : ((u & 0x80000000u) != 0u ? 0.0 : 24.0);
      return clamp(x, 0.0, 24.0);
    }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(san(c.r, 0.0), san(c.g, 0.0), san(c.b, 0.0), clamp(san(c.a, 1.0), 0.0, 1.0));
    }`,
};
import { carregarDados, dados, materiais, val, entrada, seloDe, selo, esc, fonte } from './data.js';
import { DEG, clamp, fmt, fmtA, tween, atualizarTweens, voarCamera, aviso, cfdCss, reduzMovimento, ehToque } from './util.js';
import { criarMateriais } from './model/visual.js';
import { G, PECA, PECAS, usarMateriais } from './model/parts.js';
import { montar } from './model/assembly.js';
import { criarSitio } from './model/site.js';
import { criarLasers } from './model/lgs.js';
import { sisDaPeca } from './model/subsistemas.js';
import { criarCampo } from './wind/field.js';
import { criarVisVento, modoCinza } from './wind/windview.js';
import { simular, curvaSeeing, pdfVento } from './wind/physics.js';
import { iniciarPSF, calcularImagens, desenhar } from './wind/psf.js';
import { linhas, rosa, histograma } from './ui/charts.js';
import { criarPaineis } from './ui/panels.js';
import { criarFPS } from './fps.js';
import { criarCatalogo } from './architecture/catalog.js';
import { criarVisor } from './architecture/viewer.js';
import { montarBOM, exportarCSV } from './architecture/bom.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const quadroLivre = () => new Promise((r) => requestAnimationFrame(() => r()));

function progresso(p, txt) {
  $('barra').style.width = `${Math.round(p * 100)}%`;
  $('carEtapa').textContent = txt;
}

// ---------- WebGL 2 ----------
if (!document.createElement('canvas').getContext('webgl2')) {
  $('carregando').hidden = true;
  $('semWebgl').hidden = false;
  throw new Error('WebGL 2 indisponível');
}

iniciar().catch((e) => {
  console.error(e);
  $('carEtapa').textContent = `Erro ao carregar: ${e.message}`;
});

async function iniciar() {
  progresso(0.05, 'Carregando dados…');
  await carregarDados();

  // ---------- renderer e cena ----------
  progresso(0.15, 'Preparando o renderizador…');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  $('palco').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 9000);
  camera.position.set(120, 70, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 28, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 900;
  controls.maxPolarAngle = 88 * DEG;
  controls.zoomToCursor = true; // a roda aproxima para onde o mouse aponta (sem travar no centro da órbita)
  controls.screenSpacePanning = true;
  const VISTA_INICIAL = [V(85, 48, 105), V(0, 28, 0)];

  progresso(0.25, 'Modelando o telescópio e o domo…');
  await quadroLivre();
  const M = criarMateriais();
  usarMateriais(M);
  const modelo = montar(M);
  scene.add(modelo.raiz);

  progresso(0.5, 'Gerando Las Campanas e o céu…');
  await quadroLivre();
  const sitio = criarSitio(renderer, scene, M);
  const lasers = criarLasers(modelo.lgsPos);
  modelo.el.add(lasers.grupo);

  progresso(0.65, 'Montando o campo de vento…');
  await quadroLivre();
  const campo = criarCampo();
  const qualidadeIni = ehToque ? 'baixa' : 'media';
  $('qualidade').value = qualidadeIni;
  const vis = criarVisVento(campo, modelo, qualidadeIni);
  scene.add(vis.grupo);

  // ---------- pós-processamento ----------
  progresso(0.75, 'Pós-processamento…');
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.enabled = false;
  composer.addPass(gtao);
  composer.addPass(new ShaderPass(SANEADOR));
  const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
  Object.assign(outline, { edgeStrength: 4, edgeThickness: 1.5, edgeGlow: 0.3, pulsePeriod: 0 });
  outline.visibleEdgeColor.set(0xffc21a);
  outline.hiddenEdgeColor.set(0x6b5410);
  composer.addPass(outline);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.45, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- módulos de interface ----------
  progresso(0.85, 'Interface…');
  const paineis = criarPaineis({ modelo, camera, controls, aoAbrirPeca: (id) => irPeca(id) });
  const fps = criarFPS({ camera, dom: renderer.domElement, modelo, campo });
  const catalogo = criarCatalogo({ aoAbrir: (id) => irPeca(id) });
  const visor = criarVisor({
    renderer, M, modeloCompleto: modelo, cenaCompleta: scene,
    ocultarNoPip: [sitio.ceu, sitio.estrelas, sitio.terrenoGrupo, lasers.grupo, vis.grupo],
    aoVerNoModelo: (id) => verNoModelo(id),
    aoVoltar: () => irPara('catalogo'),
  });

  // =====================================================================
  // MODO 3D: apontamento, domo, cena
  // =====================================================================
  const est = modelo.estado;
  const saida = (id, txt) => { $(id).textContent = txt; };
  function sincronizarSliders() {
    $('az').value = est.az; saida('oAz', `${fmt(est.az, 0)}°`);
    $('el').value = est.el; saida('oEl', `${fmt(est.el, 0)}°`);
    $('el2').value = est.el; saida('oEl2', `${fmt(est.el, 0)}°`);
    for (const id of ['vent', 'vent2']) $(id).value = Math.round(est.vent * 100);
    saida('oVent', `${fmt(est.vent * 100, 0)}%`); saida('oVent2', `${fmt(est.vent * 100, 0)}%`);
    for (const id of ['tela', 'tela2']) $(id).value = Math.round(est.tela * 100);
    saida('oTela', `${fmt(est.tela * 100, 0)}%`); saida('oTela2', `${fmt(est.tela * 100, 0)}%`);
    $('btnPortas').textContent = est.portas > 0.5 ? 'Fechar portas' : 'Abrir portas';
    $('btnCapas').textContent = est.capas > 0.5 ? 'Fechar capas do M1' : 'Abrir capas do M1';
    $('domoAberto').checked = est.portas > 0.5;
  }

  let tApont = null;
  function apontar(az, el, dur = 2.5) {
    el = clamp(el, 25, 90);
    const az0 = est.az, el0 = est.el;
    let dAz = ((az - az0 + 540) % 360) - 180;
    if (tApont) tApont.vivo = false;
    const t = tween({
      dur,
      update: (k) => {
        if (!t.vivo) return;
        est.az = (az0 + dAz * k + 360) % 360;
        est.el = el0 + (el - el0) * k;
        modelo.aplicar(); sincronizarSliders();
      },
      done: () => { if (modo === 'vento') agendarSim(); },
    });
    t.vivo = true;
    tApont = t;
  }
  $('az').addEventListener('input', (e) => { est.az = +e.target.value; modelo.aplicar(); sincronizarSliders(); });
  $('el').addEventListener('input', (e) => { est.el = +e.target.value; modelo.aplicar(); sincronizarSliders(); });
  $('sync').addEventListener('change', (e) => { est.sync = e.target.checked; est.azDomo = est.az; modelo.aplicar(); });
  $('corte').addEventListener('change', (e) => modelo.setCorte(e.target.checked && modo !== 'pessoa'));

  function animarEstado(chave, alvo, dur = 3) {
    const v0 = est[chave];
    tween({ dur, update: (k) => { est[chave] = v0 + (alvo - v0) * k; modelo.aplicar(); }, done: sincronizarSliders });
  }
  $('btnPortas').addEventListener('click', () => {
    const alvo = est.portas > 0.5 ? 0 : 1;
    animarEstado('portas', alvo, 4);
    $('btnPortas').textContent = alvo ? 'Fechar portas' : 'Abrir portas';
    campo.config({ aberto: !!alvo }); $('domoAberto').checked = !!alvo; agendarSim();
  });
  $('btnCapas').addEventListener('click', () => {
    const alvo = est.capas > 0.5 ? 0 : 1;
    animarEstado('capas', alvo, 3);
    $('btnCapas').textContent = alvo ? 'Fechar capas do M1' : 'Abrir capas do M1';
  });
  function setVent(v) { est.vent = v; modelo.aplicar(); campo.config({ vent: v }); sincronizarSliders(); agendarSim(); }
  function setTela(v) { est.tela = v; modelo.aplicar(); campo.config({ tela: v }); sincronizarSliders(); agendarSim(); }
  $('vent').addEventListener('input', (e) => setVent(e.target.value / 100));
  $('vent2').addEventListener('input', (e) => setVent(e.target.value / 100));
  $('tela').addEventListener('input', (e) => setTela(e.target.value / 100));
  $('tela2').addEventListener('input', (e) => setTela(e.target.value / 100));

  let hora = +$('hora').value;
  $('hora').addEventListener('change', (e) => { hora = +e.target.value; sitio.setHora(hora); renderer.toneMappingExposure = hora < 0.25 ? 1.15 : 1; });
  sitio.setHora(hora);
  renderer.toneMappingExposure = hora < 0.25 ? 1.15 : 1;
  $('lasers').addEventListener('change', (e) => { lasers.grupo.visible = e.target.checked; });

  let explodida = false;
  function alternarExplodida() {
    explodida = !explodida;
    animarEstado('explode', explodida ? 1 : 0, 1.8);
    $('btnExplodir').setAttribute('aria-pressed', String(explodida));
  }
  $('btnExplodir').addEventListener('click', alternarExplodida);

  // ---------- clique na cena: peça (abre o card) ou céu (aponta) ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let baixo = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { baixo = [e.clientX, e.clientY]; });
  /** Tipo de peça sob o ponteiro (ignora o trecho cortado do domo). */
  function pecaSob(cx, cy) {
    ptr.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    for (const h of ray.intersectObject(modelo.raiz, true)) {
      if (!h.object.visible) continue;
      if (modelo.cortaveis.includes(h.object) && modelo.cortado(h.point)) continue;
      let o = h.object, peca = null;
      while (o && !peca) { peca = o.userData.peca; o = o.parent; }
      if (peca && PECA[peca]) return peca;
    }
    return null;
  }
  // malhas de cada tipo de peça (para destacar todas as cópias ao passar o mouse)
  const malhasDaPeca = {};
  modelo.raiz.traverse((o) => { if (o.isMesh && o.userData.peca) (malhasDaPeca[o.userData.peca] ??= []).push(o); });
  const etiqueta = document.createElement('div');
  etiqueta.className = 'etiqueta-peca';
  etiqueta.hidden = true;
  document.body.appendChild(etiqueta);
  let destaqueCard = [], pecaHover = null, ultHover = 0;
  paineis.aoDestacar = (objs) => { destaqueCard = objs; if (!pecaHover) outline.selectedObjects = objs; };
  function hover(id, cx, cy) {
    if (id !== pecaHover) {
      pecaHover = id;
      outline.selectedObjects = id ? malhasDaPeca[id] ?? [] : destaqueCard;
      renderer.domElement.style.cursor = id ? 'pointer' : '';
      if (id) {
        const p = PECA[id];
        etiqueta.innerHTML = `<b>${esc(p.nome)}</b> <span>× ${fmt(p.qtd[0], 0)}</span><small>clique para abrir na Arquitetura</small>`;
      }
    }
    etiqueta.hidden = !id;
    if (id) etiqueta.style.transform = `translate(${Math.min(cx + 16, innerWidth - 260)}px, ${cy + 18}px)`;
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (modo !== '3d' || e.pointerType !== 'mouse' || e.buttons) { if (pecaHover) hover(null); return; }
    const agora = performance.now();
    if (agora - ultHover < 70) return;
    ultHover = agora;
    hover(pecaSob(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  renderer.domElement.addEventListener('pointerleave', () => hover(null));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!baixo || modo !== '3d') return;
    const arrasto = Math.hypot(e.clientX - baixo[0], e.clientY - baixo[1]);
    baixo = null;
    if (arrasto > 6) return;
    const peca = pecaSob(e.clientX, e.clientY);
    if (peca) { hover(null); irPeca(peca); return; }
    // céu: aponta para a direção clicada (se não bateu no terreno)
    if (sitio.terreno && ray.intersectObject(sitio.terreno, false).length) return;
    const d = ray.ray.direction;
    const el = Math.asin(clamp(d.y, -1, 1)) / DEG;
    if (el < 5) return;
    const az = (Math.atan2(d.x, -d.z) / DEG + 360) % 360;
    if (el < 25) aviso('Abaixo do limite de 25° de elevação: apontando no limite.');
    apontar(az, el);
  });

  // =====================================================================
  // MODO VENTO
  // =====================================================================
  const pc = val('vento.percentis_m_s');
  const lim = val('vento.limite_operacional_gmt_m_s');
  const CENARIOS = [
    { id: 'calmo', nome: 'Calmo', U: pc.p25, nota: 'p25', aberto: true },
    { id: 'mediano', nome: 'Mediano', U: pc.p50, nota: 'p50', aberto: true },
    { id: 'forte', nome: 'Forte operacional', U: pc.p90, nota: 'p90 · para-vento 60%', aberto: true, tela: 0.6 },
    { id: 'limite', nome: 'Limite de fechamento', U: lim, nota: `${fmt(lim, 1)} m/s`, aberto: true, tela: 1 },
    { id: 'tempestade', nome: 'Tempestade de projeto', U: val('vento.tempestade_projeto_m_s'), nota: 'domo fechado', aberto: false },
    { id: 'rajada', nome: 'Rajada', U: pc.p90, nota: `p90 × ${fmt(val('vento.rajada_fator'), 1)}`, aberto: true, rajada: true },
  ];
  $('cenarios').innerHTML = CENARIOS.map((c) => `<button type="button" data-cen="${c.id}" aria-pressed="false">${esc(c.nome)}<small>${fmt(c.U, 1)} m/s · ${esc(c.nota)}</small></button>`).join('');
  let rajada = null;
  function aplicarCenario(id, atualizarHash = true) {
    const c = CENARIOS.find((x) => x.id === id);
    if (!c) return;
    $('cenarios').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cen === id)));
    est.portas = c.aberto ? 1 : 0;
    est.tela = c.tela ?? 0;
    modelo.aplicar();
    campo.config({ U: c.U, aberto: c.aberto, tela: est.tela });
    rajada = c.rajada ? { t0: relogio.elapsedTime, base: c.U } : null;
    sincronizarVento();
    sincronizarSliders();
    agendarSim();
    if (atualizarHash) history.replaceState(null, '', `#vento/${id}`);
  }
  $('cenarios').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) aplicarCenario(b.dataset.cen); });

  const ROTULO_DIR = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const rotDir = (d) => ROTULO_DIR[Math.round(d / 22.5) % 16];
  const ROSA = val('vento.rosa_16');
  function sincronizarVento() {
    const c = campo.c;
    $('U').value = c.U; saida('oU', `${fmt(c.U, 1)} m/s · ${fmt(c.U * 3.6, 0)} km/h`);
    $('dir').value = c.dirDe; saida('oDir', `${fmt(c.dirDe, 0)}° (${rotDir(c.dirDe)})`);
    $('turb').value = Math.round(c.turb * 100); saida('oTurb', `${fmt(c.turb * 100, 0)}%`);
    $('domoAberto').checked = c.aberto;
    $('rel').value = c.rel; saida('oRel', `${fmt(c.rel, 0)}°`);
    rosa($('rosaCtrl'), ROSA, c.dirDe);
    // o domo do modelo acompanha a abertura escolhida em relação ao vento
    if (modo === 'vento') { est.sync = true; est.az = c.azDomo; modelo.aplicar(); sincronizarSliders(); }
  }
  const aoVento = (o) => { campo.config(o); sincronizarVento(); agendarSim(); };
  $('U').addEventListener('input', (e) => { rajada = null; aoVento({ U: +e.target.value }); });
  $('dir').addEventListener('input', (e) => aoVento({ dirDe: +e.target.value }));
  $('turb').addEventListener('input', (e) => aoVento({ turb: e.target.value / 100 }));
  $('rel').addEventListener('input', (e) => aoVento({ rel: +e.target.value }));
  $('domoAberto').addEventListener('change', (e) => { est.portas = e.target.checked ? 1 : 0; modelo.aplicar(); sincronizarSliders(); aoVento({ aberto: e.target.checked }); });
  $('el2').addEventListener('input', (e) => { est.el = +e.target.value; modelo.aplicar(); sincronizarSliders(); agendarSim(); });
  const termo = { T: 10, dTm: 0.3, dTd: 0.8 };
  $('T').addEventListener('input', (e) => { termo.T = +e.target.value; saida('oT', `${fmt(termo.T, 0)} °C`); agendarSim(); });
  $('dTm').addEventListener('input', (e) => { termo.dTm = +e.target.value; saida('oDTm', `${fmt(termo.dTm, 2)} K`); agendarSim(); });
  $('dTd').addEventListener('input', (e) => { termo.dTd = +e.target.value; saida('oDTd', `${fmt(termo.dTd, 2)} K`); agendarSim(); });
  $('rosaCtrl').addEventListener('click', (e) => {
    const r = e.target.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2 - 4;
    aoVento({ dirDe: Math.round(((Math.atan2(x, -y) / DEG + 360) % 360)) });
  });
  const opcVis = { vPlano: 'plano', vPart: 'part', vLinhas: 'linhas', vVolume: 'volume', vSetas: 'setas', vPressao: 'pressao', vHoriz: 'horiz' };
  for (const [idEl, chave] of Object.entries(opcVis)) $(idEl).addEventListener('change', (e) => vis.opcoes({ [chave]: e.target.checked }));
  // o volume e os tubos competem pelo mesmo espaço: ligar um desliga o outro (dá para religar à mão)
  $('vVolume').addEventListener('change', (e) => { if (e.target.checked && $('vLinhas').checked) { $('vLinhas').checked = false; vis.opcoes({ linhas: false }); } });
  $('vLinhas').addEventListener('change', (e) => { if (e.target.checked && $('vVolume').checked) { $('vVolume').checked = false; vis.opcoes({ volume: false }); } });
  $('off').addEventListener('input', (e) => { saida('oOff', `${e.target.value} m`); vis.opcoes({ off: +e.target.value }); });
  $('alt').addEventListener('input', (e) => { saida('oAlt', `${e.target.value} m`); vis.opcoes({ alt: +e.target.value }); });

  // barra de escala do colormap
  const escala = document.createElement('div');
  escala.className = 'escala-cfd vidro';
  escala.hidden = true;
  escala.innerHTML = `<span class="escala-tit">|v| (m/s)</span><i style="background:linear-gradient(90deg,${Array.from({ length: 11 }, (_, i) => cfdCss(i / 10)).join(',')})"></i><span class="escala-num"><b id="esc0">0</b><b id="esc1"></b><b id="esc2"></b></span>`;
  document.body.appendChild(escala);
  function atualizarEscala() {
    const vm = vis.vMax();
    $('esc1').textContent = fmt(vm / 2, 1);
    $('esc2').textContent = fmt(vm, 1);
  }

  // ---------- simulação física e painel de resultados ----------
  let res = null, timerSim = 0, psfPronta = false;
  const lambda = () => +$('banda').value * 1e-6;
  function agendarSim() {
    if (modo !== 'vento') return;
    clearTimeout(timerSim);
    timerSim = setTimeout(rodarSim, 120);
  }
  const _q = new THREE.Quaternion();
  function rodarSim() {
    modelo.raiz.updateMatrixWorld(true);
    const posM1 = modelo.el.localToWorld(V(0, G.M1_Z, 0));
    const posM2 = modelo.el.localToWorld(V(0, modelo.yM2, 0));
    const eixo = V(0, 1, 0).applyQuaternion(modelo.el.getWorldQuaternion(_q));
    res = simular({ campo, posM1, posM2, eixo, T: termo.T, dTm: termo.dTm, dTd: termo.dTd, lambda: lambda() });
    mostrarNumeros();
    desenharGraficos();
    atualizarEscala();
    proximaPSF = 0;
  }

  function num(valor, rotulo, sel = '', alerta = false, titulo = '') {
    return `<div class="num${alerta ? ' alerta' : ''}"${titulo ? ` title="${esc(titulo)}"` : ''}><b>${valor}</b><small>${rotulo}</small>${sel}</div>`;
  }
  function mostrarNumeros() {
    const c = campo.c, s = res.seeing;
    const kN = (x) => `${fmtA(x / 1000)} kN`;
    const html = [
      num(`${fmt(c.U, 1)} m/s`, `vento a 10 m; ${fmt(res.pVento * 100, 0)}% das noites têm menos`, seloDe('modelo.weibull')),
      num(`${fmt(res.rho, 3)} kg/m³`, `densidade do ar a ${fmt(val('local.altitude_m'), 0)} m e ${fmt(termo.T, 0)} °C (ρ = p/RT)`, seloDe('local.pressao_Pa')),
      num(kN(res.Fdomo), `força no domo (½ρv²·Cd·A, v a 40 m = ${fmt(res.Udomo, 1)} m/s)`, seloDe('modelo.cd_domo')),
      num(kN(res.F1m), `força média no M1 (pico ${kN(res.F1max)}); ar no espelho ${fmt(res.v1m, 1)} m/s`, seloDe('modelo.cd_placa')),
      num(kN(res.F2m), `força média no topo/M2 (pico ${kN(res.F2max)})`, seloDe('modelo.area_topo_m2')),
      num(`${fmtA(res.Melm / 1000)} kN·m`, `momento no eixo de elevação (pico ${fmtA(res.Melmax / 1000)})`, seloDe('modelo.area_pernas_m2')),
      num(`${fmtA(res.jitRms)}″`, `erro de apontamento rms (vibração do M2, fn ${fmt(val('montagem.frequencia_natural_hz'), 0)} Hz)`, seloDe('montagem.frequencia_natural_hz'), res.jitRms > 0.02),
      num(`${fmt(res.totalSemAO, 2)}″`, `imagem sem AO a 500 nm (seeing ${fmt(s.total, 2)}″ + vibração)`, seloDe('seeing.dimm_percentis_arcsec'), res.totalSemAO > 0.9,
        `atmosfera livre ${fmt(s.fa, 2)}″ · camada do solo ${fmt(s.gl, 2)}″ · domo ${fmt(s.domo, 2)}″ · espelho ${fmt(s.espelho, 2)}″ (soma pela lei de 5/3)`),
      num(`${fmt(res.r0 * 100, 1)} cm`, `parâmetro de Fried r₀ a 500 nm (${fmt(res.r0L * 100, 0)} cm na banda)`, seloDe('seeing.r0_500nm_mediana_m')),
      num(`${fmt(res.tau0 * 1000, 1)} ms`, `tempo de coerência τ₀ = 0,314·r₀/v (v efetivo ${fmt(res.Vef, 1)} m/s)`, seloDe('modelo.vento_alto_m_s')),
      num(`${fmt(res.strehlAO * 100, 0)}%`, `Strehl com AO em ${fmt(lambda() * 1e6, 2)} µm (Maréchal)`, seloDe('modelo.pitch_atuadores_m'), res.strehlAO < 0.2),
      res.fechar || !c.aberto
        ? num(c.aberto ? 'Fechar o domo' : 'Domo fechado', c.aberto ? `vento acima do limite operacional (${fmt(lim, 1)} m/s)` : 'sem observação; a estrutura resiste à carga', seloDe('vento.limite_operacional_gmt_m_s'), true)
        : num('Observando', `abaixo do limite operacional de ${fmt(lim, 1)} m/s`, seloDe('vento.limite_operacional_gmt_m_s')),
    ];
    $('nums').innerHTML = html.join('');
  }

  const bordasHist = Array.from({ length: 31 }, (_, i) => i);
  const valoresHist = bordasHist.slice(0, -1).map((u) => pdfVento(u + 0.5));
  function desenharGraficos() {
    const sr = res.serie;
    linhas($('gVel'), { series: [{ nome: 'no M1', x: sr.t, y: sr.v1 }, { nome: 'no topo/M2', x: sr.t, y: sr.v2 }], unidade: 'm/s', rotuloX: 's' });
    const k = (a) => Array.from(a, (x) => x / 1000);
    linhas($('gForca'), { series: [{ nome: 'M1', x: sr.t, y: k(sr.F1) }, { nome: 'topo/M2', x: sr.t, y: k(sr.F2) }], unidade: 'kN', rotuloX: 's' });
    linhas($('gJitter'), { series: [{ nome: 'deslocamento da imagem', x: sr.t, y: sr.jit }], unidade: '″', rotuloX: 's', yMin: null });
    const curva = curvaSeeing(res, campo.c.U, termo.dTm, termo.dTd, campo.c.aberto, campo.c.kInt);
    linhas($('gSeeing'), {
      series: [{ nome: 'total sem AO', x: curva.map((p) => p[0]), y: curva.map((p) => p[1]) }, { nome: 'só seeing', x: curva.map((p) => p[0]), y: curva.map((p) => p[2]), tracejado: true }],
      unidade: '″', rotuloX: 'vento (m/s)', marcaX: Math.min(campo.c.U, 25), refs: [{ y: val('seeing.requisito_mediana_arcsec'), rotulo: 'requisito do site' }],
    });
    rosa($('gRosa'), ROSA, campo.c.dirDe);
    histograma($('gHist'), { bordas: bordasHist, valores: valoresHist, atual: campo.c.U, refs: [{ x: pc.p50, rotulo: 'mediana' }, { x: lim, rotulo: 'fecha' }] });
  }

  let proximaPSF = 0, calculandoPSF = false;
  function atualizarPSF(t) {
    if (!res || calculandoPSF || t < proximaPSF || $('resultados').hidden) return;
    if (!psfPronta) { iniciarPSF(val('modelo.L0_m'), val('modelo.pitch_atuadores_m')); psfPronta = true; }
    const longa = $('longa').checked;
    calculandoPSF = true;
    const r = calcularImagens({ lambda: lambda(), r0L: res.r0L, jitter: res.jitRms, vento: res.Vef, dirX: campo.c.ex, dirZ: campo.c.ez, t, longa, alvo: $('alvo').value });
    desenhar($('imgIdeal'), r.imgs[0]);
    desenhar($('imgSemAO'), r.imgs[1]);
    desenhar($('imgComAO'), r.imgs[2]);
    const mas = (x) => `${fmt(x * 1000, 0)} mas`;
    $('psfNum').textContent = `Campo ${fmt(r.pxArcsec * 256, 2)}″ · FWHM ideal ${mas(r.fwhmIdeal)} · sem AO ${mas(r.fwhmSem)} · com AO ${mas(r.fwhmCom)} · Strehl na imagem simulada: sem AO ${fmt(r.strehlSem * 100, 1)}%, com AO ${fmt(r.strehlCom * 100, 0)}% (a AO simulada só remove a turbulência de baixa ordem; o cartão acima soma também atraso e vibração)`;
    calculandoPSF = false;
    proximaPSF = t + (reduzMovimento ? 5 : longa ? 1.5 : 0.35);
  }
  for (const id of ['alvo', 'longa']) $(id).addEventListener('change', () => { proximaPSF = 0; });
  $('banda').addEventListener('change', agendarSim);

  // =====================================================================
  // MODO PESSOA
  // =====================================================================
  $('irFora').addEventListener('click', () => fps.teleportar('fora'));
  $('irPiso').addEventListener('click', () => fps.teleportar('piso'));
  $('irPassarela').addEventListener('click', () => fps.teleportar('passarela'));
  $('ventoAndando').addEventListener('change', (e) => {
    vis.opcoes({ plano: false, part: true, linhas: false, volume: false, setas: false, pressao: false, horiz: false });
    vis.mostrar(e.target.checked && modo === 'pessoa');
  });
  $('som').addEventListener('change', (e) => fps.ligarSom(e.target.checked));

  // =====================================================================
  // ARQUITETURA, BOM, FONTES
  // =====================================================================
  let bomPronto = false, fontesProntas = false;
  $('csv').addEventListener('click', exportarCSV);
  $('imprimir').addEventListener('click', () => print());

  function montarFontes() {
    const D = dados();
    const cont = { oficial: 0, artigo: 0, estimado: 0 };
    const estimados = [];
    (function andar(o, cam) {
      if (!o || typeof o !== 'object') return;
      if ('valor' in o && o.confidence) {
        cont[o.confidence]++;
        if (o.confidence === 'estimado') estimados.push([cam, o]);
        return;
      }
      for (const [k, v] of Object.entries(o)) if (k !== '_meta') andar(v, cam ? `${cam}.${k}` : k);
    })(D, '');
    const fontes = Object.entries(D._meta.fontes);
    const usadas = (k) => JSON.stringify(D).split(`"fonte":"${k}"`).length - 1 + JSON.stringify(D).split(`"fonte": "${k}"`).length - 1;
    $('fontesCorpo').innerHTML = `
      <p>Todos os números da página vêm de <code>data/gmt-data.json</code>: <b>${cont.oficial}</b> oficiais ${selo('oficial')}, <b>${cont.artigo}</b> de artigos ${selo('artigo')} e <b>${cont.estimado}</b> estimados ${selo('estimado')}. Cada selo na página leva à fonte.</p>
      <h3>Referências</h3>
      <ol>${fontes.map(([k, f]) => `<li>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a>` : esc(f.titulo)} <code>${esc(k)}</code> <small>(${usadas(k)} valores)</small></li>`).join('')}</ol>
      <h3 id="metodo">Como funciona a simulação de vento</h3>
      <ul>
        <li><b>Campo de vento:</b> modelo didático, não é CFD. Perfil logarítmico (z₀ = ${fmt(val('vento.rugosidade_z0_m'), 2)} m) + fluxo potencial em torno de um cilindro do tamanho do domo + esteira com vórtices de von Kármán desprendidos na frequência de Strouhal (St ≈ 0,2) + turbulência sintética de Kraichnan (32 modos de Fourier com espectro de von Kármán, livre de divergência). O fluxo dentro do domo depende da abertura da fenda em relação ao vento, dos respiros e do para-vento.</li>
        <li><b>Visualização:</b> tubos de corrente (integração RK2 no campo congelado) ou volume 3D: o campo é amostrado numa grade de 112 × 40 × 56 pontos e desenhado por ray marching, com cor pela velocidade e opacidade pelo desvio em relação ao escoamento livre. A metade do volume do lado da câmera é cortada para o domo aparecer na frente, como num pós-processador de CFD.</li>
        <li><b>Cargas:</b> F = ½·ρ·v²·Cd·A com ρ = p/(R·T) a ${fmt(val('local.altitude_m'), 0)} m. Coeficientes de arrasto e áreas são estimativas de engenharia.</li>
        <li><b>Vibração:</b> o topo da torre é um oscilador massa-mola-amortecedor (fn = ${fmt(val('montagem.frequencia_natural_hz'), 0)} Hz, ζ = ${fmt(val('montagem.amortecimento_estrutural'), 2)}) excitado pela parte flutuante da força; o deslocamento vira erro de apontamento pela sensibilidade de ${fmt(val('modelo.sensibilidade_m2_arcsec_um'), 2)}″/µm.</li>
        <li><b>Seeing:</b> atmosfera livre e camada do solo pelas medianas medidas em Las Campanas, somadas pela lei de 5/3; seeing do domo e do espelho pela relação de Racine (1991), atenuados pela lavagem do ar.</li>
        <li><b>Imagem:</b> tela de fase de von Kármán (L₀ = ${fmt(val('modelo.L0_m'), 0)} m) em fluxo congelado sobre a pupila de 7 discos, FFT 256×256. A óptica adaptativa é um filtro passa-alta com o espaçamento dos atuadores do ASM (${fmt(val('modelo.pitch_atuadores_m'), 3)} m).</li>
        <li><b>Distribuição de vento:</b> Weibull (k = ${fmt(val('modelo.weibull').k, 2)}, c = ${fmt(val('modelo.weibull').c, 2)} m/s) ajustada aos percentis medidos. A rosa dos ventos é uma reconstrução a partir das direções predominante (NE) e secundária (SW) publicadas.</li>
      </ul>
      <h3>Materiais e quantitativos</h3>
      <ul>
        <li>Volumes e áreas são medidos na malha 3D de cada peça (sólidos fechados) e multiplicados pela densidade de <code>data/materials.json</code>.</li>
        <li>Quando existe massa pesquisada, a tabela calibra o resultado por ela e mostra o fator de calibração.</li>
        <li>As peças repetidas são modeladas uma vez e multiplicadas pela quantidade, cuja fonte aparece no catálogo.</li>
        <li><b>Custos:</b> quantidade de cada material × preço unitário estimado (US$, fornecido e instalado) de <code>data/materials.json</code>. ${esc(materiais()._meta.precos ?? '')}</li>
      </ul>
      <h3>Valores estimados (${estimados.length})</h3>
      <ul>${estimados.map(([c, e]) => `<li><code>${esc(c)}</code> = ${esc(typeof e.valor === 'object' ? JSON.stringify(e.valor) : e.valor)}${e.nota ? `: ${esc(e.nota)}` : ''}</li>`).join('')}</ul>
      <h3>Limitações</h3>
      <ul>
        <li>A geometria é procedural, feita a partir das dimensões publicadas e das imagens de divulgação. Detalhes internos (treliças, cabos, tubulações) são simplificados.</li>
        <li>O campo de vento é qualitativo. Para números de projeto, valem os estudos de CFD e túnel de vento do GMT (citados acima).</li>
      </ul>`;
  }

  // =====================================================================
  // ROTEAMENTO DE MODOS
  // =====================================================================
  let modo = null;
  const SOBREPOSICOES = { catalogo: 'catalogo', bom: 'bom', fontes: 'fontes' };
  const cinzas = new Map();
  let fogOrig = scene.fog, camSalva = null;

  /** Cena "de pós-processador" (Vento e Sandbox): modelo cinza, fundo claro, sem céu, terreno nem lasers. */
  function cenaClara(ligar) {
    if (ligar) {
      fogOrig = scene.fog;
      modoCinza(modelo.raiz, true, cinzas);
      scene.background = new THREE.Color(0xdfe3e8);
      scene.fog = null;
      sitio.ceu.visible = sitio.estrelas.visible = sitio.terrenoGrupo.visible = false;
      sitio.setHora(1); renderer.toneMappingExposure = 1;
      lasers.grupo.visible = false;
    } else {
      modoCinza(modelo.raiz, false, cinzas);
      scene.background = null; scene.fog = fogOrig;
      sitio.ceu.visible = sitio.estrelas.visible = sitio.terrenoGrupo.visible = true;
      sitio.setHora(hora); renderer.toneMappingExposure = hora < 0.25 ? 1.15 : 1;
      lasers.grupo.visible = $('lasers').checked;
    }
  }

  // Sandbox: carregado sob demanda na primeira vez que a aba abre
  let sandbox = null, sandboxCarregando = null;
  function obterSandbox() {
    sandboxCarregando ??= import('./sandbox/sandbox.js').then((m) => {
      sandbox = m.criarSandbox({ renderer, scene, camera, controls, composer, modelo });
      window.__sandbox = sandbox; // usado pelos testes de navegador
      return sandbox;
    });
    return sandboxCarregando;
  }

  function irPara(novo, sub = null) {
    if (novo === 'peca' && !PECA[sub]) novo = 'catalogo';
    const anterior = modo;
    if (anterior === novo && novo !== 'peca') {
      if (novo === 'vento' && sub) aplicarCenario(sub, false);
      if (novo === 'sandbox' && sub) obterSandbox().then((s) => s.ativar(true, sub));
      return;
    }
    modo = novo;
    const aba = novo === 'peca' ? 'catalogo' : novo;
    document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === aba)));
    document.querySelectorAll('#painel section[data-para]').forEach((s) => { s.hidden = s.dataset.para !== novo; });
    $('painel').hidden = !['3d', 'pessoa', 'vento', 'sandbox'].includes(novo);
    for (const [m, id] of Object.entries(SOBREPOSICOES)) $(id).hidden = m !== novo;
    document.body.dataset.modo = novo;

    // saída do modo anterior
    if (anterior === 'pessoa') {
      fps.ativar(false);
      $('som').checked = false;
      controls.enabled = true;
      if (camSalva) { camera.position.copy(camSalva[0]); controls.target.copy(camSalva[1]); camera.fov = 45; camera.updateProjectionMatrix(); }
    }
    if (anterior === 'sandbox') {
      sandbox?.ativar(false);
      $('sbRes').hidden = true;
      cenaClara(false);
    }
    if (anterior === 'vento') {
      camera.clearViewOffset();
      cenaClara(false);
      $('resultados').hidden = true;
      escala.hidden = true;
      rajada = null;
    }
    if (anterior === 'peca') visor.ativar(false);
    if (anterior !== 'pessoa' || novo !== 'pessoa') vis.mostrar(false);

    // entrada no novo modo
    controls.enabled = ['3d', 'vento', 'sandbox'].includes(novo);
    modelo.setCorte($('corte').checked && novo !== 'pessoa');
    if (novo !== '3d') { paineis.pararTour(); paineis.fechar(); paineis.atualizarHotspots(false); hover(null); }
    if (novo === 'pessoa') {
      camSalva = [camera.position.clone(), controls.target.clone()];
      camera.fov = 70; camera.updateProjectionMatrix();
      fps.ativar(true);
      vis.opcoes({ plano: false, part: true, linhas: false, volume: false, setas: false, pressao: false, horiz: false });
      vis.mostrar($('ventoAndando').checked);
    }
    if (novo === 'sandbox') {
      cenaClara(true);
      obterSandbox().then((s) => { if (modo === 'sandbox') s.ativar(true, sub); })
        .catch((e) => { console.error(e); aviso(`Erro ao abrir o Sandbox: ${e.message}`); });
    }
    if (novo === 'vento') {
      cenaClara(true);
      vis.opcoes(Object.fromEntries(Object.entries(opcVis).map(([idEl, chave]) => [chave, $(idEl).checked])));
      vis.mostrar(true);
      $('resultados').hidden = false;
      escala.hidden = false;
      est.el = +$('el2').value;
      campo.config({ aberto: est.portas > 0.5, vent: est.vent, tela: est.tela });
      if (sub) aplicarCenario(sub, false);
      else if (!$('cenarios').querySelector('[aria-pressed="true"]')) aplicarCenario('mediano', false);
      sincronizarVento();
      enquadrarVento(true);
      agendarSim();
    }
    if (novo === 'catalogo') catalogo.gerarMiniaturas();
    if (novo === 'bom' && !bomPronto) { montarBOM(); bomPronto = true; }
    if (novo === 'fontes' && !fontesProntas) { montarFontes(); fontesProntas = true; }
    if (novo === 'peca') { visor.ativar(true); visor.abrir(sub); visor.redimensionar(innerWidth, innerHeight); }

    // hash
    const h = novo === 'peca' ? `#arquitetura/${sub}` : novo === 'vento' && sub ? `#vento/${sub}` : `#${novo}`;
    // (o link do Sandbox, #sandbox/<projeto>, é lido pelo próprio Sandbox, que depois limpa o hash)
    if (!location.hash.startsWith(h)) history.replaceState(null, '', h);
  }

  function irPeca(id) { irPara('peca', id); }

  /**
   * Câmera do modo vento: vista lateral (vento da esquerda para a direita), com o domínio inteiro
   * (105 m a barlavento até 175 m na esteira) cabendo no espaço livre entre o painel e os resultados.
   */
  function enquadrarVento(voar) {
    const W = innerWidth, H = innerHeight, larga = W > 820;
    const esq = larga && !$('painel').hidden && !$('painel').classList.contains('fechado') ? $('painel').getBoundingClientRect().right : 0;
    const dir = larga && !$('resultados').hidden ? $('resultados').getBoundingClientRect().left : W;
    const livre = Math.max(240, dir - esq - 24);
    camera.setViewOffset(W, H, -((esq + dir) / 2 - W / 2), 0, W, H);
    if (!voar) return;
    const tanV = Math.tan((camera.fov * DEG) / 2), tanH = tanV * (W / H);
    const d = Math.max((300 / 2) / (tanH * (livre / W)), (130 / 2) / tanV);
    const c = campo.c, p = V(-c.ez, 0, c.ex), centro = V(c.ex * 35, 42, c.ez * 35);
    // três quartos: de lado, um pouco a barlavento e de cima, para os tubos mostrarem profundidade
    const pos = centro.clone().addScaledVector(p, d * 0.82).add(V(0, d * 0.42, 0)).addScaledVector(V(c.ex, 0, c.ez), -d * 0.38);
    voarCamera(camera, controls, pos, centro, 1.8);
  }
  function verNoModelo(id) {
    irPara('3d');
    const p = PECA[id];
    if (!p) return;
    const sub = sisDaPeca(p);
    paineis.abrir(sub, id, true);
  }

  document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.modo)));

  function rotear() {
    const [m, ...resto] = decodeURIComponent(location.hash.slice(1)).split('/');
    const sub = resto.join('/') || undefined;
    if (m === 'arquitetura' && sub) return irPara('peca', sub);
    if (m === 'arquitetura') return irPara('catalogo');
    if (m === '3d' && sub) { irPara('3d'); paineis.abrir(sub, null, true); return; }
    if (m === 'fontes') { irPara('fontes'); if (sub) requestAnimationFrame(() => document.getElementById(sub)?.scrollIntoView()); return; }
    if (['3d', 'pessoa', 'vento', 'catalogo', 'bom', 'sandbox'].includes(m)) return irPara(m, sub);
    irPara('3d');
  }
  addEventListener('hashchange', rotear);

  // ---------- navegação: deslocar, aproximar, girar (botões e teclado) ----------
  const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _d = new THREE.Vector3();
  function navegar(acao, k = 1) {
    const dist = camera.position.distanceTo(controls.target);
    const passo = Math.max(1.5, dist * 0.12) * k;
    camera.updateMatrixWorld();
    _r.setFromMatrixColumn(camera.matrixWorld, 0);
    _u.setFromMatrixColumn(camera.matrixWorld, 1);
    const mover = (v, s) => { camera.position.addScaledVector(v, s); controls.target.addScaledVector(v, s); };
    if (acao === 'esq') mover(_r, -passo);
    if (acao === 'dir') mover(_r, passo);
    if (acao === 'cima') mover(_u, passo);
    if (acao === 'baixo') mover(_u, -passo);
    if (acao === 'aproximar' || acao === 'afastar') {
      _d.subVectors(camera.position, controls.target);
      const nova = clamp(dist * (acao === 'aproximar' ? 0.85 : 1 / 0.85) ** k, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).addScaledVector(_d.normalize(), nova);
    }
    if (acao === 'girarE' || acao === 'girarD') {
      _d.subVectors(camera.position, controls.target).applyAxisAngle(V(0, 1, 0), (acao === 'girarE' ? -1 : 1) * 10 * DEG * k);
      camera.position.copy(controls.target).add(_d);
    }
    if (acao === 'inicio') { if (modo === 'vento') enquadrarVento(true); else voarCamera(camera, controls, VISTA_INICIAL[0].clone(), VISTA_INICIAL[1].clone(), 1.2); return; }
    camera.position.y = Math.max(camera.position.y, 1.5);
    camera.lookAt(controls.target);
  }
  // segurar o botão repete o movimento
  let repetir = 0;
  document.querySelectorAll('[data-nav]').forEach((b) => {
    const parar = () => clearInterval(repetir);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const acao = b.dataset.nav;
      navegar(acao);
      parar();
      if (acao !== 'inicio') repetir = setInterval(() => navegar(acao, 0.35), 50);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, parar);
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navegar(b.dataset.nav); } });
  });

  // ---------- painel, atalhos, qualidade ----------
  $('btnPainel').addEventListener('click', () => {
    const fechado = $('painel').classList.toggle('fechado');
    $('btnPainel').setAttribute('aria-expanded', String(!fechado));
  });
  if (innerWidth <= 820) { $('painel').classList.add('fechado'); $('btnPainel').setAttribute('aria-expanded', 'false'); }

  addEventListener('keydown', (e) => {
    if (e.target.closest('input[type="search"], input[type="text"], input[type="number"], select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    const atalhos = { Digit1: '3d', Digit2: 'pessoa', Digit3: 'vento', Digit4: 'catalogo', Digit5: 'bom', Digit6: 'sandbox' };
    if (atalhos[e.code]) { irPara(atalhos[e.code]); return; }
    if (e.code === 'KeyH') document.body.classList.toggle('ui-oculta');
    if ((modo === '3d' || modo === 'vento' || modo === 'sandbox') && !e.target.closest('input, button')) {
      const teclaNav = { ArrowLeft: 'esq', ArrowRight: 'dir', ArrowUp: 'cima', ArrowDown: 'baixo', Equal: 'aproximar', NumpadAdd: 'aproximar', Minus: 'afastar', NumpadSubtract: 'afastar' }[e.code];
      if (teclaNav) { e.preventDefault(); navegar(teclaNav, 0.5); return; }
    }
    if (modo !== '3d') return;
    if (e.code === 'KeyF' && paineis.atual) paineis.focarSub(paineis.atual);
    if (e.code === 'KeyE') alternarExplodida();
    if (e.code === 'Escape') paineis.fechar();
  });

  function aplicarQualidade(q) {
    const dpr = { baixa: 1, media: Math.min(devicePixelRatio, 1.5), alta: Math.min(devicePixelRatio, 2) }[q];
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = q !== 'baixa';
    sitio.sol.castShadow = q !== 'baixa';
    sitio.sol.shadow.mapSize.setScalar(q === 'alta' ? 4096 : 2048);
    if (sitio.sol.shadow.map) { sitio.sol.shadow.map.dispose(); sitio.sol.shadow.map = null; }
    gtao.enabled = q === 'alta';
    bloom.enabled = q !== 'baixa';
    redimensionar();
  }
  $('qualidade').addEventListener('change', (e) => aplicarQualidade(e.target.value));

  function redimensionar() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    visor.redimensionar(w, h);
    if (modo === 'vento') enquadrarVento(false);
  }
  addEventListener('resize', redimensionar);
  aplicarQualidade(qualidadeIni);

  // ---------- laço ----------
  const relogio = new THREE.Clock();
  let nQuadros = 0, tFps = 0;
  sincronizarSliders();
  sincronizarVento();
  rotear();

  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(relogio.getDelta(), 0.1), t = relogio.elapsedTime;
    atualizarTweens(agora);
    nQuadros++;
    if (t - tFps > 1) { $('fps').textContent = `${Math.round(nQuadros / (t - tFps))} fps`; nQuadros = 0; tFps = t; }

    if (modo === 'peca') { visor.render(); return; }
    if (SOBREPOSICOES[modo]) return;

    if (rajada) {
      const k = (t - rajada.t0) / 8;
      const pulso = Math.exp(-(((k * 8 - 3) / 1.3) ** 2));
      campo.config({ U: rajada.base * (1 + (val('vento.rajada_fator') - 1) * pulso) });
      saida('oU', `${fmt(campo.c.U, 1)} m/s · ${fmt(campo.c.U * 3.6, 0)} km/h (rajada)`);
      if (k >= 1) rajada.t0 = t; // repete a rajada a cada 8 s
      if (Math.abs(k * 8 - 3) < dt) agendarSim(); // recalcula no pico
    }
    if (controls.enabled) controls.update();
    fps.atualizar(dt, t);
    vis.atualizar(dt, t);
    lasers.atualizar(t);
    if (modo !== 'pessoa') modelo.atualizarCorte(camera);
    paineis.atualizarHotspots(modo === '3d');
    if (modo === 'vento') atualizarPSF(t);
    composer.render(dt);
  }

  progresso(1, 'Pronto');
  await quadroLivre();
  $('carregando').hidden = true;
  requestAnimationFrame(quadro);
  if (!location.hash || location.hash === '#3d') voarCamera(camera, controls, VISTA_INICIAL[0].clone(), VISTA_INICIAL[1].clone(), reduzMovimento ? 0.01 : 3);
}
