import d from '../lab-dados/seguros.json';
import type { Historia } from '../../src/components/dados/tipos';
import { COR, f, pct } from './comum';

// Commercial P&C lines (SUSEP): market, loss ratios, concentration and Bühlmann-Straub credibility.
const F = d.familias as string[];
const nomeFam = (x: string) => ({ pt: x, en: (d.familiasEn as Record<string, string>)[x] });
const m = d.mercado as Record<string, { premio: number[]; sinistralidade: number[]; comissao: number[]; crescimento: number; sinMedia: number; sinDesvio: number; k?: number }>;
const anos = (d.anos as number[]).map(String);
const bt = d.backtest;
const ganho = 1 - bt.geral.credibilidade / bt.geral.mercado;
const maisVolatil = [...F].sort((a, b) => m[b].sinDesvio - m[a].sinDesvio)[0];
const menosVolatil = [...F].sort((a, b) => m[a].sinDesvio - m[b].sinDesvio)[0];
const cresceMais = [...F].sort((a, b) => m[b].crescimento - m[a].crescimento)[0];
const iPico = m.Responsabilidades.sinistralidade.indexOf(Math.max(...m.Responsabilidades.sinistralidade));
const curva = d.credibilidade as { familia: string; premio: number; Z: number }[];
const zMeio = (fam: string) => m[fam].k ?? 0; // premium (R$ mi) at which Z = 0.5

