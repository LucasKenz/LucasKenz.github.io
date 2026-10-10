import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { difAngulo, ik2, mola } from './ik';
import { rng } from '../cidade/gerador';
import { MedidorFps, useCelular, useDebug, useMenosMovimento } from '../comum/Fps';
import { Dpr, Pos, useModo, useQualidade } from '../comum/Pos';

const MAT = { azul: '#2448d8', amarelo: '#ffb81a' };
const FOCO_ROBO = new THREE.Vector3(0, 0.8, 0);

type Lang = 'pt' | 'en';
type Estado = 'passear' | 'curioso' | 'pegar' | 'levar' | 'soltar' | 'susto' | 'dormir';

const txt = {
  estados: {
    passear: { pt: 'passeando', en: 'wandering' },
    curioso: { pt: 'curioso: indo ver o bloco', en: 'curious: going to the block' },
    pegar: { pt: 'pegando o bloco', en: 'grabbing the block' },
    levar: { pt: 'levando para a pilha', en: 'carrying to the stack' },
    soltar: { pt: 'empilhando', en: 'stacking' },
    susto: { pt: 'assustado!', en: 'startled!' },
    dormir: { pt: 'dormindo (30 s parado)', en: 'asleep (30 s idle)' },
  },
  dica: {
    pt: 'Clique no chão para soltar um bloco · clique duas vezes perto do robô para assustar',
    en: 'Click the floor to drop a block · double-click near the robot to startle it',
  },
  soltar: { pt: 'Soltar bloco', en: 'Drop a block' },
  assustar: { pt: 'Assustar', en: 'Startle' },
  pausar: { pt: 'Pausar', en: 'Pause' },
  rodar: { pt: 'Retomar', en: 'Resume' },
  pilha: { pt: 'blocos na pilha', en: 'blocks stacked' },
};

const L1 = 0.9;
const L2 = 0.8;
const OMBRO = new THREE.Vector3(0, 1.0, 0.5); // shoulder in robot space (forward = +z)
const PILHA = new THREE.Vector3(-2.6, 0, -2.4);
const TAM = 0.42; // block size
const CORES = ['#2f5bea', '#ffc21a', '#ef5b5b', '#2e9b62', '#e8ecf6', '#9b6cf0'];

interface Bloco { id: number; pos: THREE.Vector3; cor: string; estado: 'livre' | 'preso' | 'pilha' }

/** Canvas texture of tread links; its offset scrolls with the distance driven. */
function texturaEsteira() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1b1f2a';
  g.fillRect(0, 0, 16, 64);
  g.fillStyle = '#3a4152';
  for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 16, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

function texturaListras() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#14161b';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#ffc21a';
  for (let i = -64; i < 128; i += 16) {
    g.beginPath();
    g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - 64, 64); g.lineTo(i - 64, 64);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

/** Painted metal with procedural wear: edges of the rounded box (in object space) get lighter,
 *  chipped paint, broken up by noise, so the robot reads as used rather than fresh plastic. */
