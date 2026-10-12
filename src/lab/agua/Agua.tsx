import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Barco } from './Barco';
import { Ilha } from './Ilha';
import { Passaros } from './Passaros';
import { materialAgua, materialFundo, uAgua } from './material';
import { superficie } from './ondas';
import { MedidorFps, useCelular, useDebug, useMenosMovimento } from '../comum/Fps';
import { Dpr, Pos, useModo, useQualidade } from '../comum/Pos';
import { rng } from '../cidade/gerador';
import { SoNaTela } from '../comum/SoNaTela';

type Lang = 'pt' | 'en';
const txt = {
  vento: { pt: 'Vento', en: 'Wind' },
  sol: { pt: 'Altura do sol', en: 'Sun height' },
  pausar: { pt: 'Pausar', en: 'Pause' },
  rodar: { pt: 'Retomar', en: 'Resume' },
  dica: { pt: 'Arraste para girar · role para aproximar', en: 'Drag to orbit · scroll to zoom' },
  seguir: { pt: 'Seguir o barco', en: 'Follow the boat' },
};

const RAIO = 25; // boat's lap radius (m), around the island
const CENTRO = new THREE.Vector2(26, -30);

function Mar({ celular }: { celular: boolean }) {
  const agua = useMemo(materialAgua, []);
  const fundo = useMemo(materialFundo, []);
  const seg = celular ? 160 : 300;
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} material={agua}>
        <planeGeometry args={[260, 260, seg, seg]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} material={fundo}>
        <planeGeometry args={[260, 260, celular ? 128 : 220, celular ? 128 : 220]} />
      </mesh>
    </>
  );
}

/** Rocks and pebbles on the island: deformed icosahedra, instanced. */
function Pedras() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const refP = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1, 4);
    base.deleteAttribute('normal');
    base.deleteAttribute('uv');
    const g = mergeVertices(base); // shared vertices -> smooth normals, no facets
    const p = g.attributes.position;
    // Smooth lumps from a function of the position (same value on duplicated seam vertices).
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.14 * Math.sin(3.1 * x + 1.3) * Math.sin(2.7 * y + 0.4) * Math.sin(3.5 * z + 2.1) + 0.06 * Math.sin(7 * x + 5 * z);
      p.setXYZ(i, x * k, y * k * 0.62, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => {
    const r = rng(11);
    const o = new THREE.Object3D();
    const pedras = 26, seixos = 420;
    for (let i = 0; i < pedras; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 12;
      o.position.set(26 + Math.cos(a) * d, 0.2 + r() * 0.6, -30 + Math.sin(a) * d);
      o.scale.setScalar(0.6 + r() * 1.6);
      o.rotation.set(r() * 3, r() * 3, r() * 3);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    }
    for (let i = 0; i < seixos; i++) {
      const a = r() * Math.PI * 2, d = 9 + r() * 9;
      o.position.set(26 + Math.cos(a) * d, 0.35 + r() * 0.4, -30 + Math.sin(a) * d);
      o.scale.set(0.12 + r() * 0.18, 0.08 + r() * 0.1, 0.12 + r() * 0.18);
      o.rotation.set(0, r() * 3, 0);
      o.updateMatrix();
      refP.current!.setMatrixAt(i, o.matrix);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
    refP.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={ref} args={[geo, undefined, 26]} castShadow receiveShadow>
        <meshStandardMaterial color="#a39a88" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refP} args={[geo, undefined, 420]} receiveShadow>
        <meshStandardMaterial color="#e2dccd" roughness={0.95} />
      </instancedMesh>
    </>
  );
}

