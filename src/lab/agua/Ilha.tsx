import { useMemo } from 'react';
import * as THREE from 'three';
import { rng } from '../cidade/gerador';
import { fundoExato, uAgua } from './material';

// Island vegetation: instanced grass blades and shrubs seated on the exact seabed function,
// swaying with the wind slider in the vertex shader (no animation data, one draw call each).

const uVeg = { uTempo: uAgua.uTempo, uVento: uAgua.uVento, uSol: uAgua.uSol };

const ventoGLSL = /* glsl */ `
  uniform float uTempo; uniform float uVento;
  // Bend grows with height squared; gusts travel across the island as a moving wave.
  vec3 balanco(vec3 base, float h) {
    float rajada = sin(dot(base.xz, vec2(0.21, 0.13)) - uTempo * 1.6) * 0.5 + 0.5;
    float tremor = sin(uTempo * 5.3 + base.x * 1.7 + base.z * 2.3) * 0.25;
    float k = (0.12 + 0.28 * rajada + tremor * 0.1) * uVento * h * h;
    return vec3(k, -k * 0.35, k * 0.4);
  }
`;

function capim() {
  // One blade: tapered strip of 3 segments, height 1 (scaled per instance).
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], alt: number[] = [];
  const segs = 3;
  for (let i = 0; i <= segs; i++) {
    const v = i / segs, w = 0.13 * (1 - v * 0.85);
    pos.push(-w, v, 0, w, v, 0);
    alt.push(v, v);
  }
  const idx: number[] = [];
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('altura', new THREE.Float32BufferAttribute(alt, 1));
  g.setIndex(idx);
  return g;
}

function lugares(n: number, semente: number, minH: number) {
  const r = rng(semente);
  const out: [number, number, number, number, number][] = [];
  let tent = 0;
  while (out.length < n && tent++ < n * 40) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 15;
    const x = 26 + Math.cos(a) * d, z = -30 + Math.sin(a) * d;
    const y = fundoExato(x, z);
    if (y < minH) continue;
    out.push([x, y, z, r(), r()]);
  }
  return out;
}

function Capim({ n }: { n: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: uVeg,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          ${ventoGLSL}
          attribute float altura;
          varying float vH; varying float vTom;
          void main() {
            vec4 b = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec4 p = instanceMatrix * vec4(position, 1.0);
            p.xyz += balanco(b.xyz, altura) * 0.6;
            vH = altura; vTom = fract(b.x * 3.1 + b.z * 1.7);
            gl_Position = projectionMatrix * viewMatrix * p;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSol;
          varying float vH; varying float vTom;
          void main() {
            vec3 raiz = vec3(0.10, 0.22, 0.07), ponta = mix(vec3(0.36, 0.52, 0.16), vec3(0.55, 0.58, 0.24), vTom);
            vec3 cor = mix(raiz, ponta, vH) * (0.75 + 0.45 * uSol.y);
            gl_FragColor = vec4(cor, 1.0);
          }`,
      }),
    [],
  );
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(capim(), mat, n);
    const o = new THREE.Object3D();
    lugares(n, 21, 1.55).forEach(([x, y, z, r1, r2], i) => {
      o.position.set(x, y - 0.05, z);
      o.rotation.set(0, r1 * Math.PI, (r2 - 0.5) * 0.4);
      o.scale.set(1, 0.6 + r2 * 0.9, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.frustumCulled = false;
    return m;
  }, [n, mat]);
  return <primitive object={mesh} />;
}

/** Round shrubs: noisy icosahedra whose vertices sway with the same wind field. */
function Arbustos({ n }: { n: number }) {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position, r = rng(5);
    for (let i = 0; i < p.count; i++) { const k = 0.85 + r() * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#4d7a32', roughness: 0.85 });
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, { uTempo: uAgua.uTempo, uVento: uAgua.uVento });
      s.vertexShader = s.vertexShader
        .replace('#include <common>', `#include <common>\n${ventoGLSL}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n vec3 bw = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz; transformed += balanco(bw, clamp(position.y + 0.6, 0.0, 1.6)) * 0.25;`);
    };
    return m;
  }, []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    const o = new THREE.Object3D(), c = new THREE.Color();
    lugares(n, 77, 1.7).forEach(([x, y, z, r1, r2], i) => {
      const s = 0.4 + r1 * 0.6;
      o.position.set(x, y + s * 0.35, z);
      o.rotation.set(0, r2 * 6, 0);
      o.scale.setScalar(s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.setHSL(0.25 + r2 * 0.06, 0.45, 0.28 + r1 * 0.12));
    });
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [geo, mat, n]);
  return <primitive object={mesh} />;
}

export function Ilha({ leve }: { leve: boolean }) {
  return (
    <>
      <Capim n={leve ? 1800 : 7000} />
      <Arbustos n={leve ? 22 : 46} />
    </>
  );
}
