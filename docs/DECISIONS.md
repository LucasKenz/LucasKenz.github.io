# Decisões

| Data | Decisão | Por quê |
|---|---|---|
| 2026-10-10 | Astro 7 + ilhas React | HTML estático por padrão; 3D só baixa quando aparece; i18n nativo. |
| 2026-10-10 | Direção A (Prancheta) + miniatura do MOVER no topo + prévia no hover da C | Escolha do usuário. Legível para recrutador, com um gancho visual próprio. |
| 2026-10-10 | `/lab` no formato de site de jogo gacha (seleção + página por simulação) | Pedido do usuário (referência: site do Zenless Zone Zero). Mantém a home sóbria e o Lab dinâmico. |
| 2026-10-10 | Listras amarelo/preto de lombada como assinatura visual | Detalhe só deste portfólio: vem das lombadas reais do anel do MOVER; faz a ponte com as listras dos sites de jogo. |
| 2026-10-10 | Miniatura do MOVER em SVG + SMIL (`animateMotion`) | Zero JS de 3D no carregamento inicial; escala junto com o desenho; pausa por botão e por `prefers-reduced-motion`. |
| 2026-10-10 | GIF do MOVER convertido em mp4 (0,47 MB) + webm (0,44 MB) + pôster webp | GIF tinha 4 MB. Vídeo só toca quando visível. |
| 2026-10-10 | E-mail público `lkmtada@gmail.com`, sem telefone | Repositório público; telefone só no PDF local. |
| 2026-10-10 | Sem analytics, sem cookies | Sugestão aceita. |
| 2026-10-10 | Laboratório de lentes em SVG, sem three.js | O conceito é um corte 2D; SVG fica nítido, acessível e leve. |
| 2026-10-10 | Teste de profundidade de campo por método independente (espaço da imagem + bisseção) | Não havia calculadora de referência acessível offline; não inventar valores de referência. |
| 2026-10-10 | Pôsteres do Lab capturados das próprias simulações (Playwright, sem HUD) | Sem imagens de terceiros; sempre batem com o que a página mostra. |
| 2026-10-10 | Miniatura do MOVER no topo removida | Pedido do usuário: repetia o projeto em destaque logo abaixo. |
| 2026-10-10 | Dois modos no Lab (Visual e Leve) | Sugestão do usuário: visual caprichado sem descartar a versão rápida e didática. |
| 2026-10-10 | Sombras de "estúdio" (texturas radiais) no robô em vez de ContactShadows/N8AO | Os dois geravam manchas serrilhadas com o pós-processamento; a textura é mais barata e mais limpa. |
| 2026-10-10 | Capturas com GPU real (`--use-angle=d3d11`) | Renderização por software não aguentava o modo Visual; a GPU do notebook dá fps reais. |
| 2026-10-10 | PDF do CV por Playwright a partir de uma rota de impressão | Mesmo HTML/dados do site, texto selecionável (ATS), sem biblioteca de PDF extra; Playwright 1.63 reaproveita o Chromium já baixado. |
| 2026-10-10 | Barra de topo fixa em todas as páginas, com os 5 links também no celular | Pedido do usuário: navegação sempre disponível. Segunda linha no celular em vez de menu escondido. |
| 2026-10-10 | Cartões OG gerados no build com Playwright a partir do `<title>` e da description de cada página | Sem serviço externo; o cartão nunca fica desatualizado em relação à página. |
| 2026-10-10 | Cenas 3D carregadas só após `load` + ocioso, com pôster | three.js + pós-processamento pesam ~1,3 MB; o texto aparece primeiro em celulares lentos. |
| 2026-10-10 | Relatórios do Lighthouse e capturas F4 fora do git | ~46 MB, regeneráveis pelos scripts; o repositório será público. |
| 2026-10-10 | `/lab/mover`: diorama 3D do campus + análise de dados em SVG gerado no build | Pedido do usuário: MOVER no Lab voltado a ciência de dados (porquê de cada escolha, contribuição de cada dado, resultados). Gráficos sem JS, acessíveis; cena 3D com camadas de dados. |
| 2026-10-10 | Dados do MOVER copiados por script (`scripts/preparar-mover.mjs`) para `content/mover-dados.json` | Repositório do TCC é só leitura; o portfólio não depende da pasta externa no build. Números do relatório da volta no CARLA ficam com a fonte ao lado. |
| 2026-10-10 | 3ditions não investigado; sael.net só no nível de técnica | Política do 3ditions proíbe análise por IA; sael.net permite visita, mas "all rights reserved". Ver `docs/referencias-lab.md`. |
| 2026-10-10 | Paleta dos gráficos: azul/laranja/verde-água validados no fundo do Lab | Validador de paleta (CVD ΔE ≥ 9,4 entre todos os pares). Amarelo de lombada fica reservado para lombadas. |
| 2026-10-10 | Quatro projetos de dados no Lab, um por área de interesse: seguros empresariais, crédito a empresas, genéricos e energia | Pedido do usuário: projetos complexos, no formato do MOVER (pergunta → decisão e porquê → resultado → fonte), ligados aos programas de trainee em seguros, banco e indústria farmacêutica. |
| 2026-10-10 | Só dados públicos, baixados para `private/dados/` e reduzidos a JSON pequenos em `content/lab-dados/` | O repositório será público e o build não pode depender de 4 GB de arquivos nem de rede. |
| 2026-10-10 | Análises em Python (pandas, scikit-learn) em `analises/`, site continua em Astro | Mostra a pilha de ciência de dados que as vagas pedem; o JSON é o contrato entre as duas partes. |
| 2026-10-10 | Gráficos das histórias em SVG gerado no build, sem biblioteca | Leves, acessíveis (texto, `title` em cada marca), funcionam sem JS e seguem o mesmo visual do Lab. |
| 2026-10-10 | Nenhuma página cita a empresa do programa de trainee | A página fala do setor; o vínculo com cada processo seletivo fica com o usuário (repositório público). |
| 2026-10-10 | Resultados fracos ou negativos ficam na página (ganho de 1,6 % da credibilidade, hipótese de concorrência rejeitada, salto do ciprofloxacino) | Mostrar o limite do método vale mais para quem avalia do que um número inflado. |
