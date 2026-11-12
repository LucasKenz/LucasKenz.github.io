// Bibliotecas externas da fase 2 (WASM), sempre com versão fixa e carregadas só quando chega um arquivo daquele tipo.
// Versões conferidas em 12/11/2026 (ver docs/DECISOES.md).
export const CDN = {
  occt: 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/',
  rhino3dm: 'https://cdn.jsdelivr.net/npm/rhino3dm@8.35.0/',
  webIfc: 'https://cdn.jsdelivr.net/npm/web-ifc@0.0.78/',
};

const scripts = new Map();
/** Carrega um script clássico (UMD) uma vez só. */
export function carregarScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = () => ok();
      s.onerror = () => { scripts.delete(src); erro(new Error(`Não foi possível baixar a biblioteca (${src.split('/npm/')[1] ?? src}). Confira a conexão.`)); };
      document.head.appendChild(s);
    }));
  }
  return scripts.get(src);
}
