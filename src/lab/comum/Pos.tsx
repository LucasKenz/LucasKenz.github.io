import { useEffect, useState, type ReactNode, type JSX } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping, Vignette, Noise } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import type * as THREE from 'three';

export type Qualidade = 0 | 1 | 2; // 0 = light, 1 = medium, 2 = full

interface Props {
  qualidade: Qualidade;
  bloom?: { intensidade: number; limiar: number };
  ao?: boolean;
  dof?: { alvo: THREE.Vector3; escala?: number; distancia?: number };
  vinheta?: number;
  grao?: boolean;
}

/** Shared cinematic look: AO, bloom, depth of field, ACES, vignette and fine grain.
 *  Each effect drops out as the adaptive quality goes down. */
export function Pos({ qualidade, bloom = { intensidade: 0.9, limiar: 0.95 }, ao, dof, vinheta = 0.55, grao = true }: Props) {
  const efeitos = [
    ao && qualidade >= 1 ? <N8AO key="ao" aoRadius={0.7} intensity={1.6} distanceFalloff={0.5} aoSamples={qualidade === 2 ? 16 : 8} denoiseSamples={8} denoiseRadius={10} halfRes={qualidade < 2} /> : null,
    dof && qualidade === 2 ? <DepthOfField key="dof" target={dof.alvo} focalLength={dof.distancia ?? 0.05} bokehScale={dof.escala ?? 3} /> : null,
    <Bloom key="bloom" mipmapBlur intensity={bloom.intensidade} luminanceThreshold={bloom.limiar} luminanceSmoothing={0.2} radius={0.75} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
    <Vignette key="vin" offset={0.3} darkness={vinheta} />,
    grao ? <Noise key="grao" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} /> : null,
    <SMAA key="smaa" />,
  ].filter((e): e is JSX.Element => e !== null);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {efeitos}
    </EffectComposer>
  );
}

export type Modo = 'visual' | 'leve';
export function useModo(): Modo {
  const [m, setM] = useState<Modo>('visual');
  useEffect(() => { if (new URLSearchParams(location.search).get('modo') === 'leve') setM('leve'); }, []);
  return m;
}

/** Adaptive quality: starts high on desktop, steps down when fps drops (and back up). */
export function useQualidade(celular: boolean) {
  const [q, setQ] = useState<Qualidade>(celular ? 1 : 2);
  const [dpr, setDpr] = useState(celular ? 1 : 1.25);
  // ?q=0|1|2 locks the quality (used for captures and for testing weak devices).
  const [travada, setTravada] = useState(false);
  useEffect(() => {
    const v = new URLSearchParams(location.search).get('q');
    if (v === '0' || v === '1' || v === '2') { setQ(Number(v) as Qualidade); setTravada(true); }
  }, []);
  const monitor = (children?: ReactNode) => travada ? <>{children}</> : (
    <PerformanceMonitor
      bounds={() => [45, 58]}
      flipflops={3}
      onDecline={() => { setQ((x) => (x > 0 ? ((x - 1) as Qualidade) : x)); setDpr((d) => Math.max(1, d - 0.25)); }}
      onIncline={() => { setQ((x) => (x < 2 && !celular ? ((x + 1) as Qualidade) : x)); setDpr((d) => Math.min(celular ? 1.5 : 2, d + 0.25)); }}
    >
      {children}
    </PerformanceMonitor>
  );
  return { qualidade: q, dpr, monitor };
}

/** Pixel ratio applied from inside the Canvas. */
export function Dpr({ valor }: { valor: number }) {
  const set = useThree((s) => s.setDpr);
  useEffect(() => set(valor), [set, valor]);
  return null;
}
