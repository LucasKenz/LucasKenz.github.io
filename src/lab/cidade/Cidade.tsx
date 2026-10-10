import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CHUNK, BLOCO, RUA, gerarChunk, hash, nomeRua, rng } from './gerador';
import { dourado, materialCeu, materialChao, materialPredios, materialTelhado, uniformes } from './materiais';
import { MedidorFps, useCelular, useDebug, useMenosMovimento } from '../comum/Fps';
import { Dpr, Pos, useModo, useQualidade } from '../comum/Pos';

type Lang = 'pt' | 'en';
const txt = {
  semente: { pt: 'Semente', en: 'Seed' },
  gerar: { pt: 'Gerar', en: 'Build' },
  sortear: { pt: 'Sortear', en: 'Random' },
  hora: { pt: 'Hora do dia', en: 'Time of day' },
  turbo: { pt: 'Shift = turbo', en: 'Shift = turbo' },
  controles: {
    pt: 'WASD ou setas para voar · arraste para olhar · Q/E sobe e desce',
    en: 'WASD or arrows to fly · drag to look · Q/E up and down',
  },
  pausar: { pt: 'Pausar', en: 'Pause' },
  rodar: { pt: 'Retomar', en: 'Resume' },
  predios: { pt: 'prédios visíveis', en: 'visible buildings' },
};

const geoPredio = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const geoArvore = new THREE.ConeGeometry(2.2, 7, 6).translate(0, 4.5, 0);
const matArvore = new THREE.MeshLambertMaterial({ color: '#2e9b62' });
const geoCaixa = new THREE.CylinderGeometry(1.6, 1.6, 2.6, 12).translate(0, 1.3 + 1.2, 0);
const geoPerna = new THREE.BoxGeometry(2.8, 1.2, 2.8).translate(0, 0.6, 0);
const geoAntena = new THREE.CylinderGeometry(0.12, 0.2, 9, 5).translate(0, 4.5, 0);
const geoNeon = new THREE.BoxGeometry(0.6, 1, 0.6).translate(0, 0.5, 0);
const NEON = ['#ff3d8b', '#35e0ff', '#ffc21a', '#9b6cf0'];

