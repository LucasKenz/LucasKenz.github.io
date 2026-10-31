// Os 14 subsistemas clicáveis da Parte 1. Os números vêm de data/gmt-data.json (caminhos "secao.chave").
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// pai: em qual grupo do modelo o subsistema vive (fixo, az = gira em azimute, el = gira em elevação, domo = gira com o domo)
// explode: deslocamento (m) do grupo na vista explodida
// ancora: posição do hotspot no referencial do pai
export const SUBS = [
  {
    id: 'm1', nome: 'Espelho primário (M1)', pai: 'el', ancora: V(0, 4.5, 6), explode: V(0, 9, 0),
    funcao: 'Sete espelhos de 8,4 m que funcionam como um único espelho parabólico de 25,4 m e juntam a luz das estrelas.',
    dados: [['Segmentos', 'optica.segmentos_m1'], ['Diâmetro de cada um', 'optica.diametro_segmento_m', 'm'], ['Abertura equivalente', 'optica.abertura_efetiva_m', 'm'], ['Área coletora', 'optica.area_coletora_m2', 'm²'], ['Razão focal', 'optica.razao_focal_m1'], ['Massa por segmento', 'optica.massa_segmento_t', 't'], ['Erro de superfície (S1)', 'optica.erro_superficie_nm_rms', 'nm rms']],
    previa: 'luz', legenda: 'A luz entra, reflete no M1, converge para o M2 e desce pelo furo central até o foco Gregoriano.',
    peca: 'segmento-m1-offaxis',
  },
  {
    id: 'celulas', nome: 'Células e óptica ativa', pai: 'el', ancora: V(-9, -1, -5), explode: V(0, 3, 0),
    funcao: 'Cada espelho apoia em 160 atuadores pneumáticos e 6 hardpoints que mantêm a forma e a posição do vidro em qualquer elevação.',
    dados: [['Atuadores por célula', 'celula_m1.atuadores_suporte'], ['Hardpoints por célula', 'celula_m1.hardpoints'], ['Controle térmico', 'celula_m1.controle_termico'], ['Teste', 'celula_m1.teste_optica_ativa']],
    previa: 'atuadores', legenda: 'Os atuadores empurram o fundo do favo de mel e corrigem a forma conforme o telescópio inclina.',
    peca: 'atuador-m1',
  },
  {
    id: 'capas', nome: 'Capas e cone defletor', pai: 'el', ancora: V(0, 5, 0), explode: V(0, 6, 0),
    funcao: 'Pétalas que fecham sobre os espelhos de dia e um cone central que bloqueia luz espúria.',
    dados: [['Escopo', 'montagem.contrato']],
    previa: 'capas', legenda: 'As pétalas giram nas dobradiças da borda da célula e cobrem a face aluminizada.',
    peca: 'capa-petala',
  },
  {
    id: 'asm', nome: 'Secundário adaptativo (ASM)', pai: 'el', ancora: V(0, 21, 0), explode: V(0, 16, 0),
    funcao: 'Sete cascas de vidro de 2 mm deformadas 2.000 vezes por segundo para desfazer a turbulência da atmosfera.',
    dados: [['Segmentos', 'asm.segmentos'], ['Diâmetro da casca', 'asm.diametro_casca_m', 'm'], ['Espessura', 'asm.espessura_casca_mm', 'mm'], ['Atuadores por segmento', 'asm.atuadores_por_segmento'], ['Atuadores no total', 'asm.atuadores_total'], ['Taxa de controle', 'asm.taxa_controle_hz', 'Hz'], ['Fabricante', 'asm.fabricante']],
    previa: 'asm', legenda: 'Frente de onda distorcida chega, a casca se deforma com a forma oposta e a frente sai plana.',
    peca: 'segmento-asm',
  },
  {
    id: 'torre', nome: 'Torre do secundário', pai: 'el', ancora: V(8, 12, 4), explode: V(0, 12, 0),
    funcao: 'Treliça de seis pernas que segura o secundário 20 m acima do primário: precisa ser rígida contra o vento e fina para não fazer sombra.',
    dados: [['Frequência natural', 'montagem.frequencia_natural_hz', 'Hz'], ['Amortecimento', 'montagem.amortecimento_estrutural']],
    previa: 'vibracao', legenda: 'Uma rajada empurra a torre, o M2 oscila e a estrela "treme" na imagem (jitter).',
    peca: 'perna-torre',
  },
  {
    id: 'montagem', nome: 'Montagem de elevação (C-rings e OSS)', pai: 'el', ancora: V(7.5, -8, 0), explode: V(0, 0, 0),
    funcao: 'Dois arcos de 19 m rolam sobre berços hidrostáticos e inclinam o conjunto óptico de 25° a 90°.',
    dados: [['Tipo', 'montagem.tipo'], ['Massa com espelhos', 'montagem.massa_com_espelhos_t', 't'], ['Estrutura mecânica', 'montagem.massa_estrutura_mecanica_t', 't'], ['Aço estrutural', 'montagem.aco_estrutural_t', 't'], ['Altura', 'montagem.altura_m', 'm'], ['Faixa de elevação', 'montagem.limite_elevacao_graus', '°'], ['Contrato', 'montagem.contrato']],
    previa: 'elevacao', legenda: 'O C-ring rola sobre as sapatas do berço: o centro de giro fica no eixo de elevação.',
    peca: 'c-ring',
  },
  {
    id: 'azimute', nome: 'Azimute (trilho e mancais)', pai: 'az', ancora: V(10, 14, 0), explode: V(0, -4, 0),
    funcao: 'O telescópio inteiro gira sobre um anel de 21,5 m, flutuando em filme de óleo de 50 µm e movido por motores lineares.',
    dados: [['Diâmetro do trilho', 'montagem.trilho_azimute_diametro_m', 'm'], ['Massa do trilho', 'montagem.trilho_azimute_massa_t', 't'], ['Largura', 'montagem.trilho_azimute_largura_m', 'm'], ['Segmentos', 'montagem.trilho_azimute_segmentos'], ['Planicidade', 'montagem.planicidade_trilho_um', 'µm'], ['Filme de óleo', 'montagem.filme_oleo_mancal_um', 'µm'], ['Sismo', 'montagem.amortecimento_sismico']],
    previa: 'oleo', legenda: 'O óleo sob pressão levanta a sapata alguns mícrons: o atrito quase desaparece.',
    peca: 'trilho-azimute',
  },
  {
    id: 'instrumentos', nome: 'Instrumentos científicos', pai: 'el', ancora: V(0, -8.5, -3), explode: V(0, -7, 0),
    funcao: 'Câmeras e espectrógrafos no rotador Gregoriano (GIR) e na estação de gravidade invariante (G-CLEF).',
    dados: [['Estações', 'montagem.estacoes_instrumentos'], ['Campo de visão', 'optica.campo_de_visao_arcmin', '′'], ['Faixa espectral', 'optica.faixa_espectral_um', 'µm'], ['Razão focal Gregoriana', 'optica.razao_focal_gregoriana'], ['Escala focal', 'optica.escala_focal_arcsec_mm', '″/mm']],
    previa: 'gir', legenda: 'O campo do céu gira ao longo da noite; o GIR gira os instrumentos na direção oposta.',
    peca: 'gir',
  },
  {
    id: 'lgs', nome: 'Lasers de estrela-guia (LGS)', pai: 'el', ancora: V(-12, 3, 8), explode: V(0, 4, 0),
    funcao: 'Seis lasers de 589 nm acendem o sódio da mesosfera a 90 km e criam estrelas artificiais para a óptica adaptativa.',
    dados: [['Lasers', 'lgs.lasers'], ['Comprimento de onda', 'lgs.comprimento_onda_nm', 'nm'], ['Camada de sódio', 'lgs.altura_camada_sodio_km', 'km'], ['Asterismo', 'lgs.asterismo_arcmin', '′'], ['Potência por laser', 'lgs.potencia_por_laser_W', 'W'], ['Projeto', 'lgs.projetista']],
    previa: 'lgs', legenda: 'O feixe sobe 90 km, excita o sódio e o brilho volta ao telescópio como uma estrela de referência.',
    peca: 'lancador-lgs',
  },
  {
    id: 'pier', nome: 'Pier e isolamento sísmico', pai: 'fixo', ancora: V(0, 5, 11.5), explode: V(0, -10, 0),
    funcao: 'Coluna de concreto de 22 m sobre 24 pêndulos de atrito, separada do domo para não receber vibração do vento.',
    dados: [['Diâmetro', 'pier.diametro_m', 'm'], ['Altura', 'pier.altura_m', 'm'], ['Isolamento', 'pier.isolamento_sismico'], ['Parede', 'pier.espessura_parede_m', 'm'], ['Taxa de armadura', 'pier.taxa_armadura_kg_m3', 'kg/m³'], ['Sismicidade', 'local.sismicidade']],
    previa: 'sismo', legenda: 'O chão sacode, mas o pier desliza sobre os pêndulos e o telescópio quase não se move.',
    peca: 'isolador',
  },
  {
    id: 'domo', nome: 'Enclosure (domo giratório)', pai: 'domo', ancora: V(-22, 50, -14), explode: V(0, 30, 0),
    funcao: 'Prédio de 65 m que gira inteiro (~5.660 t) sobre 33 pares de bogies para acompanhar o telescópio.',
    dados: [['Altura total', 'enclosure.altura_total_m', 'm'], ['Diâmetro', 'enclosure.diametro_superior_m', 'm'], ['Parte fixa', 'enclosure.altura_inferior_fixa_m', 'm'], ['Parte giratória', 'enclosure.altura_superior_rotativa_m', 'm'], ['Massa giratória', 'enclosure.massa_rotativa_t', 't'], ['Bogies', 'enclosure.bogies_rotacao'], ['Uma volta', 'enclosure.tempo_volta_min', 'min'], ['Trilhos (raios)', 'enclosure.trilho_raios_m', 'm'], ['Ponte rolante', 'enclosure.ponte_rolante_t', 't'], ['Projeto', 'enclosure.projetista']],
    previa: 'domo', legenda: 'O domo gira sobre o trilho duplo e a fenda acompanha o telescópio.',
    peca: 'bogie-rotacao',
  },
  {
    id: 'portas', nome: 'Portas (shutters)', pai: 'domo', ancora: V(10, 45, 28), explode: V(0, 30, 10),
    funcao: 'Duas portas em "L" que abrem a fenda de 27 m girando para lados opostos.',
    dados: [['Tipo', 'enclosure.portas_tipo'], ['Altura', 'enclosure.portas_altura_m', 'm'], ['Vãos', 'enclosure.portas_vao_m', 'm'], ['Massa das duas', 'enclosure.portas_massa_total_t', 't'], ['Bogies', 'enclosure.portas_bogies']],
    previa: 'portas', legenda: 'As portas correm pelos trilhos da base e do teto e abrem a fenda de observação.',
    peca: 'porta-shutter',
  },
  {
    id: 'ventilacao', nome: 'Respiros e para-vento', pai: 'domo', ancora: V(-28, 30, 8), explode: V(0, 30, 0),
    funcao: 'Mais de 300 persianas lavam o ar quente do domo; o para-vento sobe na fenda para proteger o telescópio de vento forte.',
    dados: [['Respiros', 'enclosure.respiros'], ['Para-vento', 'enclosure.para_vento'], ['Estudo', 'vento.cfd_impacto'], ['Limite de operação', 'vento.limite_operacional_gmt_m_s', 'm/s']],
    previa: 'ventilacao', legenda: 'Com respiros abertos o vento atravessa o domo e leva embora o ar mais quente.',
    peca: 'respiro',
  },
  {
    id: 'apoio', nome: 'Instalações do cume', pai: 'fixo', ancora: V(-10, 14, -80), explode: V(0, 0, 0),
    funcao: 'Prédio de apoio (aluminização dos espelhos), utilidades, tanque de água e torres meteorológicas.',
    dados: [['Local', 'local.nome'], ['Altitude', 'local.altitude_m', 'm'], ['Temperatura (extremos)', 'local.temperatura_extremos_C', '°C'], ['Umidade mediana', 'local.umidade_relativa_mediana_pct', '%'], ['Noites fotométricas', 'local.fracao_fotometrica'], ['Vida útil', 'enclosure.vida_util_anos', 'anos'], ['Custo estimado', 'projeto.custo_estimado_usd', 'US$'], ['Parceiros', 'projeto.parceiros']],
    previa: 'cume', legenda: 'O espelho sai da célula, desce pelo alçapão e vai ao prédio de apoio para ser realuminizado.',
    peca: 'ssb',
  },
];

export const SUB = Object.fromEntries(SUBS.map((s) => [s.id, s]));

/** Subsistema de cada tipo de peça. */
export function sisDaPeca(p) {
  const especiais = {
    'porta-shutter': 'portas', 'bogie-porta': 'portas', respiro: 'ventilacao', 'para-vento': 'ventilacao',
    'mancal-hidrostatico': 'azimute', 'amortecedor-eds': 'azimute', 'motor-azimute': 'azimute', 'disco-azimute': 'azimute', 'trilho-azimute': 'azimute',
    'berco-c-ring': 'montagem', 'plataforma-instrumento': 'instrumentos', gclef: 'instrumentos', escada: 'montagem', patamar: 'montagem', passarela: 'domo',
    fundacao: 'pier', isolador: 'pier', pier: 'pier', 'laje-terrea': 'domo', 'parede-inferior': 'domo', 'piso-observacao': 'domo',
    'atuador-m1': 'celulas', hardpoint: 'celulas', ventilador: 'celulas', 'hexapode-m2': 'asm',
  };
  if (especiais[p.id]) return especiais[p.id];
  return { enclosure: 'domo', plataformas: 'montagem' }[p.sub] ?? p.sub;
}
