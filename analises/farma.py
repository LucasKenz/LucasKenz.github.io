"""Generic drugs in Brazil: price gap to the reference drug, how competition deepens discounts, and where
demand is high but generic competition is thin (portfolio opportunities for a generics maker).

Inputs : private/dados/anvisa/lista_pmc.xlsx                  (CMED price list, Oct 2026)
         private/dados/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv    (ANVISA registrations)
         private/dados/anvisa/EDA_Industrializados_2026MM.csv   (SNGPC sales of controlled drugs and antimicrobials)
Output : content/lab-dados/farma.json
Run    : private/.venv/Scripts/python -s analises/farma.py
"""
import glob
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

SAIDA = Path('content/lab-dados/farma.json')


def r(x, k=3):
    return None if x is None or not np.isfinite(x) else round(float(x), k)


def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'\s+', ' ', s).strip()


# ---------- 1. CMED price list ----------
pmc = pd.read_excel('private/dados/anvisa/lista_pmc.xlsx', sheet_name='Lista PMC', header=0, dtype=str)
pmc.columns = [norm(c) for c in pmc.columns]
col_tipo = [c for c in pmc.columns if c.startswith('TIPO DE PRODUTO')][0]
pmc['tipo'] = pmc[col_tipo].map(norm)
pmc['pf'] = pd.to_numeric(pmc['PF SEM IMPOSTOS'].str.replace(',', '.'), errors='coerce')
pmc['subst'] = pmc['SUBSTANCIA'].map(norm)
pmc['apres'] = pmc['APRESENTACAO'].map(norm)
pmc['lab'] = pmc['LABORATORIO'].map(norm)
pmc = pmc[pmc.pf > 0]
tipos = pmc.tipo.value_counts().to_dict()

# CMED has no 'reference' flag: the original brand is listed as 'Novo'.
ref = pmc[pmc.tipo == 'NOVO'].groupby(['subst', 'apres']).pf.min().rename('pf_ref')
gen = pmc[pmc.tipo == 'GENERICO']
par = gen.join(ref, on=['subst', 'apres'], how='inner')
par['desconto'] = 1 - par.pf / par.pf_ref
par = par[par.desconto.between(-0.5, 0.99)]
# competition: number of distinct labs selling a generic of the same substance+presentation
n_lab = gen.groupby(['subst', 'apres']).lab.nunique().rename('concorrentes')
par = par.join(n_lab, on=['subst', 'apres'])
por_apres = par.groupby(['subst', 'apres']).agg(desconto=('desconto', 'median'), concorrentes=('concorrentes', 'first'), pf_ref=('pf_ref', 'first')).reset_index()

hist = np.histogram(par.desconto.clip(0, 0.95), bins=np.arange(0, 1.0001, 0.05))
abaixo35 = r((par.desconto < 0.35).mean(), 3)

# Discount vs number of competitors: median by bucket + log-linear fit.
bucket = pd.cut(por_apres.concorrentes, [0, 1, 2, 3, 5, 8, 12, 100], labels=['1', '2', '3', '4–5', '6–8', '9–12', '13+'])
por_n = por_apres.groupby(bucket, observed=True).desconto.agg(['median', 'count'])
b, a = np.polyfit(np.log(por_apres.concorrentes), por_apres.desconto, 1)
r2 = np.corrcoef(np.log(por_apres.concorrentes), por_apres.desconto)[0, 1] ** 2

# ---------- 2. registrations: who holds generic registrations ----------
reg = pd.read_csv('private/dados/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv', sep=';', encoding='latin1', dtype=str)
reg['cat'] = reg.CATEGORIA_REGULATORIA.map(norm)
reg['ativo'] = reg.SITUACAO_REGISTRO.map(norm) == 'ATIVO'
reg['pa'] = reg.PRINCIPIO_ATIVO.map(norm)
reg['empresa'] = reg.EMPRESA_DETENTORA_REGISTRO.str.split(' - ', n=1).str[1].map(norm)
ativos = reg[reg.ativo]
cats = ativos.cat.value_counts().to_dict()
g = ativos[ativos.cat == 'GENERICO']
top = g.empresa.value_counts()
conc_gen = {'empresas': int(top.size), 'top10': r(top.head(10).sum() / top.sum(), 3), 'hhi': r(((top / top.sum()) ** 2).sum() * 10000, 0)}
competidores_pa = g.groupby('pa').empresa.nunique()

# ---------- 3. demand from SNGPC (units sold), January vs July when available ----------
def vendas(arq):
    tot = None
    for ch in pd.read_csv(arq, sep=';', encoding='latin1', usecols=['DS_PRINCIPIO_ATIVO', 'QT_VENDIDA', 'SG_UF_VENDA', 'TP_RECEITUARIO'],
                          dtype={'QT_VENDIDA': 'float64'}, chunksize=2_000_000):
        ch['pa'] = ch.DS_PRINCIPIO_ATIVO.map(norm)
        # TP_RECEITUARIO 5 = antimicrobial prescription (RDC 20/2011); others = controlled substances
        ch['antimicrobiano'] = ch.TP_RECEITUARIO.astype(str).str.startswith('5')
        a = ch.groupby(['pa', 'antimicrobiano']).QT_VENDIDA.sum()
        tot = a if tot is None else tot.add(a, fill_value=0)
    return tot


