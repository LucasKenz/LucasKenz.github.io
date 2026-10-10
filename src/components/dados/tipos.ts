// Chart specs for the data stories in /lab. Content files build these from the generated JSON;
// Grafico.astro renders them as static, accessible SVG at build time.
import type { T } from '@content/types';

export type Formato = 'int' | 'dec1' | 'dec2' | 'dec3' | 'pct0' | 'pct1' | 'pp' | 'bi' | 'mw' | 'reais' | 'texto';

export interface Serie { nome: T; valores: (number | null)[]; cor: string; tracejada?: boolean }

export type Grafico =
  | { tipo: 'linhas'; titulo: T; x: string[]; series: Serie[]; formato: Formato; marcas?: { i: number; rotulo: T }[]; aria: T; nota?: T; yMin?: number }
  | { tipo: 'barras'; titulo: T; itens: { rotulo: T | string; valores: (number | null)[] }[]; series: { nome: T; cor: string }[]; formato: Formato; aria: T; nota?: T; maxFixo?: number }
  | { tipo: 'dispersao'; titulo: T; pontos: { x: number; y: number; g: number }[]; grupos: { nome: T; cor: string }[]; eixoX: T; eixoY: T; formatoX: Formato; formatoY: Formato; logX?: boolean; curva?: { x: number; y: number }[]; aria: T; nota?: T }
  | { tipo: 'hist'; titulo: T; bordas: number[]; contagens: number[]; formato: Formato; marca?: { valor: number; rotulo: T }; cor: string; aria: T; nota?: T }
  | { tipo: 'tabela'; titulo?: T; colunas: T[]; linhas: (string | T)[][]; nota?: T }
  | { tipo: 'numeros'; itens: { valor: string; rotulo: T; medidor?: number }[]; nota?: T };

/** Technical sheet of one analysis: why it exists, what it predicts or measures, with what, how, and whether it got there. */
export interface Ficha {
  objetivo: T;
  porque: T; // motive: why this question matters and why this method
  alvo: T; // target variable
  preditoras: T; // predictors / explanatory variables
  metodo: T;
  metrica: T;
  validacao: T;
  atingido: T; // was the objective reached?
}

export interface SecaoHistoria { id: string; titulo: T; pergunta: T; decisao: T; resultado: T; fonte: string; graficos: Grafico[]; ficha?: Ficha }

export interface Historia {
  titulo: T;
  intro: T;
  aplicacao: T; // the real-world use, one paragraph
  kpis: { valor: string | T; rotulo: T }[];
  secoes: SecaoHistoria[];
  conclusoes: { titulo: T; itens: T[] };
  limites: T[]; // honest limitations
  metodo: string; // path of the analysis script
}
