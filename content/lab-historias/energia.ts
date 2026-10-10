import d from '../lab-dados/energia.json';
import type { Historia } from '../../src/components/dados/tipos';
import { COR, f, pct } from './comum';

// Heat and electricity load: ONS hourly load (SE/CO) x INMET temperature, day-ahead forecast.
const c = d.curva;
const pv = d.previsao;
const horas = Array.from({ length: 24 }, (_, i) => `${i}h`);
const xs = [Math.min(...d.dispersao.map((p) => p.temp!)), c.base, Math.max(...d.dispersao.map((p) => p.temp!))];
const curva = xs.map((t) => ({ x: t, y: c.cargaBase + (t > c.base ? c.porGrauQuente : c.porGrauFrio) * (t - c.base) }));
const nomeModelo: Record<string, { pt: string; en: string }> = {
  ingenuo: { pt: 'mesma hora, semana passada', en: 'same hour, last week' },
  calendario: { pt: 'regressão de calendário', en: 'calendar regression' },
  calendarioTemperatura: { pt: 'calendário + curva de temperatura', en: 'calendar + temperature curve' },
  semTemperatura: { pt: 'boosting sem temperatura', en: 'boosting without temperature' },
  comTemperatura: { pt: 'boosting com temperatura', en: 'boosting with temperature' },
  comTemperaturaNivel: { pt: 'boosting + temperatura + nível recente', en: 'boosting + temperature + recent level' },
};
const ordem = ['ingenuo', 'calendario', 'calendarioTemperatura', 'semTemperatura', 'comTemperatura', 'comTemperaturaNivel'];
const nomeVar: Record<string, { pt: string; en: string }> = {
  carga_2d: { pt: 'carga 2 dias antes', en: 'load 2 days earlier' }, hora: { pt: 'hora do dia', en: 'hour of day' }, dow: { pt: 'dia da semana', en: 'day of week' },
  temp: { pt: 'temperatura', en: 'temperature' }, carga_7d: { pt: 'carga 7 dias antes', en: 'load 7 days earlier' }, util: { pt: 'dia útil', en: 'working day' },
  feriado: { pt: 'feriado', en: 'holiday' }, cdh: { pt: 'graus acima da base', en: 'degrees above base' },
};
const melhora = 1 - pv.mape.comTemperaturaNivel / pv.mape.ingenuo;
const dias = d.semana.real.map((_, i) => (i % 24 === 0 ? d.semana.inicio.slice(5).split('-').reverse().join('/') : ''));
const diaFmt = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

