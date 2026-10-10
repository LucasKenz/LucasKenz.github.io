"""Strategy sub-labs for /lab/farma, built on public facts about a generics leader's 2025-2026 moves:
(1) merger screening by molecule (registrations as share proxy, HHI before/after),
(2) GLP-1 pens: list price per pen and monthly therapy cost, plus SNGPC demand,
(3) content-uniformity acceptance test: probability of passing a lot by mean and variability (simulation),
(4) biologics: high-price molecules with few registration holders.

Inputs : private/dados/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv, lista_pmc.xlsx; content/lab-dados/farma-sublabs.json (SNGPC)
Output : content/lab-dados/farma-estrategia.json
Run    : private/.venv/Scripts/python -s analises/farma_estrategia.py
"""
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

SAIDA = Path('content/lab-dados/farma-estrategia.json')
GRUPO = r'^(EMS S/A|EMS SIGMA PHARMA|GERMED|LEGRAND|NOVA QUIMICA|MULTILAB|BRACE PHARMA|OFTA|UNDER SKIN)'
MEDLEY = r'MEDLEY'


def r(x, k=3):
    return None if x is None or not np.isfinite(x) else round(float(x), k)


def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'\s+', ' ', s).strip()


# ---------- 1. merger screening ----------
reg = pd.read_csv('private/dados/anvisa/DADOS_ABERTOS_MEDICAMENTOS.csv', sep=';', encoding='latin1', dtype=str)
reg = reg[reg.SITUACAO_REGISTRO.map(norm) == 'ATIVO'].copy()
reg['cat'] = reg.CATEGORIA_REGULATORIA.map(norm)
reg['empresa'] = reg.EMPRESA_DETENTORA_REGISTRO.str.split(' - ', n=1).str[1].map(norm)
reg['pa'] = reg.PRINCIPIO_ATIVO.map(norm)
copias = reg[reg.cat.isin(['GENERICO', 'SIMILAR'])].copy()  # interchangeable copies compete with each other
copias['dono'] = np.where(copias.empresa.str.contains(GRUPO, regex=True), 'grupo',
                          np.where(copias.empresa.str.contains(MEDLEY, regex=True), 'medley', copias.empresa))
moleculas = []
for pa, d in copias.groupby('pa'):
    n = d.dono.value_counts()
    if n.sum() < 3:
        continue
    s = n / n.sum()
    hhi_pre = float((s ** 2).sum() * 10000)
    sg, sm = float(s.get('grupo', 0)), float(s.get('medley', 0))
    delta = 2 * sg * sm * 10000
    moleculas.append({'pa': pa, 'empresas': int(len(n)), 'grupo': r(sg, 3), 'medley': r(sm, 3), 'hhiAntes': r(hhi_pre, 0), 'hhiDepois': r(hhi_pre + delta, 0), 'delta': r(delta, 0)})
mol = pd.DataFrame(moleculas)
so_medley = mol[(mol.medley > 0) & (mol.grupo == 0)]
sobrepoe = mol[(mol.medley > 0) & (mol.grupo > 0)]
alerta = sobrepoe[(sobrepoe.hhiDepois > 2500) & (sobrepoe.delta > 200)].sort_values('delta', ascending=False)
partes = {
    'grupo': r(float((copias.dono == 'grupo').mean()), 3),
    'medley': r(float((copias.dono == 'medley').mean()), 3),
    'registros': int(len(copias)),
}
fusao = {
    'partes': partes,
    'moleculas': int(len(mol)),
    'comMedley': int((mol.medley > 0).sum()),
    'sobreposicao': int(len(sobrepoe)),
    'novasParaGrupo': int(len(so_medley)),
    'alertas': int(len(alerta)),
    'topAlertas': alerta.head(12).to_dict('records'),
    # scatter: every overlapping molecule (x = HHI before, y = delta)
    'pontos': [{'x': x.hhiAntes, 'y': x.delta, 'pa': x.pa} for x in sobrepoe.itertuples()],
}

# ---------- 2. GLP-1 pens: price per mg and monthly therapy cost ----------
pmc = pd.read_excel('private/dados/anvisa/lista_pmc.xlsx', sheet_name='Lista PMC', header=0, dtype=str)
pmc.columns = [norm(c) for c in pmc.columns]
pmc['pf'] = pd.to_numeric(pmc['PF SEM IMPOSTOS'].str.replace(',', '.'), errors='coerce')
pmc['subst'] = pmc['SUBSTANCIA'].map(norm)
pmc['apres'] = pmc['APRESENTACAO'].map(norm)
pmc['lab'] = pmc['LABORATORIO'].map(norm)
pmc['tipo'] = pmc[[c for c in pmc.columns if c.startswith('TIPO DE PRODUTO')][0]].map(norm)


def mg_total(apres: str):
    """mg of drug in the package: concentration (MG/ML) x volume (ML) x number of pens/cartridges."""
    a = apres.replace(',', '.')
    c = re.search(r'(\d+(?:\.\d+)?) MG/ML', a)
    v = re.search(r'X (\d+(?:\.\d+)?) ML', a)
    n = re.search(r'(?:CT|X) (\d+) (?:CAR|CARP|SER|CAN|SIST|CANETA)', a)
    if not c or not v:
        return None
    return float(c.group(1)) * float(v.group(1)) * (int(n.group(1)) if n else 1)


