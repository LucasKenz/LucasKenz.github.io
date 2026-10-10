#!/usr/bin/env bash
# Publishes the current state of `main` to GitHub Pages (https://lucaskenz.github.io/).
# The public repository has its own clean history (branch `publico` -> origin/main): the local `main`
# history contains third-party reference images and must never be pushed.
# Only run with the author's explicit order. Usage: bash scripts/publicar.sh "mensagem do commit"
set -euo pipefail

if [ "$(git branch --show-current)" != "main" ]; then echo "Rode a partir da branch main."; exit 1; fi
if ! git diff --quiet || ! git diff --cached --quiet; then echo "Há mudanças sem commit em main."; exit 1; fi
if [ -e dist/mover-campus-3d-site ] || [ -e public/mover-campus-3d-site ]; then
  echo "Pasta mover-campus-3d-site no portfólio: isso esconderia o site do MOVER. Abortado."; exit 1
fi
if git ls-tree -r --name-only main | grep -qiE '^(private|referencias)/'; then echo "Arquivo privado ou de referência versionado. Abortado."; exit 1; fi

git checkout -q publico
git read-tree -u --reset main          # same tree as main, publico keeps its own short history
git commit -qm "${1:-Atualiza o portfólio}" || echo "Nada novo para publicar."
git push origin publico:main
git checkout -q main
echo "Enviado. Acompanhe: gh run list -R LucasKenz/LucasKenz.github.io --limit 1"