export const energia: Historia = {
  titulo: { pt: 'Calor e carga elétrica em dados', en: 'Heat and electricity load in data' },
  intro: {
    pt: 'Um ano inteiro, hora a hora, da carga de energia do Sudeste/Centro-Oeste, cruzado com a temperatura de duas estações do INMET em São Paulo. A pergunta é a de quem opera ou compra energia: quanto o calor puxa o consumo e dá para prever a carga de amanhã com erro pequeno?',
    en: 'A full year, hour by hour, of electricity load in Brazil’s Southeast/Centre-West subsystem, crossed with the temperature of two INMET stations in São Paulo. The question is that of whoever operates or buys power: how much does heat drive consumption, and can tomorrow’s load be forecast with small error?',
  },
  aplicacao: {
    pt: 'Programação do dia seguinte e compra de energia: cada ponto percentual de erro na previsão vira geração acionada à toa ou energia comprada no curto prazo, mais cara.',
    en: 'Day-ahead scheduling and energy purchasing: each percentage point of forecast error becomes generation dispatched for nothing or power bought short-term, at a higher price.',
  },
  kpis: [
    { valor: f(d.horas, 0), rotulo: { pt: 'horas com carga e temperatura (2025)', en: 'hours with load and temperature (2025)' } },
    { valor: { pt: `${f(d.cargaMedia / 1000, 1).pt} GW`, en: `${f(d.cargaMedia / 1000, 1).en} GW` }, rotulo: { pt: 'carga média do subsistema', en: 'mean subsystem load' } },
    { valor: { pt: `+${f(c.porGrauQuente, 0).pt} MW`, en: `+${f(c.porGrauQuente, 0).en} MW` }, rotulo: { pt: `por grau acima de ${f(c.base, 1).pt} °C`, en: `per degree above ${f(c.base, 1).en} °C` } },
    { valor: pct(pv.mape.comTemperaturaNivel, 1), rotulo: { pt: 'erro da previsão do dia seguinte', en: 'day-ahead forecast error' } },
  ],
  secoes: [
    {
      id: 'perfil',
      titulo: { pt: 'O formato de um dia', en: 'The shape of a day' },
      pergunta: { pt: 'Como a carga se distribui ao longo do dia, e o fim de semana muda isso?', en: 'How is load spread over the day, and does the weekend change it?' },
      decisao: {
        pt: 'Separei dias úteis de fins de semana e feriados (lista dos feriados nacionais de 2025 e carnaval). Sem essa separação, qualquer modelo confunde "domingo" com "dia frio".',
        en: 'I separated working days from weekends and holidays (2025 national holidays plus Carnival). Without that split, any model confuses "Sunday" with "cold day".',
      },
      resultado: {
        pt: 'Nos dias úteis a carga sobe a partir das 6h, faz um platô durante o expediente e tem o pico médio às 19h, quando a iluminação e o consumo das casas se somam. No fim de semana a curva inteira fica mais baixa, e a diferença é maior às 14h e 15h (quase 9 GW): é o consumo de comércio e indústria que some.',
        en: 'On working days load rises from 6 am, plateaus through business hours and has its mean peak at 7 pm, when lighting and household use add up. On weekends the whole curve is lower, and the gap is largest at 2 and 3 pm (almost 9 GW): it is commercial and industrial demand that disappears.',
      },
      fonte: 'ONS · curva de carga horária 2025 (SE/CO)',
      graficos: [{
        tipo: 'linhas', titulo: { pt: 'Carga média por hora (MW)', en: 'Mean load by hour (MW)' }, x: horas,
        series: [{ nome: { pt: 'dia útil', en: 'working day' }, valores: d.perfil.util, cor: COR[0] }, { nome: { pt: 'fim de semana e feriado', en: 'weekend and holiday' }, valores: d.perfil.fimDeSemana, cor: COR[1] }],
        formato: 'mw', aria: { pt: 'Curva média de carga por hora em dias úteis e fins de semana', en: 'Mean hourly load curve on working days and weekends' },
      }],
    },
    {
      id: 'temperatura',
      titulo: { pt: 'A curva em taco de hóquei', en: 'The hockey-stick curve' },
      pergunta: { pt: 'Quanto cada grau a mais aumenta o consumo?', en: 'How much does each extra degree raise consumption?' },
      decisao: {
        pt: 'Usei a temperatura máxima do dia contra a carga média, só em dias úteis. Em vez de uma reta, ajustei duas retas com um ponto de virada, procurando o ponto que minimiza o erro entre 20 e 32 °C. É o formato esperado: abaixo de certa temperatura ninguém liga o ar-condicionado.',
        en: 'I plotted the daily maximum temperature against mean load, on working days only. Instead of one line I fitted two lines with a break point, searching for the point that minimises error between 20 and 32 °C. That is the expected shape: below some temperature nobody turns on the air conditioning.',
      },
      resultado: {
        pt: `O ponto de virada ficou em ${f(c.base, 1).pt} °C. Abaixo dele a carga muda ${f(c.porGrauFrio, 0).pt} MW por grau; acima, ${f(c.porGrauQuente, 0).pt} MW por grau, quase 3 vezes mais. A temperatura sozinha explica ${pct(c.r2, 0).pt} da variação diária. O resto é calendário e tendência. O pico do ano (${f(d.pico.valor, 0).pt} MW) foi às ${d.pico.quando.slice(11, 13)}h de ${diaFmt(d.pico.quando.slice(0, 10))}, com ${f(d.pico.temp, 1).pt} °C em São Paulo.`,
        en: `The break point landed at ${f(c.base, 1).en} °C. Below it load changes ${f(c.porGrauFrio, 0).en} MW per degree; above it, ${f(c.porGrauQuente, 0).en} MW per degree, almost 3 times more. Temperature alone explains ${pct(c.r2, 0).en} of the daily variation; the rest is calendar and trend. The year’s peak (${f(d.pico.valor, 0).en} MW) came at ${d.pico.quando.slice(11, 13)}:00 on ${d.pico.quando.slice(0, 10)}, with ${f(d.pico.temp, 1).en} °C in São Paulo.`,
      },
      fonte: 'ONS × INMET A701 e A771 · analises/energia.py',
      graficos: [{
        tipo: 'dispersao', titulo: { pt: 'Temperatura máxima do dia × carga média', en: 'Daily maximum temperature × mean load' },
        pontos: d.dispersao.map((p) => ({ x: p.temp!, y: p.carga!, g: p.util ? 0 : 1 })),
        grupos: [{ nome: { pt: 'dia útil', en: 'working day' }, cor: COR[0] }, { nome: { pt: 'fim de semana e feriado', en: 'weekend and holiday' }, cor: COR[1] }],
        eixoX: { pt: 'temperatura máxima (°C)', en: 'max temperature (°C)' }, eixoY: { pt: 'carga média (MW)', en: 'mean load (MW)' }, formatoX: 'int', formatoY: 'int', curva,
        aria: { pt: 'Dispersão de temperatura e carga com duas retas que mudam de inclinação em 23,5 graus', en: 'Scatter of temperature and load with two lines changing slope at 23.5 degrees' },
        nota: { pt: 'Linha tracejada: o ajuste em duas retas, feito só com dias úteis.', en: 'Dashed line: the two-line fit, using working days only.' },
      }],
    },
    {
      id: 'previsao',
      titulo: { pt: 'Prever amanhã', en: 'Forecasting tomorrow' },
      pergunta: { pt: 'Qual modelo prevê melhor a carga do dia seguinte, e a temperatura ajuda?', en: 'Which model best forecasts next-day load, and does temperature help?' },
      decisao: {
        pt: `Treino de ${diaFmt(pv.treino[0])} a ${diaFmt(pv.treino[1])} e teste de ${diaFmt(pv.teste[0])} a ${diaFmt(pv.teste[1])}, sempre no futuro em relação ao treino. Comparei seis modelos, do mais simples (repetir a mesma hora da semana passada) a um gradient boosting com temperatura e a carga de dois dias antes, que já é conhecida quando a previsão é feita. Métrica: erro percentual absoluto médio (MAPE), no geral e nos 10 % de dias mais quentes.`,
        en: `Training from ${pv.treino[0]} to ${pv.treino[1]} and testing from ${pv.teste[0]} to ${pv.teste[1]}, always in the future relative to training. I compared six models, from the simplest (repeat the same hour last week) to gradient boosting with temperature and the load from two days earlier, which is already known when the forecast is made. Metric: mean absolute percentage error (MAPE), overall and on the hottest 10% of days.`,
      },
      resultado: {
        pt: `O melhor modelo erra ${pct(pv.mape.comTemperaturaNivel, 1).pt} em média, ${pct(melhora, 0).pt} menos que repetir a semana passada (${pct(pv.mape.ingenuo, 1).pt}). Nos dias quentes, onde o erro custa mais, ele também ganha: ${pct(pv.mapeQuentes.comTemperaturaNivel, 1).pt} contra ${pct(pv.mapeQuentes.ingenuo, 1).pt}. Lição: a reta de temperatura, que parecia a explicação mais limpa, piorou fora da amostra (${pct(pv.mapeQuentes.calendarioTemperatura, 1).pt} nos dias quentes), porque a relação aprendida de janeiro a setembro não se manteve no fim do ano. O nível recente de carga corrige essa mudança de patamar.`,
        en: `The best model errs by ${pct(pv.mape.comTemperaturaNivel, 1).en} on average, ${pct(melhora, 0).en} less than repeating last week (${pct(pv.mape.ingenuo, 1).en}). On hot days, where error costs most, it also wins: ${pct(pv.mapeQuentes.comTemperaturaNivel, 1).en} versus ${pct(pv.mapeQuentes.ingenuo, 1).en}. Lesson: the temperature line, which looked like the cleanest explanation, got worse out of sample (${pct(pv.mapeQuentes.calendarioTemperatura, 1).en} on hot days), because the relationship learned from January to September did not hold at year end. The recent load level corrects that shift.`,
      },
      fonte: 'ONS × INMET · analises/energia.py (scikit-learn)',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Erro da previsão do dia seguinte (MAPE)', en: 'Day-ahead forecast error (MAPE)' },
        itens: ordem.map((k) => ({ rotulo: nomeModelo[k], valores: [(pv.mape as Record<string, number>)[k], (pv.mapeQuentes as Record<string, number>)[k]] })),
        series: [{ nome: { pt: 'todos os dias', en: 'all days' }, cor: COR[0] }, { nome: { pt: '10 % mais quentes', en: 'hottest 10%' }, cor: COR[1] }],
        formato: 'pct1', aria: { pt: 'Erro percentual de seis modelos de previsão, no geral e em dias quentes', en: 'Percentage error of six forecasting models, overall and on hot days' },
      }, {
        tipo: 'linhas', titulo: { pt: `Semana mais quente do teste, a partir de ${diaFmt(d.semana.inicio)} (MW)`, en: `Hottest test week, from ${d.semana.inicio} (MW)` }, x: dias,
        series: [
          { nome: { pt: 'real', en: 'actual' }, valores: d.semana.real, cor: '#eef1fa' },
          { nome: { pt: 'melhor modelo', en: 'best model' }, valores: d.semana.final, cor: COR[0] },
          { nome: { pt: 'semana passada', en: 'last week' }, valores: d.semana.ingenuo, cor: COR[1], tracejada: true },
        ],
        formato: 'mw', aria: { pt: 'Carga horária real e prevista na semana mais quente do período de teste', en: 'Actual and forecast hourly load in the hottest week of the test period' },
        nota: { pt: 'A semana inclui o Natal. No dia 25 o modelo erra mais (cerca de 9 % acima do real): feriados são poucos no treino e cada um tem seu próprio formato.', en: 'The week includes Christmas. On the 25th the model errs most (about 9% above actual): holidays are few in training and each has its own shape.' },
      }, {
        tipo: 'barras', titulo: { pt: 'O que o melhor modelo usa (importância por permutação)', en: 'What the best model uses (permutation importance)' },
        itens: d.importancia.filter((x) => x.valor > 0).map((x) => ({ rotulo: nomeVar[x.var], valores: [x.valor] })),
        series: [{ nome: { pt: 'aumento do erro sem a variável', en: 'error increase without the variable' }, cor: COR[0] }], formato: 'pct1',
        aria: { pt: 'Importância de cada variável no melhor modelo', en: 'Importance of each variable in the best model' },
        nota: { pt: 'Quanto o MAPE sobe quando a variável é embaralhada no teste.', en: 'How much MAPE rises when the variable is shuffled in the test set.' },
      }],
    },
  ],
  conclusoes: {
    titulo: { pt: 'O que cada dado contribuiu', en: 'What each dataset contributed' },
    itens: [
      { pt: 'Carga horária do ONS: o formato do dia e o peso do calendário (dia útil, feriado).', en: 'ONS hourly load: the shape of the day and the weight of the calendar (working day, holiday).' },
      { pt: 'Temperatura do INMET: o ponto de virada do ar-condicionado e quanto cada grau custa em MW.', en: 'INMET temperature: the air-conditioning break point and what each degree costs in MW.' },
      { pt: 'Carga recente: a variável mais importante, que acompanha mudanças de patamar que o calendário não vê.', en: 'Recent load: the most important variable, following level shifts the calendar cannot see.' },
      { pt: 'Teste no futuro: mostrou que o modelo mais bonito no treino não era o melhor fora dele.', en: 'Testing in the future: showed that the nicest model in training was not the best outside it.' },
    ],
  },
  limites: [
    { pt: 'Uso a temperatura observada como se fosse a previsão do tempo: é o limite superior do ganho. Com previsão real, o erro seria um pouco maior.', en: 'I use the observed temperature as if it were the weather forecast: it is the upper bound of the gain. With a real forecast, error would be somewhat higher.' },
    { pt: 'Duas estações de São Paulo representam um subsistema que vai de Minas ao Centro-Oeste.', en: 'Two São Paulo stations stand in for a subsystem stretching from Minas Gerais to the Centre-West.' },
    { pt: 'Um ano de dados: não captura tendência de vários anos nem anos de seca.', en: 'One year of data: it captures neither multi-year trend nor drought years.' },
  ],
  metodo: 'analises/energia.py',
};
