# Portfólio Lucas Kenzo — memória do projeto

Site pessoal (portfólio + currículo) para `https://lucaskenz.github.io/` (site de usuário do GitHub Pages).
Leia primeiro `docs/HISTORICO.md` (tudo o que foi feito, armadilhas conhecidas e notas para versões futuras), `docs/DECISIONS.md` e `docs/PROGRESS.md` (só acrescentar).

## Regras
- **Publicado** em https://lucaskenz.github.io/ (repositório público `LucasKenz/LucasKenz.github.io`, desde 10/10/2026, por ordem do usuário). Novo envio só com ordem explícita, sempre por `bash scripts/publicar.sh "mensagem"`: ele copia a árvore de `main` para a branch `publico` (histórico próprio e limpo) e envia. **Nunca** dar push de `main`: o histórico local tem imagens de terceiros (`referencias/`).
- **https://lucaskenz.github.io/mover-campus-3d-site/ deve continuar intacto**: é outro repositório, servido à parte. O portfólio nunca pode ter pasta `mover-campus-3d-site` (o script e o fluxo de deploy conferem). Depois de cada envio, conferir que o MOVER responde 200 e carrega.
- Não mexer em `LucasKenz/mover-campus-3d`, `LucasKenz/mover-campus-3d-site` nem na pasta `D:\Minhas coisas\tcc\adptacao\animacao_campus_3d` (só leitura).
- Não inventar dados pessoais, números ou experiência. Falta dado = `TODO` visível no `content/`.
- Telefone, bairro, data de nascimento, CPF/RG nunca entram no repositório (repositório será público). O PDF com telefone é gerado só em `private/` (ignorado).
- Commits em português, pequenos, por fase.

## Stack
Astro 7 (estático) · React 19 só nas ilhas 3D (`client:visible`) · Tailwind 4 (tokens em `src/styles/global.css`) · TypeScript estrito · Geist auto-hospedada (@fontsource) · pnpm · Python 3.14 (pandas, scikit-learn) nas análises, venv em `private/.venv` (rodar com `env -u PYTHONPATH ... python -s`).

## Onde fica cada coisa
- `content/` — fonte única de dados (perfil, experiência, projetos, lab, habilidades, cursos). Textos bilíngues `{ pt, en }`. Site e PDFs leem daqui.
- `src/components/Home.astro` — home (PT em `/`, EN em `/en/`).
- `src/i18n/ui.ts` — textos de interface e helpers de data/rota.
- `public/media/` — mídia otimizada (vídeo mp4/webm, webp).
- `docs/` — referências, F0, decisões, progresso, capturas, Lighthouse.
- `analises/` — scripts Python das análises de dados → `content/lab-dados/*.json`; textos e fichas em `content/lab-historias/`.
- `src/lab/` — cenas 3D por slug; `src/lab/dados/` (`Barras3D`, `Mini3D`); carregamento em `src/lab/comum/Adiado.tsx`.
- `private/dados/` — bases públicas baixadas (~3,7 GB, ignoradas), por `scripts/baixar-dados.sh`.

## Comandos
- `pnpm dev` (porta 4321) · `pnpm build` (site + PDFs do CV + cartões OG) · `pnpm preview` (4322) · `pnpm typecheck` · `pnpm test`
- Lab só mostra a capa no `pnpm dev` (`_jsxDEV is not a function` no console): cache do Vite velho. Parar o dev, apagar `node_modules/.vite` e rodar `pnpm dev --force`.
- Qualidade (depois do build): `pnpm auditar` (axe, sem JS, SEO, links; `-- --externos`) · `pnpm lighthouse` · `pnpm capturas`
