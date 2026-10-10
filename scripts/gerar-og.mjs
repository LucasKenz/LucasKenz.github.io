// Social cards (Open Graph / Twitter, 1200×630) for every built page, made from the page's own
// <title>, description and optional data-og-imagem. Runs after `astro build`; writes dist/og/<route>.png,
// the same name src/layouts/Base.astro puts in og:image.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';

const DIST = 'dist';

async function* paginas(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* paginas(p);
    else if (e.name === 'index.html' || (dir === DIST && e.name === '404.html')) yield p;
  }
}

const dataUri = async (arquivo, tipo) => `data:${tipo};base64,${(await readFile(arquivo)).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const desc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const fonte = await dataUri('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'font/woff2');
const fonteMono = await dataUri('node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', 'font/woff2');
const foto = await dataUri('public/media/perfil.webp', 'image/webp');

function cartao({ rota, kicker, titulo, descricao, imagem, escuro, lang }) {
  const c = escuro
    ? { papel: '#0a0f1e', grade: '#141d33', tinta: '#e8ecf6', fraco: '#a1abc6', linha: '#24304f', acento: '#7a9bff' }
    : { papel: '#f4f3ef', grade: '#e4e1d8', tinta: '#14161b', fraco: '#565c68', linha: '#d9d6cc', acento: '#2f5bea' };
  const tam = titulo.length > 28 ? 64 : titulo.length > 16 ? 80 : 96;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  @font-face { font-family: G; src: url(${fonte}) format('woff2'); font-weight: 100 900; }
  @font-face { font-family: M; src: url(${fonteMono}) format('woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: G; color: ${c.tinta}; background: ${c.papel};
    background-image: linear-gradient(${c.grade} 1px, transparent 1px), linear-gradient(90deg, ${c.grade} 1px, transparent 1px);
    background-size: 32px 32px; display: flex; flex-direction: column; }
  main { flex: 1; display: flex; gap: 48px; padding: 64px 72px 40px; min-height: 0; }
  .txt { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .rota { font-family: M; font-size: 22px; letter-spacing: .06em; text-transform: uppercase; color: ${c.fraco}; }
  .rota b { color: ${c.acento}; font-weight: 600; }
  h1 { margin-top: 28px; font-size: ${tam}px; line-height: 1.02; letter-spacing: -.03em; font-weight: 650; }
  .kicker { margin-top: 14px; font-size: 32px; font-weight: 550; color: ${c.acento}; }
  p { margin-top: 22px; font-size: 27px; line-height: 1.35; color: ${c.fraco}; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .assin { margin-top: auto; display: flex; align-items: center; gap: 18px; font-size: 24px; font-weight: 600; }
  .assin img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid ${c.linha}; }
  .assin small { display: block; font-family: M; font-size: 17px; font-weight: 400; color: ${c.fraco}; letter-spacing: .04em; }
  figure { width: 420px; flex: none; align-self: center; border: 2px solid ${c.linha}; border-radius: 14px; overflow: hidden; background: ${c.linha};
    box-shadow: 14px 14px 0 ${c.acento}; }
  figure img { display: block; width: 100%; height: 420px; object-fit: cover; }
  .lombada { height: 18px; flex: none; background: repeating-linear-gradient(-45deg, #ffc21a 0 14px, #14161b 14px 28px); }
  </style></head><body><main><div class="txt">
  <div class="rota"><b>lucaskenz.github.io</b>${esc(rota)}</div>
  <h1>${esc(titulo)}</h1>${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
  <p>${esc(descricao)}</p>
  <div class="assin"><img src="${foto}" alt=""><span>Lucas Kenzo Murakami Tada<small>${lang === 'en' ? 'COMPUTER SCIENCE · MAUÁ' : 'CIÊNCIA DA COMPUTAÇÃO · MAUÁ'}</small></span></div>
  </div>${imagem ? `<figure><img src="${imagem}" alt=""></figure>` : ''}</main><div class="lombada"></div></body></html>`;
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await mkdir(join(DIST, 'og'), { recursive: true });
let n = 0;

for await (const arquivo of paginas(DIST)) {
  const nome = relative(DIST, arquivo);
  const rel = nome === '404.html' ? ['404'] : nome.split(sep).slice(0, -1);
  if (rel.includes('print')) continue; // résumé print pages are not public pages
  const html = await readFile(arquivo, 'utf8');
  const pegar = (re) => desc(html.match(re)?.[1] ?? '');
  const tituloPagina = pegar(/<title>([^<]*)<\/title>/);
  const [cabeca, ...resto] = tituloPagina.replace(/ · Lucas Kenzo$/, '').split(' — ');
  const lang = pegar(/<html lang="([^"]+)"/).startsWith('en') ? 'en' : 'pt';
  const caminhoImagem = pegar(/data-og-imagem="([^"]+)"/);
  const chave = rel.join('-') || 'inicio';
  await pagina.setContent(
    cartao({
      rota: `/${rel.join('/')}`.replace(/^\/$/, ''),
      titulo: cabeca,
      kicker: resto.join(' — '),
      descricao: pegar(/<meta name="description" content="([^"]*)"/),
      imagem: caminhoImagem ? await dataUri(join('public', caminhoImagem), 'image/webp') : null,
      escuro: rel.includes('lab'),
      lang,
    }),
    { waitUntil: 'load' },
  );
  await pagina.evaluate(() => document.fonts.ready);
  await writeFile(join(DIST, 'og', `${chave}.png`), await pagina.screenshot({ type: 'png' }));
  n++;
}
await navegador.close();
console.log(`og: ${n} cartões em dist/og/`);
