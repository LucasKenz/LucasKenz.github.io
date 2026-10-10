// Lighthouse (mobile and desktop) on the built site (dist/). Reports go to docs/lighthouse/.
//   node scripts/lighthouse.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { servir } from './servidor.mjs';

const executar = promisify(execFile);
const PORTA = 4334;
const SAIDA = 'docs/lighthouse';
const paginas = [
  ['inicio', '/'], ['projetos', '/projetos/'], ['mover', '/projetos/mover/'], ['sobre', '/sobre/'],
  ['curriculo', '/curriculo/'], ['contato', '/contato/'], ['lab', '/lab/'], ['lab-cidade', '/lab/cidade/'], ['en-inicio', '/en/'],
];
const categorias = ['performance', 'accessibility', 'best-practices', 'seo'];

await mkdir(SAIDA, { recursive: true });
const parar = await servir(PORTA);
const env = { ...process.env, CHROME_PATH: chromium.executablePath() };
const cli = 'node_modules/lighthouse/cli/index.js';
const linhas = [];

for (const [nome, rota] of paginas) {
  for (const modo of ['mobile', 'desktop']) {
    const base = `${SAIDA}/${nome}-${modo}`;
    const args = [
      `http://localhost:${PORTA}${rota}`, '--quiet', '--output=json', '--output=html', `--output-path=${base}`,
      `--only-categories=${categorias.join(',')}`, '--chrome-flags=--headless=new --no-sandbox',
      ...(modo === 'desktop' ? ['--preset=desktop'] : []),
    ];
    await executar(process.execPath, [cli, ...args], { env, maxBuffer: 64e6 });
    const r = JSON.parse(await readFile(`${base}.report.json`, 'utf8'));
    const notas = categorias.map((c) => Math.round(r.categories[c].score * 100));
    const lcp = r.audits['largest-contentful-paint'].displayValue;
    const cls = r.audits['cumulative-layout-shift'].displayValue;
    linhas.push(`| ${rota} | ${modo} | ${notas.join(' | ')} | ${lcp} | ${cls} |`);
    console.log(rota, modo, notas.join(' '), lcp, cls);
  }
}
await parar();

await writeFile(
  `${SAIDA}/README.md`,
  [
    '# Lighthouse',
    '',
    `Gerado por \`scripts/lighthouse.mjs\` em ${new Date().toISOString().slice(0, 10)}, sobre \`dist/\` servido localmente (sem CDN nem HTTP/2, como uma medição conservadora).`,
    'Abra os arquivos `.report.html` para o detalhe de cada medição.',
    '',
    '| Página | Modo | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS |',
    '|---|---|---|---|---|---|---|---|',
    ...linhas,
    '',
  ].join('\n'),
);
