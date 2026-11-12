// Página do Orçamento 3D: cena, câmera, luzes, chão, roteamento (#), abertura de arquivos e telas
// (editor, assistente, ajuda). Abre com o galpão de exemplo; o projeto da pessoa entra pelo assistente.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { aviso, usarFontes, esc } from './util.js';
import { criarEditor } from './editor.js';
import { validarPacote, carregarBase, FORMATO_PACOTE, MAX_PACOTE } from './base/pacote.js';
import * as P from './nucleo/projeto.js';
import { automatico } from './base/montagem.js';
import { classificar } from './formatos/index.js';
import { modoCinza } from './nucleo/cinza.js';

const $ = (id) => document.getElementById(id);
const EXEMPLO = 'data/exemplos/galpao.orc3d-pacote.json';

// ---------- WebGL ----------
const teste = document.createElement('canvas');
if (!teste.getContext('webgl2')) { $('carregando').hidden = true; $('semWebgl').hidden = false; throw new Error('Sem WebGL 2'); }

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('palco').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1124);
scene.fog = new THREE.Fog(0x0b1124, 400, 1600);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 5000);
camera.position.set(40, 30, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.maxPolarAngle = Math.PI * 0.495;

scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303848, 1.6));
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
scene.add(sol, sol.target);

// chão plano automático (quando o pacote não marca um chão): alvo dos cabos pelo chão
const chaoVirtual = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1b2440, roughness: 1, metalness: 0 }));
chaoVirtual.receiveShadow = true;
chaoVirtual.userData.semCinza = true;
chaoVirtual.name = 'chao-automatico';
scene.add(chaoVirtual);
const grade = new THREE.GridHelper(1, 1, 0x2c3a66, 0x1f2a4d);
grade.userData.previa = true;
scene.add(grade);

/** Ajusta câmera, sombra e chão automático ao tamanho do modelo. */
function enquadrar(obj, chaoY = null) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) box.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 3, 5));
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z, 1);
  camera.near = r / 2000; camera.far = r * 60; camera.updateProjectionMatrix();
  scene.fog.near = r * 6; scene.fog.far = r * 25;
  const k = Math.max(1, 1.1 / camera.aspect); // tela estreita (celular): afasta mais
  camera.position.set(c.x + r * 0.85 * k, c.y + r * 0.6 * k, c.z + r * 1.05 * k);
  controls.target.copy(c);
  controls.update();
  const y = chaoY ?? box.min.y;
  const lado = Math.max(r * 6, 40);
  chaoVirtual.scale.set(lado, 1, lado);
  chaoVirtual.position.set(c.x, y - 0.002, c.z);
  const passo = r > 200 ? 10 : r > 40 ? 2 : r > 8 ? 1 : 0.1;
  grade.scale.set(lado, 1, lado);
  grade.position.set(c.x, y, c.z);
  grade.geometry.dispose();
  grade.geometry = new THREE.GridHelper(1, Math.min(400, Math.round(lado / passo)), 0x2c3a66, 0x1f2a4d).geometry;
  sol.position.set(c.x + r, c.y + r * 2, c.z + r * 0.6);
  sol.target.position.copy(c);
  const sc = sol.shadow.camera;
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.1; sc.far = r * 6;
  sc.updateProjectionMatrix();
}

// ---------- dados ----------
let biblioteca = null;
async function carregarBiblioteca() {
  const r = await fetch(new URL('../data/materiais.json', import.meta.url));
  if (!r.ok) throw new Error('Não foi possível carregar a biblioteca de materiais.');
  biblioteca = await r.json();
  usarFontes(biblioteca._meta?.fontes);
}

// ---------- editor ----------
const editor = criarEditor({ renderer, scene, camera, controls, chaoVirtual, aoTrocarProjeto: () => atualizarTitulo() });
let cenaAtual = null;
function atualizarTitulo() {
  const b = editor.base;
  $('tituloPacote').textContent = b ? b.nome : '';
}

/** Abre um pacote validado (troca a base). projetoObj: projeto cru a aplicar sobre ele (opcional). */
async function abrirPacote(obj, projetoObj = null, msg = null) {
  const { pacote, avisos } = validarPacote(obj, biblioteca);
  const base = await carregarBase(pacote, biblioteca);
  let p = null, avisosP = [];
  if (projetoObj) ({ projeto: p, avisos: avisosP } = P.validarProjeto(projetoObj, base));
  if (cenaAtual) { modoCinza(cenaAtual, false); scene.remove(cenaAtual); }
  cenaAtual = base.cena;
  scene.add(base.cena);
  const chaoY = base.terreno ? null : undefined;
  enquadrar(base.cena, chaoY);
  chaoVirtual.visible = !base.terreno;
  grade.visible = !base.terreno;
  await editor.usarBase(base, p, msg ?? `Pacote "${pacote.nome}" aberto`);
  const todos = [...avisos, ...base.avisos, ...avisosP];
  if (todos.length) setTimeout(() => aviso(todos.join(' ')), 2400);
  mostrar('editor');
  return base;
}

