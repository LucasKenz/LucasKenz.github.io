# Histórico da sessão de construção (F0 → F4) e próximos passos

Documento de passagem para uma nova sessão. Resume tudo o que foi feito, onde está cada coisa, o que
falta e como fazer. Para o detalhe por fase, veja `docs/PROGRESS.md`; para as escolhas e os motivos,
`docs/DECISIONS.md`; para as regras do projeto, `CLAUDE.md`.

## 1. Regras que valem sempre

- **Não publicar**: nada de push, repositório remoto ou deploy sem ordem explícita. Publicação só
  **depois de novembro de 2026**. Antes de criar o repositório público `LucasKenz/LucasKenz.github.io`
  e antes do primeiro push, perguntar.
- **Não mexer** em `LucasKenz/mover-campus-3d`, `LucasKenz/mover-campus-3d-site` nem na pasta
  `D:\Minhas coisas\tcc\adptacao\animacao_campus_3d` (só leitura).
- **Não inventar** experiência, notas, números ou depoimentos. Falta dado = `TODO` visível em `content/`.
- **Repositório será público**: telefone, endereço/bairro, data de nascimento, CPF e RG nunca entram.
  O telefone fica só em `private/contato.json` (ignorado pelo git). O histórico escolar em PDF tem
  CPF/RG: nunca usar.
- **Referências de terceiros** (`referencias/`) ficam fora do git. Não copiar código, textos,
  ilustrações nem marcas. Fontes e imagens só com licença livre e crédito em `docs/LICENSES.md`.
- **Fases**: mostrar o resultado de cada uma e esperar o OK do usuário.
- "Gerar um doc" = arquivo `.docx` local, não um documento online.
- Commits pequenos, em português, por fase.

## 2. Antes do portfólio: currículo

Feito a partir de `D:\Minhas coisas\Currículos novos` e dos prompts em `D:\Minhas coisas\playlists\vagas`.
Alvo: **Trainee 2027 em tecnologia**, duas áreas: **Full Stack** e **IA com análise de dados**.

