// Minimal static server for dist/, shared by the post-build scripts (CV, social cards, audits).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.hdr': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary',
};

/** Serves `raiz` on `porta`. Returns a function that stops the server. */
export async function servir(porta, raiz = 'dist') {
  const servidor = createServer(async (req, res) => {
    try {
      let caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
      if (!extname(caminho)) caminho = join(caminho, 'index.html');
      const corpo = await readFile(join(raiz, caminho));
      res.writeHead(200, { 'content-type': tipos[extname(caminho)] ?? 'application/octet-stream' });
      res.end(corpo);
    } catch {
      // Same as GitHub Pages: unknown paths get the 404 page if there is one.
      try {
        res.writeHead(404, { 'content-type': tipos['.html'] }).end(await readFile(join(raiz, '404.html')));
      } catch {
        res.writeHead(404).end();
      }
    }
  });
  await new Promise((ok) => servidor.listen(porta, ok));
  return () => new Promise((ok) => servidor.close(ok));
}
