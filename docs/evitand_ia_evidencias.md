# Evitando indícios de IA

Data: 10/10/2026. Tudo feito só na branch local `main`. **Nada foi enviado ao GitHub**: nenhum push, nenhum `scripts/publicar.sh`, branch `publico` intocada.

## 1. Ponto de partida

Um detector de "site feito por IA" deu nota intermediária ao site publicado. Os achados e o que encontrei no código:

| Achado do detector | Peso | Real? | Onde estava |
|---|---|---|---|
| Travessões (—) | "Damning" | Sim | 26 ocorrências: títulos de página (`X — Lucas Kenzo`), períodos (`JAN 2026 — ATUAL`), legenda `Fig. 1 — anel viário`, títulos de projeto, CV, campo `fonte` dos JSON do Lab, `'—'` como valor vazio em gráficos |
| Pílulas arredondadas (×30) | Notable | Sim | `Tags.astro`, `Linha.astro`, `SobrePagina.astro` (`rounded-full`) |
| Fundo em degradê | Minor | Falso positivo na home | A grade quadriculada era desenhada com `linear-gradient`, e o detector lê isso como degradê. Degradês de verdade só no Lab: `radial-gradient` azul no fundo e `.md-fim` em 135° |
| Fonte padrão (Geist) | Minor | Sim | `global.css` |
| Rótulos curtos em caixa alta | Minor | Parcial | 6 títulos de seção da home em mono maiúsculo |
| Grade 3×3 do Lab | Minor | Leve | Home, `sm:grid-cols-3` |
| Render isométrico | Minor | Não | É a saída real da cena 3D |

O detector elogiou e eu mantive: estilo de prancha técnica (grade, legendas FIG., linha de cota), dados concretos e as 29 verificações aprovadas.

## 2. O que mudou (commits locais)

| Commit | Mudança |
|---|---|
| `c811e3a` | **Travessões zerados** em `src/`, `content/` e `analises/`. Títulos de página: `X \| Lucas Kenzo`. Períodos: meia-risca (`jan 2026 – atual`), igual ao CV. Legenda: `Fig. 1: anel viário, 784 m`. Projetos: `TCC MOVER: gêmeo digital…`, `GiTeam: plataforma…`, `… (SPTrans)`, `FEEDIT: líder de projeto, …`. CV: `cargo · organização`. Valor vazio: `n/d`. Fontes dos dados: `SUSEP: …`, trocado no script Python **e** no JSON, sem regerar (os números não mudam). O separador dos cartões OG em `gerar-og.mjs` passou de `' — '` para `' \| '`, então os cartões continuam com título e subtítulo iguais. |
| `beb0f0e` | **Etiquetas** com cantos retos (`rounded-[3px]`, borda fina, mono), no estilo de prancha. O ponto pulsante (`animate-ping`) ao lado de "Buscando trainee", padrão clássico de template, virou um quadradinho fixo. |
| `9c8f0b6` | **Grade do fundo em SVG**: tile de 32 px em data-URI, com uma cor por tema na variável `--grade`. O visual é o mesmo e não há mais `gradient` no `body`. No Lab, o fundo radial azul virou cor sólida, as listras finas viraram SVG e o bloco final `.md-fim` ficou na cor do painel. |
| `7d1a738` | **Fonte**: Geist e Geist Mono trocadas por IBM Plex Sans (variável) e IBM Plex Mono (400 a 700), auto-hospedadas via @fontsource. Vale para o site, o PDF do CV e os cartões OG. Pacotes da Geist removidos. |
| `e912283` | **Home**: os títulos de seção (Projeto em destaque, Outros projetos, Experiência, Lab, Contato) viraram `h2` normais (`text-xl`, sem caixa alta), com a linha de cota mantida. "Agora" deixou de ser rótulo mono. A grade 3×3 do Lab virou **lista numerada** no estilo de índice de pranchas (01 a 09, nome, técnica), com o mesmo link, a mesma ordem e as mesmas 9 simulações. |
| `2efa3f7` | **Correção**: a IBM Plex é mais larga, então o título do cartão OG quebrava em 3 linhas e a descrição invadia a assinatura. Os tamanhos do título foram reduzidos (88/72/58 px). Conferi os cartões da home e do MOVER. |

| `bba75dc` | **Preload da fonte de texto** em `src/layouts/Base.astro`. A troca de fonte tinha derrubado a nota de desempenho no celular em 1 a 5 pontos, porque a IBM Plex Sans tem 46 KB, contra uns 28 KB da Geist, e entrava tarde. Com o `<link rel="preload">` do arquivo latin, as notas voltaram ao nível de antes (ver a seção 6). |