/** Abre um texto JSON: pacote (.orc3d-pacote.json) ou projeto (.orc3d.json). modo: 'importar' | 'comparar'. */
async function abrirJSON(texto, modo = 'importar') {
  const obj = P.lerJSON(texto, P.MAX_ARQUIVO);
  if (obj?.formato === FORMATO_PACOTE) {
    if (modo === 'comparar') throw new Error('Para comparar, escolha um projeto (.orc3d.json), não um pacote.');
    if (texto.length > MAX_PACOTE) throw new Error('Pacote grande demais (máx. 40 MB).');
    return abrirPacote(obj);
  }
  if (obj?.formato !== P.FORMATO) throw new Error('Este JSON não é um pacote nem um projeto do Orçamento 3D.');
  const base = editor.base;
  if (modo === 'comparar') {
    if (!P.mesmaBase(obj, base)) throw new Error('Só dá para comparar projetos feitos sobre o mesmo pacote que está aberto.');
    editor.comparar(obj, obj.nome);
    aviso('Comparação pronta no painel de resultados');
    return base;
  }
  if (obj.pacote) return abrirPacote(obj.pacote, obj, `Projeto "${String(obj.nome ?? '').slice(0, 60)}" importado (com o pacote)`);
  if (!P.mesmaBase(obj, base)) throw new Error(`Este projeto foi feito sobre outro pacote ("${String(obj.base?.nome ?? 'desconhecido').slice(0, 60)}"), e o arquivo não traz o pacote junto. Abra primeiro esse pacote (ou peça o arquivo .orc3d.json completo).`);
  const { avisos } = await editor.carregar(obj, `Projeto "${String(obj.nome ?? '').slice(0, 60)}" importado (Desfazer volta ao anterior)`);
  if (avisos.length) setTimeout(() => aviso(avisos.join(' ')), 2400);
  return base;
}

async function abrirLink(dados) {
  try {
    const obj = await P.descomprimir(dados);
    if (!P.mesmaBase(obj, editor.base)) {
      aviso(`Este link é de um orçamento feito sobre outro pacote ("${String(obj?.base?.nome ?? 'desconhecido').slice(0, 60)}"). O link não leva o pacote: abra primeiro o pacote (ou peça o arquivo .orc3d.json) e depois abra o link de novo.`, 9000);
      return false;
    }
    const { avisos } = await editor.carregar(obj, `Orçamento "${String(obj.nome ?? '').slice(0, 60)}" aberto pelo link`);
    if (avisos.length) setTimeout(() => aviso(avisos.join(' ')), 2400);
    return true;
  } catch (err) { aviso(err.message); return false; }
  finally { history.replaceState(null, '', location.pathname); }
}

// ---------- telas ----------
let assistente = null;
async function obterAssistente() {
  if (!assistente) {
    const { criarAssistente } = await import('./assistente.js');
    assistente = criarAssistente({
      scene, camera, controls, renderer, biblioteca, enquadrar,
      aoSair: () => { if (cenaAtual) cenaAtual.visible = true; chaoVirtual.visible = !editor.base?.terreno; grade.visible = chaoVirtual.visible; if (editor.base) enquadrar(editor.base.cena); mostrar('editor'); },
      aoConcluir: async (pacoteObj) => { await abrirPacote(pacoteObj, null, `Pacote "${pacoteObj.nome}" pronto para orçar`); },
    });
  }
  return assistente;
}
function mostrar(tela) {
  document.body.dataset.tela = tela;
  $('painel').hidden = tela !== 'editor';
  $('edRes').hidden = tela !== 'editor';
  $('ajuda').hidden = tela !== 'ajuda';
  $('assist').hidden = tela !== 'assistente';
  editor.ativar(tela === 'editor');
  if (tela === 'ajuda' && !$('ajudaCorpo').childElementCount) import('./ajuda.js').then((m) => m.montarAjuda($('ajudaCorpo'))).catch((e) => aviso(e.message));
  if (tela !== 'ajuda' && location.hash === '#ajuda') history.replaceState(null, '', location.pathname);
}
async function abrirAssistente(arquivos) {
  const a = await obterAssistente();
  if (cenaAtual) cenaAtual.visible = false;
  mostrar('assistente');
  await a.abrir(arquivos);
}

