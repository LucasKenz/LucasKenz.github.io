import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

// Procedural lateen-rigged boat (original design). Units: metres, bow = +z.
const L = 6.2;
const W = 1.15;
const D = 0.55;

function casco() {
  const NS = 48; // stations along the length
  const NV = 24; // points across each section
  const pos: number[] = [];
  const cor: number[] = [];
  const branco = new THREE.Color('#f4f1ea');
  const azul = new THREE.Color('#2f5bea');
  const vermelho = new THREE.Color('#b8432f');
  const madeira = new THREE.Color('#8a5a35');
  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    const z = (u - 0.5) * L;
    const w = W * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.62);
    const d = D * (0.7 + 0.3 * Math.sin(Math.PI * u));
    const g = 0.32 + 0.42 * Math.pow(u, 3);
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1;
      const th = (v * Math.PI) / 2;
      const x = w * Math.sin(th);
      const y = g - (g + d) * Math.pow(Math.cos(th), 1.5);
      pos.push(x, y, z);
      const c = y > g - 0.05 ? madeira : y > g - 0.2 ? azul : y < -0.18 ? vermelho : branco;
      cor.push(c.r, c.g, c.b);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < NS; i++)
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function convés() {
  // Deck outline from the gunwale, slightly below it.
  const s = new THREE.Shape();
  const NS = 40;
  const pts: [number, number][] = [];
  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    const w = W * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.62) * 0.94;
    pts.push([w, (u - 0.5) * L]);
  }
  s.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(([x, z]) => s.lineTo(x, z));
  [...pts].reverse().forEach(([x, z]) => s.lineTo(-x, z));
  const geo = new THREE.ShapeGeometry(s, 1);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function texturaMadeira() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 256; x += 32) {
    const tom = 120 + Math.floor(Math.random() * 30);
    g.fillStyle = `rgb(${tom + 40},${tom},${tom - 45})`;
    g.fillRect(x, 0, 32, 512);
    g.fillStyle = 'rgba(40,25,15,0.55)';
    g.fillRect(x, 0, 2, 512);
    g.strokeStyle = 'rgba(70,45,25,0.25)';
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 4 + Math.random() * 24, 0); g.bezierCurveTo(x + Math.random() * 32, 170, x + Math.random() * 32, 340, x + 4 + Math.random() * 24, 512); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.35, 0.18);
  return t;
}

function texturaVela() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3ead7';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(150,130,100,0.35)';
  g.lineWidth = 2;
  for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(i * 57, 0); g.lineTo(i * 57 + 40, 512); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Triangular sail with a belly; a, b, c are the tack, peak and clew. */
function vela(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, barriga: number) {
  const N = 18;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const linha = (i: number) => (i * (i + 1)) / 2;
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= i; j++) {
      const s = i / N, t = i === 0 ? 0 : j / i;
      // Point on triangle: from tack toward the peak-clew edge.
      const p = a.clone().lerp(b.clone().lerp(c, t), s);
      const bulge = barriga * Math.sin(Math.PI * s) * Math.sin(Math.PI * Math.max(t, 0.001)) * (1 - s * 0.3);
      p.x += bulge;
      pos.push(p.x, p.y, p.z);
      uv.push(s, t);
    }
  for (let i = 0; i < N; i++)
    for (let j = 0; j <= i; j++) {
      const p0 = linha(i) + j, p1 = linha(i + 1) + j, p2 = linha(i + 1) + j + 1;
      idx.push(p0, p1, p2);
      if (j < i) idx.push(p0, p2, p0 + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Rope with catenary-like sag between two points (boat frame). */
function corda(a: THREE.Vector3, b: THREE.Vector3, folga: number, raio = 0.014) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return a.clone().lerp(b, t).add(new THREE.Vector3(0, -folga * 4 * t * (1 - t), 0));
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, raio, 5, false);
}

