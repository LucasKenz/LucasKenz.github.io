// Generates the résumé PDFs from the built site (dist/), so the PDF and the web page come from
// the same content/ files. Runs after `astro build`.
//
// Public PDFs (no phone)  -> dist/cv/ and public/cv/
// Full PDFs (with phone)  -> private/ (gitignored), only if private/contato.json exists:
//   { "telefone": "+55 (11) 9xxxx-xxxx" }
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { servir } from './servidor.mjs';

const DIST = 'dist';
const parar = await servir(4330, DIST);

let contato = null;
try {
  await access('private/contato.json');
  contato = JSON.parse(await readFile('private/contato.json', 'utf8'));
} catch {}

const paginas = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await mkdir(join(DIST, 'cv'), { recursive: true });
await mkdir('public/cv', { recursive: true });
let problemas = 0;

for (const lang of ['pt', 'en']) {
  for (const area of ['fullstack', 'ia']) {
    const rota = `${lang === 'pt' ? '' : '/en'}/curriculo/print/${area}/`;
    await pagina.goto(`http://localhost:4330${rota}`, { waitUntil: 'networkidle' });
    await pagina.evaluate(() => document.fonts.ready);
    const opcoes = { format: 'A4', printBackground: false, preferCSSPageSize: true, tagged: true, outline: false };
    const nome = `cv-lucas-kenzo-${area}-${lang}.pdf`;
    const pdf = await pagina.pdf(opcoes);
    await writeFile(join(DIST, 'cv', nome), pdf);
    await writeFile(join('public/cv', nome), pdf);
    const n = paginas(pdf);
    console.log(`cv: ${nome} (${(pdf.length / 1024).toFixed(0)} KB, ${n} página${n > 1 ? 's' : ''})`);
    if (n !== 1) { problemas++; console.warn(`  aviso: ${nome} tem ${n} páginas (meta: 1)`); }

    if (contato?.telefone) {
      await pagina.evaluate((tel) => {
        const el = document.querySelector('[data-telefone]');
        if (el) { el.textContent = `· ${tel}`; el.hidden = false; }
      }, contato.telefone);
      await mkdir('private', { recursive: true });
      await writeFile(join('private', nome.replace('.pdf', '-completo.pdf')), await pagina.pdf(opcoes));
    }
  }
}
await navegador.close();
await parar();
if (!contato) console.log('cv: sem private/contato.json — PDFs completos (com telefone) não gerados.');
// Page-count problems are warnings only; the build still succeeds.

