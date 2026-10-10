// Responsive screenshots of the built site (dist/) for review: docs/capturas/f4/<largura>/<tema>-<página>.jpg
//   node scripts/capturas.mjs [--larguras=360,1440] [--so=lab]
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { servir } from './servidor.mjs';

const PORTA = 4332;
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const larguras = (arg('larguras') ?? '360,390,768,1024,1440,1920').split(',').map(Number);
const so = arg('so');
const paginas = [
  ['inicio', '/'], ['projetos', '/projetos/'], ['mover', '/projetos/mover/'], ['sobre', '/sobre/'],
  ['curriculo', '/curriculo/'], ['contato', '/contato/'], ['lab', '/lab/'], ['lab-lentes', '/lab/lentes/'],
  ['en-inicio', '/en/'], ['404', '/nao-existe'],
].filter(([n]) => !so || n.includes(so));

const parar = await servir(PORTA);
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
for (const largura of larguras) {
  await mkdir(`docs/capturas/f4/${largura}`, { recursive: true });
  for (const tema of ['light', 'dark']) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: largura < 768 ? 800 : 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('tema', t); } catch {} }, tema);
    const pagina = await ctx.newPage();
    for (const [nome, rota] of paginas) {
      await pagina.goto(`http://localhost:${PORTA}${rota}`, { waitUntil: 'load' });
      await pagina.evaluate(() => document.fonts.ready);
      await pagina.waitForTimeout(nome.startsWith('lab') ? 1200 : 250);
      const inteira = !nome.startsWith('lab');
      await pagina.screenshot({ path: `docs/capturas/f4/${largura}/${tema === 'light' ? 'claro' : 'escuro'}-${nome}.jpg`, type: 'jpeg', quality: 62, fullPage: inteira });
    }
    await ctx.close();
  }
  process.stdout.write(`${largura} `);
}
await navegador.close();
await parar();
console.log('\ncapturas: docs/capturas/f4/');
