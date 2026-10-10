// Quality audit of the built site (dist/). Run after `pnpm build`:
//   node scripts/auditar.mjs            -> accessibility (axe), no-JS, overflow, SEO, internal links
//   node scripts/auditar.mjs --externos -> also checks external links (needs network)
// Writes docs/auditoria/relatorio.md and exits 1 when something fails (for CI).
import { readFile, readdir, writeFile, mkdir, access, stat } from 'node:fs/promises';
import { join, relative, sep, posix } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { servir } from './servidor.mjs';

const DIST = 'dist';
const PORTA = 4331;
const URL_BASE = `http://localhost:${PORTA}`;
const externos = process.argv.includes('--externos');
const so = process.argv.find((a) => a.startsWith('--so='))?.slice(5); // filter routes, e.g. --so=lab

async function* arquivosHtml(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* arquivosHtml(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const rotas = [];
for await (const arq of arquivosHtml(DIST)) {
  const rel = relative(DIST, arq).split(sep).join('/');
  if (rel.includes('/print/')) continue;
  const rota = rel === '404.html' ? '/404.html' : `/${rel.replace(/index\.html$/, '')}`;
  if (!so || rota.includes(so)) rotas.push({ rota, arquivo: arq });
}
rotas.sort((a, b) => a.rota.localeCompare(b.rota));

const falhas = [];
const avisos = [];
const linhas = [];
const falhar = (rota, msg) => falhas.push(`${rota}: ${msg}`);
const avisar = (rota, msg) => avisos.push(`${rota}: ${msg}`);

// 1. Static checks on the HTML: SEO tags, one h1, alt text, internal links.
const existe = async (p) => access(p).then(() => true, () => false);
const ehArquivo = async (p) => stat(p).then((s) => s.isFile(), () => false);
const linksExternos = new Map();
for (const { rota, arquivo } of rotas) {
  const html = await readFile(arquivo, 'utf8');
  const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const descricao = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!titulo) falhar(rota, 'sem <title>');
  else if (titulo.length > 70) avisar(rota, `título longo (${titulo.length} caracteres)`);
  if (!descricao) falhar(rota, 'sem meta description');
  else if (descricao.length < 50 || descricao.length > 170) avisar(rota, `description com ${descricao.length} caracteres (ideal 50–160)`);
  if (!/<html lang="[^"]+"/.test(html)) falhar(rota, 'sem lang no <html>');
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) falhar(rota, `${h1} elementos h1 (esperado 1)`);
  for (const img of html.match(/<img\b[^>]*>/g) ?? []) if (!/\balt="/.test(img)) falhar(rota, `img sem alt: ${img.slice(0, 80)}`);
  const og = html.match(/<meta property="og:image" content="https:\/\/lucaskenz\.github\.io([^"]+)"/)?.[1];
  if (!og) falhar(rota, 'sem og:image');
  else if (!(await existe(join(DIST, og)))) falhar(rota, `og:image não gerada: ${og}`);

  // Internal links and assets must exist in dist/.
  const alvos = [...html.matchAll(/\s(?:href|src|poster)="([^"#?]*)(?:[?#][^"]*)?"/g)].map((m) => m[1]);
  for (const alvo of alvos) {
    if (!alvo || alvo.startsWith('data:') || alvo.startsWith('mailto:')) continue;
    if (/^https?:\/\//.test(alvo)) {
      // Other repos' Pages sites share the domain (e.g. /mover-campus-3d-site/): check those as external.
      const proprio = alvo.match(/^https:\/\/lucaskenz\.github\.io(\/[^/]*)?/);
      const pasta = proprio?.[1] && proprio[1] !== '/' ? proprio[1] : '';
      if (!proprio || (pasta && !(await existe(join(DIST, pasta))))) linksExternos.set(alvo, rota);
      continue;
    }
    const abs = alvo.startsWith('/') ? alvo : posix.join(rota.endsWith('/') ? rota : posix.dirname(rota), alvo);
    const caminho = join(DIST, decodeURIComponent(abs));
    const ok = (await ehArquivo(caminho)) || (await existe(join(caminho, 'index.html')));
    if (!ok) falhar(rota, `link interno quebrado: ${alvo}`);
  }
}

// 2. Browser checks.
const parar = await servir(PORTA, DIST);
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function contexto(opcoes, tema) {
  const ctx = await navegador.newContext(opcoes);
  if (tema) await ctx.addInitScript((t) => { try { localStorage.setItem('tema', t); } catch {} }, tema);
  return ctx;
}

for (const { rota } of rotas) {
  const ehSim = /\/lab\/[^/]+\/$/.test(rota);
  const url = URL_BASE + rota + (ehSim ? '?modo=leve' : '');
  for (const tema of ['light', 'dark']) {
    for (const largura of [1440, 390]) {
      const ctx = await contexto({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' }, tema);
      const pagina = await ctx.newPage();
      const erros = [];
      pagina.on('pageerror', (e) => erros.push(e.message));
      await pagina.goto(url, { waitUntil: 'load' });
      await pagina.waitForTimeout(ehSim ? 1500 : 300);
      const r = await new AxeBuilder({ page: pagina }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).exclude('canvas').analyze();
      for (const v of r.violations) {
        const alvo = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
        const msg = `axe [${tema} ${largura}] ${v.id} (${v.impact}, ${v.nodes.length}x): ${alvo}`;
        if (v.impact === 'critical' || v.impact === 'serious') falhar(rota, msg); else avisar(rota, msg);
      }
      if (largura === 390) {
        const larg = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (larg > 0) falhar(rota, `rolagem horizontal de ${larg}px em 390px (${tema})`);
      }
      for (const e of erros) falhar(rota, `erro de JS: ${e}`);
      linhas.push(`${rota} ${tema} ${largura}: ${r.violations.length} violações axe`);
      await ctx.close();
    }
  }

  // No JS: the main content must be readable and nothing important hidden.
  const ctx = await navegador.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  const pagina = await ctx.newPage();
  await pagina.goto(URL_BASE + rota, { waitUntil: 'load' });
  const semJs = await pagina.evaluate(() => {
    const main = document.querySelector('main');
    const texto = main?.innerText.trim().length ?? 0;
    const escondidos = [...(main?.querySelectorAll('h1,h2,h3,p,li,a') ?? [])].filter((el) => {
      const s = getComputedStyle(el);
      return el.textContent.trim() && (s.opacity === '0' || s.visibility === 'hidden') && !el.closest('[hidden],[aria-hidden="true"]');
    }).length;
    const larg = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { texto, escondidos, larg };
  });
  if (semJs.texto < 80) falhar(rota, `sem JS: main com só ${semJs.texto} caracteres`);
  if (semJs.escondidos) falhar(rota, `sem JS: ${semJs.escondidos} elementos de texto invisíveis`);
  if (semJs.larg > 0) falhar(rota, `sem JS: rolagem horizontal de ${semJs.larg}px em 360px`);
  linhas.push(`${rota} sem JS: ${semJs.texto} caracteres visíveis no main`);
  await ctx.close();
  process.stdout.write('.');
}
await navegador.close();
await parar();
console.log();

// 3. External links (optional; some sites block bots, so these are warnings).
if (externos) {
  for (const [link, rota] of linksExternos) {
    try {
      let r = await fetch(link, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (r.status >= 400) r = await fetch(link, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (r.status >= 400 && r.status !== 999) avisar(rota, `link externo ${r.status}: ${link}`);
      linhas.push(`externo ${r.status}: ${link}`);
    } catch (e) {
      avisar(rota, `link externo sem resposta: ${link} (${e.cause?.code ?? e.name})`);
    }
  }
}

const relatorio = [
  '# Auditoria automática',
  '',
  `Gerado por \`scripts/auditar.mjs\` em ${new Date().toISOString().slice(0, 16).replace('T', ' ')} sobre \`dist/\`.`,
  `Páginas: ${rotas.length} · temas claro/escuro · larguras 1440 e 390 · axe (WCAG 2.2 AA + boas práticas) · sem JS em 360 px${externos ? ' · links externos' : ''}.`,
  '',
  `## Falhas (${falhas.length})`, '', ...(falhas.length ? falhas.map((f) => `- ${f}`) : ['Nenhuma.']), '',
  `## Avisos (${avisos.length})`, '', ...(avisos.length ? avisos.map((f) => `- ${f}`) : ['Nenhum.']), '',
  `## Links externos (${linksExternos.size})`, '', ...[...linksExternos.keys()].map((l) => `- ${l}`), '',
  '## Detalhe', '', '```', ...linhas, '```', '',
].join('\n');
if (!so) {
  await mkdir('docs/auditoria', { recursive: true });
  await writeFile('docs/auditoria/relatorio.md', relatorio);
}
console.log(`auditoria: ${rotas.length} páginas, ${falhas.length} falhas, ${avisos.length} avisos`);
for (const f of falhas) console.log('  FALHA', f);
for (const a of avisos) console.log('  aviso', a);
process.exit(falhas.length ? 1 : 0);
