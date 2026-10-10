# Análises dos projetos de dados do Lab

Cada script lê dados públicos baixados em `private/dados/` (fora do git) e grava um JSON pequeno em
`content/lab-dados/`, que o site usa no build. Os textos das páginas ficam em `content/lab-historias/`.

| Script | Página | Fontes |
|---|---|---|
| `seguros.py` | `/lab/seguros` | SUSEP, Base de Dados do SES (`Ses_seguros.csv`) |
| `banco.py` | `/lab/banco` | Banco Central, API do SGS (baixa sozinho para `private/dados/bcb/sgs/`) |
| `farma.py` | `/lab/farma` | Anvisa: lista de preços CMED (PMC), registros de medicamentos, SNGPC (jan e jul de 2026) |
| `energia.py` | `/lab/energia` | ONS, curva de carga horária 2025 · INMET, estações A701 e A771 |

## Como rodar

```sh
bash scripts/baixar-dados.sh ons inmet anvisa susep   # ~4 GB; confere o tamanho de cada arquivo
unzip private/dados/inmet/2025.zip "2025/INMET_SE_SP_A7[07]1*" -d private/dados/inmet
unzip private/dados/susep/BaseCompleta.zip Ses_seguros.csv -d private/dados/susep/ext
python -m venv private/.venv
private/.venv/Scripts/python -s -m pip install -r analises/requirements.txt
private/.venv/Scripts/python -s analises/seguros.py
private/.venv/Scripts/python -s analises/banco.py
MESES=202601,202607 private/.venv/Scripts/python -s analises/farma.py
private/.venv/Scripts/python -s analises/energia.py
```

No Windows deste projeto, `PYTHONPATH` aponta para outra instalação: rode com `env -u PYTHONPATH` e `-s`.

## Regras

- Nenhum número das páginas é digitado à mão: todos saem destes JSON.
- Toda validação de modelo é feita no futuro em relação ao treino (sem vazamento).
- Cada página tem uma seção de limites, que diz o que os dados não permitem concluir.
