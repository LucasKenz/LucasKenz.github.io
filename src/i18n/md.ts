// Tiny inline markdown for content strings: **bold** and `code`. Input is escaped first.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-line/60 px-1 py-0.5 font-mono text-[0.9em]">$1</code>');
}

/** Groups consecutive "- " strings into a list; others are paragraphs. */
export function blocos(textos: string[]) {
  const out: { tipo: 'p' | 'ul'; itens: string[] }[] = [];
  for (const t of textos) {
    if (t.startsWith('- ')) {
      const ultimo = out.at(-1);
      if (ultimo?.tipo === 'ul') ultimo.itens.push(inline(t.slice(2)));
      else out.push({ tipo: 'ul', itens: [inline(t.slice(2))] });
    } else out.push({ tipo: 'p', itens: [inline(t)] });
  }
  return out;
}