Saída em `D:\Minhas coisas\playlists\vagas\saida\` (fora do repositório; contém o telefone):

- `curriculo_mestre_PT.md`, `curriculo_mestre_EN.md`: versão longa com tudo.
- `banco_de_bullets.md`, `mudancas_e_porques.md`.
- Quatro currículos de 1 página (`.docx` + `.pdf`): Full Stack e IA/Dados, em PT e EN.
- `ferramentas/md2docx.py`: gera os `.docx` (python-docx); o Word exporta o PDF e conta as páginas.

O portfólio tem a própria versão do currículo, gerada a partir de `content/` (ver F3).

## 3. O que foi feito no portfólio

Repositório local `D:\Minhas coisas\portifolio`, branch `main`, **sem remoto**.

| Commit | Fase | Resumo |
|---|---|---|
| `7b55d00` | F0 | Pesquisa de referências, 3 direções visuais, escolha de stack (`docs/F0.md`, `docs/referencias.md`) |
| `6dc7304` | F1 | Base Astro, `content/` com dados reais, tema claro/escuro, PT/EN, home |
| `7a28b92` | F2 | `/projetos` com filtros, estudos de caso (MOVER, Serpentina, Onepage), `/lab` estilo jogo gacha com 3 simulações |
| `0781c69` | Lab premium | Modos Visual e Leve, pós-processamento, qualidade adaptativa, simulação 04 Água infinita |
| `1109ac0` | F3 | `/sobre`, `/contato`, `/curriculo` (Full Stack × IA), PDFs do CV gerados no build |
| `8e9e8cf` | F4 | Barra de topo fixa, cartões OG, 404, auditoria axe/SEO/links, Lighthouse, capturas |

### Decisões do usuário ao longo do caminho

- Direção **A "Prancheta"** (grade de desenho técnico, listras de lombada) + prévia que segue o
  cursor ao passar sobre os projetos.
- Miniatura animada do MOVER no topo **removida** (o projeto já aparece logo abaixo).
- Todas as habilidades em **avançado**.
- Os SaaS (Serpentina, Onepage) entram como apresentação estática; o nome pode aparecer.
- `/lab` no formato de site de **jogo gacha** (referência: site do Zenless Zone Zero): tela de
  seleção + uma página por simulação.
- Qualidade do Lab no nível de sael.net / 3ditions em **todas** as páginas, com dois modos:
  **Visual** (bonito, mais pesado) e **Leve** (rápido, foco em explicação).
- **Barra de topo sempre visível** em todas as páginas (Projetos, Sobre, Currículo, Lab, Contato),
  inclusive na home e no celular, **sem barra de rolagem nem setas**.

### Estado atual

- 27 páginas (PT em `/`, EN em `/en/`) + 404.
- Auditoria: **0 falhas, 0 avisos** (axe WCAG 2.2 AA em claro/escuro e 1440/390, sem JS, SEO, links).
- Lighthouse: páginas de conteúdo 96–100 em desempenho e 100 nas demais categorias; cena da cidade
  66 (celular) / 98 (desktop).
- fps na GPU do notebook (Intel UHD 630, 1440×900), Visual/Leve: cidade 57/60, robô 61/54, água 49/48.
- `pnpm typecheck` 0 erros, `pnpm test` 15/15, PDFs do CV com 1 página cada.

## 4. Onde fica cada coisa

| Caminho | O que é |
|---|---|
| `content/` | Fonte única de dados (perfil, experiência, projetos, lab, habilidades, cursos), textos `{ pt, en }` |
| `src/components/` | Páginas e peças: `Home`, `Topo`, `Sidebar`, `ProjetosPagina`, `EstudoPagina`, `SobrePagina`, `ContatoPagina`, `CurriculoPagina`, `CvDocumento`, `LabSelecao`, `LabPagina`, `LabTopo` |
| `src/layouts/Base.astro` | `<head>`: SEO, hreflang, Open Graph, JSON-LD, tema antes da pintura |
| `src/lab/` | Simulações: `cidade/`, `robo/`, `lentes/`, `agua/`; `comum/` (pós-processamento, qualidade, fps, carregamento adiado) |
| `src/styles/` | `global.css` (tokens e tema), `lab.css` (visual do Lab) |
| `public/` | Mídia (`media/`), HDRIs CC0 (`hdri/`), PDFs públicos do CV (`cv/`), ícones |
| `scripts/` | Pós-build e qualidade (abaixo) |
| `tests/` | Vitest: óptica (profundidade de campo), cidade determinística, IK, mola |
| `private/` | **Ignorado pelo git**: `contato.json` (telefone) e PDFs completos do CV |
| `docs/` | Decisões, progresso, licenças, prompts, capturas, auditoria, Lighthouse |

## 5. Comandos

```sh
pnpm dev           # http://localhost:4321
pnpm build         # site + PDFs do CV (scripts/gerar-cv.mjs) + cartões OG (scripts/gerar-og.mjs)
pnpm preview       # http://localhost:4322
pnpm typecheck     # astro check
pnpm test          # vitest
# Depois do build:
pnpm auditar       # axe, sem JS, SEO, links internos -> docs/auditoria/relatorio.md
pnpm auditar -- --externos   # também links externos
pnpm lighthouse    # docs/lighthouse/ (README com a tabela; relatórios completos fora do git)
pnpm capturas      # docs/capturas/f4/<largura>/ (fora do git); --larguras=360,1440 --so=lab
```

O telefone entra só nos PDFs de `private/`: crie `private/contato.json` com
`{ "telefone": "+55 (11) 9xxxx-xxxx" }` e rode `pnpm build`.

## 6. O que falta e como fazer

### 6.1 Lab premium (próxima sessão)

O prompt pronto está em **`docs/prompts/lab_premium.md`**. Cole esse arquivo na nova sessão. Ele tem
o estado atual, o que faz as referências parecerem caras, as tarefas por cena em ordem de impacto e
as regras de desempenho.

Checklist de cada mudança no Lab:

1. Trabalhar uma cena por vez, nos dois modos (`?modo=visual` e `?modo=leve`).
2. Medir fps com GPU real: Playwright com `--use-angle=d3d11 --ignore-gpu-blocklist`, `?debug` mostra fps.
   Metas: Leve 60 fps no notebook; Visual 45+ fps.
3. Capturas 1440 e 390 nos dois modos em `docs/capturas/lab/`; se mudar o visual, atualizar o pôster
   `public/media/lab-<slug>.webp`, que aparece na seleção, no carregamento e no cartão OG.
4. `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm auditar` (0 falhas).
5. Assets só CC0, registrados em `docs/LICENSES.md`.
6. Anotar em `docs/PROGRESS.md` (só acrescentar) e commit pequeno em português.

Uma cena nova entra em `content/lab.ts` (texto e "Como funciona"), no mapa `cenas` de
`src/lab/comum/Adiado.tsx` e em `src/components/LabPagina.astro`.

### 6.2 Revisões que dependem do usuário

- Texto de `/sobre` (`src/components/SobrePagina.astro`): duas frases são interpretação a partir dos
  fatos. Ajustar para a voz do usuário.
- Conferir os 4 PDFs em `public/cv/` e os cartões OG (amostras em `docs/capturas/f4/og/`).

### 6.3 F5: publicação (só depois de novembro de 2026, com autorização explícita)

1. **Perguntar** antes de criar o repositório público `LucasKenz/LucasKenz.github.io`.
2. Antes do push, verificar:
   - `git ls-files | grep -iE "private|referencias"` não retorna nada;
   - os PDFs públicos não têm telefone (`pdftotext public/cv/*.pdf -`);
   - `pnpm build && pnpm auditar` sem falhas.
3. Criar `.github/workflows/deploy.yml` com o fluxo oficial do Pages:
   - checkout → pnpm + Node → `pnpm install --frozen-lockfile`;
   - `pnpm exec playwright install --with-deps chromium` (necessário para os PDFs e os cartões OG);
   - `pnpm build` → `actions/configure-pages` → `actions/upload-pages-artifact` (pasta `dist`)
     → `actions/deploy-pages`.
   - Sem `base` (site de usuário na raiz).
   - Opcional: um job que roda `pnpm auditar` e falha o deploy se houver falhas.
4. README do repositório: o que é, stack, comandos, créditos (`docs/LICENSES.md`).
5. **Perguntar** antes do primeiro push. Depois, nas configurações do repositório, ativar o Pages com
   a origem "GitHub Actions".
6. Depois de no ar: testar os cartões OG (LinkedIn Post Inspector), enviar o sitemap
   (`/sitemap-index.xml`) ao Google Search Console e rodar `pnpm auditar -- --externos`.
7. Atualizar o link do site no LinkedIn e nos currículos de `saida/`.

### 6.4 Melhorias opcionais (não pedidas)

- Desempenho da cena da cidade no celular (66): dividir o pacote do pós-processamento ou começar
  direto no modo Leve em celulares.
- Medir fps num celular real (até agora só notebook).
- O documento online antigo do currículo está desatualizado. Os arquivos certos são os de `saida/`.
