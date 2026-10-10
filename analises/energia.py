"""Heat and electricity load: ONS hourly load (SE/CO subsystem) x INMET hourly temperature in São Paulo.
Day-ahead load forecast with an honest train/test split in time.

Inputs : private/dados/ons/CURVA_CARGA_2025.csv (ONS, curva de carga horária)
         private/dados/inmet/2025/INMET_SE_SP_A701_*.CSV and A771 (INMET, São Paulo Mirante and Interlagos)
Output : content/lab-dados/energia.json
Run    : private/.venv/Scripts/python -s analises/energia.py
"""
import glob
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression

SAIDA = Path('content/lab-dados/energia.json')
FERIADOS = pd.to_datetime(['2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19',
                           '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'])


def r(x, k=3):
    return None if x is None or not np.isfinite(x) else round(float(x), k)


# ---------- load ----------
ons = pd.read_csv('private/dados/ons/CURVA_CARGA_2025.csv', sep=';')
ons = ons[ons.id_subsistema == 'SE'].copy()
ons['t'] = pd.to_datetime(ons.din_instante)
carga = ons.set_index('t').val_cargaenergiahomwmed.rename('carga').astype(float)

# ---------- temperature (UTC -> Brasília, UTC-3), mean of two São Paulo stations ----------
temps = []
for f in sorted(glob.glob('private/dados/inmet/2025/INMET_SE_SP_A7[07]1_*.CSV')):
    d = pd.read_csv(f, sep=';', skiprows=8, encoding='latin1', decimal=',')
    d['t'] = pd.to_datetime(d['Data'] + ' ' + d['Hora UTC'].str[:2] + ':00', format='%Y/%m/%d %H:%M') - pd.Timedelta(hours=3)
    col = [c for c in d.columns if c.startswith('TEMPERATURA DO AR')][0]
    s = d.set_index('t')[col].replace(-9999, np.nan)
    temps.append(s.rename(Path(f).name.split('_')[3]))  # station code, e.g. A701
temp = pd.concat(temps, axis=1)
cobertura = {k: r(temp[k].notna().mean()) for k in temp.columns}
temp = temp.mean(axis=1).interpolate(limit=3).rename('temp')

df = pd.concat([carga, temp], axis=1, sort=True).dropna()
df = df[df.index.year == 2025]
df['hora'] = df.index.hour
df['dow'] = df.index.dayofweek
df['feriado'] = df.index.normalize().isin(FERIADOS).astype(int)
df['util'] = ((df.dow < 5) & (df.feriado == 0)).astype(int)
df['mes'] = df.index.month

# ---------- 1. daily curve: weekday vs weekend ----------
perfil = {
    'util': [r(v, 0) for v in df[df.util == 1].groupby('hora').carga.mean()],
    'fimDeSemana': [r(v, 0) for v in df[df.util == 0].groupby('hora').carga.mean()],
}

# ---------- 2. daily temperature-load curve with a break point (hockey stick) ----------
dia = df.resample('D').agg({'carga': 'mean', 'temp': 'max', 'util': 'first'}).dropna()
uteis = dia[dia.util == 1]
melhor = None
for tb in np.arange(20, 32.01, 0.25):
    X = np.c_[np.maximum(uteis.temp - tb, 0), np.minimum(uteis.temp - tb, 0)]
    m = LinearRegression().fit(X, uteis.carga)
    sse = ((m.predict(X) - uteis.carga) ** 2).sum()
    if melhor is None or sse < melhor[0]:
        melhor = (sse, tb, m.coef_[0], m.coef_[1], m.intercept_, m.score(X, uteis.carga))
_, tb, inc_quente, inc_frio, base, r2 = melhor
dispersao = [{'temp': r(t, 1), 'carga': r(c, 0), 'util': int(u)} for t, c, u in zip(dia.temp, dia.carga, dia.util)]

# ---------- 3. day-ahead forecast ----------
# Features available the day before: calendar, the temperature forecast (here: the observed temperature,
# i.e. a perfect-forecast upper bound, stated on the page), and the load one week earlier.
df['carga_7d'] = df.carga.shift(24 * 7)
df['carga_2d'] = df.carga.shift(24 * 2)  # known when the day-ahead forecast is made
df['cdh'] = np.maximum(df.temp - tb, 0)
df = df.dropna()
treino, teste = df[df.index < '2025-10-01'], df[df.index >= '2025-10-01']
alvo = 'carga'


def mape(y, p):
    return float(np.mean(np.abs((y - p) / y)))


