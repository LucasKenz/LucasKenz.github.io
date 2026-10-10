import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '../cidade/gerador';
import { uAgua } from './material';

// Seagulls as boids (Reynolds 1987): separation, alignment and cohesion, plus a pull toward a
// point that circles the island and a soft floor/ceiling. Wings flap in the vertex shader.

const N = 16;
const RAIO_VIZ = 9;
const VEL = 7.5;

function gaivota() {
  // Body + two wings in one geometry; attribute `asa` = 0 body, ±1 wing tip side.
  const p: number[] = [], asa: number[] = [];
  const tri = (a: number[], b: number[], c: number[], s: number[]) => { p.push(...a, ...b, ...c); asa.push(...s); };
  tri([0, 0, 0.55], [-0.09, 0, -0.35], [0.09, 0, -0.35], [0, 0, 0]);
  tri([0.05, 0, 0.18], [0.05, 0, -0.14], [0.62, 0.05, -0.05], [0, 0, 0.6]);
  tri([0.62, 0.05, -0.05], [0.05, 0, -0.14], [1.05, -0.02, -0.22], [0.6, 0, 1]);
  tri([-0.05, 0, 0.18], [-0.62, 0.05, -0.05], [-0.05, 0, -0.14], [0, -0.6, 0]);
  tri([-0.62, 0.05, -0.05], [-1.05, -0.02, -0.22], [-0.05, 0, -0.14], [-0.6, -1, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('asa', new THREE.Float32BufferAttribute(asa, 1));
  g.computeVertexNormals();
  return g;
}

export function Passaros({ pausado }: { pausado: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bando = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: N }, () => ({
      p: new THREE.Vector3(26 + (r() - 0.5) * 20, 9 + r() * 5, -30 + (r() - 0.5) * 20),
      v: new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar(VEL),
      fase: r() * 6.28,
    }));
  }, []);
  const geo = useMemo(() => {
    const g = gaivota();
    g.setAttribute('fase', new THREE.InstancedBufferAttribute(new Float32Array(bando.map((b) => b.fase)), 1));
    return g;
  }, [bando]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.8, side: THREE.DoubleSide });
    m.onBeforeCompile = (s) => {
      s.uniforms.uTempo = uAgua.uTempo;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTempo; attribute float asa; attribute float fase;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(uTempo * 9.0 + fase) * abs(asa) * 0.38;');
    };
    return m;
  }, []);
  const tmp = useMemo(() => ({ sep: new THREE.Vector3(), ali: new THREE.Vector3(), coe: new THREE.Vector3(), d: new THREE.Vector3(), alvo: new THREE.Vector3(), o: new THREE.Object3D() }), []);

  useFrame((_, dtBruto) => {
    const dt = pausado ? 0 : Math.min(dtBruto, 1 / 30);
    const t = uAgua.uTempo.value;
    tmp.alvo.set(26 + Math.cos(t * 0.12) * 22, 11 + Math.sin(t * 0.3) * 2, -30 + Math.sin(t * 0.12) * 22);
    for (const b of bando) {
      tmp.sep.set(0, 0, 0); tmp.ali.set(0, 0, 0); tmp.coe.set(0, 0, 0);
      let n = 0;
      for (const c of bando) {
        if (c === b) continue;
        tmp.d.subVectors(b.p, c.p);
        const dist = tmp.d.length();
        if (dist > RAIO_VIZ) continue;
        n++;
        tmp.sep.addScaledVector(tmp.d, 1 / Math.max(dist * dist, 0.3));
        tmp.ali.add(c.v);
        tmp.coe.add(c.p);
      }
      const acc = tmp.d.set(0, 0, 0);
      if (n) {
        acc.addScaledVector(tmp.sep, 6);
        acc.addScaledVector(tmp.ali.divideScalar(n).sub(b.v), 0.8);
        acc.addScaledVector(tmp.coe.divideScalar(n).sub(b.p), 0.35);
      }
      acc.addScaledVector(tmp.coe.subVectors(tmp.alvo, b.p), 0.25);
      acc.y += (b.p.y < 6 ? 6 - b.p.y : 0) * 2 - (b.p.y > 18 ? b.p.y - 18 : 0) * 2;
      b.v.addScaledVector(acc, dt);
      const vel = b.v.length();
      b.v.multiplyScalar(THREE.MathUtils.clamp(vel, VEL * 0.6, VEL * 1.3) / Math.max(vel, 1e-3));
      b.p.addScaledVector(b.v, dt);
    }
    const m = ref.current!;
    bando.forEach((b, i) => {
      tmp.o.position.copy(b.p);
      tmp.o.lookAt(tmp.d.copy(b.p).add(b.v));
      tmp.o.rotateZ(-b.v.x * 0.03); // slight bank
      tmp.o.updateMatrix();
      m.setMatrixAt(i, tmp.o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, N]} castShadow frustumCulled={false} />;
}
