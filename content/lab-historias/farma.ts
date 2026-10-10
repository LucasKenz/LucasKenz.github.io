import d from '../lab-dados/farma.json';
import type { Historia } from '../../src/components/dados/tipos';
import { COR, f, pct } from './comum';

// Generic drugs: price gap to the original brand (CMED), competition (ANVISA registrations),
// demand and seasonality (SNGPC), and a screening of portfolio opportunities.
const des = d.desconto;
const comp = d.competicao;
const reg = d.registros;
const dem = d.demanda;
const saz = dem.sazonal!;
const it = (nome: string) => saz.itens.find((x) => x.pa === nome)!;
const azi = it('AZITROMICINA DI-HIDRATADA');
const amc = it('AMOXICILINA TRI-HIDRATADA + CLAVULANATO DE POTASSIO');
const cefa = it('CEFALEXINA MONOIDRATADA');
const cipro = it('CLORIDRATO DE CIPROFLOXACINO');
const cap = (s: string) => s.toLowerCase().replace(/(^|[\s+(])([a-zà-ú])/g, (m) => m.toUpperCase());
const op = (d.oportunidades as { pa: string; unidades: number; genericos: number; pfRef: number; score: number }[]).slice(0, 10);

export const farma: Historia = {
  titulo: { pt: 'Genéricos em dados', en: 'Generic drugs in data' },
  intro: {
    pt: 'Três bases públicas da Anvisa contam a história de um laboratório de genéricos: a lista de preços máximos da CMED, o cadastro de registros (quem pode vender o quê) e as vendas de controlados e antimicrobianos nas farmácias (SNGPC). Juntas, elas respondem quanto o genérico custa, quem compete e onde há demanda sem concorrência.',
    en: 'Three public Anvisa databases tell the story of a generics maker: the CMED maximum price list, the registration database (who may sell what) and pharmacy sales of controlled drugs and antimicrobials (SNGPC). Together they answer what a generic costs, who competes and where demand meets thin competition.',
  },
  aplicacao: {
    pt: 'Planejamento de portfólio e de produção: escolher o próximo genérico a registrar e ajustar a produção de antibióticos ao inverno, quando a procura muda.',
    en: 'Portfolio and production planning: choosing the next generic to register and adjusting antibiotic production to winter, when demand shifts.',
  },
  kpis: [
    { valor: f(d.cmed.apresentacoes, 0), rotulo: { pt: 'apresentações com preço na CMED', en: 'presentations priced by CMED' } },
    { valor: f(reg.categorias.GENERICO, 0), rotulo: { pt: 'registros de genéricos ativos', en: 'active generic registrations' } },
    { valor: { pt: `${f(dem.unidadesJan / 1e6, 1).pt} mi`, en: `${f(dem.unidadesJan / 1e6, 1).en} m` }, rotulo: { pt: 'unidades vendidas em jan/2026 (SNGPC)', en: 'units sold in Jan 2026 (SNGPC)' } },
    { valor: String(reg.concentracaoGenericos.empresas), rotulo: { pt: 'empresas com genéricos registrados', en: 'companies with registered generics' } },
  ],
  secoes: [
    {
      id: 'preco',
      titulo: { pt: 'Quanto o genérico custa a menos', en: 'How much cheaper the generic is' },
      pergunta: { pt: 'Qual é a diferença de preço entre o genérico e o medicamento original?', en: 'What is the price gap between the generic and the original drug?' },
      decisao: {
        pt: 'A CMED não marca qual produto é o de referência, então comparei o genérico com o produto da categoria "Novo" (o original de marca) da mesma substância e da mesma apresentação, pelo preço-fábrica sem impostos. Só entram pares com apresentação idêntica: 500 mg × 21 comprimidos com 500 mg × 21 comprimidos.',
        en: 'CMED does not flag the reference product, so I compared each generic with the "New" (original brand) product of the same substance and the same presentation, using the factory price before taxes. Only identical presentations are paired: 500 mg × 21 tablets with 500 mg × 21 tablets.',
      },
      resultado: {
        pt: `Em ${f(d.cmed.pares, 0).pt} pares, o desconto mediano é de ${pct(des.mediana, 0).pt}, com um pico forte entre 30 % e 40 %: é a marca da regra da CMED, que limita o preço de entrada do genérico a 65 % do preço do original. ${pct(des.abaixo35, 0).pt} dos pares ficam abaixo de 35 % de desconto: o original pode ter baixado de preço depois, ou o produto "Novo" do par não é o mesmo usado como referência no registro.`,
        en: `Across ${f(d.cmed.pares, 0).en} pairs, the median discount is ${pct(des.mediana, 0).en}, with a sharp peak between 30% and 40%: the signature of the CMED rule that caps a generic’s entry price at 65% of the original’s. ${pct(des.abaixo35, 0).en} of pairs sit below a 35% discount: the original may have cut its price later, or the "New" product in the pair is not the one used as reference in the registration.`,
      },
      fonte: 'CMED/Anvisa · lista de preços PMC, 09/10/2026',
      graficos: [{
        tipo: 'hist', titulo: { pt: 'Desconto do genérico sobre o original (preço-fábrica)', en: 'Generic discount versus the original (factory price)' },
        bordas: des.bordas, contagens: des.hist, formato: 'pct0', cor: COR[0], marca: { valor: 0.35, rotulo: { pt: 'regra: ≥ 35 %', en: 'rule: ≥ 35%' } },
        aria: { pt: 'Histograma do desconto do genérico em relação ao original, concentrado entre 30 e 40 por cento', en: 'Histogram of generic discount versus the original, concentrated between 30 and 40 percent' },
      }],
    },
    {
      id: 'concorrencia',
      titulo: { pt: 'Mais concorrentes, preço de tabela menor?', en: 'More competitors, lower list price?' },
      pergunta: { pt: 'Quando mais laboratórios vendem o mesmo genérico, o preço de tabela cai?', en: 'When more labs sell the same generic, does the list price fall?' },
      decisao: {
        pt: 'Contei quantos laboratórios têm o mesmo genérico na mesma apresentação e ajustei o desconto contra o logaritmo desse número. Era a hipótese econômica natural: mais oferta, mais desconto.',
        en: 'I counted how many labs sell the same generic in the same presentation and regressed the discount on the log of that count. That was the natural economic hypothesis: more supply, deeper discount.',
      },
      resultado: {
        pt: `A hipótese não se confirmou no preço de tabela: o desconto mediano fica em torno de 35 % com 1, 3 ou 8 concorrentes, e o ajuste explica ${pct(comp.ajuste.r2, 1).pt} da variação. O preço da CMED é um teto regulado. A concorrência acontece abaixo dele, nos descontos à farmácia, que não estão em base pública. Resultado útil: para estudar preço de verdade, o dado de tabela não serve.`,
        en: `The hypothesis did not hold for list prices: the median discount stays around 35% with 1, 3 or 8 competitors, and the fit explains ${pct(comp.ajuste.r2, 1).en} of the variation. The CMED price is a regulated ceiling. Competition happens below it, in discounts to pharmacies, which are not public. Useful result: list prices are the wrong data to study real pricing.`,
      },
      fonte: 'CMED/Anvisa · analises/farma.py',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Desconto mediano por número de laboratórios concorrentes', en: 'Median discount by number of competing labs' },
        itens: comp.porN.filter((x) => x.casos >= 5).map((x) => ({ rotulo: { pt: `${x.n} (${x.casos} casos)`, en: `${x.n} (${x.casos} cases)` }, valores: [x.mediana] })),
        series: [{ nome: { pt: 'desconto mediano', en: 'median discount' }, cor: COR[0] }], formato: 'pct0', maxFixo: 0.6,
        aria: { pt: 'Desconto mediano praticamente igual para qualquer número de concorrentes', en: 'Median discount nearly flat for any number of competitors' },
      }],
    },
    {
      id: 'registros',
      titulo: { pt: 'Quem disputa o mercado de genéricos', en: 'Who competes in generics' },
      pergunta: { pt: 'O mercado de genéricos é concentrado?', en: 'Is the generics market concentrated?' },
      decisao: {
        pt: 'Contei os registros ativos da categoria genérico por empresa detentora no cadastro da Anvisa. Registro não é venda, mas mostra a amplitude do portfólio de cada laboratório.',
        en: 'I counted active generic registrations by holding company in Anvisa’s database. A registration is not a sale, but it shows the breadth of each lab’s portfolio.',
      },
      resultado: {
        pt: `${reg.concentracaoGenericos.empresas} empresas têm genéricos ativos. As 10 maiores detêm ${pct(reg.concentracaoGenericos.top10, 0).pt} dos registros, e o HHI é ${f(reg.concentracaoGenericos.hhi, 0).pt}, mercado pouco concentrado. Portfólio amplo é a regra entre os líderes, e o diferencial passa a ser chegar primeiro às moléculas novas.`,
        en: `${reg.concentracaoGenericos.empresas} companies hold active generics. The top 10 hold ${pct(reg.concentracaoGenericos.top10, 0).en} of registrations and the HHI is ${f(reg.concentracaoGenericos.hhi, 0).en}, an unconcentrated market. A broad portfolio is the norm among leaders, so the edge becomes reaching new molecules first.`,
      },
      fonte: 'Anvisa · DADOS_ABERTOS_MEDICAMENTOS.csv',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Registros de genéricos ativos por empresa (10 maiores)', en: 'Active generic registrations by company (top 10)' },
        itens: reg.top10.map((x) => ({ rotulo: cap(x.empresa).replace(/ (Ltda|S\/a|S\.a\.?|& Cia Ltda|Industria.*|Laboratorios.*Farmaceuticos.*)$/i, ''), valores: [x.registros] })),
        series: [{ nome: { pt: 'registros', en: 'registrations' }, cor: COR[0] }], formato: 'int',
        aria: { pt: 'Número de registros de genéricos ativos das 10 empresas com mais registros', en: 'Number of active generic registrations of the 10 companies with the most' },
      }],
    },
    {
      id: 'sazonalidade',
      titulo: { pt: 'Antibióticos no inverno', en: 'Antibiotics in winter' },
      pergunta: { pt: 'A procura por antibióticos muda entre o verão e o inverno a ponto de mudar o plano de produção?', en: 'Does antibiotic demand change between summer and winter enough to change the production plan?' },
      decisao: {
        pt: 'Comparei janeiro e julho de 2026 no SNGPC. Dois cuidados: (1) desde 2025 os agonistas de GLP-1 (semaglutida, tirzepatida) usam a mesma receita retida dos antimicrobianos, então separei esses remédios; (2) o volume informado muda de um mês para o outro, então dividi a variação pela dos controlados, que não são sazonais.',
        en: 'I compared January and July 2026 in SNGPC. Two precautions: (1) since 2025 GLP-1 agonists (semaglutide, tirzepatide) use the same retained prescription as antimicrobials, so I set them apart; (2) reported volume changes from month to month, so I divided each change by that of controlled drugs, which are not seasonal.',
      },
      resultado: {
        pt: `Os controlados subiram ${pct(saz.controladosJulJan - 1, 0).pt} de janeiro a julho só por cobertura e tendência. Já descontado isso, a azitromicina sobe ${pct(azi.varAjustada, 0).pt} e a amoxicilina com clavulanato ${pct(amc.varAjustada, 0).pt}, antibióticos de infecção respiratória. A cefalexina, de pele e urina, cai ${pct(-cefa.varAjustada, 0).pt}. O salto do ciprofloxacino (${pct(cipro.varAjustada, 0).pt}) é grande demais para sazonalidade e pede checagem de cadastro antes de virar plano.`,
        en: `Controlled drugs rose ${pct(saz.controladosJulJan - 1, 0).en} from January to July from coverage and trend alone. Net of that, azithromycin rises ${pct(azi.varAjustada, 0).en} and amoxicillin-clavulanate ${pct(amc.varAjustada, 0).en}, respiratory-infection antibiotics. Cefalexin, for skin and urinary infections, falls ${pct(-cefa.varAjustada, 0).en}. The ciprofloxacin jump (${pct(cipro.varAjustada, 0).en}) is too large to be seasonal and needs a registration check before it becomes a plan.`,
      },
      fonte: 'Anvisa · SNGPC, EDA_Industrializados_202601 e 202607',
      graficos: [{
        tipo: 'barras', titulo: { pt: 'Variação jan → jul, ajustada pela cobertura', en: 'Jan → Jul change, coverage-adjusted' },
        itens: saz.itens.slice(0, 10).map((x) => ({ rotulo: cap(x.pa).replace(/ (tri|di)-hidratada| monoidratada| de potassio/gi, '').replace('Cloridrato De ', '').replace(/\s+/g, ' ').trim(), valores: [x.varAjustada] })),
        series: [{ nome: { pt: 'variação ajustada', en: 'adjusted change' }, cor: COR[0] }], formato: 'pct0',
        aria: { pt: 'Variação ajustada das vendas dos 10 antimicrobianos mais vendidos entre janeiro e julho', en: 'Adjusted sales change of the 10 best-selling antimicrobials between January and July' },
        nota: { pt: 'Barras à esquerda da linha (em laranja) são quedas.', en: 'Bars left of the line (orange) are declines.' },
      }],
    },
    {
      id: 'oportunidades',
      titulo: { pt: 'Triagem: demanda alta, poucos genéricos', en: 'Screening: high demand, few generics' },
      pergunta: { pt: 'Quais substâncias vendem bem, têm preço alto e quase nenhum genérico registrado?', en: 'Which substances sell well, have a high price and almost no registered generic?' },
      decisao: {
        pt: 'Cruzei as vendas de janeiro (mínimo de 5 mil unidades no mês) com o preço do original na CMED e o número de empresas com genérico registrado. Pontuação = log(unidades) × log(preço) ÷ (1 + genéricos). Usei correspondência exata de nome: a primeira versão, por prefixo, misturava moléculas diferentes.',
        en: 'I crossed January sales (at least 5,000 units in the month) with the original’s CMED price and the number of companies with a registered generic. Score = log(units) × log(price) ÷ (1 + generics). I used exact name matching: the first, prefix-based version mixed different molecules.',
      },
      resultado: {
        pt: 'A lista mistura dois tipos: moléculas recentes de alto valor (tirzepatida, brexpiprazol), em que a patente provavelmente ainda impede o genérico, e moléculas antigas sem genérico registrado (primidona, clobazam, decanoato de haloperidol, axetilcefuroxima), em que a demanda já existe e o obstáculo tende a ser industrial ou regulatório. É uma triagem: cada nome ainda precisa de checagem de patente (INPI), de bioequivalência e de capacidade fabril.',
        en: 'The list mixes two kinds: recent high-value molecules (tirzepatide, brexpiprazole), where a patent most likely still blocks generics, and old molecules with no registered generic (primidone, clobazam, haloperidol decanoate, cefuroxime axetil), where demand already exists and the barrier tends to be industrial or regulatory. It is a screen: each name still needs a patent check (INPI), bioequivalence and manufacturing capacity.',
      },
      fonte: 'SNGPC jan/2026 × CMED × registros Anvisa · analises/farma.py',
      graficos: [{
        tipo: 'tabela',
        colunas: [{ pt: 'substância', en: 'substance' }, { pt: 'unidades (jan)', en: 'units (Jan)' }, { pt: 'genéricos', en: 'generics' }, { pt: 'preço do original', en: 'original price' }],
        linhas: op.map((x) => [cap(x.pa), f(x.unidades, 0), String(x.genericos), { pt: `R$ ${f(x.pfRef, 2).pt}`, en: `R$ ${f(x.pfRef, 2).en}` }]),
        nota: { pt: 'Preço-fábrica mediano das apresentações do original, sem impostos.', en: 'Median factory price of the original’s presentations, before taxes.' },
      }],
    },
  ],
  conclusoes: {
    titulo: { pt: 'O que cada dado contribuiu', en: 'What each dataset contributed' },
    itens: [
      { pt: 'Lista CMED: mediu o desconto real de tabela e mostrou o efeito da regulação no preço de entrada.', en: 'CMED list: measured the actual list-price discount and showed the effect of regulation on entry prices.' },
      { pt: 'Teste de concorrência: rejeitou uma hipótese natural e evitou usar o dado errado para estudar preço.', en: 'Competition test: rejected a natural hypothesis and avoided using the wrong data to study price.' },
      { pt: 'Cadastro de registros: deu o mapa de quem compete em cada molécula.', en: 'Registration database: gave the map of who competes in each molecule.' },
      { pt: 'SNGPC: trouxe demanda real por molécula e o efeito do inverno nos antibióticos, depois de corrigir cobertura e a mudança de regra dos GLP-1.', en: 'SNGPC: brought real demand per molecule and the winter effect on antibiotics, after correcting for coverage and the GLP-1 rule change.' },
    ],
  },
  limites: [
    { pt: 'O SNGPC cobre só controlados e antimicrobianos vendidos em farmácias privadas, não o mercado inteiro.', en: 'SNGPC covers only controlled drugs and antimicrobials sold in private pharmacies, not the whole market.' },
    { pt: 'Dois meses não fazem uma série: a sazonalidade aqui é um indício. Os arquivos de 2021-11 a 2025-12 não estão publicados.', en: 'Two months are not a series: seasonality here is a hint. Files from 2021-11 to 2025-12 are not published.' },
    { pt: 'Preço de tabela é teto. Preço praticado e participação de mercado em valor não são públicos.', en: 'List price is a ceiling. Transaction prices and market share by value are not public.' },
  ],
  metodo: 'analises/farma.py',
};
