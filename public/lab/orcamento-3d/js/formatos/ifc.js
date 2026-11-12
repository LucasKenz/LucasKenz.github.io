// Leitor .ifc (IFC2x3 e IFC4) com web-ifc (WASM).
// Cada IfcProduct com geometria vira um nó: id da peça = Name do elemento (ou ObjectType, ou a classe).
// Material de IfcRelAssociatesMaterial; quantidades oficiais de IfcElementQuantity (guardadas no nó e,
// no pacote, por peça). O web-ifc entrega a geometria em metros e com Y para cima.
import * as THREE from 'three';
import { CDN } from './cdn.js';

let apiP = null;
async function ifcApi() {
  apiP ??= (async () => {
    const W = await import(/* @vite-ignore */ `${CDN.webIfc}web-ifc-api.js`);
    const api = new W.IfcAPI();
    api.SetWasmPath(CDN.webIfc, true);
    await api.Init();
    return { W, api };
  })().catch((e) => { apiP = null; throw new Error(`Não foi possível carregar o leitor de IFC: ${e?.message ?? e}`); });
  return apiP;
}

const v = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x);
const ids = (vec) => { const r = []; if (!vec) return r; const n = typeof vec.size === 'function' ? vec.size() : vec.length; for (let i = 0; i < n; i++) r.push(typeof vec.get === 'function' ? vec.get(i) : vec[i]); return r; };

/** true se o arquivo STEP físico termina com END-ISO-10303-21 (não foi cortado). */
export const completo = (buf) => /END-ISO-10303-21\s*;?\s*$/.test(new TextDecoder().decode(buf.subarray(Math.max(0, buf.length - 200))));