modelos = {}
modelos['ingenuo'] = teste.carga_7d.values  # same hour, last week
cal = ['hora', 'dow', 'feriado', 'util', 'mes']
Xc = lambda d: pd.get_dummies(d[['hora', 'dow']].astype(str)).join(d[['feriado']]).reindex(columns=pd.get_dummies(treino[['hora', 'dow']].astype(str)).join(treino[['feriado']]).columns, fill_value=0)
lin = LinearRegression().fit(Xc(treino), treino.carga)
modelos['calendario'] = lin.predict(Xc(teste))
feats = ['hora', 'dow', 'feriado', 'util', 'temp', 'cdh', 'carga_7d']
gbm_sem = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, random_state=0).fit(treino[[f for f in feats if f not in ('temp', 'cdh')]], treino.carga)
modelos['semTemperatura'] = gbm_sem.predict(teste[[f for f in feats if f not in ('temp', 'cdh')]])
gbm = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, random_state=0).fit(treino[feats], treino.carga)
modelos['comTemperatura'] = gbm.predict(teste[feats])
# Calendar + piecewise temperature (the hockey stick) in a linear model: interpretable alternative.
Xt = lambda d: Xc(d).assign(cdh=d.cdh.values, frio=np.minimum(d.temp - tb, 0).values)
lin_t = LinearRegression().fit(Xt(treino), treino.carga)
modelos['calendarioTemperatura'] = lin_t.predict(Xt(teste))
# Same, plus recent level (load two days earlier, same hour) to follow slow drifts.
feats2 = feats + ['carga_2d']
gbm2 = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, random_state=0).fit(treino[feats2], treino.carga)
modelos['comTemperaturaNivel'] = gbm2.predict(teste[feats2])
erros = {k: r(mape(teste.carga.values, v), 4) for k, v in modelos.items()}

imp = permutation_importance(gbm2, teste[feats2], teste.carga, n_repeats=5, random_state=0, scoring='neg_mean_absolute_percentage_error')
importancia = sorted([{'var': f, 'valor': r(v, 4)} for f, v in zip(feats2, imp.importances_mean)], key=lambda x: -x['valor'])

# Hot days: error of each model on the 10 % hottest test days.
quentes = teste.temp.resample('D').max()
quentes = quentes[quentes >= quentes.quantile(0.9)].index
mask = teste.index.normalize().isin(quentes)
errosQuentes = {k: r(mape(teste.carga.values[mask], v[mask]), 4) for k, v in modelos.items()}

# One test week for the chart (actual vs the two GBMs), the hottest week of the test period.
semana_ini = teste.temp.resample('W-MON').mean().idxmax() - pd.Timedelta(days=6)
sem = teste[(teste.index >= semana_ini) & (teste.index < semana_ini + pd.Timedelta(days=7))]
idx = teste.index.get_indexer(sem.index)
semana = {
    'inicio': str(semana_ini.date()),
    'real': [r(v, 0) for v in sem.carga],
    'final': [r(v, 0) for v in modelos['comTemperaturaNivel'][idx]],
    'ingenuo': [r(v, 0) for v in modelos['ingenuo'][idx]],
    'temp': [r(v, 1) for v in sem.temp],
}

# Heat map day x hour (for the 3D surface): mean load by (month, hour) on working days.
superficie = df[df.util == 1].groupby(['mes', 'hora']).carga.mean().unstack().round(0)

saida = {
    'fonte': {'carga': 'ONS — Curva de carga horária 2025, subsistema Sudeste/Centro-Oeste', 'clima': 'INMET — estações A701 (Mirante de Santana) e A771 (Interlagos), 2025'},
    'cobertura': cobertura,
    'horas': int(len(df)),
    'perfil': perfil,
    'curva': {'base': r(tb, 2), 'porGrauQuente': r(inc_quente, 0), 'porGrauFrio': r(inc_frio, 0), 'cargaBase': r(base, 0), 'r2': r(r2, 3)},
    'dispersao': dispersao,
    'previsao': {'treino': [str(treino.index.min().date()), str(treino.index.max().date())], 'teste': [str(teste.index.min().date()), str(teste.index.max().date())], 'mape': erros, 'mapeQuentes': errosQuentes},
    'importancia': importancia,
    'semana': semana,
    'superficie': {'meses': [int(m) for m in superficie.index], 'valores': superficie.values.tolist()},
    'cargaMedia': r(df.carga.mean(), 0),
    'pico': {'valor': r(df.carga.max(), 0), 'quando': str(df.carga.idxmax()), 'temp': r(df.loc[df.carga.idxmax(), 'temp'], 1)},
}
SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(json.dumps(saida, ensure_ascii=False), encoding='utf8')
print(json.dumps({k: saida[k] for k in ['cobertura', 'horas', 'curva', 'previsao', 'importancia', 'cargaMedia', 'pico']}, ensure_ascii=False, indent=1))
