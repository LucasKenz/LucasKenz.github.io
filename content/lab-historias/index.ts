import type { Historia } from '../../src/components/dados/tipos';
import { banco } from './banco';
import { energia } from './energia';
import { farma } from './farma';
import { fichas } from './fichas';
import { seguros } from './seguros';

const comFichas = (slug: string, h: Historia): Historia => ({ ...h, secoes: h.secoes.map((s) => ({ ...s, ficha: fichas[slug]?.[s.id] })) });

/** Data stories rendered under the Lab scene, by Lab slug (each section carries its technical sheet). */
export const historias: Record<string, Historia> = {
  seguros: comFichas('seguros', seguros),
  banco: comFichas('banco', banco),
  farma: comFichas('farma', farma),
  energia: comFichas('energia', energia),
};
