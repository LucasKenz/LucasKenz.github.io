"""Sub-labs for /lab/farma: where (per capita by state), who (age x sex), who prescribes, controlled drugs
and the price ladder by therapeutic class.

Inputs : private/dados/anvisa/EDA_Industrializados_202601.csv and _202607.csv (SNGPC)
         private/dados/anvisa/lista_pmc.xlsx (CMED)
         IBGE population estimates 2025 (API, cached in private/dados/ibge/pop_uf_2025.json)
Output : content/lab-dados/farma-sublabs.json
Run    : private/.venv/Scripts/python -s analises/farma_sublabs.py
"""
import gzip
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

SAIDA = Path('content/lab-dados/farma-sublabs.json')
POP = Path('private/dados/ibge/pop_uf_2025.json')
MESES = ['202601', '202607']
GLP1 = ('TIRZEPATIDA', 'SEMAGLUTIDA', 'LIRAGLUTIDA', 'DULAGLUTIDA')
UF_SIGLA = {'11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB',
            '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS',
            '51': 'MT', '52': 'GO', '53': 'DF'}
FAIXAS = [0, 5, 15, 25, 35, 45, 55, 65, 75, 200]
ROT_FAIXAS = ['0–4', '5–14', '15–24', '25–34', '35–44', '45–54', '55–64', '65–74', '75+']


def r(x, k=3):
    return None if x is None or not np.isfinite(x) else round(float(x), k)


def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'\s+', ' ', s).strip()


# ---------- population ----------
if not POP.exists():
    POP.parent.mkdir(parents=True, exist_ok=True)
    url = 'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2025/variaveis/9324?localidades=N3%5Ball%5D'
    corpo = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
    POP.write_bytes(gzip.decompress(corpo) if corpo[:2] == bytes([0x1F, 0x8B]) else corpo)  # the API answers gzip
pop = {UF_SIGLA[s['localidade']['id']]: int(s['serie']['2025']) for s in json.loads(POP.read_text(encoding='utf8'))[0]['resultados'][0]['series']}

# ---------- SNGPC, chunked ----------
agg = {m: {} for m in MESES}
idade_unid = {}
for m in MESES:
    arq = f'private/dados/anvisa/EDA_Industrializados_{m}.csv'
    cols = pd.read_csv(arq, sep=';', encoding='latin1', nrows=0).columns
    conselho = [c for c in cols if c.startswith('NO_CONSE')][0]
    for ch in pd.read_csv(arq, sep=';', encoding='latin1', chunksize=2_000_000, dtype=str,
                          usecols=['SG_UF_VENDA', 'DS_PRINCIPIO_ATIVO', 'QT_VENDIDA', conselho, 'TP_RECEITUARIO', 'SG_SEXO', 'NU_IDADE', 'NU_UNIDADE_IDADE']):
        ch['q'] = pd.to_numeric(ch.QT_VENDIDA, errors='coerce').fillna(0)
        ch['pa'] = ch.DS_PRINCIPIO_ATIVO.map(norm)
        glp = ch.pa.str.contains('|'.join(GLP1), regex=True)
        tipo5 = ch.TP_RECEITUARIO.fillna('').str.startswith('5')
        ch['grupo'] = np.where(glp, 'glp1', np.where(tipo5, 'antimicrobiano', 'controlado'))
        ch['conselho'] = ch[conselho].fillna('?').str.strip()
        # age: unit 1 = years; other units (months/days) are under one year old
        idade = pd.to_numeric(ch.NU_IDADE.str.rstrip('.'), errors='coerce')
        unid = ch.NU_UNIDADE_IDADE.fillna('').str.rstrip('.')
        for u, n in unid.value_counts().items():
            idade_unid[u] = idade_unid.get(u, 0) + int(n)
        anos = np.where(unid == '1', idade, np.where(unid.isin(['2', '3']), 0, np.nan))
        ch['faixa'] = pd.cut(anos, FAIXAS, right=False, labels=ROT_FAIXAS)
        ch['sexo'] = ch.SG_SEXO.fillna('').str.strip().map({'1': 'M', '2': 'F'})
        a = agg[m]
        for chave, g in {
            'uf': ['grupo', 'SG_UF_VENDA'],
            'pa': ['grupo', 'pa'],
            'conselho': ['grupo', 'conselho'],
            'idade': ['grupo', 'faixa', 'sexo'],
            'paFaixa': ['grupo', 'pa', 'faixa'],
        }.items():
            s = ch.groupby(g, observed=True).q.sum()
            a[chave] = s if chave not in a else a[chave].add(s, fill_value=0)
        tot = ch.groupby('grupo').q.sum()
        a['tot'] = tot if 'tot' not in a else a['tot'].add(tot, fill_value=0)
        com = ch[ch.faixa.notna() & ch.sexo.notna()].groupby('grupo').q.sum()
        a['comIdade'] = com if 'comIdade' not in a else a['comIdade'].add(com, fill_value=0)
    print('ok', m)

jan, jul = agg['202601'], agg['202607']
cob = jul['tot']['controlado'] / jan['tot']['controlado']  # reporting coverage/trend yardstick