/** Arquivos recebidos (seleção ou arrastar): JSON abre direto; 3D (+ .csv, .mtl, .bin, texturas) vai ao assistente. */
async function receber(arquivos, modo = 'importar') {
  const lista = [...arquivos];
  if (!lista.length) return;
  const c = classificar(lista);
  try {
    if (c.modelos.length) { await abrirAssistente(lista); return; }
    if (c.dxf.length) { mostrar('editor'); await editor.abrirDXF(c.dxf[0]); return; }
    if (c.json.length) {
      const f = c.json[0];
      if (f.size > P.MAX_ARQUIVO) throw new Error(`Arquivo grande demais (máx. ${Math.round(P.MAX_ARQUIVO / 1e6)} MB).`);
      await abrirJSON(await f.text(), modo);
      return;
    }
    if (c.csv.length) { aviso('Um .csv sozinho é só o catálogo: mande junto do modelo 3D, ou importe no passo 3 do assistente.'); return; }
    aviso(c.recusados.join(' ') || 'Arquivo não reconhecido.', 8000);
  } catch (err) { aviso(err.message, 7000); }
}

$('btnImportar').addEventListener('click', () => $('arqImportar').click());
$('arqImportar').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; receber(f); });
$('btnAbrir').addEventListener('click', () => { $('arqAbrir').dataset.modo = 'importar'; $('arqAbrir').click(); });
$('edImportar').addEventListener('click', () => { $('arqAbrir').dataset.modo = 'importar'; $('arqAbrir').click(); });
$('edComparar').addEventListener('click', () => { $('arqAbrir').dataset.modo = 'comparar'; $('arqAbrir').click(); });
$('arqAbrir').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; receber(f, e.target.dataset.modo || 'importar'); });
$('btnAjuda').addEventListener('click', () => { location.hash = 'ajuda'; });
$('ajudaFechar').addEventListener('click', () => { history.replaceState(null, '', location.pathname); mostrar('editor'); });
$('btnExemplo').addEventListener('click', async () => {
  try { await abrirExemplo(); } catch (err) { aviso(err.message); }
});
$('btnPainel').addEventListener('click', () => {
  const p = $('painel');
  p.classList.toggle('fechado');
  $('btnPainel').setAttribute('aria-expanded', String(!p.classList.contains('fechado')));
});
addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); document.body.classList.add('soltando'); } });
addEventListener('dragleave', (e) => { if (e.target === document.documentElement || !e.relatedTarget) document.body.classList.remove('soltando'); });
addEventListener('drop', (e) => {
  document.body.classList.remove('soltando');
  if (!e.dataTransfer?.files?.length) return;
  e.preventDefault();
  if (document.body.dataset.tela === 'assistente' && assistente) { assistente.receber([...e.dataTransfer.files]); return; }
  receber(e.dataTransfer.files);
});
addEventListener('hashchange', () => rota());
function rota() {
  const h = location.hash;
  if (h === '#ajuda') { mostrar('ajuda'); $('ajuda').focus(); return; }
  if (h.startsWith('#p/')) { abrirLink(h.slice(3)); return; }
}

async function abrirExemplo() {
  const r = await fetch(new URL(`../${EXEMPLO}`, import.meta.url));
  if (!r.ok) throw new Error('Não foi possível carregar o galpão de exemplo.');
  return abrirPacote(await r.json(), null, 'Galpão de exemplo aberto');
}

// ---------- laço ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  if (document.hidden) return;
  controls.update();
  renderer.render(scene, camera);
});

// ---------- início ----------
async function iniciar() {
  const barra = $('barra');
  barra.style.width = '20%';
  await carregarBiblioteca();
  barra.style.width = '45%';
  // autosave: projeto da última visita (com o pacote, se coube)
  const local = P.lerLocal();
  let aberto = false;
  if (local?.formato === P.FORMATO && local.pacote) {
    try { await abrirPacote(local.pacote, local, `Orçamento "${String(local.nome ?? '').slice(0, 60)}" restaurado`); aberto = true; } catch { /* autosave inválido: segue com o exemplo */ }
  }
  barra.style.width = '70%';
  if (!aberto) {
    await abrirExemplo();
    if (local?.formato === P.FORMATO && !local.pacote && P.mesmaBase(local, editor.base) && local.edicoes?.length) {
      try { await editor.carregar(local, `Orçamento "${String(local.nome ?? '').slice(0, 60)}" restaurado`); } catch { /* ignora */ }
    } else if (local?.formato === P.FORMATO && !local.pacote && !P.mesmaBase(local, editor.base)) {
      setTimeout(() => aviso('O último orçamento usava um pacote grande demais para o salvamento automático; abra o arquivo .orc3d.json dele para continuar.', 7000), 2600);
    }
  }
  barra.style.width = '100%';
  $('carregando').hidden = true;
  rota();
}

// API para os testes (e para quem quiser automatizar no console)
window.__orc = {
  editor, abrirJSON, abrirPacote, abrirExemplo, receber, abrirAssistente,
  get biblioteca() { return biblioteca; },
  get assistente() { return assistente; },
  automatico: (arquivos, opcoes) => automatico(biblioteca, arquivos, opcoes),
  P, enquadrar, scene, camera, renderer, esc,
};

iniciar().catch((err) => {
  $('carregando').hidden = true;
  aviso(`Falha ao iniciar: ${err.message}`, 9000);
  window.__orc.erro = err.message;
});