/** Foam wake: short-lived white discs left behind the stern. */
function Esteira({ barco }: { barco: React.RefObject<THREE.Group | null> }) {
  const N = 120;
  const ref = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => Array.from({ length: N }, () => ({ p: new THREE.Vector3(0, -99, 0), idade: 99 })), []);
  const prox = useRef(0);
  const acc = useRef(0);
  const o = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false }), []);
  const popa = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const b = barco.current;
    if (!b) return;
    acc.current += dt;
    if (acc.current > 0.06) {
      acc.current = 0;
      popa.set((Math.random() - 0.5) * 0.8, 0, -3.1).applyMatrix4(b.matrixWorld);
      parts[prox.current] = { p: popa.clone(), idade: 0 };
      prox.current = (prox.current + 1) % N;
    }
    parts.forEach((q, i) => {
      q.idade += dt;
      const s = Math.min(q.idade * 0.35 + 0.25, 1.1) * (q.idade < 5 ? 1 : 0);
      o.position.set(q.p.x, superficie(q.p.x, q.p.z, uAgua.uTempo.value, uAgua.uVento.value).y + 0.04, q.p.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.scale.setScalar(s * Math.max(0, 1 - q.idade / 5));
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, N]} frustumCulled={false}>
      <circleGeometry args={[0.5, 16]} />
    </instancedMesh>
  );
}

