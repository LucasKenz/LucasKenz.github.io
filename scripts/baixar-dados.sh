#!/usr/bin/env bash
# Downloads the public datasets used by the Lab data projects into private/dados/ (ignored by git).
# Each file is checked against the server's Content-Length and retried until it matches.
# Usage: bash scripts/baixar-dados.sh [grupo...]   grupos: ons inmet anvisa susep bcb
set -u
DEST="private/dados"
UA="Mozilla/5.0"

baixar() { # url destino
  local url="$1" arq="$2" tam atual
  mkdir -p "$(dirname "$arq")"
  tam=$(curl -sIL -m 60 -A "$UA" "$url" | grep -i '^content-length' | tail -1 | tr -dc '0-9')
  for tentativa in $(seq 1 80); do
    atual=$(stat -c %s "$arq" 2>/dev/null || echo 0)
    if [ -n "$tam" ] && [ "$atual" = "$tam" ]; then echo "ok  $arq ($tam bytes)"; return 0; fi
    if [ -n "$tam" ] && [ "$atual" -gt "$tam" ]; then rm -f "$arq"; fi
    curl -sL -C - -m 3600 -A "$UA" -o "$arq" "$url" || sleep 3
  done
  echo "FALHOU $arq (esperado $tam, tem $(stat -c %s "$arq" 2>/dev/null))"; return 1
}

grupos="${*:-ons inmet anvisa susep bcb}"
for g in $grupos; do
  case $g in
    ons) baixar https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/curva-carga-ho/CURVA_CARGA_2025.csv "$DEST/ons/CURVA_CARGA_2025.csv" ;;
    inmet) baixar https://portal.inmet.gov.br/uploads/dadoshistoricos/2025.zip "$DEST/inmet/2025.zip" ;;
    anvisa)
      baixar https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv "$DEST/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv"
      baixar "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file" "$DEST/anvisa/lista_pmc.xlsx"
      for m in 01 02 03 04 05 06 07 08 09 10; do
        baixar "https://dados.anvisa.gov.br/dados/SNGPC/Industrializados/EDA_Industrializados_2026$m.csv" "$DEST/anvisa/EDA_Industrializados_2026$m.csv"
      done ;;
    susep) baixar "https://www2.susep.gov.br/redarq.asp?arq=BaseCompleta%2ezip" "$DEST/susep/BaseCompleta.zip" ;;
    bcb) for a in 2023 2024 2025 2026; do baixar "https://www.bcb.gov.br/pda/desig/scrdata_$a.zip" "$DEST/bcb/scrdata_$a.zip"; done ;;
  esac
done
