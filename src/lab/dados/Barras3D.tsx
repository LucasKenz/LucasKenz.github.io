import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MedidorFps, useCelular, useDebug, useMenosMovimento } from '../comum/Fps';
import { Dpr, Pos, useModo, useQualidade } from '../comum/Pos';
import { matrizes, type Matriz } from './matrizes';

// 3D bar field for the data projects: one rounded bar per cell of the project's matrix, height and
// colour by value (one-hue sequential ramp), bars rise with a critically damped spring when the scene
// loads or the hovered row changes. Hover a bar to read row, column and value in the panel.

type Lang = 'pt' | 'en';
const txt = {
  pausar: { pt: 'Pausar', en: 'Pause' },
  rodar: { pt: 'Retomar', en: 'Resume' },
  dica: { pt: 'Arraste para girar · passe o cursor numa barra', en: 'Drag to orbit · hover a bar' },
  carregando: { pt: 'Carregando os dados…', en: 'Loading data…' },
};

const ESP = 1.25; // spacing between bars
const ALT = 7; // height of the tallest bar
const claro = new THREE.Color('#b9d3f7');
const escuro = new THREE.Color('#1e5fc0');
const destaque = new THREE.Color('#ffc21a');

function Campo({ m, onSel, pausado }: { m: Matriz; onSel: (s: { i: number; j: number } | null) => void; pausado: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const nl = m.linhas.length, nc = m.colunas.length;
  const N = nl * nc;
  const geo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.12).translate(0, 0.5, 0), []);
  const { min, max } = useMemo(() => {
    const v = m.valores.flat().filter((x): x is number => x !== null);
    return { min: m.base ?? Math.min(0, ...v), max: Math.max(...v) };
  }, [m]);
  const alturas = useRef(new Float32Array(N));
  const vel = useRef(new Float32Array(N));
  const sel = useRef<number>(-1);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const t0 = useRef(0);
  const parado = useRef(false); // springs settled and nothing changed: skip buffer uploads
  const ultimaSel = useRef(-2);
  useEffect(() => { alturas.current.fill(0.001); vel.current.fill(0); t0.current = 0; parado.current = false; }, [m]);

  useFrame((_, dtBruto) => {
    const dt = pausado ? 0 : Math.min(dtBruto, 1 / 30);
    t0.current += dt;
    if (parado.current && ultimaSel.current === sel.current) return;
    ultimaSel.current = sel.current;
    let movendo = false;
    const k = 7; // spring stiffness
    for (let i = 0; i < nl; i++)
      for (let j = 0; j < nc; j++) {
        const id = i * nc + j;
        const v = m.valores[i][j];
        // staggered start: a wave sweeping along the columns
        const ativo = t0.current > (j / nc) * 0.8 + (i / nl) * 0.3;
        const alvo = v === null ? 0.001 : Math.max(0.05, ((v - min) / (max - min || 1)) * ALT);
        const x = alturas.current[id], vv = vel.current[id];
        const destino = ativo ? alvo : 0.001;
        // critically damped spring, semi-implicit step
        const a = -k * k * (x - destino) - 2 * k * vv;
        vel.current[id] = vv + a * dt;
        alturas.current[id] = x + vel.current[id] * dt;
        if (!ativo || Math.abs(alturas.current[id] - destino) > 1e-3 || Math.abs(vel.current[id]) > 1e-3) movendo = true;
        o.position.set((j - (nc - 1) / 2) * ESP, 0, (i - (nl - 1) / 2) * ESP);
        o.scale.set(0.92, Math.max(0.001, alturas.current[id]), 0.92);
        o.updateMatrix();
        ref.current!.setMatrixAt(id, o.matrix);
        if (v === null) c.set('#2a3352');
        else c.copy(claro).lerp(escuro, (v - min) / (max - min || 1));
        if (sel.current >= 0) {
          const si = Math.floor(sel.current / nc), sj = sel.current % nc;
          if (id === sel.current) c.copy(destaque);
          else if (i !== si && j !== sj) c.multiplyScalar(0.45); // keep the hovered row and column bright
        }
        ref.current!.setColorAt(id, c);
      }
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.instanceColor!.needsUpdate = true;
    parado.current = !movendo;
  });

  const mover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    sel.current = e.instanceId;
    onSel({ i: Math.floor(e.instanceId / nc), j: e.instanceId % nc });
  };
  return (
    <instancedMesh ref={ref} args={[geo, undefined, N]} castShadow receiveShadow onPointerMove={mover} onPointerOut={() => { sel.current = -1; onSel(null); }}>
      <meshPhysicalMaterial roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} />
    </instancedMesh>
  );
}

