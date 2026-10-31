// Perspectiva humana: andar pelo cume, pelo piso de observação e pelas passarelas do domo.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { alturaTerreno } from './model/site.js';
import { clamp, ehToque, fmt } from './util.js';

const OLHO = 1.7, PASSO = 0.65, TAU = Math.PI * 2;

export function criarFPS({ camera, dom, modelo, campo }) {
  const ctl = new PointerLockControls(camera, dom);
  const ray = new THREE.Raycaster();
  ray.far = 60;
  const baixo = new THREE.Vector3(0, -1, 0);
  const teclas = new Set();
  const pe = new THREE.Vector3(0, 0, 60);
  let vy = 0, ativo = false, yaw = Math.PI, pitch = 0;
  const joy = { x: 0, y: 0 };
  const ui = { mapa: document.getElementById('minimapa'), pos: document.getElementById('posicao'), travar: document.getElementById('travar') };

  // ---------- chão ----------
  function chao(x, z, yRef) {
    const r = Math.hypot(x, z);
    let melhor = -Infinity;
    if (r > 30.62) melhor = alturaTerreno(x, z);
    ray.set(new THREE.Vector3(x, yRef + 1.2, z), baixo);
    const hits = ray.intersectObjects(modelo.pisos, true);
    for (const h of hits) if (h.point.y <= yRef + PASSO && h.point.y > melhor) { melhor = h.point.y; break; }
    return melhor;
  }

  // ---------- paredes (regras radiais simples) ----------
  function bloqueado(x, z, y) {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    // parede do enclosure inferior, com a porta de cargas no sul (+Z)
    const naPorta = Math.abs(a - Math.PI / 2) < 0.07 && y < 4.5;
    if (y < 11.5 && r > 29.6 && r < 30.9 && !naPorta) return true;
    // pier: não dá para entrar nem atravessar
    if (y < 11.5 && r < 11.6) return true;
    // dentro do domo superior: paredes e anel-base
    if (y >= 11.5 && r > 30.1) return true;
    if (y >= 11.5 && y < 15.6 && r > 26.9) return true;
    if (r > 900) return true;
    return false;
  }

  function teleportar(local) {
    if (local === 'fora') { pe.set(4, 0, 72); pe.y = alturaTerreno(pe.x, pe.z); yaw = 0; pitch = 0.32; }
    if (local === 'piso') { pe.set(-16, 12, 14); yaw = -0.9; pitch = 0.45; }
    if (local === 'passarela') {
      modelo.domo.updateMatrixWorld();
      // procura, perto do lado oposto à fenda, um ponto do anel de 46 m que tenha piso de verdade embaixo
      const p = new THREE.Vector3();
      for (let k = 0; k < 40; k++) {
        const a = Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.02;
        p.set(27.6 * Math.cos(a), 46.06, 27.6 * Math.sin(a)).applyMatrix4(modelo.domo.matrixWorld);
        const ch = chao(p.x, p.z, 46.5);
        if (ch > 45.5) { p.y = ch; break; }
      }
      pe.copy(p); yaw = Math.atan2(p.x, p.z); pitch = -0.25;
    }
    vy = 0;
    aplicarOlhar();
  }
  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function aplicarOlhar() {
    _e.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(_e);
    camera.position.set(pe.x, pe.y + OLHO, pe.z);
  }

  // ---------- entrada ----------
  const tecla = (e, on) => {
    if (!ativo) return;
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) {
      if (on) teclas.add(k); else teclas.delete(k);
      if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
    }
  };
  addEventListener('keydown', (e) => tecla(e, true));
  addEventListener('keyup', (e) => tecla(e, false));
  dom.addEventListener('click', () => { if (ativo && !ehToque) ctl.lock(); });
  ctl.addEventListener('lock', () => { ui.travar.hidden = true; });
  ctl.addEventListener('unlock', () => { ui.travar.hidden = !ativo; const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yaw = e.y; pitch = e.x; });
  ctl.addEventListener('change', () => { const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yaw = e.y; pitch = e.x; });

  // toque: joystick (mover) e arrastar (olhar)
  const js = document.getElementById('joystick'), bola = js.querySelector('span');
  let jsId = null, olharId = null, ult = null;
  js.addEventListener('pointerdown', (e) => { jsId = e.pointerId; js.setPointerCapture(e.pointerId); moverJoy(e); });
  js.addEventListener('pointermove', (e) => { if (e.pointerId === jsId) moverJoy(e); });
  const soltar = () => { jsId = null; joy.x = joy.y = 0; bola.style.transform = ''; };
  js.addEventListener('pointerup', soltar); js.addEventListener('pointercancel', soltar);
  function moverJoy(e) {
    const r = js.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    joy.x = x; joy.y = y;
    bola.style.transform = `translate(${x * 35}px, ${y * 35}px)`;
  }
  dom.addEventListener('pointerdown', (e) => { if (ativo && e.pointerType !== 'mouse') { olharId = e.pointerId; ult = [e.clientX, e.clientY]; } });
  dom.addEventListener('pointermove', (e) => {
    if (!ativo || e.pointerId !== olharId || !ult) return;
    yaw -= (e.clientX - ult[0]) * 0.005; pitch = clamp(pitch - (e.clientY - ult[1]) * 0.005, -1.4, 1.4);
    ult = [e.clientX, e.clientY];
    aplicarOlhar();
  });
  dom.addEventListener('pointerup', (e) => { if (e.pointerId === olharId) { olharId = null; ult = null; } });

  // ---------- som do vento (ruído rosa filtrado) ----------
  let audio = null;
  function ligarSom(on) {
    if (on && !audio) {
      const ac = new AudioContext();
      const n = ac.sampleRate * 3, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.15; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const filtro = ac.createBiquadFilter(); filtro.type = 'bandpass'; filtro.Q.value = 0.8; filtro.frequency.value = 400;
      const ganho = ac.createGain(); ganho.gain.value = 0;
      src.connect(filtro).connect(ganho).connect(ac.destination);
      src.start();
      audio = { ac, filtro, ganho };
    }
    if (audio) { if (on) audio.ac.resume(); else audio.ac.suspend(); }
  }
  const _o = [0, 0, 0];

  // ---------- minimapa ----------
  function desenharMapa() {
    const cv = ui.mapa, g = cv.getContext('2d'), W = cv.width, c = W / 2, k = W / 2 / 75;
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(c, c);
    // gira com o olhar: frente para cima
    g.rotate(yaw);
    g.strokeStyle = '#263256'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, 30.5 * k, 0, TAU); g.stroke();
    g.beginPath(); g.arc(0, 0, 11 * k, 0, TAU); g.stroke();
    // fenda do domo (a +Z local do domo, girada com ele)
    g.strokeStyle = '#ffc21a'; g.lineWidth = 3;
    const fx = Math.sin(modelo.domo.rotation.y), fz = Math.cos(modelo.domo.rotation.y);
    const af = Math.atan2(fz, fx);
    g.beginPath(); g.arc(0, 0, 30.5 * k, af - 0.46, af + 0.46); g.stroke();
    // norte
    g.fillStyle = '#a8b2cc'; g.font = '10px monospace'; g.textAlign = 'center';
    g.fillText('N', 0, -36 * k);
    // jogador
    g.fillStyle = '#3fd18b';
    g.beginPath(); g.arc(pe.x * k, pe.z * k, 4, 0, TAU); g.fill();
    // olhar
    g.strokeStyle = '#3fd18b'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(pe.x * k, pe.z * k); g.lineTo(pe.x * k - Math.sin(yaw) * 14, pe.z * k - Math.cos(yaw) * 14); g.stroke();
    g.restore();
  }

  function atualizar(dt, t) {
    if (!ativo) return;
    const frente = (teclas.has('KeyW') || teclas.has('ArrowUp') ? 1 : 0) - (teclas.has('KeyS') || teclas.has('ArrowDown') ? 1 : 0) - joy.y;
    const lado = (teclas.has('KeyD') || teclas.has('ArrowRight') ? 1 : 0) - (teclas.has('KeyA') || teclas.has('ArrowLeft') ? 1 : 0) + joy.x;
    const vel = (teclas.has('ShiftLeft') || teclas.has('ShiftRight') ? 9 : 3.5);
    if (frente || lado) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);
      let dx = (fx * frente + lx * lado) * vel * dt, dz = (fz * frente + lz * lado) * vel * dt;
      const l = Math.hypot(frente, lado);
      if (l > 1) { dx /= l; dz /= l; }
      // tenta mover, depois desliza em cada eixo
      for (const [mx, mz] of [[dx, dz], [dx, 0], [0, dz]]) {
        const nx = pe.x + mx, nz = pe.z + mz;
        if (bloqueado(nx, nz, pe.y)) continue;
        const ch = chao(nx, nz, pe.y);
        if (ch === -Infinity || ch > pe.y + PASSO) continue;
        pe.x = nx; pe.z = nz;
        break;
      }
    }
    // gravidade
    const ch = chao(pe.x, pe.z, pe.y);
    if (ch > -Infinity && pe.y - ch < 0.05 + 1e-3) { pe.y = ch; vy = 0; }
    else if (ch > -Infinity && pe.y > ch) { vy -= 9.81 * dt; pe.y = Math.max(ch, pe.y + vy * dt); if (pe.y === ch) vy = 0; }
    else if (ch > -Infinity) pe.y = ch;
    if (ctl.isLocked) camera.position.set(pe.x, pe.y + OLHO, pe.z); else aplicarOlhar();
    desenharMapa();
    const v = campo.amostrar(pe.x, pe.y + OLHO, pe.z, t, _o);
    ui.pos.textContent = `altura ${fmt(pe.y, 1)} m · vento ${fmt(v, 1)} m/s`;
    if (audio) {
      audio.ganho.gain.setTargetAtTime(clamp(v / 18, 0, 1) * 0.9, audio.ac.currentTime, 0.2);
      audio.filtro.frequency.setTargetAtTime(250 + v * 45, audio.ac.currentTime, 0.2);
    }
  }

  function ativar(on) {
    ativo = on;
    document.getElementById('fpsUi').hidden = !on;
    ui.travar.hidden = !on || ehToque;
    teclas.clear();
    if (on) { teleportar('fora'); }
    else { ctl.unlock(); ligarSom(false); }
  }

  return { ativar, atualizar, teleportar, ligarSom, get ativo() { return ativo; }, ctl };
}