# 1. map: units per 1,000 inhabitants by state
mapa = []
for uf, p in sorted(pop.items()):
    g = lambda a, grp: float(a['uf'].get((grp, uf), 0))
    mapa.append({'uf': uf, 'pop': p, 'amJan': r(g(jan, 'antimicrobiano') / p * 1000, 1), 'amJul': r(g(jul, 'antimicrobiano') / p * 1000, 1),
                 'glpJan': r(g(jan, 'glp1') / p * 1000, 2), 'glpJul': r(g(jul, 'glp1') / p * 1000, 2), 'ctrlJul': r(g(jul, 'controlado') / p * 1000, 1)})

# 2. age x sex profile (July, antimicrobials and controlled), share of units with age filled
def perfil(a, grp):
    s = a['idade'].xs(grp, level=0)
    return {sx: [r(float(s.get((f, sx), 0)), 0) for f in ROT_FAIXAS] for sx in ['F', 'M']}

perfis = {grp: {'jan': perfil(jan, grp), 'jul': perfil(jul, grp), 'cobertura': r(float(jul['comIdade'].get(grp, 0) / jul['tot'][grp]), 3)} for grp in ['antimicrobiano', 'controlado', 'glp1']}

# 2b. children's share (0-14 years) for the best-selling antimicrobials: which ones need pediatric forms
am_pf = jul['paFaixa'].xs('antimicrobiano', level=0)
top_am = jul['pa'].xs('antimicrobiano', level=0).sort_values(ascending=False).head(14).index
pediatria = []
for p in top_am:
    s = am_pf.xs(p, level=0) if p in am_pf.index.get_level_values(0) else pd.Series(dtype=float)
    tot = float(s.sum())
    if tot <= 0:
        continue
    kids = float(s.get('0–4', 0) + s.get('5–14', 0))
    pediatria.append({'pa': p, 'unidades': r(tot, 0), 'criancas': r(kids / tot, 3), 'ate4': r(float(s.get('0–4', 0)) / tot, 3)})

# 3. prescribers
def conselhos(a, grp, n=6):
    s = a['conselho'].xs(grp, level=0).sort_values(ascending=False)
    tot = s.sum()
    return [{'conselho': k, 'parte': r(v / tot, 4)} for k, v in s.head(n).items()]

presc = {grp: conselhos(jul, grp) for grp in ['antimicrobiano', 'controlado', 'glp1']}

# 4. controlled drugs: top substances, Jan vs Jul (coverage-adjusted)
ctrl_jan = jan['pa'].xs('controlado', level=0)
ctrl_jul = jul['pa'].xs('controlado', level=0)
top = ctrl_jul.sort_values(ascending=False).head(12).index
controlados = [{'pa': p, 'jan': r(float(ctrl_jan.get(p, 0)), 0), 'jul': r(float(ctrl_jul[p]), 0), 'varAjustada': r(float(ctrl_jul[p] / ctrl_jan.get(p, np.nan) / cob - 1), 3)} for p in top]
glp_pa = jul['pa'].xs('glp1', level=0).sort_values(ascending=False)
glp_jan_pa = jan['pa'].xs('glp1', level=0)
glp = [{'pa': p, 'jan': r(float(glp_jan_pa.get(p, 0)), 0), 'jul': r(float(v), 0)} for p, v in glp_pa.head(6).items()]

# 5. price ladder by therapeutic class (CMED): median factory price by class x product type
pmc = pd.read_excel('private/dados/anvisa/lista_pmc.xlsx', sheet_name='Lista PMC', header=0, dtype=str)
pmc.columns = [norm(c) for c in pmc.columns]
pmc['tipo'] = pmc[[c for c in pmc.columns if c.startswith('TIPO DE PRODUTO')][0]].map(norm)
pmc['pf'] = pd.to_numeric(pmc['PF SEM IMPOSTOS'].str.replace(',', '.'), errors='coerce')
pmc['classe'] = pmc['CLASSE TERAPEUTICA'].map(norm).str.replace(r'^[A-Z0-9]+ - ', '', regex=True)
p3 = pmc[pmc.tipo.isin(['GENERICO', 'SIMILAR', 'NOVO']) & (pmc.pf > 0)]
classes = p3[p3.tipo == 'GENERICO'].classe.value_counts().head(8).index
escada = []
for c in classes:
    d = p3[p3.classe == c]
    escada.append({'classe': c, **{t.lower(): r(float(d[d.tipo == t].pf.median()), 2) for t in ['GENERICO', 'SIMILAR', 'NOVO']},
                   'n': {t.lower(): int((d.tipo == t).sum()) for t in ['GENERICO', 'SIMILAR', 'NOVO']}})

saida = {
    'fonte': 'Anvisa SNGPC (jan e jul/2026), CMED (09/10/2026), IBGE estimativas 2025',
    'cobertura': r(cob, 3),
    'faixas': ROT_FAIXAS,
    'idadeUnidades': idade_unid,
    'mapa': mapa,
    'perfis': perfis,
    'prescritores': presc,
    'pediatria': pediatria,
    'controlados': controlados,
    'glp1': glp,
    'escada': escada,
    'totais': {m: {k: r(float(v), 0) for k, v in agg[m]['tot'].items()} for m in MESES},
}
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({k: saida[k] for k in ['cobertura', 'idadeUnidades', 'prescritores', 'totais']}, ensure_ascii=False, indent=1))
print(json.dumps(saida['controlados'][:6], ensure_ascii=False))
print(json.dumps(saida['escada'][:4], ensure_ascii=False))
print(sorted(mapa, key=lambda x: -x['amJul'])[:4], sorted(mapa, key=lambda x: x['amJul'])[:3])
print({g: perfis[g]['cobertura'] for g in perfis})
