// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/wind/windview.js, função modoCinza; commit 6efe428).
// Troca os materiais por cinza (o que o editor muda aparece em cor). Respeita userData.semCinza.
// Diferente do GMT, o material original fica num WeakMap (e não em userData), para o clone() das malhas
// não copiar um material dentro do userData.
import * as THREE from 'three';

const originais = new WeakMap();
const cinzaPeca = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.75, metalness: 0.05 });
const cinzaCenario = new THREE.MeshStandardMaterial({ color: 0x59606f, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false });
const cinzaTerreno = new THREE.MeshStandardMaterial({ color: 0x3a4152, roughness: 1, metalness: 0 });

/** Material original de uma malha (mesmo com o modo cinza ligado). */
export const materialOriginal = (m) => originais.get(m) ?? m.material;

export function modoCinza(raiz, ligar) {
  raiz.traverse((o) => {
    if (!o.isMesh || o.userData.semCinza) return;
    if (ligar) {
      if (!originais.has(o)) originais.set(o, o.material);
      o.material = o.userData.terreno ? cinzaTerreno : o.userData.cenario ? cinzaCenario : cinzaPeca;
    } else if (originais.has(o)) {
      o.material = originais.get(o);
      originais.delete(o);
    }
  });
}

/** Clona um nó (com filhos) usando os materiais originais; malhas e geometria compartilhadas. */
export function clonarOriginal(src) {
  const c = src.clone(false);
  if (src.isMesh) { c.material = materialOriginal(src); c.userData.compartilhada = true; }
  for (const f of src.children) c.add(clonarOriginal(f));
  return c;
}
