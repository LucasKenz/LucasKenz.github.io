// Quantitativos por peça (medidos na malha) e Bill of Materials da obra inteira.
import { PECAS, PECA, SISTEMAS, construir } from '../model/parts.js';
import { medirPeca } from '../model/geom.js';
import { materiais, dados, selo, esc, val } from '../data.js';
import { fmt, fmtA } from '../util.js';
import { barras, SERIES } from '../ui/charts.js';

const cache = new Map();
const ORDEM_CONF = { oficial: 0, artigo: 1, estimado: 2 };
const pior = (a, b) => (ORDEM_CONF[a] >= ORDEM_CONF[b] ? a : b);

// "Conjuntos mecatrônicos/ópticos" variam demais para um preço único: valor próprio por peça (estimado, ordem de grandeza).
const PRECO_COMPONENTES = {
  'instrumento-dg': [25e6, 'Instrumento de primeira luz completo (óptica, detectores, criostato): dezenas de milhões de US$.'],
  'instrumento-fp': [15e6, 'Instrumento de porta dobrada: ordem de US$ 10–20 milhões.'],
  gclef: [40e6, 'Espectrógrafo de altíssima estabilidade em sala própria: ordem de US$ 30–50 milhões.'],
  'lancador-lgs': [1.5e6, 'Telescópio lançador, óptica de transferência e diagnóstico.'],
};

/** Preço unitário (US$) de um material na unidade em que ele é cobrado. */
const precoDe = (mat) => materiais()[mat]?.preco ?? null;

/** Formata dinheiro em US$ (mil, mi, bi). */
export function fmtUSD(x) {
  if (!Number.isFinite(x) || x <= 0) return '–';
  if (x >= 1e9) return `US$ ${fmt(x / 1e9, 2)} bi`;
  if (x >= 1e6) return `US$ ${fmt(x / 1e6, x >= 1e8 ? 0 : 1)} mi`;
  if (x >= 1e3) return `US$ ${fmt(x / 1e3, x >= 1e5 ? 0 : 1)} mil`;
  return `US$ ${fmt(x, 0)}`;
}
export const cambio = () => materiais()._meta?.cambio_brl?.valor ?? 5.4;
export function fmtBRL(usd) {
  const x = usd * cambio();
  if (!Number.isFinite(x) || x <= 0) return '–';
  if (x >= 1e9) return `R$ ${fmt(x / 1e9, 2)} bi`;
  if (x >= 1e6) return `R$ ${fmt(x / 1e6, x >= 1e8 ? 0 : 1)} mi`;
  if (x >= 1e3) return `R$ ${fmt(x / 1e3, x >= 1e5 ? 0 : 1)} mil`;
  return `R$ ${fmt(x, 0)}`;
}

/**
 * Quantitativo de UMA peça: volume, área e massa por material (medidos na geometria),
 * calibrado pela massa pesquisada quando ela existe, mais os itens contados (extras).
 */
export function quantitativos(id) {
  if (cache.has(id)) return cache.get(id);
  const p = PECA[id], MAT = materiais();
  const raiz = construir(id, true);
  const med = medirPeca(raiz);
  raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  const linhas = [];
  let massaModelo = 0;
  for (const [mat, m] of Object.entries(med)) {
    const info = MAT[mat];
    if (!info) continue;
    const massa = info.densidade ? (m.vol * info.densidade) / 1000 : 0; // t
    massaModelo += massa;
    linhas.push({ mat, vol: m.vol, area: m.area, comprimento: m.comprimento, massa, conf: info.confidence });
  }
  const pesq = p.pesquisado;
  const fator = pesq?.massa_t && massaModelo > 0 ? pesq.massa_t / massaModelo : 1;
  for (const l of linhas) {
    l.massaCal = l.massa * fator;
    // quantidade na unidade de cobrança do material
    const pr = precoDe(l.mat);
    const base = !pr ? 0 : pr.por === 't' ? l.massaCal : pr.por === 'kg' ? l.massaCal * 1000 : pr.por === 'm³' ? l.vol * fator : pr.por === 'm²' ? l.area : 0;
    l.custo = pr ? base * pr.usd : 0;
  }
  // derivados: armadura do concreto, pintura das superfícies de aço, comprimento de tubos
  const extras = [];
  const conc = linhas.find((l) => l.mat === 'concreto');
  if (conc && p.taxa) extras.push({ mat: 'armadura', qtd: (conc.vol * p.taxa) / 1000, un: 't', massa: (conc.vol * p.taxa) / 1000, fonte: 'calculo', conf: 'estimado', nota: `Taxa de ${p.taxa} kg/m³ de concreto (estimada).` });
  const aco = linhas.filter((l) => l.mat.startsWith('aco_')).reduce((s, l) => s + l.area, 0);
  if (aco > 0) extras.push({ mat: 'pintura', qtd: aco, un: 'm²', massa: 0, fonte: 'calculo', conf: 'estimado', nota: 'Área de aço exposta, medida na malha.' });
  const tubos = linhas.reduce((s, l) => s + (l.comprimento || 0), 0);
  if (tubos > 0) extras.push({ mat: 'tubo_aco', qtd: tubos, un: 'm', massa: 0, fonte: 'calculo', conf: 'estimado', nota: 'Comprimento de tubos medido no modelo (massa já incluída no aço).' });
  for (const [mat, q, fonte, conf, nota] of p.extras ?? []) {
    const info = MAT[mat] ?? {};
    const massa = info.densidade_area ? (q * info.densidade_area) / 1000 : 0;
    extras.push({ mat, qtd: q, un: info.unidade === 'm²' ? 'm²' : info.unidade ?? 'un', massa, fonte, conf, nota });
  }
  for (const e of extras) {
    const pr = precoDe(e.mat);
    if (e.mat === 'componentes' && PRECO_COMPONENTES[id]) {
      e.custo = e.qtd * PRECO_COMPONENTES[id][0];
      e.notaPreco = PRECO_COMPONENTES[id][1];
    } else e.custo = pr ? e.qtd * pr.usd : 0;
  }
  const massaTotal = linhas.reduce((s, l) => s + l.massaCal, 0) + extras.reduce((s, e) => s + e.massa, 0);
  const custo = linhas.reduce((s, l) => s + l.custo, 0) + extras.reduce((s, e) => s + e.custo, 0);
  const r = { id, linhas, extras, massaModelo, fator, pesq, massaTotal, custo };
  cache.set(id, r);
  return r;
}

