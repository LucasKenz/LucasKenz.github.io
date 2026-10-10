import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

/** Hidden FPS meter: only active with ?debug in the URL. Reports through a callback. */
export function MedidorFps({ onFps }: { onFps: (fps: number) => void }) {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt;
    acc.current.n++;
    if (acc.current.t >= 0.5) {
      onFps(Math.round(acc.current.n / acc.current.t));
      acc.current = { t: 0, n: 0 };
    }
  });
  return null;
}

export function useDebug() {
  const [debug, setDebug] = useState(false);
  useEffect(() => setDebug(new URLSearchParams(location.search).has('debug')), []);
  return debug;
}

export function useMenosMovimento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    setMenos(m.matches);
    const f = () => setMenos(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return menos;
}

export function useCelular() {
  const [cel, setCel] = useState(false);
  useEffect(() => setCel(matchMedia('(pointer: coarse)').matches || innerWidth < 700), []);
  return cel;
}