/** Oar: loom + blade, resting along the gunwale. */
function Remo({ lado }: { lado: 1 | -1 }) {
  return (
    <group position={[lado * 0.78, 0.5, -0.2]} rotation={[0.06, 0, lado * -0.12]}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 3.4, 8]} />
        <meshStandardMaterial color="#b88a5a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, -1.85]} castShadow>
        <boxGeometry args={[0.02, 0.17, 0.62]} />
        <meshStandardMaterial color="#2f5bea" roughness={0.45} />
      </mesh>
      {/* oarlock */}
      <mesh position={[lado * 0.02, -0.04, 0.4]}>
        <torusGeometry args={[0.05, 0.012, 6, 14]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

export const Barco = forwardRef<THREE.Group, { vento: number }>(function Barco({ vento }, ref) {
  const geos = useMemo(() => ({ casco: casco(), convés: convés(), madeira: texturaMadeira(), lona: texturaVela() }), []);
  const geoVela = useMemo(
    () => vela(new THREE.Vector3(0, 0.95, 2.55), new THREE.Vector3(0, 6.4, -2.4), new THREE.Vector3(0, 0.75, -2.75), 0.35 + vento * 0.35),
    [vento],
  );
  const verga = useMemo(() => {
    const a = new THREE.Vector3(0, 0.95, 2.55), b = new THREE.Vector3(0, 6.4, -2.4);
    const meio = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { meio, q, len: a.distanceTo(b) + 0.4 };
  }, []);
  const azul = '#2f5bea';
  // Rigging follows the sail angle: the sheet runs from the clew to a cleat at the stern,
  // the forestay from the masthead to the bow. Points are in the boat frame.
  const giro = -0.28 - vento * 0.12;
  const cordas = useMemo(() => {
    const noBarco = (v: THREE.Vector3) => v.clone().add(new THREE.Vector3(0, 0, -0.9)).applyAxisAngle(new THREE.Vector3(0, 1, 0), giro).add(new THREE.Vector3(0, 0, 0.9));
    const punho = noBarco(new THREE.Vector3(0, 0.75, -2.75));
    const topo = noBarco(new THREE.Vector3(0, 3.0, 0.9));
    return [
      corda(punho, new THREE.Vector3(0.45, 0.48, -2.85), 0.12 * (1.4 - vento * 0.5)),
      corda(topo, new THREE.Vector3(0, 0.55, 3.0), 0.04),
      corda(topo, new THREE.Vector3(0.95, 0.5, 0.6), 0.03, 0.01),
      corda(topo, new THREE.Vector3(-0.95, 0.5, 0.6), 0.03, 0.01),
    ];
  }, [giro, vento]);
  return (
    <group ref={ref}>
      <mesh geometry={geos.casco} castShadow receiveShadow>
        <meshPhysicalMaterial vertexColors roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geos.convés} position-y={0.22} receiveShadow>
        <meshStandardMaterial map={geos.madeira} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* benches */}
      {[-1.2, 0.2, 1.4].map((z) => (
        <mesh key={z} position={[0, 0.42, z]} castShadow receiveShadow>
          <boxGeometry args={[1.6 * Math.sin(Math.PI * (0.1 + 0.9 * (z / L + 0.5))) ** 0.62, 0.07, 0.34]} />
          <meshStandardMaterial color={azul} roughness={0.5} />
        </mesh>
      ))}
      {/* rope coil and a crate */}
      <mesh position={[0.35, 0.3, -2.0]} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.18, 0.05, 10, 28]} />
        <meshStandardMaterial color="#c9b18a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.35, 0.36, -1.9]} castShadow>
        <boxGeometry args={[0.36, 0.3, 0.36]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.8} />
      </mesh>
      {cordas.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color="#d8c7a3" roughness={0.9} />
        </mesh>
      ))}
      <Remo lado={1} />
      <Remo lado={-1} />
      {/* mast, yard and sail rotate together with the wind */}
      <group position={[0, 0, 0.9]} rotation-y={-0.28 - vento * 0.12}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 3.0, 12]} />
          <meshStandardMaterial color="#7a4f2c" roughness={0.6} />
        </mesh>
        <group position={[0, 0, -0.9]}>
          <mesh position={verga.meio} quaternion={verga.q} castShadow>
            <cylinderGeometry args={[0.045, 0.045, verga.len, 10]} />
            <meshStandardMaterial color="#7a4f2c" roughness={0.6} />
          </mesh>
          <mesh geometry={geoVela} castShadow>
            <meshStandardMaterial map={geos.lona} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
});