function materialDesgaste(cor: string, meia: [number, number, number]) {
  const m = new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0.05 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMeia = { value: new THREE.Vector3(...meia) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObj; uniform vec3 uMeia;
        float hD(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float nD(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hD(i), hD(i + vec3(1,0,0)), f.x), mix(hD(i + vec3(0,1,0)), hD(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hD(i + vec3(0,0,1)), hD(i + vec3(1,0,1)), f.x), mix(hD(i + vec3(0,1,1)), hD(i + vec3(1,1,1)), f.x), f.y), f.z); }
        float gBorda;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = abs(vObj) / uMeia;
        // Second largest component close to 1 -> near an edge (two faces at once).
        float qa = max(q.x, max(q.y, q.z)), qc = min(q.x, min(q.y, q.z)), qb = q.x + q.y + q.z - qa - qc;
        float ruido = nD(vObj * 38.0) * 0.6 + nD(vObj * 9.0) * 0.4;
        gBorda = smoothstep(0.93, 1.0, qb + (ruido - 0.5) * 0.08);
        float lasca = step(0.84, ruido) * smoothstep(0.88, 0.97, qb);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.72, 0.78), max(gBorda * 0.4, lasca * 0.7));
        diffuseColor.rgb *= 0.92 + 0.08 * nD(vObj * 4.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.55, gBorda);`);
  };
  return m;
}

/** Dust kicked up behind the tracks. Particles live in the robot's frame and are animated
 *  entirely in the vertex shader (looping life per particle); only two uniforms change per frame,
 *  so no buffer is uploaded (per-frame buffer updates stalled the GPU on ANGLE/D3D11). */
function Poeira({ fonte }: { fonte: React.RefObject<{ pos: THREE.Vector3; rumo: number; vel: number; dt: number }> }) {
  const N = 72;
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const sem = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) sem.set([Math.random(), Math.random(), i % 2 ? 1 : -1], i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('semente', new THREE.BufferAttribute(sem, 3));
    return g;
  }, []);
  const u = useMemo(() => ({ uTempo: { value: 0 }, uForca: { value: 0 }, uSentido: { value: 1 } }), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec3 semente; uniform float uTempo; uniform float uForca; uniform float uSentido;
      varying float vK;
      void main() {
        float vida = 0.9 + semente.y * 0.8;
        float k = fract(uTempo / vida + semente.x); // 0..1 along this particle's life
        vK = k;
        vec3 p = vec3(semente.z * 0.62 + (semente.y - 0.5) * 0.3, 0.08 + k * (0.35 + semente.x * 0.3), -0.8 * uSentido - k * 0.9 * uSentido);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (0.15 + k * 0.7) * 600.0 / -mv.z * uForca;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vK;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.2, 1.0, d)) * (1.0 - vK) * 0.22;
        gl_FragColor = vec4(0.73, 0.70, 0.64, a);
      }`,
  }), [u]);
  useFrame(() => {
    const f = fonte.current;
    const pts = ref.current;
    if (!f || !pts) return;
    u.uTempo.value += f.dt;
    // Fade in with speed; stays invisible when the robot is still.
    u.uForca.value += (Math.min(1, Math.abs(f.vel) / 0.8) - u.uForca.value) * Math.min(1, f.dt * 4);
    u.uSentido.value = f.vel >= 0 ? 1 : -1;
    pts.position.copy(f.pos);
    pts.rotation.y = f.rumo;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

interface Sim {
  pos: THREE.Vector3;
  rumo: number;
  vel: number;
  velAlvo: number;
  estado: Estado;
  tEstado: number;
  alvo: THREE.Vector3;
  blocoAlvo: number | null;
  ocioso: number;
  bob: { valor: number; vel: number };
  cabecaYaw: { valor: number; vel: number };
  cabecaPitch: { valor: number; vel: number };
  ombro: { valor: number; vel: number };
  cotovelo: { valor: number; vel: number };
  garra: { valor: number; vel: number };
  olhos: { valor: number; vel: number };
  percorrido: number;
  pilha: number;
}

function Mundo({ leve, pausado, onEstado, onPilha, comando, onFps, debug }: {
  leve: boolean; pausado: boolean; onEstado: (e: Estado) => void; onPilha: (n: number) => void;
  comando: { tipo: 'soltar' | 'assustar'; n: number } | null; onFps: (n: number) => void; debug: boolean;
}) {
  const { camera } = useThree();
  const r = useMemo(() => rng(17), []);
  const [blocos, setBlocos] = useState<Bloco[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      pos: new THREE.Vector3(Math.cos(i * 1.3) * 3.2, TAM / 2, Math.sin(i * 1.3) * 3.2 + 0.6),
      cor: CORES[i % CORES.length],
      estado: 'livre' as const,
    })),
  );
  const blocosRef = useRef(blocos);
  blocosRef.current = blocos;
  const proxId = useRef(5);
  const cursor = useRef<{ p: THREE.Vector3; t: number }>({ p: new THREE.Vector3(), t: -99 });
  const relogio = useRef(0);
  const sim = useRef<Sim>({
    pos: new THREE.Vector3(0, 0, 0), rumo: 0, vel: 0, velAlvo: 0, estado: 'passear', tEstado: 0,
    alvo: new THREE.Vector3(1.5, 0, 1.5), blocoAlvo: null, ocioso: 0,
    bob: { valor: 0, vel: 0 }, cabecaYaw: { valor: 0, vel: 0 }, cabecaPitch: { valor: 0, vel: 0 },
    ombro: { valor: 1.2, vel: 0 }, cotovelo: { valor: -2.2, vel: 0 }, garra: { valor: 0.5, vel: 0 },
    olhos: { valor: 1, vel: 0 }, percorrido: 0, pilha: 0,
  });

  const esteira = useMemo(texturaEsteira, []);
  const texSombra = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    r.addColorStop(0, 'rgba(20,24,36,0.85)');
    r.addColorStop(0.55, 'rgba(20,24,36,0.35)');
    r.addColorStop(1, 'rgba(20,24,36,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const sombraRobo = useRef<THREE.Mesh>(null);
  const listras = useMemo(texturaListras, []);
  const robo = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.Group>(null);
  const cabeca = useRef<THREE.Group>(null);
  const braco1 = useRef<THREE.Group>(null);
  const braco2 = useRef<THREE.Group>(null);
  const dedoA = useRef<THREE.Mesh>(null);
  const dedoB = useRef<THREE.Mesh>(null);
  const ponta = useRef<THREE.Object3D>(null);
  const matOlho = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0b1020', emissive: '#7af0ff', emissiveIntensity: 4, toneMapped: false }), []);
  const refsBlocos = useRef(new Map<number, THREE.Mesh>());
  const matCorpo = useMemo(() => materialDesgaste(MAT.azul, [0.51, 0.29, 0.61]), []);
  const matBraco = useMemo(() => materialDesgaste(MAT.amarelo, [0.075, 0.075, L1 / 2]), []);
  const matAntebraco = useMemo(() => materialDesgaste(MAT.amarelo, [0.06, 0.06, L2 / 2]), []);
  const olhosRef = useRef<(THREE.Group | null)[]>([]);
  const piscar = useRef({ prox: 2.5, t: -1 });
  const leds = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const fontePoeira = useRef({ pos: new THREE.Vector3(), rumo: 0, vel: 0, dt: 0 });
  const cabos = useRef<(THREE.Mesh | null)[]>([]);
  const ancoras = useRef<(THREE.Object3D | null)[]>([]);
  const vc = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Vector3() }), []);

  useEffect(() => { camera.position.set(5.2, 3.4, 6.4); }, [camera]);

  const mudar = (e: Estado) => {
    sim.current.estado = e;
    sim.current.tEstado = 0;
    onEstado(e);
  };

  const soltarBloco = (p: THREE.Vector3) => {
    const livres = blocosRef.current.filter((b) => b.estado !== 'pilha').length;
    if (livres >= 9) return;
    const r0 = Math.hypot(p.x, p.z);
    const k = r0 > 5 ? 5 / r0 : 1;
    const b: Bloco = { id: proxId.current++, pos: new THREE.Vector3(p.x * k, TAM / 2 + 1.6, p.z * k), cor: CORES[Math.floor(r() * CORES.length)], estado: 'livre' };
    setBlocos((bs) => [...bs, b]);
    sim.current.ocioso = 0;
    const s = sim.current;
    if (s.estado === 'passear' || s.estado === 'dormir' || s.estado === 'curioso') {
      s.blocoAlvo = b.id;
      mudar('curioso');
    }
  };
  const assustar = () => {
    sim.current.ocioso = 0;
    const s = sim.current;
    if (s.estado === 'pegar' || s.estado === 'levar' || s.estado === 'soltar') return;
    mudar('susto');
  };

  useEffect(() => {
    if (!comando) return;
    if (comando.tipo === 'soltar') {
      const a = r() * Math.PI * 2;
      soltarBloco(new THREE.Vector3(Math.cos(a) * (2 + r() * 2), 0, Math.sin(a) * (2 + r() * 2)));
    } else assustar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comando]);

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Vector3() }), []);

  useFrame((_, dtBruto) => {
    const dt = pausado ? 0 : Math.min(dtBruto, 1 / 30);
    relogio.current += dt;
    const s = sim.current;
    s.tEstado += dt;
    s.ocioso += dt;
    const frente = tmp.v.set(Math.sin(s.rumo), 0, Math.cos(s.rumo));
    const blocoAlvo = s.blocoAlvo != null ? blocosRef.current.find((b) => b.id === s.blocoAlvo) : undefined;

    // --- behaviour (state machine) ---
    if (s.ocioso > 30 && s.estado === 'passear') mudar('dormir');
    let alvoPos: THREE.Vector3 | null = null;
    let alvoBraco: THREE.Vector3 | null = null;
    switch (s.estado) {
      case 'passear':
        if (s.pos.distanceTo(s.alvo) < 0.5 || s.tEstado > 7) {
          s.alvo.set((r() - 0.5) * 7, 0, (r() - 0.5) * 7);
          s.tEstado = 0;
        }
        alvoPos = s.alvo;
        s.velAlvo = 0.8;
        // Notice a free block close by.
        if (s.tEstado > 1.5) {
          const perto = blocosRef.current.find((b) => b.estado === 'livre' && b.pos.distanceTo(s.pos) < 2.4);
          if (perto) { s.blocoAlvo = perto.id; mudar('curioso'); }
        }
        break;
      case 'curioso': {
        if (!blocoAlvo || blocoAlvo.estado !== 'livre') { s.blocoAlvo = null; mudar('passear'); break; }
        // Stop with the block ~1.25 m ahead of the shoulder.
        const dir = tmp.w.copy(blocoAlvo.pos).sub(s.pos).setY(0);
        const dist = dir.length();
        alvoPos = blocoAlvo.pos;
        s.velAlvo = dist > 1.95 ? 1.2 : 0;
        const alinhado = Math.abs(difAngulo(Math.atan2(dir.x, dir.z), s.rumo)) < 0.08;
        if (dist <= 1.95 && alinhado && Math.abs(s.vel) < 0.05 && blocoAlvo.pos.y <= TAM / 2 + 0.01) mudar('pegar');
        break;
      }
      case 'pegar':
        s.velAlvo = 0;
        if (blocoAlvo) {
          alvoBraco = tmp.q.copy(blocoAlvo.pos).setY(TAM + 0.02);
          if (s.tEstado > 1.1 && blocoAlvo.estado === 'livre') {
            setBlocos((bs) => bs.map((b) => (b.id === blocoAlvo.id ? { ...b, estado: 'preso' } : b)));
          }
          if (s.tEstado > 1.6) mudar('levar');
        }
        break;
      case 'levar': {
        const dist = tmp.w.copy(PILHA).sub(s.pos).setY(0).length();
        alvoPos = PILHA;
        s.velAlvo = dist > 1.9 ? 1.0 : 0;
        alvoBraco = tmp.q.copy(s.pos).addScaledVector(frente, 1.1).setY(1.7);
        const alinhado = Math.abs(difAngulo(Math.atan2(PILHA.x - s.pos.x, PILHA.z - s.pos.z), s.rumo)) < 0.08;
        if (dist <= 1.9 && alinhado && Math.abs(s.vel) < 0.05) mudar('soltar');
        break;
      }
      case 'soltar':
        s.velAlvo = 0;
        alvoBraco = tmp.q.copy(PILHA).setY(TAM * (s.pilha + 1) + 0.04);
        if (s.tEstado > 1.2 && blocoAlvo && blocoAlvo.estado === 'preso') {
          const altura = TAM * s.pilha + TAM / 2;
          setBlocos((bs) => bs.map((b) => (b.id === blocoAlvo.id ? { ...b, estado: 'pilha', pos: new THREE.Vector3(PILHA.x, altura, PILHA.z) } : b)));
          s.pilha++;
          onPilha(s.pilha);
        }
        if (s.tEstado > 1.8) { s.blocoAlvo = null; mudar('passear'); }
        break;
      case 'susto':
        s.velAlvo = s.tEstado < 0.9 ? -2.2 : 0;
        if (s.tEstado > 2) mudar('passear');
        break;
      case 'dormir':
        s.velAlvo = 0;
        break;
    }

    // --- locomotion: turn toward the target, speed through a spring ---
    if (alvoPos && s.estado !== 'susto') {
      const desejado = Math.atan2(alvoPos.x - s.pos.x, alvoPos.z - s.pos.z);
      const d = difAngulo(desejado, s.rumo);
      s.rumo += Math.max(-2.2 * dt, Math.min(2.2 * dt, d));
      if (Math.abs(d) > 0.6) s.velAlvo = Math.min(s.velAlvo, 0.25);
    }
    const velAntes = s.vel;
    s.vel += (s.velAlvo - s.vel) * Math.min(1, dt * 3);
    s.pos.addScaledVector(frente, s.vel * dt);
    s.pos.x = Math.max(-5, Math.min(5, s.pos.x));
    s.pos.z = Math.max(-5, Math.min(5, s.pos.z));
    s.percorrido += s.vel * dt;
    const acel = dt > 0 ? (s.vel - velAntes) / dt : 0;

    // --- springs: suspension, head, arm, claw, eyes ---
    const m = (st: { valor: number; vel: number }, alvo: number, k: number) => Object.assign(st, mola(st.valor, st.vel, alvo, k, dt));
    m(s.bob, -acel * 0.04, 10);
    const olharPara = relogio.current - cursor.current.t < 3 ? cursor.current.p : alvoBraco ?? alvoPos ?? s.alvo;
    const rel = tmp.w.copy(olharPara).sub(s.pos);
    const yaw = s.estado === 'dormir' ? 0 : Math.max(-1.3, Math.min(1.3, difAngulo(Math.atan2(rel.x, rel.z), s.rumo)));
    const pitch = s.estado === 'dormir' ? 0.45 : Math.max(-0.5, Math.min(0.6, Math.atan2(1.4 - olharPara.y, Math.hypot(rel.x, rel.z))));
    m(s.cabecaYaw, yaw + (s.estado === 'susto' ? Math.sin(relogio.current * 30) * 0.25 : 0), 9);
    m(s.cabecaPitch, pitch, 7);
    m(s.olhos, s.estado === 'dormir' ? 0.05 : 1, 4);
    let ombro = 1.25, cotovelo = -2.3; // folded
    if (alvoBraco) {
      // Target in shoulder space: forward distance and height.
      const local = tmp.w.copy(alvoBraco).sub(s.pos);
      const fwd = local.x * Math.sin(s.rumo) + local.z * Math.cos(s.rumo) - OMBRO.z;
      const sol = ik2(L1, L2, fwd, alvoBraco.y - (OMBRO.y + s.bob.valor));
      ombro = sol.ombro;
      cotovelo = sol.cotovelo;
    }
    m(s.ombro, ombro, 6);
    m(s.cotovelo, cotovelo, 6);
    const fechada = s.estado === 'levar' || (s.estado === 'pegar' && s.tEstado > 0.9) || (s.estado === 'soltar' && s.tEstado < 1.1);
    m(s.garra, fechada ? 0.08 : 0.5, 12);

    // --- apply to the scene graph ---
    robo.current!.position.copy(s.pos);
    robo.current!.rotation.y = s.rumo;
    sombraRobo.current!.position.set(s.pos.x + 0.12, 0.014, s.pos.z + 0.12);
    sombraRobo.current!.rotation.z = s.rumo;
    corpo.current!.position.y = 0.72 + s.bob.valor;
    corpo.current!.rotation.x = -s.bob.valor * 1.5;
    cabeca.current!.rotation.set(-s.cabecaPitch.valor, s.cabecaYaw.valor, 0);
    braco1.current!.rotation.x = -s.ombro.valor;
    braco2.current!.rotation.x = -s.cotovelo.valor;
    dedoA.current!.position.x = s.garra.valor * 0.35;
    dedoB.current!.position.x = -s.garra.valor * 0.35;
    esteira.offset.y = -s.percorrido * 0.9;
    matOlho.emissiveIntensity = 4 * s.olhos.valor;

    // Blink: every 2.5–6 s the eyes squash for 0.14 s (asleep = almost closed).
    const pk = piscar.current;
    if (relogio.current > pk.prox) { pk.t = relogio.current; pk.prox = relogio.current + 2.5 + r() * 3.5; }
    const fase = (relogio.current - pk.t) / 0.14;
    const aberto = s.estado === 'dormir' ? 0.08 : fase >= 0 && fase < 1 ? Math.abs(fase * 2 - 1) * 0.9 + 0.1 : 1;
    olhosRef.current.forEach((g) => { if (g) g.scale.z = aberto; });
    // Status LEDs: green heartbeat, amber while handling a block, red when startled.
    const tLed = relogio.current;
    const [ledV, ledA, ledR] = leds.current;
    const ocupado = s.estado === 'levar' || s.estado === 'pegar' || s.estado === 'soltar';
    if (ledV) ledV.color.setRGB(0.2, 2.4, 0.6).multiplyScalar(Math.pow(Math.max(0, Math.sin(tLed * 3)), 8) * 0.9 + 0.1);
    if (ledA) ledA.color.setRGB(2.6, 1.6, 0.2).multiplyScalar(ocupado ? (Math.sin(tLed * 10) > 0 ? 1 : 0.15) : 0.08);
    if (ledR) ledR.color.setRGB(3, 0.3, 0.3).multiplyScalar(s.estado === 'susto' ? (Math.sin(tLed * 22) > 0 ? 1 : 0.1) : 0.06);
    const fp = fontePoeira.current;
    fp.pos.copy(s.pos);
    fp.rumo = s.rumo;
    fp.vel = s.vel;
    fp.dt = dt;
    // Cables body -> head: Catmull-Rom through the two anchors and a sagging middle, rebuilt each frame.
    for (let i = 0; i < 2; i++) {
      const cabo = cabos.current[i], a0 = ancoras.current[i * 2], b0 = ancoras.current[i * 2 + 1];
      if (!cabo || !a0 || !b0) continue;
      a0.getWorldPosition(vc.a);
      b0.getWorldPosition(vc.b);
      vc.m.copy(vc.a).lerp(vc.b, 0.5).add(new THREE.Vector3(0, -0.05, 0)).addScaledVector(frente, -0.14);
      const curva = new THREE.CatmullRomCurve3([vc.a.clone(), vc.a.clone().lerp(vc.m, 0.5).addScaledVector(frente, -0.04), vc.m.clone(), vc.b.clone()]);
      cabo.geometry.dispose();
      cabo.geometry = new THREE.TubeGeometry(curva, 20, 0.022, 6, false);
    }

    // Carried block follows the claw tip; dropped blocks fall.
    const p = ponta.current!.getWorldPosition(tmp.q);
    for (const b of blocosRef.current) {
      const mesh = refsBlocos.current.get(b.id);
      if (!mesh) continue;
      if (b.estado === 'preso') { b.pos.set(p.x, p.y - TAM / 2 - 0.02, p.z); }
      else if (b.estado === 'livre' && b.pos.y > TAM / 2) { b.pos.y = Math.max(TAM / 2, b.pos.y - dt * 6); }
      mesh.position.copy(b.pos);
      const sb = mesh.getObjectByName('sombra');
      if (sb) { sb.position.set(0.04, 0.012 - b.pos.y, 0.04); (sb as THREE.Mesh).visible = b.estado !== 'pilha' || b.pos.y < TAM; }
    }
  });

  const ultimoClique = useRef(0);
  const noChao = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const agora = performance.now();
    const pertoDoRobo = e.point.distanceTo(sim.current.pos) < 1.8;
    if (pertoDoRobo && agora - ultimoClique.current < 350) assustar();
    else if (!pertoDoRobo) soltarBloco(e.point);
    ultimoClique.current = agora;
  };
  const mover = (e: ThreeEvent<PointerEvent>) => {
    cursor.current = { p: e.point.clone(), t: relogio.current };
    if (sim.current.estado === 'dormir') { sim.current.ocioso = 0; mudar('passear'); }
  };

  return (
    <>
      {leve ? <hemisphereLight args={['#f2f5ff', '#8a90a0', 1.6]} /> : <Environment files="/hdri/studio_small_08.hdr" environmentIntensity={0.85} />}
      <directionalLight position={[4, 7, 4]} intensity={2.2} color="#fff6ea" />
      <directionalLight position={[-5, 3, -4]} intensity={0.6} color="#9fb6ff" />
      {/* studio cyclorama: floor that curves into the back wall */}
      <mesh position={[0, 0, 0]} receiveShadow onClick={noChao} onPointerMove={mover}>
        <cylinderGeometry args={[40, 40, 0.02, 96]} />
        <meshStandardMaterial color="#d9dce4" roughness={0.85} />
      </mesh>
      {/* yard markings */}
      {[1.6, 3.2, 4.8].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position-y={0.012}>
          <ringGeometry args={[r - 0.01, r + 0.01, 128]} />
          <meshBasicMaterial color="#aab1c0" transparent opacity={0.6} />
        </mesh>
      ))}
      <group position={[PILHA.x, 0.012, PILHA.z]} rotation-x={-Math.PI / 2}>
        <mesh>
          <ringGeometry args={[0.36, 0.5, 4, 1, Math.PI / 4]} />
          <meshStandardMaterial map={listras} />
        </mesh>
      </group>
      <mesh ref={sombraRobo} rotation-x={-Math.PI / 2} position-y={0.014} renderOrder={1}>
        <planeGeometry args={[2.4, 2.9]} />
        <meshBasicMaterial map={texSombra} transparent depthWrite={false} opacity={0.55} />
      </mesh>

      {/* blocks */}
      {blocos.map((b) => (
        <RoundedBox key={b.id} args={[TAM, TAM, TAM]} radius={0.05} smoothness={4} ref={(m: THREE.Mesh | null) => { if (m) refsBlocos.current.set(b.id, m); else refsBlocos.current.delete(b.id); }} position={b.pos} castShadow receiveShadow>
          <meshPhysicalMaterial color={b.cor} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} />
          <mesh rotation-x={-Math.PI / 2} name="sombra" renderOrder={1}>
            <planeGeometry args={[TAM * 2.2, TAM * 2.2]} />
            <meshBasicMaterial map={texSombra} transparent depthWrite={false} opacity={0.5} />
          </mesh>
        </RoundedBox>
      ))}

      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { cabos.current[i] = m; }} castShadow>
          <bufferGeometry />
          <meshStandardMaterial color={i ? '#1b1f2a' : '#d94a2b'} roughness={0.55} />
        </mesh>
      ))}
      <Poeira fonte={fontePoeira} />
      {/* robot */}
      <group ref={robo}>
        {[-0.62, 0.62].map((x) => (
          <group key={x} position={[x, 0.24, 0]}>
            <RoundedBox args={[0.34, 0.46, 1.62]} radius={0.16} smoothness={6} castShadow receiveShadow>
              <meshStandardMaterial map={esteira} roughness={0.85} metalness={0.1} />
            </RoundedBox>
            {[-0.55, 0, 0.55].map((z) => (
              <mesh key={z} position={[x > 0 ? 0.18 : -0.18, 0, z]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.15, 0.15, 0.04, 24]} />
                <meshStandardMaterial color="#c8ced9" metalness={0.9} roughness={0.25} />
              </mesh>
            ))}
          </group>
        ))}
        <group ref={corpo} position={[0, 0.72, 0]}>
          <RoundedBox args={[1.02, 0.58, 1.22]} radius={0.12} smoothness={6} castShadow receiveShadow material={matCorpo} />
          {/* status LEDs on the back */}
          {[-0.18, 0, 0.18].map((x, i) => (
            <mesh key={x} position={[x, 0.12, -0.613]} rotation-y={Math.PI}>
              <circleGeometry args={[0.035, 16]} />
              <meshBasicMaterial ref={(m) => { leds.current[i] = m; }} toneMapped={false} />
            </mesh>
          ))}
          <object3D ref={(o) => { ancoras.current[0] = o; }} position={[0.16, 0.3, -0.42]} />
          <object3D ref={(o) => { ancoras.current[2] = o; }} position={[-0.16, 0.3, -0.4]} />
          <mesh position={[0, -0.08, 0.612]}>
            <planeGeometry args={[0.8, 0.14]} />
            <meshStandardMaterial map={listras} roughness={0.6} />
          </mesh>
          {/* bolts */}
          {[[-0.42, 0.16], [0.42, 0.16], [-0.42, -0.2], [0.42, -0.2]].map(([x, y]) => (
            <mesh key={`${x}${y}`} position={[x, y, 0.613]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
              <meshStandardMaterial color="#d6dbe4" metalness={1} roughness={0.2} />
            </mesh>
          ))}
          {/* antenna with a glowing tip */}
          <mesh position={[0.36, 0.55, -0.42]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.55, 8]} />
            <meshStandardMaterial color="#2a2f3d" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.36, 0.84, -0.42]} material={matOlho}>
            <sphereGeometry args={[0.035, 16, 12]} />
          </mesh>
          {/* neck + head */}
          <mesh position={[0, 0.5, -0.25]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.5, 16]} />
            <meshStandardMaterial color="#2a2f3d" metalness={0.85} roughness={0.28} />
          </mesh>
          <group ref={cabeca} position={[0, 0.82, -0.25]}>
            <object3D ref={(o) => { ancoras.current[1] = o; }} position={[0.3, -0.2, -0.24]} />
            <object3D ref={(o) => { ancoras.current[3] = o; }} position={[-0.3, -0.2, -0.24]} />
            <RoundedBox args={[0.88, 0.48, 0.52]} radius={0.14} smoothness={6} castShadow receiveShadow>
              <meshPhysicalMaterial color="#eef1f6" roughness={0.28} clearcoat={0.8} clearcoatRoughness={0.15} />
            </RoundedBox>
            {[-0.21, 0.21].map((x) => (
              <group key={x} position={[x, 0.01, 0.25]} rotation-x={Math.PI / 2} ref={(g) => { olhosRef.current[x < 0 ? 0 : 1] = g; }}>
                <mesh>
                  <cylinderGeometry args={[0.16, 0.17, 0.1, 32]} />
                  <meshStandardMaterial color="#1b1f2a" metalness={0.9} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.052, 0]}>
                  <cylinderGeometry args={[0.13, 0.13, 0.01, 32]} />
                  <meshPhysicalMaterial color="#05070d" roughness={0.05} clearcoat={1} />
                </mesh>
                <mesh position={[0, 0.06, 0]} material={matOlho}>
                  <cylinderGeometry args={[0.065, 0.065, 0.01, 32]} />
                </mesh>
              </group>
            ))}
            {/* ear disks */}
            {[-0.46, 0.46].map((x) => (
              <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.1, 0.1, 0.06, 24]} />
                <meshStandardMaterial color={MAT.amarelo} roughness={0.4} metalness={0.2} />
              </mesh>
            ))}
          </group>
        </group>
        {/* arm: shoulder -> elbow -> claw */}
        <group ref={braco1} position={OMBRO}>
          <mesh>
            <sphereGeometry args={[0.12, 24, 16]} />
            <meshStandardMaterial color="#2a2f3d" metalness={0.85} roughness={0.28} />
          </mesh>
          <RoundedBox args={[0.15, 0.15, L1]} radius={0.06} smoothness={4} position={[0, 0, L1 / 2]} castShadow material={matBraco} />
          <group ref={braco2} position={[0, 0, L1]}>
            <mesh>
              <sphereGeometry args={[0.1, 24, 16]} />
              <meshStandardMaterial color="#2a2f3d" metalness={0.85} roughness={0.28} />
            </mesh>
            <RoundedBox args={[0.12, 0.12, L2]} radius={0.05} smoothness={4} position={[0, 0, L2 / 2]} castShadow material={matAntebraco} />
            <group position={[0, 0, L2]} rotation-x={Math.PI / 2}>
              <object3D ref={ponta} position={[0, 0.16, 0]} />
              <mesh ref={dedoA} position={[0.17, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.22, 0.12]} />
                <meshStandardMaterial color="#c8ced9" metalness={0.9} roughness={0.25} />
              </mesh>
              <mesh ref={dedoB} position={[-0.17, 0.1, 0]} castShadow>
                <boxGeometry args={[0.05, 0.22, 0.12]} />
                <meshStandardMaterial color="#c8ced9" metalness={0.9} roughness={0.25} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <OrbitControls target={[0, 0.8, 0]} enableDamping dampingFactor={0.08} minDistance={5} maxDistance={14} maxPolarAngle={1.35} enablePan={false} />
      {debug && <MedidorFps onFps={onFps} />}
    </>
  );
}