/** Rooftop water tanks, antennas and vertical neon strips, placed by the building's own hash. */
function Telhados({ predios, seed }: { predios: ReturnType<typeof gerarChunk>['predios']; seed: number }) {
  const mat = useMemo(() => materialTelhado(false), []);
  const matNeon = useMemo(() => materialTelhado(true), []);
  const refs = { caixa: useRef<THREE.InstancedMesh>(null), perna: useRef<THREE.InstancedMesh>(null), antena: useRef<THREE.InstancedMesh>(null), neon: useRef<THREE.InstancedMesh>(null) };
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color();
    const n = { caixa: 0, antena: 0, neon: 0 };
    for (const p of predios) {
      const r = rng(hash(seed, Math.round(p.x * 10), Math.round(p.z * 10), 7));
      const topo = p.h;
      if (p.h > 12 && p.h < 70 && r() < 0.55) {
        o.position.set(p.x + (r() - 0.5) * p.w * 0.4, topo, p.z + (r() - 0.5) * p.d * 0.4);
        o.rotation.set(0, 0, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix();
        refs.caixa.current!.setMatrixAt(n.caixa, o.matrix);
        refs.perna.current!.setMatrixAt(n.caixa, o.matrix);
        refs.caixa.current!.setColorAt(n.caixa, c.set(r() < 0.5 ? '#8a8f99' : '#5d6a7c'));
        refs.perna.current!.setColorAt(n.caixa, c.set('#3b3f47'));
        n.caixa++;
      }
      if (p.h > 30 && r() < 0.5) {
        o.position.set(p.x + (r() - 0.5) * p.w * 0.6, topo, p.z + (r() - 0.5) * p.d * 0.6);
        o.scale.set(1, 0.6 + r() * 1.4, 1); o.updateMatrix();
        refs.antena.current!.setMatrixAt(n.antena, o.matrix);
        refs.antena.current!.setColorAt(n.antena, c.set('#9aa0aa'));
        n.antena++;
      }
      if (p.h > 45 && r() < 0.35) {
        // Strip on one corner, from 30 % of the height to near the top.
        const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1;
        o.position.set(p.x + sx * (p.w / 2 + 0.25), p.h * 0.3, p.z + sz * (p.d / 2 + 0.25));
        o.scale.set(1, p.h * 0.62, 1); o.updateMatrix();
        refs.neon.current!.setMatrixAt(n.neon, o.matrix);
        refs.neon.current!.setColorAt(n.neon, c.set(NEON[Math.floor(r() * NEON.length)]));
        n.neon++;
      }
    }
    refs.caixa.current!.count = refs.perna.current!.count = n.caixa;
    refs.antena.current!.count = n.antena;
    refs.neon.current!.count = n.neon;
    for (const k of ['caixa', 'perna', 'antena', 'neon'] as const) {
      const m = refs[k].current!;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [predios, seed]);
  const N = Math.max(1, predios.length);
  return (
    <>
      <instancedMesh ref={refs.caixa} args={[geoCaixa, mat, N]} />
      <instancedMesh ref={refs.perna} args={[geoPerna, mat, N]} />
      <instancedMesh ref={refs.antena} args={[geoAntena, mat, N]} />
      <instancedMesh ref={refs.neon} args={[geoNeon, matNeon, N]} />
    </>
  );
}

/** One chunk = one instanced mesh of buildings + one of trees. */
function Quadra({ seed, cx, cz, inicio }: { seed: number; cx: number; cz: number; inicio: number }) {
  const dados = useMemo(() => gerarChunk(seed, cx, cz), [seed, cx, cz]);
  const mat = useMemo(() => materialPredios(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const refArv = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    mat.uniforms.uInicio.value = inicio;
  }, [inicio, mat]);

  useEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const extra = new Float32Array(dados.predios.length * 3);
    dados.predios.forEach((p, i) => {
      o.position.set(p.x, 0, p.z);
      o.scale.set(p.w, p.h, p.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Stagger the rise by distance from the chunk centre, for a wave effect.
      const atraso = (Math.hypot(p.x - (cx + 0.5) * CHUNK, p.z - (cz + 0.5) * CHUNK) / CHUNK) * 0.6 + p.cor * 0.25;
      extra.set([p.cor, p.janelas, atraso], i * 3);
    });
    m.geometry = geoPredio.clone();
    m.geometry.setAttribute('aDados', new THREE.InstancedBufferAttribute(extra, 3));
    m.count = dados.predios.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    const a = refArv.current!;
    dados.arvores.forEach((t, i) => {
      o.position.set(t.x, 0, t.z);
      o.scale.setScalar(t.s);
      o.updateMatrix();
      a.setMatrixAt(i, o.matrix);
    });
    a.count = dados.arvores.length;
    a.instanceMatrix.needsUpdate = true;
    a.computeBoundingSphere();
    return () => m.geometry.dispose();
  }, [dados, cx, cz]);

  return (
    <>
      <instancedMesh ref={ref} args={[geoPredio, mat, Math.max(1, dados.predios.length)]} frustumCulled />
      <instancedMesh ref={refArv} args={[geoArvore, matArvore, Math.max(1, dados.arvores.length)]} />
      <Telhados predios={dados.predios} seed={seed} />
    </>
  );
}