# Months to use (complete downloads only), e.g. MESES=202601,202607
import os
arqs = [f'private/dados/anvisa/EDA_Industrializados_{m}.csv' for m in os.environ.get('MESES', '202601').split(',')]
meses = {Path(a).stem[-6:]: vendas(a) for a in arqs}
# GLP-1 agonists also use the retained 2-copy prescription since 2025, so they show up as type 5: keep them apart.
GLP1 = ('TIRZEPATIDA', 'SEMAGLUTIDA', 'LIRAGLUTIDA', 'DULAGLUTIDA')
eh_glp1 = lambda nomes: [any(x in n for x in GLP1) for n in nomes]
jan = meses['202601'].groupby(level=0).sum()
am_jan_bruto = meses['202601'].xs(True, level='antimicrobiano')
antimicro = am_jan_bruto[[not x for x in eh_glp1(am_jan_bruto.index)]].sort_values(ascending=False)
glp1_jan = am_jan_bruto[eh_glp1(am_jan_bruto.index)]
sazonal = None
if '202607' in meses:
    jul = meses['202607'].groupby(level=0).sum()
    am_jul = meses['202607'].xs(True, level='antimicrobiano')
    comuns = antimicro.head(15).index.intersection(am_jul.index)
    # Coverage check: controlled (non-antimicrobial) units should be roughly stable between months.
    cobertura = meses['202607'].xs(False, level='antimicrobiano').sum() / meses['202601'].xs(False, level='antimicrobiano').sum()
    sazonal = {
        # varAjustada divides out the change in reporting coverage (controlled drugs as the yardstick)
        'itens': [{'pa': p, 'jan': r(antimicro[p], 0), 'jul': r(am_jul[p], 0), 'var': r(am_jul[p] / antimicro[p] - 1, 3),
                   'varAjustada': r(am_jul[p] / antimicro[p] / cobertura - 1, 3)} for p in comuns],
        'controladosJulJan': r(cobertura, 3),
        'antimicrobianosJulJan': r(am_jul[[not x for x in eh_glp1(am_jul.index)]].sum() / antimicro.sum(), 3),
        'glp1JulJan': r(am_jul[eh_glp1(am_jul.index)].sum() / glp1_jan.sum(), 3),
    }

# ---------- 4. opportunity score: demand x reference price x thin generic competition ----------
# Match SNGPC substance names to registrations/CMED by normalised substance name (first word stem fallback).
ref_preco = pmc[pmc.tipo == 'NOVO'].groupby('subst').pf.median()
linhas = []
for pa, q in jan.sort_values(ascending=False).items():
    # exact substance match only (prefix matching mixed different molecules); at least 5 000 units in the month
    if q < 5000 or pa not in ref_preco.index:
        continue
    # registrations list salts together ("valproato de sódio, ácido valpróico"): substring match
    n_gen = g[g.pa.str.contains(pa, regex=False, na=False)].empresa.nunique()
    linhas.append({'pa': pa, 'unidades': q, 'genericos': int(n_gen), 'pfRef': ref_preco[pa]})
op = pd.DataFrame(linhas).dropna()
op['score'] = np.log1p(op.unidades) * np.log1p(op.pfRef) / (1 + op.genericos)
op = op.sort_values('score', ascending=False)

saida = {
    'fonte': {
        'precos': 'CMED/ANVISA: Lista de preços (PMC), 09/10/2026',
        'registros': 'ANVISA: Dados abertos de medicamentos registrados',
        'vendas': 'ANVISA: SNGPC, venda de medicamentos industrializados controlados e antimicrobianos, ' + ', '.join(meses),
    },
    'cmed': {'apresentacoes': int(len(pmc)), 'tipos': {k: int(v) for k, v in tipos.items()}, 'pares': int(len(par)), 'paresApres': int(len(por_apres))},
    'desconto': {'hist': [int(v) for v in hist[0]], 'bordas': [r(v, 2) for v in hist[1]], 'mediana': r(par.desconto.median(), 3), 'abaixo35': abaixo35},
    'competicao': {
        'porN': [{'n': str(k), 'mediana': r(v['median'], 3), 'casos': int(v['count'])} for k, v in por_n.iterrows()],
        'ajuste': {'a': r(a, 4), 'b': r(b, 4), 'r2': r(r2, 3)},
        'pontos': [{'n': int(x.concorrentes), 'd': r(x.desconto, 3)} for x in por_apres.sample(min(600, len(por_apres)), random_state=0).itertuples()],
    },
    'registros': {'categorias': {k: int(v) for k, v in cats.items()}, 'concentracaoGenericos': conc_gen, 'top10': [{'empresa': k, 'registros': int(v)} for k, v in top.head(10).items()]},
    'demanda': {
        'unidadesJan': r(jan.sum(), 0),
        'antimicrobianosTop': [{'pa': k, 'unidades': r(v, 0)} for k, v in antimicro.head(12).items()],
        'glp1Jan': r(glp1_jan.sum(), 0),
        'sazonal': sazonal,
    },
    'oportunidades': [{'pa': x.pa, 'unidades': r(x.unidades, 0), 'genericos': int(x.genericos), 'pfRef': r(x.pfRef, 2), 'score': r(x.score, 3)} for x in op.head(15).itertuples()],
}
SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({k: saida[k] for k in ['cmed', 'desconto', 'registros']}, ensure_ascii=False, indent=1)[:2500])
print(json.dumps(saida['competicao']['porN'], ensure_ascii=False), saida['competicao']['ajuste'])
print(json.dumps(saida['demanda']['antimicrobianosTop'][:8], ensure_ascii=False))
print(json.dumps(saida['oportunidades'][:15], ensure_ascii=False, indent=0))
