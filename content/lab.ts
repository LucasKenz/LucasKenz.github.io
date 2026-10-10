import type { LabItem } from './types';

export const lab: LabItem[] = [
  {
    slug: 'mover',
    explicacao: [
      { titulo: { pt: 'Um dado, uma origem', en: 'One datum, one source' }, texto: { pt: 'Cada número do mapa é MEDIDO no levantamento topográfico ou SINTÉTICO por norma, e a tabela de procedência diz qual. Na maquete, prédio azul tem altura medida; laranja, assumida.', en: 'Every number in the map is either MEASURED in the topographic survey or SYNTHETIC from a standard, and the provenance table says which. In the model, blue buildings have measured height; orange, assumed.' } },
      { titulo: { pt: 'Mesmo referencial', en: 'Same frame' }, texto: { pt: 'Rota, árvores e prédios vêm de arquivos diferentes do pipeline e caem no mesmo lugar porque todos passam pela mesma conversão de coordenadas do levantamento para a cena.', en: 'Route, trees and buildings come from different pipeline files and line up because they all go through the same survey-to-scene coordinate transform.' }, formula: 'cena = (X − 232, Z − 741, −Y + 233)' },
      { titulo: { pt: 'Rampa', en: 'Grade' }, texto: { pt: 'A cor da rota é a rampa entre pontos vizinhos do trajeto real, numa escala divergente: azul desce, cinza é plano, laranja sobe.', en: 'The route colour is the grade between neighbouring points of the real path, on a diverging scale: blue goes down, grey is flat, orange goes up.' }, formula: 'rampa = Δz / Δs · 100 %' },
      { titulo: { pt: 'Gerado, não digitado', en: 'Generated, not typed' }, texto: { pt: 'Um script lê as tabelas do TCC (só leitura) e gera o JSON desta página. Os únicos números copiados à mão são os do relatório da volta no CARLA, com a fonte ao lado.', en: 'A script reads the capstone tables (read-only) and generates this page’s JSON. The only hand-copied numbers are the CARLA lap report figures, with their source next to them.' } },
    ],
    nome: { pt: 'MOVER em dados', en: 'MOVER in data' },
    frase: {
      pt: 'O campus do TCC como dado: o que foi medido, o que foi assumido, por que cada escolha e o que ela rendeu.',
      en: 'The capstone campus as data: what was measured, what was assumed, why each choice and what it delivered.',
    },
    tecnica: { pt: 'análise de dados · procedência · glTF real', en: 'data analysis · provenance · real glTF' },
    status: 'pronto',
  },
  {
    slug: 'seguros',
    explicacao: [
      { titulo: { pt: 'Base da SUSEP', en: 'SUSEP database' }, texto: { pt: 'Prêmios e sinistros mensais de cada seguradora e ramo, 2016–2025, da base pública SES. Cinco famílias de ramos empresariais: transportes, responsabilidades, patrimonial, engenharia e garantia.', en: 'Monthly premiums and claims of every insurer and line, 2016–2025, from the public SES database. Five commercial line families: cargo, liability, property, engineering and surety.' } },
      { titulo: { pt: 'Credibilidade', en: 'Credibility' }, texto: { pt: 'Modelo de Bühlmann-Straub: mistura o histórico da seguradora com o do mercado, com peso que cresce com o tamanho da carteira. Testado prevendo 2021–2025 sem olhar o futuro.', en: 'Bühlmann-Straub model: blends the insurer’s history with the market’s, with a weight that grows with book size. Tested by forecasting 2021–2025 without looking ahead.' }, formula: 'Z = P / (P + k)' },
    ],
    nome: { pt: 'Seguros empresariais', en: 'Commercial insurance' },
    frase: { pt: 'Sinistralidade de cinco ramos empresariais e um modelo atuarial que decide quanto confiar no histórico da carteira.', en: 'Loss ratios of five commercial lines and an actuarial model that decides how much to trust a book’s history.' },
    tecnica: { pt: 'SUSEP · credibilidade de Bühlmann · backtest', en: 'SUSEP · Bühlmann credibility · backtest' },
    status: 'pronto',
  },
  {
    slug: 'banco',
    explicacao: [
      { titulo: { pt: 'Séries do Banco Central', en: 'Banco Central series' }, texto: { pt: 'Inadimplência acima de 90 dias por tipo de cliente, porte e modalidade, Selic e IBC-Br, mês a mês desde 2011 (SGS).', en: 'Delinquency over 90 days by client type, size and product, policy rate and IBC-Br, monthly since 2011 (SGS).' } },
      { titulo: { pt: 'Previsão validada', en: 'Validated forecast' }, texto: { pt: 'Regressão Ridge para 6 meses à frente, validada por origem móvel: em cada mês o modelo só usa o que já era conhecido. Cenário de estresse com Selic 3 pontos mais alta.', en: 'Ridge regression 6 months ahead, validated with a rolling origin: each month the model only uses what was already known. Stress scenario with a policy rate 3 points higher.' }, formula: 'Δinad(t+6) = f(nível, Selic(t−11), IBC-Br, …)' },
    ],
    nome: { pt: 'Risco de crédito de empresas', en: 'Corporate credit risk' },
    frase: { pt: 'Quinze anos de inadimplência por porte e produto, o atraso da Selic e uma previsão de 6 meses com cenário de estresse.', en: 'Fifteen years of delinquency by size and product, the policy-rate lag and a 6-month forecast with a stress scenario.' },
    tecnica: { pt: 'Banco Central · séries temporais · Ridge', en: 'Banco Central · time series · Ridge' },
    status: 'pronto',
  },
  {
    slug: 'farma',
    explicacao: [
      { titulo: { pt: 'Três bases da Anvisa', en: 'Three Anvisa databases' }, texto: { pt: 'Lista de preços da CMED (26 mil apresentações), cadastro de registros e vendas de controlados e antimicrobianos nas farmácias (SNGPC, janeiro e julho de 2026).', en: 'CMED price list (26 thousand presentations), the registration database and pharmacy sales of controlled drugs and antimicrobials (SNGPC, January and July 2026).' } },
      { titulo: { pt: 'Correções antes de concluir', en: 'Corrections before concluding' }, texto: { pt: 'Pares só com apresentação idêntica, variação dividida pela mudança de cobertura do SNGPC e GLP-1 separados dos antibióticos, porque passaram a usar a mesma receita retida.', en: 'Pairs only with identical presentations, changes divided by the shift in SNGPC coverage, and GLP-1 drugs set apart from antibiotics because they now use the same retained prescription.' } },
    ],
    nome: { pt: 'Genéricos em dados', en: 'Generic drugs in data' },
    frase: { pt: 'Preço do genérico contra o original, quem compete, antibióticos no inverno e uma triagem de oportunidades de portfólio.', en: 'Generic versus original prices, who competes, antibiotics in winter and a screen of portfolio opportunities.' },
    tecnica: { pt: 'Anvisa · CMED · SNGPC', en: 'Anvisa · CMED · SNGPC' },
    status: 'pronto',
  },
  {
    slug: 'energia',
    explicacao: [
      { titulo: { pt: 'Carga e clima, hora a hora', en: 'Load and weather, hour by hour' }, texto: { pt: 'Carga horária do subsistema Sudeste/Centro-Oeste (ONS) e temperatura de duas estações do INMET em São Paulo, 2025 inteiro.', en: 'Hourly load of the Southeast/Centre-West subsystem (ONS) and temperature from two INMET stations in São Paulo, all of 2025.' } },
      { titulo: { pt: 'Seis modelos, um teste no futuro', en: 'Six models, one test in the future' }, texto: { pt: 'Do "mesma hora da semana passada" a gradient boosting com temperatura e carga recente. Treino de janeiro a setembro, teste de outubro a dezembro.', en: 'From "same hour last week" to gradient boosting with temperature and recent load. Training January to September, testing October to December.' }, formula: 'MAPE = média(|real − previsto| / real)' },
    ],
    nome: { pt: 'Calor e carga elétrica', en: 'Heat and electricity load' },
    frase: { pt: 'Quanto cada grau puxa o consumo de energia e uma previsão do dia seguinte com erro de 4 %.', en: 'How much each degree drives electricity demand and a day-ahead forecast with 4% error.' },
    tecnica: { pt: 'ONS · INMET · gradient boosting', en: 'ONS · INMET · gradient boosting' },
    status: 'pronto',
  },
  {
    slug: 'cidade',
    explicacao: [
      { titulo: { pt: 'Semente', en: 'Seed' }, texto: { pt: 'Cada quadra recebe um número derivado da semente e da sua posição (hash). Esse número alimenta um gerador pseudoaleatório; por isso a mesma semente sempre ergue a mesma cidade.', en: 'Each block gets a number derived from the seed and its position (a hash). That number feeds a pseudo-random generator, so the same seed always builds the same city.' }, formula: 'r = mulberry32(hash(semente, x, z))' },
      { titulo: { pt: 'Bairros', en: 'Districts' }, texto: { pt: 'Um ruído de baixa frequência, somado à distância ao centro, decide se a quadra é centro (torres), residencial, industrial ou parque.', en: 'Low-frequency noise plus the distance to the center decides whether a block is downtown (towers), residential, industrial or a park.' } },
      { titulo: { pt: 'Infinita', en: 'Infinite' }, texto: { pt: 'A cidade é dividida em pedaços de 288 m. Só os 7 × 7 em volta da câmera existem; ao voar, os de trás somem e os da frente nascem.', en: 'The city is split into 288 m chunks. Only the 7 × 7 around the camera exist; as you fly, the ones behind disappear and new ones are born ahead.' } },
      { titulo: { pt: 'Desempenho', en: 'Performance' }, texto: { pt: 'Todos os prédios de um pedaço são uma única malha instanciada; as janelas são desenhadas no shader, sem textura, com bordas suavizadas por derivadas de tela.', en: 'All buildings in a chunk are one instanced mesh; windows are drawn in the shader, with no texture, and edges smoothed with screen-space derivatives.' } },
      { titulo: { pt: 'Hora dourada e neblina', en: 'Golden hour and fog' }, texto: { pt: 'No fim da tarde o sol desce até perto do horizonte: a face voltada para ele esquenta, a oposta esfria, o vidro reflete o céu laranja. Uma camada de neblina baixa engrossa com a distância, e caixas d’água, antenas e letreiros saem do hash de cada prédio. À noite, os carros deixam rastros de luz proporcionais à velocidade.', en: 'In late afternoon the sun drops near the horizon: the face toward it warms up, the opposite one cools down, glass mirrors the orange sky. A low fog layer thickens with distance, and water tanks, antennas and signs come from each building’s hash. At night, cars leave light trails proportional to their speed.' }, formula: 'névoa = max(dist, e^(−y/22) · dist)' },
    ],
    nome: { pt: 'Cidade de uma semente', en: 'One-seed city' },
    frase: {
      pt: 'Digite um número e a cidade se ergue. Mesma semente, mesma cidade.',
      en: 'Type a number and the city rises. Same seed, same city.',
    },
    tecnica: { pt: 'geração procedural · instancing · WASD', en: 'procedural generation · instancing · WASD' },
    status: 'pronto',
  },
  {
    slug: 'robo',
    explicacao: [
      { titulo: { pt: 'Máquina de estados', en: 'State machine' }, texto: { pt: 'Passear, curioso, pegar, levar, empilhar, susto e dormir. Cada estado define para onde o robô anda, para onde olha e onde a garra deve chegar.', en: 'Wander, curious, grab, carry, stack, startled and sleep. Each state sets where the robot drives, where it looks and where the claw must reach.' } },
      { titulo: { pt: 'Cinemática inversa', en: 'Inverse kinematics' }, texto: { pt: 'O braço tem dois segmentos. A lei dos cossenos dá o ângulo do cotovelo para alcançar o alvo; das duas soluções, fica a que mantém o cotovelo à frente do corpo.', en: 'The arm has two segments. The law of cosines gives the elbow angle to reach the target; of the two solutions, the one keeping the elbow in front of the body wins.' }, formula: 'cos C = (l1² + l2² − d²) / (2·l1·l2)' },
      { titulo: { pt: 'Molas', en: 'Springs' }, texto: { pt: 'Cabeça, braço, garra e suspensão seguem o alvo por molas criticamente amortecidas, resolvidas de forma exata a cada quadro: chegam rápido e nunca passam do ponto.', en: 'Head, arm, claw and suspension follow their targets with critically damped springs, solved exactly every frame: fast, and never overshooting.' }, formula: 'x(t) = alvo + (x0 + (v0 + k·x0)·t)·e^(−k·t)' },
      { titulo: { pt: 'Sem keyframes', en: 'No keyframes' }, texto: { pt: 'Nenhuma animação pronta: as esteiras correm pela distância percorrida, a poeira sai na proporção da velocidade, os cabos são curvas Catmull-Rom refeitas a cada quadro entre corpo e cabeça, e os olhos piscam em intervalos sorteados.', en: 'No canned animation: the tracks scroll with the distance driven, dust comes out in proportion to speed, the cables are Catmull-Rom curves rebuilt every frame between body and head, and the eyes blink at random intervals.' } },
      { titulo: { pt: 'Desgaste no shader', en: 'Wear in the shader' }, texto: { pt: 'A pintura clareia e lasca só nas arestas: o shader mede, no espaço do objeto, quando o ponto está perto de duas faces ao mesmo tempo e quebra a borda com ruído. Os LEDs de status mostram o estado da máquina.', en: 'The paint lightens and chips only on the edges: the shader measures, in object space, when a point is close to two faces at once and breaks the edge with noise. The status LEDs show the state machine.' } },
    ],
    nome: { pt: 'Robô por matemática', en: 'Robot by math' },
    frase: {
      pt: 'Olha o cursor e empilha os blocos que você soltar. Nenhum keyframe.',
      en: 'Watches the cursor and stacks the blocks you drop. No keyframes.',
    },
    tecnica: { pt: 'cinemática inversa · molas · máquina de estados', en: 'inverse kinematics · springs · state machine' },
    status: 'pronto',
  },
  {
    slug: 'lentes',
    explicacao: [
      { titulo: { pt: 'Lente fina', en: 'Thin lens' }, texto: { pt: 'Para focar mais perto, a lente se afasta do sensor. É o que o anel de foco faz.', en: 'To focus closer, the lens moves away from the sensor. That is what the focus ring does.' }, formula: '1/f = 1/s + 1/v' },
      { titulo: { pt: 'Profundidade de campo', en: 'Depth of field' }, texto: { pt: 'Um ponto fora do foco vira um círculo no sensor. Enquanto ele for menor que 0,03 mm (sensor 36 × 24 mm), parece nítido.', en: 'An out-of-focus point becomes a circle on the sensor. While it is under 0.03 mm (36 × 24 mm sensor), it looks sharp.' }, formula: 'H = f²/(N·c) + f' },
      { titulo: { pt: 'Lei de Snell', en: "Snell's law" }, texto: { pt: 'Cada raio é calculado ao entrar e ao sair do vidro BK7, na forma vetorial da lei de Snell; os raios não são desenhados à mão.', en: 'Each ray is computed entering and leaving BK7 glass with the vector form of Snell’s law; rays are not hand-drawn.' }, formula: 'n1·sin θ1 = n2·sin θ2' },
      { titulo: { pt: 'Visor 3D', en: '3D viewfinder' }, texto: { pt: 'No modo Visual, o visor é uma cena 3D. Cada pixel lê a sua profundidade e é desfocado pelo próprio círculo de confusão, com a mesma fórmula que os números da página, num disco de 64 amostras.', en: 'In Visual mode the viewfinder is a 3D scene. Each pixel reads its depth and is blurred by its own circle of confusion, with the same formula as the page numbers, over a 64-sample disc.' }, formula: 'c = f² / (N(s − f)) · |d − s| / d' },
      { titulo: { pt: 'Conferência', en: 'Checks' }, texto: { pt: 'Os limites de nitidez são conferidos em testes por um segundo método (geometria no lado da imagem), com tolerância de 2%.', en: 'Sharpness limits are verified in tests by a second method (image-side geometry), within 2%.' } },
    ],
    nome: { pt: 'Laboratório de lentes', en: 'Lens lab' },
    frase: {
      pt: 'Gire o anel de foco e veja a profundidade de campo andar pela cena.',
      en: 'Turn the focus ring and watch the depth of field move through the scene.',
    },
    tecnica: { pt: 'lei de Snell · traçado de raios · f/1.8 a f/16', en: "Snell's law · ray tracing · f/1.8 to f/16" },
    status: 'pronto',
  },
  {
    slug: 'agua',
    explicacao: [
      { titulo: { pt: 'Ondas de Gerstner', en: 'Gerstner waves' }, texto: { pt: 'Quatro ondas somadas movem cada ponto da superfície em círculos, o que afina as cristas como no mar de verdade. A mesma soma roda na placa de vídeo e em JavaScript, então o barco flutua exatamente na água desenhada.', en: 'Four summed waves move each surface point in circles, sharpening the crests like real sea. The same sum runs on the GPU and in JavaScript, so the boat floats exactly on the drawn water.' }, formula: 'y = Σ A·sin(k·(d·p) − ω·t),  ω = √(g·k)' },
      { titulo: { pt: 'Cor pela profundidade', en: 'Colour by depth' }, texto: { pt: 'O fundo é uma função conhecida (ilha + dunas). A coluna d’água em cada pixel mistura areia, turquesa e azul profundo, e as cáusticas aparecem só no raso.', en: 'The seabed is a known function (island + dunes). The water column at each pixel blends sand, turquoise and deep blue, and caustics show only in the shallows.' } },
      { titulo: { pt: 'Brilho do sol', en: 'Sun glitter' }, texto: { pt: 'Ondinhas pequenas inclinam a normal; quando o reflexo aponta para o sol, o pixel passa do branco e o bloom transforma isso em faíscas.', en: 'Tiny ripples tilt the normal; when the reflection points at the sun, the pixel goes past white and bloom turns it into sparkles.' } },
      { titulo: { pt: 'Espuma nas cristas', en: 'Crest foam' }, texto: { pt: 'A espuma aparece onde a superfície de Gerstner se espreme (o jacobiano chega perto de dobrar), em faixas finas cortadas por ruído esticado na direção da onda, e cresce com o vento.', en: 'Foam appears where the Gerstner surface pinches (the Jacobian gets close to folding), in thin bands broken by noise stretched along the wave, and grows with the wind.' }, formula: 'espuma ∝ Σ Q·k·A·sin θ' },
      { titulo: { pt: 'Barco procedural', en: 'Procedural boat' }, texto: { pt: 'Casco, convés, vela latina, remos, cabos e esteira são gerados em código. A escota acompanha o ângulo da vela e a vela enche conforme o vento.', en: 'Hull, deck, lateen sail, oars, rigging and wake are generated in code. The sheet follows the sail angle and the sail fills with the wind.' } },
      { titulo: { pt: 'Bando e vegetação', en: 'Flock and vegetation' }, texto: { pt: 'As gaivotas são boids: cada uma só olha as vizinhas (separação, alinhamento, coesão) e um ponto que circula a ilha. O capim e os arbustos são instâncias assentadas na mesma função do fundo e balançam no shader com rajadas que atravessam a ilha.', en: 'The gulls are boids: each one only looks at its neighbours (separation, alignment, cohesion) and at a point circling the island. Grass and shrubs are instances seated on the same seabed function and sway in the shader with gusts crossing the island.' } },
    ],
    nome: { pt: 'Água infinita', en: 'Infinite water' },
    frase: {
      pt: 'Um barco a vela atravessa água cristalina; o vento muda as ondas e o sol acende o brilho.',
      en: 'A sailboat crosses clear water; the wind shapes the waves and the sun lights the glitter.',
    },
    tecnica: { pt: 'ondas de Gerstner · cáusticas · bloom', en: 'Gerstner waves · caustics · bloom' },
    status: 'pronto',
  },
];
