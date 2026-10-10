import d from '../lab-dados/banco.json';
import type { Historia } from '../../src/components/dados/tipos';
import { COR, f, pct } from './comum';

// Corporate credit risk (Banco Central SGS): delinquency by segment, size and product,
// policy-rate lag and a 6-month-ahead forecast with a rate-shock scenario.
const h = d.historico as Record<string, (number | null)[]>;
const ms = d.meses as string[];
const ultimo = (k: string) => [...h[k]].reverse().find((v) => v !== null)!;
const pico = (k: string) => { let best = -1, i = 0; h[k].forEach((v, j) => { if (v !== null && v > best) { best = v; i = j; } }); return { v: best, m: ms[i] }; };
const p = d.previsao;
const ganho = 1 - p.mae.modelo / p.mae.ingenuo;
const mod = d.modalidades as { nome: string; nomeEn: string; atual: number; min5: number; max5: number }[];
const corr = d.defasagem.curva as { lag: number; corr: number }[];
const melhor = corr.find((c) => c.lag === d.defasagem.melhor)!;
const mesPt = (s: string) => { const [a, m] = s.split('-'); return `${m}/${a}`; };
const anoTicks = ms.map((m) => m.slice(0, 4));

export const banco: Historia = {
  titulo: { pt: 'Risco de crédito de empresas em dados', en: 'Corporate credit risk in data' },
  intro: {
    pt: 'Quinze anos de inadimplência do sistema financeiro, por tipo de cliente, porte da empresa e modalidade, cruzados com a Selic e a atividade econômica. A pergunta de fundo é a de um banco de atacado e médias empresas: quando o crédito de empresas vai piorar, em quais produtos, e quanto um choque de juros pesa nisso.',
    en: 'Fifteen years of delinquency in the financial system, by client type, company size and product, crossed with the policy rate and economic activity. The underlying question is a corporate and middle-market bank’s: when will corporate credit deteriorate, in which products, and how much does a rate shock weigh on it.',
  },
  aplicacao: {
    pt: 'Provisão para perdas esperadas (Res. CMN 4.966, alinhada ao IFRS 9) e apetite de risco: a provisão precisa olhar para frente com cenários macroeconômicos, e a área de crédito precisa saber em que produto e em que porte de cliente apertar ou soltar.',
    en: 'Expected-loss provisioning (CMN Resolution 4,966, aligned with IFRS 9) and risk appetite: provisions must be forward-looking with macro scenarios, and the credit team needs to know in which product and client size to tighten or loosen.',
  },
  kpis: [
    { valor: { pt: `${f(ultimo('PJ total'), 2).pt} %`, en: `${f(ultimo('PJ total'), 2).en}%` }, rotulo: { pt: `inadimplência PJ em ${mesPt(p.ultimoMes)}`, en: `corporate delinquency in ${p.ultimoMes}` } },
    { valor: { pt: `${f(ultimo('MPMe'), 2).pt} × ${f(ultimo('Grande'), 2).pt} %`, en: `${f(ultimo('MPMe'), 2).en} × ${f(ultimo('Grande'), 2).en}%` }, rotulo: { pt: 'MPMe × grandes empresas', en: 'SMEs × large companies' } },
    { valor: { pt: `${d.defasagem.melhor} meses`, en: `${d.defasagem.melhor} months` }, rotulo: { pt: 'atraso entre a Selic e a inadimplência PJ', en: 'lag from policy rate to corporate delinquency' } },
    { valor: String(ms.length), rotulo: { pt: 'meses de dados (2011–2026)', en: 'months of data (2011–2026)' } },
  ],
  secoes: [
    {
      id: 'segmentos',
      titulo: { pt: 'Quem atrasa: pessoa física, empresa, porte', en: 'Who defaults: households, companies, size' },
      pergunta: { pt: 'O risco de crédito de empresas se comporta como o de pessoa física? E o porte importa?', en: 'Does corporate credit risk behave like household risk? Does size matter?' },
      decisao: {
        pt: 'Usei a definição do Banco Central: inadimplência é a parcela da carteira com alguma prestação atrasada há mais de 90 dias. Separei PJ de PF e, dentro de PJ, micro/pequenas/médias de grandes, porque o perfil de risco e o produto são outros.',
        en: 'I used the Banco Central definition: delinquency is the share of the portfolio with any instalment more than 90 days overdue. I split companies from households and, within companies, micro/small/medium from large ones, because risk profile and products differ.',
      },
      resultado: {
        pt: `A inadimplência PJ teve pico de ${f(pico('PJ total').v, 2).pt} % em ${mesPt(pico('PJ total').m)} e hoje está em ${f(ultimo('PJ total'), 2).pt} %. A de pessoa física está no ponto mais alto da série (${f(ultimo('PF total'), 2).pt} %). Entre empresas, o porte separa tudo: MPMe em ${f(ultimo('MPMe'), 2).pt} % contra ${f(ultimo('Grande'), 2).pt} % nas grandes, cerca de ${f(ultimo('MPMe') / ultimo('Grande'), 0).pt} vezes mais.`,
        en: `Corporate delinquency peaked at ${f(pico('PJ total').v, 2).en}% in ${pico('PJ total').m} and is now ${f(ultimo('PJ total'), 2).en}%. Household delinquency is at the highest point of the series (${f(ultimo('PF total'), 2).en}%). Among companies, size separates everything: SMEs at ${f(ultimo('MPMe'), 2).en}% versus ${f(ultimo('Grande'), 2).en}% for large companies, about ${f(ultimo('MPMe') / ultimo('Grande'), 0).en} times higher.`,
      },
      fonte: 'Banco Central · SGS 21083, 21084, 27703, 27704',
      graficos: [{
        tipo: 'linhas', titulo: { pt: 'Inadimplência > 90 dias (% da carteira)', en: 'Delinquency > 90 days (% of portfolio)' }, x: anoTicks,
        series: [
          { nome: { pt: 'Pessoa física', en: 'Households' }, valores: h['PF total'], cor: COR[1] },
          { nome: { pt: 'Empresas MPMe', en: 'SMEs' }, valores: h.MPMe, cor: COR[3] },
          { nome: { pt: 'Empresas (total)', en: 'Companies (total)' }, valores: h['PJ total'], cor: COR[0] },
          { nome: { pt: 'Grandes empresas', en: 'Large companies' }, valores: h.Grande, cor: COR[2] },
        ],
        formato: 'pp', yMin: 0, aria: { pt: 'Inadimplência mensal de pessoa física, empresas, MPMe e grandes empresas desde 2011', en: 'Monthly delinquency of households, companies, SMEs and large companies since 2011' },
      }],
    },
    {
      id: 'produtos',
      titulo: { pt: 'Em que produto o risco mora', en: 'Which products carry the risk' },
      pergunta: { pt: 'Quais modalidades de crédito a empresas são mais arriscadas hoje, e quanto pioraram?', en: 'Which corporate credit products are riskiest today, and how much have they worsened?' },
      decisao: {
        pt: 'Comparei o nível atual com o pior mês dos últimos 5 anos em cada modalidade de recursos livres. Produto que está no próprio pior nível pede atenção mesmo que a taxa absoluta seja baixa.',
        en: 'I compared the current level with the worst month of the last 5 years for each free-funding product. A product sitting at its own worst level needs attention even if its absolute rate is low.',
      },
      resultado: {
        pt: `Cheque especial e cartão concentram o maior atraso, como esperado em crédito rotativo. O sinal mais importante é outro: capital de giro (${f(mod.find((x) => x.nome === 'Capital de giro')!.atual, 2).pt} %), aquisição de bens e conta garantida estão no pior nível dos últimos 5 anos. São os produtos do dia a dia de empresas médias. Comércio exterior (ACC, financiamento à exportação) segue abaixo de 1 %, em parte porque o crédito tem lastro na própria exportação.`,
        en: `Overdraft and credit cards concentrate the highest arrears, as expected for revolving credit. The more important signal is another one: working capital (${f(mod.find((x) => x.nome === 'Capital de giro')!.atual, 2).en}%), asset purchase and secured overdraft are at their worst level in 5 years. They are the everyday products of mid-sized companies. Trade finance (ACC, export finance) stays below 1%, partly because it is backed by the exports themselves.`,
      },
      fonte: 'Banco Central · SGS 21087–21109',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Inadimplência por modalidade (PJ, recursos livres)', en: 'Delinquency by product (companies, free funding)' },
        itens: mod.map((x) => ({ rotulo: { pt: x.nome, en: x.nomeEn }, valores: [x.atual, x.max5] })),
        series: [{ nome: { pt: `atual (${mesPt(p.ultimoMes)})`, en: `current (${p.ultimoMes})` }, cor: COR[0] }, { nome: { pt: 'pior mês em 5 anos', en: 'worst month in 5 years' }, cor: '#4a5578' }],
        formato: 'pp', aria: { pt: 'Inadimplência atual e máxima de 5 anos por modalidade de crédito a empresas', en: 'Current and 5-year maximum delinquency by corporate credit product' },
        nota: { pt: 'Quando as duas barras têm o mesmo tamanho, a modalidade está no pior nível dos últimos 5 anos.', en: 'When both bars are the same length, the product is at its worst level in 5 years.' },
      }],
    },
    {
      id: 'selic',
      titulo: { pt: 'Juros sobem hoje, o atraso vem depois', en: 'Rates rise today, arrears come later' },
      pergunta: { pt: 'Quanto tempo leva para uma alta da Selic aparecer na inadimplência de empresas?', en: 'How long does a policy-rate hike take to show up in corporate delinquency?' },
      decisao: {
        pt: 'Correlacionei a variação de 12 meses da Selic, deslocada de 0 a 24 meses, com a variação de 12 meses da inadimplência PJ. Usar variações em vez de níveis evita a correlação falsa entre duas séries que só têm tendência.',
        en: 'I correlated the 12-month change in the policy rate, shifted by 0 to 24 months, with the 12-month change in corporate delinquency. Using changes instead of levels avoids the spurious correlation between two merely trending series.',
      },
      resultado: {
        pt: `A relação é fraca no mesmo mês (${f(corr[0].corr, 2).pt}) e máxima com ${melhor.lag} meses de atraso (${f(melhor.corr, 2).pt}). Na prática: o que a Selic fez no último ano é o melhor aviso do que a carteira de empresas vai mostrar no próximo.`,
        en: `The relationship is weak in the same month (${f(corr[0].corr, 2).en}) and strongest with a ${melhor.lag}-month lag (${f(melhor.corr, 2).en}). In practice: what the policy rate did over the last year is the best warning of what the corporate book will show over the next.`,
      },
      fonte: 'Banco Central · SGS 4189 (Selic) e 21083',
      graficos: [{
        tipo: 'linhas', titulo: { pt: 'Correlação Selic → inadimplência PJ por defasagem', en: 'Policy rate → corporate delinquency correlation by lag' }, x: corr.map((c) => String(c.lag)),
        series: [{ nome: { pt: 'correlação', en: 'correlation' }, valores: corr.map((c) => c.corr), cor: COR[0] }],
        formato: 'dec2', marcas: [{ i: melhor.lag, rotulo: { pt: `${melhor.lag} meses`, en: `${melhor.lag} months` } }],
        aria: { pt: 'Correlação entre variação da Selic e variação da inadimplência PJ para defasagens de 0 a 24 meses', en: 'Correlation between policy-rate change and corporate delinquency change for lags of 0 to 24 months' },
        nota: { pt: 'Eixo horizontal: meses de defasagem.', en: 'Horizontal axis: months of lag.' },
      }],
    },
    {
      id: 'previsao',
      titulo: { pt: 'Previsão de 6 meses e cenário de estresse', en: '6-month forecast and stress scenario' },
      pergunta: { pt: 'Dá para prever a inadimplência PJ de daqui a 6 meses melhor do que repetir o valor de hoje?', en: 'Can corporate delinquency 6 months ahead be forecast better than repeating today’s value?' },
      decisao: {
        pt: `Regressão Ridge sobre a variação dos próximos 6 meses, com o nível atual, a tendência recente, a Selic defasada em ${d.defasagem.melhor} meses, a variação da Selic, a atividade (IBC-Br) e a distância entre MPMe e grandes. Validação por origem móvel: em cada mês desde 2016, o modelo só treina com o que já era conhecido naquele mês. Base de comparação: repetir o último valor, que é difícil de bater em séries lentas.`,
        en: `Ridge regression on the change over the next 6 months, using the current level, the recent trend, the policy rate lagged ${d.defasagem.melhor} months, the rate change, activity (IBC-Br) and the SME-to-large gap. Rolling-origin validation: at each month since 2016 the model only trains on what was known at that month. Baseline: repeat the last value, which is hard to beat for slow series.`,
      },
      resultado: {
        pt: `Em ${p.origens} previsões fora da amostra, o erro médio caiu de ${f(p.mae.ingenuo, 3).pt} para ${f(p.mae.modelo, 3).pt} ponto percentual (${pct(ganho, 0).pt} menor), e o modelo acertou a direção do movimento em ${pct(p.acertoDirecao, 0).pt} dos casos. No cenário de estresse, uma Selic 3 pontos mais alta e mantida adiciona cerca de ${f(p.choqueSelic3pp, 2).pt} ponto à inadimplência PJ em 6 meses: numa carteira de R$ 10 bi, são uns R$ ${f(p.choqueSelic3pp / 100 * 10000, 0).pt} mi a mais em atraso.`,
        en: `Across ${p.origens} out-of-sample forecasts, mean error fell from ${f(p.mae.ingenuo, 3).en} to ${f(p.mae.modelo, 3).en} percentage points (${pct(ganho, 0).en} lower), and the model called the direction of the move in ${pct(p.acertoDirecao, 0).en} of cases. In the stress scenario, a sustained 3-point higher policy rate adds about ${f(p.choqueSelic3pp, 2).en} point to corporate delinquency within 6 months: on a R$ 10 bn book, roughly R$ ${f(p.choqueSelic3pp / 100 * 10000, 0).en} m more in arrears.`,
      },
      fonte: 'Banco Central · SGS · analises/banco.py',
      graficos: [{
        tipo: 'linhas', titulo: { pt: 'Inadimplência PJ: real × previsão feita 6 meses antes', en: 'Corporate delinquency: actual × forecast made 6 months earlier' }, x: p.datas.map((m) => m.slice(0, 4)),
        series: [
          { nome: { pt: 'real', en: 'actual' }, valores: p.real, cor: '#eef1fa' },
          { nome: { pt: 'modelo', en: 'model' }, valores: p.prev, cor: COR[0] },
          { nome: { pt: 'repetir o último valor', en: 'repeat last value' }, valores: p.ingenuo, cor: COR[1], tracejada: true },
        ],
        formato: 'pp', aria: { pt: 'Inadimplência PJ real comparada à previsão do modelo e à base ingênua desde 2016', en: 'Actual corporate delinquency compared with the model forecast and the naive baseline since 2016' },
      }, {
        tipo: 'numeros', itens: [
          { valor: `${pct(ganho, 0).pt}`, rotulo: { pt: 'menos erro que repetir o último valor', en: 'less error than repeating the last value' }, medidor: ganho / 0.5 },
          { valor: `${pct(p.acertoDirecao, 0).pt}`, rotulo: { pt: 'acerto da direção (subir/cair)', en: 'direction hit rate (up/down)' }, medidor: p.acertoDirecao },
        ],
      }],
    },
  ],
  conclusoes: {
    titulo: { pt: 'O que cada dado contribuiu', en: 'What each dataset contributed' },
    itens: [
      { pt: 'Inadimplência por porte: mostrou que "empresa" não é um risco só; MPMe e grandes pedem políticas diferentes.', en: 'Delinquency by size: showed that "company" is not a single risk; SMEs and large firms need different policies.' },
      { pt: 'Inadimplência por modalidade: apontou capital de giro e aquisição de bens no pior nível de 5 anos, o alerta mais acionável.', en: 'Delinquency by product: flagged working capital and asset purchase at a 5-year worst, the most actionable warning.' },
      { pt: 'Selic: deu o horizonte de aviso, cerca de um ano, para ajustar limites antes do atraso aparecer.', en: 'Policy rate: gave the warning horizon, about a year, to adjust limits before arrears show up.' },
      { pt: 'O conjunto alimentou um modelo simples e validado sem olhar o futuro, que serve de cenário para a provisão.', en: 'Together they fed a simple model validated without looking ahead, usable as a provisioning scenario.' },
    ],
  },
  limites: [
    { pt: 'Séries agregadas do sistema: não substituem a carteira de um banco, que tem outro mix de clientes e produtos.', en: 'System-wide aggregates: they do not replace a bank’s own book, which has a different client and product mix.' },
    { pt: 'A inadimplência > 90 dias é indicador atrasado; a carteira em atraso de 15 a 90 dias avisaria antes, mas não está nestas séries.', en: 'Delinquency > 90 days is a lagging indicator; 15-to-90-day arrears would warn earlier but are not in these series.' },
    { pt: 'O choque de juros é uma leitura do modelo linear, não um teste de estresse completo com efeitos de segunda ordem.', en: 'The rate shock is a reading of the linear model, not a full stress test with second-order effects.' },
  ],
  metodo: 'analises/banco.py',
};
