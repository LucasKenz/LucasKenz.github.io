# Histórico do projeto (F0 → publicação) e notas para as próximas versões

Documento de passagem para uma nova sessão. Resume tudo o que foi feito, onde está cada coisa, como
regerar, o que ficou pendente e ideias para versões futuras. Detalhe por fase: `docs/PROGRESS.md`;
escolhas e motivos: `docs/DECISIONS.md`; regras: `CLAUDE.md`.

## 1. Regras que valem sempre

- **O site está publicado** em https://lucaskenz.github.io/ (repositório público
  `LucasKenz/LucasKenz.github.io`, desde 10/10/2026). Novo envio **só com ordem explícita** e sempre por
  `bash scripts/publicar.sh "mensagem"`. **Nunca** dar `git push` da branch `main` (ver 6.1).
- **https://lucaskenz.github.io/mover-campus-3d-site/ tem de continuar intacto**: mesmo endereço,
  funcionando e sem ser afetado pelo portfólio. É outro repositório, com o próprio Pages. O portfólio
  nunca pode ter pasta `mover-campus-3d-site`. Depois de cada envio, conferir que o MOVER responde 200 e
  carrega a maquete.
- **Não mexer** em `LucasKenz/mover-campus-3d`, `LucasKenz/mover-campus-3d-site` nem na pasta
  `D:\Minhas coisas\tcc\adptacao\animacao_campus_3d` (só leitura; copiar é permitido).
- **Não inventar** experiência, notas, números ou depoimentos. Falta dado = `TODO` visível em `content/`.
  Todo número dos projetos de dados sai de `content/lab-dados/*.json`, gerado por `analises/`.
- **Repositório público**: telefone, endereço/bairro, data de nascimento, CPF e RG nunca entram. O
  telefone fica só em `private/contato.json` (ignorado). O histórico escolar em PDF tem CPF/RG: nunca usar.
- **Referências de terceiros** (`referencias/`) ficam fora do git. Não copiar código, textos,
  ilustrações nem marcas. O 3ditions proíbe expressamente análise por IA e engenharia reversa
  (`ai-policy.txt`): não investigar. Do sael.net só técnica, nada copiado (`docs/referencias-lab.md`).
- **Páginas do Lab não citam a empresa** de cada processo seletivo (EMS, Safra, AKAD); os fatos públicos
  usados aparecem como "contexto" com link para a notícia.
- **Fases**: mostrar o resultado de cada uma e esperar o OK do usuário.
- "Gerar um doc" = arquivo `.docx` local, não um documento online.
- Commits pequenos, em português, por fase.

## 2. Antes do portfólio: currículo

Feito a partir de `D:\Minhas coisas\Currículos novos` e dos prompts em `D:\Minhas coisas\playlists\vagas`.
Alvo: **Trainee 2027 em tecnologia**, duas áreas: **Full Stack** e **IA com análise de dados**. Programas
em andamento citados pelo usuário: **EMS** (farmacêutica), **Safra** (banco) e **AKAD** (seguros).

