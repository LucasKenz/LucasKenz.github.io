// Catálogo: uma entrada por TIPO de peça, com miniatura renderizada, busca e filtro por sistema.
import { PECAS_BASE as PECAS, SISTEMAS } from '../model/parts.js';
import { miniatura } from '../ui/miniaturas.js';
import { esc, selo } from '../data.js';
import { fmt } from '../util.js';

const $ = (id) => document.getElementById(id);

export function criarCatalogo({ aoAbrir }) {
  const grade = $('gradeCat'), busca = $('busca'), filtros = $('filtroSistema');
  let sistema = null, miniaturas = false;
  filtros.innerHTML = ['Todos', ...SISTEMAS].map((s) => `<button type="button" aria-pressed="${s === 'Todos'}" data-sis="${s}">${s}</button>`).join('');
  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    sistema = b.dataset.sis === 'Todos' ? null : b.dataset.sis;
    filtros.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    filtrar();
  });
  busca.addEventListener('input', filtrar);

  grade.innerHTML = PECAS.map((p) => `<button type="button" class="item-cat" data-id="${p.id}" data-sis="${esc(p.sistema)}" data-busca="${esc((p.nome + ' ' + p.funcao + ' ' + p.sistema).toLowerCase())}">
      <img alt="" data-mini="${p.id}" hidden><span class="ph" aria-hidden="true"></span>
      <div><strong>${esc(p.nome)}</strong><small>${esc(p.sistema)} · <span class="qtd">× ${fmt(p.qtd[0], 0)}</span></small> ${selo(p.qtd[2], p.qtd[1])}</div>
    </button>`).join('');
  grade.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const b = e.target.closest('.item-cat');
    if (b) aoAbrir(b.dataset.id);
  });

  function filtrar() {
    const q = busca.value.trim().toLowerCase();
    grade.querySelectorAll('.item-cat').forEach((b) => {
      b.hidden = (sistema && b.dataset.sis !== sistema) || (q && !b.dataset.busca.includes(q));
    });
  }

  /** Pede as miniaturas (geradas aos poucos e guardadas em cache, ver ui/miniaturas.js). */
  function gerarMiniaturas() {
    if (miniaturas) return;
    miniaturas = true;
    for (const p of PECAS) {
      miniatura(p.id).then((url) => {
        const img = grade.querySelector(`[data-mini="${p.id}"]`);
        if (!img || !img.hidden) return;
        img.src = url;
        img.hidden = false;
        img.nextElementSibling?.remove();
      }).catch(() => { /* sem WebGL: fica o espaço reservado */ });
    }
  }
  return { gerarMiniaturas, filtrar };
}
