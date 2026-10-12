"""Corporate credit risk in Brazil from Banco Central SGS series: delinquency (> 90 days) by client type,
company size and product, its lag behind the policy rate, and a 6-month-ahead forecast with a
rolling-origin backtest and a rate-shock scenario (the forward-looking piece of expected-loss provisioning).

Input : Banco Central SGS API (cached in private/dados/bcb/sgs/<code>.json)
Output: content/lab-dados/banco.json
Run   : private/.venv/Scripts/python -s analises/banco.py
"""
import json
import time
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

CACHE = Path('private/dados/bcb/sgs')
SAIDA = Path('content/lab-dados/banco.json')

SERIES = {
    21083: 'PJ total', 21084: 'PF total', 21086: 'PJ recursos livres',
    27703: 'MPMe', 27704: 'Grande',
    21093: 'Capital de giro', 21087: 'Desconto de duplicatas', 21094: 'Conta garantida', 21098: 'Aquisição de bens',
    21106: 'Cartão de crédito', 21107: 'ACC', 21109: 'Financiamento à exportação', 21102: 'Vendor', 21095: 'Cheque especial',
    4189: 'Selic', 24363: 'IBC-Br', 13522: 'IPCA 12m',
}
MODALIDADES = [21093, 21087, 21094, 21098, 21106, 21107, 21109, 21102, 21095]
MOD_EN = {'Capital de giro': 'Working capital', 'Desconto de duplicatas': 'Receivables discount', 'Conta garantida': 'Secured overdraft',
          'Aquisição de bens': 'Asset purchase', 'Cartão de crédito': 'Credit card', 'ACC': 'FX advance (ACC)',
          'Financiamento à exportação': 'Export finance', 'Vendor': 'Vendor', 'Cheque especial': 'Overdraft'}


def serie(cod: int) -> pd.Series:
    arq = CACHE / f'{cod}.json'
    if not arq.exists():
        url = f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json&dataInicial=01/01/2011&dataFinal=31/12/2026'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        arq.write_bytes(urllib.request.urlopen(req, timeout=60).read())
        time.sleep(0.6)  # be gentle with the API
    d = pd.DataFrame(json.loads(arq.read_text(encoding='utf8')))
    s = pd.Series(pd.to_numeric(d.valor, errors='coerce').values, index=pd.to_datetime(d.data, dayfirst=True))
    return s.resample('MS').mean()


def r(x, k=3):
    return None if x is None or not np.isfinite(x) else round(float(x), k)


CACHE.mkdir(parents=True, exist_ok=True)
df = pd.DataFrame({cod: serie(cod) for cod in SERIES}).sort_index()
df = df[df.index >= '2011-03-01']
ultimo = df[21083].last_valid_index()
df = df[df.index <= ultimo]

meses = [d.strftime('%Y-%m') for d in df.index]
historico = {SERIES[c]: [r(v, 2) for v in df[c]] for c in [21083, 21084, 27703, 27704]}
macro = {'Selic': [r(v, 2) for v in df[4189]], 'IBC-Br': [r(v, 1) for v in df[24363]]}

# ---------- products: latest level, 5-year range, volatility ----------
modal = []
for c in MODALIDADES:
    s = df[c].dropna()
    ult = s.iloc[-1]
    j = s[s.index >= s.index[-1] - pd.DateOffset(years=5)]
    modal.append({'nome': SERIES[c], 'nomeEn': MOD_EN[SERIES[c]], 'atual': r(ult, 2), 'min5': r(j.min(), 2), 'max5': r(j.max(), 2), 'desvio': r(s.diff().std(), 3)})
modal.sort(key=lambda m: -m['atual'])

# ---------- lead-lag: Selic leads PJ delinquency by how many months? ----------
alvo = df[21083]
cc = []
for k in range(0, 25):
    x = df[4189].diff(12).shift(k)  # 12-month change in Selic, k months earlier
    y = alvo.diff(12)
    m = pd.concat([x, y], axis=1).dropna()
    cc.append({'lag': k, 'corr': r(m.corr().iloc[0, 1], 3)})
