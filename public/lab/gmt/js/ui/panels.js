// Card do subsistema, hotspots na cena, tour guiado e formatação dos números com selo de fonte.
import * as THREE from 'three';
import { SUBS, SUB } from '../model/subsistemas.js';
import { PECA } from '../model/parts.js';
import { entrada, selo, esc } from '../data.js';
import { fmt, fmtA, voarCamera, reduzMovimento } from '../util.js';
import { criarPrevia } from './previews.js';

const $ = (id) => document.getElementById(id);

/** Formata um valor do JSON (número, faixa, objeto ou texto). */
export function formatar(v, un = '') {
  const u = un ? ` ${un}` : '';
  if (typeof v === 'number') {
    if (un === 'US$') return `US$ ${fmt(v / 1e9, 1)} bi`;
    if (Math.abs(v) < 1 && v !== 0 && !un) return fmt(v * 100, 0) + '%';
    return (Number.isInteger(v) ? fmt(v, 0) : fmtA(v)) + u;
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'number' ? fmtA(x) : x)).join(' – ') + u;
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k.replace(/_/g, ' ')} ${typeof x === 'number' ? fmtA(x) : x}`).join(' · ') + u;
  return String(v ?? '–');
}

export function linhaDado(rotulo, caminho, un) {
  const e = entrada(caminho);
  if (!e) return '';
  const valor = typeof e === 'object' && 'valor' in e ? e.valor : e;
  const nota = e.nota ? ` title="${esc(e.nota)}"` : '';
  return `<dt>${esc(rotulo)}</dt><dd${nota}>${esc(formatar(valor, un))} ${e.confidence ? selo(e.confidence, e.fonte) : ''}</dd>`;
}

export function criarPaineis({ modelo, camera, controls, aoAbrirPeca }) {
  const card = $('card'), previa = criarPrevia($('previa'));
  let atual = null, pecaAtual = null;

  // ---------- hotspots ----------
  const camada = $('rotulos3d');
  const botoes = SUBS.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hotspot';
    b.textContent = String(i + 1);
    b.setAttribute('aria-label', s.nome);
    b.innerHTML = `${i + 1}<span>${esc(s.nome)}</span>`;
    b.style.position = 'absolute';
    b.addEventListener('click', () => abrir(s.id, null, true));
    camada.appendChild(b);
    return { b, s };
  });
  const _p = new THREE.Vector3();
  function atualizarHotspots(visivel) {
    camada.hidden = !visivel;
    if (!visivel) return;
    const w = innerWidth, h = innerHeight;
    for (const { b, s } of botoes) {
      modelo.ancoras[s.id].getWorldPosition(_p);
      _p.project(camera);
      const fora = _p.z > 1 || Math.abs(_p.x) > 1.05 || Math.abs(_p.y) > 1.05;
      b.style.display = fora ? 'none' : '';
      b.style.transform = `translate(${((_p.x + 1) / 2) * w - 13}px, ${((1 - _p.y) / 2) * h - 13}px)`;
    }
  }

  // ---------- card ----------
  function abrir(id, pecaId, focar = false) {
    const s = SUB[id];
    if (!s) return;
    atual = id;
    pecaAtual = pecaId ?? s.peca;
    $('cardNum').textContent = `Subsistema ${SUBS.indexOf(s) + 1} de ${SUBS.length}`;
    $('cardNome').textContent = s.nome;
    $('cardFuncao').textContent = s.funcao;
    $('previaLegenda').textContent = s.legenda;
    $('cardDados').innerHTML = s.dados.map(([r, c, u]) => linhaDado(r, c, u)).join('');
    const p = PECA[pecaAtual];
    const cp = $('cardPeca');
    if (pecaId && p) {
      cp.hidden = false;
      cp.innerHTML = `Peça clicada: <b>${esc(p.nome)}</b> · ${fmt(p.qtd[0], 0)} un. ${selo(p.qtd[2], p.qtd[1])}`;
    } else cp.hidden = true;
    $('btnAbrirPeca').textContent = `Abrir “${p ? p.nome : 'peça'}” na Arquitetura →`;
    card.hidden = false;
    previa.mostrar(s.previa);
    destacar(id);
    if (focar) focarSub(id);
    if (location.hash !== `#3d/${id}`) history.replaceState(null, '', `#3d/${id}`);
  }
  function fechar() {
    card.hidden = true;
    previa.parar();
    destacar(null);
    atual = null;
    if (location.hash.startsWith('#3d/')) history.replaceState(null, '', '#3d');
  }
  $('fecharCard').addEventListener('click', fechar);
  $('btnFoco').addEventListener('click', () => atual && focarSub(atual));
  $('btnAbrirPeca').addEventListener('click', () => pecaAtual && aoAbrirPeca(pecaAtual));

  // contorno do subsistema selecionado (OutlinePass recebe a lista)
  let aoDestacar = () => {};
  function destacar(id) { aoDestacar(id ? modelo.gruposDe(id) : []); }

  const _box = new THREE.Box3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
  function caixaSub(id) {
    _box.makeEmpty();
    for (const g of modelo.gruposDe(id)) _box.expandByObject(g);
    return _box;
  }
  function focarSub(id, dur = 1.6) {
    const b = caixaSub(id);
    if (b.isEmpty()) return null;
    b.getCenter(_c); b.getSize(_s);
    const r = Math.max(8, _s.length() * 0.55);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.15) dir.y = 0.35;
    dir.normalize();
    const pos = _c.clone().addScaledVector(dir, r / Math.tan((camera.fov * Math.PI) / 360) * 0.9);
    return voarCamera(camera, controls, pos, _c.clone(), dur);
  }

  // ---------- tour ----------
  const ROTEIRO = [
    ['domo', 'O GMT fica no cume de Las Campanas, no Chile, a ~2.500 m. O prédio inteiro de 65 m gira para acompanhar o telescópio.'],
    ['portas', 'Duas portas em L abrem uma fenda de 27 m. Juntas, pesam 667 toneladas.'],
    ['m1', 'Sete espelhos de 8,4 m formam um espelho de 25,4 m. Cada um é um favo de mel de vidro de ~17 t.'],
    ['celulas', 'Embaixo de cada espelho, 160 atuadores corrigem a forma do vidro conforme o telescópio inclina.'],
    ['asm', 'No alto, o secundário adaptativo deforma cascas de 2 mm 2.000 vezes por segundo para desfazer a turbulência.'],
    ['lgs', 'Seis lasers criam estrelas artificiais a 90 km para guiar essa correção.'],
    ['torre', 'A torre precisa ser rígida: o vento sacode o M2 e a estrela "treme" na imagem.'],
    ['montagem', 'Dois C-rings de 19 m inclinam o conjunto óptico de 25° a 90°.'],
    ['azimute', 'Tudo gira sobre um trilho de 21,5 m, flutuando num filme de óleo de 50 µm.'],
    ['instrumentos', 'A luz desce pelo furo central até os instrumentos no rotador Gregoriano.'],
    ['pier', 'O pier de concreto fica sobre 24 pêndulos de atrito: num terremoto, o chão anda e o telescópio quase não.'],
    ['ventilacao', 'Mais de 300 respiros deixam o vento lavar o ar quente de dentro do domo.'],
  ];
  let passoTour = -1, timer = 0;
  function tourPasso() {
    if (passoTour < 0) return;
    if (passoTour >= ROTEIRO.length) { pararTour(); return; }
    const [id, texto] = ROTEIRO[passoTour];
    abrir(id, null, false);
    focarSub(id, reduzMovimento ? 0.01 : 2.2);
    $('narracaoTexto').textContent = `${passoTour + 1}/${ROTEIRO.length} · ${texto}`;
    timer = setTimeout(() => { passoTour++; tourPasso(); }, reduzMovimento ? 6000 : 7500);
  }
  function iniciarTour() { passoTour = 0; $('narracao').hidden = false; tourPasso(); }
  function pararTour() { passoTour = -1; clearTimeout(timer); $('narracao').hidden = true; }
  $('btnTour').addEventListener('click', () => (passoTour >= 0 ? pararTour() : iniciarTour()));
  $('pararTour').addEventListener('click', pararTour);

  return {
    abrir, fechar, atualizarHotspots, focarSub, pararTour,
    get atual() { return atual; },
    set aoDestacar(f) { aoDestacar = f; },
    previa,
  };
}
