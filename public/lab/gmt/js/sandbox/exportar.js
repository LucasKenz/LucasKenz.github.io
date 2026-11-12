// Saídas do Sandbox: arquivo do projeto, link, CSV, relatório imprimível, GLB e PNG.
import { baixar, fmtUSD, nomeMat } from '../architecture/bom.js';
import { SISTEMAS } from '../model/parts.js';
import { materiais, esc } from '../data.js';
import { fmt, fmtA } from '../util.js';
import { serializar, comprimir } from './projeto.js';
import { csvDoProjeto, linhasMetricas, dif, difPct, descrever, ROTULO_TIPO } from './calculo.js';

export const slug = (s) => (s || 'projeto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'projeto';

export function brl(usd, cambio) {
  const x = usd * cambio;
  if (!Number.isFinite(x) || Math.abs(x) < 0.5) return '–';
  const a = Math.abs(x), s = x < 0 ? '−' : '';
  if (a >= 1e9) return `${s}R$ ${fmt(a / 1e9, 2)} bi`;
  if (a >= 1e6) return `${s}R$ ${fmt(a / 1e6, a >= 1e8 ? 0 : 1)} mi`;
  if (a >= 1e3) return `${s}R$ ${fmt(a / 1e3, a >= 1e5 ? 0 : 1)} mil`;
  return `${s}R$ ${fmt(a, 0)}`;
}
/** US$ com sinal (para diferenças). */
export function usdDif(x) {
  if (!Number.isFinite(x) || Math.abs(x) < 0.5) return 'US$ 0';
  return (x < 0 ? '−' : '+') + fmtUSD(Math.abs(x));
}

export function exportarProjeto(p) {
  baixar(serializar(p), `${slug(p.nome)}.gmt.json`, 'application/json');
}
export function exportarCSVProjeto(p) {
  baixar(csvDoProjeto(p), `${slug(p.nome)}-bom.csv`, 'text/csv;charset=utf-8');
}

/** Link com o projeto no hash. Devolve { url, tamanho }. */
export async function gerarLink(p) {
  const dadosLink = await comprimir(p);
  const url = `${location.origin}${location.pathname}#sandbox/${dadosLink}`;
  return { url, tamanho: url.length };
}

/** Captura a vista atual (renderiza e lê o canvas no mesmo quadro). */
export function capturarPNG(renderer, composer) {
  composer.render(0);
  return renderer.domElement.toDataURL('image/png');
}

/**
 * GLB do modelo editado. Exporta o grupo raiz do telescópio (sem céu, terreno, lasers nem vento),
 * com as cores originais e o nome de cada nó = id do tipo de peça. Instâncias saem com EXT_mesh_gpu_instancing.
 */
export async function exportarGLB(raiz, nome) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const nomes = [];
  raiz.traverse((o) => { if (o.userData.peca && !o.name) { o.name = o.userData.peca; nomes.push(o); } });
  try {
    const glb = await new GLTFExporter().parseAsync(raiz, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
    baixar(new Blob([glb], { type: 'model/gltf-binary' }), `${slug(nome)}.glb`);
    return glb.byteLength;
  } finally {
    for (const o of nomes) o.name = '';
  }
}

/** Relatório HTML autossuficiente (abre em nova aba; Imprimir → Salvar como PDF). */
export function relatorioHTML({ projeto, base, atual, semPrecos, impactos, imagem }) {
  const c = atual.cambio;
  const MAT = materiais();
  const linhas = linhasMetricas(atual).map(([rot, un, f]) => {
    const a = f(base), b = f(atual);
    if (!a && !b) return '';
    return `<tr${Math.abs(b - a) > 1e-9 ? ' class="mudou"' : ''}><td>${esc(rot)}</td><td class="n">${fmtA(a)} ${un}</td><td class="n">${fmtA(b)} ${un}</td><td class="n">${dif(a, b, un)}</td><td class="n">${difPct(a, b)}</td></tr>`;
  }).join('');
  const sis = SISTEMAS.map((s) => {
    const a = base.custoSis[s], b = atual.custoSis[s];
    return `<tr${Math.abs(b - a) > 0.5 ? ' class="mudou"' : ''}><td>${esc(s)}</td><td class="n">${fmtUSD(a)}</td><td class="n">${fmtUSD(b)}</td><td class="n">${usdDif(b - a)}</td><td class="n">${difPct(a, b)}</td></tr>`;
  }).join('');
  const eds = projeto.edicoes.map((e, i) => `<tr${e.ativo ? '' : ' class="off"'}><td>${i + 1}</td><td>${ROTULO_TIPO[e.tipo]}</td><td>${esc(e.nome || '')}${e.nome ? '<br>' : ''}<small>${esc(descrever(e))}</small></td><td class="n">${e.ativo ? usdDif(impactos[e.id]?.custo ?? 0) : 'desligada'}</td></tr>`).join('');
  const precos = Object.entries(projeto.precos).map(([m, p]) => `<tr><td>${esc(nomeMat(m))}</td><td class="n">${fmtUSD(MAT[m]?.preco?.usd)} / ${esc(p.por)}</td><td class="n">${fmtUSD(p.usd)} / ${esc(p.por)}</td><td>${esc(p.nota || '')}</td></tr>`).join('');
  const dCusto = atual.custo - base.custo, dPreco = atual.custo - semPrecos.custo, dEd = semPrecos.custo - base.custo;
  const data = new Date().toLocaleString('pt-BR');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(projeto.nome)} · Sandbox GMT</title>
<style>
:root{--ink:#111827;--muted:#4b5563;--line:#d1d5db;--acc:#b45309;--bg:#fff}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ink:#e5e7eb;--muted:#9ca3af;--line:#374151;--acc:#fbbf24;--bg:#0b0f19}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 'IBM Plex Sans',system-ui,sans-serif;padding:24px 16px 48px}
main{max-width:960px;margin:0 auto}h1{font-size:1.7rem;margin:.2rem 0;letter-spacing:-.02em}h2{font-size:1rem;margin:1.6rem 0 .5rem;border-bottom:2px solid var(--acc);padding-bottom:.2rem}
.meta{color:var(--muted);font-size:.85rem}.resumo{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:1rem 0}
.resumo div{border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem}.resumo b{display:block;font:600 1.15rem 'IBM Plex Mono',ui-monospace,monospace}.resumo small{color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:.82rem}th,td{border-bottom:1px solid var(--line);padding:.3rem .4rem;text-align:left;vertical-align:top}th{color:var(--muted);font-size:.72rem;text-transform:uppercase}
td.n{text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace;white-space:nowrap}tr.mudou td{font-weight:600}tr.off td{opacity:.5}small{color:var(--muted)}
.rolo{overflow-x:auto}img{max-width:100%;border:1px solid var(--line);border-radius:8px;margin-top:.5rem}.nota{color:var(--muted);font-size:.8rem}
.barra{position:sticky;top:0;background:var(--bg);padding:.5rem 0;display:flex;gap:.5rem}.barra button{font:inherit;padding:.35rem .8rem;border:1px solid var(--line);border-radius:6px;background:none;color:inherit;cursor:pointer}
@media print{.barra{display:none}body{padding:0}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><main>
<div class="barra"><button onclick="print()">Imprimir / salvar PDF</button></div>
<p class="meta">Sandbox · Telescópio Gigante Magalhães · relatório gerado em ${esc(data)}</p>
<h1>${esc(projeto.nome)}</h1>
<p class="meta">${projeto.autor ? `Autor: ${esc(projeto.autor)} · ` : ''}Criado em ${esc(new Date(projeto.criado).toLocaleDateString('pt-BR'))} · base de dados ${esc(projeto.base?.assinatura ?? '')} (${esc(projeto.base?.data ?? '')}) · ${projeto.edicoes.filter((e) => e.ativo).length} edição(ões) ativa(s)</p>
<div class="resumo">
<div><small>Custo da obra editada</small><b>${fmtUSD(atual.custo)}</b><small>${brl(atual.custo, c)}</small></div>
<div><small>Diferença para a base</small><b>${usdDif(dCusto)}</b><small>${brl(dCusto, c)} · ${difPct(base.custo, atual.custo) || '0%'}</small></div>
<div><small>Por edições</small><b>${usdDif(dEd)}</b><small>quantidades, peças, cabos, planta</small></div>
<div><small>Por preços do cliente</small><b>${usdDif(dPreco)}</b><small>${Object.keys(projeto.precos).length} preço(s) alterado(s)</small></div>
</div>
${imagem ? `<img src="${imagem}" alt="Vista do modelo editado no Sandbox">` : ''}
<h2>Quantidades: base × editado</h2><div class="rolo"><table><thead><tr><th>Métrica</th><th>Base</th><th>Editado</th><th>Diferença</th><th>%</th></tr></thead><tbody>${linhas}</tbody></table></div>
<p class="nota">Cada área tem uma natureza diferente e não é somada às outras. Área de planta = soma das áreas dos prédios e plataformas paramétricos (os demais não mudam).</p>
<h2>Custo por sistema</h2><div class="rolo"><table><thead><tr><th>Sistema</th><th>Base</th><th>Editado</th><th>Diferença</th><th>%</th></tr></thead><tbody>${sis}</tbody>
<tfoot><tr><td><b>Total</b></td><td class="n"><b>${fmtUSD(base.custo)}</b></td><td class="n"><b>${fmtUSD(atual.custo)}</b></td><td class="n"><b>${usdDif(dCusto)}</b></td><td class="n">${difPct(base.custo, atual.custo)}</td></tr></tfoot></table></div>
<h2>Edições</h2>${eds ? `<div class="rolo"><table><thead><tr><th>#</th><th>Tipo</th><th>Descrição</th><th>Impacto no custo</th></tr></thead><tbody>${eds}</tbody></table></div><p class="nota">Impacto = custo com todas as edições − custo sem esta edição (com os preços do cliente).</p>` : '<p class="nota">Nenhuma edição.</p>'}
${precos ? `<h2>Preços do cliente</h2><div class="rolo"><table><thead><tr><th>Material</th><th>Preço base</th><th>Preço do cliente</th><th>Nota</th></tr></thead><tbody>${precos}</tbody></table></div>` : ''}
<h2>Premissas</h2>
<ul class="nota">
<li>Peças adicionadas, cabos e mudanças de planta passam pelo mesmo cálculo das peças originais: volume e área medidos na malha 3D × densidade e preço unitário de <code>materials.json</code>, calibrados pela massa pesquisada quando ela existe.</li>
<li>Cabos: comprimento cobrado = caminho desenhado × número de cabos no feixe × (1 + folga). Massa pela massa linear típica de cada categoria.</li>
<li>Tudo o que o usuário cria ou reprecifica é <b>estimado</b>. Preços de ordem de grandeza (US$, fornecido e instalado), sem projeto, engenharia, transporte especial e contingência.</li>
<li>Câmbio: US$ 1 = R$ ${fmt(c, 2)}${projeto.cambio_brl ? ' (definido no projeto)' : ''}.</li>
</ul>
</main></body></html>`;
}