Saída em `D:\Minhas coisas\playlists\vagas\saida\` (fora do repositório; contém o telefone): currículos
mestre PT/EN, banco de bullets, quatro currículos de 1 página (`.docx` + `.pdf`) e
`ferramentas/md2docx.py`. O portfólio tem a própria versão do currículo, gerada de `content/`.

## 3. O que foi feito

### 3.1 Fases F0–F4 (base do site)

| Commit | Fase | Resumo |
|---|---|---|
| `7b55d00` | F0 | Referências, 3 direções visuais, stack (`docs/F0.md`, `docs/referencias.md`) |
| `6dc7304` | F1 | Base Astro, `content/` com dados reais, tema claro/escuro, PT/EN, home |
| `7a28b92` | F2 | `/projetos` com filtros, estudos de caso, `/lab` estilo jogo gacha com 3 simulações |
| `0781c69` | Lab premium | Modos Visual e Leve, pós-processamento, qualidade adaptativa, Água infinita |
| `1109ac0` | F3 | `/sobre`, `/contato`, `/curriculo` (Full Stack × IA), PDFs do CV no build |
| `8e9e8cf` | F4 | Barra de topo fixa, cartões OG, 404, auditoria axe/SEO/links, Lighthouse, capturas |

### 3.2 Sessão de 10/10/2026 (tarde): Lab premium, projetos de dados e publicação

| Commit | O quê |
|---|---|
| `d3ad7e5` | **/lab/mover**: maquete real do campus (`campus.glb` copiado do TCC) como diorama de dados com 3 camadas (medido × assumido, rampa da rota, funil das 1.743 árvores) + análise em 9 seções |
| `6415f67` | **Água**: espuma nas cristas pelo jacobiano de Gerstner, barco contornando a ilha, capim e arbustos com vento no shader, 16 gaivotas (boids), cordas e remos |
| `a05cf02` | **Robô**: desgaste nas arestas por shader, LEDs de status, cabos Catmull-Rom, poeira animada só no shader, olhos que piscam |
| `b7d954a` | **Cidade**: hora dourada, neblina baixa, caixas d'água/antenas/neon, rastros de luz dos carros |
| `a92f98b` | **Lentes**: visor 3D com desfoque por pixel pelo círculo de confusão (modo Visual) |
| `e0647b2`, `5dd50b6` | 4 projetos de dados com bases públicas: **seguros** (SUSEP), **banco** (Banco Central SGS), **farma** (Anvisa/CMED/SNGPC), **energia** (ONS + INMET) |
| `5c5f77d`, `2c72d8a` | **6 sub-labs de farmácia** em abas com 3D leve + **ficha técnica** em todas as análises (MOVER incluído) |
| `68d6a72`, `faef8b9` | Fluxo de deploy (`.github/workflows/deploy.yml`), README, `scripts/publicar.sh` |
| público `65ccbee`, `688d29a` | Publicação em https://lucaskenz.github.io/ (commit único limpo + regras) |

#### Projetos de dados: o que cada um responde

| Página | Programa ligado | Dados | Resultado principal |
|---|---|---|---|
| `/lab/seguros` | AKAD (seguros empresariais) | SUSEP SES 2016–2025 | Credibilidade de Bühlmann-Straub erra 27,0 pontos × 27,5 (mercado), ganho pequeno e dito como tal; regra de peso por tamanho da carteira |
| `/lab/banco` | Safra (crédito PJ) | SGS 2011–2026 | Selic antecede inadimplência PJ em 11 meses (r = 0,77); previsão de 6 meses 11 % melhor que o ingênuo, 79 % de acerto de direção; Selic +3 p.p. ≈ +0,41 p.p. |
| `/lab/farma` | EMS (genéricos) | CMED, registros, SNGPC jan e jul/2026 | Desconto mediano de 35 % (regra CMED); hipótese de concorrência rejeitada; antibióticos no inverno; triagem de oportunidades |
| `/lab/farma#sublabs` | EMS (o que não deu certo) | idem + IBGE + simulação | GLP-1 (liraglutida 2,1 % das unidades), compra da Medley (14 moléculas novas, 18 alertas de concentração), uniformidade (CV ≤ 6 %), biológicos, antibióticos infantis, cobertura do SNGPC |
| `/lab/energia` | — | ONS + INMET 2025 | Virada em 23,5 °C, +764 MW/°C; previsão do dia seguinte com MAPE 4,0 % (6,7 % ingênuo) |

Cada análise tem **ficha técnica**: objetivo, por quê, variável alvo, preditoras, método, métrica,
validação e se o objetivo foi atingido (`content/lab-historias/fichas.ts`, `fichas-mover.ts` e o campo
`ficha` dos sub-labs). Aparece recolhida em cada seção e reunida em "Como funciona".

### 3.3 Estado atual (10/10/2026)

- 41 páginas no build (PT e EN), 9 entradas no Lab (MOVER, seguros, banco, farma, energia, cidade, robô,
  lentes, água), 37 páginas auditadas: **0 falhas, 0 avisos**. `pnpm typecheck` 0 erros, `pnpm test` 15/15.
- fps no notebook (Intel UHD 630, 1440 × 900, build), Visual/Leve: MOVER 45/60, cidade 52/60, robô 31/60,
  água 42/58; cenas de barras de dados começam em q2 e descem para 40–60 fps.
