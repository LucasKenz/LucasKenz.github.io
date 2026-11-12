// Guia "Como preparar seu projeto" (#ajuda). Mesmo conteúdo de docs/02-formatos-e-preparo.md.
import { MODELO_CSV } from './formatos/csv.js';

const EX = 'data/exemplos/';
const HTML = `
<h2>Como preparar seu projeto</h2>
<p>Você exporta o modelo 3D do seu programa, importa aqui, confere as peças num assistente de seis passos e começa a orçar. Tudo fica no seu navegador: nada é enviado para servidor.</p>

<div class="ouro">
<h3>Regra de ouro</h3>
<ol>
<li><b>Um objeto por peça.</b> Cada pilar, viga ou quadro é um objeto separado.</li>
<li><b>Nome do objeto = tipo da peça:</b> <code>pilar</code>, <code>pilar.001</code>, <code>pilar.002</code>… Tudo o que vem depois do ponto (ou <code>_1</code>, <code>(2)</code>, <code>#3</code>) é ignorado; <code>bloco-a__pilar</code> também vira <code>pilar</code>.</li>
<li><b>Material com nome claro</b> (<code>concreto</code>, <code>aco_estrutural</code>): o assistente tenta casar com a biblioteca.</li>
<li><b>Unidades em metros</b> (ou confira a unidade no passo 1).</li>
<li><b>Peças fechadas</b> (sem furos) para o volume valer. Malha aberta? Orce pela coluna <code>preco_un</code> (preço por unidade).</li>
</ol>
</div>

<h3>Formatos lidos</h3>
<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Formato</th><th>Peças vêm de</th><th>Unidade</th></tr></thead><tbody>
<tr><td><code>.glb</code></td><td>nome do objeto (ou propriedade <code>peca</code>)</td><td>metro</td></tr>
<tr><td><code>.gltf</code> + <code>.bin</code> + texturas</td><td>idem (arraste os arquivos juntos)</td><td>metro</td></tr>
<tr><td><code>.obj</code> (+ <code>.mtl</code>)</td><td>linhas <code>o</code> / <code>g</code></td><td>o assistente pergunta</td></tr>
<tr><td><code>.fbx</code></td><td>nome do objeto</td><td>do arquivo (costuma ser cm)</td></tr>
<tr><td><code>.dae</code> (Collada)</td><td>nome do objeto</td><td>do arquivo</td></tr>
<tr><td><code>.stl</code>, <code>.ply</code></td><td>o arquivo inteiro é uma peça (mande vários)</td><td>pergunta (STL: mm)</td></tr>
<tr><td><code>.ifc</code> (IFC2x3, IFC4)</td><td>cada elemento (pilar, viga…) pelo nome ou tipo; material e quantidades oficiais do arquivo</td><td>do arquivo (metro)</td></tr>
<tr><td><code>.step</code>/<code>.stp</code>, <code>.iges</code>/<code>.igs</code></td><td>nome de cada produto/corpo (IGES sem nomes: o arquivo é uma peça)</td><td>do arquivo (convertido para metro)</td></tr>
<tr><td><code>.3dm</code> (Rhino)</td><td>nome do objeto; a camada vira sugestão de sistema</td><td>do arquivo</td></tr>
<tr><td><code>.dxf</code> (planta 2D)</td><td>não é modelo: as linhas de uma camada viram trechos de cabo no editor</td><td>do arquivo ou escolhida</td></tr>
<tr><td><code>.csv</code></td><td>catálogo de peças (ver abaixo)</td><td>—</td></tr>
</tbody></table></div>
<p class="dica">IFC, STEP, IGES e Rhino usam bibliotecas maiores (de 2 a 10 MB), baixadas só quando um desses arquivos é aberto: a primeira leitura demora alguns segundos. Ainda não lidos (exporte para um formato acima): SketchUp <code>.skp</code> → <code>.dae</code> ou <code>.glb</code>; Revit <code>.rvt</code> → <code>.ifc</code> (ou <code>.fbx</code>); AutoCAD <code>.dwg</code> → <code>.dxf</code> (planta) ou <code>.fbx</code> (3D); <code>.dwf</code> → <code>.ifc</code> ou <code>.fbx</code>; 3ds Max → <code>.fbx</code>; Blender <code>.blend</code> → <code>.glb</code>. Limites: 25 MB por arquivo, 300 tipos de peça, 20 mil objetos.</p>

<h3>Blender</h3>
<ol>
<li>Dê a cada objeto o nome do tipo da peça (F2): <code>pilar</code>, <code>pilar.001</code>…</li>
<li>Opcional: em Propriedades do objeto → Propriedades personalizadas, crie <code>peca</code> = <code>pilar</code> (vale mais que o nome).</li>
<li>Selecione tudo e aplique a escala: <b>Ctrl+A → Escala</b>.</li>
<li>Ative o complemento <b>3D Print Toolbox</b> e use <b>Verificar tudo</b>: corrija as malhas não fechadas (<i>non-manifold</i>).</li>
<li><b>Arquivo → Exportar → glTF 2.0 (.glb)</b>, marcando <b>Incluir → Propriedades personalizadas</b>.</li>
</ol>

<h3>SketchUp</h3>
<ol>
<li>Faça um <b>componente</b> por tipo de peça e dê às instâncias o nome do tipo (Entity Info → Instance: <code>pilar</code>).</li>
<li>Exporte em <b>Arquivo → Exportar → Modelo 3D → Collada (.dae)</b> (nativo) ou em <code>.glb</code> com uma extensão.</li>
<li>No passo 1 do assistente, confira a unidade: o tamanho total tem de bater com o projeto.</li>
</ol>

<h3>Revit, ArchiCAD e outros BIM (IFC)</h3>
<ol>
<li>Abra uma <b>vista 3D</b> só com o que entra no orçamento.</li>
<li><b>Arquivo → Exportar → IFC</b> (IFC4 ou IFC2x3), com <b>Exportar quantidades base</b> marcado: volume, área e comprimento oficiais vêm junto e valem no lugar da medição na malha (selo <b>oficial</b>; dá para desligar no passo 3).</li>
<li>Cada elemento vira uma cópia; o nome do tipo (ex.: <code>Pilar 40x40</code>) vira o id da peça. Use o passo 2 para juntar ou separar.</li>
<li>Sem IFC? <b>Arquivo → Exportar → FBX</b> também serve (confira a unidade no passo 1: costuma sair em pés ou centímetros).</li>
</ol>

<h3>SolidWorks, Fusion, Inventor, FreeCAD (STEP)</h3>
<ul>
<li>Exporte a montagem em <b>STEP AP214 ou AP242</b> (<code>.step</code>): cada peça sai com o nome do componente, na unidade do projeto (a página converte para metro).</li>
<li>Peças repetidas devem ter o mesmo nome base (<code>pilar</code>, <code>pilar-1</code>…). IGES (<code>.iges</code>) também é lido, mas costuma vir sem nomes: mande um arquivo por peça.</li>
<li>CAD é Z para cima: o passo 1 já vem com "Girar" marcado.</li>
</ul>

<h3>Rhino (.3dm)</h3>
<ul>
<li>Dê nome aos objetos (Propriedades → Nome) com o tipo da peça e separe os sistemas em <b>camadas</b> (a camada vira o sistema sugerido no passo 3).</li>
<li>Superfícies e sólidos NURBS precisam de malha de render: salve o arquivo com as malhas (ou use <code>Mesh</code> antes de salvar) para que apareçam.</li>
</ul>

<h3>AutoCAD (planta .dxf com rotas)</h3>
<ul>
<li>Desenhe as rotas de cabo como <b>linhas ou polilinhas</b> numa camada própria (ex.: <code>ROTAS</code>) e salve como <b>DXF em texto</b>.</li>
<li>No editor, em <b>Rota pelo chão → Rotas de uma planta (.dxf)</b> (ou arrastando o <code>.dxf</code> para a página), escolha a camada, a unidade e o deslocamento: cada linha vira um trecho de cabo que segue o chão do modelo. Arcos e curvas são ignorados.</li>
<li>Modelo 3D do AutoCAD: exporte <code>.fbx</code> ou <code>.dae</code>.</li>
</ul>

<h3>3ds Max e outros</h3>
<ul>
<li>Exporte <code>.fbx</code> ou <code>.obj</code> (com <code>.mtl</code>) mantendo os nomes dos objetos.</li>
<li>Ou exporte cada peça em <code>.stl</code>: cada arquivo vira uma peça (id = nome do arquivo). Mande vários de uma vez.</li>
<li>Arquivo sem nomes (STL, PLY, OBJ sem grupos)? No passo 2, clique nas malhas no 3D e use <b>Criar peça com estas malhas</b>.</li>
</ul>

<h3>Planilha (catálogo .csv)</h3>
<p>Mande um <code>.csv</code> junto do modelo (ou importe no passo 3) para preencher o catálogo. Separador <code>;</code> ou <code>,</code>; números com vírgula ou ponto.</p>
<div class="tabela-rolo"><table class="tabela"><thead><tr><th>Coluna</th><th>O que é</th></tr></thead><tbody>
<tr><td><code>id</code></td><td>tipo da peça (igual ao nome dos objetos)</td></tr>
<tr><td><code>nome</code>, <code>sistema</code></td><td>nome legível e grupo (Fundação, Estrutura…)</td></tr>
<tr><td><code>material</code></td><td>chave do material (mede o volume na malha)</td></tr>
<tr><td><code>qtd</code></td><td>quantidade (vazio = número de cópias no modelo)</td></tr>
<tr><td><code>massa_t</code></td><td>massa por peça, em toneladas (calibra a massa medida)</td></tr>
<tr><td><code>preco_un</code></td><td>preço por unidade, em US$ (equipamentos, malhas abertas)</td></tr>
<tr><td><code>taxa</code></td><td>kg de armadura por m³ de concreto</td></tr>
</tbody></table></div>
<p class="baixar"><a id="ajCsv" href="#" download="catalogo-modelo.csv">Baixar modelo de .csv</a></p>

<h3>O assistente, passo a passo</h3>
<ol>
<li><b>Leitura:</b> confira o tamanho total ("42,0 × 18,0 × 8,0 m"), a unidade e o eixo (Z para cima → marque "Girar").</li>
<li><b>Peças:</b> cada tipo com o número de cópias; desmarque o que é cenário; marque peças clicando no 3D.</li>
<li><b>Catálogo:</b> nome, sistema, material, <code>massa_t</code>, <code>taxa</code>, <code>preco_un</code>, <code>qtd</code> (ou importe o .csv).</li>
<li><b>Materiais:</b> crie (nome, densidade, unidade, preço) ou use um da biblioteca.</li>
<li><b>Chão e rotas</b> (opcional): o chão por onde os cabos seguem o relevo; origens e destinos das rotas de cabo.</li>
<li><b>Concluir:</b> salve o pacote <code>.orc3d-pacote.json</code> e comece a orçar.</li>
</ol>
<p>Depois, no editor: remova, adicione e mova peças, desenhe cabos (no modelo ou pelo chão), troque materiais e preços. Exporte o <code>.orc3d.json</code> (leva o pacote junto) e mande para recalcular.</p>

<h3>Checklist final</h3>
<ul>
<li>☐ Um objeto por peça, com o nome do tipo.</li>
<li>☐ Materiais com nome claro.</li>
<li>☐ Escala aplicada; tamanho total conferido no passo 1.</li>
<li>☐ Malhas fechadas (ou <code>preco_un</code> nas abertas).</li>
<li>☐ Catálogo com sistema e preço de cada peça.</li>
<li>☐ Pacote salvo antes de começar a orçar.</li>
</ul>

<h3>Exemplo: o galpão em todos os formatos</h3>
<p class="baixar">
<a href="${EX}galpao.glb" download>galpao.glb</a>
<a href="${EX}galpao.gltf" download>galpao.gltf</a><a href="${EX}galpao.bin" download>galpao.bin</a>
<a href="${EX}galpao.obj" download>galpao.obj (cm)</a><a href="${EX}galpao.mtl" download>galpao.mtl</a>
<a href="${EX}galpao.fbx" download>galpao.fbx</a>
<a href="${EX}galpao.dae" download>galpao.dae</a>
<a href="${EX}pilar.stl" download>pilar.stl (mm)</a>
<a href="${EX}pilar.ply" download>pilar.ply</a>
<a href="${EX}galpao.ifc" download>galpao.ifc</a>
<a href="${EX}galpao.step" download>galpao.step (mm)</a>
<a href="${EX}pilar.iges" download>pilar.iges</a>
<a href="${EX}galpao.3dm" download>galpao.3dm</a>
<a href="${EX}planta-rotas.dxf" download>planta-rotas.dxf</a>
<a href="${EX}galpao-catalogo.csv" download>galpao-catalogo.csv</a>
<a href="${EX}galpao.orc3d-pacote.json" download>galpao.orc3d-pacote.json</a>
</p>
<p class="dica">Experimente: baixe <code>galpao.obj</code>, <code>galpao.mtl</code> e <code>galpao-catalogo.csv</code>, clique em "Importar meu projeto" e selecione os três. Com <code>galpao.ifc</code>, o volume dos pilares vem das quantidades oficiais do arquivo.</p>

<h3>O que o resultado não inclui</h3>
<ul>
<li>Projeto, engenharia, gestão, transporte e contingência.</li>
<li>Tudo é <b>estimado</b>: preços de ordem de grandeza (US$, fornecido e instalado); troque pelos preços do cliente.</li>
<li>O volume só vale para malha fechada. Malha aberta → use <code>preco_un</code>.</li>
<li>Cabos: caminho × número de cabos × (1 + folga); canaleta e vala por metro de caminho.</li>
</ul>
`;

export function montarAjuda(el) {
  el.innerHTML = HTML;
  const a = el.querySelector('#ajCsv');
  a.href = URL.createObjectURL(new Blob([MODELO_CSV], { type: 'text/csv;charset=utf-8' }));
}
