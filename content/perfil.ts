import type { Perfil } from './types';

export const perfil: Perfil = {
  nome: 'Lucas Kenzo Murakami Tada',
  nomeCurto: 'Lucas Kenzo',
  titulo: {
    pt: 'Full Stack · IA e Análise de Dados',
    en: 'Full Stack · AI and Data Analysis',
  },
  frase: {
    pt: 'Software que sai da tela: um caminhão autônomo simulado, um app de acesso para a SPTrans e agentes de IA que revisam código.',
    en: 'Software that leaves the screen: a simulated autonomous truck, an access app for SPTrans and AI agents that review code.',
  },
  resumo: {
    pt: 'Estudante de Ciência da Computação no Instituto Mauá de Tecnologia (formatura em dez/2026, média 9,3), com projetos entregues para parceiros reais: SPTrans, Centro Universitário São Camilo e uma multinacional do setor automotivo. No TCC, construí de ponta a ponta o gêmeo digital de um caminhão autônomo em Python (CARLA, YOLO, filtro de Kalman) e a maquete 3D web que mostra o resultado (Next.js, React Three Fiber). Liderei o front-end de um app de reconhecimento facial com 95% de acurácia e escrevi agentes de IA que revisaram mais de 1.000 Pull Requests e Issues.',
    en: 'Computer Science student at Instituto Mauá de Tecnologia (graduating Dec 2026, GPA 9.3/10) who has shipped projects for real partners: SPTrans, Centro Universitário São Camilo and a multinational automotive company. For my capstone I built end to end the digital twin of an autonomous truck in Python (CARLA, YOLO, Kalman filter) and the interactive 3D web model that shows it (Next.js, React Three Fiber). I led the front end of a face recognition app with 95% accuracy and wrote AI agents that reviewed 1,000+ GitHub pull requests and issues.',
  },
  busca: { pt: 'Buscando Trainee 2027 em tecnologia', en: 'Looking for a 2027 technology trainee program' },
  cidade: { pt: 'São Paulo, SP', en: 'São Paulo, Brazil' },
  disponibilidade: {
    pt: 'Disponível a partir de janeiro de 2027, em jornada integral.',
    en: 'Available full time from January 2027.',
  },
  email: 'lkmtada@gmail.com',
  linkedin: 'https://www.linkedin.com/in/lucas-kenzo-murakami-tada-003677282/',
  github: 'https://github.com/LucasKenz',
  site: 'https://lucaskenz.github.io',
  foto: {
    src: '/media/perfil.webp',
    alt: { pt: 'Foto de Lucas Kenzo sorrindo', en: 'Photo of Lucas Kenzo smiling' },
  },
  tituloCv: {
    fullstack: { pt: 'Trainee em Tecnologia · Desenvolvimento Full Stack · IA e Análise de Dados', en: 'Technology Trainee · Full Stack Development · AI and Data Analysis' },
    ia: { pt: 'Trainee em Tecnologia · IA e Análise de Dados · Desenvolvimento Full Stack', en: 'Technology Trainee · AI and Data Analysis · Full Stack Development' },
  },
  agora: {
    pt: 'Fechando o TCC MOVER e estagiando na SBN Engenharia.',
    en: 'Wrapping up the MOVER capstone and interning at SBN Engenharia.',
  },
};
