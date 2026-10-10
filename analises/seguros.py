"""Commercial P&C lines in Brazil (SUSEP SES): market, loss ratios, concentration and a
Bühlmann-Straub credibility model for next-year loss ratio per insurer.

Input : private/dados/susep/ext/Ses_seguros.csv (SUSEP, "Base de Dados do SES", monthly flows)
Output: content/lab-dados/seguros.json

Run: private/.venv/Scripts/python -s analises/seguros.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ORIGEM = Path('private/dados/susep/ext/Ses_seguros.csv')
SAIDA = Path('content/lab-dados/seguros.json')

# Commercial lines grouped into families (SUSEP line codes, Ses_ramos.csv).
FAMILIAS = {
    'Transportes': ['0621', '0622', '0623', '0628', '0652', '0654', '0655', '0656', '0658', '0659'],
    'Responsabilidades': ['0351', '0310', '0378', '0313', '0327'],
    'Patrimonial empresarial': ['0118', '0196', '0141'],  # 0171 Riscos Diversos left out: mostly consumer goods
    'Engenharia': ['0167'],
    'Garantia': ['0775', '0776'],
}
FAM_EN = {'Transportes': 'Cargo & transport', 'Responsabilidades': 'Liability', 'Patrimonial empresarial': 'Commercial property',
          'Engenharia': 'Engineering', 'Garantia': 'Surety'}
ANOS = list(range(2016, 2026))  # complete years


def r(x, k=4):
    return None if x is None or (isinstance(x, float) and not np.isfinite(x)) else round(float(x), k)


df = pd.read_csv(ORIGEM, sep=';', encoding='latin1', decimal=',', dtype={'coenti': str, 'coramo': str, 'cogrupo': str},
                 usecols=['damesano', 'coenti', 'coramo', 'premio_direto', 'premio_ganho', 'sinistro_ocorrido', 'desp_com'])
df['coenti'] = df.coenti.str.strip()
df['coramo'] = df.coramo.str.strip()
df['ano'] = df.damesano // 100
mapa = {c: f for f, cs in FAMILIAS.items() for c in cs}
df['familia'] = df.coramo.map(mapa)
emp = df[df.familia.notna() & df.ano.isin(ANOS)].copy()

# ---------- 1. market size and loss ratio per family and year ----------
anual = emp.groupby(['familia', 'ano'])[['premio_direto', 'premio_ganho', 'sinistro_ocorrido', 'desp_com']].sum()
anual['sinistralidade'] = anual.sinistro_ocorrido / anual.premio_ganho
anual['comissao'] = anual.desp_com / anual.premio_ganho
mercado = {}
for f in FAMILIAS:
    a = anual.loc[f]
    mercado[f] = {
        'premio': [r(a.premio_direto.get(y, 0) / 1e9, 3) for y in ANOS],
        'sinistralidade': [r(a.sinistralidade.get(y)) for y in ANOS],
        'comissao': [r(a.comissao.get(y)) for y in ANOS],
        'crescimento': r((a.premio_direto.get(2025) / a.premio_direto.get(2016)) ** (1 / 9) - 1),
        'sinMedia': r(a.sinistralidade.loc[2016:2025].mean()),
        'sinDesvio': r(a.sinistralidade.loc[2016:2025].std()),
    }

# ---------- 2. concentration in 2025 (HHI on direct premium) ----------
conc = {}
for f in FAMILIAS:
    p = emp[(emp.familia == f) & (emp.ano == 2025)].groupby('coenti').premio_direto.sum()
    p = p[p > 0]
    s = p / p.sum()
    conc[f] = {'seguradoras': int((p > 1e6).sum()), 'hhi': r((s ** 2).sum() * 10000, 0), 'top5': r(s.sort_values(ascending=False).head(5).sum())}

# ---------- 3. company x family x year loss ratios ----------
cia = emp.groupby(['coenti', 'familia', 'ano'])[['premio_ganho', 'sinistro_ocorrido']].sum().reset_index()
cia = cia[cia.premio_ganho > 1e5]  # at least R$ 100 mil earned in the year
cia['lr'] = (cia.sinistro_ocorrido / cia.premio_ganho).clip(lower=0, upper=5)  # cap extreme ratios (tiny books)


def buhlmann_straub(hist: pd.DataFrame):
    """hist: rows (coenti, ano, lr, w). Returns market mean, k = s2/a, and per-company (mean, weight, Z)."""
    g = hist.groupby('coenti')
    w_i = g.w.sum()
    x_i = g.apply(lambda d: np.average(d.lr, weights=d.w), include_groups=False)
    n_i = g.size()
    validos = n_i[n_i >= 2].index
    if len(validos) < 3:
        return None
    h = hist[hist.coenti.isin(validos)]
    w_i, x_i, n_i = w_i[validos], x_i[validos], n_i[validos]
    m = np.average(x_i, weights=w_i)
    # within-company variance (expected process variance)
    s2 = sum((h[h.coenti == c].w * (h[h.coenti == c].lr - x_i[c]) ** 2).sum() for c in validos) / (n_i - 1).sum()
    W = w_i.sum()
    a = ((w_i * (x_i - m) ** 2).sum() - (len(validos) - 1) * s2) / (W - (w_i ** 2).sum() / W)
    a = max(a, 1e-6)
    k = s2 / a
    Z = w_i / (w_i + k)
    return {'m': m, 'k': k, 'x': x_i, 'w': w_i, 'Z': Z}


testes = []
zs = []
for f in FAMILIAS:
    d = cia[cia.familia == f].copy()
    d['w'] = d.premio_ganho / 1e6  # weights in R$ millions
    for alvo in range(2021, 2026):
        hist = d[d.ano.between(alvo - 5, alvo - 1)]
        bs = buhlmann_straub(hist)
        if bs is None:
            continue
        real = d[d.ano == alvo].set_index('coenti')
        comum = real.index.intersection(bs['x'].index)
        if len(comum) < 3:
            continue
        y, w = real.loc[comum, 'lr'], real.loc[comum, 'w']
        prev = {
            'mercado': pd.Series(bs['m'], index=comum),
            'propria': bs['x'][comum],
            'credibilidade': bs['Z'][comum] * bs['x'][comum] + (1 - bs['Z'][comum]) * bs['m'],
        }
        for nome, p in prev.items():
            testes.append({'familia': f, 'ano': alvo, 'modelo': nome, 'mae': float(np.average((p - y).abs(), weights=w)), 'n': len(comum)})
        if alvo == 2025:
            for c in comum:
                zs.append({'familia': f, 'premio': float(bs['w'][c]), 'Z': float(bs['Z'][c])})
            mercado[f]['k'] = r(bs['k'], 2)

t = pd.DataFrame(testes)
erro = t.groupby(['familia', 'modelo']).mae.mean().unstack()
erroGeral = t.groupby('modelo').mae.mean()
backtest = {
    'porFamilia': {f: {m: r(erro.loc[f, m]) for m in erro.columns} for f in erro.index},
    'geral': {m: r(v) for m, v in erroGeral.items()},
    'casos': int(t[t.modelo == 'credibilidade'].n.sum()),
}
zdf = pd.DataFrame(zs)
# Z versus earned premium: the credibility curve (one point per insurer-family in 2025).
curva = [{'familia': z.familia, 'premio': r(z.premio, 2), 'Z': r(z.Z, 3)} for z in zdf.itertuples()]

saida = {
    'fonte': 'SUSEP — Base de Dados do SES (Ses_seguros.csv), atualizada até 2026-07',
    'anos': ANOS,
    'familias': list(FAMILIAS),
    'familiasEn': FAM_EN,
    'ramos': FAMILIAS,
    'mercado': mercado,
    'concentracao': conc,
    'backtest': backtest,
    'credibilidade': curva,
    'totais': {
        'premio2025': r(sum(mercado[f]['premio'][-1] for f in FAMILIAS), 2),
        'linhas': int(len(emp)),
        'seguradoras': int(emp[emp.ano == 2025].coenti.nunique()),
    },
}
SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({'backtest': backtest, 'conc': conc, 'k': {f: mercado[f].get('k') for f in FAMILIAS}, 'totais': saida['totais']}, ensure_ascii=False, indent=1))
for f in FAMILIAS:
    print(f, mercado[f]['premio'][-1], 'bi', 'sin', mercado[f]['sinMedia'], '±', mercado[f]['sinDesvio'], 'cresc', mercado[f]['crescimento'])
