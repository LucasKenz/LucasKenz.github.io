import * as THREE from 'three';

export type Camada = 'procedencia' | 'rota' | 'arvores';

// Categorical slots validated on the Lab navy surface (#0c1328) with the dataviz validator:
// blue / orange / aqua pass CVD all-pairs (worst ΔE 9.4). Neutral grey = "not used".
// Hazard yellow stays reserved for speed bumps, the Lab's signature.
export const COR = {
  medido: '#3987e5',
  assumido: '#d95926',
  lombada: '#ffc21a',
  faixa: '#d95926',
  longe: '#4a5578',
  perto: '#3987e5',
  carla: '#199e70',
  web: '#ffc21a',
};

// Diverging grade scale: blue (downhill) · grey (flat) · orange (uphill), clamped at ±6 %.
const desce = new THREE.Color('#3987e5');
const plano = new THREE.Color('#8a93ad');
const sobe = new THREE.Color('#d95926');
export function corRampa(pct: number) {
  const t = Math.max(-1, Math.min(1, pct / 6));
  return t >= 0 ? plano.clone().lerp(sobe, t) : plano.clone().lerp(desce, -t);
}

// Building fill: the categorical hue softened toward clay so the diorama reads as a model,
// still far apart (blue vs orange) for colour-blind readers. Legend uses the same value.
const argila = new THREE.Color('#e6e9f2');
export const corPredio = (medida: boolean) => `#${new THREE.Color(medida ? COR.medido : COR.assumido).lerp(argila, 0.3).getHexString()}`;
