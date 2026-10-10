// Generates content/mover-dados.json for /lab/mover from the MOVER capstone data (read-only source).
// Run once when the map package changes:  node scripts/preparar-mover.mjs
// Sources (outside this repository, never modified):
//   TCC_MAPA  = D:\Minhas coisas\tcc\mapa maua\codigo          (survey pipeline, analysis tables)
//   TCC_WEB   = D:\Minhas coisas\tcc\adptacao\animacao_campus_3d (round 10 package + web model data)
// Every number in the JSON comes from those files. Numbers that only exist in written reports
// (live CARLA lap, detector) are copied with their source in `fonte`.
import fs from 'node:fs';
import path from 'node:path';

const TCC_MAPA = process.env.TCC_MAPA ?? 'D:/Minhas coisas/tcc/mapa maua/codigo';
const TCC_WEB = process.env.TCC_WEB ?? 'D:/Minhas coisas/tcc/adptacao/animacao_campus_3d';
const ORIGEM = path.join(TCC_WEB, 'dados_origem');
const SAIDA = 'content/mover-dados.json';

const ler = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
function csv(p, sep = ';') {
  const [cab, ...linhas] = ler(p).trim().split(/\r?\n/);
  const cols = cab.split(sep);
  return linhas.map((l) => Object.fromEntries(l.split(sep).map((v, i) => [cols[i], v])));
}
const num = (v) => (v === '' || v === undefined ? null : Number(String(v).replace(',', '.')));
const r = (v, k = 2) => Math.round(v * 10 ** k) / 10 ** k;

// Survey frame (local metres, Z = altitude) -> scene frame of the web model (y up, recentred).
const web = JSON.parse(ler(path.join(TCC_WEB, 'public/objetos.json')));
const O = web.origem; // cena = glTF - origem; glTF = (X, Z, -Y)
const cena = (X, Y, Z) => [r(X - O.x), r(Z - O.y), r(-Y - O.z)];

// ---------- route: entry gate -> ring -> exit (trajeto.csv, round 10) ----------
const traj = csv(path.join(ORIGEM, 'mapa/trajeto.csv'), ',');
const rota = traj.map((p, i) => {
  const a = traj[Math.max(0, i - 1)], b = traj[Math.min(traj.length - 1, i + 1)];
  const ds = num(b.dist) - num(a.dist);
  return {
    p: cena(num(p.x), num(p.y), num(p.z)),
    d: r(num(p.dist), 1),
    z: r(num(p.z), 2),
    rampa: r(ds > 0 ? ((num(b.z) - num(a.z)) / ds) * 100 : 0, 1),
    via: p.trecho,
  };
});

// ---------- trees: survey (1 743) and the funnel to CARLA and to the web model ----------
const props = csv(path.join(ORIGEM, 'analise/props.csv'));
const arvores = props
  .filter((p) => p.categoria === 'arvore')
  .map((p) => {
    const c = cena(num(p.x_local), num(p.y_local), num(p.z_m));
    // 0 far (> 30 m), 1 near the road, 2 spawned in CARLA; last item = kept in the web model.
    const classe = p.spawnado_no_carla === 'sim' ? 2 : p.no_raio_30m === 'sim' ? 1 : 0;
    return [...c, classe, 0];
  });
// Each web-model tree is a survey tree after filtering and 8 m sampling: flag its nearest one.
for (const w of web.arvores) {
  let melhor = null, dmin = Infinity;
  for (const a of arvores) { const d = (a[0] - w[0]) ** 2 + (a[2] - w[2]) ** 2; if (d < dmin) { dmin = d; melhor = a; } }
  melhor[4] = 1;
}

const funilProps = {};
for (const p of props) {
  const f = (funilProps[p.categoria] ??= { total: 0, perto: 0, carla: 0 });
  f.total++;
  if (p.no_raio_30m === 'sim') f.perto++;
  if (p.spawnado_no_carla === 'sim') f.carla++;
}

// ---------- buildings (bounding boxes of the web model, height measured or assumed) ----------
const predios = web.predios.map((p) => ({
  id: p.id,
  nome: p.nome,
  area: p.area,
  altura: p.altura,
  medida: p.alturaOrigem.startsWith('MEDIDA'),
  base: p.base,
  bbox: p.bbox,
}));

// ---------- road objects with scene position (speed bumps, crosswalks, parking) ----------
const objetos = web.via.map((v) => ({ tipo: v.tipo, codigo: v.codigo, origem: v.origem, pos: v.pos, rumo: v.rumo }));

// ---------- DXF inventory by thematic group ----------
const layers = csv(path.join(TCC_MAPA, 'saida9/analise/layers.csv'));
const grupos = {};
for (const l of layers) {
  const g = (grupos[l.grupo] ??= { grupo: l.grupo, layers: 0, entidades: 0, pontosZ: 0, usadas: 0, entidadesUsadas: 0 });
  g.layers++;
  g.entidades += num(l.entidades);
  g.pontosZ += num(l.points);
  if (l.usada_no_pipeline === 'sim') { g.usadas++; g.entidadesUsadas += num(l.entidades); }
}
const dxf = {
  layers: layers.length,
  vazias: layers.filter((l) => l.vazia === 'sim').length,
  usadas: layers.filter((l) => l.usada_no_pipeline === 'sim').length,
  entidades: layers.reduce((s, l) => s + num(l.entidades), 0),
  pontosZ: layers.reduce((s, l) => s + num(l.points), 0),
  grupos: Object.values(grupos).sort((a, b) => b.entidades - a.entidades),
};