export const seguros: Historia = {
  titulo: { pt: 'Seguros empresariais em dados', en: 'Commercial insurance in data' },
  intro: {
    pt: 'Transporte de carga, responsabilidade civil, patrimonial de empresas, riscos de engenharia e garantia: os ramos de uma seguradora focada em empresas. Com a base pública da SUSEP, esta análise mede o tamanho e o risco de cada ramo e testa um modelo atuarial clássico para prever a sinistralidade de cada seguradora no ano seguinte.',
    en: 'Cargo, liability, commercial property, engineering and surety: the lines of an insurer focused on businesses. Using SUSEP’s public database, this analysis sizes each line, measures its risk and tests a classic actuarial model to forecast each insurer’s loss ratio for the following year.',
  },
  aplicacao: {
    pt: 'Precificação e subscrição: quanto confiar no histórico da própria carteira e quanto no do mercado ao definir a taxa de um ramo, principalmente numa carteira pequena ou que está começando.',
    en: 'Pricing and underwriting: how much to trust the book’s own history versus the market’s when setting a line’s rate, especially for a small or new book.',
  },
  kpis: [
    { valor: { pt: `R$ ${f(d.totais.premio2025, 1).pt} bi`, en: `R$ ${f(d.totais.premio2025, 1).en} bn` }, rotulo: { pt: 'prêmio direto em 2025 nos 5 ramos', en: 'direct premium in 2025 across the 5 lines' } },
    { valor: String(d.totais.seguradoras), rotulo: { pt: 'seguradoras com prêmio em 2025', en: 'insurers writing premium in 2025' } },
    { valor: f(d.totais.linhas, 0), rotulo: { pt: 'linhas mensais analisadas (2016–2025)', en: 'monthly rows analysed (2016–2025)' } },
    { valor: String(bt.casos), rotulo: { pt: 'previsões testadas fora da amostra', en: 'out-of-sample forecasts tested' } },
  ],
  secoes: [
    {
      id: 'mercado',
      titulo: { pt: 'Quanto cada ramo vale e quanto cresce', en: 'How big each line is and how fast it grows' },
      pergunta: { pt: 'Onde está o volume de prêmio e qual ramo cresce mais rápido?', en: 'Where is the premium volume and which line grows fastest?' },
      decisao: {
        pt: 'Agrupei 21 códigos de ramo da SUSEP em 5 famílias que uma seguradora empresarial vende juntas. Deixei de fora o ramo 0171 (Riscos Diversos): ele mistura produtos de consumo, como celular, e inflaria o "patrimonial".',
        en: 'I grouped 21 SUSEP line codes into 5 families a commercial insurer sells together. Line 0171 (Miscellaneous Risks) was left out: it mixes consumer products such as phones and would inflate "property".',
      },
      resultado: {
        pt: `O patrimonial empresarial é o maior (R$ ${f(m['Patrimonial empresarial'].premio.at(-1)!, 1).pt} bi em 2025). ${nomeFam(cresceMais).pt} cresce mais rápido: ${pct(m[cresceMais].crescimento, 1).pt} ao ano desde 2016, em termos nominais.`,
        en: `Commercial property is the largest (R$ ${f(m['Patrimonial empresarial'].premio.at(-1)!, 1).en} bn in 2025). ${nomeFam(cresceMais).en} grows fastest: ${pct(m[cresceMais].crescimento, 1).en} a year since 2016, in nominal terms.`,
      },
      fonte: 'SUSEP · Ses_seguros.csv (prêmio direto)',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Prêmio direto, 2016 × 2025', en: 'Direct premium, 2016 × 2025' },
        itens: F.map((x) => ({ rotulo: nomeFam(x), valores: [m[x].premio[0], m[x].premio.at(-1)!] })),
        series: [{ nome: { pt: '2016', en: '2016' }, cor: '#4a5578' }, { nome: { pt: '2025', en: '2025' }, cor: COR[0] }],
        formato: 'bi', aria: { pt: 'Prêmio direto por família de ramos em 2016 e 2025', en: 'Direct premium by line family in 2016 and 2025' },
      }],
    },
    {
      id: 'risco',
      titulo: { pt: 'Sinistralidade: nível e volatilidade', en: 'Loss ratio: level and volatility' },
      pergunta: { pt: 'Qual ramo é mais arriscado, e arriscado como: caro em média ou imprevisível?', en: 'Which line is riskiest, and in what way: expensive on average or unpredictable?' },
      decisao: {
        pt: 'Sinistralidade = sinistro ocorrido ÷ prêmio ganho, ano a ano. Separei o nível (média de 10 anos) da volatilidade (desvio-padrão entre anos), porque são riscos diferentes: um se resolve com preço e o outro com capital e resseguro.',
        en: 'Loss ratio = incurred claims ÷ earned premium, year by year. I split level (10-year mean) from volatility (standard deviation across years), because they are different risks: one is solved with price, the other with capital and reinsurance.',
      },
      resultado: {
        pt: `${nomeFam(maisVolatil).pt} é o mais volátil (desvio de ${f(m[maisVolatil].sinDesvio * 100, 0).pt} pontos), com pico de ${pct(m.Responsabilidades.sinistralidade[iPico], 0).pt} em ${anos[iPico]}: um único ano ruim apaga vários bons. ${nomeFam(menosVolatil).pt} é o mais estável (desvio de ${f(m[menosVolatil].sinDesvio * 100, 0).pt} pontos) e garantia tem a menor sinistralidade média (${pct(m.Garantia.sinMedia, 0).pt}).`,
        en: `${nomeFam(maisVolatil).en} is the most volatile (std. dev. of ${f(m[maisVolatil].sinDesvio * 100, 0).en} points), peaking at ${pct(m.Responsabilidades.sinistralidade[iPico], 0).en} in ${anos[iPico]}: a single bad year wipes out several good ones. ${nomeFam(menosVolatil).en} is the most stable (std. dev. of ${f(m[menosVolatil].sinDesvio * 100, 0).en} points) and surety has the lowest mean loss ratio (${pct(m.Garantia.sinMedia, 0).en}).`,
      },
      fonte: 'SUSEP · Ses_seguros.csv (sinistro ocorrido, prêmio ganho)',
      graficos: [{
        tipo: 'linhas', titulo: { pt: 'Sinistralidade por ano', en: 'Loss ratio by year' }, x: anos,
        series: F.map((x, i) => ({ nome: nomeFam(x), valores: m[x].sinistralidade, cor: COR[i] })),
        formato: 'pct0', yMin: 0, aria: { pt: 'Sinistralidade anual de cada família de ramos, 2016 a 2025', en: 'Annual loss ratio of each line family, 2016 to 2025' },
      }, {
        tipo: 'tabela', titulo: { pt: 'Resumo 2016–2025', en: 'Summary 2016–2025' },
        colunas: [{ pt: 'família', en: 'family' }, { pt: 'sinistr. média', en: 'mean loss ratio' }, { pt: 'desvio', en: 'std. dev.' }, { pt: 'comissão 2025', en: 'commission 2025' }],
        linhas: F.map((x) => [nomeFam(x), pct(m[x].sinMedia, 0), f(m[x].sinDesvio * 100, 0), pct(m[x].comissao.at(-1)!, 0)]),
      }],
    },
    {
      id: 'concentracao',
      titulo: { pt: 'Quem disputa cada ramo', en: 'Who competes in each line' },
      pergunta: { pt: 'Há espaço para uma seguradora nova ou média, ou os ramos são dominados por poucas?', en: 'Is there room for a new or mid-sized insurer, or are the lines dominated by a few?' },
      decisao: {
        pt: 'Medi a concentração do prêmio de 2025 pelo índice HHI e pela fatia das 5 maiores. O HHI soma os quadrados das fatias: abaixo de 1.500 o mercado é considerado pouco concentrado.',
        en: 'I measured 2025 premium concentration with the HHI and the top-5 share. HHI sums the squared shares: below 1,500 a market is considered unconcentrated.',
      },
      resultado: {
        pt: 'Todos os 5 ramos ficam abaixo de 1.000 de HHI, com 23 a 44 seguradoras ativas. As 5 maiores somam cerca de metade do prêmio. Há espaço para competir, e o diferencial passa a ser subscrição e preço, não acesso ao mercado.',
        en: 'All 5 lines stay below 1,000 HHI, with 23 to 44 active insurers. The top 5 hold about half of the premium. There is room to compete, and the edge becomes underwriting and price, not market access.',
      },
      fonte: 'SUSEP · Ses_seguros.csv, 2025',
      graficos: [{
        tipo: 'tabela',
        colunas: [{ pt: 'família', en: 'family' }, { pt: 'seguradoras (> R$ 1 mi)', en: 'insurers (> R$ 1 m)' }, { pt: 'HHI', en: 'HHI' }, { pt: '5 maiores', en: 'top 5' }],
        linhas: F.map((x) => { const c = (d.concentracao as Record<string, { seguradoras: number; hhi: number; top5: number }>)[x]; return [nomeFam(x), String(c.seguradoras), f(c.hhi, 0), pct(c.top5, 0)]; }),
      }],
    },
    {
      id: 'credibilidade',
      titulo: { pt: 'Credibilidade: o histórico próprio ou o do mercado?', en: 'Credibility: own history or the market’s?' },
      pergunta: { pt: 'Para precificar o ano que vem, devo usar a sinistralidade da minha carteira ou a do mercado?', en: 'To price next year, should I use my book’s loss ratio or the market’s?' },
      decisao: {
        pt: 'Usei o modelo de Bühlmann-Straub, padrão em atuária: a previsão é Z × (média própria) + (1 − Z) × (média do mercado), com Z = P / (P + k), em que P é o prêmio ganho da carteira e k sai dos próprios dados (variância dentro de cada seguradora ÷ variância entre seguradoras). Comparei com usar só o mercado ou só o próprio histórico, prevendo cada ano de 2021 a 2025 com os 5 anos anteriores, sem olhar o futuro.',
        en: 'I used the Bühlmann-Straub model, an actuarial standard: forecast = Z × (own mean) + (1 − Z) × (market mean), with Z = P / (P + k), where P is the book’s earned premium and k comes from the data itself (within-insurer variance ÷ between-insurer variance). I compared it with using only the market or only the own history, forecasting each year from 2021 to 2025 with the previous 5 years, never looking ahead.',
      },
      resultado: {
        pt: `A credibilidade erra menos no geral: ${f(bt.geral.credibilidade * 100, 1).pt} pontos de sinistralidade em média, contra ${f(bt.geral.mercado * 100, 1).pt} usando o mercado e ${f(bt.geral.propria * 100, 1).pt} usando só o histórico próprio (${pct(ganho, 1).pt} melhor que o mercado). O ganho é pequeno: sinistralidade por seguradora é muito ruidosa. O valor está na regra de quanto confiar: em engenharia, uma carteira já merece 50 % de peso com R$ ${f(zMeio('Engenharia'), 0).pt} mi de prêmio somado em 5 anos; no patrimonial, só com R$ ${f(zMeio('Patrimonial empresarial'), 0).pt} mi.`,
        en: `Credibility has the lowest error overall: ${f(bt.geral.credibilidade * 100, 1).en} loss-ratio points on average, versus ${f(bt.geral.mercado * 100, 1).en} using the market and ${f(bt.geral.propria * 100, 1).en} using only the own history (${pct(ganho, 1).en} better than the market). The gain is small: insurer-level loss ratios are very noisy. The value is the rule for how much to trust: in engineering, a book already earns 50% weight with R$ ${f(zMeio('Engenharia'), 0).en} m of premium over 5 years; in property, only at R$ ${f(zMeio('Patrimonial empresarial'), 0).en} m.`,
      },
      fonte: 'SUSEP · Ses_seguros.csv · analises/seguros.py',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Erro médio absoluto por família (pontos de sinistralidade)', en: 'Mean absolute error by family (loss-ratio points)' },
        itens: F.map((x) => { const e = (bt.porFamilia as Record<string, Record<string, number>>)[x]; return { rotulo: nomeFam(x), valores: [e.mercado * 100, e.propria * 100, e.credibilidade * 100] }; }),
        series: [{ nome: { pt: 'só mercado', en: 'market only' }, cor: '#4a5578' }, { nome: { pt: 'só histórico próprio', en: 'own history only' }, cor: COR[1] }, { nome: { pt: 'credibilidade', en: 'credibility' }, cor: COR[0] }],
        formato: 'dec1', aria: { pt: 'Erro de previsão de cada método por família de ramos', en: 'Forecast error of each method by line family' },
        nota: { pt: 'Média dos erros de 2021 a 2025, ponderada pelo prêmio ganho de cada seguradora.', en: 'Mean error from 2021 to 2025, weighted by each insurer’s earned premium.' },
      }, {
        tipo: 'dispersao', titulo: { pt: 'Peso dado ao histórico próprio (Z) × tamanho da carteira, 2025', en: 'Weight on own history (Z) × book size, 2025' },
        pontos: curva.filter((c) => ['Transportes', 'Engenharia', 'Patrimonial empresarial'].includes(c.familia)).map((c) => ({ x: c.premio, y: c.Z, g: ['Transportes', 'Engenharia', 'Patrimonial empresarial'].indexOf(c.familia) })),
        grupos: [{ nome: nomeFam('Transportes'), cor: COR[0] }, { nome: nomeFam('Engenharia'), cor: COR[1] }, { nome: nomeFam('Patrimonial empresarial'), cor: COR[2] }],
        eixoX: { pt: 'prêmio ganho em 5 anos (R$ mi)', en: 'earned premium over 5 years (R$ m)' }, eixoY: { pt: 'Z', en: 'Z' }, formatoX: 'int', formatoY: 'dec1', logX: true,
        aria: { pt: 'Fator de credibilidade de cada seguradora em função do prêmio, em três famílias', en: 'Credibility factor of each insurer versus premium, in three families' },
      }],
    },
  ],
  conclusoes: {
    titulo: { pt: 'O que cada dado contribuiu', en: 'What each dataset contributed' },
    itens: [
      { pt: 'Prêmio por ramo e ano: tamanho e crescimento de cada mercado.', en: 'Premium by line and year: size and growth of each market.' },
      { pt: 'Sinistro ocorrido ÷ prêmio ganho: separou ramos caros de ramos imprevisíveis, que pedem respostas diferentes (preço × capital e resseguro).', en: 'Incurred claims ÷ earned premium: separated expensive lines from unpredictable ones, which call for different answers (price × capital and reinsurance).' },
      { pt: 'Prêmio por seguradora: mostrou mercados pouco concentrados, em que subscrição e preço decidem.', en: 'Premium by insurer: showed unconcentrated markets, where underwriting and price decide.' },
      { pt: 'Histórico por seguradora e ramo: deu ao modelo de credibilidade a regra de quanto confiar na própria carteira.', en: 'History by insurer and line: gave the credibility model the rule for how much to trust one’s own book.' },
    ],
  },
  limites: [
    { pt: 'Os dados são agregados por seguradora e ramo, sem apólice nem sinistro individual: não dá para modelar risco por cliente.', en: 'Data is aggregated by insurer and line, with no individual policy or claim: client-level risk cannot be modelled.' },
    { pt: 'Valores nominais, sem correção pela inflação.', en: 'Nominal values, not adjusted for inflation.' },
    { pt: 'Sinistro ocorrido inclui estimativas (IBNR) que podem ser revistas depois.', en: 'Incurred claims include estimates (IBNR) that may be revised later.' },
  ],
  metodo: 'analises/seguros.py',
};
