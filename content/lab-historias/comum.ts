// Helpers shared by the Lab data stories: bilingual number formatting and the chart palette
// (blue/orange/aqua/amber/magenta, validated on the Lab navy surface).
export const COR = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
export const CINZA = '#4a5578';

const num = (v: number, k: number, loc: string) => v.toLocaleString(loc, { minimumFractionDigits: k, maximumFractionDigits: k });
/** Same number formatted for both languages: f(12.345, 1) -> { pt: '12,3', en: '12.3' } */
export const f = (v: number, k = 1) => ({ pt: num(v, k, 'pt-BR'), en: num(v, k, 'en-US') });
export const pct = (v: number, k = 1) => ({ pt: `${num(v * 100, k, 'pt-BR')} %`, en: `${num(v * 100, k, 'en-US')}%` });
