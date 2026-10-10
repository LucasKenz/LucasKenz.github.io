# Progresso (só acrescentar)

## 2026-10-10 — F0
- `docs/referencias.md`, `docs/F0.md`, mockups em `docs/direcoes/`.
- Currículo reescrito (PT/EN, Full Stack e IA/Dados) em `D:\Minhas coisas\playlists\vagas\saida\` (fora do repositório, tem telefone).

## 2026-10-10 — F1
- Projeto Astro, `content/` com dados reais, layout com coluna fixa, tema claro/escuro automático com alternância, PT/EN.
- Home: miniatura do MOVER, projeto em destaque com vídeo, lista com prévia no hover, experiência, chamada para o Lab, contato.
- Estáticos: favicon (svg/ico/png), manifest, robots, `.nojekyll`.
- Pendente: PDFs do CV (F3), páginas /projetos, /curriculo, /lab (F2–F3), OG images e Lighthouse (F4).

## 2026-10-10 — F2
- Miniatura do topo removida (pedido: o MOVER já aparece logo abaixo). Habilidades todas em "avançado". Onepage (template SaaS) adicionado com capturas de exemplos fictícios gerados localmente.
- `/projetos` com filtros (área Full Stack / IA e Dados + tecnologias em 2+ projetos), cartões com mídia ou painel de números.
- Estudos de caso: MOVER (com plano B: sem `demoUrl` o botão some; trecho real do perfil de velocidade), Serpentina, Onepage. Índice lateral fixo, galeria, próximo estudo.
- `/lab` no formato de site de jogo: seleção com número grande, arte inclinada, tira de miniaturas, paginador vertical, teclado e swipe. Uma página por simulação com HUD.
- Simulações: cidade de uma semente (chunks infinitos, instancing, janelas por shader, carros, dia/noite, semente na URL), robô por matemática (IK analítica, molas, máquina de estados, empilha blocos), laboratório de lentes (Snell, profundidade de campo, visor com desfoque, roteiro com 4 tarefas).
- Testes (Vitest): 15 passando — profundidade de campo conferida por método independente, raios convergem no foco, mesma semente = mesmo hash em 3 quadras, IK em 30 posições sem cotovelo atrás do corpo, mola sem overshoot.
- three.js (~0,9 MB sem gzip) só carrega nas páginas da cidade e do robô; home e currículo continuam sem JS de 3D.
- Pendente: medir fps em notebook/celular reais (as capturas usam renderização por software), F3 (currículo e PDF), F4 (qualidade).

## 2026-10-10 — Lab premium
- Referências do usuário em `referencias/` (sael.net e 3ditions). Prompt especializado para continuar: `docs/prompts/lab_premium.md`.
- Base comum `src/lab/comum/Pos.tsx`: ACES, bloom, profundidade de campo, vinheta, SMAA, AO opcional; qualidade adaptativa (PerformanceMonitor) e `?q=` para travar.
- Dois modos por página: **Visual** (padrão, cinematográfico) e **Leve** (`?modo=leve`, sem pós-processamento). Seção "Como funciona" com 4 cartões e fórmulas em cada simulação (texto em `content/lab.ts`).
- Nova simulação 04 **Água infinita**: ondas de Gerstner (mesma função na GPU e no JS para o barco flutuar), cor pela profundidade, cáusticas, brilho do sol com bloom, barco a vela procedural, esteira.
- Robô refeito em estilo estúdio: HDRI CC0, bordas arredondadas, clearcoat, sombras suaves próprias, olhos e antena com bloom.
- Cidade: céu com estrelas e brilho no horizonte, janelas com bloom e menos acesas, luzes de topo piscando, postes.
- Lentes: brilho nos raios e vidro com gradiente no modo Visual.
- fps medido com Playwright na GPU real (Intel UHD 630, 1440×900): cidade 57/60, robô 61 (q1)/54, água 49 (q1)/48 (Visual/Leve).

## 2026-10-10 — F3
- `/sobre` (história curta só com fatos do `content/`, o que busco, habilidades, formação, idiomas, extracurriculares), `/contato` (e-mail, LinkedIn, GitHub, sem formulário), `/curriculo` com seletor Full Stack × IA e Dados. Tudo em PT e EN.
- CV em PDF gerado no build (`pnpm build` = `astro build` + `scripts/gerar-cv.mjs`): Playwright imprime `/curriculo/print/<área>` (fora do sitemap, `noindex`) em A4, texto selecionável, sem fundo, 1 página conferida pelo script. Quatro PDFs públicos em `public/cv/` e `dist/cv/`.
- Versão com telefone só local: se existir `private/contato.json`, o script gera `private/*-completo.pdf` (pasta ignorada pelo git). Conferido com `pdftotext`: os PDFs públicos não têm o telefone.
- Projetos ganharam o campo `cv` (tópicos do currículo) e habilidades/cursos ganharam nome em inglês: fonte única para site, PDF e versão EN.

## 2026-10-10 — F4
- Barra de topo fixa em todas as páginas, inclusive a home (pedido do usuário): Projetos, Sobre, Currículo, Lab, Contato, idioma e tema. No celular os links descem para uma segunda linha, sem barra de rolagem visível. O Lab ganhou os mesmos links no cabeçalho escuro (`LabTopo.astro`).
- Cartões de compartilhamento (Open Graph/Twitter, 1200×630) gerados no build para as 27 páginas (`scripts/gerar-og.mjs`, saída em `dist/og/`); amostras em `docs/capturas/f4/og/`.
- Página 404 (PT + EN numa só, `noindex`). Tema escuro sem JS segue o sistema.
- Auditoria automática (`scripts/auditar.mjs`): axe WCAG 2.2 AA + boas práticas em 27 páginas × claro/escuro × 1440/390, leitura sem JS em 360 px, rolagem horizontal, SEO (title, description, um h1, alt, og:image), links internos e externos. Resultado: 0 falhas, 0 avisos (`docs/auditoria/relatorio.md`). Corrigidos: contraste de marcas d'água e números do Lab, h1 duplicado no currículo, ordem de títulos em /projetos, bloco de código sem foco, descrições curtas ou cortadas, região sem landmark.
- Lighthouse (`scripts/lighthouse.mjs`, `docs/lighthouse/README.md`): páginas de conteúdo 96–100 em desempenho e 100 em acessibilidade, boas práticas e SEO, no celular e no desktop. Cena 3D da cidade: desempenho 39 → 66 no celular e 89 → 98 no desktop depois de carregar o three.js só após a página pintar (`src/lab/comum/Adiado.tsx`, pôster enquanto carrega).
- Capturas responsivas (`scripts/capturas.mjs`): 360, 390, 768, 1024, 1440 e 1920, claro e escuro, 10 páginas, em `docs/capturas/f4/<largura>/` (fora do git, regeneráveis).
- Revisão de idioma: varredura das páginas EN sem termos em português.

## 2026-10-10 — Lab: MOVER em dados
- Nova simulação `/lab/mover` (PT e EN), primeira da seleção. Cena: maquete real do campus (`campus.glb` do TCC, 0,4 MB) como diorama escuro com três camadas de dados: prédios por altura medida × assumida (12 × 16) com lombadas medidas e faixas sintéticas, rota de 846 m colorida pela rampa, e as 1 743 árvores pelo funil (longe, até 30 m, CARLA, maquete web). Passar o cursor num prédio mostra área, altura e origem.
- Abaixo da cena, a análise em 9 seções (pergunta → decisão e porquê → resultado → fonte): inventário do DXF, procedência medido × sintético, perfil de altitude e rampa, histogramas de calçada e superelevação, funil de objetos, alturas dos prédios, evolução das rodadas, volta no CARLA r9 × r10 e o detector de lombadas (revocação 2/4, precisão ~6 %). Conclusão: o que cada dado contribuiu.
- Dados gerados por `scripts/preparar-mover.mjs` a partir das pastas do TCC (só leitura) em `content/mover-dados.json` (87 KB). Textos em `content/mover-texto.ts`.
- fps (Intel UHD 630, Playwright com GPU): 1440 Visual 48 (desceu para q1) / Leve 60; 390 Visual 44 / Leve 60.
- `pnpm typecheck` 0 erros, `pnpm test` 15/15, `pnpm build` 33 páginas, `pnpm auditar` 29 páginas 0 falhas 0 avisos. Capturas em `docs/capturas/lab/mover-*.png`.
- Investigação das referências em `docs/referencias-lab.md`.

## 2026-10-10 — Lab premium: Água, Robô, Cidade, Lentes
- **Água:** espuma em faixas finas onde a superfície de Gerstner se espreme (soma dos termos de pinça, ~1 − jacobiano), quebrada por ruído esticado na direção da onda; o barco agora contorna a ilha (centro 26, −30; raio 25 m); capim (7 000 lâminas no Visual, 1 800 no Leve) e arbustos instanciados sobre a função exata do fundo (porte JS do `fbm` do shader), balançando no shader com rajadas; 16 gaivotas com boids (separação, alinhamento, coesão + ponto que circula a ilha) e asas batendo no shader; barco com escota que acompanha a vela, estai, ovéns, remos e toletes; pedras arredondadas (vértices fundidos, normais suaves).
- **Robô:** desgaste procedural nas arestas (shader no espaço do objeto), LEDs de status (verde batimento, âmbar carregando, vermelho susto), dois cabos Catmull-Rom corpo → cabeça refeitos a cada quadro, poeira das esteiras animada só no shader, olhos que piscam em intervalos sorteados. A primeira versão da poeira (malhas/pontos com buffer atualizado a cada quadro) custava ~12 fps no ANGLE/D3D11; a versão final só muda uniforms.
- **Cidade:** hora dourada (pico em `noite` ≈ 0,42: sol baixo de lado, face iluminada quente, sombra fria, vidro refletindo o céu laranja, faixa laranja e halo no céu), neblina baixa por altura, escurecimento na base das fachadas, caixas d'água, antenas e faixas de neon nos telhados pelo hash de cada prédio, rastros de luz dos carros (aditivos, comprimento ∝ velocidade, só ao entardecer/noite).
- **Lentes:** no modo Visual, o visor é uma cena 3D (mesa, xícara a 0,8 m, planta a 2 m, janela a 8 m); cada pixel é desfocado pelo próprio círculo de confusão calculado da profundidade, com a mesma fórmula de `optica.ts`, num disco de Vogel de 64 amostras com rotação por pixel. O Leve mantém o visor em SVG. O corte da objetiva com vidro por transmissão não foi feito (continua em SVG).
- fps (Intel UHD 630, 1440 × 900, build de produção), Visual/Leve: MOVER 45/60, cidade 52/60, robô 31/60, água 42/58. Robô Visual a 31 é igual ao do commit anterior medido nas mesmas condições (não é regressão); em `?q=1` dá 50.
- `pnpm typecheck` 0 erros, `pnpm test` 15/15, `pnpm build` 33 páginas, `pnpm auditar` 29 páginas, 0 falhas, 0 avisos. Pôsteres de água, robô e cidade atualizados.

## 2026-10-10 — Lab: quatro projetos de dados com dados públicos
- **/lab/seguros** (SUSEP, 2016–2025): 5 famílias de ramos empresariais (transportes, responsabilidades, patrimonial, engenharia, garantia); prêmio, sinistralidade (nível × volatilidade), concentração (HHI) e modelo de credibilidade de Bühlmann-Straub testado em 2021–2025: erro de 27,0 pontos contra 27,5 (mercado) e 27,7 (histórico próprio), ganho pequeno e dito como tal; a regra de quanto confiar (k) é o resultado útil.
- **/lab/banco** (Banco Central SGS, 2011–2026): inadimplência PF × PJ × MPMe × grandes, por modalidade (capital de giro, aquisição de bens e conta garantida no pior nível de 5 anos), defasagem Selic → inadimplência PJ de 11 meses (correlação 0,77), previsão de 6 meses (Ridge, origem móvel, 122 previsões): erro 0,267 contra 0,301 p.p. de repetir o último valor, direção certa em 79 %; Selic +3 p.p. ≈ +0,41 p.p.
- **/lab/farma** (Anvisa: CMED, registros, SNGPC jan e jul/2026): desconto mediano do genérico sobre o original de 35 % (marca da regra da CMED), hipótese "mais concorrentes, menor preço de tabela" rejeitada (R² 0,009), 121 empresas com genéricos (10 maiores com 56 % dos registros), antibióticos no inverno com correção de cobertura e separação dos GLP-1, triagem de oportunidades com ressalva de patente.
- **/lab/energia** (ONS + INMET, 2025): curva em taco de hóquei com virada em 23,5 °C (+764 MW por grau acima), seis modelos de previsão do dia seguinte, melhor com MAPE de 4,0 % (6,7 % repetindo a semana passada); importância por permutação.
- Componentes novos: `HistoriaDados.astro`, `dados/Grafico.astro` (linhas, barras divergentes, dispersão, histograma, tabela, números), cena `src/lab/dados/Barras3D.tsx` (uma barra por célula dos dados, mola, leitura ao passar o cursor) e pôsteres.
- Scripts: `scripts/baixar-dados.sh` (confere tamanho; o servidor do BC devolveu 503 com muitas tentativas, por isso o projeto de banco usa a API do SGS em vez do SCR.data), `analises/*.py`.
- Verificação: `pnpm typecheck` 0 erros, `pnpm test` 15/15, build 41 páginas, `pnpm auditar` 37 páginas, 0 falhas, 0 avisos. fps nas cenas de barras: começam em q2 e descem sozinhas para q0/q1 (40–60 fps no notebook nesta sessão).

