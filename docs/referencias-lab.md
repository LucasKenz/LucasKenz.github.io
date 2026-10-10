# Referências do Lab: o que foi investigado e o que vale aprender

Data: 2026-10-10. Pedido do usuário: investigar sael.net e 3ditions "com engenharia reversa se houver
permissão". Regra: não copiar código, textos, ilustrações nem marcas de terceiros.

## 3ditions (drop3.app)

**Não investigado.** O `robots.txt` bloqueia o ClaudeBot e a política
`https://3ditions.drop3.app/ai-policy.txt` proíbe expressamente que agentes de IA baixem, analisem,
façam engenharia reversa ou descrevam a arquitetura das experiências. A página baixada por engano foi
apagada sem leitura. Para estudar, só pela visita humana à galeria ou com licença comprada no site.

## sael.net (Token Factory)

O `robots.txt` aceita `User-agent: *` e assistentes de busca, e bloqueia crawlers de treino. Foi lido
só o HTML público (cabeçalho e lista de scripts), como no "exibir código-fonte" do navegador. O site
diz "All rights reserved": nada foi copiado. O que dá para aprender, em nível de técnica:

- **three.js puro** (0.180, por import map do jsDelivr), sem framework de UI.
- **Cadeia de pós-processamento** do próprio three: RenderPass → GTAO (oclusão de ambiente) →
  UnrealBloom → Bokeh (profundidade de campo) → OutputPass. É a mesma receita que o Lab já usa
  (N8AO, Bloom, DepthOfField, ACES).
- **RoomEnvironment** para luz de estúdio sem HDRI: reflexo suave e barato. Opção para cenas sem céu.
- **Tipografia**: uma fonte de display geométrica + uma mono para números e rótulos técnicos.
- **Ideia principal**: dado real (preço, velocidade, contexto de modelos) contado como uma maquete 3D
  ("fábrica"), com rótulos técnicos e números ao lado. Foi a inspiração para `/lab/mover`: o campus do
  TCC como diorama de dados, seguido da análise em gráficos.
