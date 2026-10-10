# Lucas Kenzo — portfólio

Site pessoal (portfólio, currículo e Lab) publicado em **https://lucaskenz.github.io/**.

- **Projetos:** estudos de caso (TCC MOVER, Serpentina, Onepage e outros).
- **Currículo:** versão web e PDFs gerados no build a partir do mesmo conteúdo.
- **Lab:** simulações 3D (cidade procedural, robô por cinemática inversa, lentes, água) e projetos de
  dados com bases públicas brasileiras: MOVER, seguros empresariais (SUSEP), risco de crédito (Banco
  Central), genéricos e estratégia farmacêutica (Anvisa/CMED/SNGPC) e carga elétrica (ONS/INMET).
  Cada análise tem uma ficha com objetivo, motivo, variável alvo, preditoras, método, métrica,
  validação e resultado.

A maquete 3D do MOVER continua em seu próprio endereço, https://lucaskenz.github.io/mover-campus-3d-site/,
num repositório separado; este site só aponta para ela.

## Stack

Astro 7 (HTML estático) · React 19 e React Three Fiber só nas ilhas 3D · Tailwind 4 · TypeScript ·
Python (pandas, scikit-learn) nas análises em `analises/` · Playwright para PDFs, cartões OG e auditoria.

## Comandos

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # site + PDFs do currículo + cartões de compartilhamento
pnpm preview      # http://localhost:4322
pnpm typecheck
pnpm test
pnpm auditar      # acessibilidade (axe), leitura sem JS, SEO e links, depois do build
```

As análises de dados têm seu próprio passo a passo em [`analises/README.md`](analises/README.md).

## Créditos

Fontes, HDRIs e bases de dados usadas estão em [`docs/LICENSES.md`](docs/LICENSES.md).
