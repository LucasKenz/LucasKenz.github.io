# Portfólio Lucas Kenzo — memória do projeto

Site pessoal (portfólio + currículo) para `https://lucaskenz.github.io/` (site de usuário do GitHub Pages).
Leia também `docs/HISTORICO.md` (resumo da construção e próximos passos), `docs/DECISIONS.md` e `docs/PROGRESS.md` (só acrescentar).

## Regras
- **Nada de push, repositório remoto ou deploy** sem ordem explícita. Publicação só depois de novembro/2026.
- Não mexer em `LucasKenz/mover-campus-3d`, `LucasKenz/mover-campus-3d-site` nem na pasta `D:\Minhas coisas\tcc\adptacao\animacao_campus_3d` (só leitura).
- Não inventar dados pessoais, números ou experiência. Falta dado = `TODO` visível no `content/`.
- Telefone, bairro, data de nascimento, CPF/RG nunca entram no repositório (repositório será público). O PDF com telefone é gerado só em `private/` (ignorado).
- Commits em português, pequenos, por fase.

## Stack
Astro 7 (estático) · React 19 só nas ilhas 3D (`client:visible`) · Tailwind 4 (tokens em `src/styles/global.css`) · TypeScript estrito · Geist auto-hospedada (@fontsource) · pnpm.

## Onde fica cada coisa
- `content/` — fonte única de dados (perfil, experiência, projetos, lab, habilidades, cursos). Textos bilíngues `{ pt, en }`. Site e PDFs leem daqui.
- `src/components/Home.astro` — home (PT em `/`, EN em `/en/`).
- `src/i18n/ui.ts` — textos de interface e helpers de data/rota.
- `public/media/` — mídia otimizada (vídeo mp4/webm, webp).
- `docs/` — referências, F0, decisões, progresso, capturas, Lighthouse.

## Comandos
- `pnpm dev` (porta 4321) · `pnpm build` (site + PDFs do CV + cartões OG) · `pnpm preview` (4322) · `pnpm typecheck` · `pnpm test`
- Lab só mostra a capa no `pnpm dev` (`_jsxDEV is not a function` no console): cache do Vite velho. Parar o dev, apagar `node_modules/.vite` e rodar `pnpm dev --force`.
- Qualidade (depois do build): `pnpm auditar` (axe, sem JS, SEO, links; `-- --externos`) · `pnpm lighthouse` · `pnpm capturas`
