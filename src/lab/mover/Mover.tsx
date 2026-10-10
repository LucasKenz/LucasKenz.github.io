import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import dados from '@content/mover-dados.json';
import { MedidorFps, useCelular, useDebug, useMenosMovimento } from '../comum/Fps';
import { Dpr, Pos, useModo, useQualidade } from '../comum/Pos';
import { COR, corPredio, corRampa, type Camada } from './cores';

type Lang = 'pt' | 'en';
const txt = {
  camadas: { pt: 'Camada de dados', en: 'Data layer' },
  procedencia: { pt: 'Medido × assumido', en: 'Measured × assumed' },
  rota: { pt: 'Rampa da rota', en: 'Route grade' },
  arvores: { pt: 'Funil das árvores', en: 'Tree funnel' },
  pausar: { pt: 'Pausar', en: 'Pause' },
  rodar: { pt: 'Retomar', en: 'Resume' },
  dica: { pt: 'Arraste para girar · passe o cursor num prédio', en: 'Drag to orbit · hover a building' },
  medida: { pt: 'altura medida', en: 'measured height' },
  assumida: { pt: 'altura assumida (2 pav. × 3,5 m)', en: 'assumed height (2 floors × 3.5 m)' },
  lombada: { pt: 'lombada (medida)', en: 'speed bump (measured)' },
  faixa: { pt: 'faixa de pedestre (sintética, norma CONTRAN)', en: 'crosswalk (synthetic, CONTRAN standard)' },
  subida: { pt: 'subida', en: 'uphill' },
  descida: { pt: 'descida', en: 'downhill' },
  plano: { pt: 'plano', en: 'flat' },
  longe: { pt: 'a mais de 30 m da via', en: 'over 30 m from the road' },
  perto: { pt: 'até 30 m da via', en: 'within 30 m of the road' },
  carla: { pt: 'colocada no CARLA', en: 'spawned in CARLA' },
  web: { pt: 'na maquete web (anel)', en: 'in the web model (ring)' },
  area: { pt: 'área', en: 'area' },
  altura: { pt: 'altura', en: 'height' },
};

type Predio = (typeof dados.predios)[number];
const predioPorId = new Map(dados.predios.map((p) => [p.id, p]));
// Orbit around the middle of the surveyed area (tree extents), not the model origin.
const CENTRO = (() => {
  const xs = dados.arvores.map((a) => a[0]), zs = dados.arvores.map((a) => a[2]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2] as [number, number, number];
})();

/** The real campus model (survey -> glTF, meshopt), restyled as a dark data diorama. */
function Campus({ camada, onPredio, leve }: { camada: Camada; onPredio: (p: Predio | null) => void; leve: boolean }) {
  const { scene } = useGLTF('/media/mover/campus.glb', false, true);
  const { cena, predios } = useMemo(() => {
    const c = scene.clone(true);
    const base: Record<string, string> = {
      terreno: '#1b2547', acostamento: '#242f55', pista: '#353f66', pavimento_asfalto: '#2e3860', pavimento_concreto: '#38436c',
      sarjeta: '#424d78', meio_fio: '#5a6690', calcada: '#3f4a74', pintura_branca: '#8f9ac0', pintura_amarela: '#b8952e',
      faixa_pedestre: '#8f9ac0', abrigos: '#3a4670', coberturas: '#3a4670',
    };
    const mats = new Map<string, THREE.MeshStandardMaterial>();
    const predios: { id: string; mesh: THREE.Mesh[] }[] = [];
    c.traverse((o) => {
      if (o.name.startsWith('predio_E')) predios.push({ id: o.name.slice(7), mesh: o.children.filter((x) => (x as THREE.Mesh).isMesh) as THREE.Mesh[] });
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const nome = (m.material as THREE.Material).name;
      m.receiveShadow = !leve;
      if (nome.startsWith('predio_')) return;
      if (!mats.has(nome)) {
        const ordem = ['pintura_branca', 'pintura_amarela', 'faixa_pedestre'].includes(nome) ? 2 : 0;
        mats.set(nome, new THREE.MeshStandardMaterial({ color: base[nome] ?? '#1a2340', roughness: 0.92, polygonOffset: ordem > 0, polygonOffsetFactor: -ordem, polygonOffsetUnits: -ordem * 4 }));
      }
      m.material = mats.get(nome)!;
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
    });
    for (const p of predios) {
      for (const m of p.mesh) {
        m.castShadow = !leve;
        m.userData.predio = p.id;
        m.material = new THREE.MeshPhysicalMaterial({ color: '#cfd6ea', roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 });
        if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
      }
    }
    return { cena: c, predios };
  }, [scene, leve]);

  // Colour by data layer: in "provenance" the building tells whether its height was measured.
  useEffect(() => {
    for (const p of predios) {
      const info = predioPorId.get(p.id);
      for (const m of p.mesh) {
        const mat = m.material as THREE.MeshPhysicalMaterial;
        if (camada === 'procedencia' && info) {
          mat.color.set(corPredio(info.medida));
          mat.emissive.set(info.medida ? COR.medido : COR.assumido);
          mat.emissiveIntensity = 0.06;
        } else {
          mat.color.set('#8b95b8');
          mat.emissive.set('#000');
        }
      }
    }
  }, [camada, predios]);

  const sobre = (e: ThreeEvent<PointerEvent>) => {
    const id = e.object.userData.predio as string | undefined;
    if (!id) return;
    e.stopPropagation();
    onPredio(predioPorId.get(id) ?? null);
    document.body.style.cursor = 'pointer';
  };
  return <primitive object={cena} onPointerOver={sobre} onPointerOut={() => { onPredio(null); document.body.style.cursor = ''; }} />;
}

