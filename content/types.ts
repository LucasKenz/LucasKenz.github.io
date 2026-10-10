// Shared types for every content file. Text fields are bilingual: { pt, en }.
export type Lang = 'pt' | 'en';
export type T = { pt: string; en: string };
/** Target area of a CV version. `ambas` goes into both. */
export type Area = 'fullstack' | 'ia';

export interface Perfil {
  nome: string;
  nomeCurto: string;
  titulo: T;
  frase: T;
  resumo: T;
  busca: T;
  cidade: T;
  disponibilidade: T;
  email: string;
  /** Only in the local, gitignored CV. Never rendered on the public site. */
  telefoneLocal?: string;
  linkedin: string;
  github: string;
  site: string;
  foto: { src: string; alt: T };
  agora: T;
  /** Résumé headline per target area. */
  tituloCv: Record<Area, T>;
}

export interface Experiencia {
  slug: string;
  cargo: T;
  org: string;
  inicio: string; // YYYY-MM
  fim: string | null; // null = current
  bullets: { text: T; areas?: Area[] }[];
}

export interface Midia {
  /** Poster or still image (webp/avif) in /public. */
  poster?: string;
  video?: { mp4: string; webm?: string };
  width: number;
  height: number;
  alt: T;
  legenda?: T;
}

export interface Numero {
  valor: string;
  rotulo: T;
}

export interface SecaoEstudo {
  id: string;
  titulo: T;
  /** Paragraphs; a string starting with "- " is rendered as a bullet. */
  texto: T[];
}

export interface Estudo {
  secoes: SecaoEstudo[];
  galeria?: Midia[];
  /** Short real code excerpt shown in the case study. */
  trecho?: { legenda: T; linguagem: string; codigo: string };
}

export interface Projeto {
  slug: string;
  nome: string;
  /** Partner shown as "affiliation" in the project select. */
  parceiro: T;
  ano: string;
  papel: T;
  frase: T;
  resumo: T;
  numeros: Numero[];
  stack: string[];
  areas: Area[];
  midia?: Midia;
  /** Empty or missing = the button disappears (plan B for MOVER). */
  demoUrl?: string;
  apresentacaoUrl?: string;
  /** Only for public repositories. */
  codigoUrl?: string;
  estudoDeCaso?: boolean;
  estudo?: Estudo;
  /** Résumé entry: heading and bullets (only projects with this field go into the CV). */
  cv?: { titulo: T; periodo: T; bullets: T[] };
  destaque?: boolean;
  /** Example content that must be replaced before publishing. */
  exemplo?: boolean;
}

export interface LabItem {
  slug: string;
  /** "How it works": short sections, formulas in plain text. */
  explicacao?: { titulo: T; texto: T; formula?: string }[];
  nome: T;
  frase: T;
  tecnica: T;
  status: 'pronto' | 'em-construcao';
}

export interface Curso {
  nome: string;
  en?: string;
  instituicao: string;
  duracao: T;
  areas: Area[] | 'reserva';
}

export interface GrupoHabilidade {
  grupo: T;
  itens: { nome: string; en?: string; nivel: 'avancado' | 'estudando' }[];
}
