import type { Projeto } from './types';

// Order = order on the site. Private repositories have no codigoUrl.
export const projetos: Projeto[] = [
  {
    slug: 'mover',
    cv: {
      titulo: { pt: 'TCC MOVER: gêmeo digital de caminhão autônomo (multinacional do setor automotivo)', en: 'MOVER capstone: digital twin of an autonomous truck (multinational automotive company)' },
      periodo: { pt: '2025 – 2026', en: '2025 – 2026' },
      bullets: [
        { pt: 'Desenvolvi de ponta a ponta, em Python no simulador CARLA 0.9.16, a navegação de um caminhão autônomo no campus: percepção com YOLO, LiDAR e câmeras; fusão GNSS + IMU com filtro de Kalman; controle Pure Pursuit.', en: 'Built end to end the truck’s navigation in Python on the CARLA 0.9.16 simulator: perception with YOLO, LiDAR and cameras; GNSS + IMU fusion with a Kalman filter; Pure Pursuit control.' },
        { pt: 'Converti o levantamento topográfico real (DXF) em mapa OpenDRIVE com 34 vias, 4 junções e 1,56 km, validado por um pipeline automatizado; telemetria em SQLite, dashboards ao vivo e em replay e 362 testes offline.', en: 'Converted the real topographic survey (DXF) into an OpenDRIVE map with 34 roads, 4 junctions and 1.56 km, checked by an automated pipeline; SQLite telemetry, live and replay dashboards and 362 offline tests.' },
        { pt: 'Publiquei a maquete 3D interativa do campus (Next.js, React Three Fiber, Playwright): site de 2,9 MB, modelo comprimido para 0,4 MB.', en: 'Shipped the interactive 3D campus model (Next.js, React Three Fiber, Playwright): 2.9 MB site, 3D model compressed to 0.4 MB.' },
      ],
    },
    nome: 'MOVER · Campus Mauá 3D',
    parceiro: { pt: 'TCC · multinacional do setor automotivo', en: 'Capstone · multinational automotive company' },
    ano: '2025 – 2026',
    papel: { pt: 'Ponta a ponta: simulação, mapa, painel e maquete 3D', en: 'End to end: simulation, map, dashboard and 3D model' },
    frase: {
      pt: 'Gêmeo digital de um caminhão autônomo no campus da Mauá, do levantamento topográfico à maquete 3D no navegador.',
      en: 'Digital twin of an autonomous truck on the Mauá campus, from the topographic survey to a 3D model in the browser.',
    },
    resumo: {
      pt: 'Maquete isométrica e interativa feita do levantamento real, com o caminhão do TCC freando nas lombadas e parando na faixa com pedestre. Por trás, a simulação em Python no CARLA com YOLO, LiDAR, filtro de Kalman e Pure Pursuit.',
      en: 'Interactive isometric model built from the real survey, with the capstone truck braking on speed bumps and stopping at crosswalks. Behind it, a Python simulation on CARLA with YOLO, LiDAR, a Kalman filter and Pure Pursuit.',
    },
    numeros: [
      { valor: '784 m', rotulo: { pt: 'anel viário', en: 'ring road' } },
      { valor: '28', rotulo: { pt: 'prédios reais', en: 'real buildings' } },
      { valor: '0,4 MB', rotulo: { pt: 'modelo 3D', en: '3D model' } },
    ],
    stack: ['Python', 'CARLA', 'YOLO', 'OpenDRIVE', 'Next.js', 'React Three Fiber', 'Playwright'],
    areas: ['fullstack', 'ia'],
    midia: {
      poster: '/media/mover-poster.webp',
      video: { mp4: '/media/mover.mp4', webm: '/media/mover.webm' },
      width: 1280,
      height: 720,
      alt: {
        pt: 'Caminhão MOVER dando a volta no anel viário da maquete 3D do campus',
        en: 'MOVER truck driving around the ring road of the 3D campus model',
      },
      legenda: { pt: 'Fig. 1: anel viário, 784 m', en: 'Fig. 1: ring road, 784 m' },
    },
    demoUrl: 'https://lucaskenz.github.io/mover-campus-3d-site/',
    apresentacaoUrl: 'https://lucaskenz.github.io/mover-campus-3d-site/?apresentacao=1',
    estudoDeCaso: true,
    destaque: true,
    estudo: {
      secoes: [
        {
          id: 'problema',
          titulo: { pt: 'Problema', en: 'Problem' },
          texto: [
            {
              pt: 'O TCC simula um caminhão autônomo no campus da Mauá dentro do CARLA, um simulador pesado que só roda numa máquina com placa de vídeo. Banca, feira e parceiro precisavam ver o resultado sem instalar nada.',
              en: 'The capstone simulates an autonomous truck on the Mauá campus inside CARLA, a heavy simulator that only runs on a machine with a GPU. The committee, the fair and the partner needed to see the result without installing anything.',
            },
          ],
        },
        {
          id: 'papel',
          titulo: { pt: 'Meu papel', en: 'My role' },
          texto: [
            {
              pt: 'Fiz todas as partes: a navegação em Python (percepção, fusão de sensores e controle), o pipeline do mapa, os painéis de telemetria e a maquete 3D publicada.',
              en: 'I built every part: the Python navigation (perception, sensor fusion and control), the map pipeline, the telemetry dashboards and the published 3D model.',
            },
          ],
        },
        {
          id: 'solucao',
          titulo: { pt: 'Solução', en: 'Solution' },
          texto: [
            {
              pt: '- **Maquete 3D do campus** feita do levantamento topográfico real: malha glTF de 21 partes, 28 prédios casados com a planilha de edificações, anel viário de 784 m com 4 lombadas e 8 faixas, e 411 das 1.743 árvores levantadas.',
              en: '- **3D campus model** built from the real topographic survey: a 21-part glTF mesh, 28 buildings matched to the buildings sheet, a 784 m ring road with 4 speed bumps and 8 crosswalks, and 411 of the 1,743 surveyed trees.',
            },
            {
              pt: '- **Caminhão autônomo** com perfil de velocidade determinístico: freia nas lombadas (8 km/h), reduz nas faixas (12 km/h) e para 3 s quando há pedestre.',
              en: '- **Autonomous truck** with a deterministic speed profile: it brakes on speed bumps (8 km/h), slows at crosswalks (12 km/h) and stops for 3 s when a pedestrian is there.',
            },
            {
              pt: '- **Interface de operações**: KPIs, linha do tempo da volta, busca com voo de câmera, modos de câmera e um modo apresentação para deixar rodando numa TV.',
              en: '- **Operations UI**: KPIs, lap timeline, search with camera fly-to, camera modes and a presentation mode to leave running on a TV.',
            },
          ],
        },
        {
          id: 'como',
          titulo: { pt: 'Como foi feito', en: 'How it was built' },
          texto: [
            {
              pt: '- **Simulação:** Python no CARLA 0.9.16, percepção com YOLO, LiDAR e câmeras, fusão GNSS + IMU com filtro de Kalman, controle Pure Pursuit e telemetria em SQLite.',
              en: '- **Simulation:** Python on CARLA 0.9.16, perception with YOLO, LiDAR and cameras, GNSS + IMU fusion with a Kalman filter, Pure Pursuit control and SQLite telemetry.',
            },
            {
              pt: '- **Mapa:** DXF do levantamento convertido em OpenDRIVE (34 vias, 4 junções, 1,56 km) por um pipeline com validação automática.',
              en: '- **Map:** survey DXF converted to OpenDRIVE (34 roads, 4 junctions, 1.56 km) by a pipeline with automatic validation.',
            },
            {
              pt: '- **Web:** Next.js com export estático e React Three Fiber; compressão meshopt leva o modelo a 0,4 MB e o site inteiro a 2,9 MB.',
              en: '- **Web:** Next.js static export and React Three Fiber; meshopt compression brings the model to 0.4 MB and the whole site to 2.9 MB.',
            },
            {
              pt: '- **Testes:** Playwright roda 5 voltas seguidas conferindo que nenhuma roda sai da pista, e um teste confirma que o site funciona offline. A simulação tem 362 testes offline.',
              en: '- **Tests:** Playwright drives 5 laps in a row checking that no wheel leaves the road, and a test confirms the site works offline. The simulation has 362 offline tests.',
            },
          ],
        },
        {
          id: 'resultados',
          titulo: { pt: 'Resultados', en: 'Results' },
          texto: [
            {
              pt: 'A maquete abre em qualquer navegador, inclusive no celular, e ficou no ar no GitHub Pages para a banca e a feira. O mesmo dado da simulação alimenta o painel 3D ao vivo e em replay.',
              en: 'The model opens in any browser, phones included, and went live on GitHub Pages for the committee and the fair. The same simulation data feeds the 3D dashboard live and in replay.',
            },
          ],
        },
        {
          id: 'proximos',
          titulo: { pt: 'Próximos passos', en: 'Next steps' },
          texto: [
            {
              pt: 'Validar ao vivo a nova rodada do mapa, calibrar o detector de lombadas com o LiDAR real e medir o custo do painel web sobre a simulação (meta: menos de 5% de FPS).',
              en: 'Validate the new map round live, calibrate the speed-bump detector with real LiDAR data and measure the web dashboard overhead on the simulation (target: under 5% FPS).',
            },
          ],
        },
      ],
      trecho: {
        legenda: {
          pt: 'Perfil de velocidade: passes de frenagem para trás e de aceleração para frente sobre a grade da volta (trecho real do código).',
          en: 'Speed profile: backward braking and forward acceleration passes over the lap grid (real excerpt from the code).',
        },
        linguagem: 'ts',
        codigo: [
          '// passes de frenagem (para tras) e aceleracao (para frente),',
          '// duas voltas para fechar o ciclo',
          'for (let r = 0; r < 2; r++)',
          '  for (let k = 2 * n - 1; k >= 0; k--) {',
          '    const i = k % n;',
          '    const j = (i + 1) % n;',
          '    v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * A_FREIO * ds));',
          '  }',
          'for (let r = 0; r < 2; r++)',
          '  for (let k = 0; k < 2 * n; k++) {',
          '    const i = (k + 1) % n;',
          '    const h = k % n;',
          '    v[i] = Math.min(v[i], Math.sqrt(v[h] * v[h] + 2 * A_ACEL * ds));',
          '  }',
        ].join('\n'),
      },
    },
  },
  {
    slug: 'giteam',
    cv: {
      titulo: { pt: 'GiTeam: plataforma de IA para revisão de código', en: 'GiTeam: AI code review platform' },
      periodo: { pt: 'jan 2025 – mai 2025', en: 'Jan 2025 – May 2025' },
      bullets: [
        { pt: 'Desenvolvi a lógica de agentes de IA (OpenAI e Anthropic) que analisaram mais de 1.000 Pull Requests e Issues do GitHub e postaram as revisões automaticamente.', en: 'Wrote the AI agent logic (OpenAI and Anthropic) that reviewed 1,000+ GitHub pull requests and issues and posted the reviews automatically.' },
        { pt: 'Construí o back-end em Python (FastAPI, PostgreSQL) com autenticação GitHub OAuth e webhooks.', en: 'Built the Python back end (FastAPI, PostgreSQL) with GitHub OAuth and webhooks.' },
        { pt: 'Montei a arquitetura serverless na AWS (Lambda, SQS, API Gateway) com infraestrutura como código (AWS CDK) e controle de custo das chamadas de IA.', en: 'Set up the serverless AWS architecture (Lambda, SQS, API Gateway) as infrastructure as code (AWS CDK), with cost tracking for AI calls.' },
      ],
    },
    nome: 'GiTeam',
    parceiro: { pt: 'Projeto em equipe · IMT', en: 'Team project · IMT' },
    ano: '2025',
    papel: { pt: 'Agentes de IA e back-end serverless', en: 'AI agents and serverless back end' },
    frase: {
      pt: 'Agentes de IA que revisam Pull Requests e Issues do GitHub e comentam sozinhos.',
      en: 'AI agents that review GitHub pull requests and issues and comment on their own.',
    },
    resumo: {
      pt: 'Back-end em FastAPI com GitHub OAuth e webhooks, processamento assíncrono em AWS Lambda e SQS, infraestrutura em AWS CDK e controle de custo das chamadas de IA (OpenAI e Anthropic).',
      en: 'FastAPI back end with GitHub OAuth and webhooks, async processing on AWS Lambda and SQS, infrastructure in AWS CDK and cost tracking for AI calls (OpenAI and Anthropic).',
    },
    numeros: [
      { valor: '1.000+', rotulo: { pt: 'PRs e issues analisados', en: 'PRs and issues reviewed' } },
      { valor: '2', rotulo: { pt: 'provedores de IA', en: 'AI providers' } },
      { valor: 'IaC', rotulo: { pt: 'AWS CDK', en: 'AWS CDK' } },
    ],
    stack: ['Python', 'FastAPI', 'PostgreSQL', 'AWS Lambda', 'SQS', 'API Gateway', 'AWS CDK'],
    areas: ['fullstack', 'ia'],
    codigoUrl: 'https://github.com/FelipeCarillo/giteam-backend',
  },
  {
    slug: 'serpentina',
    nome: 'Serpentina',
    parceiro: { pt: 'Projeto pessoal · micro-SaaS', en: 'Personal project · micro-SaaS' },
    ano: '2026',
    papel: { pt: 'Produto, design e código', en: 'Product, design and code' },
    frase: {
      pt: 'Orçamento de ar-condicionado que o cliente aprova no celular, com Pix do sinal.',
      en: 'Air-conditioning quotes the customer approves on the phone, with a Pix deposit.',
    },
    resumo: {
      pt: 'O instalador calcula a carga térmica na visita, monta o orçamento e manda um link; o cliente aprova com o nome e vê o Pix gerado com a chave do instalador. Demonstração local, sem servidor publicado.',
      en: 'The installer computes the heat load on site, builds the quote and sends a link; the customer approves with their name and sees a Pix code made with the installer’s key. Local demo, no server deployed.',
    },
    numeros: [
      { valor: '100', rotulo: { pt: 'Lighthouse desktop', en: 'Lighthouse desktop' } },
      { valor: 'BTU/h', rotulo: { pt: 'carga térmica', en: 'heat load' } },
      { valor: 'Pix', rotulo: { pt: 'BR Code do sinal', en: 'deposit BR Code' } },
    ],
    stack: ['Next.js 16', 'React 19', 'Drizzle', 'Postgres', 'Auth.js', 'Stripe', 'Playwright'],
    areas: ['fullstack'],
    midia: {
      poster: '/media/serpentina-home.webp',
      width: 1280,
      height: 720,
      alt: {
        pt: 'Página inicial do Serpentina com a demonstração do orçamento',
        en: 'Serpentina home page with the quote demo',
      },
    },
    estudoDeCaso: true,
    estudo: {
      secoes: [
        {
          id: 'problema',
          titulo: { pt: 'Problema', en: 'Problem' },
          texto: [
            {
              pt: 'Instaladores de ar-condicionado fazem o orçamento no papel ou no WhatsApp, calculam a potência de cabeça e perdem vendas porque não sabem quem viu a proposta e quem esfriou.',
              en: 'Air-conditioning installers quote on paper or WhatsApp, size the units by rule of thumb and lose sales because they cannot tell who saw the proposal and who went cold.',
            },
          ],
        },
        {
          id: 'papel',
          titulo: { pt: 'Meu papel', en: 'My role' },
          texto: [{ pt: 'Projeto pessoal: produto, design, código e testes.', en: 'Personal project: product, design, code and tests.' }],
        },
        {
          id: 'solucao',
          titulo: { pt: 'Solução', en: 'Solution' },
          texto: [
            { pt: '- Calculadora de carga térmica por ambiente (BTU/h) usada na visita.', en: '- Per-room heat-load calculator (BTU/h) used on site.' },
            {
              pt: '- Orçamento com os preços do próprio instalador, enviado por link; o cliente aprova com o nome e vê o Pix do sinal (BR Code) gerado com a chave do instalador.',
              en: '- Quote with the installer’s own prices, sent as a link; the customer approves with their name and sees the deposit Pix code (BR Code) made with the installer’s key.',
            },
            { pt: '- Painel com quem abriu, quem está parado e quais manutenções vencem.', en: '- Dashboard showing who opened, who stalled and which maintenance visits are due.' },
          ],
        },
        {
          id: 'como',
          titulo: { pt: 'Como foi feito', en: 'How it was built' },
          texto: [
            {
              pt: 'Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind 4, componentes no padrão shadcn/ui, Auth.js, Drizzle + Postgres (PGlite no modo demonstração), Stripe Billing com webhook idempotente, Resend, Zod, Vitest e Playwright.',
              en: 'Next.js 16 (App Router), React 19, strict TypeScript, Tailwind 4, shadcn/ui-style components, Auth.js, Drizzle + Postgres (PGlite in demo mode), Stripe Billing with an idempotent webhook, Resend, Zod, Vitest and Playwright.',
            },
          ],
        },
        {
          id: 'resultados',
          titulo: { pt: 'Resultados', en: 'Results' },
          texto: [
            {
              pt: 'Roda inteiro em modo demonstração com `pnpm dev`, sem nenhuma chave. Lighthouse 100 no desktop e teste ponta a ponta do cadastro à aprovação e ao upgrade de plano. É uma demonstração: não há servidor publicado.',
              en: 'Runs end to end in demo mode with `pnpm dev`, no keys needed. Lighthouse 100 on desktop and an end-to-end test from sign-up to approval and plan upgrade. It is a demo: no server is deployed.',
            },
          ],
        },
      ],
      galeria: [
        {
          poster: '/media/serpentina-painel.webp',
          width: 1280,
          height: 998,
          alt: { pt: 'Painel do instalador com orçamentos e status', en: 'Installer dashboard with quotes and status' },
          legenda: { pt: 'Painel do instalador', en: 'Installer dashboard' },
        },
        {
          poster: '/media/serpentina-celular.webp',
          width: 375,
          height: 760,
          alt: { pt: 'Link de aprovação aberto no celular do cliente', en: 'Approval link opened on the customer’s phone' },
          legenda: { pt: 'Link de aprovação no celular', en: 'Approval link on the phone' },
        },
      ],
    },
  },
  {
    slug: 'onepage',
    nome: 'Onepage',
    parceiro: { pt: 'Projeto pessoal · template SaaS', en: 'Personal project · SaaS template' },
    ano: '2026',
    papel: { pt: 'Produto e código', en: 'Product and code' },
    frase: {
      pt: 'Site one-page para pequeno negócio gerado a partir de um único JSON, em PT ou EN.',
      en: 'One-page site for small businesses generated from a single JSON file, in PT or EN.',
    },
    resumo: {
      pt: 'Um script Node monta um HTML estático com horários, cardápio vindo do Google Sheets, avaliações, FAQ, mapa e botão de WhatsApp. Visitas por QR code ou acesso direto vão para o Supabase. Os negócios das capturas são exemplos fictícios.',
      en: 'A Node script builds a static HTML page with opening hours, a menu pulled from Google Sheets, reviews, FAQ, map and a WhatsApp button. Visits from QR codes or direct access go to Supabase. The businesses in the screenshots are fictional examples.',
    },
    numeros: [
      { valor: '~30 min', rotulo: { pt: 'por cliente novo', en: 'per new client' } },
      { valor: '1 JSON', rotulo: { pt: 'de configuração', en: 'config file' } },
      { valor: 'PT/EN', rotulo: { pt: 'idiomas', en: 'languages' } },
    ],
    stack: ['HTML', 'CSS', 'JavaScript', 'Node.js', 'Google Sheets', 'Supabase', 'Cloudflare Pages'],
    areas: ['fullstack'],
    midia: {
      poster: '/media/onepage-restaurante.webp',
      width: 1280,
      height: 720,
      alt: { pt: 'Exemplo de site one-page de um restaurante fictício', en: 'Example one-page site for a fictional restaurant' },
      legenda: { pt: 'Exemplo fictício', en: 'Fictional example' },
    },
    estudoDeCaso: true,
    estudo: {
      secoes: [
        {
          id: 'problema',
          titulo: { pt: 'Problema', en: 'Problem' },
          texto: [
            {
              pt: 'Muitos restaurantes, barbearias e salões têm boas avaliações no Google, mas nenhum site, ou um site que não abre bem no celular.',
              en: 'Many restaurants, barbershops and salons have good Google reviews but no website, or one that breaks on phones.',
            },
          ],
        },
        {
          id: 'solucao',
          titulo: { pt: 'Solução', en: 'Solution' },
          texto: [
            { pt: '- Um template one-page por segmento, preenchido só com um arquivo `client.json`.', en: '- A one-page template per business segment, filled from a single `client.json` file.' },
            { pt: '- Cardápio editado pelo próprio dono numa planilha do Google Sheets (CSV), sem painel.', en: '- Menu edited by the owner in a Google Sheets spreadsheet (CSV), no admin panel.' },
            { pt: '- Contagem de visitas por QR code ou acesso direto, gravada no Supabase.', en: '- Visit counting by QR code or direct access, stored in Supabase.' },
          ],
        },
        {
          id: 'como',
          titulo: { pt: 'Como foi feito', en: 'How it was built' },
          texto: [
            {
              pt: 'HTML, CSS e JavaScript puros; um `build.js` em Node injeta textos, cores e scripts no template e gera um único `index.html` de cerca de 38 KB, publicado no Cloudflare Pages. O guia de replicação prevê gerar a demo em ~3 min e publicar em ~30 min.',
              en: 'Plain HTML, CSS and JavaScript; a Node `build.js` injects text, colors and scripts into the template and outputs one `index.html` of about 38 KB, hosted on Cloudflare Pages. The replication guide plans ~3 min to build the demo and ~30 min to publish.',
            },
          ],
        },
      ],
      galeria: [
        {
          poster: '/media/onepage-barbearia.webp',
          width: 1280,
          height: 720,
          alt: { pt: 'Exemplo em inglês para uma barbearia fictícia', en: 'English example for a fictional barbershop' },
          legenda: { pt: 'Exemplo fictício em inglês', en: 'Fictional example in English' },
        },
        {
          poster: '/media/onepage-celular.webp',
          width: 375,
          height: 760,
          alt: { pt: 'Exemplo do restaurante no celular', en: 'Restaurant example on a phone' },
          legenda: { pt: 'No celular', en: 'On a phone' },
        },
      ],
    },
  },
  {
    slug: 'sptrans',
    cv: {
      titulo: { pt: 'Reconhecimento facial para controle de acesso (SPTrans)', en: 'Face recognition for access control (SPTrans)' },
      periodo: { pt: 'jun 2024 – mai 2025', en: 'Jun 2024 – May 2025' },
      bullets: [
        { pt: 'Liderei o front-end em React Native de um app e site com 6 telas, prototipados no Figma, num time de 4 pessoas.', en: 'Led the React Native front end of a 6-screen app and website, prototyped in Figma, in a team of 4.' },
        { pt: 'Integrei Firebase e a API do ChatGPT para reconhecimento facial com 95% de acurácia e cerca de 5 segundos por reconhecimento.', en: 'Integrated Firebase and the ChatGPT API for face recognition with 95% accuracy in about 5 seconds.' },
        { pt: 'Organizei o time em Scrum (sprints e prazos) e configurei integração contínua com GitHub Actions.', en: 'Ran the team in Scrum and set up continuous integration with GitHub Actions.' },
      ],
    },
    nome: 'Acesso facial',
    parceiro: { pt: 'SPTrans', en: 'SPTrans' },
    ano: '2024 – 2025',
    papel: { pt: 'Líder de front-end, time de 4', en: 'Front-end lead, team of 4' },
    frase: {
      pt: 'App e site de controle de acesso por reconhecimento facial para catracas.',
      en: 'App and website for face recognition access control at turnstiles.',
    },
    resumo: {
      pt: 'Protótipo no Figma, front-end em React Native, back-end em Firebase e reconhecimento pela API do ChatGPT; Scrum e CI no GitHub Actions. Código privado.',
      en: 'Figma prototype, React Native front end, Firebase back end and recognition through the ChatGPT API; Scrum and CI on GitHub Actions. Private code.',
    },
    numeros: [
      { valor: '95%', rotulo: { pt: 'acurácia', en: 'accuracy' } },
      { valor: '~5 s', rotulo: { pt: 'por reconhecimento', en: 'per recognition' } },
      { valor: '6', rotulo: { pt: 'telas', en: 'screens' } },
    ],
    stack: ['React Native', 'Firebase', 'ChatGPT API', 'Figma', 'GitHub Actions'],
    areas: ['fullstack', 'ia'],
  },
  {
    slug: 'feedit',
    cv: {
      titulo: { pt: 'FEEDIT: líder de projeto, Centro Universitário São Camilo', en: 'FEEDIT: project lead, Centro Universitário São Camilo' },
      periodo: { pt: 'fev 2024 – mai 2024', en: 'Feb 2024 – May 2024' },
      bullets: [
        { pt: 'Liderei um time de 4 pessoas em 4 sprints e entreguei um app funcional de nutrição no estilo "bichinho virtual" (tamagotchi).', en: 'Led a team of 4 through 4 sprints and delivered a working nutrition app in a virtual-pet (tamagotchi) style.' },
        { pt: 'Nos testes de demonstração, usuários reduziram o consumo diário em até 400 kcal.', en: 'In demo tests, users cut their daily intake by up to 400 kcal.' },
        { pt: 'Levantei e refinei requisitos com o cliente e transformei o feedback em backlog priorizado.', en: 'Gathered requirements with the client and turned feedback into a prioritized backlog.' },
      ],
    },
    nome: 'FEEDIT',
    parceiro: { pt: 'Centro Universitário São Camilo', en: 'Centro Universitário São Camilo' },
    ano: '2024',
    papel: { pt: 'Líder de projeto, time de 4', en: 'Project lead, team of 4' },
    frase: {
      pt: 'App de nutrição no estilo bichinho virtual que ajuda a comer melhor.',
      en: 'Virtual-pet nutrition app that nudges better eating.',
    },
    resumo: {
      pt: 'Requisitos com o cliente, backlog e 4 sprints até um app funcional. Nos testes de demonstração, usuários reduziram o consumo diário em até 400 kcal.',
      en: 'Requirements with the client, backlog and 4 sprints to a working app. In demo tests, users cut their daily intake by up to 400 kcal.',
    },
    numeros: [
      { valor: '−400', rotulo: { pt: 'kcal/dia na demo', en: 'kcal/day in demo' } },
      { valor: '4', rotulo: { pt: 'sprints', en: 'sprints' } },
      { valor: '4', rotulo: { pt: 'pessoas', en: 'people' } },
    ],
    stack: ['Scrum', 'Requisitos', 'Mobile'],
    areas: ['fullstack'],
  },
];