lag_best = max(cc, key=lambda c: c['corr'])['lag']

# ---------- 6-month-ahead forecast with rolling-origin backtest ----------
H = 6
X = pd.DataFrame({
    'nivel': alvo,
    'var6': alvo.diff(6),
    'selic_lag': df[4189].shift(lag_best),
    'selic_var12': df[4189].diff(12),
    'ibc_var12': df[24363].pct_change(12, fill_method=None) * 100,
    'grande_menos_mpme': df[27704] - df[27703],
})
y = alvo.shift(-H) - alvo  # change over the next 6 months
dados = pd.concat([X, y.rename('y')], axis=1).dropna()

prev, ingenuo, real, datas = [], [], [], []
for origem in dados.index[dados.index >= '2016-01-01']:
    treino = dados[dados.index <= origem - pd.DateOffset(months=H)]  # only targets already observed at the origin
    if len(treino) < 36:
        continue
    m = Ridge(alpha=1.0).fit(treino.drop(columns='y'), treino.y)
    p = m.predict(dados.loc[[origem]].drop(columns='y'))[0]
    prev.append(dados.loc[origem, 'nivel'] + p)
    ingenuo.append(dados.loc[origem, 'nivel'])
    real.append(dados.loc[origem, 'nivel'] + dados.loc[origem, 'y'])
    datas.append(origem + pd.DateOffset(months=H))
prev, ingenuo, real = map(np.array, (prev, ingenuo, real))
mae = {'modelo': r(np.mean(np.abs(prev - real)), 3), 'ingenuo': r(np.mean(np.abs(ingenuo - real)), 3)}
# Direction hit rate: did the model call "up" vs "down" right (moves larger than 0.1 p.p.)?
mov = np.abs(real - ingenuo) > 0.1
acerto = r(np.mean(np.sign(prev - ingenuo)[mov] == np.sign(real - ingenuo)[mov]), 3)

final = Ridge(alpha=1.0).fit(dados.drop(columns='y'), dados.y)
coefs = {k: r(v, 4) for k, v in zip(dados.columns.drop('y'), final.coef_)}
# Shock scenario: Selic +3 p.p. sustained (affects selic_lag and selic_var12 by +3).
efeito_choque = r(3 * (final.coef_[list(dados.columns).index('selic_lag')] + final.coef_[list(dados.columns).index('selic_var12')]), 3)
hoje = X.dropna().iloc[[-1]]
base_prev = r(hoje.nivel.iloc[0] + final.predict(hoje)[0], 2)

saida = {
    'fonte': 'Banco Central do Brasil: SGS (séries ' + ', '.join(str(c) for c in SERIES) + ')',
    'meses': meses,
    'historico': historico,
    'macro': macro,
    'modalidades': modal,
    'defasagem': {'curva': cc, 'melhor': lag_best},
    'previsao': {
        'horizonte': H, 'mae': mae, 'acertoDirecao': acerto, 'origens': len(prev),
        'datas': [d.strftime('%Y-%m') for d in datas], 'prev': [r(v, 2) for v in prev], 'real': [r(v, 2) for v in real], 'ingenuo': [r(v, 2) for v in ingenuo],
        'coef': coefs, 'choqueSelic3pp': efeito_choque, 'atual': r(alvo.iloc[-1], 2), 'em6meses': base_prev, 'ultimoMes': ultimo.strftime('%Y-%m'),
    },
}
SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({k: saida[k] for k in ['modalidades', 'previsao']}, ensure_ascii=False, indent=1)[:3500])
print('melhor defasagem', lag_best, [c for c in cc if c['lag'] in (0, 6, 12, 18, lag_best)])
print({k: (v[0], v[-1]) for k, v in historico.items()})
