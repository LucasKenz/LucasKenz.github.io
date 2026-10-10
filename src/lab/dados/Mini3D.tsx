import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Light 3D charts for the sub-labs: no shadows, no post-processing, rendered on demand (only when the
// user drags or hovers), one draw call per chart. Loaded by Astro only when the tab becomes visible.

type Lang = 'pt' | 'en';
type T = { pt: string; en: string };
export type Mini =
  | { tipo: 'barras'; linhas: T[]; colunas: T[]; valores: (number | null)[][]; unidade: 'pct' | 'int' | 'reais' | 'dec'; aria: T }
  | { tipo: 'superficie'; x: number[]; y: number[]; z: number[][]; rotX: T; rotY: T; rotZ: T; aria: T }
  | { tipo: 'mapa'; valores: Record<string, number>; unidade: 'pct' | 'int' | 'reais' | 'dec'; rotulo: T; aria: T };

const fmt = (v: number, u: string, lang: Lang) => {
  const loc = lang === 'pt' ? 'pt-BR' : 'en-US';
  if (u === 'pct') return `${(v * 100).toLocaleString(loc, { maximumFractionDigits: 1 })} %`;
  if (u === 'reais') return `R$ ${v.toLocaleString(loc, { maximumFractionDigits: 0 })}`;
  if (u === 'dec') return v.toLocaleString(loc, { maximumFractionDigits: 2 });
  return v.toLocaleString(loc, { maximumFractionDigits: 0 });
};
const COR_A = new THREE.Color('#b9d3f7'), COR_B = new THREE.Color('#1e5fc0'), DESTAQUE = new THREE.Color('#ffc21a');

// Tile grid of Brazil's 27 states (column, row), roughly geographic.
const UF_XY: Record<string, [number, number]> = {
  RR: [2, 0], AP: [4, 0], AM: [1, 1], PA: [3, 1], MA: [5, 1], CE: [6, 1], RN: [7, 1], AC: [0, 2], RO: [1, 2], TO: [4, 2], PI: [5, 2], PB: [7, 2],
  PE: [6, 2], MT: [2, 3], GO: [3, 3], DF: [4, 3], BA: [5, 3], AL: [7, 3], SE: [6, 3], MS: [2, 4], MG: [4, 4], ES: [5, 4], SP: [3, 5], RJ: [4, 5],
  PR: [2, 6], SC: [2, 7], RS: [1, 8],
};

interface Celula { x: number; z: number; v: number; rotulo: string }

function Barras({ celulas, max, onSel }: { celulas: Celula[]; max: number; onSel: (i: number | null) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.86, 1, 0.86).translate(0, 0.5, 0), []);
  const [sel, setSel] = useState(-1);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    // update once per data/selection change, then ask for one frame (render on demand)
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D(), c = new THREE.Color();
    celulas.forEach((k, i) => {
      o.position.set(k.x, 0, k.z);
      o.scale.set(1, Math.max(0.03, (k.v / (max || 1)) * 4), 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, i === sel ? DESTAQUE : c.copy(COR_A).lerp(COR_B, k.v / (max || 1)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    invalidate();
  }, [celulas, max, sel, invalidate]);
  const mover = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (e.instanceId !== undefined) { setSel(e.instanceId); onSel(e.instanceId); } };
  return (
    <instancedMesh ref={ref} args={[geo, undefined, celulas.length]} onPointerMove={mover} onPointerOut={() => { setSel(-1); onSel(null); }}>
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

function Superficie({ x, y, z }: { x: number[]; y: number[]; z: number[][] }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(6, 6, x.length - 1, y.length - 1);
    const p = g.attributes.position;
    const cores = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let j = 0; j < y.length; j++)
      for (let i = 0; i < x.length; i++) {
        const k = j * x.length + i;
        const v = z[j][i];
        p.setZ(k, v * 2.4);
        c.copy(new THREE.Color('#d95926')).lerp(new THREE.Color('#3987e5'), v);
        cores.set([c.r, c.g, c.b], k * 3);
      }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    g.computeVertexNormals();
    return g;
  }, [x, y, z]);
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh geometry={geo}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.6} /></mesh>
      <mesh geometry={geo}><meshBasicMaterial wireframe color="#0b1226" transparent opacity={0.25} /></mesh>
    </group>
  );
}

export default function Mini3D({ spec, lang }: { spec: Mini; lang: Lang }) {
  const [sel, setSel] = useState<number | null>(null);
  const { celulas, max } = useMemo(() => {
    if (spec.tipo === 'barras') {
      const nl = spec.linhas.length, nc = spec.colunas.length;
      const cs: Celula[] = [];
      spec.valores.forEach((linha, i) => linha.forEach((v, j) => cs.push({ x: (j - (nc - 1) / 2) * 1.1, z: (i - (nl - 1) / 2) * 1.1, v: v ?? 0, rotulo: `${spec.linhas[i][lang]} · ${spec.colunas[j][lang]}` })));
      return { celulas: cs, max: Math.max(...cs.map((c) => c.v)) };
    }
    if (spec.tipo === 'mapa') {
      const cs = Object.entries(spec.valores).filter(([uf]) => UF_XY[uf]).map(([uf, v]) => ({ x: (UF_XY[uf][0] - 3.5) * 1.1, z: (UF_XY[uf][1] - 4) * 1.1, v, rotulo: uf }));
      return { celulas: cs, max: Math.max(...cs.map((c) => c.v)) };
    }
    return { celulas: [] as Celula[], max: 1 };
  }, [spec, lang]);
  // Camera distance from the chart's footprint (bars and tiles grow with the data; the surface is fixed).
  const ext = spec.tipo === 'superficie' ? 7.5 : Math.max(6, ...celulas.map((c) => Math.max(Math.abs(c.x), Math.abs(c.z)) * 2 + 1.5));
  const leitura = sel !== null && celulas[sel]
    ? `${celulas[sel].rotulo}: ${fmt(celulas[sel].v, spec.tipo === 'superficie' ? 'dec' : spec.unidade, lang)}`
    : spec.tipo === 'superficie'
      ? `${spec.rotX[lang]} × ${spec.rotY[lang]} → ${spec.rotZ[lang]}`
      : lang === 'pt' ? 'Arraste para girar · passe o cursor numa barra' : 'Drag to orbit · hover a bar';
  return (
    <div className="mini3d">
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ fov: 35, position: [ext * 0.95, ext * 0.85 + 3, ext * 1.2] }} gl={{ antialias: true, powerPreference: 'low-power' }} role="img" aria-label={spec.aria[lang]}>
        <color attach="background" args={['#0c1328']} />
        <hemisphereLight args={['#dbe6ff', '#1a2140', 1.1]} />
        <directionalLight position={[5, 8, 4]} intensity={1.6} />
        {spec.tipo === 'superficie' ? <Superficie x={spec.x} y={spec.y} z={spec.z} /> : <Barras celulas={celulas} max={max} onSel={setSel} />}
        <OrbitControls target={[0, spec.tipo === 'superficie' ? 0.6 : 1.4, 0]} enablePan={false} enableZoom={false} maxPolarAngle={1.35} />
      </Canvas>
      <p className="mini3d-leitura" aria-live="polite">{leitura}</p>
    </div>
  );
}