## 3. O que ficou igual, de propósito

- Todas as funcionalidades: rotas, idiomas PT/EN, tema claro/escuro, ilhas 3D, filtros de projetos, Lab, PDFs, cartões OG, 404, navegação.
- Conteúdo factual: nenhum número, dado ou texto de experiência foi alterado. Só a pontuação.
- Listras amarelo e preto (`.lombada`): são a assinatura do site.
- Avatares redondos e o seletor de versão do currículo: o círculo ali tem função.

## 4. O que não fiz e por quê

- **Legenda "captura da cena Three.js" no render do MOVER**: não achei registro de como o vídeo e o pôster foram gravados. Afirmar isso seria inventar dado. Se você confirmar a origem, é uma linha em `content/projetos.ts`.
- **Rótulos em caixa alta nas outras páginas** (28 `.eyebrow` em Projetos, Sobre, Currículo, Estudo de caso e Lab): mexi só na home, que foi o que o detector analisou. O Lab tem identidade própria, de jogo, onde o mono maiúsculo faz sentido.
- **Par de botões "Ver projetos / Baixar CV"**: o detector aprovou ("Stock CTA pair" ✓), então ficou.

## 5. Efeitos colaterais percebidos

- O Lab usava peso 800 em vários títulos. A IBM Plex vai até 700, então esses títulos ficaram um pouco menos pesados.
- O fundo do Lab perdeu o brilho azul radial e agora é plano, mais sóbrio.
- A troca de fonte custou desempenho no celular até ganhar o preload. Se um dia trocar de fonte de novo, mantenha o preload apontando para o arquivo novo, ou o `import ... ?url` quebra o build.
- A IBM Plex Mono vem em arquivos estáticos (não variável), com 4 pesos. O navegador só baixa os subconjuntos usados (latin), via `unicode-range`.
- Os PDFs do CV foram regerados com a nova fonte e continuam com **1 página** cada.

## 6. Verificação

- `pnpm typecheck`: 0 erros, 0 avisos.
- `pnpm test`: 15 de 15 passando.
- `pnpm build`: ok. 4 PDFs de 1 página, 37 cartões OG.
- `pnpm auditar` (axe, sem JS, SEO, links): 37 páginas, 0 falhas, 0 avisos.
- Busca por `—` no HTML de `dist/` e no texto do PDF: zero.
- Capturas a 390 e 1440 px, temas claro e escuro, comparadas com as da F4: mesmo layout, sem quebra nem rolagem lateral.
- Lighthouse: ver a tabela abaixo.

Lighthouse no celular (desempenho e LCP). Acessibilidade, boas práticas e SEO seguem em 100 em todas as páginas.

| Página | Antes (F4) | Só com a troca de fonte | Final (com preload) |
|---|---|---|---|
| / | 99 · 2,0 s | 96 · 2,4 s | 98 · 2,3 s |
| /projetos/ | 98 · 2,3 s | 94 · 2,7 s | 97 · 2,4 s |
| /projetos/mover/ | 99 · 2,0 s | 96 · 2,4 s | 98 · 2,2 s |
| /sobre/ | 99 · 1,8 s | 98 · 2,0 s | 99 · 1,8 s |
| /curriculo/ | 99 · 2,0 s | 98 · 2,1 s | 99 · 2,0 s |
| /contato/ | 99 · 1,8 s | 98 · 2,1 s | 99 · 1,9 s |
| /lab/ | 96 · 2,6 s | 91 · 3,1 s | 95 · 2,7 s |
| /lab/cidade/ | 66 · 3,8 s | 62 · 4,0 s | 64 · 4,0 s |
| /en/ | 99 · 2,0 s | 95 · 2,6 s | 98 · 2,3 s |

No desktop: 97 a 100 em todas as páginas, como antes. O que sobra de diferença (1 ponto) está dentro da variação normal de uma medição local para outra. Em 3 medições seguidas de `/`, as notas foram 99, 98 e 99.

## 7. Próximos passos sugeridos

1. Revisar visualmente com `pnpm dev`, principalmente a home e o Lab.
2. Se aprovar, publicar com `bash scripts/publicar.sh "mensagem"`. **Só com sua ordem.** Depois, conferir que https://lucaskenz.github.io/mover-campus-3d-site/ continua respondendo 200.
3. Rodar o detector de novo no site publicado e comparar a nota.
4. Opcional: aplicar a mesma limpeza de rótulos em Projetos, Sobre e Currículo.
