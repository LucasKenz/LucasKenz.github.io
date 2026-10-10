# Referências

Pesquisa da F0 (10/10/2026). Cada site foi visitado (leitura do HTML, sem copiar texto, código ou
imagens). O que vale aproveitar é a **estrutura**, nunca o conteúdo ou a marca. Onde a leitura não
mostrou tipografia ou animação, completei com o que conheço do site e marquei com *(memória)*.

## Portfólios de desenvolvedores

| Site | O que funciona | Para o meu |
|---|---|---|
| **Brittany Chiang** — brittanychiang.com | Topo: nome grande, cargo, frase curta, âncoras Sobre/Experiência/Projetos e redes. Experiência como linha do tempo com datas, cargo com link e tags de stack; projetos em cartões com captura. Coluna fixa à esquerda no desktop *(memória)*, linha que destaca o item no hover. | Coluna fixa com nome + navegação no desktop; tags de stack em todo item; "ver arquivo completo" no fim da lista. |
| **Lee Robinson** — leerob.com | Nome e bio curtíssima no topo; o resto é lista de textos com data, sem miniatura. Conteúdo primeiro. | Página "Sobre" sem enfeite; listas densas quando a imagem não acrescenta. |
| **Josh W. Comeau** — joshwcomeau.com | Cartões de artigo com título forte, subtítulo e teaser; alternância de som e de tema; voz próxima. Microinterações caprichadas nos botões *(memória)*. | Botão de tema com transição própria; botões com resposta física (mola) respeitando `prefers-reduced-motion`. |
| **Dan Abramov** — overreacted.io | Índice cronológico reverso: título, data e uma linha. Separação clara, fácil de varrer. | Estudo de caso com largura de leitura (~68 ch) e hierarquia de texto pura. |
| **Paco Coursey** — paco.me | Uma página: nome, frase, depois Building, Projects, Writing, Now, Connect. Cada projeto é nome + 1 linha. | Seção "Agora" (o que estou fazendo neste mês) — barata de manter e humana. |
| **Rauno Freiberg** — rauno.me | Bio de uma linha seguida de um manifesto curto; "Craft" separado de "Projects". Detalhes de interação de produto *(memória)*. | Separar **Projetos** (entregas reais) de **Lab** (experimentos de craft). |
| **Emil Kowalski** — emilkowal.ski | Nome + "Design Engineer" + bio; projetos e textos como listas com título em negrito e uma linha. Animações curtas e precisas *(memória)*. | Duração/curva de animação únicas em tokens; nada passa de ~300 ms. |
| **Bruno Simon** — bruno-simon.com | Mundo 3D dirigível (Three.js, WebGPU com opção de qualidade baixa/alta, física Rapier, som Howler). Mapa, conquistas, circuito. Funciona sem o servidor. Sem versão não-3D. | Seletor de qualidade e 3D opcional; **sempre** ter versão sem 3D (o meu é currículo antes de ser brinquedo). |
| **Robby Leonardi** — rleonardi.com/interactive-resume | Currículo como jogo de plataforma que anda com a rolagem *(memória)*. | Só inspiração: linha do tempo que "anda" com a rolagem no /curriculo, discreta. |
| **Adham Dannaway** — adhamdannaway.com | Topo com duas facetas lado a lado (designer × coder) e foto. Projetos com miniatura e categoria. | Topo com duas facetas: **Full Stack** e **IA/Dados** — vira o seletor de área do CV. |
| **Cassie Evans** — cassie.codes | Hoje o site é uma despedida curta (ela saiu da web). Antes: SVG animado com personalidade *(memória)*. | Personalidade em um detalhe só (o caminhãozinho), não no site inteiro. |
| **Sarah Drasner** — sarah.dev | "I make things", bio com cargos, livros, cursos, contato. Links para escrita, palestras e projetos. | Prova social com fatos verificáveis (parceiros reais), não adjetivos. |
| **Delba** — delba.dev (da lista developer-portfolios) | Título + alvo de vaga numa linha + "Vamos conversar"; trabalhos como lista com papel de cada um. | Dizer no topo **qual vaga eu busco** (Trainee 2027) com CTA direto. |

## Produtos (padrão de acabamento)

| Site | O que funciona | Para o meu |
|---|---|---|
| **Linear** — linear.app | Pílula "novo" acima do título, subtítulo curto, CTAs. Seções em ritmo fixo: título curto + 1 linha + captura + "saiba mais". Identificadores tipo ticket (ENG-2085) e legendas "Fig 0.1" dão cara de produto real. | Legendas técnicas reais nas capturas (ex.: "Fig. 1 — anel viário, 784 m"); ritmo fixo de seção no estudo de caso. |
| **Vercel** — vercel.com *(memória)* | Grade fina visível, alto contraste, cartões com borda de 1 px e mono para números. | Grade de fundo sutil e números em fonte mono. |
| **Stripe** — stripe.com *(memória)* | Hierarquia rígida (eyebrow → título → texto), gradiente como assinatura, animação ligada à rolagem. | Eyebrow em mono acima de cada título de seção. |
| **Apple** — apple.com *(memória)* | Uma ideia por tela, espaço em branco, foto grande. | Estudo de caso do MOVER em "telas" com uma ideia cada. |
| **GitHub** — github.com/readme *(memória)* | Projetos de código contados como história, com trechos de código e autor. | Trecho de código curto e real em cada estudo de caso (ex.: perfil de velocidade). |

## Galerias

- **Awwwards — categoria Portfolio** (awwwards.com/websites/portfolio, visitada em 10/10/2026). Em
  destaque nesta semana: LPAS (Studio Naam), Maria Vasilyeva, twks, Arthur Engel (aengel.io), Rubens
  Cantuni, Nahiyan Khan. **Arthur Engel**: seis estudos de caso, cada um com ano, resumo, papel, stack
  e link; seções presas na rolagem; "arraste para trocar de projeto"; tem uma **versão leve** e um
  **Lab** separado no menu. Confirma a ideia de Lab + versão sem 3D.
- **emmabostian/developer-portfolios** (github.com/emmabostian/developer-portfolios): 2.014
  portfólios. Padrões que se repetem nos melhores: nome + cargo + 1 frase no topo, projetos com
  papel e stack, contato direto, sem barras de "porcentagem".

## Padrões que vou usar

1. Topo diz quem sou, **qual vaga busco** e mostra 2 CTAs (Ver projetos, Baixar CV).
2. Projetos reais separados do Lab de experimentos 3D.
3. Cada projeto: papel, stack em tags, 1 número, links condicionais.
4. Legendas técnicas reais em capturas e números em fonte mono.
5. 3D opcional, carregado depois, com qualidade ajustável e versão sem 3D.
6. Animações curtas com uma curva só, todas desligadas em `prefers-reduced-motion`.
7. Coluna fixa no desktop, menu simples no celular.
8. Seletor de área (Full Stack × IA/Dados) que muda o CV e destaca projetos.

## Evitar

Gradiente roxo-azul genérico, emoji como marcador, tudo centralizado, cartões iguais com a mesma
sombra, "01/02/03" sem sequência real, barras de porcentagem de habilidade, depoimentos inventados.