/** Cars as instanced boxes driving along road lanes around the camera. */
function Carros({ seed, n, pausado }: { seed: number; n: number; pausado: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tempo = useRef(0);
  const carros = useMemo(() => {
    const r = rng(hash(seed, 5));
    return Array.from({ length: n }, () => ({
      eixoX: r() > 0.5,
      linha: Math.floor((r() - 0.5) * 24),
      lado: r() > 0.5 ? 1 : -1,
      fase: r() * 2000,
      vel: 10 + r() * 12,
      cor: new THREE.Color().setHSL(r(), 0.5, 0.55),
    }));
  }, [seed, n]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const geo = useMemo(() => new THREE.BoxGeometry(2, 1.4, 4.4).translate(0, 0.7, 0), []);
  // Light trails: a long thin streak behind (red) and ahead (white) of each car, length ∝ speed,
  // visible only at dusk/night. Additive so overlapping trails build up like a long exposure.
  const refRastro = useRef<THREE.InstancedMesh>(null);
  const matRastro = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const geoRastro = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.5, 1, 1, 1).rotateX(-Math.PI / 2).translate(0, 0.35, -0.5);
    // fade along the streak with vertex colours baked into a gradient attribute
    return g;
  }, []);
  useEffect(() => {
    carros.forEach((c, i) => ref.current!.setColorAt(i, c.cor));
    ref.current!.instanceColor!.needsUpdate = true;
  }, [carros]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera }, dt) => {
    if (!pausado) tempo.current += dt;
    const span = 1200;
    const baseX = Math.round(camera.position.x / BLOCO) * BLOCO;
    const baseZ = Math.round(camera.position.z / BLOCO) * BLOCO;
    carros.forEach((c, i) => {
      const pista = c.linha * BLOCO + c.lado * (RUA / 4);
      const s = ((((c.fase + tempo.current * c.vel * c.lado) % span) + span) % span) - span / 2;
      if (c.eixoX) {
        o.position.set(baseX + s, 0, baseZ + pista);
        o.rotation.set(0, Math.PI / 2, 0);
      } else {
        o.position.set(baseX + pista, 0, baseZ + s);
        o.rotation.set(0, 0, 0);
      }
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    // Trails: two per car (tail = red behind, head = white ahead).
    const noite = uniformes.uNoite.value;
    const k = Math.max(0, (noite - 0.35) / 0.65);
    const rr = refRastro.current!;
    carros.forEach((c, i) => {
      ref.current!.getMatrixAt(i, o.matrix);
      o.matrix.decompose(o.position, o.quaternion, o.scale);
      const comp = c.vel * 1.6 * k + 0.001;
      o.scale.set(1, 1, comp);
      o.updateMatrix();
      rr.setMatrixAt(i * 2, o.matrix);
      o.rotateY(Math.PI);
      o.scale.set(1, 1, comp * 0.6);
      o.updateMatrix();
      rr.setMatrixAt(i * 2 + 1, o.matrix);
    });
    rr.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => {
    const r = refRastro.current!, ver = new THREE.Color(2.6, 0.25, 0.15), bra = new THREE.Color(2.2, 2.0, 1.6);
    for (let i = 0; i < n; i++) {
      // the car's local +z is its travel direction when lado = 1 and the reverse when -1
      const tras = carros[i].lado > 0;
      r.setColorAt(i * 2, tras ? ver : bra);
      r.setColorAt(i * 2 + 1, tras ? bra : ver);
    }
    r.instanceColor!.needsUpdate = true;
  }, [carros, n]);
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />
      <instancedMesh ref={refRastro} args={[geoRastro, matRastro, n * 2]} frustumCulled={false} />
    </>
  );
}