/** Entry -> ring -> exit route as a glowing ribbon, coloured by grade (diverging) or plain. */
function Rota({ camada, pausado }: { camada: Camada; pausado: boolean }) {
  const pts = useMemo(() => dados.rota.map((r) => new THREE.Vector3(r.p[0], r.p[1] + 0.6, r.p[2])), []);
  const geo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = pts.length * 3;
    const g = new THREE.TubeGeometry(curva, n, 0.55, 6, false);
    const cores = new Float32Array(g.attributes.position.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i <= n; i++) {
      const r = dados.rota[Math.min(dados.rota.length - 1, Math.round((i / n) * (dados.rota.length - 1)))];
      c.copy(corRampa(r.rampa)).multiplyScalar(2.2); // > 1 so bloom picks it up
      for (let j = 0; j <= 6; j++) { const k = (i * 7 + j) * 3; cores[k] = c.r; cores[k + 1] = c.g; cores[k + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    return { g, curva };
  }, [pts]);
  const pulso = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!pausado) t.current = (t.current + dt / 42) % 1; // one pass every 42 s (illustrative)
    pulso.current?.position.copy(geo.curva.getPointAt(t.current)).setY(geo.curva.getPointAt(t.current).y + 0.9);
  });
  const ativa = camada === 'rota';
  return (
    <group>
      <mesh geometry={geo.g}>
        <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={ativa ? 1 : 0.8} color={ativa ? '#ffffff' : '#b9c4ea'} />
      </mesh>
      <mesh ref={pulso}>
        <sphereGeometry args={[1.4, 16, 12]} />
        <meshBasicMaterial color={[4, 3.2, 0.6]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Measured speed bumps and synthetic crosswalks as thin light beams. */
function Marcos({ camada }: { camada: Camada }) {
  const itens = useMemo(() => dados.objetos.filter((o) => o.tipo === 'lombada' || o.tipo === 'faixa'), []);
  if (camada !== 'procedencia') return null;
  return (
    <group>
      {itens.map((o) => (
        <mesh key={o.codigo} position={[o.pos[0], o.pos[1] + 6, o.pos[2]]}>
          <cylinderGeometry args={[0.35, 0.35, 12, 8, 1, true]} />
          <meshBasicMaterial color={o.tipo === 'lombada' ? [3, 2.2, 0.2] : [2.4, 0.9, 0.35]} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** All 1 743 surveyed trees, instanced, coloured by how far they went in the pipeline. */
function Arvores({ camada }: { camada: Camada }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = dados.arvores.length;
  useEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    dados.arvores.forEach((a, i) => {
      const [x, y, z, classe, web] = a;
      const mostra = camada === 'arvores' || web === 1;
      o.position.set(x, y + 2.6, z);
      o.scale.setScalar(mostra ? (camada === 'arvores' ? 1.1 : 1.5) : 0.0001);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (camada !== 'arvores') c.set('#2f6b55');
      else if (web === 1) c.set(COR.web).multiplyScalar(1.6);
      else c.set(classe === 2 ? COR.carla : classe === 1 ? COR.perto : COR.longe);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [camada]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow={false}>
      <icosahedronGeometry args={[1.5, 1]} />
      <meshStandardMaterial roughness={0.7} toneMapped={camada !== 'arvores'} />
    </instancedMesh>
  );
}

function Cena(props: { camada: Camada; leve: boolean; pausado: boolean; celular: boolean; debug: boolean; onFps: (f: number) => void; onPredio: (p: Predio | null) => void }) {
  const { camada, leve, pausado, celular, debug, onFps, onPredio } = props;
  return (
    <>
      <color attach="background" args={['#0d1531']} />
      <fog attach="fog" args={['#0d1531', 380, 900]} />
      <hemisphereLight args={['#b7c6ff', '#1a2140', leve ? 1.3 : 0.95]} />
      <directionalLight
        position={[-180, 220, 120]}
        intensity={leve ? 2.2 : 2.8}
        color="#ffe2b8"
        castShadow={!leve}
        shadow-mapSize={celular ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-far={800}
        shadow-bias={-0.0005}
      />
      <Campus camada={camada} onPredio={onPredio} leve={leve} />
      <Rota camada={camada} pausado={pausado} />
      <Marcos camada={camada} />
      <Arvores camada={camada} />
      <OrbitControls target={CENTRO} enableDamping dampingFactor={0.08} minDistance={90} maxDistance={620} maxPolarAngle={1.2} enablePan={false} autoRotate={!pausado} autoRotateSpeed={0.35} />
      {debug && <MedidorFps onFps={onFps} />}
    </>
  );
}

// Portrait screens see less width: start farther away.
const estreito = () => typeof window !== 'undefined' && window.innerWidth < window.innerHeight;

const fmt = (v: number, lang: Lang, k = 1) => v.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: k });

export default function Mover({ lang }: { lang: Lang }) {
  const debug = useDebug();
  const menos = useMenosMovimento();
  const celular = useCelular();
  const { qualidade, dpr, monitor } = useQualidade(celular);
  const leve = useModo() === 'leve';
  const [camada, setCamada] = useState<Camada>('procedencia');
  const [pausado, setPausado] = useState(false);
  const [predio, setPredio] = useState<Predio | null>(null);
  const [fps, setFps] = useState(0);
  const foco = useMemo(() => new THREE.Vector3(...CENTRO), []);
  useEffect(() => { if (menos) setPausado(true); }, [menos]);

  const legenda: [string, string][] =
    camada === 'procedencia'
      ? [[corPredio(true), `${dados.contagens.prediosMedidos} · ${txt.medida[lang]}`], [corPredio(false), `${dados.contagens.predios - dados.contagens.prediosMedidos} · ${txt.assumida[lang]}`], [COR.lombada, txt.lombada[lang]], [COR.faixa, txt.faixa[lang]]]
      : camada === 'rota'
        ? [[`#${corRampa(6).getHexString()}`, txt.subida[lang]], [`#${corRampa(0).getHexString()}`, txt.plano[lang]], [`#${corRampa(-6).getHexString()}`, txt.descida[lang]]]
        : (() => {
            const c = [0, 0, 0];
            dados.arvores.forEach((a) => c[a[3]]++);
            return [[COR.longe, `${fmt(c[0], lang)} · ${txt.longe[lang]}`], [COR.perto, `${fmt(c[1], lang)} · ${txt.perto[lang]}`], [COR.carla, `${fmt(c[2], lang)} · ${txt.carla[lang]}`], [COR.web, `${fmt(dados.contagens.arvoresWeb, lang)} · ${txt.web[lang]}`]] as [string, string][];
          })();

  return (
    <div className="lab-palco">
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 30, near: 5, far: 2000, position: celular || estreito() ? [CENTRO[0] + 420, 600, CENTRO[2] + 600] : [CENTRO[0] + 300, 290, CENTRO[2] + 390] }}
        gl={{ antialias: leve, powerPreference: 'high-performance', toneMapping: leve ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
        role="img"
        aria-label={lang === 'pt' ? 'Maquete 3D do campus Mauá com a rota do caminhão, prédios e árvores coloridos pelos dados do levantamento' : '3D model of the Mauá campus with the truck route, buildings and trees coloured by the survey data'}
      >
        <Dpr valor={leve ? 1 : dpr} />
        {monitor(
          <>
            <Cena camada={camada} leve={leve} pausado={pausado} celular={celular} debug={debug} onFps={setFps} onPredio={setPredio} />
            {!leve && <Pos qualidade={qualidade} ao bloom={{ intensidade: 0.8, limiar: 1.0 }} dof={{ alvo: foco, escala: 1.2, distancia: 0.08 }} vinheta={0.5} grao={false} />}
          </>,
        )}
      </Canvas>
      <div className="lab-painel mover-painel">
        <div className="lab-chips" role="group" aria-label={txt.camadas[lang]}>
          {(['procedencia', 'rota', 'arvores'] as const).map((k) => (
            <button key={k} type="button" className="lab-chip" aria-pressed={camada === k} onClick={() => setCamada(k)}>{txt[k][lang]}</button>
          ))}
        </div>
        <ul className="lab-legenda">
          {legenda.map(([c, t]) => <li key={t}><i style={{ background: c }} aria-hidden="true" />{t}</li>)}
        </ul>
        <p className="lab-ficha" aria-live="polite">
          {predio
            ? <><b>{predio.nome}</b> · {txt.area[lang]} {fmt(predio.area, lang, 0)} m² · {txt.altura[lang]} {fmt(predio.altura, lang)} m · {predio.medida ? txt.medida[lang] : txt.assumida[lang]}</>
            : <span className="lab-dica">{txt.dica[lang]}{debug && ` · ${fps} fps · ${leve ? 'leve' : `q${qualidade}`}`}</span>}
        </p>
        <div className="lab-linha">
          <button className="lab-botao" type="button" aria-pressed={pausado} onClick={() => setPausado((p) => !p)}>{pausado ? txt.rodar[lang] : txt.pausar[lang]}</button>
        </div>
      </div>
    </div>
  );
}

useGLTF.preload('/media/mover/campus.glb', false, true);