export default function Barras3D({ lang, slug }: { lang: Lang; slug?: string }) {
  const debug = useDebug();
  const menos = useMenosMovimento();
  const celular = useCelular();
  const { qualidade, dpr, monitor } = useQualidade(celular);
  const leve = useModo() === 'leve';
  const [m, setM] = useState<Matriz | null>(null);
  const [sel, setSel] = useState<{ i: number; j: number } | null>(null);
  const [pausado, setPausado] = useState(false);
  const [fps, setFps] = useState(0);
  useEffect(() => { if (menos) setPausado(true); }, [menos]);
  useEffect(() => { if (slug && matrizes[slug]) matrizes[slug]().then(setM); }, [slug]);
  const foco = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  if (!m) return <div className="lab-palco lab-espera"><span role="status">{txt.carregando[lang]}</span></div>;

  const largura = Math.max(m.colunas.length, m.linhas.length) * ESP;
  // Fit the whole field: wider grids and portrait screens need the camera farther back.
  const retrato = typeof window !== 'undefined' && window.innerWidth < window.innerHeight;
  const dist = Math.max(18, largura * 1.25) * (retrato ? 1.7 : 1);
  const v = sel ? m.valores[sel.i][sel.j] : null;
  return (
    <div className="lab-palco">
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 32, position: [dist * 0.72, dist * 0.7, dist * 0.82], near: 0.5, far: 400 }}
        gl={{ antialias: leve, powerPreference: 'high-performance', toneMapping: leve ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
        role="img"
        aria-label={`${m.titulo[lang]} (${m.eixos[lang]})`}
      >
        <Dpr valor={leve ? 1 : dpr} />
        <color attach="background" args={['#0b1226']} />
        <fog attach="fog" args={['#0b1226', dist * 1.6, dist * 3.2]} />
        <hemisphereLight args={['#c7d6ff', '#141a2e', leve ? 1.2 : 0.8]} />
        <directionalLight position={[largura * 0.6, largura, largura * 0.4]} intensity={2.4} color="#fff1dc" castShadow={!leve} shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-largura} shadow-camera-right={largura} shadow-camera-top={largura} shadow-camera-bottom={-largura} shadow-bias={-0.0004} />
        {monitor(
          <>
            <Campo m={m} onSel={setSel} pausado={pausado} />
            <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
              <planeGeometry args={[largura * 4, largura * 4]} />
              <meshStandardMaterial color="#121a33" roughness={0.95} />
            </mesh>
            <OrbitControls target={[0, ALT * 0.4, 0]} enableDamping dampingFactor={0.08} minDistance={dist * 0.4} maxDistance={dist * 2} maxPolarAngle={1.35} enablePan={false} autoRotate={!pausado && !sel} autoRotateSpeed={0.4} />
            {!leve && <Pos qualidade={qualidade} bloom={{ intensidade: 0.5, limiar: 1.0 }} dof={{ alvo: foco, escala: 1.2, distancia: 0.1 }} vinheta={0.5} grao={false} />}
            {debug && <MedidorFps onFps={setFps} />}
          </>,
        )}
      </Canvas>
      <div className="lab-painel">
        <p className="lab-rotulo">{m.titulo[lang]} · {m.eixos[lang]}{m.base ? ` · ${lang === 'pt' ? 'altura a partir de' : 'height from'} ${m.unidade(m.base, lang)}` : ''}</p>
        <p className="lab-ficha" aria-live="polite">
          {sel && v !== null && v !== undefined
            ? <><b>{m.linhas[sel.i][lang]}</b> · {m.colunas[sel.j]} · <b>{m.unidade(v, lang)}</b></>
            : <span className="lab-dica">{txt.dica[lang]}{debug && ` · ${fps} fps · ${leve ? 'leve' : `q${qualidade}`}`}</span>}
        </p>
        <div className="lab-linha">
          <button className="lab-botao" type="button" aria-pressed={pausado} onClick={() => setPausado((p) => !p)}>{pausado ? txt.rodar[lang] : txt.pausar[lang]}</button>
          <a className="lab-botao" href="#dados">{lang === 'pt' ? 'Ver a análise ↓' : 'See the analysis ↓'}</a>
        </div>
      </div>
    </div>
  );
}
