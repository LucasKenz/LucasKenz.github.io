import { describe, expect, it } from 'vitest';
import { profundidade, desfoque, distanciaImagem, lenteBiconvexa, tracar } from '../src/lab/lentes/optica';

// Independent check: instead of the closed-form object-space formula, find the distances where
// the blur circle equals c using image-space geometry (lens equation + similar triangles)
// and bisection. Both must agree within 2%.
function limiteImagem(f: number, N: number, s: number, c: number, lado: 'perto' | 'longe') {
  const v = (d: number) => (f * d) / (d - f);
  const A = f / N; // aperture diameter
  const blur = (d: number) => (A * Math.abs(v(d) - v(s))) / v(d);
  let lo = lado === 'perto' ? f * 1.001 : s;
  let hi = lado === 'perto' ? s : 1e9;
  if (lado === 'longe' && blur(hi) < c) return Infinity;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    const dentro = blur(m) < c;
    if (lado === 'perto') dentro ? (hi = m) : (lo = m);
    else dentro ? (lo = m) : (hi = m);
  }
  return (lo + hi) / 2;
}

const casos = [
  { f: 50, N: 2.8, s: 3000 },
  { f: 50, N: 8, s: 3000 },
  { f: 35, N: 5.6, s: 2000 },
  { f: 85, N: 1.8, s: 1500 },
  { f: 24, N: 11, s: 1000 },
].map((c) => ({ ...c, perto: limiteImagem(c.f, c.N, c.s, 0.03, 'perto'), longe: limiteImagem(c.f, c.N, c.s, 0.03, 'longe') }));

describe('profundidade de campo', () => {
  for (const c of casos) {
    it(`${c.f} mm f/${c.N} a ${c.s / 1000} m`, () => {
      const p = profundidade(c.f, c.N, c.s);
      expect(Math.abs(p.perto - c.perto) / c.perto).toBeLessThan(0.02);
      expect(Math.abs(p.longe - c.longe) / c.longe).toBeLessThan(0.02);
    });
  }
  it('além da hiperfocal o limite distante é infinito', () => {
    const p = profundidade(24, 11, 5000);
    expect(p.longe).toBe(Infinity);
  });
});

describe('desfoque', () => {
  it('é zero no plano de foco e cresce longe dele', () => {
    expect(desfoque(50, 2, 2000, 2000)).toBeCloseTo(0);
    expect(desfoque(50, 2, 2000, 6000)).toBeGreaterThan(desfoque(50, 2, 2000, 3000));
  });
  it('no limite da profundidade de campo vale o círculo de confusão', () => {
    const p = profundidade(50, 4, 3000);
    expect(desfoque(50, 4, 3000, p.perto)).toBeCloseTo(0.03, 3);
  });
});

describe('traçado de raios', () => {
  it('raios paralelos convergem perto do foco', () => {
    const f = 50;
    const L = { ...lenteBiconvexa(f), x0: 0 };
    const xs = L.espessura / 2 + distanciaImagem(f, Infinity);
    const alturas = [-5, -2, 2, 5].map((h) => tracar({ x: -100, y: h }, { x: 1, y: 0 }, L, xs)!.at(-1)!.y);
    for (const y of alturas) expect(Math.abs(y)).toBeLessThan(0.6);
  });
});