export function nomeMat(mat) { return materiais()[mat]?.nome ?? mat; }
export function corMat(mat) { return materiais()[mat]?.cor ?? '#888'; }

/** Tabela de quantitativos de uma peça (HTML). */
export function htmlQuantitativos(id) {
  const p = PECA[id], q = quantitativos(id), n = p.qtd[0];
  const linhas = q.linhas.map((l) => `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${corMat(l.mat)};margin-right:4px"></i>${esc(nomeMat(l.mat))}</td>
    <td class="n">${fmtA(l.vol)} m³</td><td class="n">${fmtA(l.area)} m²</td><td class="n">${fmtA(l.massaCal)} t</td><td class="n">${fmtA(l.massaCal * n)} t</td><td class="n" title="${esc(tituloPreco(l.mat))}">${fmtUSD(l.custo * n)}</td><td>${selo(l.conf, materiais()[l.mat]?.fonte)}</td></tr>`).join('');
  const ex = q.extras.map((e) => `<tr><td title="${esc(e.nota ?? '')}">${esc(nomeMat(e.mat))}</td><td class="n" colspan="2">${fmtA(e.qtd)} ${e.un}</td><td class="n">${e.massa ? fmtA(e.massa) + ' t' : '–'}</td><td class="n">${fmtA(e.qtd * n)} ${e.un}</td><td class="n" title="${esc(e.notaPreco ?? tituloPreco(e.mat))}">${fmtUSD(e.custo * n)}</td><td>${selo(e.conf, e.fonte)}</td></tr>`).join('');
  const total = q.massaTotal;
  let div = '';
  if (q.pesq?.massa_t) {
    const d = (q.massaModelo / q.pesq.massa_t - 1) * 100;
    div = `<p class="nota-div">Massa medida no modelo: <b>${fmtA(q.massaModelo)} t</b> · pesquisada: <b>${fmtA(q.pesq.massa_t)} t</b> ${selo(q.pesq.conf, q.pesq.fonte)} (diferença de ${d > 0 ? '+' : ''}${fmt(d, 0)}%). As massas abaixo foram calibradas pelo valor pesquisado (×${fmt(q.fator, 2)}).${q.pesq.nota ? ' ' + esc(q.pesq.nota) : ''}</p>`;
  }
  // composição em barra
  const soma = q.linhas.reduce((s, l) => s + l.massaCal, 0) || 1;
  const barra = `<div class="barras-mat">${q.linhas.map((l) => `<span style="width:${(l.massaCal / soma) * 100}%;background:${corMat(l.mat)}" title="${esc(nomeMat(l.mat))}"></span>`).join('')}</div>
    <div class="legenda-mat">${q.linhas.map((l) => `<span><i style="background:${corMat(l.mat)}"></i>${esc(nomeMat(l.mat))} ${fmt((l.massaCal / soma) * 100, 0)}%</span>`).join('')}</div>`;
  const custo = `<div class="custo-peca"><div><small>Custo estimado por peça</small><b>${fmtUSD(q.custo)}</b><span>${fmtBRL(q.custo)}</span></div>
    <div><small>Para as ${fmt(n, 0)} peças</small><b>${fmtUSD(q.custo * n)}</b><span>${fmtBRL(q.custo * n)}</span></div>${selo('estimado', 'calculo')}</div>
    <p class="nota-div">Material fornecido e instalado, em ordem de grandeza (preços unitários em <code>data/materials.json</code>; passe o mouse sobre um valor para ver a premissa). Não inclui projeto, engenharia, transporte especial nem contingência. Câmbio US$ 1 = R$ ${fmt(cambio(), 2)}.${q.extras.find((e) => e.notaPreco) ? ' ' + esc(q.extras.find((e) => e.notaPreco).notaPreco) : ''}</p>`;
  return `${div}${custo}
    <table class="tabela"><thead><tr><th>Material</th><th>Volume</th><th>Área</th><th>Massa/un.</th><th>× ${fmt(n, 0)}</th><th>Custo × ${fmt(n, 0)}</th><th></th></tr></thead>
    <tbody>${linhas}${ex}</tbody>
    <tfoot><tr><td>Total</td><td></td><td></td><td class="n">${fmtA(total)} t</td><td class="n">${fmtA(total * n)} t</td><td class="n">${fmtUSD(q.custo * n)}</td><td></td></tr></tfoot></table>
    ${barra}`;
}