// ---------- stations every 1 m: sidewalk width and cross slope distributions ----------
const est = csv(path.join(ORIGEM, 'analise/estacoes.csv'));
const calcadas = est.flatMap((e) => [num(e.calcada_esq_m), num(e.calcada_dir_m)]).filter((v) => v !== null);
const superel = est.filter((e) => e.superelev_valida === 'sim').map((e) => num(e.superelev_pct));
function hist(vals, de, ate, passo) {
  const n = Math.round((ate - de) / passo);
  const bins = Array.from({ length: n }, (_, i) => ({ de: r(de + i * passo), ate: r(de + (i + 1) * passo), n: 0 }));
  for (const v of vals) bins[Math.min(n - 1, Math.max(0, Math.floor((v - de) / passo)))].n++;
  return bins;
}
const quantil = (vals, q) => { const s = [...vals].sort((a, b) => a - b); return r(s[Math.floor(q * (s.length - 1))]); };
const estacoes = {
  total: est.length,
  ladosComCalcada: r(calcadas.filter((v) => v > 0).length / calcadas.length * 100, 0),
  calcada: { hist: hist(calcadas.filter((v) => v > 0), 0, 3.5, 0.25), mediana: quantil(calcadas.filter((v) => v > 0), 0.5), p90: quantil(calcadas.filter((v) => v > 0), 0.9) },
  superelev: { hist: hist(superel, -4, 5, 0.5), n: superel.length, mediana: quantil(superel, 0.5), p05: quantil(superel, 0.05), p95: quantil(superel, 0.95) },
};

// ---------- roads ----------
const roads = csv(path.join(ORIGEM, 'analise/roads.csv')).map((v) => ({
  via: v.road, classe: v.classe, comprimento: num(v.comprimento_m), largura: num(v.largura_guia_m),
  raioMin: num(v.raio_min_m), coberturaSuperelev: num(v.superelev_cobertura_pct),
}));

// ---------- provenance: measured vs synthetic ----------
const procedencia = csv(path.join(TCC_MAPA, 'saida9/analise/procedencia.csv')).map((p) => ({ elemento: p.elemento, origem: p.origem, fonte: p.fonte, valor: p.valor }));

// ---------- round-by-round indicators (r1–r8 table) ----------
const evo = csv(path.join(TCC_MAPA, 'saida8/analise/evolucao.csv'));
const linha = (nome) => evo.find((e) => e.indicador === nome);
const serie = (nome) => ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'].map((k) => { const v = num(linha(nome)[k]); return Number.isFinite(v) ? v : null; });
const evolucao = {
  fonte: 'mapa maua/codigo/saida8/analise/evolucao.csv',
  rodadas: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'],
  erroBolsao: serie('erro max de bolsao (m)'),
  furoCarla: serie('furo na malha procedural do CARLA (m2, emulado)'),
  triangulos: serie('triangulos da malha'),
  faixasSobreParking: serie('faixas de pedestre sobre parking'),
  objetosXodr: serie('objetos no .xodr'),
};

// ---------- live lap in CARLA, round 9 x round 10 (written report) ----------
const aoVivo = {
  fonte: 'tcc/adptacao/arrumar em casa/RELATORIO_TESTE20.md (07/10/2026)',
  volta: { metros: 843, segundos: 211, conclusao: 100, recuperacoes: 0, colisoes: 0, cteMedio: 0.1, cteMax: 1.28, contramao: 0 },
  comparacao: [
    { m: 'fps', r9: 15.1, r10: 18.0, unidade: 'fps', melhor: 'maior' },
    { m: 'ram', r9: 2.4, r10: 2.17, unidade: 'GB', melhor: 'menor', nota: 'r9: 2,4–4,1 GB' },
    { m: 'buracos', r9: 4, r10: 0, unidade: '', melhor: 'menor' },
    { m: 'quina', r9: 16.9, r10: 5.1, unidade: 'cm', melhor: 'menor' },
    { m: 'vazio', r9: 177, r10: 0, unidade: 'm²', melhor: 'menor' },
    { m: 'dente', r9: 1.19, r10: 0.15, unidade: 'm', melhor: 'menor' },
    { m: 'verdes', r9: 6, r10: 7, unidade: '/10', melhor: 'maior' },
  ],
  testesOffline: { r9: 321, r10: 353, falhas: 0 },
  detector: { lombadasNaVolta: 4, achadas: 2, eventos: 48, perto: 3, raio: 4 },
};

const saida = {
  gerado: new Date().toISOString().slice(0, 10),
  rodadaMapa: JSON.parse(ler(path.join(ORIGEM, 'manifest.json'))).rodada,
  rota, arvores, predios, objetos, funilProps, dxf, estacoes, roads, procedencia, evolucao, aoVivo,
  contagens: {
    arvoresLevantamento: arvores.length,
    arvoresWeb: web.arvores.length,
    prediosMedidos: predios.filter((p) => p.medida).length,
    predios: predios.length,
    rotaMetros: rota.at(-1).d,
    anelWebMetros: r(JSON.parse(ler(path.join(TCC_WEB, 'public/rota.json'))).comprimento, 0),
  },
};
fs.writeFileSync(SAIDA, JSON.stringify(saida));
console.log(`${SAIDA}: ${(fs.statSync(SAIDA).size / 1024).toFixed(0)} KB`, saida.contagens, `dxf ${dxf.layers} layers / ${dxf.entidades} ent / ${dxf.usadas} usadas`);
console.log('arvores na web casadas:', arvores.filter((a) => a[4]).length, 'de', web.arvores.length);