/** Fly camera: WASD/arrows, Q/E, Shift turbo, pointer drag to look. */
function Voo({ alvoChunk, pausado }: { alvoChunk: (cx: number, cz: number, x: number, z: number) => void; pausado: boolean }) {
  const { camera, gl } = useThree();
  const teclas = useRef(new Set<string>());
  const olhar = useRef({ yaw: Math.PI * 1.25, pitch: -0.32 });
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const ultimo = useRef('');
  useEffect(() => {
    camera.position.set(-520, 210, -520);
    const el = gl.domElement;
    const dn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      teclas.current.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => teclas.current.delete(e.key.toLowerCase());
    const pd = (e: PointerEvent) => { arrasto.current = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => {
      if (!arrasto.current) return;
      olhar.current.yaw -= (e.clientX - arrasto.current.x) * 0.004;
      olhar.current.pitch = Math.max(-1.4, Math.min(0.6, olhar.current.pitch - (e.clientY - arrasto.current.y) * 0.004));
      arrasto.current = { x: e.clientX, y: e.clientY };
    };
    const pu = () => { arrasto.current = null; };
    addEventListener('keydown', dn);
    addEventListener('keyup', up);
    el.addEventListener('pointerdown', pd);
    el.addEventListener('pointermove', pm);
    el.addEventListener('pointerup', pu);
    el.addEventListener('pointercancel', pu);
    return () => {
      removeEventListener('keydown', dn);
      removeEventListener('keyup', up);
      el.removeEventListener('pointerdown', pd);
      el.removeEventListener('pointermove', pm);
      el.removeEventListener('pointerup', pu);
      el.removeEventListener('pointercancel', pu);
    };
  }, [camera, gl]);
  const frente = useMemo(() => new THREE.Vector3(), []);
  const lado = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    const { yaw, pitch } = olhar.current;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    const k = teclas.current;
    const vel = (k.has('shift') ? 260 : 70) * dt;
    frente.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    lado.set(Math.cos(yaw), 0, -Math.sin(yaw));
    if (k.has('w') || k.has('arrowup')) camera.position.addScaledVector(frente, vel);
    if (k.has('s') || k.has('arrowdown')) camera.position.addScaledVector(frente, -vel);
    if (k.has('d') || k.has('arrowright')) camera.position.addScaledVector(lado, vel);
    if (k.has('a') || k.has('arrowleft')) camera.position.addScaledVector(lado, -vel);
    if (k.has('e')) camera.position.y += vel;
    if (k.has('q')) camera.position.y -= vel;
    // Gentle auto-drift so the city is alive even before anyone touches it.
    if (!pausado && k.size === 0 && !arrasto.current) camera.position.addScaledVector(frente, 8 * dt);
    camera.position.y = Math.max(6, Math.min(600, camera.position.y));
    const cx = Math.floor(camera.position.x / CHUNK);
    const cz = Math.floor(camera.position.z / CHUNK);
    const chave = `${cx},${cz}`;
    if (chave !== ultimo.current) {
      ultimo.current = chave;
      alvoChunk(cx, cz, camera.position.x, camera.position.z);
    }
  });
  return null;
}

/** Red blinking beacons on tall buildings and warm street lights around the camera. */
function Luzes({ seed, quadras }: { seed: number; quadras: [number, number][] }) {
  const refTopo = useRef<THREE.InstancedMesh>(null);
  const refPoste = useRef<THREE.InstancedMesh>(null);
  const topos = useMemo(() => quadras.flatMap(([cx, cz]) => gerarChunk(seed, cx, cz).predios.filter((p) => p.h > 90).map((p) => [p.x, p.h + 1.5, p.z] as const)), [seed, quadras]);
  const matTopo = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2), toneMapped: false }), []);
  const matPoste = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.9), toneMapped: false }), []);
  const NP = 900;
  useEffect(() => {
    const o = new THREE.Object3D();
    topos.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); refTopo.current!.setMatrixAt(i, o.matrix); });
    refTopo.current!.count = topos.length;
    refTopo.current!.instanceMatrix.needsUpdate = true;
  }, [topos]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera, clock }) => {
    matTopo.color.setRGB(4 * (0.15 + 0.85 * (Math.sin(clock.elapsedTime * 3) > 0.6 ? 1 : 0)) * uniformes.uNoite.value, 0.3, 0.2);
    matPoste.color.setRGB(3.2 * uniformes.uNoite.value, 2.0 * uniformes.uNoite.value, 0.9 * uniformes.uNoite.value);
    // Street lights on a grid around the camera: corners of each block, both road sides.
    const bx = Math.round(camera.position.x / BLOCO), bz = Math.round(camera.position.z / BLOCO);
    let i = 0;
    for (let a = -7; a <= 7 && i < NP; a++)
      for (let b = -7; b <= 7 && i < NP; b++)
        for (const [dx, dz] of [[RUA / 2 - 0.5, 0], [0, RUA / 2 - 0.5], [-(RUA / 2 - 0.5), BLOCO / 2]] as const) {
          if (i >= NP) break;
          o.position.set((bx + a) * BLOCO + dx, 7, (bz + b) * BLOCO + dz);
          o.updateMatrix();
          refPoste.current!.setMatrixAt(i++, o.matrix);
        }
    refPoste.current!.count = i;
    refPoste.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={refTopo} args={[undefined, matTopo, 400]} frustumCulled={false}><sphereGeometry args={[1.1, 8, 6]} /></instancedMesh>
      <instancedMesh ref={refPoste} args={[undefined, matPoste, NP]} frustumCulled={false}><sphereGeometry args={[0.45, 6, 4]} /></instancedMesh>
    </>
  );
}