function tituloPreco(mat) {
  const pr = precoDe(mat);
  return pr ? `${fmtUSD(pr.usd)} por ${pr.por} (estimado). ${pr.nota ?? ''}` : 'Sem preço.';
}

/** Soma de toda a obra: por material e por sistema. */
export function totalObra() {
  const porMat = {}, porSis = Object.fromEntries(SISTEMAS.map((s) => [s, 0]));
  const custoSis = Object.fromEntries(SISTEMAS.map((s) => [s, 0]));
  const add = (mat, qtd, un, massa, conf, custo = 0) => {
    const a = (porMat[mat] ??= { mat, qtd: 0, un, massa: 0, conf, custo: 0 });
    a.qtd += qtd; a.massa += massa; a.custo += custo; a.conf = pior(a.conf, conf);
  };
  const MAT = materiais();
  for (const p of PECAS) {
    const q = quantitativos(p.id), n = p.qtd[0];
    for (const l of q.linhas) {
      const info = MAT[l.mat];
      const un = info.unidade;
      const qtd = un === 'm³' ? l.vol : un === 'kg' ? l.massaCal * 1000 : l.massaCal;
      add(l.mat, qtd * n, un === 'kg' ? 'kg' : un === 'm³' ? 'm³' : 't', l.massaCal * n, pior(l.conf, p.qtd[2]), l.custo * n);
      porSis[p.sistema] += l.massaCal * n;
      custoSis[p.sistema] += l.custo * n;
    }
    for (const e of q.extras) {
      add(e.mat, e.qtd * n, e.un, e.massa * n, pior(e.conf, p.qtd[2]), e.custo * n);
      porSis[p.sistema] += e.massa * n;
      custoSis[p.sistema] += e.custo * n;
    }
  }
  const massa = Object.values(porMat).reduce((s, m) => s + m.massa, 0);
  const custo = Object.values(porMat).reduce((s, m) => s + m.custo, 0);
  return { porMat, porSis, massa, custo, custoSis };
}

