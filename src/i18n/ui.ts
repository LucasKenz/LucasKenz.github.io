import type { Lang, T } from '@content/types';

export const ui = {
  skip: { pt: 'Pular para o conteúdo', en: 'Skip to content' },
  navProjetos: { pt: 'Projetos', en: 'Projects' },
  navTrajetoria: { pt: 'Trajetória', en: 'Path' },
  navLab: { pt: 'Lab', en: 'Lab' },
  navCurriculo: { pt: 'Currículo', en: 'Résumé' },
  navContato: { pt: 'Contato', en: 'Contact' },
  verProjetos: { pt: 'Ver projetos', en: 'See projects' },
  baixarCv: { pt: 'Baixar CV', en: 'Download CV' },
  destaque: { pt: 'Projeto em destaque', en: 'Featured project' },
  abrirSite: { pt: 'Abrir o site', en: 'Open the site' },
  modoApresentacao: { pt: 'Modo apresentação', en: 'Presentation mode' },
  estudoDeCaso: { pt: 'Estudo de caso', en: 'Case study' },
  meuPapel: { pt: 'Meu papel', en: 'My role' },
  codigo: { pt: 'Código', en: 'Code' },
  codigoPrivado: { pt: 'código privado', en: 'private code' },
  outrosProjetos: { pt: 'Outros projetos', en: 'More projects' },
  experiencia: { pt: 'Experiência', en: 'Experience' },
  formacao: { pt: 'Formação', en: 'Education' },
  agora: { pt: 'Agora', en: 'Now' },
  atual: { pt: 'atual', en: 'now' },
  labIntro: {
    pt: 'Simulações em 3D feitas por gosto: cada uma tem uma interação que dá vontade de mexer.',
    en: 'Hand-made 3D simulations, each built around one interaction you want to play with.',
  },
  emConstrucao: { pt: 'em construção', en: 'in progress' },
  contatoIntro: {
    pt: 'Quer conversar sobre uma vaga ou um projeto? Responder e-mail é rápido por aqui.',
    en: 'Want to talk about a role or a project? E-mail gets a quick reply.',
  },
  tema: { pt: 'Alternar tema claro e escuro', en: 'Toggle light and dark theme' },
  idioma: { pt: 'English', en: 'Português' },
  pausar: { pt: 'Pausar animação', en: 'Pause animation' },
  rodar: { pt: 'Retomar animação', en: 'Resume animation' },
  feitoCom: { pt: 'Feito com Astro, sem cookies e sem rastreadores.', en: 'Built with Astro, no cookies and no trackers.' },
} satisfies Record<string, T>;

export const t = (v: T, lang: Lang) => v[lang];

const meses = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** "2024-02" -> "fev 2024"; null -> "atual". */
export function mes(ym: string | null, lang: Lang) {
  if (!ym) return ui.atual[lang];
  const [y, m] = ym.split('-').map(Number);
  return `${meses[lang][m - 1]} ${y}`;
}

/** Same page in the other language. */
export function outraRota(path: string, lang: Lang) {
  if (lang === 'pt') return '/en' + (path === '/' ? '/' : path);
  return path.replace(/^\/en/, '') || '/';
}