function Ceu() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(materialCeu, []);
  useFrame(({ camera }) => ref.current!.position.copy(camera.position));
  return <mesh ref={ref} material={mat} renderOrder={-1} frustumCulled={false}><sphereGeometry args={[2000, 32, 16]} /></mesh>;
}

function Relogio({ pausado, onTempo }: { pausado: boolean; onTempo: (t: number) => void }) {
  useFrame((_, dt) => {
    if (!pausado) uniformes.uTempo.value += dt;
    onTempo(uniformes.uTempo.value);
  });
  return null;
}

function Chao() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => materialChao(), []);
  useFrame(({ camera }) => ref.current!.position.set(Math.round(camera.position.x / BLOCO) * BLOCO, 0, Math.round(camera.position.z / BLOCO) * BLOCO));
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={mat}>
      <planeGeometry args={[4000, 4000]} />
    </mesh>
  );
}

function lerSemente() {
  const m = /seed-(\d+)/.exec(location.hash);
  return m ? Number(m[1]) % 1_000_000_000 : 2026;
}

export default function Cidade({ lang }: { lang: Lang }) {
  const debug = useDebug();
  const menos = useMenosMovimento();
  const celular = useCelular();
  const [seed, setSeed] = useState(2026);
  const [campo, setCampo] = useState('2026');
  const [centro, setCentro] = useState({ cx: 0, cz: 0, rua: '' });
  const [inicio, setInicio] = useState(0);
  const [noite, setNoite] = useState(0.85);
  const [pausado, setPausado] = useState(false);
  const [fps, setFps] = useState(0);
  const tempo = useRef(0);
  const raio = celular ? 2 : 3;
  const leve = useModo() === 'leve';
  const { qualidade, dpr, monitor } = useQualidade(celular);
  useEffect(() => { uniformes.uBrilho.value = leve ? 1.35 : 3.0; }, [leve]);

  useEffect(() => {
    const s = lerSemente();
    setSeed(s);
    setCampo(String(s));
    const f = () => { const s2 = lerSemente(); setSeed(s2); setCampo(String(s2)); setInicio(tempo.current); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  useEffect(() => { if (menos) setPausado(true); }, [menos]);
  useEffect(() => {
    uniformes.uNoite.value = noite;
    uniformes.uDourado.value = dourado(noite);
    // The sun drops toward the horizon as the slider goes from day to dusk.
    const el = THREE.MathUtils.lerp(0.95, 0.12, Math.min(1, noite / 0.5));
    uniformes.uSol.value.set(-Math.cos(el) * 0.9, Math.sin(el), Math.cos(el) * 0.3).normalize(); // behind the start camera, so lit faces show
    const dia = new THREE.Color('#9fb4cf');
    const noiteCor = new THREE.Color('#0b1224');
    uniformes.uNevoa.value.copy(dia).lerp(noiteCor, noite).lerp(new THREE.Color('#e3a464'), uniformes.uDourado.value * 0.35);
  }, [noite]);

  const quadras = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = -raio; i <= raio; i++) for (let j = -raio; j <= raio; j++) out.push([centro.cx + i, centro.cz + j]);
    return out;
  }, [centro.cx, centro.cz, raio]);
  const totalPredios = useMemo(() => quadras.reduce((n, [cx, cz]) => n + gerarChunk(seed, cx, cz).predios.length, 0), [quadras, seed]);

  const gerar = (s: number) => {
    const v = Math.abs(Math.floor(s)) % 1_000_000_000;
    history.replaceState(null, '', `#seed-${v}`);
    setSeed(v);
    setCampo(String(v));
    setInicio(menos ? -10 : tempo.current);
  };

  return (
    <div className="lab-palco">
      <Canvas
        dpr={leve ? 1 : dpr}
        camera={{ fov: 60, near: 1, far: 2400 }}
        gl={{ antialias: leve && !celular, powerPreference: 'high-performance', toneMapping: leve ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
        onCreated={({ gl, scene }) => { gl.setClearColor(uniformes.uNevoa.value); scene.background = uniformes.uNevoa.value; }}
        aria-label={lang === 'pt' ? `Cidade gerada pela semente ${seed}` : `City generated from seed ${seed}`}
        role="img"
      >
        {!leve && <Dpr valor={dpr} />}
        {!leve && <Ceu />}
        <hemisphereLight args={['#b9c8ff', '#1a1d26', 0.6]} />
        <Relogio pausado={pausado} onTempo={(t) => (tempo.current = t)} />
        <Voo pausado={pausado} alvoChunk={(cx, cz) => setCentro({ cx, cz, rua: nomeRua(seed, cx, cz) })} />
        <Chao />
        {quadras.map(([cx, cz]) => <Quadra key={`${seed}:${cx}:${cz}`} seed={seed} cx={cx} cz={cz} inicio={inicio} />)}
        <Carros seed={seed} n={celular ? 180 : 420} pausado={pausado} />
        {!leve && <Luzes seed={seed} quadras={quadras} />}
        {!leve && monitor(<Pos qualidade={qualidade} bloom={{ intensidade: 1.2, limiar: 1.0 }} vinheta={0.5} />)}
        {debug && <MedidorFps onFps={setFps} />}
      </Canvas>

      <div className="lab-painel">
        <form
          className="lab-linha"
          onSubmit={(e) => { e.preventDefault(); gerar(Number(campo) || 0); }}
        >
          <label className="lab-rotulo" htmlFor="semente">{txt.semente[lang]}</label>
          <input id="semente" className="lab-input" inputMode="numeric" value={campo} onChange={(e) => setCampo(e.target.value.replace(/\D/g, '').slice(0, 9))} />
          <button className="lab-botao lab-botao-forte" type="submit">{txt.gerar[lang]}</button>
          <button className="lab-botao" type="button" onClick={() => gerar(Math.floor(Math.random() * 999_999_999))}>{txt.sortear[lang]}</button>
        </form>
        <label className="lab-linha">
          <span className="lab-rotulo">{txt.hora[lang]}</span>
          <input type="range" min={0} max={1} step={0.01} value={1 - noite} onChange={(e) => setNoite(1 - Number(e.target.value))} aria-valuetext={noite > 0.5 ? (lang === 'pt' ? 'noite' : 'night') : (lang === 'pt' ? 'dia' : 'day')} />
        </label>
        <div className="lab-linha">
          <button className="lab-botao" type="button" aria-pressed={pausado} onClick={() => setPausado((p) => !p)}>{pausado ? txt.rodar[lang] : txt.pausar[lang]}</button>
          <span className="lab-dica">{txt.controles[lang]}</span>
        </div>
        <p className="lab-dado" aria-live="polite">
          <b>{centro.rua || nomeRua(seed, 0, 0)}</b> · {totalPredios.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en')} {txt.predios[lang]}
          {debug && <> · {fps} fps</>}
        </p>
      </div>
    </div>
  );
}