export function montarBOM() {
  const T = totalObra(), MAT = materiais();
  const linhas = Object.values(T.porMat).sort((a, b) => b.massa - a.massa || b.qtd - a.qtd);
  document.getElementById('tabBom').innerHTML = `<thead><tr><th>Material</th><th>Especificação típica</th><th>Quantidade</th><th>Massa</th><th>Custo estimado</th><th>Confiança</th></tr></thead>
    <tbody>${linhas.map((l) => `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${corMat(l.mat)};margin-right:4px"></i>${esc(nomeMat(l.mat))}</td><td>${esc(MAT[l.mat]?.spec ?? '')}</td><td class="n">${fmtA(l.qtd)} ${l.un}</td><td class="n">${l.massa ? fmtA(l.massa) + ' t' : '–'}</td><td class="n" title="${esc(tituloPreco(l.mat))}">${fmtUSD(l.custo)}</td><td>${selo(l.conf, MAT[l.mat]?.fonte)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total modelado</td><td></td><td></td><td class="n">${fmtA(T.massa)} t</td><td class="n">${fmtUSD(T.custo)}<br><small>${fmtBRL(T.custo)}</small></td><td></td></tr></tfoot>`;

  // comparações (ordens de grandeza conhecidas; aproximadas)
  const aco = ['aco_estrutural', 'aco_usinado', 'aco_trilho', 'aco_inox', 'armadura'].reduce((s, m) => s + (T.porMat[m]?.massa ?? 0), 0);
  const conc = T.porMat.concreto?.qtd ?? 0;
  const vidro = T.porMat.vidro_e6?.qtd ?? 0;
  const comps = [
    [fmt(aco, 0) + ' t', `de aço (estrutura, trilhos, armadura): ${fmt(aco / 7300, 1)}× o ferro da Torre Eiffel (~7.300 t)`],
    [fmt(conc, 0) + ' m³', `de concreto: ${fmt(conc / 2500, 1)} piscinas olímpicas (~2.500 m³ cada)`],
    [fmt(vidro / 1000, 0) + ' t', `de vidro E6 nos 7 espelhos: o peso de ~${fmt(vidro / 1000 / 1.5, 0)} carros médios`],
    [fmt(T.massa, 0) + ' t', `modeladas no total: ${fmt(T.massa / 225, 0)}× a Estátua da Liberdade (~225 t)`],
    [fmt(val('enclosure.massa_rotativa_t'), 0) + ' t', 'giram com o domo, numa volta a cada 4 minutos (dado oficial)'],
    [fmtUSD(T.custo), `estimados em materiais e equipamentos modelados (${fmtBRL(T.custo)}): cerca de ${fmt((T.custo / val('projeto.custo_estimado_usd')) * 100, 0)}% do custo total do projeto (~US$ 2 bi), que inclui engenharia, óptica, instrumentos e operação da obra`],
  ];
  document.getElementById('comparacoes').innerHTML = comps.map(([b, s]) => `<div class="comp"><b>${b}</b><span>${s}</span></div>`).join('') +
    '<p class="dica" style="grid-column:1/-1">Comparações aproximadas, de ordem de grandeza. A massa total é a soma das peças modeladas (não inclui cabos, tubulações, equipamentos e acabamentos). A montagem oficial pesa 2.100 t com espelhos e o domo giratório ~5.660 t.</p>';

  // massa por sistema (barras horizontais; uma cor por sistema, rótulos diretos)
  const cv = document.getElementById('gSistemas');
  const itens = SISTEMAS.map((s, i) => ({ nome: s, valor: T.porSis[s], cor: SERIES[i] })).filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  cv.height = 40 + itens.length * 30; cv.dataset.h = cv.height;
  barras(cv, itens, 't');
  const custoSis = SISTEMAS.map((s) => [s, T.custoSis[s]]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  let tab = document.getElementById('custoSistemas');
  if (!tab) { tab = document.createElement('table'); tab.id = 'custoSistemas'; tab.className = 'tabela custo-sis'; cv.after(tab); }
  tab.innerHTML = `<thead><tr><th>Sistema</th><th>Custo estimado</th><th>Parcela</th></tr></thead><tbody>${custoSis.map(([s, c]) => `<tr><td>${esc(s)}</td><td class="n">${fmtUSD(c)}</td><td class="n">${fmt((c / T.custo) * 100, 0)}%</td></tr>`).join('')}</tbody>`;

  // linha do tempo
  document.getElementById('linhaTempo').innerHTML = dados().cronologia.map((c) => `<li class="${c.ano > 2026 ? 'futuro' : ''}"><b>${c.ano}</b>${esc(c.evento)} ${selo(c.confidence, c.fonte)}</li>`).join('');
  return T;
}

export function exportarCSV() {
  const MAT = materiais();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['tipo', 'peca', 'sistema', 'quantidade_pecas', 'fonte_quantidade', 'confianca_quantidade', 'material', 'especificacao', 'volume_m3_por_peca', 'area_m2_por_peca', 'massa_t_por_peca', 'massa_t_total', 'qtd_extra_por_peca', 'unidade_extra', 'fator_calibracao', 'custo_usd_por_peca', 'custo_usd_total']];
  for (const p of PECAS) {
    const r = quantitativos(p.id), n = p.qtd[0];
    for (const l of r.linhas) rows.push(['material', p.nome, p.sistema, n, p.qtd[1], p.qtd[2], nomeMat(l.mat), MAT[l.mat]?.spec ?? '', l.vol.toFixed(4), l.area.toFixed(3), l.massaCal.toFixed(4), (l.massaCal * n).toFixed(3), '', '', r.fator.toFixed(3), l.custo.toFixed(0), (l.custo * n).toFixed(0)]);
    for (const e of r.extras) rows.push(['item', p.nome, p.sistema, n, e.fonte, e.conf, nomeMat(e.mat), MAT[e.mat]?.spec ?? '', '', '', e.massa.toFixed(4), (e.massa * n).toFixed(3), e.qtd.toFixed(3), e.un, '', e.custo.toFixed(0), (e.custo * n).toFixed(0)]);
  }
  const csv = '﻿' + rows.map((r) => r.map(q).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'gmt-bom.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
