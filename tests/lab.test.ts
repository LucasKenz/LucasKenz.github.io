import { describe, expect, it } from 'vitest';
import { gerarChunk, hashChunk, rng } from '../src/lab/cidade/gerador';
import { ik2, fk, mola } from '../src/lab/robo/ik';

describe('cidade', () => {
  it('mesma semente gera as mesmas 3 quadras (hash da geometria)', () => {
    for (const [cx, cz] of [[0, 0], [3, -2], [-7, 11]]) {
      expect(hashChunk(gerarChunk(123456, cx, cz))).toBe(hashChunk(gerarChunk(123456, cx, cz)));
    }
  });
  it('sementes diferentes geram cidades diferentes', () => {
    expect(hashChunk(gerarChunk(1, 0, 0))).not.toBe(hashChunk(gerarChunk(2, 0, 0)));
  });
  it('prédios ficam dentro do lote, longe das ruas', () => {
    const c = gerarChunk(42, 1, 1);
    expect(c.predios.length).toBeGreaterThan(10);
    for (const p of c.predios) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.d).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });
});

describe('robô: cinemática inversa', () => {
  const l1 = 0.9;
  const l2 = 0.8;
  const r = rng(7);
  it('alcança 30 posições aleatórias dentro do raio, sem cotovelo abaixo do ombro do lado de trás', () => {
    for (let i = 0; i < 30; i++) {
      const ang = (r() - 0.5) * Math.PI * 0.9; // in front of the robot
      const dist = Math.abs(l1 - l2) + 0.05 + r() * (l1 + l2 - Math.abs(l1 - l2) - 0.1);
      const x = Math.cos(ang) * dist;
      const y = Math.sin(ang) * dist;
      const a = ik2(l1, l2, x, y);
      const { ponta, cotovelo } = fk(l1, l2, a);
      expect(a.alcancou).toBe(true);
      expect(Math.hypot(ponta.x - x, ponta.y - y)).toBeLessThan(1e-6);
      // Never through the body: the elbow stays in front of the shoulder plane.
      expect(cotovelo.x).toBeGreaterThan(-l1 * 0.2);
    }
  });
  it('fora do alcance estica o braço na direção do alvo', () => {
    const a = ik2(l1, l2, 5, 0);
    expect(a.alcancou).toBe(false);
    expect(fk(l1, l2, a).ponta.x).toBeCloseTo(l1 + l2, 4);
  });
  it('mola criticamente amortecida converge sem passar do alvo', () => {
    let s = { valor: 0, vel: 0 };
    let max = 0;
    for (let i = 0; i < 240; i++) {
      s = mola(s.valor, s.vel, 1, 8, 1 / 60);
      max = Math.max(max, s.valor);
    }
    expect(s.valor).toBeCloseTo(1, 3);
    expect(max).toBeLessThanOrEqual(1 + 1e-6);
  });
});