## 2026-10-10 — Farma: sub-labs de estratégia e fichas técnicas
- `/lab/farma` ganhou 6 sub-labs em abas, cada um a partir de um fato público recente do setor (fontes linkadas): canetas GLP-1 (liraglutida com 2,1 % das unidades de GLP-1 e preço-teto igual ao original; semaglutida nacional precisa de desconto real abaixo do teto), compra da Medley (96 moléculas com cópia, 82 sobrepostas, 14 novas, 18 acima do critério de concentração HHI > 2.500 e Δ > 200), uniformidade de conteúdo (Monte Carlo do teste de dois estágios: CV ≤ 6 % para 95 % de aprovação; com CV 7,5 % o lote passa 55 % das vezes com 4,6 % dos comprimidos fora de 85–115 %), biológicos (242 de 326 com uma só empresa; infliximabe já com 6), antibióticos infantis (amoxicilina e azitromicina com ~21–25 % das unidades para crianças) e qualidade do dado (controlados por mil habitantes variam 15 vezes entre estados: cobertura do SNGPC, não consumo).
- Gráficos 3D leves (`src/lab/dados/Mini3D.tsx`): sem sombras nem pós-processamento, `frameloop="demand"`, carregados só quando a aba aparece.
- Ficha técnica em todas as análises dos 5 projetos de dados (MOVER incluído): objetivo, por quê, variável alvo, preditoras, método, métrica, validação e se o objetivo foi atingido. Aparece recolhida em cada seção e reunida em "Como funciona".
- Scripts: `analises/farma_sublabs.py` (SNGPC jan/jul em blocos + IBGE 2025), `analises/farma_estrategia.py`.
- Verificação: typecheck 0 erros, 15/15 testes, build 41 páginas, auditoria 37 páginas 0 falhas 0 avisos.