- Site publicado; MOVER conferido antes e depois de cada envio (200, mesmo SHA-256 do HTML, assets ok).

## 4. Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `content/` | Fonte única de textos e dados do site, bilíngue `{ pt, en }` |
| `content/lab.ts` | Entradas do Lab (ordem, nome, frase, "Como funciona") |
| `content/mover-dados.json`, `mover-texto.ts` | Dados e textos de `/lab/mover` (gerados por `scripts/preparar-mover.mjs`) |
| `content/lab-dados/*.json` | Saídas das análises Python (pequenas, versionadas) |
| `content/lab-historias/` | Textos e gráficos das histórias de dados, sub-labs (`farma-sublabs.ts`) e fichas |
| `analises/` | Scripts Python das análises + `README.md` + `requirements.txt` |
| `src/components/HistoriaDados.astro`, `SubLabs.astro`, `MoverDados.astro` | Páginas de dados |
| `src/components/dados/` | `Grafico.astro` (SVG no build), `FichaAnalise.astro`, `tipos.ts` |
| `src/lab/` | Cenas 3D: `mover/`, `dados/` (`Barras3D`, `Mini3D`, `matrizes.ts`), `cidade/`, `robo/`, `lentes/`, `agua/`, `comum/` |
| `src/lab/comum/Adiado.tsx` | Carrega a cena 3D depois do `load`; mapa `cenas` por slug |
| `public/media/` | Mídia e pôsteres `lab-<slug>.webp`; `media/mover/campus.glb` |
| `scripts/` | Pós-build e qualidade, `preparar-mover.mjs`, `baixar-dados.sh`, `publicar.sh` |
| `.github/workflows/deploy.yml` | Build + deploy no GitHub Pages (trava contra pasta `mover-campus-3d-site`) |
| `private/` | **Ignorado**: `contato.json`, PDFs com telefone, `dados/` (~3,7 GB de bases públicas), `.venv` |
| `docs/` | Decisões, progresso, licenças, referências, capturas, auditoria, Lighthouse |

## 5. Comandos

```sh
pnpm dev                     # http://localhost:4321
pnpm build                   # site + PDFs do CV + cartões OG
pnpm typecheck && pnpm test
pnpm auditar                 # depois do build; precisa dar 0 falhas
bash scripts/publicar.sh "mensagem"   # só com ordem explícita do usuário
```

Dados (ver `analises/README.md`):

```sh
bash scripts/baixar-dados.sh ons inmet anvisa susep    # confere o tamanho de cada arquivo
env -u PYTHONPATH private/.venv/Scripts/python -s analises/seguros.py
env -u PYTHONPATH private/.venv/Scripts/python -s analises/banco.py
MESES=202601,202607 env -u PYTHONPATH private/.venv/Scripts/python -s analises/farma.py
env -u PYTHONPATH private/.venv/Scripts/python -s analises/farma_sublabs.py   # lê 2,4 GB do SNGPC (~10 min)
env -u PYTHONPATH private/.venv/Scripts/python -s analises/farma_estrategia.py
env -u PYTHONPATH private/.venv/Scripts/python -s analises/energia.py
node scripts/preparar-mover.mjs                          # dados do MOVER (lê o TCC, só leitura)
```

## 6. Armadilhas conhecidas (ler antes de mexer)

1. **Publicação**: o repositório público tem histórico próprio (branch local `publico` → `origin/main`).
   O histórico de `main` contém `referencias/1.png`, `2.png`, `3.png` e `Sem título.png` (capturas de
   sites de terceiros). `scripts/publicar.sh` copia só a árvore atual (`git read-tree -u --reset main`).
   Nunca `git push origin main`.
2. **`pnpm dev` mostrando só a capa no Lab** (`_jsxDEV is not a function`): `typecheck`/`build` com o dev
   aberto deixam o cache do Vite velho. Parar o dev, apagar `node_modules/.vite`, `pnpm dev --force`.
3. **Python**: `PYTHONPATH` global aponta para `D:\Lib\site-packages` (numpy de outra versão). Rodar sempre
   com `env -u PYTHONPATH ... python -s`. O venv fica em `private/.venv` (Python 3.14).