export default function Robo({ lang }: { lang: Lang }) {
  const debug = useDebug();
  const menos = useMenosMovimento();
  const celular = useCelular();
  const [estado, setEstado] = useState<Estado>('passear');
  const [pilha, setPilha] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [fps, setFps] = useState(0);
  const [comando, setComando] = useState<{ tipo: 'soltar' | 'assustar'; n: number } | null>(null);
  const { qualidade, dpr, monitor } = useQualidade(celular);
  const leve = useModo() === 'leve';
  useEffect(() => { if (menos) setPausado(true); }, [menos]);

  return (
    <div className="lab-palco">
      <Canvas
        dpr={dpr}
        camera={{ fov: 34, near: 0.1, far: 100 }}
        gl={{ antialias: leve, toneMapping: leve ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
        onCreated={({ scene }) => { scene.background = new THREE.Color('#d3d7e0'); scene.fog = new THREE.Fog('#d3d7e0', 12, 30); }}
        role="img"
        aria-label={lang === 'pt' ? 'Robô procedural num pátio com blocos coloridos' : 'Procedural robot in a yard with colored blocks'}
      >
        <Dpr valor={leve ? 1 : dpr} />
        {monitor(
          <>
            <Mundo leve={leve} pausado={pausado} onEstado={setEstado} onPilha={setPilha} comando={comando} onFps={setFps} debug={debug} />
            {!leve && <Pos qualidade={qualidade} grao={false} bloom={{ intensidade: 0.7, limiar: 1.1 }} vinheta={0.4} dof={{ alvo: FOCO_ROBO, escala: 1.2, distancia: 0.25 }} />}
          </>,
        )}
      </Canvas>
      <div className="lab-painel">
        <p className="lab-dado" aria-live="polite">
          <b>{txt.estados[estado][lang]}</b> · {pilha} {txt.pilha[lang]}
          {debug && <> · {fps} fps · q{qualidade}</>}
        </p>
        <div className="lab-linha">
          <button className="lab-botao lab-botao-forte" type="button" onClick={() => setComando({ tipo: 'soltar', n: Date.now() })}>{txt.soltar[lang]}</button>
          <button className="lab-botao" type="button" onClick={() => setComando({ tipo: 'assustar', n: Date.now() })}>{txt.assustar[lang]}</button>
          <button className="lab-botao" type="button" aria-pressed={pausado} onClick={() => setPausado((p) => !p)}>{pausado ? txt.rodar[lang] : txt.pausar[lang]}</button>
        </div>
        <span className="lab-dica">{txt.dica[lang]}</span>
      </div>
    </div>
  );
}
