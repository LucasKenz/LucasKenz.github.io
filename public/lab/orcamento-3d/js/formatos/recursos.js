// Arquivos soltos que acompanham um modelo (.bin, .mtl, texturas) arrastados juntos ou numa seleção múltipla.
// O LoadingManager troca cada URL pedida pelo arquivo local correspondente. Nada é buscado fora:
// endereço externo ou arquivo que falta vira um recurso vazio (textura transparente), e o modelo segue
// com a cor do material.
import * as THREE from 'three';

const PNG_VAZIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const IMG = /\.(png|jpe?g|webp|gif|bmp|tga|tiff?|dds|ktx2?)$/i;

const base = (u) => decodeURIComponent(String(u).split(/[?#]/)[0]).replace(/\\/g, '/').split('/').pop().toLowerCase();

/** Manager com os arquivos de apoio. Devolve { manager, faltas, liberar }. */
export function criarManager(apoio) {
  const urls = new Map();
  for (const [nome, f] of apoio) urls.set(nome, URL.createObjectURL(f));
  const faltas = new Set();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (/^data:/i.test(url) || /^blob:/i.test(url)) return url;
    const u = urls.get(base(url));
    if (u) return u;
    faltas.add(base(url));
    // arquivo ausente ou externo: textura vazia (o modelo segue com a cor do material); buffer ausente falha com mensagem
    return IMG.test(url) ? PNG_VAZIO : 'data:application/octet-stream;base64,';
  });
  return { manager, faltas, liberar: () => { for (const u of urls.values()) URL.revokeObjectURL(u); } };
}
export const ehImagem = (nome) => IMG.test(nome);
