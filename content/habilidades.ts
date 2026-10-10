import type { Curso, GrupoHabilidade } from './types';

// nivel: avancado (all, confirmed 2026-10-10) · estudando
export const habilidades: GrupoHabilidade[] = [
  {
    grupo: { pt: 'Linguagens', en: 'Languages' },
    itens: [
      { nome: 'Python', nivel: 'avancado' },
      { nome: 'TypeScript', nivel: 'avancado' },
      { nome: 'JavaScript', nivel: 'avancado' },
      { nome: 'Java', nivel: 'avancado' },
      { nome: 'SQL', nivel: 'avancado' },
    ],
  },
  {
    grupo: { pt: 'Front-end e mobile', en: 'Front end and mobile' },
    itens: [
      { nome: 'React', nivel: 'avancado' },
      { nome: 'Next.js', nivel: 'avancado' },
      { nome: 'React Native', nivel: 'avancado' },
      { nome: 'Tailwind CSS', nivel: 'avancado' },
      { nome: 'Three.js / React Three Fiber', nivel: 'avancado' },
      { nome: 'Figma', nivel: 'avancado' },
    ],
  },
  {
    grupo: { pt: 'Back-end e dados', en: 'Back end and data' },
    itens: [
      { nome: 'FastAPI', nivel: 'avancado' },
      { nome: 'Node.js', nivel: 'avancado' },
      { nome: 'PostgreSQL', nivel: 'avancado' },
      { nome: 'SQLite', nivel: 'avancado' },
      { nome: 'Firebase', nivel: 'avancado' },
      { nome: 'pandas', nivel: 'avancado' },
    ],
  },
  {
    grupo: { pt: 'IA', en: 'AI' },
    itens: [
      { nome: 'OpenAI / Anthropic APIs', nivel: 'avancado' },
      { nome: 'Agentes de IA', en: 'AI agents', nivel: 'avancado' },
      { nome: 'YOLO', nivel: 'avancado' },
      { nome: 'Filtro de Kalman', en: 'Kalman filter', nivel: 'avancado' },
    ],
  },
  {
    grupo: { pt: 'Cloud e DevOps', en: 'Cloud and DevOps' },
    itens: [
      { nome: 'AWS (Lambda, SQS, API Gateway, CDK)', nivel: 'avancado' },
      { nome: 'GitHub Actions', nivel: 'avancado' },
      { nome: 'Git', nivel: 'avancado' },
      { nome: 'Azure DevOps', nivel: 'avancado' },
    ],
  },
  {
    grupo: { pt: 'Métodos e ferramentas', en: 'Methods and tools' },
    itens: [
      { nome: 'Scrum', nivel: 'avancado' },
      { nome: 'Gestão de projetos', en: 'Project management', nivel: 'avancado' },
      { nome: 'Excel', nivel: 'avancado' },
      { nome: 'AutoCAD', nivel: 'avancado' },
      { nome: 'Revit', nivel: 'avancado' },
    ],
  },
];

const seisMeses = { pt: '6 meses', en: '6 months' };

// areas decides which CV version lists the course; 'reserva' = only on request.
export const cursos: Curso[] = [
  { nome: 'Oracle Java Foundations', instituicao: 'Oracle Academy', duracao: seisMeses, areas: ['fullstack'] },
  { nome: 'Oracle Java Certified Professional', instituicao: 'Oracle Academy', duracao: seisMeses, areas: ['fullstack'] },
  {
    nome: 'AWS Academy Cloud Foundations, Developing, Operations e Architecting',
    en: 'AWS Academy Cloud Foundations, Developing, Operations and Architecting',
    instituicao: 'AWS Academy',
    duracao: { pt: '3 meses cada', en: '3 months each' },
    areas: ['fullstack', 'ia'],
  },
  { nome: 'Fundamentos de Computação em Nuvem', en: 'Cloud Computing Fundamentals', instituicao: 'AWS Academy / CEUN-IMT', duracao: seisMeses, areas: ['fullstack', 'ia'] },
  { nome: 'Introdução à Ciência de Dados', en: 'Introduction to Data Science', instituicao: 'CEUN-IMT', duracao: seisMeses, areas: ['ia'] },
  { nome: 'Data Preparation and Visualization for Business Analytics', instituicao: 'CEUN-IMT', duracao: seisMeses, areas: ['ia'] },
  { nome: 'IA Aplicada na Área da Saúde Pública', en: 'Applied AI in Public Health', instituicao: 'CEUN-IMT', duracao: seisMeses, areas: ['ia'] },
  { nome: 'Preparatório para Desafios de Segurança Cibernética', en: 'Cybersecurity Challenges Preparation', instituicao: 'CEUN-IMT', duracao: seisMeses, areas: 'reserva' },
  { nome: 'Modu Finance Program', instituicao: 'CEUN-IMT', duracao: { pt: '3 meses', en: '3 months' }, areas: 'reserva' },
];