export async function ler(arquivo) {
  const buf = new Uint8Array(await arquivo.arrayBuffer());
  const cab = new TextDecoder().decode(buf.subarray(0, Math.min(400, buf.length)));
  if (!cab.startsWith('ISO-10303-21') || !/FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(new TextDecoder().decode(buf.subarray(0, Math.min(4000, buf.length))))) {
    throw new Error('O arquivo .ifc não é um IFC em texto (STEP físico com FILE_SCHEMA IFC).');
  }
  const { W, api } = await ifcApi();
  let modelo;
  try { modelo = api.OpenModel(buf, { COORDINATE_TO_ORIGIN: false }); } catch (e) { throw new Error(`Não foi possível abrir o .ifc: ${e?.message ?? e}.`); }
  if (modelo < 0) throw new Error('Não foi possível abrir o .ifc.');
  try {
    const linha = (id) => { try { return api.GetLine(modelo, id); } catch { return null; } };
    const classe = (id) => { try { return api.GetNameFromTypeCode(api.GetLineType(modelo, id)); } catch { return ''; } };
    // materiais por elemento
    const materialDe = new Map();
    for (const rid of ids(api.GetLineIDsWithType(modelo, W.IFCRELASSOCIATESMATERIAL))) {
      const r = linha(rid);
      let m = r && linha(v(r.RelatingMaterial));
      let nome = m && v(m.Name);
      if (!nome && m) {
        // conjunto de camadas / uso de camadas: a primeira camada com material
        const ls = m.ForLayerSet ? linha(v(m.ForLayerSet)) : m;
        const camada = ls?.MaterialLayers?.[0] && linha(v(ls.MaterialLayers[0]));
        const mm = camada?.Material && linha(v(camada.Material));
        nome = mm && v(mm.Name);
      }
      if (!nome) continue;
      for (const o of r.RelatedObjects ?? []) materialDe.set(v(o), String(nome).slice(0, 60));
    }
    // quantidades oficiais por elemento
    const qtdDe = new Map();
    for (const rid of ids(api.GetLineIDsWithType(modelo, W.IFCRELDEFINESBYPROPERTIES))) {
      const r = linha(rid);
      const def = r && linha(v(r.RelatingPropertyDefinition));
      if (!def || !Array.isArray(def.Quantities)) continue;
      const q = {};
      for (const qref of def.Quantities) {
        const x = linha(v(qref));
        const nome = String(v(x?.Name) ?? '');
        const num = (k) => { const n = Number(v(x?.[k])); return Number.isFinite(n) && n >= 0 ? n : null; };
        if (/^(NetVolume|GrossVolume)$/.test(nome) && num('VolumeValue') != null) { if (nome === 'NetVolume' || q.volume_m3 == null) q.volume_m3 = num('VolumeValue'); }
        else if (/^(NetArea|GrossArea|NetSideArea|GrossSideArea)$/.test(nome) && num('AreaValue') != null) { if (q.area_m2 == null || nome === 'NetArea') q.area_m2 = num('AreaValue'); }
        else if (/^Length$/.test(nome) && num('LengthValue') != null) q.comprimento_m = num('LengthValue');
        else if (/^(NetWeight|GrossWeight)$/.test(nome) && num('WeightValue') != null) { if (q.massa_t == null || nome === 'NetWeight') q.massa_t = num('WeightValue') / 1000; }
      }
      if (!Object.keys(q).length) continue;
      for (const o of r.RelatedObjects ?? []) qtdDe.set(v(o), { ...qtdDe.get(v(o)), ...q });
    }
    // geometria
    const raiz = new THREE.Group();
    const grupos = new Map();
    const mats = new Map();
    const matDe = (nome, c) => {
      const k = `${nome}|${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)},${c.w.toFixed(2)}`;
      if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ name: nome, color: new THREE.Color(c.x, c.y, c.z), transparent: c.w < 1, opacity: c.w, roughness: 0.75 }));
      return mats.get(k);
    };
    const _m = new THREE.Matrix4();
    api.StreamAllMeshes(modelo, (fm) => {
      const eid = fm.expressID;
      let g = grupos.get(eid);
      if (!g) {
        const l = linha(eid);
        const cls = classe(eid);
        const nome = String(v(l?.Name) || v(l?.ObjectType) || cls.replace(/^Ifc/i, '') || `elemento-${eid}`).slice(0, 120);
        g = new THREE.Group();
        g.name = nome;
        g.userData = { nome0: nome, ifc: cls };
        if (qtdDe.has(eid)) g.userData.quantidades = qtdDe.get(eid);
        grupos.set(eid, g);
        raiz.add(g);
      }
      const nomeMat = materialDe.get(eid) ?? '';
      for (let i = 0; i < fm.geometries.size(); i++) {
        const pg = fm.geometries.get(i);
        const geo = api.GetGeometry(modelo, pg.geometryExpressID);
        const vs = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
        const ix = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
        geo.delete?.();
        const n = vs.length / 6;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) { pos.set(vs.subarray(k * 6, k * 6 + 3), k * 3); nor.set(vs.subarray(k * 6 + 3, k * 6 + 6), k * 3); }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        bg.setIndex(new THREE.BufferAttribute(new Uint32Array(ix), 1));
        const me = new THREE.Mesh(bg, matDe(nomeMat, pg.color));
        _m.fromArray(pg.flatTransformation);
        me.applyMatrix4(_m);
        g.add(me);
      }
    });
    if (!grupos.size) throw new Error('O .ifc não tem elementos com geometria.');
    const avisos = [];
    if (!completo(buf)) avisos.push('O .ifc parece incompleto (sem END-ISO-10303-21 no fim): só o que foi lido aparece. Exporte de novo se faltar algo.');
    if (qtdDe.size) avisos.push(`${qtdDe.size} elemento(s) com quantidades oficiais (IfcElementQuantity): elas valem no lugar da medição na malha (dá para desligar no passo 3).`);
    return { cena: raiz, fator: 1, unidadeDoArquivo: true, eixoDoArquivo: true, avisos };
  } finally {
    try { api.CloseModel(modelo); } catch { /* */ }
  }
}