4. **Downloads**: o servidor do Banco Central devolve 503 depois de muitas tentativas (por isso o projeto de
   banco usa a API do SGS, não o SCR.data). A API do IBGE responde em gzip. O SNGPC não tem os meses de
   2021-11 a 2025-12 e cada mês de 2026 tem ~1,1–1,3 GB.
5. **SNGPC**: desde 2025 os GLP-1 usam a mesma receita retida dos antimicrobianos (tipo 5): separar. A
   cobertura muda entre meses (+27 % jan → jul) e entre estados (15×): normalizar antes de comparar.
6. **CMED** não marca o produto de referência: o original aparece como "Novo". O preço é teto, não preço
   praticado.
7. **Desempenho 3D**: atualizar buffers a cada quadro (instâncias, pontos) derrubava ~12 fps no
   ANGLE/D3D11; preferir animar no shader com uniforms. Medir fps sempre no build, não no dev, e
   lembrar que o notebook varia com a temperatura (o mesmo teste deu 45 e 38 fps em horários diferentes).
8. **Heredocs com aspas** quebram o bash da ferramenta: para patches longos, escrever um `.py` no
   scratchpad e rodar.
9. **GitHub Pages**: ao criar o repositório, o Pages é ativado sozinho em modo "legacy" (branch); trocar
   para `build_type=workflow` (`gh api -X PUT repos/LucasKenz/LucasKenz.github.io/pages -f build_type=workflow`).

## 7. Notas para versões futuras

### 7.1 Pendências conhecidas (dados e textos)

- **Conferir com o usuário**:
  - o estudo de caso do MOVER diz 411 árvores na web (o arquivo atual tem 415);
  - o currículo diz 362 testes offline (o relatório da rodada 10 diz 353);
  - o código do mapa está no repositório de outro membro do grupo (`vitorhbp/mover-simulador`), então
    vale rever o "fiz todas as partes".
- Texto de `/sobre`: duas frases são interpretação; ajustar para a voz do usuário.
- **Biológicos** e **triagem de genéricos**: falta checar patente (INPI) e bioequivalência para fechar as listas.
- **Farma**: só 2 meses do SNGPC (jan e jul/2026). Com mais meses de 2026 baixados, refazer a sazonalidade
  como série e conferir o salto do ciprofloxacino (provável problema de cadastro).
- **Banco**: tentar de novo o SCR.data (`scrdata_AAAA.zip`), devagar, para o corte por porte × CNAE × UF.
- **Energia**: trocar a temperatura observada por previsão do tempo real (hoje é o limite superior do ganho)
  e incluir mais anos.

### 7.2 Ideias que ficaram de fora

- Projeto de **atrasos de voos** (ANAC VRA + chuva do INMET em Guarulhos e Congonhas); o VRA mensal baixa
  sem cadastro (`siros.anac.gov.br/siros/registros/diversos/vra/AAAA/VRA_AAAA_MM.csv`).
- Lab: reflexo do barco na água, som ambiente, corte da objetiva com vidro 3D, câmera cinematográfica na
  cidade, cena nova do riacho.
- Robô no Visual a ~31 fps em q2: começar em q1 no desktop daria ~50.
- Levar os projetos de dados para `/projetos` e para o currículo de IA e Dados (bullets com os números de
  cada análise).
- Sub-labs no mesmo formato para seguros (AKAD) e banco (Safra): o componente `SubLabs.astro` e o
  `Mini3D` já são genéricos; basta um `content/lab-historias/<slug>-sublabs.ts` e ligar em `LabPagina.astro`.
- Pinar os ramos de seguros com nome de empresa só se o usuário pedir (hoje nenhuma página cita empresa).

### 7.3 Depois de qualquer mudança

1. `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm auditar` (0 falhas).
2. Cena 3D mudou: medir fps com GPU (Playwright `--use-angle=d3d11 --ignore-gpu-blocklist`, `?debug`) e
   atualizar o pôster `public/media/lab-<slug>.webp`.
3. Anotar em `docs/PROGRESS.md` (só acrescentar) e, se for decisão, em `docs/DECISIONS.md`.
4. Commit pequeno em português. Publicar só se o usuário pedir, com `scripts/publicar.sh`, e conferir o
   MOVER depois.
