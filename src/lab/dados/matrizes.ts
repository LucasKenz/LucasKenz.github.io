// One value matrix per data project, for the 3D bar field. Each loader imports only its own JSON.
type T = { pt: string; en: string };
export interface Matriz {
  linhas: T[]; // rows (z axis)
  colunas: string[]; // columns (x axis)
  valores: (number | null)[][];
  unidade: (v: number, lang: 'pt' | 'en') => string;
  titulo: T;
  eixos: T; // "rows × columns" description
  base?: number; // value at height zero (default 0); set above zero when the variation matters more than the level
}
const n = (v: number, k: number, lang: 'pt' | 'en') => v.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: k, maximumFractionDigits: k });
const MESES = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

export const matrizes: Record<string, () => Promise<Matriz>> = {
  energia: async () => {
    const d = (await import('@content/lab-dados/energia.json')).default;
    return {
      linhas: d.superficie.meses.map((m) => ({ pt: MESES.pt[m - 1], en: MESES.en[m - 1] })),
      colunas: Array.from({ length: 24 }, (_, i) => `${i}h`),
      valores: d.superficie.valores,
      unidade: (v, l) => `${n(v / 1000, 1, l)} GW`,
      base: Math.min(...d.superficie.valores.flat()) * 0.9,
      titulo: { pt: 'Carga média em dias úteis, 2025', en: 'Mean load on working days, 2025' },
      eixos: { pt: 'mês × hora do dia', en: 'month × hour of day' },
    };
  },
  seguros: async () => {
    const d = (await import('@content/lab-dados/seguros.json')).default;
    const en = d.familiasEn as Record<string, string>;
    return {
      linhas: d.familias.map((f) => ({ pt: f, en: en[f] })),
      colunas: d.anos.map(String),
      valores: d.familias.map((f) => (d.mercado as Record<string, { sinistralidade: (number | null)[] }>)[f].sinistralidade),
      unidade: (v, l) => `${n(v * 100, 0, l)} %`,
      titulo: { pt: 'Sinistralidade por ramo e ano', en: 'Loss ratio by line and year' },
      eixos: { pt: 'família de ramos × ano', en: 'line family × year' },
    };
  },
  banco: async () => {
    const d = (await import('@content/lab-dados/banco.json')).default;
    const anos = [...new Set(d.meses.map((m) => m.slice(0, 4)))];
    const seg: [string, T][] = [['PF total', { pt: 'Pessoa física', en: 'Households' }], ['MPMe', { pt: 'Empresas MPMe', en: 'SMEs' }], ['PJ total', { pt: 'Empresas (total)', en: 'Companies (total)' }], ['Grande', { pt: 'Grandes empresas', en: 'Large companies' }]];
    const h = d.historico as Record<string, (number | null)[]>;
    return {
      linhas: seg.map((s) => s[1]),
      colunas: anos,
      valores: seg.map(([k]) => anos.map((a) => {
        const v = h[k].filter((_, i) => d.meses[i].startsWith(a)).filter((x): x is number => x !== null);
        return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
      })),
      unidade: (v, l) => `${n(v, 2, l)} %`,
      titulo: { pt: 'Inadimplência média anual', en: 'Mean annual delinquency' },
      eixos: { pt: 'segmento × ano', en: 'segment × year' },
    };
  },
  farma: async () => {
    const d = (await import('@content/lab-dados/farma.json')).default;
    const it = d.demanda.sazonal!.itens.slice(0, 10);
    const nome = (s: string) => s.toLowerCase().replace(/ (tri|di)-hidratada/g, '').replace(/^\w/, (c) => c.toUpperCase());
    return {
      linhas: it.map((x) => ({ pt: nome(x.pa), en: nome(x.pa) })),
      colunas: ['jan', 'jul'],
      valores: it.map((x) => [x.jan, x.jul]),
      unidade: (v, l) => `${n(v / 1000, 0, l)} mil un.`.replace('mil un.', l === 'pt' ? 'mil un.' : 'k units'),
      titulo: { pt: 'Antimicrobianos: unidades vendidas em janeiro e julho de 2026', en: 'Antimicrobials: units sold in January and July 2026' },
      eixos: { pt: 'substância × mês', en: 'substance × month' },
    };
  },
};
