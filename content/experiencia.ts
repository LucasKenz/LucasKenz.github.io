import type { Experiencia } from './types';

export const experiencias: Experiencia[] = [
  {
    slug: 'sbn',
    cargo: { pt: 'Estagiário de Engenharia', en: 'Engineering Intern' },
    org: 'SBN Engenharia',
    inicio: '2026-01',
    fim: null,
    bullets: [
      {
        text: {
          pt: 'Automatizei em Python o envio de e-mails e a atualização de planilhas de controle, economizando cerca de 1 hora de trabalho por dia.',
          en: 'Automated e-mail dispatch and control spreadsheets in Python, saving about one hour of work per day.',
        },
      },
      {
        text: {
          pt: 'Produzi desenhos de arquitetura, plantas e modelos 3D em AutoCAD, Revit e Tripo 3D (IA) para 5 projetos e obras em andamento.',
          en: 'Produced architectural drawings, floor plans and 3D models in AutoCAD, Revit and Tripo 3D (AI) for 5 projects and active construction sites.',
        },
      },
    ],
  },
  {
    slug: 'monitoria',
    cargo: { pt: 'Monitor dos Cursos de TI', en: 'IT Teaching Assistant' },
    org: 'Instituto Mauá de Tecnologia',
    inicio: '2024-02',
    fim: null,
    bullets: [
      {
        text: {
          pt: 'Atendo uma base de mais de 500 alunos dos cursos de TI em todas as disciplinas de computação: Lógica de Programação, POO e Modelagem OO, Banco de Dados Relacionais e Não Relacionais, Front End, UX, Algoritmos e Estruturas de Dados, Paradigmas de Programação, Desenvolvimento Multiplataforma, Engenharia de Software, Desenvolvimento Ágil, Estatística e Matemática Discreta.',
          en: 'Support a base of 500+ IT students across every computing course: programming logic, OOP, relational and NoSQL databases, front end, UX, algorithms and data structures, programming paradigms, cross-platform development, software engineering, agile, statistics and discrete math.',
        },
      },
      {
        text: {
          pt: 'Conduzo reforços com cerca de 10 alunos e aulões com cerca de 50, com material didático próprio e apoio aos professores no planejamento das aulas.',
          en: 'Run review sessions for about 10 students and exam-prep lectures for about 50, with my own study material, and help professors plan classes.',
        },
      },
    ],
  },
];

export const formacao = {
  curso: { pt: 'Bacharelado em Ciência da Computação', en: 'B.Sc. in Computer Science' },
  instituicao: 'Instituto Mauá de Tecnologia',
  inicio: '2023-01',
  fim: '2026-12',
  media: {
    pt: 'Média 9,3 nas 23 disciplinas avaliadas dos dois primeiros anos.',
    en: 'GPA 9.3/10 across the 23 graded courses of the first two years.',
  },
};

export const idiomas = {
  pt: 'Português nativo · Inglês: leitura, escrita e compreensão fluentes; conversação avançada.',
  en: 'Portuguese: native · English: fluent reading, writing and listening; advanced speaking.',
};

export const extracurriculares = [
  {
    nome: { pt: 'Mentoria para alunos de colégio: experimentos práticos', en: 'High school mentoring: hands-on experiments' },
    periodo: '2024',
    texto: {
      pt: 'Aulas e experimentos práticos de engenharia elétrica e relatórios de progresso.',
      en: 'Hands-on electrical engineering lessons and experiments, with progress reports.',
    },
  },
  {
    nome: { pt: 'Organizador de eventos comunitários', en: 'Community event organizer' },
    periodo: '2023 –',
    texto: {
      pt: 'Organizo sozinho encontros colaborativos todo fim de semana, com 5 a 10 participantes.',
      en: 'I run collaborative meetups every weekend on my own, with 5 to 10 participants.',
    },
  },
];
