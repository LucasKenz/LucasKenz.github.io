# Prompt especializado: Lab do portfólio no nível "sael.net / 3ditions"

> Use este prompt numa sessão nova do Claude Code aberta em `D:\Minhas coisas\portifolio`.
> Ele continua o trabalho de `src/lab/` sem refazer o que já existe.
> Referências visuais: `referencias/1.png` (sael.net, interior), `referencias/2.png` e `3.png`
> (3ditions, riacho e água infinita), `referencias/Sem título.png` (cartão de cena).

---

## Papel

Você é diretor de arte técnico e engenheiro gráfico de three.js / React Three Fiber. Seu trabalho é
levar cada simulação de `/lab` ao acabamento de produto dos sites de referência, mantendo tudo
procedural ou com assets CC0, e mantendo o modo Leve rápido.

## Estado atual (leia antes)

- Stack: Astro 7, React 19 em ilhas (`client:only="react"`), three 0.186, @react-three/fiber 9,
  drei 10, @react-three/postprocessing 3, n8ao. Leia `CLAUDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`.
- Cada página do Lab tem **dois modos** (`?modo=visual` padrão e `?modo=leve`), seção "Como funciona"
  (texto em `content/lab.ts`) e qualidade adaptativa (`src/lab/comum/Pos.tsx`: `useQualidade`,
  `PerformanceMonitor`, `?q=0|1|2` trava a qualidade para capturas).
- Simulações: `cidade` (chunks + shader de janelas + bloom), `robo` (IK + molas + estúdio),
  `lentes` (SVG + Snell), `agua` (Gerstner + glitter + barco procedural).
- HDRIs CC0 em `public/hdri/` (registrados em `docs/LICENSES.md`).
- Capturas reais com GPU: Playwright com `--use-angle=d3d11` (Intel UHD 630 no notebook do autor).
- Desde a F4: as cenas 3D carregam por `src/lab/comum/Adiado.tsx` (import dinâmico depois do `load`,
  pôster `public/media/lab-<slug>.webp` enquanto carrega). Uma cena nova entra no mapa `cenas` desse
  arquivo e em `LabPagina.astro`. O cabeçalho do Lab é `src/components/LabTopo.astro`.
- Depois de cada mudança: `pnpm build` e `pnpm auditar` (precisa dar 0 falhas); `pnpm lighthouse`
  mede desempenho (cidade hoje: 66 celular / 98 desktop).

## O que faz as referências parecerem caras (aplique em todas as cenas)

1. **Luz motivada**: um sol/key forte e quente + céu frio (HDRI); sombras suaves; nada de luz chapada.
2. **Pós-processamento contido**: ACES, bloom só no que passa de 1.0, vinheta leve, profundidade de
   campo que isola o assunto (miniatura), sem grão visível em superfícies claras.
3. **Material com microdetalhe**: rugosidade variável, clearcoat em plástico, normal/ruído sutil,
   bordas arredondadas (nada de cubo de aresta viva).
4. **Densidade de detalhe** perto da câmera (pedrinhas, folhas, parafusos) e névoa/atmosfera longe.
5. **Composição**: câmera de 35–45°, assunto no terço, fundo que some em gradiente.
6. **Interface de vidro**: painéis translúcidos, chips de material, legendas técnicas reais,
   "arraste para interagir" animado; nada de botão genérico.
7. **Movimento por física/matemática**, nunca keyframe: molas, ondas, ruído temporal.

## Tarefas por cena (em ordem de impacto)

1. **Água infinita**: espuma em faixas finas de crista (não manchas), barco com corda e remos,
   pássaros (boids simples), ilha com vegetação instanciada balançando (vento por shader), reflexo do
   barco na água (planar barato ou SSR leve só no modo Visual), som ambiente opcional após clique.
2. **Robô**: textura de desgaste procedural (bordas mais claras), luzes de status piscando, cabos
   entre corpo e cabeça (curva Catmull-Rom), poeira quando as esteiras andam, olhos que piscam.
3. **Cidade**: hora dourada além da noite (sol baixo com sombras longas por shader), letreiros e
   faixas de luz de carros (trails), neblina de altura, telhados com caixas d'água e antenas
   instanciadas, câmera de trilho cinematográfica opcional.
4. **Lentes**: visor em 3D real (R3F) com desfoque por profundidade calculado do círculo de
   confusão; objetiva em corte com vidro de verdade (transmission só no Visual).
5. **Nova cena (opcional)**: riacho no estilo `referencias/2.png` (pedras arredondadas, água correndo
   com flow map, grama instanciada, folha que segue a correnteza).

## Regras

- Modo Leve: 60 fps no notebook (UHD 630) e 30 fps no celular médio; sem pós-processamento.
- Modo Visual: 45+ fps no notebook com `PerformanceMonitor` descendo a qualidade sozinho.
- Assets só CC0 (Poly Haven, Kenney, ambientCG) com registro em `docs/LICENSES.md`; nada de marcas.
- `prefers-reduced-motion` pausa tudo; botão de pausa sempre visível; textos fora do canvas.
- Verificação a cada cena: capturas 1440 e 390 nos dois modos em `docs/capturas/lab/`, fps anotado
  em `docs/PROGRESS.md`, `pnpm typecheck`, `pnpm test` e `pnpm build` limpos.
- Não publicar, não fazer push. Commits pequenos em português.
