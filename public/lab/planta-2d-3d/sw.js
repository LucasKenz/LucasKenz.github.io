// Service worker do app (Fase 7: PWA offline). Modelo: o build troca a versão e a lista de arquivos
// (vite.config.ts, plugin "planta-offline"). Não envia nada para fora: só guarda os arquivos do próprio app.
const VERSAO = "0.11.0 · 25/11/2026, 14:40";
const CACHE = `planta2d3d-${VERSAO}`;
const ARQUIVOS = [
 "./",
 "./assets/index-BtvgdrP_.js",
 "./assets/6-bocas-TrLxSFji.js",
 "./assets/DraftCraft-DEV_DraftCraft__apartment-BuIUjTFw.js",
 "./assets/GLTFExporter-CgtxNb5n.js",
 "./assets/GLTFLoader-C7NHae71.js",
 "./assets/OBJExporter-D-TPt8M2.js",
 "./assets/OBJLoader-BhhO-uvV.js",
 "./assets/PaginaRender-CetemVMh.js",
 "./assets/STLExporter-CuQBlkzM.js",
 "./assets/STLLoader-BIDIqVY_.js",
 "./assets/casa-complexa-BLkDTWYx.js",
 "./assets/casa-dois-andares-C0LCDjgD.js",
 "./assets/getcadcraft_cadcraft__sample-house-imRZM-1g.js",
 "./assets/react-Bcvv3v6j.js",
 "./assets/red1oon_BIMCompiler__DX_FLOOR_GF-DyFQJORS.js",
 "./assets/red1oon_BIMCompiler__DX_PLUMBING-BVUmx4LR.js",
 "./assets/rolldown-runtime-XKyaHtl9.js",
 "./assets/sgttomas_SWBPIPE__model-DTkdseO9.js",
 "./assets/src-Cds30RAx.js",
 "./assets/three-DPeXgOaA.js",
 "./assets/ibm-plex-mono-latin-400-normal-CvHOgSBP.woff",
 "./assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2",
 "./assets/ibm-plex-mono-latin-700-normal-7sUh57Bg.woff2",
 "./assets/ibm-plex-mono-latin-700-normal-CNHXzs6v.woff",
 "./assets/ibm-plex-sans-latin-400-normal-CDDApCn2.woff2",
 "./assets/ibm-plex-sans-latin-400-normal-CYLoc0-x.woff",
 "./assets/ibm-plex-sans-latin-500-normal-6ng42L7E.woff2",
 "./assets/ibm-plex-sans-latin-500-normal-BgVn5rGT.woff",
 "./assets/ibm-plex-sans-latin-700-normal-Bth3BMcD.woff",
 "./assets/ibm-plex-sans-latin-700-normal-Bxkt5Cjx.woff2",
 "./assets/index-DOx_741k.css",
 "./icones/icone-192.png",
 "./icones/icone-512-maskable.png",
 "./icones/icone-512.png",
 "./icones/icone.svg",
 "./manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('planta2d3d-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    // Página: tenta a rede (versão nova); sem internet, a guardada.
    e.respondWith(fetch(r).catch(() => caches.match('./', { ignoreSearch: true, ignoreVary: true }).then((x) => x || caches.match(r))));
    return;
  }
  // Arquivos: o guardado primeiro; o que não estava (luz HDRI) entra no cache quando chega.
  e.respondWith(
    // ignoreVary: o servidor manda "Vary: Origin" e o script de módulo pede com Origin; a cópia guardada não tem.
    caches.match(r, { ignoreSearch: true, ignoreVary: true }).then((x) => x || fetch(r).then((resp) => {
      if (resp.ok && resp.type === 'basic') { const c = resp.clone(); caches.open(CACHE).then((k) => k.put(r, c)); }
      return resp;
    })),
  );
});
