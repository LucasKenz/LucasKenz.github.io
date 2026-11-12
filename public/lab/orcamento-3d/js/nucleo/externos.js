// Adaptado de gmt-telescopio-3d (public/lab/gmt/js/model/externos.js, commit 6efe428).
// Registro dos modelos 3D extras (.glb) colocados no editor. Só dados: o carregamento fica em nucleo/modelos.js.
// A peça oculta "modelo-externo" lê daqui a malha para montar e medir, como qualquer outra peça.
const registro = new Map(); // hash -> { nome, cena: THREE.Object3D, tris, tam, dados }

export const obterExterno = (hash) => registro.get(hash) ?? null;
export const registrarExterno = (hash, info) => { registro.set(hash, info); };
export const externos = () => registro;
