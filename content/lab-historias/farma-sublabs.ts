import est from '../lab-dados/farma-estrategia.json';
import sub from '../lab-dados/farma-sublabs.json';
import type { T } from '../types';
import type { Mini } from '../../src/lab/dados/Mini3D';
import type { Ficha } from '../../src/components/dados/tipos';
import { f, pct } from './comum';

// Sub-labs of /lab/farma. Each one starts from a public fact about the Brazilian generics leader's recent
// moves (sources linked), sets an objective, measures it with public data and says whether it got there.

export interface SubLab {
  id: string;
  titulo: T;
  contexto: T;
  pergunta: T;
  decisao: T;
  resultado: T;
  contribuicao: T;
  ficha: Ficha;
  fontes: { nome: string; url?: string }[];
  mini: { titulo: T; spec: Mini; nota?: T };
  numeros?: { valor: string | T; rotulo: T }[];
}

const cap = (s: string) => s.toLowerCase().replace(/(^|[\s+(])([a-zà-ú])/g, (m) => m.toUpperCase());
const curto = (s: string) => cap(s).replace(/ (tri|di)-?hidratada| monoidratada| de potassio| sodica/gi, '').replace(/^Cloridrato De /, '').replace(/\s+/g, ' ').trim();
const reais = (v: number) => ({ pt: `R$ ${f(v, 0).pt}`, en: `R$ ${f(v, 0).en}` });

// ---------- 1. GLP-1 pens ----------
const can = est.canetas;
const dem = can.demanda as { pa: string; jan: number; jul: number }[];
const un = (nome: string) => dem.find((d) => d.pa === nome) ?? { jan: 0, jul: 0 };
const lira = un('LIRAGLUTIDA'), sema = un('SEMAGLUTIDA'), tirz = un('TIRZEPATIDA');
const totJul = dem.reduce((s, d) => s + d.jul, 0);
const lista = can.lista as { subst: string; lab: string; tipo: string; porMg: number; mensal: number }[];
const novo = (s: string) => lista.filter((x) => x.subst === s && x.lab.startsWith('NOVO NORDISK'))[0];
const liraEms = lista.find((x) => x.subst === 'LIRAGLUTIDA' && x.lab.startsWith('EMS'))!;
const semaNovo = novo('SEMAGLUTIDA');

// ---------- 2. merger ----------
const fu = est.fusao;
const alertas = fu.topAlertas as { pa: string; hhiAntes: number; hhiDepois: number; delta: number; grupo: number; medley: number }[];

// ---------- 3. content uniformity ----------
const uni = est.uniformidade;

// ---------- 4. biologics ----------
const bio = est.biologicos;
const contestados = bio.comConcorrencia as { subst: string; pf: number; empresas: number }[];
const faixa1 = bio.porFaixa.find((x) => x.empresas === 1)!;
const faixa2 = bio.porFaixa.find((x) => x.empresas === 2)!;

// ---------- 5. pediatrics ----------
const ped = (sub.pediatria as { pa: string; unidades: number; criancas: number; ate4: number }[]).filter((x) => !x.pa.includes('MOXIFLOXACINO'));
const pedTop = [...ped].sort((a, b) => b.criancas - a.criancas);

// ---------- 6. data quality ----------
const mapa = sub.mapa as { uf: string; ctrlJul: number; amJul: number }[];
const ctrl = mapa.map((m) => m.ctrlJul);
const razao = Math.max(...ctrl) / Math.min(...ctrl);
const maiorCtrl = [...mapa].sort((a, b) => b.ctrlJul - a.ctrlJul)[0];
const menorCtrl = [...mapa].sort((a, b) => a.ctrlJul - b.ctrlJul)[0];

export const subLabsFarma: SubLab[] = [
  {
    id: 'canetas',
    titulo: { pt: 'Canetas GLP-1', en: 'GLP-1 pens' },
    contexto: {
      pt: 'As primeiras canetas nacionais de liraglutida chegaram às farmácias em 2025. A propaganda delas foi suspensa pela Anvisa em abril de 2026 e uma ação publicitária foi suspensa pelo Conar em setembro. Com o fim da patente da semaglutida no Brasil em 2026, laboratórios nacionais registraram versões próprias, com a promessa de custar cerca de 30 % menos que o original.',
      en: 'The first Brazilian-made liraglutide pens reached pharmacies in 2025. Their advertising was suspended by Anvisa in April 2026 and an ad campaign was suspended by Conar in September. With the semaglutide patent expiring in Brazil in 2026, local labs registered their own versions, promising a price about 30% below the original.',
    },
    pergunta: { pt: 'Por que a liraglutida nacional não ganhou o mercado, e o que a semaglutida nacional precisa para não repetir isso?', en: 'Why did Brazilian liraglutide not win the market, and what does Brazilian semaglutide need to avoid the same fate?' },
    decisao: {
      pt: 'Medi a demanda pelas vendas com receita retida no SNGPC (janeiro e julho de 2026) e o custo de um mês de tratamento pelo preço-teto da CMED por miligrama vezes a dose de manutenção da bula (liraglutida 3 mg/dia; semaglutida 2,4 mg/semana; tirzepatida 15 mg/semana).',
      en: 'I measured demand from retained-prescription sales in SNGPC (January and July 2026) and the cost of one month of treatment as the CMED ceiling price per milligram times the label maintenance dose (liraglutide 3 mg/day; semaglutide 2.4 mg/week; tirzepatide 15 mg/week).',
    },
    resultado: {
      pt: `Em julho, a liraglutida vendeu ${f(lira.jul, 0).pt} unidades, ${pct(lira.jul / totJul, 1).pt} dos GLP-1, contra ${f(sema.jul, 0).pt} da semaglutida e ${f(tirz.jul, 0).pt} da tirzepatida. No preço-teto, a nacional custa ${reais(liraEms.mensal).pt} por mês, praticamente o mesmo do original (${reais(novo('LIRAGLUTIDA').mensal).pt}): sem vantagem de preço e com aplicação diária contra semanal. Na semaglutida, o teto das versões nacionais (${reais(can.semaRef).pt}/mês) fica acima da apresentação mais barata do original (${reais(semaNovo.mensal).pt}). Os 30 % prometidos levariam a ${reais(can.semaMenos30).pt}, abaixo do original: o desconto precisa ser real na farmácia, não só na tabela.`,
      en: `In July liraglutide sold ${f(lira.jul, 0).en} units, ${pct(lira.jul / totJul, 1).en} of GLP-1s, versus ${f(sema.jul, 0).en} for semaglutide and ${f(tirz.jul, 0).en} for tirzepatide. At ceiling price the local version costs ${reais(liraEms.mensal).en} a month, practically the same as the original (${reais(novo('LIRAGLUTIDA').mensal).en}): no price advantage, and a daily instead of weekly shot. For semaglutide, the ceiling of the local versions (${reais(can.semaRef).en}/month) sits above the original’s cheapest presentation (${reais(semaNovo.mensal).en}). The promised 30% would mean ${reais(can.semaMenos30).en}, below the original: the discount has to be real at the pharmacy, not just on the list.`,
    },
    contribuicao: {
      pt: 'Um painel mensal do SNGPC por UF e molécula mede a participação logo depois do lançamento, e um modelo de custo por mês de tratamento define o preço mínimo competitivo antes de lançar, em vez de depois.',
      en: 'A monthly SNGPC dashboard by state and molecule measures share right after launch, and a cost-per-treatment-month model sets the minimum competitive price before launch, not after.',
    },
    ficha: {
      objetivo: { pt: 'Explicar a baixa adesão da liraglutida nacional e definir a condição de preço para a semaglutida nacional.', en: 'Explain the low uptake of local liraglutide and set the price condition for local semaglutide.' },
      porque: { pt: 'Lançamento sem vantagem de preço nem de posologia queima investimento e espaço de prateleira; entender por que a primeira caneta não pegou é o jeito mais barato de acertar a segunda. Custo por mês de tratamento é a conta que médico e paciente fazem, por isso comparei nessa unidade, não por caixa.', en: 'A launch with no price or dosing advantage burns investment and shelf space; understanding why the first pen did not take off is the cheapest way to get the second one right. Cost per treatment month is the sum doctors and patients actually do, so I compared in that unit, not per box.' },
      alvo: { pt: 'Participação de cada molécula nas unidades de GLP-1 vendidas; custo mensal de tratamento (R$).', en: 'Each molecule’s share of GLP-1 units sold; monthly treatment cost (R$).' },
      preditoras: { pt: 'Molécula, mês, preço-teto por mg, dose de manutenção, frequência de aplicação.', en: 'Molecule, month, ceiling price per mg, maintenance dose, injection frequency.' },
      metodo: { pt: 'Agregação do SNGPC; cálculo de custo por mês a partir da concentração e do volume de cada apresentação.', en: 'SNGPC aggregation; cost per month from each presentation’s concentration and volume.' },
      metrica: { pt: 'Participação (%) e R$/mês.', en: 'Share (%) and R$/month.' },
      validacao: { pt: 'Conferência manual das apresentações lidas da CMED; comparação jan × jul.', en: 'Manual check of the CMED presentations parsed; Jan × Jul comparison.' },
      atingido: { pt: 'Sim: a diferença de adesão é explicada por preço igual ao original e posologia diária; a condição de preço da semaglutida ficou quantificada.', en: 'Yes: the uptake gap is explained by price parity with the original and daily dosing; the semaglutide price condition is quantified.' },
    },
    fontes: [
      { nome: 'Futuro da Saúde', url: 'https://futurodasaude.com.br/?p=46762' },
      { nome: 'Meio & Mensagem (Conar)', url: 'https://www.meioemensagem.com.br/comunicacao/conar-suspende-anuncio-de-caneta-emagrecedora-da-ems' },
      { nome: 'Atlas Público (Anvisa RE 1.809)', url: 'https://atlaspublico.com.br/noticias/anvisa-suspende-e-proibe-produtos-de-quatro-farmaceuticas-28791' },
      { nome: 'SNGPC + CMED · analises/farma_estrategia.py' },
    ],
    mini: {
      titulo: { pt: 'Unidades vendidas de GLP-1, janeiro × julho de 2026', en: 'GLP-1 units sold, January × July 2026' },
      spec: {
        tipo: 'barras', unidade: 'int',
        linhas: [{ pt: 'Semaglutida', en: 'Semaglutide' }, { pt: 'Tirzepatida', en: 'Tirzepatide' }, { pt: 'Liraglutida', en: 'Liraglutide' }],
        colunas: [{ pt: 'janeiro', en: 'January' }, { pt: 'julho', en: 'July' }],
        valores: [[sema.jan, sema.jul], [tirz.jan, tirz.jul], [lira.jan, lira.jul]],
        aria: { pt: 'Barras 3D de unidades vendidas de semaglutida, tirzepatida e liraglutida em janeiro e julho', en: '3D bars of units sold of semaglutide, tirzepatide and liraglutide in January and July' },
      },
    },
    numeros: [
      { valor: pct(lira.jul / totJul, 1), rotulo: { pt: 'liraglutida nas unidades de GLP-1 (jul)', en: 'liraglutide share of GLP-1 units (Jul)' } },
      { valor: reais(can.semaMenos30), rotulo: { pt: 'semaglutida/mês com 30 % de desconto', en: 'semaglutide/month at a 30% discount' } },
    ],
  },
  {
    id: 'fusao',
    titulo: { pt: 'Compra da Medley', en: 'The Medley deal' },
    contexto: {
      pt: 'Em março de 2026 foi anunciada a compra da Medley, da Sanofi, ainda dependente de aprovação do CADE, com expectativa de levar o grupo comprador a cerca de 30 % do mercado de genéricos.',
      en: 'In March 2026 the purchase of Medley from Sanofi was announced, still pending CADE approval, expected to take the buying group to about 30% of the generics market.',
    },
    pergunta: { pt: 'Em quais moléculas a compra concentra o mercado, e o que ela realmente acrescenta ao portfólio?', en: 'In which molecules does the deal concentrate the market, and what does it really add to the portfolio?' },
    decisao: {
      pt: 'Usei os registros ativos de genéricos e similares (cópias intercambiáveis) por molécula como aproximação da fatia de cada empresa. Somei as empresas do grupo comprador e calculei o HHI antes e depois de juntar a Medley. Sinal de alerta com o critério clássico de guias de concentração horizontal: HHI depois > 2.500 e aumento > 200.',
      en: 'I used active generic and similar registrations (interchangeable copies) per molecule as a proxy for each company’s share. I summed the buying group’s companies and computed HHI before and after adding Medley. Alert with the classic horizontal-merger screen: post-merger HHI > 2,500 and increase > 200.',
    },
    resultado: {
      pt: `A Medley tem cópias em ${fu.comMedley} moléculas, mas ${fu.sobreposicao} delas o grupo já vende: só ${fu.novasParaGrupo} seriam novas. Em ${fu.alertas} moléculas a soma passa do critério de concentração, por exemplo ${alertas.slice(2, 6).map((a) => curto(a.pa)).join(', ')}. Em número de registros a Medley é ${pct(fu.partes.medley, 1).pt} das cópias, bem abaixo do peso em vendas: o valor do negócio está em marca e receita, não em amplitude de portfólio.`,
      en: `Medley has copies in ${fu.comMedley} molecules, but the group already sells ${fu.sobreposicao} of them: only ${fu.novasParaGrupo} would be new. In ${fu.alertas} molecules the combination crosses the concentration screen, for example ${alertas.slice(2, 6).map((a) => curto(a.pa)).join(', ')}. By registration count Medley is ${pct(fu.partes.medley, 1).en} of copies, far below its sales weight: the deal’s value is brand and revenue, not portfolio breadth.`,
    },
    contribuicao: {
      pt: 'A lista de moléculas em alerta antecipa o que o CADE pode pedir (venda de registros ou compromissos) e a sobreposição mostra onde a integração precisa decidir qual marca fica, evitando que as duas disputem o mesmo balcão.',
      en: 'The alert list anticipates what CADE may ask for (divesting registrations or commitments) and the overlap shows where integration must decide which brand stays, so the two do not fight over the same counter.',
    },
    ficha: {
      objetivo: { pt: 'Mapear concentração e sobreposição da compra antes da decisão do CADE.', en: 'Map the deal’s concentration and overlap before CADE decides.' },
      porque: { pt: 'Se o CADE exigir venda de registros, quem já tem a lista pronta negocia melhor e mais rápido. O HHI é a medida que os órgãos de concorrência usam, então falar a mesma língua deles antecipa o resultado.', en: 'If CADE requires divesting registrations, whoever already has the list negotiates better and faster. HHI is the measure competition authorities use, so speaking their language anticipates the outcome.' },
      alvo: { pt: 'Variação do HHI por molécula (ΔHHI) e HHI depois da compra.', en: 'HHI change per molecule (ΔHHI) and post-deal HHI.' },
      preditoras: { pt: 'Registros ativos por empresa e molécula; empresas do grupo comprador; registros da Medley.', en: 'Active registrations by company and molecule; the buyer group’s companies; Medley’s registrations.' },
      metodo: { pt: 'Índice Herfindahl-Hirschman sobre fatias de registros; ΔHHI = 2 · s_grupo · s_Medley · 10.000.', en: 'Herfindahl-Hirschman index on registration shares; ΔHHI = 2 · s_group · s_Medley · 10,000.' },
      metrica: { pt: 'Moléculas com HHI > 2.500 e ΔHHI > 200; moléculas novas × sobrepostas.', en: 'Molecules with HHI > 2,500 and ΔHHI > 200; new × overlapping molecules.' },
      validacao: { pt: 'Lista de empresas do grupo conferida na notícia de reestruturação; limite assumido: registro não é venda.', en: 'Group company list checked against the restructuring news; stated limit: a registration is not a sale.' },
      atingido: { pt: 'Sim, como triagem: 18 moléculas para olhar primeiro e 82 sobreposições para a integração.', en: 'Yes, as a screen: 18 molecules to look at first and 82 overlaps for integration.' },
    },
    fontes: [
      { nome: 'Poder360', url: 'https://www.poder360.com.br/poder-saude/grupo-ems-acerta-compra-da-farmaceutica-medley/' },
      { nome: 'Brazil Journal', url: 'https://braziljournal.com/ems-compra-a-medley-e-consolida-lideranca-em-genericos/' },
      { nome: 'Nova estrutura do grupo', url: 'https://marcaspelomundo.com.br/anunciantes/grupo-ems-unifica-operacoes-farmaceuticas-da-familia-sanchez-e-apresenta-nova-estrutura-corporativa/' },
      { nome: 'Anvisa · registros · analises/farma_estrategia.py' },
    ],
    mini: {
      titulo: { pt: 'HHI antes e depois, moléculas em alerta', en: 'HHI before and after, alert molecules' },
      spec: {
        tipo: 'barras', unidade: 'int',
        linhas: alertas.slice(0, 8).map((a) => ({ pt: curto(a.pa), en: curto(a.pa) })),
        colunas: [{ pt: 'HHI antes', en: 'HHI before' }, { pt: 'HHI depois', en: 'HHI after' }],
        valores: alertas.slice(0, 8).map((a) => [a.hhiAntes, a.hhiDepois]),
        aria: { pt: 'Barras 3D do índice de concentração antes e depois da compra em oito moléculas', en: '3D bars of the concentration index before and after the deal in eight molecules' },
      },
      nota: { pt: 'Proxy por registros, não por vendas.', en: 'Proxy by registrations, not sales.' },
    },
    numeros: [
      { valor: String(fu.novasParaGrupo), rotulo: { pt: 'moléculas novas para o grupo', en: 'molecules new to the group' } },
      { valor: String(fu.alertas), rotulo: { pt: 'moléculas acima do critério de concentração', en: 'molecules above the concentration screen' } },
    ],
  },
  {
    id: 'qualidade',
    titulo: { pt: 'Uniformidade de conteúdo', en: 'Content uniformity' },
    contexto: {
      pt: 'Um lote de diazepam 5 mg foi suspenso por falta de uniformidade de conteúdo: comprimidos com quantidade de princípio ativo acima ou abaixo do limite. A suspensão nacional saiu em setembro de 2025, com o lote perto do vencimento.',
      en: 'A batch of diazepam 5 mg was suspended for lack of content uniformity: tablets with drug amounts above or below the limit. The national suspension came in September 2025, with the batch close to expiry.',
    },
    pergunta: { pt: 'Com que variação de processo um lote ruim ainda passa no teste de uniformidade da farmacopeia?', en: 'At what process variability does a bad batch still pass the pharmacopoeia uniformity test?' },
    decisao: {
      pt: `Simulei ${f(uni.simulacoes, 0).pt} lotes para cada combinação de média (90 % a 110 % do rotulado) e coeficiente de variação entre comprimidos (0,5 % a 12 %), aplicando o teste de dois estágios do valor de aceitação: 10 unidades com k = 2,4; se falhar, 30 unidades com k = 2,0, limite L1 = 15 e nenhuma unidade fora de 75–125 %.`,
      en: `I simulated ${f(uni.simulacoes, 0).en} batches for each combination of mean (90% to 110% of label) and tablet-to-tablet coefficient of variation (0.5% to 12%), applying the two-stage acceptance-value test: 10 units with k = 2.4; if it fails, 30 units with k = 2.0, limit L1 = 15 and no unit outside 75–125%.`,
    },
    resultado: {
      pt: `Para um lote passar 95 % das vezes com média correta, o processo precisa de CV até ${f(uni.cv95, 1).pt} %. Com CV de ${f(uni.limiteCritico!.cv, 1).pt} %, o lote ainda passa em ${pct(uni.limiteCritico!.aprovacao, 0).pt} das vezes, embora cerca de ${pct(uni.limiteCritico!.foraDe85a115, 1).pt} dos comprimidos estejam fora de 85–115 %. O teste é um filtro de amostra, não uma garantia: com variação alta, a aprovação vira sorte.`,
      en: `For a batch with the right mean to pass 95% of the time, the process needs a CV of at most ${f(uni.cv95, 1).en}%. With a CV of ${f(uni.limiteCritico!.cv, 1).en}%, the batch still passes ${pct(uni.limiteCritico!.aprovacao, 0).en} of the time, although about ${pct(uni.limiteCritico!.foraDe85a115, 1).en} of tablets are outside 85–115%. The test is a sample filter, not a guarantee: with high variability, passing becomes luck.`,
    },
    contribuicao: {
      pt: 'Controle estatístico de processo na compressão (cartas de controle de peso e dureza em tempo real e meta de capacidade Cpk) pega o desvio antes do teste de liberação, quando ainda dá para corrigir a máquina em vez de recolher o lote.',
      en: 'Statistical process control at compression (real-time weight and hardness control charts and a Cpk capability target) catches the drift before release testing, while the machine can still be corrected instead of recalling the batch.',
    },
    ficha: {
      objetivo: { pt: 'Quantificar o risco de um lote fora de especificação ser aprovado e definir a variação máxima do processo.', en: 'Quantify the risk of an out-of-spec batch being approved and set the maximum process variability.' },
      porque: { pt: 'Recolhimento custa lote, frete reverso, multa e reputação, e acontece depois do dano. A simulação mostra que o teste de liberação sozinho não protege quando a variação do processo é alta; então o controle tem de ficar antes, na máquina.', en: 'A recall costs the batch, reverse logistics, fines and reputation, and happens after the damage. The simulation shows release testing alone does not protect when process variation is high, so control has to sit earlier, at the machine.' },
      alvo: { pt: 'Probabilidade de aprovação do lote no teste de uniformidade.', en: 'Probability that the batch passes the uniformity test.' },
      preditoras: { pt: 'Média do teor (% do rotulado) e coeficiente de variação entre unidades.', en: 'Mean content (% of label) and coefficient of variation across units.' },
      metodo: { pt: `Simulação de Monte Carlo do teste de dois estágios (${f(uni.simulacoes, 0).pt} lotes por célula).`, en: `Monte Carlo simulation of the two-stage test (${f(uni.simulacoes, 0).en} batches per cell).` },
      metrica: { pt: 'P(aprovação); fração de unidades fora de 85–115 %.', en: 'P(pass); fraction of units outside 85–115%.' },
      validacao: { pt: 'Casos-limite conferidos: média 100 % e CV baixo dá aprovação ≈ 1; média 90 % dá aprovação ≈ 0.', en: 'Edge cases checked: mean 100% with low CV gives pass ≈ 1; mean 90% gives pass ≈ 0.' },
      atingido: { pt: 'Sim: meta de CV ≤ 6 % e o intervalo em que o teste deixa passar lote ruim.', en: 'Yes: a CV ≤ 6% target and the range where the test lets a bad batch through.' },
    },
    fontes: [
      { nome: 'Revista Oeste', url: 'https://revistaoeste.com/brasil/anvisa-leva-9-meses-para-suspender-lote-de-ansiolitico-com-falha/' },
      { nome: 'ICTQ (metformina)', url: 'https://ictq.com.br/assuntos-regulatorios/3145-lotes-do-medicamento-cloridrato-de-metformina-devem-ser-recolhidos' },
      { nome: 'Simulação própria · analises/farma_estrategia.py' },
    ],
    mini: {
      titulo: { pt: 'Probabilidade de aprovação × média × variação', en: 'Pass probability × mean × variability' },
      spec: {
        tipo: 'superficie', x: uni.medias, y: uni.cvs, z: uni.aprovacao,
        rotX: { pt: 'média (% do rotulado)', en: 'mean (% of label)' }, rotY: { pt: 'CV entre comprimidos (%)', en: 'tablet CV (%)' }, rotZ: { pt: 'P(aprovação)', en: 'P(pass)' },
        aria: { pt: 'Superfície 3D da probabilidade de aprovação em função da média e da variação', en: '3D surface of pass probability as a function of mean and variability' },
      },
      nota: { pt: 'Azul: aprova quase sempre. Laranja: reprova quase sempre.', en: 'Blue: almost always passes. Orange: almost always fails.' },
    },
    numeros: [
      { valor: { pt: `CV ≤ ${f(uni.cv95, 1).pt} %`, en: `CV ≤ ${f(uni.cv95, 1).en}%` }, rotulo: { pt: 'para 95 % de aprovação', en: 'for 95% pass rate' } },
      { valor: pct(uni.limiteCritico!.aprovacao, 0), rotulo: { pt: `aprovação com CV ${f(uni.limiteCritico!.cv, 1).pt} %`, en: `pass rate at CV ${f(uni.limiteCritico!.cv, 1).en}%` } },
    ],
  },
  {
    id: 'biologicos',
    titulo: { pt: 'Biológicos e biossimilares', en: 'Biologics and biosimilars' },
    contexto: {
      pt: 'A Bionovis foi criada em 2012 por quatro laboratórios nacionais para produzir biológicos no país. O primeiro biossimilar fabricado inteiramente no Brasil, o infliximabe, estava previsto para 2024, e a fabricação do insumo só foi autorizada depois.',
      en: 'Bionovis was created in 2012 by four Brazilian labs to make biologics locally. The first biosimilar fully made in Brazil, infliximab, was planned for 2024, and production of its active ingredient was only authorised later.',
    },
    pergunta: { pt: 'Onde ainda há espaço para um biossimilar nacional: em moléculas já disputadas ou nas caras com um só fabricante?', en: 'Where is there still room for a local biosimilar: in already contested molecules or in expensive single-holder ones?' },
    decisao: {
      pt: 'Cruzei o preço-fábrica mediano dos produtos biológicos na CMED com o número de empresas que têm registro biológico da mesma molécula.',
      en: 'I crossed the median factory price of biological products in CMED with the number of companies holding a biological registration for the same molecule.',
    },
    resultado: {
      pt: `De ${bio.moleculas} moléculas biológicas com preço, ${bio.umaEmpresa} têm uma única empresa registrada, com preço mediano de ${reais(faixa1.pfMediano).pt}, contra ${reais(faixa2.pfMediano).pt} quando há duas. O infliximabe já tem ${contestados.find((c) => c.subst === 'INFLIXIMABE')?.empresas ?? 'n/d'} empresas, e trastuzumabe e ustequinumabe também já são disputados: chegar atrasado numa molécula com 6 a 10 concorrentes reduz o retorno do investimento. As moléculas caras de um só fabricante são o alvo, desde que a patente já tenha vencido.`,
      en: `Of ${bio.moleculas} priced biological molecules, ${bio.umaEmpresa} have a single registered company, with a median price of ${reais(faixa1.pfMediano).en}, versus ${reais(faixa2.pfMediano).en} with two. Infliximab already has ${contestados.find((c) => c.subst === 'INFLIXIMABE')?.empresas ?? 'n/d'} companies, and trastuzumab and ustekinumab are contested too: arriving late in a molecule with 6 to 10 competitors cuts the return on investment. Expensive single-holder molecules are the target, provided the patent has expired.`,
    },
    contribuicao: {
      pt: 'Uma fila de prioridade de biossimilares por preço × concorrência × data de patente, atualizada a cada lista da CMED, evita investir anos numa molécula que vai chegar lotada.',
      en: 'A biosimilar priority queue by price × competition × patent date, refreshed with every CMED list, avoids spending years on a molecule that will arrive crowded.',
    },
    ficha: {
      objetivo: { pt: 'Priorizar moléculas biológicas para biossimilar pelo espaço competitivo.', en: 'Prioritise biological molecules for biosimilars by competitive room.' },
      porque: { pt: 'Um biossimilar leva anos e centenas de milhões até chegar ao mercado; o maior risco é escolher a molécula errada e chegar com dez concorrentes. Preço sem concorrência é onde o retorno ainda paga esse investimento.', en: 'A biosimilar takes years and hundreds of millions to reach the market; the biggest risk is picking the wrong molecule and arriving with ten competitors. Price without competition is where the return still pays for that investment.' },
      alvo: { pt: 'Número de empresas com registro e preço mediano por molécula.', en: 'Number of registered companies and median price per molecule.' },
      preditoras: { pt: 'Molécula, preço-fábrica (CMED), registros biológicos ativos (Anvisa).', en: 'Molecule, factory price (CMED), active biological registrations (Anvisa).' },
      metodo: { pt: 'Junção CMED × registros por nome da substância; agrupamento por número de empresas.', en: 'CMED × registrations join by substance name; grouping by number of companies.' },
      metrica: { pt: 'Moléculas com 1 empresa; preço mediano por faixa de concorrência.', en: 'Molecules with 1 company; median price by competition band.' },
      validacao: { pt: 'Moléculas conhecidamente disputadas (infliximabe, trastuzumabe, rituximabe) aparecem com 6 a 10 empresas, como esperado.', en: 'Known contested molecules (infliximab, trastuzumab, rituximab) show 6 to 10 companies, as expected.' },
      atingido: { pt: 'Parcial: a triagem está pronta; falta a data de patente (INPI) para fechar a lista.', en: 'Partial: the screen is ready; patent dates (INPI) are still needed to close the list.' },
    },
    fontes: [
      { nome: 'ICTQ', url: 'https://ictq.com.br/industria-farmaceutica/2096-industrias-investem-recursos-milionarios-em-medicamentos-biologicos' },
      { nome: 'Diario de Pernambuco', url: 'https://www.diariodepernambuco.com.br/isso-aqui-e-nosso-missil-diz-lula-ao-exibir-remedio-em-visita-a-fabrica.html' },
      { nome: 'CMED + registros · analises/farma_estrategia.py' },
    ],
    mini: {
      titulo: { pt: 'Empresas registradas por biológico já disputado', en: 'Registered companies per contested biologic' },
      spec: {
        tipo: 'barras', unidade: 'int',
        linhas: contestados.slice(0, 7).map((c) => ({ pt: cap(c.subst), en: cap(c.subst) })),
        colunas: [{ pt: 'empresas', en: 'companies' }],
        valores: contestados.slice(0, 7).map((c) => [c.empresas]),
        aria: { pt: 'Barras 3D com o número de empresas por biológico disputado', en: '3D bars with the number of companies per contested biologic' },
      },
    },
    numeros: [
      { valor: `${bio.umaEmpresa}/${bio.moleculas}`, rotulo: { pt: 'biológicos com uma só empresa', en: 'biologics with a single company' } },
      { valor: reais(faixa1.pfMediano), rotulo: { pt: 'preço mediano sem concorrente', en: 'median price without competitor' } },
    ],
  },
  {
    id: 'pediatria',
    titulo: { pt: 'Antibióticos infantis', en: 'Children’s antibiotics' },
    contexto: {
      pt: 'Em 2015, todos os lotes de uma suspensão oral de amoxicilina com clavulanato fabricados desde 2013 foram suspensos por uso de excipiente e rota de síntese não aprovados. Suspensão oral é a forma de dar antibiótico a crianças pequenas.',
      en: 'In 2015, every batch of an amoxicillin-clavulanate oral suspension made since 2013 was suspended for using an unapproved excipient and synthesis route. Oral suspension is how small children take antibiotics.',
    },
    pergunta: { pt: 'Quais antibióticos dependem de crianças, e portanto de suspensão oral, e quanto pesa uma falha nessa linha?', en: 'Which antibiotics depend on children, and therefore on oral suspensions, and how much does a failure in that line weigh?' },
    decisao: {
      pt: 'No SNGPC de julho de 2026, a idade do paciente vem preenchida em quase todas as vendas de antimicrobianos. Calculei, para os mais vendidos, a parte das unidades para crianças de 0 a 14 anos e de 0 a 4 anos.',
      en: 'In July 2026 SNGPC, patient age is filled in almost every antimicrobial sale. For the best sellers I computed the share of units for children aged 0–14 and 0–4.',
    },
    resultado: {
      pt: `${curto(pedTop[0].pa)} (${pct(pedTop[0].criancas, 0).pt}), ${curto(pedTop[1].pa)} (${pct(pedTop[1].criancas, 0).pt}) e ${curto(pedTop[2].pa)} (${pct(pedTop[2].criancas, 0).pt}) têm cerca de um quinto das unidades indo para crianças, metade delas com até 4 anos. Quinolonas como o ciprofloxacino ficam abaixo de 1 %. Uma falha na suspensão de amoxicilina com clavulanato atinge justamente a linha mais pediátrica e mais sazonal do portfólio, no inverno.`,
      en: `${curto(pedTop[0].pa)} (${pct(pedTop[0].criancas, 0).en}), ${curto(pedTop[1].pa)} (${pct(pedTop[1].criancas, 0).en}) and ${curto(pedTop[2].pa)} (${pct(pedTop[2].criancas, 0).en}) send about one fifth of units to children, half of them aged up to 4. Quinolones such as ciprofloxacin stay below 1%. A failure in the amoxicillin-clavulanate suspension hits exactly the most pediatric and most seasonal line of the portfolio, in winter.`,
    },
    contribuicao: {
      pt: 'Priorizar estoque de segurança e qualidade nas suspensões das moléculas com maior parte infantil, cruzando com o pico de inverno medido na página principal.',
      en: 'Prioritise safety stock and quality on suspensions of the molecules with the largest pediatric share, crossed with the winter peak measured on the main page.',
    },
    ficha: {
      objetivo: { pt: 'Identificar as moléculas em que a forma pediátrica é crítica.', en: 'Identify the molecules where the pediatric form is critical.' },
      porque: { pt: 'Falta de antibiótico infantil no inverno é o problema mais visível que um fabricante pode ter. Saber quais moléculas dependem de crianças diz onde estoque de segurança e qualidade valem mais.', en: 'A shortage of children’s antibiotics in winter is the most visible problem a manufacturer can have. Knowing which molecules depend on children says where safety stock and quality matter most.' },
      alvo: { pt: 'Parte das unidades vendidas para pacientes de 0–14 e 0–4 anos.', en: 'Share of units sold to patients aged 0–14 and 0–4.' },
      preditoras: { pt: 'Princípio ativo, faixa etária, sexo.', en: 'Active ingredient, age band, sex.' },
      metodo: { pt: 'Agregação do SNGPC por molécula e faixa etária (arquivo de 1,3 GB lido em blocos).', en: 'SNGPC aggregation by molecule and age band (1.3 GB file read in chunks).' },
      metrica: { pt: '% das unidades para crianças.', en: '% of units for children.' },
      validacao: { pt: `Idade preenchida em ${pct(sub.perfis.antimicrobiano.cobertura, 0).pt} das unidades de antimicrobianos.`, en: `Age filled in for ${pct(sub.perfis.antimicrobiano.cobertura, 0).en} of antimicrobial units.` },
      atingido: { pt: 'Sim: ranking pediátrico pronto para planejamento de suspensões.', en: 'Yes: pediatric ranking ready for suspension planning.' },
    },
    fontes: [
      { nome: 'Vigilância em Foco (2015)', url: 'https://www.gov.br/hubrasil/pt-br/atencao-a-saude/vigilancia-em-foco/2015/vigilancia-em-foco-edicao-extra-no-6-05-02-2015.pdf' },
      { nome: 'SNGPC jul/2026 · analises/farma_sublabs.py' },
    ],
    mini: {
      titulo: { pt: 'Parte das unidades para crianças, por antibiótico', en: 'Share of units for children, by antibiotic' },
      spec: {
        tipo: 'barras', unidade: 'pct',
        linhas: pedTop.slice(0, 8).map((p) => ({ pt: curto(p.pa), en: curto(p.pa) })),
        colunas: [{ pt: '0–4 anos', en: '0–4 years' }, { pt: '0–14 anos', en: '0–14 years' }],
        valores: pedTop.slice(0, 8).map((p) => [p.ate4, p.criancas]),
        aria: { pt: 'Barras 3D da parte das unidades vendidas para crianças em oito antibióticos', en: '3D bars of the share of units sold to children for eight antibiotics' },
      },
    },
  },
  {
    id: 'dados',
    titulo: { pt: 'Qualidade do dado', en: 'Data quality' },
    contexto: {
      pt: 'O SNGPC depende de cada farmácia transmitir as vendas, e a cobertura muda entre estados e meses. Comparar regiões sem medir isso leva a conclusões erradas sobre consumo.',
      en: 'SNGPC depends on each pharmacy transmitting its sales, and coverage changes across states and months. Comparing regions without measuring that leads to wrong conclusions about consumption.',
    },
    pergunta: { pt: 'Dá para comparar o consumo de medicamentos entre estados direto pelo SNGPC?', en: 'Can drug consumption be compared across states directly from SNGPC?' },
    decisao: {
      pt: 'Calculei unidades de controlados por mil habitantes em cada UF (população estimada do IBGE para 2025). Controlados são de uso crônico e estável, então diferenças muito grandes indicam cobertura, não consumo. Para comparar antimicrobianos, usei a razão antimicrobianos ÷ controlados, que cancela a cobertura.',
      en: 'I computed controlled-drug units per thousand inhabitants in each state (IBGE 2025 population estimate). Controlled drugs are chronic and stable, so very large differences point to coverage, not consumption. To compare antimicrobials I used the antimicrobials ÷ controlled ratio, which cancels coverage out.',
    },
    resultado: {
      pt: `Os controlados por mil habitantes variam ${f(razao, 0).pt} vezes entre estados (${maiorCtrl.uf}: ${f(maiorCtrl.ctrlJul, 0).pt}; ${menorCtrl.uf}: ${f(menorCtrl.ctrlJul, 0).pt}), o que nenhuma diferença de saúde explica. Sem correção, qualquer mapa de "consumo" do SNGPC é um mapa de cobertura. A razão por classe resolve a comparação e marca estados com padrão estranho para checar antes de usar.`,
      en: `Controlled units per thousand inhabitants vary ${f(razao, 0).en}-fold across states (${maiorCtrl.uf}: ${f(maiorCtrl.ctrlJul, 0).en}; ${menorCtrl.uf}: ${f(menorCtrl.ctrlJul, 0).en}), which no health difference explains. Uncorrected, any SNGPC "consumption" map is a coverage map. The class ratio fixes the comparison and flags states with odd patterns to check before use.`,
    },
    contribuicao: {
      pt: 'Uma etapa de qualidade de dado antes de qualquer previsão de demanda regional: sem ela, o plano de distribuição seguiria a cobertura do sistema, não os pacientes.',
      en: 'A data-quality step before any regional demand forecast: without it, the distribution plan would follow system coverage, not patients.',
    },
    ficha: {
      objetivo: { pt: 'Verificar se o SNGPC permite comparar estados e propor uma correção.', en: 'Check whether SNGPC allows state comparison and propose a correction.' },
      porque: { pt: 'Toda previsão regional herda os vieses do dado. Medir a cobertura antes de modelar evita mandar produto para onde o sistema transmite mais, e não para onde há mais pacientes.', en: 'Every regional forecast inherits the data’s biases. Measuring coverage before modelling avoids shipping product to where the system transmits more, rather than to where there are more patients.' },
      alvo: { pt: 'Unidades por mil habitantes; razão antimicrobianos ÷ controlados.', en: 'Units per thousand inhabitants; antimicrobials ÷ controlled ratio.' },
      preditoras: { pt: 'UF, classe (controlado, antimicrobiano), população IBGE 2025.', en: 'State, class (controlled, antimicrobial), IBGE 2025 population.' },
      metodo: { pt: 'Normalização per capita e por classe de referência.', en: 'Per-capita normalisation and by a reference class.' },
      metrica: { pt: 'Razão entre o maior e o menor estado; dispersão da razão corrigida.', en: 'Highest-to-lowest state ratio; spread of the corrected ratio.' },
      validacao: { pt: 'A variação de janeiro para julho dos controlados (+27 %) confirma que a cobertura muda no tempo também.', en: 'The January-to-July change in controlled drugs (+27%) confirms coverage also changes over time.' },
      atingido: { pt: 'Sim: a limitação ficou medida e corrigida antes de virar decisão.', en: 'Yes: the limitation was measured and corrected before becoming a decision.' },
    },
    fontes: [{ nome: 'SNGPC jul/2026 + IBGE 2025 · analises/farma_sublabs.py' }],
    mini: {
      titulo: { pt: 'Controlados por mil habitantes, por UF (julho de 2026)', en: 'Controlled-drug units per thousand inhabitants, by state (July 2026)' },
      spec: {
        tipo: 'mapa', unidade: 'int', rotulo: { pt: 'por mil hab.', en: 'per thousand' },
        valores: Object.fromEntries(mapa.map((m) => [m.uf, m.ctrlJul])),
        aria: { pt: 'Mapa 3D em blocos dos estados com a altura proporcional às unidades de controlados por mil habitantes', en: '3D tile map of states with height proportional to controlled-drug units per thousand inhabitants' },
      },
      nota: { pt: 'Cada bloco é um estado, na posição aproximada do mapa.', en: 'Each block is a state, roughly in its map position.' },
    },
  },
];
