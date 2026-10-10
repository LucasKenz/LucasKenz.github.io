import { useMemo } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, useFBO } from '@react-three/drei';
import * as THREE from 'three';

// Real 3D viewfinder: the scene is rendered with depth, then every pixel is blurred by its own
// circle of confusion, computed from its depth with the same thin-lens formula as optica.ts:
//   c = f² / (N (s − f)) · |d − s| / d      (mm on a 36 mm wide sensor)
// The blur radius in pixels is c / 36 mm × image width (gather with a 64-tap Vogel disc).

type Lang = 'pt' | 'en';
interface Props { f: number; N: number; s: number; lang: Lang }

const SENSOR = 36; // mm

function Copo() {
  const perfil = useMemo(() => [[0, 0], [0.038, 0], [0.041, 0.004], [0.043, 0.09], [0.04, 0.092], [0.037, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), []);
  return (
    <group position={[0.06, 0.74, -0.8]}> {/* 0.8 m from the camera, as in the cross-section */}
      <mesh castShadow>
        <latheGeometry args={[perfil, 40]} />
        <meshPhysicalMaterial color="#ef5b5b" roughness={0.25} clearcoat={1} />
      </mesh>
      <mesh position={[0.043, 0.048, 0]} rotation-z={-Math.PI / 2}>
        <torusGeometry args={[0.022, 0.006, 10, 24, Math.PI]} />
        <meshPhysicalMaterial color="#ef5b5b" roughness={0.25} clearcoat={1} />
      </mesh>
    </group>
  );
}

function Planta() {
  const folhas = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2, t: 0.35 + (i % 3) * 0.12 })), []);
  return (
    <group position={[-0.55, 0, -2]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.4, 24]} />
        <meshStandardMaterial color="#b5764a" roughness={0.8} />
      </mesh>
      {folhas.map((l, i) => (
        <mesh key={i} position={[Math.cos(l.a) * 0.12, 0.62 + l.t * 0.4, Math.sin(l.a) * 0.12]} rotation={[Math.sin(l.a) * l.t, 0, -Math.cos(l.a) * l.t]} scale={[0.07, 0.3, 0.035]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#2e9b62" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Sala() {
  return (
    <>
      {/* table */}
      <RoundedBox args={[1.6, 0.04, 0.9]} radius={0.015} position={[0, 0.72, -0.9]} receiveShadow castShadow>
        <meshStandardMaterial color="#5a3d2e" roughness={0.55} />
      </RoundedBox>
      {/* floor and back wall with a window at 8 m */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2f3f" roughness={0.9} />
      </mesh>
      <group position={[0, 0, -8]}>
        <mesh position={[0, 2, 0]} receiveShadow>
          <planeGeometry args={[14, 6]} />
          <meshStandardMaterial color="#d9dce6" roughness={0.9} />
        </mesh>
        <mesh position={[1.1, 1.9, 0.01]}>
          <planeGeometry args={[2.2, 1.7]} />
          <meshBasicMaterial color={[1.6, 2.0, 2.6]} toneMapped={false} />
        </mesh>
        <mesh position={[0.6, 2.35, 0.02]}>
          <circleGeometry args={[0.16, 32]} />
          <meshBasicMaterial color={[5, 4.2, 2.4]} toneMapped={false} />
        </mesh>
        {[[1.1, 1.9, 2.3, 0.08], [1.1, 1.9, 0.08, 1.8], [1.1, 2.79, 2.3, 0.08], [1.1, 1.01, 2.3, 0.08], [0.0, 1.9, 0.08, 1.8], [2.2, 1.9, 0.08, 1.8]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]}>
            <boxGeometry args={[w, h, 0.06]} />
            <meshStandardMaterial color="#f2f4f8" roughness={0.5} />
          </mesh>
        ))}
      </group>
      <Copo />
      <Planta />
    </>
  );
}

function Desfoque({ f, N, s }: Omit<Props, 'lang'>) {
  const { gl, size, camera } = useThree();
  const fbo = useFBO({ depthBuffer: true, depthTexture: new THREE.DepthTexture(size.width, size.height), type: THREE.HalfFloatType });
  const cena = useMemo(() => new THREE.Scene(), []);
  const orto = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tCor: { value: null }, tProf: { value: null }, uPerto: { value: 0.05 }, uLonge: { value: 40 },
          uF: { value: 50 }, uN: { value: 2 }, uS: { value: 2000 }, uLarg: { value: 800 }, uRes: { value: new THREE.Vector2() },
        },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: /* glsl */ `
          #include <packing>
          uniform sampler2D tCor; uniform sampler2D tProf; uniform float uPerto; uniform float uLonge;
          uniform float uF; uniform float uN; uniform float uS; uniform float uLarg; uniform vec2 uRes;
          varying vec2 vUv;
          float distMM(vec2 uv) {
            float z = texture2D(tProf, uv).x;
            return -perspectiveDepthToViewZ(z, uPerto, uLonge) * 1000.0;
          }
          // Circle of confusion (mm on the sensor) -> radius in pixels.
          float cocPx(float d) {
            float c = uS > 1e8 ? (uF * uF) / (uN * d) : (uF * uF) / (uN * (uS - uF)) * abs(d - uS) / d;
            return min(c / ${SENSOR.toFixed(1)} * uLarg * 0.5, 28.0);
          }
          void main() {
            float r0 = cocPx(distMM(vUv));
            vec3 soma = texture2D(tCor, vUv).rgb; float peso = 1.0;
            if (r0 > 0.5) {
              const int TAPS = 64;
              // Per-pixel rotation of the disc (interleaved gradient noise) hides the sampling pattern.
              float giro = 6.2831 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
              for (int i = 1; i < TAPS; i++) {
                float fi = float(i);
                float rr = sqrt(fi / float(TAPS)) * r0; // disc scaled to this pixel's own blur
                float a = fi * 2.39996323 + giro; // golden angle (Vogel disc)
                vec2 uv = vUv + vec2(cos(a), sin(a)) * rr / uRes;
                float rs = cocPx(distMM(uv));
                // Sharp neighbours do not leak into a blurred pixel (no halos around in-focus edges).
                float w = smoothstep(rr - 1.5, rr + 0.5, rs + 0.5);
                soma += texture2D(tCor, uv).rgb * w; peso += w;
              }
            }
            gl_FragColor = vec4(soma / peso, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  useFrame(({ scene }) => {
    const cam = camera as THREE.PerspectiveCamera;
    // Horizontal field of view of a 36 mm sensor behind focal length f.
    const hfov = 2 * Math.atan(SENSOR / 2 / f);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / cam.aspect));
    cam.near = 0.05;
    cam.far = 40;
    cam.updateProjectionMatrix();
    const u = mat.uniforms;
    u.uF.value = f; u.uN.value = N; u.uS.value = s === Infinity ? 1e9 : s;
    u.uLarg.value = size.width * gl.getPixelRatio(); u.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    u.tCor.value = fbo.texture; u.tProf.value = fbo.depthTexture;
    gl.setRenderTarget(fbo);
    gl.render(scene, cam);
    gl.setRenderTarget(null);
    gl.render(cena, orto);
  }, 1);
  return createPortal(
    <mesh frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>,
    cena,
  );
}

export default function Visor3D({ f, N, s, lang }: Props) {
  return (
    <div className="lentes-visor-3d">
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.84, 0], fov: 40, near: 0.05, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(0.05, 0.86, -2)}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}
      role="img"
      aria-label={lang === 'pt' ? 'Visor 3D da câmera com desfoque calculado pelo círculo de confusão' : '3D camera viewfinder with blur computed from the circle of confusion'}
    >
      <color attach="background" args={['#1a2238']} />
      <hemisphereLight args={['#dfe8ff', '#3a2a22', 0.8]} />
      <directionalLight position={[1.5, 3, -6]} intensity={2.4} color="#fff1dc" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0.3, 1.6, 0]} intensity={1.2} color="#ffd9a8" />
      <Sala />
      <Desfoque f={f} N={N} s={s} />
    </Canvas>
    </div>
  );
}