function Cena({ leve, pausado, vento, sol, seguir, celular, onFps, debug, foco }: {
  leve: boolean; foco: THREE.Vector3; pausado: boolean; vento: number; sol: number; seguir: boolean; celular: boolean; onFps: (n: number) => void; debug: boolean;
}) {
  const barco = useRef<THREE.Group>(null);
  const controles = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const ang = useRef(0.6);
  const luz = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const tmp = useMemo(() => ({ up: new THREE.Vector3(), q: new THREE.Quaternion(), qa: new THREE.Quaternion(), y: new THREE.Vector3(0, 1, 0) }), []);

  useEffect(() => { camera.position.set(CENTRO.x + RAIO + 8, 16, CENTRO.y + 22); }, [camera]);
  useEffect(() => {
    // Sun height 0..1 -> elevation 18°..70°.
    const el = THREE.MathUtils.degToRad(18 + sol * 52);
    uAgua.uSol.value.set(Math.cos(el) * 0.6, Math.sin(el), -Math.cos(el) * 0.8).normalize();
  }, [sol]);
  useEffect(() => { uAgua.uVento.value = vento; }, [vento]);

  useFrame((_, dtBruto) => {
    const dt = pausado ? 0 : Math.min(dtBruto, 1 / 20);
    uAgua.uTempo.value += dt;
    ang.current += (dt * (0.035 + vento * 0.03));
    const t = uAgua.uTempo.value;
    const x = CENTRO.x + Math.cos(ang.current) * RAIO;
    const z = CENTRO.y + Math.sin(ang.current) * RAIO;
    const rumo = Math.atan2(-Math.sin(ang.current), Math.cos(ang.current)); // tangent, counter-clockwise
    // Float: average of four hull points gives height, pitch and roll.
    const fwd = new THREE.Vector2(Math.sin(rumo), Math.cos(rumo));
    const pts = [[0, 2.4], [0, -2.4], [0.9, 0], [-0.9, 0]].map(([s, f]) =>
      superficie(x + fwd.y * s + fwd.x * f, z - fwd.x * s + fwd.y * f, t, vento));
    const altura = pts.reduce((a, p) => a + p.y, 0) / 4;
    const proa = new THREE.Vector3(pts[0].x - pts[1].x, pts[0].y - pts[1].y, pts[0].z - pts[1].z).normalize();
    const lado = new THREE.Vector3(pts[2].x - pts[3].x, pts[2].y - pts[3].y, pts[2].z - pts[3].z).normalize();
    tmp.up.crossVectors(proa, lado).normalize();
    const m = new THREE.Matrix4().makeBasis(lado, tmp.up, proa);
    tmp.q.setFromRotationMatrix(m);
    tmp.qa.setFromAxisAngle(proa, 0.05 + vento * 0.06); // heel with the wind
    tmp.q.premultiply(tmp.qa);
    const b = barco.current!;
    b.position.set(x, altura - 0.12, z);
    b.quaternion.slerp(tmp.q, Math.min(1, dt * 4 + (dt === 0 ? 0 : 0.02)));
    uAgua.uBarco.value.copy(b.position);
    uAgua.uRumo.value = rumo;
    foco.copy(b.position).add(new THREE.Vector3(0, 1.2, 0));
    if (seguir && controles.current) {
      const alvo = controles.current.target;
      const delta = foco.clone().sub(alvo).multiplyScalar(Math.min(1, dt * 2));
      alvo.add(delta);
      camera.position.add(delta);
      controles.current.update();
    }
    if (luz.current) {
      luz.current.position.copy(b.position).addScaledVector(uAgua.uSol.value, 30);
      luz.current.target.position.copy(b.position);
      luz.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      {!leve && <Environment files="/hdri/kloofendal_48d_partly_cloudy_puresky.hdr" environmentIntensity={0.9} />}
      <hemisphereLight args={['#dff1ff', '#cbb995', 0.6]} />
      <directionalLight ref={luz} intensity={leve ? 2.8 : 2.4} color="#fff3df" castShadow={!leve} shadow-mapSize={celular ? [1024, 1024] : [2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
      <Mar celular={celular || leve} />
      <Pedras />
      <Ilha leve={leve} />
      <Passaros pausado={pausado} />
      <Barco ref={barco} vento={vento} />
      <Esteira barco={barco} />
      <OrbitControls ref={controles as never} target={[CENTRO.x + RAIO, 1, CENTRO.y]} enableDamping dampingFactor={0.08} minDistance={8} maxDistance={70} maxPolarAngle={1.35} enablePan={false} />
      {debug && <MedidorFps onFps={onFps} />}
    </>
  );
}

export default function Agua({ lang }: { lang: Lang }) {
  const debug = useDebug();
  const menos = useMenosMovimento();
  const celular = useCelular();
  const { qualidade, dpr, monitor } = useQualidade(celular);
  const leve = useModo() === 'leve';
  const [vento, setVento] = useState(1);
  const [sol, setSol] = useState(0.55);
  const [pausado, setPausado] = useState(false);
  const [seguir, setSeguir] = useState(true);
  const [fps, setFps] = useState(0);
  const foco = useMemo(() => new THREE.Vector3(CENTRO.x + RAIO, 1, CENTRO.y), []);
  useEffect(() => { if (menos) setPausado(true); }, [menos]);

  return (
    <div className="lab-palco">
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 38, near: 0.5, far: 400 }}
        gl={{ antialias: leve, powerPreference: 'high-performance', toneMapping: leve ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
        onCreated={({ scene }) => { scene.background = new THREE.Color('#bfe0ef'); }}
        role="img"
        aria-label={lang === 'pt' ? 'Barco a vela navegando em água cristalina perto de uma ilha de areia' : 'Sailboat cruising clear water near a sandy island'}
      >
        <SoNaTela />
        <Dpr valor={leve ? 1 : dpr} />
        {monitor(
          <>
            <Cena leve={leve} foco={foco} pausado={pausado} vento={vento} sol={sol} seguir={seguir} celular={celular} onFps={setFps} debug={debug} />
            {!leve && <Pos qualidade={qualidade} bloom={{ intensidade: 1.1, limiar: 1.0 }} dof={{ alvo: foco, escala: 1.6, distancia: 0.18 }} vinheta={0.45} />}
          </>,
        )}
      </Canvas>
      <div className="lab-painel">
        <label className="lab-campo">
          <span className="lab-rotulo">{txt.vento[lang]}</span>
          <input type="range" min={0.2} max={1.8} step={0.01} value={vento} onChange={(e) => setVento(Number(e.target.value))} />
        </label>
        <label className="lab-campo">
          <span className="lab-rotulo">{txt.sol[lang]}</span>
          <input type="range" min={0} max={1} step={0.01} value={sol} onChange={(e) => setSol(Number(e.target.value))} />
        </label>
        <div className="lab-linha">
          <button className="lab-botao" type="button" aria-pressed={pausado} onClick={() => setPausado((p) => !p)}>{pausado ? txt.rodar[lang] : txt.pausar[lang]}</button>
          <button className="lab-botao" type="button" aria-pressed={seguir} onClick={() => setSeguir((s) => !s)}>{txt.seguir[lang]}</button>
          <span className="lab-dica">{txt.dica[lang]}{debug && ` · ${fps} fps · ${leve ? 'leve' : `q${qualidade}`}`}</span>
        </div>
      </div>
    </div>
  );
}
