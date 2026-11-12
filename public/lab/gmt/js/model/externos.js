// Registro dos modelos 3D externos (.glb) importados no Sandbox. Só dados: o carregamento fica em sandbox/modelos.js.
// A peça "modelo-externo" (parts.js) lê daqui a malha para montar e medir, como qualquer outra peça.
const registro = new Map(); // hash -> { nome, cena: THREE.Object3D, tris, dados }

export const obterExterno = (hash) => registro.get(hash) ?? null;
export const registrarExterno = (hash, info) => { registro.set(hash, info); };
export const externos = () => registro;
