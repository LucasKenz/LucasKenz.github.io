// Leitor próprio de .csv (catálogo): separador ";" ou ",", UTF-8 com ou sem BOM, campos entre aspas.
// Colunas: id;nome;sistema;material;qtd;massa_t;preco_un;taxa (só "id" é obrigatória; ordem livre).
import { slugId } from '../util.js';

export const COLUNAS = ['id', 'nome', 'sistema', 'material', 'qtd', 'massa_t', 'preco_un', 'taxa'];
export const MODELO_CSV = '﻿id;nome;sistema;material;qtd;massa_t;preco_un;taxa\n'
  + 'pilar;Pilar 40×40;Estrutura;concreto;;;;120\n'
  + 'viga;Viga W310;Estrutura;aco_estrutural;;0,85;;\n'
  + 'quadro;Quadro elétrico;Instalações;;;;12000;\n';

function separar(linha, sep) {
  const r = [];
  let cur = '', aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') aspas = false; else cur += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { r.push(cur); cur = ''; } else cur += c;
  }
  r.push(cur);
  return r.map((s) => s.trim());
}
const numero = (s, sep) => {
  if (s == null || s === '') return null;
  let t = String(s).replace(/\s/g, '');
  if (sep === ';' || /^\d{1,3}(\.\d{3})*,\d+$/.test(t)) t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
};

/** Lê o texto do catálogo. Devolve { pecas: [...], avisos }. Lança erro se não houver coluna "id". */
export function lerCatalogo(texto) {
  if (typeof texto !== 'string') throw new Error('Catálogo vazio.');
  if (texto.length > 5e6) throw new Error('Catálogo grande demais (máx. 5 MB).');
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) throw new Error('O .csv está vazio.');
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const cab = separar(linhas[0], sep).map((c) => slugId(c).replace(/-/g, '_'));
  const iId = cab.indexOf('id');
  if (iId < 0) throw new Error('O .csv precisa de uma coluna "id" (cabeçalho: id;nome;sistema;material;qtd;massa_t;preco_un;taxa).');
  const avisos = [];
  const pecas = [];
  const vistos = new Set();
  if (linhas.length > 301) avisos.push('Só as primeiras 300 linhas do .csv foram lidas.');
  for (const [k, l] of linhas.slice(1, 301).entries()) {
    const v = separar(l, sep);
    const campo = (nome) => { const i = cab.indexOf(nome); return i >= 0 ? v[i] ?? '' : ''; };
    const id = slugId(campo('id'));
    if (!id) { avisos.push(`Linha ${k + 2}: sem id, ignorada.`); continue; }
    if (vistos.has(id)) { avisos.push(`Linha ${k + 2}: id "${id}" repetido, ignorada.`); continue; }
    vistos.add(id);
    const p = { id };
    const nome = campo('nome').slice(0, 80); if (nome) p.nome = nome;
    const sis = campo('sistema').slice(0, 40); if (sis) p.sistema = sis;
    const mat = campo('material').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40); if (mat) p.material = mat;
    for (const [c, min, max] of [['qtd', 0, 1e7], ['massa_t', 0, 1e6], ['preco_un', 0, 1e10], ['taxa', 0, 1000]]) {
      const x = numero(campo(c), sep);
      if (x === null) continue;
      if (Number.isNaN(x) || x < min || x > max) { avisos.push(`Linha ${k + 2}: ${c} fora da faixa ou inválido ("${campo(c).slice(0, 20)}"), ignorado.`); continue; }
      p[c] = c === 'qtd' ? Math.round(x) : x;
    }
    pecas.push(p);
  }
  if (!pecas.length) throw new Error('O .csv não tem nenhuma peça com id.');
  return { pecas, avisos };
}