# Maintenance doses (package inserts, chronic weight management): liraglutide 3 mg/day,
# semaglutide 2.4 mg/week, tirzepatide 15 mg/week (top dose). Monthly = 30.4 days.
DOSE_MES = {'LIRAGLUTIDA': 3 * 30.4, 'SEMAGLUTIDA': 2.4 * 30.4 / 7, 'TIRZEPATIDA': 15 * 30.4 / 7}
canetas = []
for subst in DOSE_MES:
    d = pmc[(pmc.subst == subst) & pmc.pf.notna()].copy()
    d['mg'] = d.apres.map(mg_total)
    d = d[d.mg.notna() & (d.mg > 0)]
    d['porMg'] = d.pf / d.mg
    for lab, g in d.groupby('lab'):
        m = g.porMg.min()
        canetas.append({'subst': subst, 'lab': lab, 'tipo': g.tipo.iloc[0], 'porMg': r(m, 3), 'mensal': r(m * DOSE_MES[subst], 2), 'apresentacoes': int(len(g))})
can = pd.DataFrame(canetas)
sema = can[can.subst == 'SEMAGLUTIDA']
sema_ref = float(sema.mensal.max()) if len(sema) else np.nan
lira_min = float(can[can.subst == 'LIRAGLUTIDA'].mensal.min())

sub = json.loads(Path('content/lab-dados/farma-sublabs.json').read_text(encoding='utf8'))
glp = sub['glp1']

# ---------- 3. content uniformity: Monte Carlo of the two-stage acceptance-value test ----------
# Farmacopeia Brasileira / USP <905>, target 100 %: stage 1 n = 10, k = 2.4; stage 2 n = 30, k = 2.0;
# AV = |M - mean| + k*s with M = mean clamped to [98.5, 101.5]; pass if AV <= 15 (L1) and, at stage 2,
# no unit outside [75 %, 125 %] of M (L2 = 25).
rng = np.random.default_rng(7)
MEDIAS = np.arange(90, 110.01, 1.0)
CVS = np.arange(0.5, 12.01, 0.5)
SIM = 4000


def av(x, k):
    m = x.mean(axis=1)
    M = np.clip(m, 98.5, 101.5)
    return np.abs(M - m) + k * x.std(axis=1, ddof=1), M


grade = []
for cv in CVS:
    linha = []
    for mu in MEDIAS:
        x = rng.normal(mu, mu * cv / 100, size=(SIM, 30))
        a1, _ = av(x[:, :10], 2.4)
        p1 = a1 <= 15
        a2, M2 = av(x, 2.0)
        fora = (np.abs(x - M2[:, None]) > 0.25 * M2[:, None]).any(axis=1)
        p2 = (~p1) & (a2 <= 15) & ~fora
        linha.append(r(float((p1 | p2).mean()), 3))
    grade.append(linha)
grade = np.array(grade, dtype=float)
# Lot with right mean but high variability: share of tablets outside 85-115 % that still passes often.
def fora_faixa(cv):
    from math import erf, sqrt
    z = 15 / cv
    return 1 - erf(z / sqrt(2))

ponto_risco = None
for i, cv in enumerate(CVS):
    p = grade[i, list(MEDIAS).index(100.0)]
    if p >= 0.5:
        ponto_risco = {'cv': r(float(cv), 1), 'aprovacao': r(float(p), 3), 'foraDe85a115': r(fora_faixa(cv), 4)}
uniformidade = {
    'medias': [r(float(m), 0) for m in MEDIAS], 'cvs': [r(float(c), 1) for c in CVS], 'aprovacao': grade.tolist(), 'simulacoes': SIM,
    'cv95': r(float(max(c for i, c in enumerate(CVS) if grade[i, list(MEDIAS).index(100.0)] >= 0.95)), 1),
    'limiteCritico': ponto_risco,
}

# ---------- 4. biologics: price and number of holders ----------
bio_reg = reg[reg.cat == 'BIOLOGICO'].groupby('pa').empresa.nunique()
bio_preco = pmc[(pmc.tipo == 'BIOLOGICO') & pmc.pf.notna()].groupby('subst').agg(pf=('pf', 'median'), labs=('lab', 'nunique'))
bio = []
for subst, x in bio_preco.iterrows():
    n = int(bio_reg[[k for k in bio_reg.index if k == subst or k.startswith(subst + ' ') or k.startswith(subst + ',')]].max()) if any(k == subst or k.startswith(subst) for k in bio_reg.index) else int(x.labs)
    bio.append({'subst': subst, 'pf': r(float(x.pf), 2), 'empresas': max(n, int(x.labs))})
bio = pd.DataFrame(bio).sort_values('pf', ascending=False)
biologicos = {
    'moleculas': int(len(bio)),
    'umaEmpresa': int((bio.empresas == 1).sum()),
    'porFaixa': [{'empresas': k, 'moleculas': int(v), 'pfMediano': r(float(bio[bio.empresas.clip(upper=4) == k].pf.median()), 0)} for k, v in bio.empresas.clip(upper=4).value_counts().sort_index().items()],
    'caros': bio[bio.empresas == 1].head(10).to_dict('records'),
    'comConcorrencia': bio[bio.empresas >= 3].head(8).to_dict('records'),
}

saida = {
    'fonte': 'Anvisa (registros, CMED 09/10/2026, SNGPC jan e jul/2026); simulação própria do teste de uniformidade',
    'fusao': fusao,
    'canetas': {'lista': canetas, 'doseMes': {k: r(v, 2) for k, v in DOSE_MES.items()}, 'semaRef': r(sema_ref, 2), 'semaMenos30': r(sema_ref * 0.7, 2), 'liraMin': r(lira_min, 2), 'demanda': glp},
    'uniformidade': uniformidade,
    'biologicos': biologicos,
}
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({k: v for k, v in fusao.items() if k != 'pontos'}, ensure_ascii=False, indent=1)[:3000])
print(json.dumps(saida['canetas'], ensure_ascii=False, indent=1)[:3000])
print(uniformidade['cv95'], uniformidade['limiteCritico'])
print(json.dumps({k: v for k, v in biologicos.items()}, ensure_ascii=False)[:2000])
