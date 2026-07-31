const canvas = document.querySelector('#mapCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.querySelector('#viewport');
const stage = document.querySelector('#stage');
const $ = (selector) => document.querySelector(selector);
document.addEventListener('contextmenu', (event) => event.preventDefault());

let progressDepth = 0;
function showTaskProgress(label, percent = 0) {
  progressDepth++;
  updateTaskProgress(label, percent);
  $('#taskProgress').hidden = false;
}
function updateTaskProgress(label, percent) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  $('#taskProgressLabel').textContent = label;
  $('#taskProgressPercent').textContent = `${value}%`;
  $('#taskProgressBar').value = value;
}
function hideTaskProgress() {
  progressDepth = Math.max(0, progressDepth - 1);
  if (!progressDepth) $('#taskProgress').hidden = true;
}
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const bundledIconFiles = ["anchor_1.png", "anchor_2.png", "architecture_1.png", "beacon_1.png", "book_1.png", "bridge_1.png", "bridge_2.png", "bush_1.png", "bush_2.png", "cactus_1.png", "cactus_2.png", "camp_1.png", "camp_2.png", "camp_3.png", "camp_4.png", "castle.png", "castle_2.png", "castle_3.png", "castle_4.png", "castle_8.png", "cave_1.png", "cave_2.png", "cave_3.png", "chest.png", "chest_1.png", "church_1.png", "church_2.png", "coins_1.png", "crystal_1.png", "farm_1.png", "farm_2.png", "farm_3.png", "farm_4.png", "farms_1.png", "flag_1.png", "fortress_1.png", "fountain_1.png", "gate_1.png", "graveyard_1.png", "hot_springs_1.png", "house_1.png", "house_2.png", "house_3.png", "house_4.png", "house_5.png", "house_6.png", "house_7.png", "house_8.png", "island_1.png", "kraken_1.png", "log_1.png", "mannor_1.png", "map_1.png", "market_1.png", "mill_1.png", "mine_1.png", "mine_2.png", "mine_3.png", "monastery_1.png", "monastery_2.png", "monolith_1.png", "monolith_2.png", "mountain_2.png", "mountain_3.png", "mountain_4.png", "mountain_5.png", "mountain_8.png", "mountain_9.png", "port_1.png", "portal_1.png", "portal_2.png", "pound_1.png", "pound_2.png", "rocks_1.png", "rocks_2.png", "rocks_3.png", "rocks_4.png", "rocks_5.png", "rocks_6.png", "rocks_7.png", "rocks_8.png", "rocks_9.png", "rune_1.png", "rune_2.png", "ship_1.png", "shipwreck_1.png", "shop_1.png", "shop_2.png", "sign_1.png", "skulls_1.png", "small_castle_1.png", "stadium_1.png", "statue_1.png", "swamp.png", "tower_1.png", "tower_2.png", "tower_3.png", "tower_4.png", "tower_5.png", "tower_6.png", "tree_1.png", "tree_10.png", "tree_2.png", "tree_3.png", "tree_4.png", "tree_5.png", "tree_6.png", "tree_7.png", "tree_8.png", "tree_9.png", "village_1.png", "village_2.png", "vulcano_1.png", "waterfall_1.png", "well_1.png", "windmill_1.png", "windmill_2.png", "windmill_3.png", "windmill_4.png"];

const state = {
  layers: [],
  selectedId: null,
  zoom: 0.7,
  x: 0,
  y: 0,
  drag: false,
  lastX: 0,
  lastY: 0,
  generationToken: 0,
  imageSets: Object.entries(bundledIconFiles.reduce((groups, fileName) => {
      const name = fileName.replace(/_\d+(?=\.png$)/, '').replace(/\.png$/, '');
      (groups[name] ||= []).push(fileName);
      return groups;
    }, {}))
    .map(([name, fileNames]) => ({
      id: `preset-${name}`,
      name: name.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      bundled: true,
      assets: fileNames.map((fileName) => {
        const image = new Image();
        image.src = window.BUNDLED_ICON_DATA?.[fileName] || `Assets/Icons/${fileName}`;
        return { file: { name: fileName }, image, anchorX: 0.5, anchorY: 0.5 };
      }),
    })),
  contextLayerId: null,
  placingObject: false,
  poiTypes: [
    { id: 'vila', name: 'Vila', color: '#f0c674' },
    { id: 'cidade', name: 'Cidade', color: '#7fdbff' },
    { id: 'outro', name: 'Outro', color: '#f1f3ef' },
  ],
  maskEditing: null,
  language: localStorage.getItem('teralium-language') || 'pt-BR',
  pathPresets: [{ id: 'road', name: 'Estrada', stroke: 8, color: '#c99b57', dashed: false, dashGap: 12 }],
  regionPresets: [{ id: 'regions', name: 'Regiões', color: '#6fa86b', fillMode: 'fill', outlineThickness: 3, outlineDashed: false, outlineGap: 12, defaultOverview: false }],
  drawingPath: false,
  distanceScaleKm: 100,
  travelSpeeds: { walking: 5, horse: 15, ship: 30, air: 80 },
  descriptionTemplates: [],
  editingDescriptionTemplateId: null,
  terrainHeightEditing: null,
  terrainColors: { shallow: '#51746f', medium: '#4b6c6a', deep: '#405a5b', land: '#d7c89d', coastLand: '#65483b', coastWave: '#91c9cf', coastLandThickness: 3, coastWaveThickness: 2, coastVariation: true, coastNoiseMultiplier: 0.6 },
  terrainBrushImage: null,
  terrainBrushMode: 'hard',
  terrainBrushRotation: 0,
  terrainBrushRepetition: 100,
  mapFilter: 'linear',
  maskChunkSize: 512,
  debugChunkGrid: false,
  projectFileHandle: null,
  theme: localStorage.getItem('atlasmith-theme') || 'atlasmith',
  activeMapTool: 'select',
  movingLayer: false,
};

const translations = {
  'pt-BR': { open: 'Abrir projeto', save: 'Salvar projeto', export: 'Exportar projeto', exportMap: 'Exportar mapa', layers: 'CAMADAS', inspector: 'INSPECTOR', uploadMask: 'Enviar máscara', uploadImage: 'Enviar imagem', createMask: '✦ Criar máscara', editMask: '✦ Editar máscara', generate: 'Gerar preenchimento', rename: 'Renomear', hide: 'Ocultar', show: 'Exibir', delete: 'Excluir camada', ready: 'Pronto', language: 'Language:' },
  en: { open: 'Open project', save: 'Save project', export: 'Export project', exportMap: 'Export map', layers: 'LAYERS', inspector: 'INSPECTOR', uploadMask: 'Upload mask', uploadImage: 'Upload image', createMask: '✦ Create mask', editMask: '✦ Edit mask', generate: 'Generate fill', rename: 'Rename', hide: 'Hide', show: 'Show', delete: 'Delete layer', ready: 'Ready', language: 'Language:' },
  ja: { open: 'プロジェクトを開く', save: 'プロジェクトを保存', export: 'プロジェクトを書き出す', exportMap: 'マップを書き出す', layers: 'レイヤー', inspector: 'インスペクター', uploadMask: 'マスクをアップロード', uploadImage: '画像をアップロード', createMask: '✦ マスクを作成', editMask: '✦ マスクを編集', generate: '塗りつぶしを生成', rename: '名前を変更', hide: '非表示', show: '表示', delete: 'レイヤーを削除', ready: '準備完了', language: 'Language:' },
};

const phraseTranslations = {
  en: {
    'CAMADAS': 'LAYERS', 'INSPECTOR': 'INSPECTOR', 'PRÓXIMOS TIPOS': 'COMING SOON', 'Pontos de interesse': 'Points of interest', 'Estradas': 'Roads',
    'Navegação': 'Navigation', 'Arraste o mapa para mover. Use a roda do mouse para aplicar zoom.': 'Drag the map to pan. Use the mouse wheel to zoom.', 'Seu mapa começa aqui': 'Your map starts here',
    'Envie uma máscara no inspector para criar a primeira camada.': 'Upload a mask in the inspector to create the first layer.', 'Ajustar': 'Fit', 'Terreno': 'Terrain', 'Imagem': 'Image', 'Objeto': 'Object', 'Região': 'Region',
    'Preview e ponto âncora do terreno': 'Terrain preview and anchor point', 'Selecione uma imagem do mestre': 'Select a master image', 'Enviar máscara': 'Upload mask', 'PNG com transparência recomendado': 'Transparent PNG recommended',
    'Nenhuma máscara selecionada': 'No mask selected', '✦ Criar máscara': '✦ Create mask', '✦ Editar máscara': '✦ Edit mask', 'Imagens do mestre': 'Master images', '＋ Adicionar imagens': '＋ Add images',
    'Adicione árvores, pedras ou qualquer elemento que queira distribuir.': 'Add trees, rocks, or any element you want to distribute.', 'Intensidade': 'Intensity', 'Tamanho geral': 'General size', 'Variação de tamanho': 'Size variation',
    'Intervalo': 'Range', 'Mín.': 'Min.', 'Máx.': 'Max.', 'Rotação aleatória': 'Random rotation', 'Mirror aleatório': 'Random mirror', 'Slice na máscara': 'Clip to mask', 'Gerar preenchimento': 'Generate fill',
    'Preview e ponto âncora': 'Preview and anchor point', 'Selecione um ícone': 'Select an icon', 'Nome': 'Name', 'Tipo': 'Type', 'Ícone': 'Icon', 'Selecione um conjunto': 'Select a set', 'Galeria': 'Gallery', 'Sem galeria': 'No gallery',
    '＋ Gerenciar conjuntos': '＋ Manage sets', 'Descrição': 'Description', 'Criar como ponto de interesse': 'Create as point of interest', 'Opacidade': 'Opacity', '⌖ Posicionar no mapa': '⌖ Position on map', 'Ainda não posicionado': 'Not positioned yet',
    'Layer / tipo de região': 'Region layer / type', 'Nome da região': 'Region name', 'Cor': 'Color', 'Regiões desenhadas por último removem automaticamente as intersecções das regiões anteriores.': 'Regions drawn last automatically remove intersections from earlier regions.',
    'A seed mantém o resultado reproduzível.': 'The seed keeps the result reproducible.', 'Arraste a camada para definir sua prioridade.': 'Drag the layer to set its priority.', 'BIBLIOTECA': 'LIBRARY', 'Conjuntos de imagens': 'Image sets',
    'Reutilize o mesmo conjunto de imagens em diferentes camadas.': 'Reuse the same image set across different layers.', 'Novo conjunto': 'New set', 'Nenhuma imagem selecionada': 'No image selected', 'Criar conjunto': 'Create set',
    'Renomear': 'Rename', 'Ocultar': 'Hide', 'Exibir': 'Show', 'Excluir camada': 'Delete layer', 'Brush': 'Brush', 'Offset X': 'X offset', 'Offset Y': 'Y offset', 'Seed': 'Seed', 'Selecionar imagens': 'Select images',
    'Nome do local': 'Location name', 'História, detalhes e informações do local...': 'History, details, and location information...', 'Ex.: Fronteiras políticas': 'E.g. Political borders', 'Ex.: Reino do Norte': 'E.g. Northern Kingdom', 'Ex.: Árvores de pinheiro': 'E.g. Pine trees', 'Âncora': 'Anchor', 'Caminhos': 'Paths', 'Caminho': 'Path', 'Nome do caminho': 'Path name', 'Descrição do caminho...': 'Path description...', 'Mostrar no mapa': 'Show on map', 'Preset visual': 'Visual preset', 'Nome do preset': 'Preset name', 'Stroke': 'Stroke', 'Tracejado / pontilhado': 'Dashed / dotted', 'Espaço do tracejado': 'Dash spacing', 'Salvar como preset': 'Save as preset', 'Excluir preset': 'Delete preset', '〰 Desenhar caminho': '〰 Draw path', 'Distância: 0 km': 'Distance: 0 km', 'Folder': 'Folder', 'PROJETO': 'PROJECT', 'Configurações': 'Settings', 'Escala do mapa': 'Map scale', 'equivalem a': 'equals', 'Nome do tipo de região': 'Region type name', 'Mostrar por padrão no overview': 'Show by default in overview', 'Salvar preset de região': 'Save region preset', 'Preenchimento': 'Rendering', 'Thickness do outline': 'Outline thickness', 'Outline tracejado': 'Dashed outline', 'Velocidades médias': 'Average speeds', 'A pé': 'Walking', 'A cavalo': 'Horseback', 'De navio': 'By ship', 'De aeroplano / balão': 'By airplane / balloon',
  },
  ja: {
    'CAMADAS': 'レイヤー', 'INSPECTOR': 'インスペクター', 'PRÓXIMOS TIPOS': '近日追加', 'Pontos de interesse': '地点', 'Estradas': '道路', 'Navegação': 'ナビゲーション',
    'Arraste o mapa para mover. Use a roda do mouse para aplicar zoom.': 'ドラッグで移動、マウスホイールでズームします。', 'Seu mapa começa aqui': 'ここからマップを作成', 'Envie uma máscara no inspector para criar a primeira camada.': '最初のレイヤーを作るにはマスクをアップロードしてください。',
    'Ajustar': '全体表示', 'Terreno': '地形', 'Imagem': '画像', 'Objeto': 'オブジェクト', 'Região': '地域', 'Preview e ponto âncora do terreno': '地形プレビューとアンカー', 'Selecione uma imagem do mestre': 'マスター画像を選択',
    'Enviar máscara': 'マスクをアップロード', 'PNG com transparência recomendado': '透過PNG推奨', 'Nenhuma máscara selecionada': 'マスク未選択', '✦ Criar máscara': '✦ マスクを作成', '✦ Editar máscara': '✦ マスクを編集',
    'Imagens do mestre': 'マスター画像', '＋ Adicionar imagens': '＋ 画像を追加', 'Adicione árvores, pedras ou qualquer elemento que queira distribuir.': '配置する木、岩、その他の要素を追加します。', 'Intensidade': '密度', 'Tamanho geral': '全体サイズ',
    'Variação de tamanho': 'サイズのばらつき', 'Intervalo': '範囲', 'Mín.': '最小', 'Máx.': '最大', 'Rotação aleatória': 'ランダム回転', 'Mirror aleatório': 'ランダム反転', 'Slice na máscara': 'マスクで切り抜く', 'Gerar preenchimento': '配置を生成',
    'Preview e ponto âncora': 'プレビューとアンカー', 'Selecione um ícone': 'アイコンを選択', 'Nome': '名前', 'Tipo': '種類', 'Ícone': 'アイコン', 'Selecione um conjunto': 'セットを選択', 'Galeria': 'ギャラリー', 'Sem galeria': 'ギャラリーなし',
    '＋ Gerenciar conjuntos': '＋ セットを管理', 'Descrição': '説明', 'Criar como ponto de interesse': '地点として作成', 'Opacidade': '不透明度', '⌖ Posicionar no mapa': '⌖ マップに配置', 'Ainda não posicionado': '未配置',
    'Layer / tipo de região': '地域レイヤー / 種類', 'Nome da região': '地域名', 'Cor': '色', 'Regiões desenhadas por último removem automaticamente as intersecções das regiões anteriores.': '後から描いた地域は以前の地域との重なりを自動的に削除します。',
    'A seed mantém o resultado reproduzível.': 'シードにより結果を再現できます。', 'Arraste a camada para definir sua prioridade.': 'レイヤーをドラッグして優先順位を設定します。', 'BIBLIOTECA': 'ライブラリ', 'Conjuntos de imagens': '画像セット',
    'Reutilize o mesmo conjunto de imagens em diferentes camadas.': '同じ画像セットを複数のレイヤーで再利用できます。', 'Novo conjunto': '新規セット', 'Nenhuma imagem selecionada': '画像未選択', 'Criar conjunto': 'セットを作成',
    'Renomear': '名前を変更', 'Ocultar': '非表示', 'Exibir': '表示', 'Excluir camada': 'レイヤーを削除', 'Brush': 'ブラシ', 'Offset X': 'Xオフセット', 'Offset Y': 'Yオフセット', 'Seed': 'シード', 'Selecionar imagens': '画像を選択',
    'Nome do local': '場所の名前', 'História, detalhes e informações do local...': '場所の歴史、詳細、情報...', 'Ex.: Fronteiras políticas': '例：政治的国境', 'Ex.: Reino do Norte': '例：北の王国', 'Ex.: Árvores de pinheiro': '例：松の木', 'Âncora': 'アンカー', 'Caminhos': '道', 'Caminho': '道', 'Nome do caminho': '道の名前', 'Descrição do caminho...': '道の説明...', 'Mostrar no mapa': 'マップに表示', 'Preset visual': '表示プリセット', 'Nome do preset': 'プリセット名', 'Stroke': '線幅', 'Tracejado / pontilhado': '破線 / 点線', 'Espaço do tracejado': '破線間隔', 'Salvar como preset': 'プリセットとして保存', 'Excluir preset': 'プリセットを削除', '〰 Desenhar caminho': '〰 道を描く', 'Distância: 0 km': '距離: 0 km', 'Folder': 'フォルダー', 'PROJETO': 'プロジェクト', 'Configurações': '設定', 'Escala do mapa': 'マップ縮尺', 'equivalem a': '相当', 'Nome do tipo de região': '地域タイプ名', 'Mostrar por padrão no overview': '概要に既定表示', 'Salvar preset de região': '地域プリセットを保存', 'Preenchimento': '描画方式', 'Thickness do outline': 'アウトライン幅', 'Outline tracejado': '破線アウトライン', 'Velocidades médias': '平均速度', 'A pé': '徒歩', 'A cavalo': '馬', 'De navio': '船', 'De aeroplano / balão': '飛行機 / 気球',
  },
};

const originalNodeText = new WeakMap();
Object.assign(phraseTranslations.en, {
  File: 'File', Manage: 'Manage', Abrir: 'Open', Salvar: 'Save', 'Salvar como': 'Save as', 'Exportar como PNG': 'Export as PNG', 'Exportar projeto completo': 'Export full project', 'Exportar mapa': 'Export map',
  'Tipos de objeto': 'Object types', 'Conjuntos de imagens': 'Image sets', Mapa: 'Map', Largura: 'Width', Altura: 'Height', 'Filtro de imagens': 'Image filter', Linear: 'Linear', 'Mais próximo (pixel)': 'Nearest (pixel)', 'Aplicar tamanho': 'Apply size',
  'Configurações de terreno': 'Terrain settings', 'Cores de altura do terreno': 'Terrain height colors', 'Água rasa': 'Shallow water', 'Água média': 'Medium water', 'Água profunda': 'Deep water', 'Nível da terra': 'Land level', 'Ondas costeiras': 'Coastal waves',
  'Ground / base': 'Ground / base', 'Terrain sprites': 'Terrain sprites', 'Enviar máscara de ground/base': 'Upload ground/base mask', 'Imagem em preto e branco • branco = água, preto = terra': 'Black and white image • white = water, black = land',
  'Nenhuma máscara de ground/base': 'No ground/base mask', '▦ Editar ground/base': '▦ Edit ground/base', 'Distribuição padronizada': 'Standardized distribution', 'Pesquisar conjuntos...': 'Search sets...',
  'Nenhum conjunto encontrado.': 'No sets found.', 'Nenhum conjunto criado ainda.': 'No sets created yet.', 'Usar': 'Use', 'Editar': 'Edit', 'Novo conjunto': 'New set',
  'Criar uma região com esta máscara': 'Create a region from this mask', 'Região vinculada': 'Linked region', 'Selecione uma região criada': 'Select an existing region', 'Crie uma layer de região primeiro': 'Create a region layer first',
  'A região vinculada usará a máscara deste terreno no mapa exportado.': 'The linked region will use this terrain mask in the exported map.', 'Intermediário': 'Balanced',
  Aparência: 'Appearance', Idioma: 'Language', Tema: 'Theme', Claro: 'Light', 'Vinho e dourado': 'Wine and gold', 'Marrom e verde': 'Brown and green',
});
Object.assign(phraseTranslations.ja, {
  File: 'ファイル', Manage: '管理', Abrir: '開く', Salvar: '保存', 'Salvar como': '名前を付けて保存', 'Exportar como PNG': 'PNGとして書き出す', 'Exportar projeto completo': '完全なプロジェクトを書き出す', 'Exportar mapa': 'マップを書き出す',
  'Tipos de objeto': 'オブジェクトタイプ', 'Conjuntos de imagens': '画像セット', Mapa: 'マップ', Largura: '幅', Altura: '高さ', 'Filtro de imagens': '画像フィルター', Linear: 'リニア', 'Mais próximo (pixel)': '最近傍（ピクセル）', 'Aplicar tamanho': 'サイズを適用',
  'Configurações de terreno': '地形設定', 'Cores de altura do terreno': '地形高さの色', 'Água rasa': '浅瀬', 'Água média': '中層水', 'Água profunda': '深海', 'Nível da terra': '陸地レベル', 'Ondas costeiras': '沿岸の波',
  'Ground / base': 'グラウンド / ベース', 'Terrain sprites': '地形スプライト', 'Enviar máscara de ground/base': 'グラウンド / ベースマスクをアップロード', 'Imagem em preto e branco • branco = água, preto = terra': '白黒画像 • 白 = 水、黒 = 陸地',
  'Nenhuma máscara de ground/base': 'グラウンド / ベースマスクなし', '▦ Editar ground/base': '▦ グラウンド / ベースを編集', 'Distribuição padronizada': '均等配置', 'Pesquisar conjuntos...': 'セットを検索...',
  'Nenhum conjunto encontrado.': 'セットが見つかりません。', 'Nenhum conjunto criado ainda.': 'セットはまだありません。', 'Usar': '使用', 'Editar': '編集', 'Novo conjunto': '新規セット',
  'Criar uma região com esta máscara': 'このマスクから地域を作成', 'Região vinculada': 'リンクする地域', 'Selecione uma região criada': '既存の地域を選択', 'Crie uma layer de região primeiro': '先に地域レイヤーを作成してください',
  'A região vinculada usará a máscara deste terreno no mapa exportado.': 'リンクした地域は、書き出したマップでこの地形マスクを使用します。', 'Intermediário': '中間',
  Aparência: '外観', Idioma: '言語', Tema: 'テーマ', Claro: 'ライト', 'Vinho e dourado': 'ワインとゴールド', 'Marrom e verde': 'ブラウンとグリーン',
});
function translateDocument(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue.trim()) continue;
    if (!originalNodeText.has(node)) originalNodeText.set(node, node.nodeValue.trim());
    const original = originalNodeText.get(node);
    const translated = state.language === 'pt-BR' ? original : phraseTranslations[state.language]?.[original] || original;
    const leading = node.nodeValue.match(/^\s*/)[0];
    const trailing = node.nodeValue.match(/\s*$/)[0];
    node.nodeValue = `${leading}${translated}${trailing}`;
  }
  document.querySelectorAll('[placeholder]').forEach((element) => {
    element.dataset.originalPlaceholder ||= element.placeholder;
    element.placeholder = state.language === 'pt-BR' ? element.dataset.originalPlaceholder : phraseTranslations[state.language]?.[element.dataset.originalPlaceholder] || element.dataset.originalPlaceholder;
  });
}

function t(key) { return translations[state.language]?.[key] || translations['pt-BR'][key] || key; }

document.querySelectorAll('.app-menu-trigger').forEach((trigger) => {
  trigger.onclick = (event) => {
    event.stopPropagation();
    const dropdown = trigger.nextElementSibling;
    document.querySelectorAll('.app-menu-dropdown').forEach((menu) => { if (menu !== dropdown) menu.hidden = true; });
    dropdown.hidden = !dropdown.hidden;
    trigger.classList.toggle('active', !dropdown.hidden);
  };
});
document.addEventListener('click', (event) => {
  if (event.target.closest('.app-menu')) return;
  document.querySelectorAll('.app-menu-dropdown').forEach((menu) => { menu.hidden = true; menu.previousElementSibling.classList.remove('active'); });
});
const closeAppMenus = () => document.querySelectorAll('.app-menu-dropdown').forEach((menu) => { menu.hidden = true; menu.previousElementSibling.classList.remove('active'); });
$('#menuManagePoiTypes').onclick = () => { closeAppMenus(); $('#managePoiTypes').click(); };
$('#menuManageSets').onclick = () => { closeAppMenus(); $('#manageObjectSets').click(); };
$('#menuManageMap').onclick = () => { closeAppMenus(); openMapSettings(); };
$('#menuImportSets').onclick = () => { closeAppMenus(); $('#setPackageInput').click(); };
$('#menuExportSets').onclick = () => { closeAppMenus(); openExportSetsModal(); };
$('#menuExportProject').onclick = () => { closeAppMenus(); $('#exportBtn').click(); };
$('#menuExportMap').onclick = () => { closeAppMenus(); $('#exportMapBtn').click(); };
$('#menuExportLore').onclick = () => { closeAppMenus(); openExportLoreModal(); };
$('#menuExportPng').onclick = async () => {
  closeAppMenus(); showTaskProgress('Mesclando chunks e exportando PNG', 0);
  try { redraw(true, false); await nextFrame(); updateTaskProgress('Codificando PNG final', 55); downloadFile('mapa-render-final.png', await canvasChunkBlob(canvas), 'image/png'); updateTaskProgress('PNG exportado', 100); }
  finally { redraw(); hideTaskProgress(); }
};
$('#menuOpenProject').onclick = async () => {
  closeAppMenus();
  if (!window.showOpenFilePicker) { $('#openProjectBtn').click(); return; }
  try {
    const [handle] = await window.showOpenFilePicker({ types: [{ description: 'Projeto Teralium', accept: { 'application/json': ['.json', '.teralium'], 'application/zip': ['.zip'] } }] });
    const file = await handle.getFile();
    state.projectFileHandle = file.name.toLowerCase().endsWith('.zip') ? null : handle;
    const transfer = new DataTransfer(); transfer.items.add(file); $('#projectInput').files = transfer.files; $('#projectInput').dispatchEvent(new Event('change'));
  } catch (error) { if (error.name !== 'AbortError') window.alert(`Não foi possível abrir: ${error.message}`); }
};
async function saveProjectToHandle(saveAs = false) {
  showTaskProgress('Salvando projeto', 0);
  try {
    let handle = saveAs ? null : state.projectFileHandle;
    if (!handle && window.showSaveFilePicker) handle = await window.showSaveFilePicker({ suggestedName: 'projeto-teralium.json', types: [{ description: 'Projeto Teralium', accept: { 'application/json': ['.json', '.teralium'] } }] });
    if (!handle) { $('#saveProjectBtn').click(); return; }
    await flushPendingMaskChunks('Codificando chunks do projeto'); updateTaskProgress('Serializando projeto', 35); await nextFrame();
    const writable = await handle.createWritable(); await writable.write(JSON.stringify(createProjectData())); updateTaskProgress('Gravando projeto', 80); await writable.close();
    state.projectFileHandle = handle; $('#saveState').textContent = 'Projeto salvo';
  } catch (error) { if (error.name !== 'AbortError') window.alert(`Não foi possível salvar: ${error.message}`); }
  finally { hideTaskProgress(); }
}
$('#menuSaveProject').onclick = () => { closeAppMenus(); saveProjectToHandle(false); };
$('#menuSaveAsProject').onclick = () => { closeAppMenus(); saveProjectToHandle(true); };

function applyLanguage(language) {
  state.language = translations[language] ? language : 'pt-BR';
  document.documentElement.lang = state.language;
  localStorage.setItem('teralium-language', state.language);
  $('#languageSelect').value = state.language;
  $('#openProjectBtn').textContent = t('open'); $('#saveProjectBtn').textContent = t('save');
  $('#exportBtn').textContent = t('export'); $('#exportMapBtn').textContent = t('exportMap');
  $('.layers-heading .panel-label').textContent = t('layers'); $('.inspector-head .panel-label').textContent = t('inspector');
  $('#generateBtn').textContent = t('generate');
  $('#layerContextMenu [data-action="rename"]').textContent = t('rename');
  $('#layerContextMenu [data-action="delete"]').textContent = t('delete');
  $('#layerContextMenu [data-action="duplicate"]').textContent = state.language === 'pt-BR' ? 'Duplicar camada' : state.language === 'ja' ? 'レイヤーを複製' : 'Duplicate layer';
  const layer = selectedLayer();
  if (layer) {
    $('#createMaskBtn').textContent = layer.mask ? t('editMask') : t('createMask');
    document.querySelector('.upload b').textContent = layer.type === 'image' ? t('uploadImage') : t('uploadMask');
    if (layer.type === 'terrain') renderTerrainAnchorPreview(layer);
    if (layer.type === 'object') renderObjectAnchorPreview(layer.object);
  }
  translateDocument();
}

function applyTheme(theme) {
  state.theme = ['atlasmith', 'light', 'wine', 'earth'].includes(theme) ? theme : 'atlasmith';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('atlasmith-theme', state.theme);
  $('#themeSetting').value = state.theme;
}

function createLayer(type = 'terrain') {
  const number = state.layers.length + 1;
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${number}`,
    type,
    name: type === 'image' ? `Imagem ${number}` : type === 'object' ? `Objeto ${number}` : type === 'region' ? `Região ${number}` : type === 'path' ? `Caminho ${number}` : type === 'folder' ? `Folder ${number}` : type === 'ground' ? 'Ground / base' : (number === 1 ? 'Cobertura vegetal' : `Terreno ${number}`),
    parentId: null,
    collapsed: false,
    visible: true,
    mask: null,
    maskName: '',
    maskPixels: null,
    maskPath: null,
    clip: null,
    bounds: null,
    assets: [],
    selectedAssetIndex: 0,
    image: null,
    object: type === 'object' ? { name: '', type: 'vila', iconSetId: '', selectedIconIndex: 0, gallerySetId: '', description: '', detailedTemplateId: '', descriptionPages: [], poi: true, x: null, y: null, scale: 1, opacity: 1, offsetX: 0, offsetY: 0, anchorX: 0.5, anchorY: 1 } : null,
    region: type === 'region' ? { group: 'Regiões', presetId: 'regions', name: `Região ${number}`, color: '#6fa86b', fillMode: 'fill', outlineThickness: 3, outlineDashed: false, outlineGap: 12, defaultOverview: false, drawnAt: 0 } : null,
    path: type === 'path' ? { name: `Caminho ${number}`, description: '', gallerySetId: '', showOnMap: true, presetId: 'road', points: [], distance: 0 } : null,
    output: document.createElement('canvas'),
    heightMap: null,
    heightOutput: document.createElement('canvas'),
    placements: [],
    settings: { density: 45, scale: 1, sizeVariation: true, sizeMin: 0.7, sizeMax: 1.3, seed: `Teralium-0${number}`, standardizedDistribution: false, rotation: true, mirror: true, slice: false, createRegion: false, regionLayerId: '', layerOffsetX: 0, layerOffsetY: 0, imageOffsetX: 0, imageOffsetY: 0, imageOpacity: 1 },
  };
}

function selectedLayer() {
  return state.layers.find((layer) => layer.id === state.selectedId);
}

function fileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => imageFromSource(reader.result).then(resolve, reject);
    reader.readAsDataURL(file);
  });
}

function imageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFactory(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function updateTransform() {
  stage.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.zoom})`;
  $('#zoomValue').value = `${Math.round(state.zoom * 100)}%`;
}

function fit() {
  const padding = 70;
  state.zoom = Math.min(
    (viewport.clientWidth - padding) / canvas.width,
    (viewport.clientHeight - padding) / canvas.height,
    0.9,
  );
  state.x = (viewport.clientWidth - canvas.width * state.zoom) / 2;
  state.y = (viewport.clientHeight - canvas.height * state.zoom) / 2;
  updateTransform();
}

function updateChunkDebugGrid() {
  stage.classList.toggle('chunk-debug', state.debugChunkGrid);
  stage.style.setProperty('--chunk-size', `${state.maskChunkSize}px`);
}

function redraw(includeObjects = true, showSelection = true, includePaths = true) {
  ctx.imageSmoothingEnabled = state.mapFilter !== 'nearest';
  ctx.imageSmoothingQuality = state.mapFilter === 'linear' ? 'high' : 'low';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Background images retain their explicit layer priority.
  for (const layer of [...state.layers].reverse()) {
    if (!layer.visible) continue;
    if (layer.type === 'image' && layer.image) {
      ctx.save();
      ctx.globalAlpha = layer.settings.imageOpacity;
      ctx.drawImage(layer.image, layer.settings.imageOffsetX + (layer.settings.layerOffsetX || 0), layer.settings.imageOffsetY + (layer.settings.layerOffsetY || 0), canvas.width, canvas.height);
      ctx.restore();
    }
  }
  for (const layer of [...state.layers].reverse()) if (layer.visible && ['ground', 'terrain'].includes(layer.type) && layer.heightOutput.width) ctx.drawImage(layer.heightOutput, layer.settings.layerOffsetX || 0, layer.settings.layerOffsetY || 0);

  // Every generated asset and placed object shares one Y-sorted scene, even
  // when the entries came from different layers.
  const depthEntries = [];
  state.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    if (state.terrainHeightEditing && layer.type === 'terrain') return;
    if (layer.type === 'terrain') {
      if (layer.placements?.length) {
        if (layer.settings.slice && layer.mask && !layer.maskPath) prepareMask(layer);
        layer.placements.forEach((placement) => depthEntries.push({ y: placement.y + (layer.settings.layerOffsetY || 0), layerIndex, layer, placement }));
      }
      else if (layer.output.width) depthEntries.push({ y: -Infinity, layerIndex, layer });
    }
    if (layer.type === 'object' && layer.object?.x !== null && (includeObjects || !layer.object.poi)) {
      depthEntries.push({ y: layer.object.y + (layer.object.offsetY ?? 0) + (layer.settings.layerOffsetY || 0), layerIndex, layer, object: layer.object });
    }
  });
  depthEntries.sort((first, second) => first.y - second.y || second.layerIndex - first.layerIndex);
  for (const entry of depthEntries) {
    if (entry.object) drawMapObject(entry.object, entry.layer);
    else if (entry.placement) drawTerrainPlacement(entry.layer, entry.placement, ctx);
    else ctx.drawImage(entry.layer.output, entry.layer.settings.layerOffsetX || 0, entry.layer.settings.layerOffsetY || 0);
  }
  if (includePaths) for (const layer of [...state.layers].reverse()) if (layer.visible && layer.type === 'path') drawPathLayer(layer);

  const selected = selectedLayer();
  if (showSelection && !state.maskEditing && selected) drawSelectedLayerHighlight(selected);

}

function drawSelectedLayerHighlight(layer) {
  const accent = '#b7df72';
  if (layer.mask) {
    const outline = document.createElement('canvas'); outline.width = canvas.width; outline.height = canvas.height;
    const outlineContext = outline.getContext('2d');
    for (const [x, y] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) outlineContext.drawImage(layer.mask, x, y, canvas.width, canvas.height);
    outlineContext.globalCompositeOperation = 'source-in'; outlineContext.fillStyle = accent; outlineContext.fillRect(0, 0, canvas.width, canvas.height);
    outlineContext.globalCompositeOperation = 'destination-out'; outlineContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
    const offsetX = layer.settings.layerOffsetX || 0, offsetY = layer.settings.layerOffsetY || 0;
    ctx.drawImage(outline, offsetX, offsetY);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.drawImage(layer.mask, offsetX, offsetY, canvas.width, canvas.height); ctx.restore();
  }
  if (layer.type === 'path' && layer.path.points.length) {
    const preset = pathPreset(layer); ctx.save(); ctx.translate(layer.settings.layerOffsetX || 0, layer.settings.layerOffsetY || 0); ctx.strokeStyle = accent; ctx.lineWidth = preset.stroke + 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    layer.path.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke(); ctx.restore(); drawPathLayer(layer);
  }
  if (layer.type === 'image' && layer.image) { ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(2 + layer.settings.imageOffsetX + (layer.settings.layerOffsetX || 0), 2 + layer.settings.imageOffsetY + (layer.settings.layerOffsetY || 0), canvas.width - 4, canvas.height - 4); ctx.restore(); }
  if (layer.type === 'object' && layer.object?.x !== null) {
    const icon = objectIconAsset(layer.object)?.image;
    if (icon) {
      const height = 48 * (layer.object.scale ?? 1), width = icon.naturalWidth / icon.naturalHeight * height;
      const x = layer.object.x + (layer.object.offsetX ?? 0) + (layer.settings.layerOffsetX || 0) - width * (layer.object.anchorX ?? 0.5);
      const y = layer.object.y + (layer.object.offsetY ?? 0) + (layer.settings.layerOffsetY || 0) - height * (layer.object.anchorY ?? 1);
      ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(x - 4, y - 4, width + 8, height + 8); ctx.restore();
    }
  }
}

function pathPreset(layer) {
  return state.pathPresets.find((preset) => preset.id === layer.path?.presetId) || state.pathPresets[0];
}

function drawPathLayer(layer) {
  if (!layer.path?.points.length) return;
  const preset = pathPreset(layer);
  ctx.save();
  ctx.translate(layer.settings.layerOffsetX || 0, layer.settings.layerOffsetY || 0);
  ctx.strokeStyle = preset.color;
  ctx.lineWidth = preset.stroke;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash(preset.dashed ? [preset.stroke * 2, preset.dashGap ?? preset.stroke * 1.5] : []);
  ctx.beginPath();
  layer.path.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke(); ctx.restore();
}

function calculatePathDistance(points) {
  const pixels = points.slice(1).reduce((distance, point, index) => distance + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  return pixels * state.distanceScaleKm / 100;
}

function formatTravelDuration(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0).replace('.', ',')}h`;
  return `${(hours / 24).toFixed(1).replace('.', ',')}d`;
}

function formatDistanceWithTravel(distance) {
  const kilometers = Math.max(0, Number(distance) || 0);
  return `${Math.round(kilometers)} km · 🚶 ${formatTravelDuration(kilometers / state.travelSpeeds.walking)} · 🐎 ${formatTravelDuration(kilometers / state.travelSpeeds.horse)} · ⛵ ${formatTravelDuration(kilometers / state.travelSpeeds.ship)} · ✈ ${formatTravelDuration(kilometers / state.travelSpeeds.air)}`;
}

function drawTerrainPlacement(layer, placement, context) {
  const assetEntry = layer.assets[placement.assetIndex];
  const asset = assetEntry?.image || placement.asset;
  if (!asset) return;
  const width = asset.naturalWidth * layer.settings.scale * placement.variation;
  const height = asset.naturalHeight * layer.settings.scale * placement.variation;
  context.save();
  context.translate(layer.settings.layerOffsetX || 0, layer.settings.layerOffsetY || 0);
  if (layer.settings.slice && layer.maskPath) context.clip(layer.maskPath);
  context.translate(placement.x, placement.y);
  context.rotate(placement.rotation);
  if (placement.mirrored) context.scale(-1, 1);
  context.drawImage(asset, -width * (assetEntry?.anchorX ?? 0.5), -height * (assetEntry?.anchorY ?? 0.5), width, height);
  context.restore();
}

function objectIconAsset(object) {
  const set = state.imageSets.find((item) => item.id === object?.iconSetId);
  const index = Math.max(0, Math.min(Number(object?.selectedIconIndex) || 0, (set?.assets.length || 1) - 1));
  return set?.assets[index];
}

function drawMapObject(object, layer = null) {
  const icon = objectIconAsset(object)?.image;
  if (!icon) return;
  const size = 48 * (object.scale ?? 1);
  const width = icon.naturalWidth / icon.naturalHeight * size;
  const x = object.x + (object.offsetX ?? 0) + (layer?.settings.layerOffsetX || 0);
  const y = object.y + (object.offsetY ?? 0) + (layer?.settings.layerOffsetY || 0);
  ctx.save();
  ctx.globalAlpha = object.opacity ?? 1;
  ctx.drawImage(icon, x - width * (object.anchorX ?? 0.5), y - size * (object.anchorY ?? 1), width, size);
  if (!object.poi || !object.name) { ctx.restore(); return; }
  const type = state.poiTypes.find((item) => item.id === object.type);
  ctx.font = '600 15px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#111';
  ctx.strokeText(object.name, x, y + 18);
  ctx.fillStyle = type?.color || '#fff';
  ctx.fillText(object.name, x, y + 18);
  ctx.restore();
}

function renderLayers() {
  const list = $('#layerList');
  list.replaceChildren();
  for (const layer of state.layers) {
    const button = document.createElement('button');
    button.className = `layer-card${layer.id === state.selectedId ? ' active' : ''}${layer.visible ? '' : ' is-hidden'}`;
    const layerMeta = layer.type === 'image' ? ['▧', 'Imagem'] : layer.type === 'object' ? ['⌖', 'Objeto'] : layer.type === 'region' ? ['◒', 'Região'] : layer.type === 'path' ? ['〰', 'Caminho'] : layer.type === 'folder' ? ['▰', 'Folder'] : layer.type === 'ground' ? ['▰', 'Ground / base'] : ['⌁', 'Terreno'];
    button.innerHTML = `<span class="layer-icon">${layerMeta[0]}</span><div><b></b><small>${layerMeta[1]}</small></div><span class="visibility" title="Alternar visibilidade">◉</span>`;
    button.draggable = true;
    button.dataset.layerId = layer.id;
    button.dataset.layerType = layer.type;
    button.title = layer.name;
    button.querySelector('b').textContent = layer.name;
    if (layer.type === 'folder') button.querySelector('.layer-icon').addEventListener('click', (event) => {
      event.stopPropagation(); layer.collapsed = !layer.collapsed; renderLayers();
    });
    button.addEventListener('click', () => selectLayer(layer.id));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      state.contextLayerId = layer.id;
      const menu = $('#layerContextMenu');
      menu.querySelector('[data-action="toggle"]').textContent = layer.visible ? t('hide') : t('show');
      menu.style.left = `${Math.min(event.clientX, window.innerWidth - 155)}px`;
      menu.style.top = `${Math.min(event.clientY, window.innerHeight - 90)}px`;
      menu.hidden = false;
    });
    button.addEventListener('dragstart', () => button.classList.add('dragging'));
    button.addEventListener('dragend', () => button.classList.remove('dragging'));
    button.addEventListener('dragover', (event) => { event.preventDefault(); button.classList.add('drag-over'); });
    button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      button.classList.remove('drag-over');
      const draggedId = document.querySelector('.layer-card.dragging')?.dataset.layerId;
      if (!draggedId || draggedId === layer.id) return;
      const from = state.layers.findIndex((item) => item.id === draggedId);
      const to = state.layers.findIndex((item) => item.id === layer.id);
      const [moved] = state.layers.splice(from, 1);
      moved.parentId = layer.type === 'folder' ? layer.id : layer.parentId;
      state.layers.splice(to, 0, moved);
      renderLayers(); redraw();
    });
    button.querySelector('.visibility').addEventListener('click', (event) => {
      event.stopPropagation();
      layer.visible = !layer.visible;
      if (layer.type === 'folder') state.layers.forEach((item) => { if (item.parentId === layer.id) item.visible = layer.visible; });
      renderLayers();
      redraw();
    });
    list.append(button);
  }
  for (const folder of state.layers.filter((layer) => layer.type === 'folder')) {
    const folderButton = list.querySelector(`[data-layer-id="${folder.id}"]`);
    if (!folderButton) continue;
    const wrapper = document.createElement('section'); wrapper.className = `folder-layer${folder.collapsed ? ' collapsed' : ''}`;
    folderButton.parentElement.insertBefore(wrapper, folderButton); wrapper.append(folderButton);
    const children = document.createElement('div'); children.className = 'folder-children'; wrapper.append(children);
    state.layers.filter((layer) => layer.parentId === folder.id && layer.id !== folder.id).forEach((child) => {
      const childButton = list.querySelector(`[data-layer-id="${child.id}"]`); if (childButton) children.append(childButton);
    });
  }
  translateDocument(list);
}

function renderAssets() {
  const layer = selectedLayer();
  const grid = $('#assetGrid');
  grid.replaceChildren();
  layer.assets.forEach((asset, index) => {
    const item = document.createElement('div');
    item.className = `asset${index === layer.selectedAssetIndex ? ' selected' : ''}`;
    const image = document.createElement('img');
    image.src = asset.image.src;
    image.alt = asset.file.name;
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.ariaLabel = 'Remover';
    remove.onclick = () => {
      layer.assets.splice(index, 1);
      layer.selectedAssetIndex = Math.max(0, Math.min(layer.selectedAssetIndex, layer.assets.length - 1));
      renderAssets();
      renderTerrainAnchorPreview(layer);
      updateReadyState();
    };
    item.onclick = (event) => {
      if (event.target === remove) return;
      layer.selectedAssetIndex = index;
      renderAssets();
      renderTerrainAnchorPreview(layer);
    };
    item.append(image, remove);
    grid.append(item);
  });
  if (!layer.assets.length) grid.innerHTML = '<p>Adicione árvores, pedras ou qualquer elemento que queira distribuir.</p>';
  $('#assetCount').textContent = layer.assets.length;
  renderTerrainAnchorPreview(layer);
  translateDocument(grid);
}

function renderTerrainAnchorPreview(layer) {
  const preview = $('#terrainAnchorPreview');
  const asset = layer?.type === 'terrain' ? layer.assets[layer.selectedAssetIndex || 0] : null;
  const image = preview.querySelector('img');
  image.src = asset?.image.src || '';
  image.hidden = !asset;
  preview.querySelector('small').hidden = Boolean(asset);
  const marker = preview.querySelector('i');
  marker.hidden = !asset;
  positionAnchorMarker(preview, image, marker, asset?.anchorX ?? 0.5, asset?.anchorY ?? 0.5);
  $('#terrainAnchorCoordinates').textContent = asset ? anchorCoordinateLabel(asset.image, asset.anchorX ?? 0.5, asset.anchorY ?? 0.5) : `${anchorWord()}: —`;
}

function selectAdjacentTerrainSprite(direction) {
  const layer = selectedLayer();
  if (layer?.type !== 'terrain' || !layer.assets.length) return;
  layer.selectedAssetIndex = (layer.selectedAssetIndex + direction + layer.assets.length) % layer.assets.length;
  renderAssets();
}
$('#previousTerrainSprite').onclick = () => selectAdjacentTerrainSprite(-1);
$('#nextTerrainSprite').onclick = () => selectAdjacentTerrainSprite(1);

$('#terrainAnchorPreview').addEventListener('click', (event) => {
  const layer = selectedLayer();
  const asset = layer?.type === 'terrain' ? layer.assets[layer.selectedAssetIndex || 0] : null;
  if (!asset) return;
  const anchor = roundedAnchorFromClick(event.currentTarget, event.currentTarget.querySelector('img'), event);
  asset.anchorX = anchor.x;
  asset.anchorY = anchor.y;
  renderTerrainAnchorPreview(layer);
  if (layer.placements.length && layer.settings.slice) generate();
  else redraw();
});

function populateTerrainRegionLink(layer) {
  const select = $('#terrainRegionLink');
  const regions = state.layers.filter((item) => item.type === 'region');
  select.replaceChildren(new Option(regions.length ? 'Selecione uma região criada' : 'Crie uma layer de região primeiro', ''), ...regions.map((region) => new Option(region.region.name || region.name, region.id)));
  select.value = regions.some((region) => region.id === layer.settings.regionLayerId) ? layer.settings.regionLayerId : '';
  if (layer.settings.regionLayerId && !select.value) layer.settings.regionLayerId = '';
  $('#terrainCreateRegion').checked = Boolean(layer.settings.createRegion);
  $('#terrainRegionLinkField').hidden = !layer.settings.createRegion;
}

function selectLayer(id) {
  if (state.maskEditing && state.maskEditing !== id) closeMaskEditor();
  state.selectedId = id;
  const layer = selectedLayer();
  $('#layerName').value = layer.name;
  $('#maskName').textContent = layer.maskName || 'Nenhuma máscara selecionada';
  $('#createMaskBtn').textContent = layer.mask ? t('editMask') : t('createMask');
  $('#density').value = layer.settings.density;
  $('#scale').value = layer.settings.scale;
  $('#sizeVariation').checked = layer.settings.sizeVariation;
  $('#sizeMin').value = layer.settings.sizeMin;
  $('#sizeMax').value = layer.settings.sizeMax;
  $('#seed').value = layer.settings.seed;
  $('#standardizedDistribution').checked = Boolean(layer.settings.standardizedDistribution);
  $('#rotation').checked = layer.settings.rotation;
  $('#mirror').checked = layer.settings.mirror;
  $('#slice').checked = layer.settings.slice;
  if (layer.type === 'terrain') populateTerrainRegionLink(layer);
  $('#imageOffsetX').value = layer.settings.imageOffsetX;
  $('#imageOffsetY').value = layer.settings.imageOffsetY;
  $('#imageOpacity').value = layer.settings.imageOpacity;
  $('#imageOffsetXValue').value = layer.settings.imageOffsetX;
  $('#imageOffsetYValue').value = layer.settings.imageOffsetY;
  $('#imageOpacityValue').value = Math.round(layer.settings.imageOpacity * 100);
  $('#typeBadge').textContent = layer.type === 'image' ? 'Imagem' : layer.type === 'object' ? 'Objeto' : layer.type === 'region' ? 'Região' : layer.type === 'path' ? 'Caminho' : layer.type === 'folder' ? 'Folder' : layer.type === 'ground' ? 'Ground / base' : 'Terreno';
  document.querySelectorAll('.terrain-control, .ground-control, .image-control, .object-control, .region-control, .path-control').forEach((control) => {
    control.hidden = !control.classList.contains(`${layer.type}-control`);
  });
  const upload = document.querySelector('.upload');
  upload.querySelector('b').textContent = layer.type === 'image' ? t('uploadImage') : t('uploadMask');
  upload.querySelector('small').textContent = layer.type === 'image' ? 'Background ou elemento visual' : 'PNG em tons de cinza • branco vazio, preto com intensidade máxima';
  $('#generateBtn').hidden = layer.type !== 'terrain';
  $('#footerHint').textContent = layer.type === 'terrain' ? 'A seed mantém o resultado reproduzível.' : 'Arraste a camada para definir sua prioridade.';
  if (layer.type === 'object') fillObjectInspector(layer.object);
  if (layer.type === 'region') {
    $('#regionName').value = layer.region.name;
    renderRegionPresets(layer.region.presetId);
  }
  if (layer.type === 'path') fillPathInspector(layer);
  if (layer.type === 'terrain' || layer.type === 'region') renderMaskPreview(layer);
  if (layer.type === 'ground') {
    $('#groundMaskName').textContent = layer.maskName || 'Nenhuma máscara de ground/base';
    renderGroundMaskPreview(layer);
  }
  updateOutputs();
  renderLayers();
  renderAssets();
  updateReadyState();
  redraw();
  translateDocument($('.inspector'));
}

function renderMaskPreview(layer) {
  const preview = $('#maskPreview');
  preview.replaceChildren();
  if (!layer.mask) return;
  const card = document.createElement('div'); card.className = 'mask-card';
  const image = new Image(); image.src = layer.maskExportSource || layer.mask.src || layer.maskBaseSource || layer.maskChunks?.values().next().value?.source || ''; image.alt = layer.maskName;
  const name = document.createElement('small'); name.textContent = layer.maskName;
  const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remover máscara';
  remove.onclick = () => {
    layer.mask = null; layer.maskName = ''; layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null; layer.output.width = 0;
    layer.placements = [];
    $('#maskName').textContent = 'Nenhuma máscara selecionada'; $('#createMaskBtn').textContent = t('createMask'); renderMaskPreview(layer); updateReadyState(); redraw();
  };
  card.append(image, name, remove); preview.append(card);
}

function renderGroundMaskPreview(layer) {
  const preview = $('#groundMaskPreview');
  preview.replaceChildren();
  if (!layer?.heightMap) return;
  const card = document.createElement('div'); card.className = 'mask-card';
  const image = new Image(); image.src = layer.heightMapExportSource || layer.heightMap.src || layer.heightMapBaseSource || layer.heightChunks?.values().next().value?.source || ''; image.alt = `Máscara original de ${layer.name}`;
  const label = document.createElement('small'); label.textContent = 'Máscara original • preto e branco';
  card.append(image, label); preview.append(card);
}

async function applyRegionPriority(activeLayer) {
  if (!activeLayer.mask) return;
  activeLayer.region.drawnAt = Date.now();
  for (const layer of state.layers) {
    if (layer === activeLayer || layer.type !== 'region' || !layer.mask || (layer.region.group || 'Regiões') !== (activeLayer.region.group || 'Regiões')) continue;
    const surface = document.createElement('canvas');
    surface.width = canvas.width; surface.height = canvas.height;
    const surfaceContext = surface.getContext('2d');
    surfaceContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
    surfaceContext.globalCompositeOperation = 'destination-out';
    surfaceContext.drawImage(activeLayer.mask, 0, 0, canvas.width, canvas.height);
    layer.mask = await imageFromSource(surface.toDataURL('image/png'));
    layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null;
  }
}

function updateOutputs() {
  const layer = selectedLayer();
  $('#densityValue').value = layer.settings.density;
  $('#scaleValue').value = layer.settings.scale;
  $('#sizeValue').value = `${layer.settings.sizeMin}×–${layer.settings.sizeMax}×`;
  $('#sizeVariationFields').hidden = !layer.settings.sizeVariation;
}

function populateObjectOptions() {
  const typeSelect = $('#objectType');
  const currentType = typeSelect.value;
  typeSelect.replaceChildren(...state.poiTypes.map((type) => new Option(type.name, type.id)));
  if (state.poiTypes.some((type) => type.id === currentType)) typeSelect.value = currentType;
  for (const id of ['objectIconSet', 'objectGallerySet']) {
    const select = $(`#${id}`);
    const current = select.value;
    const empty = new Option(id === 'objectIconSet' ? 'Selecione um conjunto' : 'Sem galeria', '');
    select.replaceChildren(empty, ...state.imageSets.map((set) => new Option(`${set.name} (${set.assets.length})`, set.id)));
    select.value = current;
  }
  const pathGallery = $('#pathGallerySet');
  const currentGallery = pathGallery.value;
  pathGallery.replaceChildren(new Option('Sem galeria', ''), ...state.imageSets.map((set) => new Option(`${set.name} (${set.assets.length})`, set.id)));
  pathGallery.value = currentGallery;
}

function renderPoiTypes() {
  const list = $('#poiTypeList');
  list.replaceChildren(...state.poiTypes.map((type) => {
    const item = document.createElement('div'); item.className = 'poi-type-item';
    const name = document.createElement('input'); name.value = type.name; name.ariaLabel = 'Nome do tipo';
    const color = document.createElement('input'); color.type = 'color'; color.value = type.color || '#ffffff'; color.ariaLabel = 'Cor do tipo';
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'Excluir tipo'; remove.disabled = state.poiTypes.length <= 1;
    name.oninput = () => { type.name = name.value || 'Sem nome'; populateObjectOptions(); redraw(); };
    color.oninput = () => { type.color = color.value; redraw(); };
    remove.onclick = () => {
      if (state.poiTypes.length <= 1) return;
      const fallback = state.poiTypes.find((entry) => entry.id !== type.id);
      state.layers.filter((layer) => layer.type === 'object' && layer.object.type === type.id).forEach((layer) => { layer.object.type = fallback.id; });
      state.poiTypes = state.poiTypes.filter((entry) => entry.id !== type.id);
      populateObjectOptions(); renderPoiTypes(); redraw();
    };
    item.append(name, color, remove); return item;
  }));
}

$('#managePoiTypes').onclick = () => { renderPoiTypes(); $('#poiTypeModal').hidden = false; };
$('#closePoiTypes').onclick = () => { $('#poiTypeModal').hidden = true; };
$('#poiTypeModal').addEventListener('click', (event) => { if (event.target === $('#poiTypeModal')) $('#poiTypeModal').hidden = true; });
$('#createPoiType').onclick = () => {
  const name = $('#newPoiTypeName').value.trim();
  if (!name) return;
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tipo';
  let id = base, suffix = 2;
  while (state.poiTypes.some((type) => type.id === id)) id = `${base}-${suffix++}`;
  state.poiTypes.push({ id, name, color: $('#newPoiTypeColor').value });
  $('#newPoiTypeName').value = '';
  populateObjectOptions(); $('#objectType').value = id; selectedLayer().object.type = id; renderPoiTypes(); redraw();
};

function renderPathPresets(selectedId) {
  const select = $('#pathPreset');
  select.replaceChildren(new Option('((NOVO PRESET))', '__new__'), ...state.pathPresets.map((preset) => new Option(preset.name, preset.id)));
  select.value = selectedId && state.pathPresets.some((preset) => preset.id === selectedId) ? selectedId : '__new__';
  const preset = state.pathPresets.find((item) => item.id === select.value);
  $('#pathPresetName').value = preset?.name || '';
  $('#pathStroke').value = preset?.stroke ?? 8; $('#pathColor').value = preset?.color || '#c99b57'; $('#pathDashed').checked = preset?.dashed || false; $('#pathDashGap').value = preset?.dashGap ?? 12;
}

function renderRegionPresets(selectedId) {
  const select = $('#regionPreset');
  select.replaceChildren(new Option('((NOVO TIPO))', '__new__'), ...state.regionPresets.map((preset) => new Option(preset.name, preset.id)));
  select.value = selectedId && state.regionPresets.some((preset) => preset.id === selectedId) ? selectedId : '__new__';
  const preset = state.regionPresets.find((item) => item.id === select.value);
  $('#regionPresetName').value = preset?.name || '';
  $('#regionColor').value = preset?.color || '#6fa86b';
  $('#regionFillMode').value = preset?.fillMode || 'fill';
  $('#regionOutlineThickness').value = preset?.outlineThickness ?? 3;
  $('#regionOutlineDashed').checked = preset?.outlineDashed || false;
  $('#regionOutlineGap').value = preset?.outlineGap ?? 12;
  $('#regionDefaultOverview').checked = preset?.defaultOverview || false;
}

function applyRegionPreset(region, preset) {
  Object.assign(region, { presetId: preset.id, group: preset.name, color: preset.color, fillMode: preset.fillMode || 'fill', outlineThickness: preset.outlineThickness ?? 3, outlineDashed: Boolean(preset.outlineDashed), outlineGap: preset.outlineGap ?? 12, defaultOverview: Boolean(preset.defaultOverview) });
}

function fillPathInspector(layer) {
  populateObjectOptions();
  $('#pathName').value = layer.path.name;
  $('#pathDescription').value = layer.path.description;
  $('#pathGallerySet').value = layer.path.gallerySetId;
  $('#pathShowOnMap').checked = layer.path.showOnMap;
  renderPathPresets(layer.path.presetId);
  $('#pathDistance').textContent = `Distância: ${formatDistanceWithTravel(layer.path.distance || calculatePathDistance(layer.path.points))}`;
}

function fillObjectInspector(object) {
  populateObjectOptions();
  $('#objectName').value = object.name;
  $('#objectType').value = object.type;
  $('#objectIconSet').value = object.iconSetId;
  $('#objectGallerySet').value = object.gallerySetId;
  $('#objectDescription').value = object.description;
  $('#objectPoi').checked = object.poi;
  $('#objectX').value = object.x === null ? '' : Math.round(object.x);
  $('#objectY').value = object.y === null ? '' : Math.round(object.y);
  $('#objectScale').value = object.scale ?? 1; $('#objectScaleValue').value = object.scale ?? 1;
  $('#objectOpacity').value = object.opacity ?? 1; $('#objectOpacityValue').value = Math.round((object.opacity ?? 1) * 100);
  $('#objectOffsetX').value = object.offsetX ?? 0; $('#objectOffsetXValue').value = object.offsetX ?? 0;
  $('#objectOffsetY').value = object.offsetY ?? 0; $('#objectOffsetYValue').value = object.offsetY ?? 0;
  renderObjectThumbnails(object);
  renderObjectAnchorPreview(object);
  renderObjectIconTrigger(object);
  updateDetailedDescriptionControls(object);
  $('#objectPosition').textContent = object.x === null ? 'Ainda não posicionado' : `Posição: ${Math.round(object.x)}, ${Math.round(object.y)}`;
}

function updateDetailedDescriptionControls(object) {
  const hasDetailedDescription = Boolean(object.descriptionPages?.length);
  $('#openDetailedDescription').textContent = hasDetailedDescription ? 'Editar descrição detalhada' : 'Adicionar descrição detalhada';
  $('#removeDetailedDescription').hidden = !hasDetailedDescription;
}

function renderObjectIconTrigger(object) {
  const set = state.imageSets.find((item) => item.id === object.iconSetId);
  const trigger = $('#openObjectIconPicker');
  const selectedAsset = objectIconAsset(object);
  const image = trigger.querySelector('img'); image.src = selectedAsset?.image.src || ''; image.hidden = !selectedAsset;
  trigger.querySelector('span').textContent = set?.name || 'Selecionar conjunto de ícones';
}

function renderObjectIconPicker() {
  const term = $('#objectIconSearch').value.trim().toLowerCase();
  const sets = state.imageSets.filter((set) => set.name.toLowerCase().includes(term));
  const list = $('#objectIconPickerList');
  list.replaceChildren(...sets.map((set) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-picker-item';
    const image = new Image(); image.src = set.assets[0]?.image.src || ''; image.alt = '';
    const label = document.createElement('span'); label.textContent = `${set.name} (${set.assets.length})`;
    button.append(image, label); button.onclick = () => {
      const layer = selectedLayer(); if (layer?.type !== 'object') return;
      layer.object.iconSetId = set.id; layer.object.selectedIconIndex = 0; $('#objectIconSet').value = set.id;
      renderObjectThumbnails(layer.object); renderObjectAnchorPreview(layer.object); renderObjectIconTrigger(layer.object); redraw();
      $('#objectIconPickerModal').hidden = true;
    };
    return button;
  }));
  if (!sets.length) list.innerHTML = '<p class="set-empty">Nenhum conjunto encontrado.</p>';
}

$('#openObjectIconPicker').onclick = () => { $('#objectIconSearch').value = ''; renderObjectIconPicker(); $('#objectIconPickerModal').hidden = false; };
$('#closeObjectIconPicker').onclick = () => { $('#objectIconPickerModal').hidden = true; };
$('#objectIconPickerModal').addEventListener('click', (event) => { if (event.target === $('#objectIconPickerModal')) $('#objectIconPickerModal').hidden = true; });
$('#objectIconSearch').addEventListener('input', renderObjectIconPicker);

let editingDescriptionPages = [];
let activeDescriptionPageIndex = 0;
let editingTemplateStructureOnly = false;
let descriptionEditorMode = 'visual';
function cloneDescriptionPages(pages) { return (pages || []).map((page) => ({ ...page, images: [...(page.images || [])] })); }

function sanitizeDescriptionHtml(value) {
  const template = document.createElement('template'); template.innerHTML = value || '';
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'P', 'BR', 'UL', 'OL', 'LI', 'H3', 'H4']);
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach((element) => element.remove());
  [...template.content.querySelectorAll('*')].forEach((element) => {
    if (!allowed.has(element.tagName)) { element.replaceWith(...element.childNodes); return; }
    const color = element.style.color;
    const weight = element.style.fontWeight;
    const fontStyle = element.style.fontStyle;
    const decoration = element.style.textDecoration;
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
    if (color) element.style.color = color;
    if (weight) element.style.fontWeight = weight;
    if (fontStyle) element.style.fontStyle = fontStyle;
    if (decoration) element.style.textDecoration = decoration;
  });
  return template.innerHTML;
}

function renderDescriptionTemplates() {
  const list = $('#descriptionTemplateList');
  const layer = selectedLayer();
  const buttons = [];
  if (layer?.type === 'object' && layer.object.descriptionPages?.length) {
    const current = document.createElement('button'); current.textContent = `Editar descrição atual (${layer.object.descriptionPages.length} páginas)`;
    current.onclick = () => openDescriptionEditor(layer.object.detailedTemplateId || '', layer.object.descriptionPages, layer.object.name || 'Descrição', true); buttons.push(current);
  }
  for (const template of state.descriptionTemplates) {
    const button = document.createElement('button'); button.textContent = `${template.name} (${template.pages.length} páginas)`;
    button.onclick = () => openDescriptionEditor(template.id, template.pages, template.name, false); buttons.push(button);
  }
  list.replaceChildren(...buttons);
  if (!buttons.length) list.innerHTML = '<p class="set-empty">Nenhum template criado ainda.</p>';
}

function openDescriptionEditor(templateId, pages, name, preserveContent = false, structureOnly = false) {
  state.editingDescriptionTemplateId = templateId;
  editingTemplateStructureOnly = structureOnly;
  editingDescriptionPages = preserveContent
    ? cloneDescriptionPages(pages)
    : (pages || []).map((page) => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: page.title, content: '', images: [] }));
  if (!editingDescriptionPages.length) editingDescriptionPages.push({ id: crypto.randomUUID?.() || `${Date.now()}`, title: 'Overview', content: '', images: [] });
  activeDescriptionPageIndex = 0;
  descriptionEditorMode = 'visual';
  $('#descriptionEditorTitle').textContent = name;
  renderDescriptionPageEditor();
  $('#descriptionTemplateModal').hidden = true; $('#descriptionEditorModal').hidden = false;
}

function renderDescriptionPageEditor() {
  const editor = $('#descriptionPageEditor');
  const navigation = $('#descriptionEditorPages');
  navigation.replaceChildren(...editingDescriptionPages.map((page, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = page.title || `Página ${index + 1}`;
    button.classList.toggle('active', index === activeDescriptionPageIndex);
    button.onclick = () => { activeDescriptionPageIndex = index; renderDescriptionPageEditor(); };
    return button;
  }));
  const page = editingDescriptionPages[activeDescriptionPageIndex];
  if (!page) { editor.replaceChildren(); return; }
  const card = (() => {
    const index = activeDescriptionPageIndex;
    const card = document.createElement('section'); card.className = 'description-page-card';
    const title = document.createElement('input'); title.value = page.title; title.placeholder = 'Título da página'; title.oninput = () => { page.title = title.value; navigation.children[index].textContent = title.value || `Página ${index + 1}`; };
    const contentEditor = document.createElement('div'); contentEditor.className = 'description-content-editor';
    const toolbar = document.createElement('div'); toolbar.className = 'description-mode-toolbar';
    const visualButton = document.createElement('button'); visualButton.type = 'button'; visualButton.title = 'Modo visual'; visualButton.textContent = '👁'; visualButton.classList.toggle('active', descriptionEditorMode === 'visual');
    const htmlButton = document.createElement('button'); htmlButton.type = 'button'; htmlButton.title = 'Editar HTML'; htmlButton.textContent = '</>'; htmlButton.classList.toggle('active', descriptionEditorMode === 'html');
    visualButton.onclick = () => { descriptionEditorMode = 'visual'; page.content = sanitizeDescriptionHtml(page.content); renderDescriptionPageEditor(); };
    htmlButton.onclick = () => { descriptionEditorMode = 'html'; renderDescriptionPageEditor(); };
    toolbar.append(visualButton, htmlButton); contentEditor.append(toolbar);
    if (descriptionEditorMode === 'visual') {
      const visual = document.createElement('div'); visual.className = 'description-visual-editor'; visual.contentEditable = 'true'; visual.innerHTML = sanitizeDescriptionHtml(page.content); visual.oninput = () => { page.content = visual.innerHTML; }; contentEditor.append(visual);
    } else {
      const html = document.createElement('textarea'); html.className = 'description-html-editor'; html.value = page.content || ''; html.placeholder = '<p>Conteúdo com <b>HTML</b> simples...</p>'; html.oninput = () => { page.content = html.value; }; contentEditor.append(html);
    }
    const images = document.createElement('div'); images.className = 'description-page-images'; images.replaceChildren(...page.images.map((source, imageIndex) => {
      const item = document.createElement('div'); item.className = 'editing-asset'; const image = new Image(); image.src = source;
      const removeImage = document.createElement('button'); removeImage.type = 'button'; removeImage.textContent = '×'; removeImage.title = 'Remover imagem'; removeImage.onclick = () => { page.images.splice(imageIndex, 1); renderDescriptionPageEditor(); };
      item.append(image, removeImage); return item;
    }));
    const upload = document.createElement('label'); upload.className = 'position-object'; upload.textContent = '＋ Adicionar imagens nesta página';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
    input.onchange = async () => { for (const file of input.files) page.images.push((await fileImage(file)).src); renderDescriptionPageEditor(); }; upload.append(input);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger-button position-object'; remove.textContent = 'Excluir página'; remove.onclick = () => { editingDescriptionPages.splice(index, 1); activeDescriptionPageIndex = Math.max(0, Math.min(index, editingDescriptionPages.length - 1)); renderDescriptionPageEditor(); };
    card.append(title);
    if (!editingTemplateStructureOnly) card.append(contentEditor, images, upload);
    card.append(remove); return card;
  })();
  editor.replaceChildren(card);
}

$('#openDetailedDescription').onclick = () => {
  const layer = selectedLayer(); if (layer?.type !== 'object') return;
  if (layer.object.descriptionPages?.length) openDescriptionEditor(layer.object.detailedTemplateId || '', layer.object.descriptionPages, layer.object.name || 'Descrição', true);
  else { renderDescriptionTemplates(); $('#descriptionTemplateModal').hidden = false; }
};
$('#removeDetailedDescription').onclick = () => {
  const layer = selectedLayer(); if (layer?.type !== 'object' || !layer.object.descriptionPages?.length) return;
  if (!window.confirm('Remover a descrição detalhada e todo o conteúdo das páginas deste objeto?')) return;
  layer.object.detailedTemplateId = ''; layer.object.descriptionPages = [];
  updateDetailedDescriptionControls(layer.object);
  $('#saveState').textContent = 'Descrição detalhada removida';
};
$('#closeDescriptionTemplates').onclick = () => { $('#descriptionTemplateModal').hidden = true; };
$('#descriptionTemplateModal').addEventListener('click', (event) => { if (event.target === $('#descriptionTemplateModal')) $('#descriptionTemplateModal').hidden = true; });
$('#createDescriptionTemplate').onclick = () => {
  const name = $('#newDescriptionTemplateName').value.trim() || `Template ${state.descriptionTemplates.length + 1}`;
  openDescriptionEditor('', [], name, false, true);
};
$('#addDescriptionPage').onclick = () => { editingDescriptionPages.push({ id: crypto.randomUUID?.() || `${Date.now()}`, title: `Página ${editingDescriptionPages.length + 1}`, content: '', images: [] }); activeDescriptionPageIndex = editingDescriptionPages.length - 1; renderDescriptionPageEditor(); };
$('#closeDescriptionEditor').onclick = () => { $('#descriptionEditorModal').hidden = true; };
$('#saveDetailedDescription').onclick = () => {
  const layer = selectedLayer(); if (layer?.type !== 'object') return;
  let template = state.descriptionTemplates.find((item) => item.id === state.editingDescriptionTemplateId);
  if (!template) { template = { id: crypto.randomUUID?.() || `${Date.now()}`, name: $('#descriptionEditorTitle').textContent, pages: [] }; state.descriptionTemplates.push(template); }
  template.pages = editingDescriptionPages.map((page) => ({ id: page.id, title: page.title }));
  layer.object.detailedTemplateId = template.id;
  layer.object.descriptionPages = editingDescriptionPages.map((page) => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: page.title, content: editingTemplateStructureOnly ? '' : page.content, images: editingTemplateStructureOnly ? [] : [...page.images] }));
  updateDetailedDescriptionControls(layer.object);
  $('#descriptionEditorModal').hidden = true; $('#saveState').textContent = 'Descrição detalhada salva';
};

function renderObjectAnchorPreview(object) {
  const preview = $('#objectAnchorPreview');
  const icon = objectIconAsset(object)?.image;
  const image = preview.querySelector('img');
  image.src = icon?.src || '';
  image.hidden = !icon;
  preview.querySelector('small').hidden = Boolean(icon);
  const marker = preview.querySelector('i');
  marker.hidden = !icon;
  positionAnchorMarker(preview, image, marker, object.anchorX ?? 0.5, object.anchorY ?? 1);
  $('#objectAnchorCoordinates').textContent = icon ? anchorCoordinateLabel(icon, object.anchorX ?? 0.5, object.anchorY ?? 1) : `${anchorWord()}: —`;
}

$('#objectAnchorPreview').addEventListener('click', (event) => {
  const layer = selectedLayer();
  if (layer?.type !== 'object' || !event.currentTarget.querySelector('img').src) return;
  const anchor = roundedAnchorFromClick(event.currentTarget, event.currentTarget.querySelector('img'), event);
  layer.object.anchorX = anchor.x;
  layer.object.anchorY = anchor.y;
  renderObjectAnchorPreview(layer.object);
  redraw();
});

function containedImageBox(preview, image) {
  const style = getComputedStyle(preview);
  const availableWidth = preview.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const availableHeight = preview.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const scale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return { left: (preview.clientWidth - width) / 2, top: (preview.clientHeight - height) / 2, width, height };
}

function roundedAnchorFromClick(preview, image, event) {
  const rectangle = preview.getBoundingClientRect();
  const box = containedImageBox(preview, image);
  const normalizedX = Math.max(0, Math.min(1, (event.clientX - rectangle.left - box.left) / box.width));
  const normalizedY = Math.max(0, Math.min(1, (event.clientY - rectangle.top - box.top) / box.height));
  return {
    x: Math.round(normalizedX * image.naturalWidth) / image.naturalWidth,
    y: Math.round(normalizedY * image.naturalHeight) / image.naturalHeight,
  };
}

function positionAnchorMarker(preview, image, marker, anchorX, anchorY) {
  if (!image.naturalWidth || !image.naturalHeight) return;
  const box = containedImageBox(preview, image);
  marker.style.left = `${box.left + box.width * anchorX}px`;
  marker.style.top = `${box.top + box.height * anchorY}px`;
}

function anchorCoordinateLabel(image, anchorX, anchorY) {
  return `${anchorWord()}: X ${Math.round(image.naturalWidth * anchorX)}, Y ${Math.round(image.naturalHeight * anchorY)}`;
}

function anchorWord() { return state.language === 'pt-BR' ? 'Âncora' : phraseTranslations[state.language]?.['Âncora'] || 'Âncora'; }

function renderObjectThumbnails(object) {
  for (const [elementId, setId] of [['objectIconPreview', object.iconSetId], ['objectGalleryPreview', object.gallerySetId]]) {
    const preview = $(`#${elementId}`);
    const set = state.imageSets.find((item) => item.id === setId);
    preview.replaceChildren(...(set?.assets || []).map((asset) => {
      const image = new Image(); image.src = asset.image.src; image.alt = asset.file.name;
      if (elementId === 'objectIconPreview') {
        const index = set.assets.indexOf(asset);
        image.classList.toggle('selected', index === (Number(object.selectedIconIndex) || 0));
        image.tabIndex = 0; image.role = 'button'; image.title = `Usar ${asset.file.name}`;
        const selectAsset = () => { object.selectedIconIndex = index; renderObjectThumbnails(object); renderObjectAnchorPreview(object); renderObjectIconTrigger(object); redraw(); };
        image.onclick = selectAsset; image.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectAsset(); } };
      }
      return image;
    }));
  }
}

function updateReadyState() {
  const layer = selectedLayer();
  $('#generateBtn').disabled = layer.type !== 'terrain' || !(layer.mask && layer.assets.length);
}

function prepareMask(layer) {
  const scratch = document.createElement('canvas');
  scratch.width = canvas.width;
  scratch.height = canvas.height;
  const maskContext = scratch.getContext('2d', { willReadFrequently: true });
  maskContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
  const imageData = maskContext.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const clipData = maskContext.createImageData(canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;

  // Alpha is essential here: transparent pixels are outside the mask, even though
  // their RGB channels are black. Opaque, dark pixels define the fillable area.
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const darkness = 1 - (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 765;
      if (pixels[index + 3] > 0 && darkness > 0) {
        clipData.data[index] = 255;
        clipData.data[index + 1] = 255;
        clipData.data[index + 2] = 255;
        clipData.data[index + 3] = Math.round(255 * darkness * pixels[index + 3] / 255);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  layer.maskPixels = pixels;
  layer.maskPath = new Path2D();
  for (let y = 0; y < canvas.height; y++) {
    let runStart = -1;
    for (let x = 0; x <= canvas.width; x++) {
      const inside = x < canvas.width && clipData.data[(y * canvas.width + x) * 4 + 3] > 0;
      if (inside && runStart < 0) runStart = x;
      if (!inside && runStart >= 0) {
        layer.maskPath.rect(runStart, y, x - runStart, 1);
        runStart = -1;
      }
    }
  }
  layer.clip = document.createElement('canvas');
  layer.clip.width = canvas.width;
  layer.clip.height = canvas.height;
  layer.clip.getContext('2d').putImageData(clipData, 0, 0);
  layer.bounds = minX <= maxX ? { minX, minY, maxX, maxY } : null;
}

async function generate(layer = selectedLayer()) {
  if (!layer.mask || !layer.assets.length) return;
  if (!layer.maskPixels) prepareMask(layer);
  if (!layer.bounds) {
    $('#saveState').textContent = 'Máscara vazia';
    return;
  }

  const token = ++state.generationToken;
  $('#saveState').textContent = 'Calculando…';
  $('#generateBtn').disabled = true;
  showTaskProgress('Calculando distribuição do terreno', 0);
  layer.output.width = canvas.width;
  layer.output.height = canvas.height;
  layer.placements = [];
  const outputContext = layer.output.getContext('2d');
  outputContext.imageSmoothingEnabled = state.mapFilter !== 'nearest';
  outputContext.imageSmoothingQuality = state.mapFilter === 'linear' ? 'high' : 'low';
  const random = randomFactory(hashSeed(layer.settings.seed));
  const { minX, minY, maxX, maxY } = layer.bounds;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const averageVariation = layer.settings.sizeVariation ? (layer.settings.sizeMin + layer.settings.sizeMax) / 2 : 1;
  // Density is a property of the mask, never of the amount or dimensions of
  // images in the set. More images only change which graphic each point uses.
  // Scale the point budget by the rendered footprint: reducing "Tamanho geral"
  // therefore creates proportionally more spawn points instead of leaving gaps.
  // Keep only a one-pixel floor to avoid division by zero at the slider limit.
  const footprint = Math.max(1, 48 * layer.settings.scale * averageVariation);
  // Below the default scale, apply only a gentle boost of up to 2x. The former
  // 5x multiplier made even intensity 1 overcrowded for very small sprites.
  const smallScaleBoost = layer.settings.scale < 1
    ? 1 + (1 - layer.settings.scale)
    : 1;
  // 100 is the base occupancy; 1000 layers roughly ten passes over the same
  // footprint and is intended to produce an almost completely filled mask.
  // The point budget remains independent of asset count.
  const attempts = Math.min(1250000, Math.round((width * height / (footprint * footprint)) * layer.settings.density / 100 * smallScaleBoost));
  // A softly jittered grid avoids rigid symmetry as well as fully random
  // clusters and gaps, while preserving the configured size variation.
  const standardized = Boolean(layer.settings.standardizedDistribution);
  const columns = standardized && attempts ? Math.max(1, Math.round(Math.sqrt(attempts * width / height))) : 0;
  const rows = standardized && attempts ? Math.max(1, Math.ceil(attempts / columns)) : 0;
  const cellWidth = columns ? width / columns : 0;
  const cellHeight = rows ? height / rows : 0;
  const placements = [];
  let iteration = 0;

  // Resolve spawn points in small batches. The mask chooses the origin only;
  // graphics may naturally extend beyond it unless Slice is enabled.
  await new Promise((resolve) => {
    function calculateBatch() {
      if (token !== state.generationToken) return resolve();
      const batchEnd = Math.min(iteration + 2500, attempts);
      for (; iteration < batchEnd; iteration++) {
        const column = standardized ? iteration % columns : 0;
        const row = standardized ? Math.floor(iteration / columns) : 0;
        const x = standardized ? minX + (column + 0.2 + random() * 0.6) * cellWidth : minX + random() * width;
        const y = standardized ? minY + (row + 0.2 + random() * 0.6) * cellHeight : minY + random() * height;
        const pixel = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const alpha = layer.maskPixels[pixel + 3] / 255;
        const darkness = 1 - (layer.maskPixels[pixel] + layer.maskPixels[pixel + 1] + layer.maskPixels[pixel + 2]) / 765;
        const coverage = alpha * darkness;
        if (coverage <= 0 || random() > coverage) continue;
        const assetIndex = Math.floor(random() * layer.assets.length);
        placements.push({
          x, y,
          assetIndex,
          asset: layer.assets[assetIndex].image,
          variation: layer.settings.sizeVariation ? layer.settings.sizeMin + random() * (layer.settings.sizeMax - layer.settings.sizeMin) : 1,
          rotation: layer.settings.rotation ? random() * Math.PI * 2 : 0,
          mirrored: layer.settings.mirror && random() > 0.5,
        });
      }
      updateTaskProgress('Calculando distribuição do terreno', attempts ? iteration / attempts * 55 : 55);
      if (iteration < attempts) requestAnimationFrame(calculateBatch);
      else resolve();
    }
    calculateBatch();
  });

  // Painter's algorithm: lower objects are rendered last and appear in front.
  placements.sort((first, second) => first.y - second.y);
  $('#saveState').textContent = 'Renderizando…';
  let drawn = 0;
  await new Promise((resolve) => {
    function drawBatch() {
      if (token !== state.generationToken) return resolve();
      const batchEnd = Math.min(drawn + 1200, placements.length);
      for (; drawn < batchEnd; drawn++) {
        const placement = placements[drawn];
        const width = placement.asset.naturalWidth * layer.settings.scale * placement.variation;
        const height = placement.asset.naturalHeight * layer.settings.scale * placement.variation;
        const assetEntry = layer.assets[placement.assetIndex];
        outputContext.save();
        outputContext.translate(placement.x, placement.y);
        outputContext.rotate(placement.rotation);
        if (placement.mirrored) outputContext.scale(-1, 1);
        outputContext.drawImage(placement.asset, -width * (assetEntry?.anchorX ?? 0.5), -height * (assetEntry?.anchorY ?? 0.5), width, height);
        outputContext.restore();
      }
      redraw();
      updateTaskProgress('Renderizando terreno', placements.length ? 55 + drawn / placements.length * 45 : 100);
      if (drawn < placements.length) requestAnimationFrame(drawBatch);
      else resolve();
    }
    drawBatch();
  });

  if (layer.settings.slice) {
    outputContext.globalCompositeOperation = 'destination-in';
    outputContext.drawImage(layer.clip, 0, 0);
    outputContext.globalCompositeOperation = 'source-over';
  }
  layer.placements = placements;
  redraw();

  if (token === state.generationToken) {
    $('#saveState').textContent = 'Atualizado';
    updateReadyState();
  }
  hideTaskProgress();
}

$('#addLayer').onclick = () => {
  const menu = $('#addLayerMenu');
  menu.hidden = !menu.hidden;
  if (!menu.hidden) {
    const rectangle = $('#addLayer').getBoundingClientRect();
    menu.style.top = `${Math.min(rectangle.top, window.innerHeight - menu.offsetHeight - 12)}px`;
  }
};
document.addEventListener('pointerdown', (event) => { if (!event.target.closest('#addLayerMenu, #addLayer')) $('#addLayerMenu').hidden = true; });
document.querySelectorAll('[data-layer-type]').forEach((button) => {
  button.onclick = () => {
    const type = button.dataset.layerType;
    const activeFolder = selectedLayer()?.type === 'folder' ? selectedLayer() : null;
    const layer = createLayer(type);
    if (activeFolder && type !== 'folder') layer.parentId = activeFolder.id;
    // Images start at the bottom as backgrounds; other layers start at the top.
    if (type === 'image') state.layers.push(layer);
    else state.layers.unshift(layer);
    $('#addLayerMenu').hidden = true;
    selectLayer(layer.id);
  };
});
$('#layerName').addEventListener('input', (event) => {
  selectedLayer().name = event.target.value || 'Sem título';
  renderLayers();
});
$('#maskInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const layer = selectedLayer();
  const image = await fileImage(file);
  layer.maskName = file.name;
  if (layer.type === 'image') {
    layer.image = image;
    if (!state.layers.some((item) => (item.mask || item.image) && item.id !== layer.id)) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    stage.style.display = 'block';
    $('#emptyState').style.display = 'none';
    $('#maskName').textContent = file.name;
    redraw(); fit();
    event.target.value = '';
    return;
  }
  layer.mask = image;
  layer.maskPixels = null;
  layer.maskPath = null;
  layer.clip = null;
  layer.bounds = null;
  layer.output.width = 0;
  layer.placements = [];
  if (!state.layers.some((item) => item.mask && item.id !== layer.id)) {
    canvas.width = layer.mask.naturalWidth;
    canvas.height = layer.mask.naturalHeight;
  }
  stage.style.display = 'block';
  $('#emptyState').style.display = 'none';
  $('#maskName').textContent = file.name;
  $('#createMaskBtn').textContent = t('editMask');
  if (layer.type === 'region') await applyRegionPriority(layer);
  renderMaskPreview(layer);
  redraw();
  fit();
  updateReadyState();
  event.target.value = '';
});
let pendingSetAssets = [];
let editingSetId = null;
function openAssetLibrary() {
  editingSetId = null; pendingSetAssets = [];
  $('#assetSetSearch').value = '';
  $('#setName').value = ''; $('#newSetFiles').textContent = 'Nenhuma imagem selecionada';
  $('#createSetBtn').textContent = 'Criar conjunto'; $('#createSetBtn').disabled = true;
  renderEditingSetAssets(); renderImageSets(); $('#assetModal').hidden = false;
}
$('#openAssetModal').onclick = openAssetLibrary;
$('#manageObjectSets').onclick = openAssetLibrary;
$('#closeAssetModal').onclick = () => { $('#assetModal').hidden = true; };
$('#assetModal').addEventListener('click', (event) => {
  if (event.target === $('#assetModal')) $('#assetModal').hidden = true;
});
$('#projectSettingsBtn').onclick = () => {
  $('#languageSelect').value = state.language; $('#themeSetting').value = state.theme;
  $('#interfaceSettingsModal').hidden = false;
};
$('#closeInterfaceSettings').onclick = () => { $('#interfaceSettingsModal').hidden = true; };
$('#interfaceSettingsModal').addEventListener('click', (event) => { if (event.target === $('#interfaceSettingsModal')) $('#interfaceSettingsModal').hidden = true; });
function openMapSettings() {
  $('#mapWidthSetting').value = canvas.width; $('#mapHeightSetting').value = canvas.height;
  $('#mapFilterSetting').value = state.mapFilter;
  $('#maskChunkSizeSetting').value = state.maskChunkSize; $('#debugChunkGridSetting').checked = state.debugChunkGrid;
  $('#distanceScaleKm').value = state.distanceScaleKm;
  $('#speedWalking').value = state.travelSpeeds.walking; $('#speedHorse').value = state.travelSpeeds.horse; $('#speedShip').value = state.travelSpeeds.ship; $('#speedAir').value = state.travelSpeeds.air;
  $('#terrainWaterShallow').value = state.terrainColors.shallow; $('#terrainWaterMedium').value = state.terrainColors.medium; $('#terrainWaterDeep').value = state.terrainColors.deep; $('#terrainLandColor').value = state.terrainColors.land;
  $('#terrainCoastLandColor').value = state.terrainColors.coastLand; $('#terrainCoastWaveColor').value = state.terrainColors.coastWave;
  $('#terrainCoastLandThickness').value = state.terrainColors.coastLandThickness; $('#terrainCoastWaveThickness').value = state.terrainColors.coastWaveThickness;
  $('#terrainCoastVariation').checked = state.terrainColors.coastVariation; $('#terrainCoastNoiseMultiplier').value = state.terrainColors.coastNoiseMultiplier;
  $('#projectSettingsModal').hidden = false;
}
function applyMapFilter() {
  const selectedFilter = $('#mapFilterSetting').value;
  state.mapFilter = ['linear', 'balanced', 'nearest'].includes(selectedFilter) ? selectedFilter : 'linear';
  const pixelated = state.mapFilter === 'nearest';
  canvas.style.imageRendering = pixelated ? 'pixelated' : 'auto';
  maskEditCanvas.style.imageRendering = pixelated ? 'pixelated' : 'auto';
  ctx.imageSmoothingEnabled = !pixelated;
  ctx.imageSmoothingQuality = state.mapFilter === 'linear' ? 'high' : 'low';
}
$('#applyMapSettings').onclick = () => {
  const width = Math.max(1, Math.round(Number($('#mapWidthSetting').value) || canvas.width));
  const height = Math.max(1, Math.round(Number($('#mapHeightSetting').value) || canvas.height));
  if (width !== canvas.width || height !== canvas.height) {
    canvas.width = width; canvas.height = height;
    state.layers.forEach((layer) => {
      layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null;
      if (layer.heightMap) renderTerrainHeight(layer);
    });
    stage.style.display = 'block'; $('#emptyState').style.display = 'none'; fit();
  }
  const nextChunkSize = Number($('#maskChunkSizeSetting').value) || 512;
  if (nextChunkSize !== state.maskChunkSize) {
    state.maskChunkSize = nextChunkSize;
    state.layers.forEach((layer) => {
      for (const property of ['maskChunks', 'heightChunks', 'pendingMaskChunks', 'pendingHeightChunks']) {
        if (layer[property] instanceof Map) layer[property] = new Map([...layer[property].values()].map((chunk, index) => [`previous:${index}:${chunk.x}:${chunk.y}`, chunk]));
      }
    });
  }
  state.debugChunkGrid = $('#debugChunkGridSetting').checked;
  updateChunkDebugGrid(); applyMapFilter(); redraw(); $('#saveState').textContent = 'Configurações do mapa aplicadas';
};
$('#closeProjectSettings').onclick = () => { $('#projectSettingsModal').hidden = true; };
$('#projectSettingsModal').addEventListener('click', (event) => { if (event.target === $('#projectSettingsModal')) $('#projectSettingsModal').hidden = true; });
$('#distanceScaleKm').addEventListener('input', (event) => {
  state.distanceScaleKm = Math.max(0.01, Number(event.target.value) || 100);
  state.layers.filter((layer) => layer.type === 'path').forEach((layer) => { layer.path.distance = calculatePathDistance(layer.path.points); });
  if (selectedLayer()?.type === 'path') fillPathInspector(selectedLayer());
});
for (const [id, property] of Object.entries({ speedWalking: 'walking', speedHorse: 'horse', speedShip: 'ship', speedAir: 'air' })) {
  $(`#${id}`).addEventListener('input', (event) => {
    state.travelSpeeds[property] = Math.max(0.01, Number(event.target.value) || 0.01);
    if (selectedLayer()?.type === 'path') fillPathInspector(selectedLayer());
  });
}
for (const [id, property] of Object.entries({ terrainWaterShallow: 'shallow', terrainWaterMedium: 'medium', terrainWaterDeep: 'deep', terrainLandColor: 'land', terrainCoastLandColor: 'coastLand', terrainCoastWaveColor: 'coastWave' })) {
  $(`#${id}`).addEventListener('input', (event) => {
    state.terrainColors[property] = event.target.value;
    state.layers.filter((layer) => layer.type === 'terrain' && layer.heightMap).forEach((layer) => renderTerrainHeight(layer));
  });
}
for (const [id, property] of Object.entries({ terrainCoastLandThickness: 'coastLandThickness', terrainCoastWaveThickness: 'coastWaveThickness', terrainCoastNoiseMultiplier: 'coastNoiseMultiplier' })) {
  $(`#${id}`).addEventListener('input', (event) => { state.terrainColors[property] = Number(event.target.value); state.layers.filter((layer) => layer.type === 'terrain' && layer.heightMap).forEach((layer) => renderTerrainHeight(layer)); });
}
$('#terrainCoastVariation').addEventListener('change', (event) => { state.terrainColors.coastVariation = event.target.checked; state.layers.filter((layer) => layer.type === 'terrain' && layer.heightMap).forEach((layer) => renderTerrainHeight(layer)); });
$('#assetInput').addEventListener('change', async (event) => {
  for (const file of event.target.files) pendingSetAssets.push({ file: { name: file.name }, image: await fileImage(file) });
  $('#newSetFiles').textContent = pendingSetAssets.length ? `${pendingSetAssets.length} imagem(ns) selecionada(s)` : 'Nenhuma imagem selecionada';
  $('#createSetBtn').disabled = !pendingSetAssets.length;
  renderEditingSetAssets();
});
$('#createSetBtn').onclick = () => {
  const name = $('#setName').value.trim() || `Conjunto ${state.imageSets.length + 1}`;
  if (editingSetId) {
    const set = state.imageSets.find((item) => item.id === editingSetId);
    set.name = name; set.assets = pendingSetAssets;
  } else {
    state.imageSets.push({ id: crypto.randomUUID?.() || `${Date.now()}`, name, assets: pendingSetAssets });
  }
  editingSetId = null;
  pendingSetAssets = [];
  $('#setName').value = '';
  $('#assetInput').value = '';
  $('#newSetFiles').textContent = 'Nenhuma imagem selecionada';
  $('#createSetBtn').disabled = true;
  $('#createSetBtn').textContent = 'Criar conjunto';
  renderEditingSetAssets();
  renderImageSets();
  populateObjectOptions();
};

function renderImageSets() {
  const list = $('#setList');
  list.replaceChildren();
  const term = $('#assetSetSearch').value.trim().toLocaleLowerCase();
  const visibleSets = state.imageSets.filter((set) => set.name.toLocaleLowerCase().includes(term));
  for (const set of visibleSets) {
    const item = document.createElement('div');
    item.className = 'image-set';
    item.innerHTML = '<img class="set-thumbnail" alt=""><div><b></b><small></small></div><button class="edit-set" title="Editar">✎</button><button class="use-set">Usar</button>';
    const thumbnail = item.querySelector('.set-thumbnail'); thumbnail.src = set.assets[0]?.image.src || ''; thumbnail.alt = set.name;
    item.querySelector('b').textContent = set.name;
    item.querySelector('small').textContent = `${set.assets.length} imagem(ns)`;
    item.querySelector('.edit-set').onclick = () => {
      editingSetId = set.id;
      pendingSetAssets = [...set.assets];
      $('#setName').value = set.name;
      $('#newSetFiles').textContent = `${pendingSetAssets.length} imagem(ns)`;
      $('#createSetBtn').textContent = 'Salvar alterações';
      $('#createSetBtn').disabled = false;
      renderEditingSetAssets();
    };
    item.querySelector('.use-set').onclick = () => {
      const layer = selectedLayer();
      if (layer.type === 'object') {
        layer.object.iconSetId = set.id;
        populateObjectOptions();
        $('#objectIconSet').value = set.id;
        renderObjectThumbnails(layer.object);
        renderObjectAnchorPreview(layer.object);
        renderObjectIconTrigger(layer.object);
        redraw();
        $('#assetModal').hidden = true;
        return;
      }
      const existing = new Set(layer.assets.map((asset) => asset.image.src));
      layer.assets.push(...set.assets.filter((asset) => !existing.has(asset.image.src)).map((asset) => ({ ...asset })));
      renderAssets(); updateReadyState();
      $('#assetModal').hidden = true;
    };
    list.append(item);
  }
  if (!visibleSets.length) list.innerHTML = `<div class="set-empty">${state.imageSets.length ? 'Nenhum conjunto encontrado.' : 'Nenhum conjunto criado ainda.'}</div>`;
  translateDocument(list);
}
$('#assetSetSearch').addEventListener('input', renderImageSets);

function renderEditingSetAssets() {
  const list = $('#editingSetAssets');
  list.replaceChildren(...pendingSetAssets.map((asset, index) => {
    const item = document.createElement('div'); item.className = 'editing-asset';
    const image = new Image(); image.src = asset.image.src; image.alt = asset.file.name;
    const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remover';
    remove.onclick = () => { pendingSetAssets.splice(index, 1); renderEditingSetAssets(); $('#createSetBtn').disabled = !pendingSetAssets.length; };
    item.append(image, remove); return item;
  }));
}

const SET_PACKAGE_FORMAT = 'atlasmith-image-sets';

const exportSetSelection = new Set();
function selectedExportSetIds() { return [...exportSetSelection]; }

function updateExportSetsButton() {
  $('#confirmExportSets').disabled = !selectedExportSetIds().length;
}

function renderExportSetList() {
  const list = $('#exportSetList');
  list.replaceChildren(...state.imageSets.map((set) => {
    const label = document.createElement('label'); label.className = 'export-set-option';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = set.id;
    checkbox.checked = exportSetSelection.has(set.id);
    const name = document.createElement('b'); name.textContent = set.name;
    const count = document.createElement('small'); count.textContent = `${set.assets.length} imagem(ns)`;
    checkbox.onchange = () => { if (checkbox.checked) exportSetSelection.add(set.id); else exportSetSelection.delete(set.id); updateExportSetsButton(); };
    label.append(checkbox, name, count); return label;
  }));
  if (!state.imageSets.length) list.innerHTML = '<div class="set-empty">Nenhum conjunto disponível para exportar.</div>';
  updateExportSetsButton();
}

function openExportSetsModal() {
  exportSetSelection.clear();
  renderExportSetList();
  $('#exportSetsModal').hidden = false;
}

async function portableAssetSource(asset) {
  if (asset.image.src.startsWith('data:')) return asset.image.src;
  if (!asset.image.complete) await new Promise((resolve, reject) => { asset.image.addEventListener('load', resolve, { once: true }); asset.image.addEventListener('error', reject, { once: true }); });
  const width = asset.image.naturalWidth, height = asset.image.naturalHeight;
  if (!width || !height) throw new Error(`Não foi possível carregar ${asset.file.name}`);
  // Read the original bytes instead of redrawing the image. Redrawing local or
  // CDN assets can taint the temporary canvas and make toDataURL throw.
  const response = await fetch(asset.image.currentSrc || asset.image.src);
  if (!response.ok) throw new Error(`Não foi possível incluir ${asset.file.name} (${response.status})`);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Não foi possível ler ${asset.file.name}`));
    reader.readAsDataURL(blob);
  });
}

async function exportImageSets(setIds) {
  const selected = state.imageSets.filter((set) => setIds.includes(set.id));
  const sets = await Promise.all(selected.map(async (set) => ({
    id: set.id,
    name: set.name,
    assets: await Promise.all(set.assets.map(async (asset) => ({ ...serializeAsset(asset), source: await portableAssetSource(asset) }))),
  })));
  const packageData = { format: SET_PACKAGE_FORMAT, version: 1, exportedAt: new Date().toISOString(), sets };
  downloadFile('atlasmith-conjuntos.atlasmith-sets', JSON.stringify(packageData, null, 2), 'application/json');
}

$('#selectAllExportSets').onclick = () => { document.querySelectorAll('#exportSetList input').forEach((input) => { input.checked = true; exportSetSelection.add(input.value); }); updateExportSetsButton(); };
$('#clearExportSets').onclick = () => { exportSetSelection.clear(); document.querySelectorAll('#exportSetList input').forEach((input) => { input.checked = false; }); updateExportSetsButton(); };
$('#closeExportSets').onclick = () => { $('#exportSetsModal').hidden = true; };
$('#exportSetsModal').addEventListener('click', (event) => { if (event.target === $('#exportSetsModal')) $('#exportSetsModal').hidden = true; });
$('#confirmExportSets').onclick = async () => {
  const button = $('#confirmExportSets'); button.disabled = true; button.textContent = 'Preparando…';
  try { await exportImageSets(selectedExportSetIds()); $('#exportSetsModal').hidden = true; $('#saveState').textContent = 'Conjuntos exportados'; }
  catch (error) { window.alert(`Não foi possível exportar: ${error.message}`); }
  finally { button.textContent = 'Exportar selecionados'; updateExportSetsButton(); }
};

$('#setPackageInput').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const packageData = JSON.parse(await file.text());
    if (packageData.format !== SET_PACKAGE_FORMAT || packageData.version !== 1 || !Array.isArray(packageData.sets)) throw new Error('Pacote de conjuntos inválido ou incompatível');
    const importedSets = await Promise.all(packageData.sets.map(async (set) => {
      if (!set.id || !set.name || !Array.isArray(set.assets) || !set.assets.length || set.assets.some((asset) => typeof asset.source !== 'string' || !asset.source.startsWith('data:image/'))) throw new Error('Um conjunto do pacote está incompleto');
      return {
        id: String(set.id), name: String(set.name),
        assets: await Promise.all(set.assets.map(async (asset) => ({ file: { name: String(asset.name || 'imagem.png') }, image: await imageFromSource(asset.source), anchorX: asset.anchorX ?? 0.5, anchorY: asset.anchorY ?? 0.5 }))),
      };
    }));
    for (const imported of importedSets) {
      const existingIndex = state.imageSets.findIndex((set) => set.id === imported.id);
      if (existingIndex >= 0) state.imageSets[existingIndex] = imported;
      else state.imageSets.push(imported);
    }
    populateObjectOptions(); renderImageSets();
    $('#saveState').textContent = `${importedSets.length} conjunto(s) importado(s)`;
  } catch (error) { window.alert(`Não foi possível importar: ${error.message}`); }
  finally { event.target.value = ''; }
});

const objectBindings = {
  objectName: 'name', objectType: 'type', objectIconSet: 'iconSetId',
  objectGallerySet: 'gallerySetId', objectDescription: 'description', objectPoi: 'poi',
};
for (const [elementId, property] of Object.entries(objectBindings)) {
  $(`#${elementId}`).addEventListener(elementId === 'objectPoi' ? 'change' : 'input', (event) => {
    const layer = selectedLayer();
    if (layer.type !== 'object') return;
    layer.object[property] = elementId === 'objectPoi' ? event.target.checked : event.target.value;
    if (property === 'name') { layer.name = event.target.value || 'Objeto'; $('#layerName').value = layer.name; renderLayers(); }
    if (property === 'iconSetId' || property === 'gallerySetId') renderObjectThumbnails(layer.object);
    if (property === 'iconSetId') renderObjectAnchorPreview(layer.object);
    redraw();
  });
}
const pathBindings = { pathName: 'name', pathDescription: 'description', pathGallerySet: 'gallerySetId', pathShowOnMap: 'showOnMap' };
for (const [elementId, property] of Object.entries(pathBindings)) {
  $(`#${elementId}`).addEventListener(elementId === 'pathShowOnMap' ? 'change' : 'input', (event) => {
    const layer = selectedLayer(); if (layer.type !== 'path') return;
    layer.path[property] = elementId === 'pathShowOnMap' ? event.target.checked : event.target.value;
    if (property === 'name') { layer.name = event.target.value || 'Caminho'; $('#layerName').value = layer.name; renderLayers(); }
    redraw();
  });
}
$('#pathPreset').addEventListener('change', (event) => {
  const layer = selectedLayer(); if (layer.type !== 'path') return;
  if (event.target.value !== '__new__') layer.path.presetId = event.target.value;
  renderPathPresets(event.target.value); redraw();
});
$('#savePathPreset').onclick = () => {
  const selectedId = $('#pathPreset').value;
  const values = { name: $('#pathPresetName').value.trim() || `Preset ${state.pathPresets.length + 1}`, stroke: Number($('#pathStroke').value), color: $('#pathColor').value, dashed: $('#pathDashed').checked, dashGap: Number($('#pathDashGap').value) };
  let preset = state.pathPresets.find((item) => item.id === selectedId);
  if (preset) Object.assign(preset, values);
  else { preset = { id: crypto.randomUUID?.() || `${Date.now()}`, ...values }; state.pathPresets.push(preset); }
  const layer = selectedLayer(); layer.path.presetId = preset.id; renderPathPresets(preset.id); redraw();
};
$('#deletePathPreset').onclick = () => {
  const id = $('#pathPreset').value; if (id === '__new__') return;
  state.pathPresets = state.pathPresets.filter((preset) => preset.id !== id);
  if (!state.pathPresets.length) state.pathPresets.push({ id: 'road', name: 'Estrada', stroke: 8, color: '#c99b57', dashed: false, dashGap: 12 });
  const fallback = state.pathPresets[0]?.id || '__new__';
  state.layers.filter((layer) => layer.type === 'path' && layer.path.presetId === id).forEach((layer) => { layer.path.presetId = fallback; });
  renderPathPresets(fallback); redraw();
};
$('#regionName').addEventListener('input', (event) => {
  const layer = selectedLayer(); if (layer.type !== 'region') return;
  layer.region.name = event.target.value; layer.name = event.target.value || 'Região';
  $('#layerName').value = layer.name; renderLayers();
});
$('#regionPreset').addEventListener('change', async (event) => {
  const layer = selectedLayer(); if (layer.type !== 'region') return;
  if (event.target.value !== '__new__') {
    const preset = state.regionPresets.find((item) => item.id === event.target.value);
    applyRegionPreset(layer.region, preset);
    if (layer.mask) await applyRegionPriority(layer);
  }
  renderRegionPresets(event.target.value); renderLayers(); redraw();
});
$('#saveRegionPreset').onclick = async () => {
  const selectedId = $('#regionPreset').value;
  const values = { name: $('#regionPresetName').value.trim() || `Tipo ${state.regionPresets.length + 1}`, color: $('#regionColor').value, fillMode: $('#regionFillMode').value, outlineThickness: Number($('#regionOutlineThickness').value), outlineDashed: $('#regionOutlineDashed').checked, outlineGap: Number($('#regionOutlineGap').value), defaultOverview: $('#regionDefaultOverview').checked };
  let preset = state.regionPresets.find((item) => item.id === selectedId);
  if (preset) Object.assign(preset, values);
  else { preset = { id: crypto.randomUUID?.() || `${Date.now()}`, ...values }; state.regionPresets.push(preset); }
  const layer = selectedLayer();
  state.layers.filter((item) => item.type === 'region' && (item === layer || item.region.presetId === preset.id)).forEach((item) => applyRegionPreset(item.region, preset));
  if (layer.mask) await applyRegionPriority(layer);
  renderRegionPresets(preset.id); renderLayers(); redraw();
};
$('#deleteRegionPreset').onclick = () => {
  const id = $('#regionPreset').value; if (id === '__new__') return;
  state.regionPresets = state.regionPresets.filter((preset) => preset.id !== id);
  if (!state.regionPresets.length) state.regionPresets.push({ id: 'regions', name: 'Regiões', color: '#6fa86b', fillMode: 'fill', outlineThickness: 3, outlineDashed: false, outlineGap: 12, defaultOverview: false });
  const fallback = state.regionPresets[0];
  state.layers.filter((layer) => layer.type === 'region' && layer.region.presetId === id).forEach((layer) => applyRegionPreset(layer.region, fallback));
  renderRegionPresets(fallback.id); renderLayers(); redraw();
};
$('#positionObject').onclick = () => {
  state.placingObject = true;
  $('#positionObject').classList.add('active');
  $('#positionObject').textContent = 'Clique no mapa…';
};
$('#drawPath').onclick = () => {
  const layer = selectedLayer(); if (layer.type !== 'path') return;
  if (state.drawingPath) {
    state.drawingPath = false;
    layer.path.distance = calculatePathDistance(layer.path.points);
    $('#drawPath').textContent = '〰 Desenhar caminho'; $('#drawPath').classList.remove('active');
    fillPathInspector(layer); redraw();
  } else {
    layer.path.points = []; layer.path.distance = 0; state.drawingPath = true;
    $('#drawPath').textContent = '✓ Concluir caminho'; $('#drawPath').classList.add('active'); redraw();
  }
};
['objectX', 'objectY'].forEach((id) => {
  $(`#${id}`).addEventListener('input', (event) => {
    const object = selectedLayer().object;
    object[id === 'objectX' ? 'x' : 'y'] = event.target.value === '' ? null : Number(event.target.value);
    $('#objectPosition').textContent = object.x === null || object.y === null ? 'Ainda não posicionado' : `Posição: ${Math.round(object.x)}, ${Math.round(object.y)}`;
    redraw();
  });
});

let terrainAutoGenerateTimer = 0;
function scheduleTerrainAutoGenerate() {
  clearTimeout(terrainAutoGenerateTimer);
  const layerId = selectedLayer()?.id;
  terrainAutoGenerateTimer = setTimeout(() => {
    const layer = state.layers.find((item) => item.id === layerId);
    if (layer?.type === 'terrain' && layer.mask && layer.assets.length) generate(layer);
  }, 280);
}

['density', 'scale', 'sizeMin', 'sizeMax'].forEach((id) => {
  $(`#${id}`).addEventListener('input', (event) => {
    const layer = selectedLayer();
    layer.settings[id] = Number(event.target.value);
    if (id === 'sizeMin' && layer.settings.sizeMin > layer.settings.sizeMax) layer.settings.sizeMax = layer.settings.sizeMin;
    if (id === 'sizeMax' && layer.settings.sizeMax < layer.settings.sizeMin) layer.settings.sizeMin = layer.settings.sizeMax;
    $('#sizeMin').value = layer.settings.sizeMin;
    $('#sizeMax').value = layer.settings.sizeMax;
    updateOutputs();
    scheduleTerrainAutoGenerate();
  });
});
['imageOffsetX', 'imageOffsetY', 'imageOpacity'].forEach((id) => {
  $(`#${id}`).addEventListener('input', (event) => {
    selectedLayer().settings[id] = Number(event.target.value);
    $(`#${id}Value`).value = id === 'imageOpacity' ? Math.round(event.target.value * 100) : event.target.value;
    redraw();
  });
});
const objectVisualBindings = { objectScale: 'scale', objectOpacity: 'opacity', objectOffsetX: 'offsetX', objectOffsetY: 'offsetY' };
for (const [id, property] of Object.entries(objectVisualBindings)) {
  $(`#${id}`).addEventListener('input', (event) => {
    selectedLayer().object[property] = Number(event.target.value);
    $(`#${id}Value`).value = id === 'objectOpacity' ? Math.round(event.target.value * 100) : event.target.value;
    redraw();
  });
}

function bindNumberInput(valueId, rangeId, applyValue, factor = 1) {
  $(`#${valueId}`).addEventListener('change', (event) => {
    const range = $(`#${rangeId}`);
    const raw = Number(event.target.value) / factor;
    const value = Math.max(Number(range.min), Math.min(Number(range.max), raw));
    range.value = value;
    event.target.value = value * factor;
    applyValue(value);
  });
}
bindNumberInput('densityValue', 'density', (value) => { selectedLayer().settings.density = value; scheduleTerrainAutoGenerate(); });
bindNumberInput('scaleValue', 'scale', (value) => { selectedLayer().settings.scale = value; scheduleTerrainAutoGenerate(); });
bindNumberInput('imageOffsetXValue', 'imageOffsetX', (value) => { selectedLayer().settings.imageOffsetX = value; redraw(); });
bindNumberInput('imageOffsetYValue', 'imageOffsetY', (value) => { selectedLayer().settings.imageOffsetY = value; redraw(); });
bindNumberInput('imageOpacityValue', 'imageOpacity', (value) => { selectedLayer().settings.imageOpacity = value; redraw(); }, 100);
bindNumberInput('objectScaleValue', 'objectScale', (value) => { selectedLayer().object.scale = value; redraw(); });
bindNumberInput('objectOpacityValue', 'objectOpacity', (value) => { selectedLayer().object.opacity = value; redraw(); }, 100);
bindNumberInput('objectOffsetXValue', 'objectOffsetX', (value) => { selectedLayer().object.offsetX = value; redraw(); });
bindNumberInput('objectOffsetYValue', 'objectOffsetY', (value) => { selectedLayer().object.offsetY = value; redraw(); });
$('#sizeVariation').addEventListener('change', (event) => {
  selectedLayer().settings.sizeVariation = event.target.checked;
  updateOutputs(); scheduleTerrainAutoGenerate();
});
$('#seed').addEventListener('input', (event) => { selectedLayer().settings.seed = event.target.value; scheduleTerrainAutoGenerate(); });
$('#standardizedDistribution').addEventListener('change', (event) => { selectedLayer().settings.standardizedDistribution = event.target.checked; scheduleTerrainAutoGenerate(); });
$('#rotation').addEventListener('change', (event) => { selectedLayer().settings.rotation = event.target.checked; scheduleTerrainAutoGenerate(); });
$('#mirror').addEventListener('change', (event) => { selectedLayer().settings.mirror = event.target.checked; scheduleTerrainAutoGenerate(); });
$('#slice').addEventListener('change', (event) => { selectedLayer().settings.slice = event.target.checked; scheduleTerrainAutoGenerate(); });
$('#terrainCreateRegion').addEventListener('change', (event) => {
  const layer = selectedLayer(); if (layer?.type !== 'terrain') return;
  layer.settings.createRegion = event.target.checked;
  $('#terrainRegionLinkField').hidden = !event.target.checked;
});
$('#terrainRegionLink').addEventListener('change', (event) => {
  const layer = selectedLayer(); if (layer?.type === 'terrain') layer.settings.regionLayerId = event.target.value;
});
const maskEditCanvas = $('#maskEditCanvas');
const maskEditContext = maskEditCanvas.getContext('2d', { willReadFrequently: true });
let maskTool = 'brush';
let maskDrawing = false;
let maskPanning = false;
let maskPanX = 0;
let maskPanY = 0;
let maskPaintPointerId = null;
let maskHistory = [];
function maskChunkSize() { return state.maskChunkSize; }
let strokeDirtyChunks = new Set();
let strokeChunkSnapshots = new Map();
let maskChunkSaveChain = Promise.resolve();
let lastTerrainPaintPoint = null;
let lastTerrainHeightLevel = '';
let heightLevelPopupTimer = 0;
let brushRepetitionTimer = 0;
let lastMaskPointerEvent = null;
const brushCursor = $('#brushCursor');

function maskChunkBounds(key) {
  const [column, row] = key.split(':').map(Number);
  const x = column * maskChunkSize(), y = row * maskChunkSize();
  return { key, x, y, width: Math.min(maskChunkSize(), canvas.width - x), height: Math.min(maskChunkSize(), canvas.height - y) };
}

function markMaskChunksDirty(x, y, width, height) {
  const left = Math.max(0, Math.floor(x)), top = Math.max(0, Math.floor(y));
  const right = Math.min(canvas.width - 1, Math.ceil(x + width) - 1), bottom = Math.min(canvas.height - 1, Math.ceil(y + height) - 1);
  if (right < left || bottom < top) return;
  for (let row = Math.floor(top / maskChunkSize()); row <= Math.floor(bottom / maskChunkSize()); row++) for (let column = Math.floor(left / maskChunkSize()); column <= Math.floor(right / maskChunkSize()); column++) {
    const key = `${column}:${row}`;
    if (!strokeChunkSnapshots.has(key)) {
      const bounds = maskChunkBounds(key);
      strokeChunkSnapshots.set(key, { ...bounds, pixels: maskEditContext.getImageData(bounds.x, bounds.y, bounds.width, bounds.height) });
    }
    strokeDirtyChunks.add(key);
  }
}

function canvasChunkBlob(chunkCanvas) {
  return new Promise((resolve, reject) => chunkCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível salvar o chunk')), 'image/png'));
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  });
}

async function flushPendingMaskChunks(label = 'Salvando chunks da máscara') {
  const pending = state.layers.flatMap((layer) => [
    ...[...(layer.pendingMaskChunks || new Map())].map(([key, chunk]) => ({ layer, key, chunk, pendingProperty: 'pendingMaskChunks', chunksProperty: 'maskChunks' })),
    ...[...(layer.pendingHeightChunks || new Map())].map(([key, chunk]) => ({ layer, key, chunk, pendingProperty: 'pendingHeightChunks', chunksProperty: 'heightChunks' })),
  ]);
  if (!pending.length) return maskChunkSaveChain;
  maskChunkSaveChain = maskChunkSaveChain.then(async () => {
    showTaskProgress(label, 0);
    try {
      for (let index = 0; index < pending.length; index++) {
        const { layer, key, chunk, pendingProperty, chunksProperty } = pending[index];
        const chunkCanvas = document.createElement('canvas'); chunkCanvas.width = chunk.width; chunkCanvas.height = chunk.height;
        chunkCanvas.getContext('2d').putImageData(chunk.pixels, 0, 0);
        const source = await blobDataUrl(await canvasChunkBlob(chunkCanvas));
        layer[chunksProperty] ||= new Map();
        layer[chunksProperty].set(key, { x: chunk.x, y: chunk.y, width: chunk.width, height: chunk.height, source });
        if (layer[pendingProperty]?.get(key) === chunk) layer[pendingProperty].delete(key);
        updateTaskProgress(label, (index + 1) / pending.length * 100);
        await nextFrame();
      }
    } finally { hideTaskProgress(); }
  });
  return maskChunkSaveChain;
}

function showTerrainHeightLevel(value, force = false) {
  if (!state.terrainHeightEditing) return;
  const height = Math.max(0, Math.min(100, Number(value) || 0));
  const level = height < 30 ? ['Água profunda', state.terrainColors.deep] : height < 60 ? ['Água média', state.terrainColors.medium] : height < 90 ? ['Água rasa', state.terrainColors.shallow] : ['Terra', state.terrainColors.land];
  if (!force && level[0] === lastTerrainHeightLevel) return;
  lastTerrainHeightLevel = level[0];
  const popup = $('#heightLevelPopup');
  popup.textContent = `${level[0]} • Height ${Math.round(height)}`;
  popup.style.background = level[1];
  popup.hidden = false;
  requestAnimationFrame(() => popup.classList.add('visible'));
  clearTimeout(heightLevelPopupTimer);
  heightLevelPopupTimer = setTimeout(() => { popup.classList.remove('visible'); setTimeout(() => { popup.hidden = true; }, 180); }, 1400);
}

function perlinCoastNoise(x, y) {
  const hash = (ix, iy) => {
    const value = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const scale = 18, gx = x / scale, gy = y / scale, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
  const smoothX = tx * tx * (3 - 2 * tx), smoothY = ty * ty * (3 - 2 * ty);
  const top = hash(x0, y0) * (1 - smoothX) + hash(x0 + 1, y0) * smoothX;
  const bottom = hash(x0, y0 + 1) * (1 - smoothX) + hash(x0 + 1, y0 + 1) * smoothX;
  return top * (1 - smoothY) + bottom * smoothY;
}

function mixTerrainColor(base, overlay, amount) {
  const blend = Math.max(0, Math.min(1, amount));
  return base.map((channel, index) => Math.round(channel + (overlay[index] - channel) * blend));
}

function renderTerrainHeight(layer, sourceCanvas = null, dirty = null) {
  let source = sourceCanvas;
  if (!source && layer.heightMap) {
    source = document.createElement('canvas'); source.width = canvas.width; source.height = canvas.height;
    source.getContext('2d', { willReadFrequently: true }).drawImage(layer.heightMap, 0, 0, canvas.width, canvas.height);
  }
  if (!source?.width || !source.height) return;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  const coastBlur = 3;
  const maxThickness = Math.ceil(Math.max(state.terrainColors.coastLandThickness, state.terrainColors.coastWaveThickness) * (1 + state.terrainColors.coastNoiseMultiplier)) + coastBlur + 2;
  const expand = (rectangle, padding) => {
    const x = Math.max(0, Math.floor(rectangle.x - padding)), y = Math.max(0, Math.floor(rectangle.y - padding));
    return { x, y, width: Math.min(source.width, Math.ceil(rectangle.x + rectangle.width + padding)) - x, height: Math.min(source.height, Math.ceil(rectangle.y + rectangle.height + padding)) - y };
  };
  // Repaint only the changed area plus its coast, but sample an additional
  // margin. The second margin prevents the readback rectangle from becoming a
  // fake coastline—the source of the former square seams around brush strokes.
  const paintRegion = dirty ? expand(dirty, maxThickness) : { x: 0, y: 0, width: source.width, height: source.height };
  const sampleRegion = dirty ? expand(paintRegion, maxThickness) : paintRegion;
  const heightData = sourceContext.getImageData(sampleRegion.x, sampleRegion.y, sampleRegion.width, sampleRegion.height);
  const output = layer.heightOutput;
  if (output.width !== source.width || output.height !== source.height) { output.width = source.width; output.height = source.height; }
  const outputContext = output.getContext('2d');
  const colored = outputContext.createImageData(paintRegion.width, paintRegion.height);
  const colors = [state.terrainColors.deep, state.terrainColors.medium, state.terrainColors.shallow, state.terrainColors.land].map((color) => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]);
  const coastColors = [state.terrainColors.coastLand, state.terrainColors.coastWave].map((color) => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]);
  const offsetX = paintRegion.x - sampleRegion.x, offsetY = paintRegion.y - sampleRegion.y;
  for (let py = 0; py < paintRegion.height; py++) for (let px = 0; px < paintRegion.width; px++) {
    const sx = px + offsetX, sy = py + offsetY;
    const sourceIndex = (sy * sampleRegion.width + sx) * 4, outputIndex = (py * paintRegion.width + px) * 4;
    const height = 1 - heightData.data[sourceIndex] / 255;
    const land = height >= 0.9;
    const worldX = paintRegion.x + px, worldY = paintRegion.y + py;
    const noise = state.terrainColors.coastVariation ? 1 + (perlinCoastNoise(worldX, worldY) - 0.5) * 2 * state.terrainColors.coastNoiseMultiplier : 1;
    const thickness = Math.max(0, (land ? state.terrainColors.coastLandThickness : state.terrainColors.coastWaveThickness) * noise);
    const searchRadius = Math.ceil(thickness + coastBlur);
    let coastDistance = Infinity;
    for (let distance = 1; distance <= searchRadius && !Number.isFinite(coastDistance); distance++) for (const [dx, dy] of [[-distance, 0], [distance, 0], [0, -distance], [0, distance], [-distance, -distance], [distance, -distance], [-distance, distance], [distance, distance]]) {
      const nx = sx + dx, ny = sy + dy;
      if (nx >= 0 && ny >= 0 && nx < sampleRegion.width && ny < sampleRegion.height) {
        const neighborHeight = 1 - heightData.data[(ny * sampleRegion.width + nx) * 4] / 255;
        if ((neighborHeight >= 0.9) !== land) { coastDistance = Math.hypot(dx, dy); break; }
      }
    }
    const baseColor = height < 0.3 ? colors[0] : height < 0.6 ? colors[1] : height < 0.9 ? colors[2] : colors[3];
    const coastRange = thickness + coastBlur;
    const coastAmount = Number.isFinite(coastDistance) && coastRange > 0 ? Math.max(0, Math.min(1, (coastRange - coastDistance + 1) / Math.max(1, coastBlur + 1))) : 0;
    const smoothCoastAmount = coastAmount * coastAmount * (3 - 2 * coastAmount);
    const color = mixTerrainColor(baseColor, coastColors[land ? 0 : 1], smoothCoastAmount * 0.9);
    colored.data[outputIndex] = color[0]; colored.data[outputIndex + 1] = color[1]; colored.data[outputIndex + 2] = color[2]; colored.data[outputIndex + 3] = 255;
  }
  outputContext.putImageData(colored, paintRegion.x, paintRegion.y);
  redraw();
}

async function openTerrainHeightEditor(layer) {
  if (!layer || !['ground', 'terrain'].includes(layer.type)) return;
  showTaskProgress('Preparando editor de ground/base', 5);
  try {
    await nextFrame();
    stage.style.display = 'block'; $('#emptyState').style.display = 'none';
    maskEditCanvas.width = canvas.width; maskEditCanvas.height = canvas.height;
    maskEditContext.clearRect(0, 0, canvas.width, canvas.height);
    if (layer.heightMap) maskEditContext.drawImage(layer.heightMap, 0, 0, canvas.width, canvas.height);
    else { maskEditContext.fillStyle = '#fff'; maskEditContext.fillRect(0, 0, canvas.width, canvas.height); }
    updateTaskProgress('Carregando mapa de altura', 45); await nextFrame();
    state.terrainHeightEditing = layer.id; state.maskEditing = layer.id; maskHistory = [];
    maskEditCanvas.style.display = 'block'; maskEditCanvas.style.opacity = '0';
    $('#maskTools').hidden = false; $('#brushSizeControl').hidden = false;
    lastTerrainHeightLevel = '';
    $('#brushSizeControl span').textContent = 'Height'; $('#brushOpacity').max = '100'; $('#brushOpacity').step = '1'; $('#brushOpacity').value = '100'; $('#brushOpacity').dispatchEvent(new Event('input'));
    showTerrainHeightLevel(100, true);
    $('#terrainBrushPresets').hidden = false; $('#terrainBrushUpload').hidden = false; $('#clearTerrainBrush').hidden = !state.terrainBrushImage;
    $('#terrainBrushRotationLabel').hidden = false; $('#terrainBrushRotation').hidden = false; $('#terrainBrushRotationValue').hidden = false;
    updateTaskProgress('Renderizando ground/base', 65); await nextFrame();
    renderTerrainHeight(layer, maskEditCanvas); updateTaskProgress('Editor pronto', 100); $('#saveState').textContent = 'Editando altura do terreno';
  } finally { hideTaskProgress(); }
}

$('#editGroundHeight').onclick = async () => state.maskEditing === selectedLayer()?.id ? closeMaskEditor() : openTerrainHeightEditor(selectedLayer());
$('#groundMaskInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const layer = selectedLayer();
  if (!file || layer?.type !== 'ground') return;
  const source = await fileImage(file);
  const normalized = document.createElement('canvas'); normalized.width = canvas.width; normalized.height = canvas.height;
  const normalizedContext = normalized.getContext('2d', { willReadFrequently: true });
  normalizedContext.fillStyle = '#fff'; normalizedContext.fillRect(0, 0, normalized.width, normalized.height);
  normalizedContext.drawImage(source, 0, 0, normalized.width, normalized.height);
  const pixels = normalizedContext.getImageData(0, 0, normalized.width, normalized.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = Math.round((pixels.data[index] + pixels.data[index + 1] + pixels.data[index + 2]) / 3);
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = gray; pixels.data[index + 3] = 255;
  }
  normalizedContext.putImageData(pixels, 0, 0);
  layer.heightMap = await imageFromSource(normalized.toDataURL('image/png'));
  layer.maskName = file.name;
  $('#groundMaskName').textContent = file.name;
  renderGroundMaskPreview(layer);
  stage.style.display = 'block'; $('#emptyState').style.display = 'none';
  renderTerrainHeight(layer);
  redraw();
  $('#saveState').textContent = 'Máscara de ground/base aplicada';
  event.target.value = '';
});
$('#terrainBrushInput').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  state.terrainBrushImage = await fileImage(file); state.terrainBrushMode = 'image'; document.querySelectorAll('[data-terrain-brush]').forEach((item) => item.classList.remove('active')); $('#terrainBrushName').textContent = file.name; $('#clearTerrainBrush').hidden = false; event.target.value = '';
});
function setTerrainBrushRotation(value) {
  state.terrainBrushRotation = Math.max(0, Math.min(180, Math.round(Number(value) || 0)));
  $('#terrainBrushRotation').value = state.terrainBrushRotation;
  $('#terrainBrushRotationValue').value = state.terrainBrushRotation;
}
$('#terrainBrushRotation').addEventListener('input', (event) => setTerrainBrushRotation(event.target.value));
$('#terrainBrushRotationValue').addEventListener('input', (event) => setTerrainBrushRotation(event.target.value));
$('#clearTerrainBrush').onclick = () => { state.terrainBrushImage = null; state.terrainBrushMode = 'hard'; $('#terrainBrushName').textContent = ''; $('#clearTerrainBrush').hidden = true; document.querySelector('[data-terrain-brush="hard"]').classList.add('active'); };
document.querySelectorAll('[data-terrain-brush]').forEach((button) => {
  button.onclick = async () => {
    state.terrainBrushMode = button.dataset.terrainBrush;
    state.terrainBrushImage = button.dataset.brushSrc ? await imageFromSource(new URL(button.dataset.brushSrc, document.baseURI).href) : null;
    document.querySelectorAll('[data-terrain-brush]').forEach((item) => item.classList.toggle('active', item === button));
    $('#terrainBrushName').textContent = button.dataset.brushSrc?.split('/').pop() || '';
    $('#clearTerrainBrush').hidden = !state.terrainBrushImage;
  };
});

function paintTerrainHeight(layer, x, y, brushSize, renderPreview = true) {
  const radius = state.terrainBrushImage ? brushSize * Math.SQRT2 / 2 : brushSize / 2;
  const left = Math.max(0, Math.floor(x - radius)), top = Math.max(0, Math.floor(y - radius));
  const width = Math.min(maskEditCanvas.width, Math.ceil(x + radius)) - left, height = Math.min(maskEditCanvas.height, Math.ceil(y + radius)) - top;
  if (width <= 0 || height <= 0) return;
  const target = maskEditContext.getImageData(left, top, width, height);
  let customPixels = null;
  if (state.terrainBrushImage) {
    const brushCanvas = document.createElement('canvas'); brushCanvas.width = width; brushCanvas.height = height;
    const brushContext = brushCanvas.getContext('2d', { willReadFrequently: true });
    const rotation = (Math.random() * 2 - 1) * state.terrainBrushRotation * Math.PI / 180;
    brushContext.imageSmoothingEnabled = true;
    brushContext.translate(x - left, y - top); brushContext.rotate(rotation);
    brushContext.drawImage(state.terrainBrushImage, -brushSize / 2, -brushSize / 2, brushSize, brushSize);
    brushContext.setTransform(1, 0, 0, 1, 0, 0);
    customPixels = brushContext.getImageData(0, 0, width, height).data;
  }
  const selectedHeight = Math.max(0, Math.min(100, Number($('#brushOpacity').value)));
  const selectedGray = 255 - Math.round(selectedHeight / 100 * 255);
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const index = (py * width + px) * 4;
    const normalizedDistance = Math.hypot(left + px + 0.5 - x, top + py + 0.5 - y) / radius;
    if (!customPixels && normalizedDistance > 1) continue;
    let falloff;
    if (customPixels) {
      const alpha = customPixels[index + 3] / 255;
      if (alpha <= 0) continue;
      const darkness = 1 - (customPixels[index] + customPixels[index + 1] + customPixels[index + 2]) / 765;
      falloff = alpha * darkness;
    } else if (state.terrainBrushMode === 'soft') {
      falloff = Math.max(0, 1 - normalizedDistance);
    } else {
      // Mostly solid, with a small cosine feather so the continent edge is not pixel-perfect.
      const edge = Math.max(0, Math.min(1, (1 - normalizedDistance) / 0.16));
      falloff = edge * edge * (3 - 2 * edge);
    }
    const current = target.data[index];
    const blended = Math.round(current + (selectedGray - current) * falloff);
    // Eraser is a white brush. In this mode the Height slider becomes its
    // opacity, so repeated passes naturally restore the mask toward white.
    const next = maskTool === 'eraser'
      ? Math.round(current + (255 - current) * falloff * selectedHeight / 100)
      : Math.min(current, blended);
    target.data[index] = target.data[index + 1] = target.data[index + 2] = next; target.data[index + 3] = 255;
  }
  maskEditContext.putImageData(target, left, top);
  if (renderPreview) renderTerrainHeight(layer, maskEditCanvas, { x: left, y: top, width, height });
}

$('#createMaskBtn').onclick = () => {
  const layer = selectedLayer();
  if (state.maskEditing === layer.id) { closeMaskEditor(); return; }
  $('#brushOpacity').max = '1'; $('#brushOpacity').step = '0.01'; $('#brushOpacity').value = '1'; $('#brushOpacityValue').value = '100';
  maskEditCanvas.width = canvas.width; maskEditCanvas.height = canvas.height;
  maskEditContext.fillStyle = '#fff'; maskEditContext.fillRect(0, 0, canvas.width, canvas.height);
  if (layer.mask) maskEditContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
  state.maskEditing = layer.id;
  maskHistory = [];
  state.drag = false;
  viewport.classList.remove('dragging');
  maskEditCanvas.style.display = 'block'; maskEditCanvas.style.opacity = layer.type === 'terrain' ? '0.35' : '1';
  redraw();
  $('#maskTools').hidden = false; $('#brushSizeControl').hidden = false;
  const supportsTerrainBrushes = layer.type === 'terrain';
  $('#terrainBrushPresets').hidden = !supportsTerrainBrushes; $('#terrainBrushUpload').hidden = !supportsTerrainBrushes;
  $('#terrainBrushRotationLabel').hidden = !supportsTerrainBrushes; $('#terrainBrushRotation').hidden = !supportsTerrainBrushes; $('#terrainBrushRotationValue').hidden = !supportsTerrainBrushes;
  $('#createMaskBtn').textContent = 'Fechar editor';
  $('#saveState').textContent = 'Editando máscara • alterações automáticas';
};
document.querySelectorAll('[data-mask-tool]').forEach((button) => {
  button.onclick = () => {
    maskTool = button.dataset.maskTool;
    document.querySelectorAll('[data-mask-tool]').forEach((item) => item.classList.toggle('active', item === button));
    $('#brushSizeControl').hidden = maskTool === 'fill';
    if (state.terrainHeightEditing && maskTool !== 'fill') {
      $('#brushSizeControl > span').textContent = maskTool === 'eraser' ? 'Opacidade' : 'Height';
      if (maskTool === 'eraser') { $('#heightLevelPopup').hidden = true; $('#heightLevelPopup').classList.remove('visible'); }
      else showTerrainHeightLevel($('#brushOpacity').value, true);
    }
  };
});
$('#brushSize').oninput = (event) => {
  $('#brushSizeValue').value = event.target.value;
  brushCursor.style.width = `${event.target.value}px`; brushCursor.style.height = `${event.target.value}px`;
};
function setBrushRepetition(value) {
  state.terrainBrushRepetition = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  $('#brushRepetition').value = state.terrainBrushRepetition;
  $('#brushRepetitionValue').value = state.terrainBrushRepetition;
}
function brushStampSpacing(brushSize) {
  const repetition = state.terrainBrushRepetition / 100;
  // 0% leaves one brush-width between stamps; 100% stamps every canvas pixel.
  return Math.max(1, brushSize - repetition * (brushSize - 1));
}
$('#brushRepetition').addEventListener('input', (event) => setBrushRepetition(event.target.value));
$('#brushRepetitionValue').addEventListener('change', (event) => setBrushRepetition(event.target.value));
$('#brushOpacity').oninput = (event) => {
  $('#brushOpacityValue').value = state.terrainHeightEditing ? Math.round(event.target.value) : Math.round(event.target.value * 100);
  if (maskTool !== 'eraser') showTerrainHeightLevel(event.target.value);
};
$('#brushOpacityValue').addEventListener('change', (event) => {
  const heightMode = Boolean(state.terrainHeightEditing);
  const value = Math.max(0, Math.min(100, Number(event.target.value) || 0));
  event.target.value = value;
  $('#brushOpacity').value = heightMode ? value : value / 100;
  if (heightMode && maskTool !== 'eraser') showTerrainHeightLevel(value);
});
bindNumberInput('brushSizeValue', 'brushSize', () => {});
function paintDistributionStamp(x, y, brushSize) {
  const opacity = Number($('#brushOpacity').value);
  if (!state.terrainBrushImage) {
    maskEditContext.globalCompositeOperation = 'source-over'; maskEditContext.globalAlpha = opacity;
    maskEditContext.fillStyle = maskTool === 'eraser' ? '#fff' : '#000';
    maskEditContext.beginPath(); maskEditContext.arc(x, y, brushSize / 2, 0, Math.PI * 2); maskEditContext.fill();
    maskEditContext.globalAlpha = 1; return;
  }
  const stamp = document.createElement('canvas'); stamp.width = stamp.height = Math.max(1, Math.ceil(brushSize));
  const stampContext = stamp.getContext('2d');
  stampContext.drawImage(state.terrainBrushImage, 0, 0, stamp.width, stamp.height);
  stampContext.globalCompositeOperation = 'source-in'; stampContext.fillStyle = maskTool === 'eraser' ? '#fff' : '#000'; stampContext.fillRect(0, 0, stamp.width, stamp.height);
  const rotation = (Math.random() * 2 - 1) * state.terrainBrushRotation * Math.PI / 180;
  maskEditContext.save(); maskEditContext.globalAlpha = opacity; maskEditContext.translate(x, y); maskEditContext.rotate(rotation);
  maskEditContext.drawImage(stamp, -brushSize / 2, -brushSize / 2, brushSize, brushSize); maskEditContext.restore();
}

let maskCommitTimer = 0;
let maskCommitRevision = 0;
function scheduleMaskCommit(delay = 180) {
  clearTimeout(maskCommitTimer);
  maskCommitTimer = setTimeout(() => maskDrawing ? scheduleMaskCommit() : commitMaskEdits(), delay);
}

async function generateTerrainChunks(layer, chunks) {
  if (!layer.assets.length || !chunks.length) return;
  const dirtyKeys = new Set(chunks.map((chunk) => chunk.key));
  layer.placements = (layer.placements || []).filter((placement) => {
    const key = `${Math.floor(placement.x / maskChunkSize())}:${Math.floor(placement.y / maskChunkSize())}`;
    return !dirtyKeys.has(key);
  });
  const averageVariation = layer.settings.sizeVariation ? (layer.settings.sizeMin + layer.settings.sizeMax) / 2 : 1;
  const footprint = Math.max(1, 48 * layer.settings.scale * averageVariation);
  const smallScaleBoost = layer.settings.scale < 1 ? 1 + (1 - layer.settings.scale) : 1;
  const added = [];
  for (const chunk of chunks) {
    const random = randomFactory(hashSeed(`${layer.settings.seed}:${chunk.key}`));
    const area = chunk.width * chunk.height;
    const proportionalLimit = Math.max(1, Math.ceil(1250000 * area / (canvas.width * canvas.height)));
    const attempts = Math.min(proportionalLimit, Math.round(area / (footprint * footprint) * layer.settings.density / 100 * smallScaleBoost));
    for (let iteration = 0; iteration < attempts; iteration++) {
      if (iteration && iteration % 2500 === 0) await nextFrame();
      const x = chunk.x + random() * chunk.width, y = chunk.y + random() * chunk.height;
      const localX = Math.min(chunk.width - 1, Math.floor(x - chunk.x));
      const localY = Math.min(chunk.height - 1, Math.floor(y - chunk.y));
      const pixel = (localY * chunk.width + localX) * 4;
      const alpha = chunk.pixels.data[pixel + 3] / 255;
      const darkness = 1 - (chunk.pixels.data[pixel] + chunk.pixels.data[pixel + 1] + chunk.pixels.data[pixel + 2]) / 765;
      if (alpha * darkness <= 0 || random() > alpha * darkness) continue;
      const assetIndex = Math.floor(random() * layer.assets.length);
      added.push({ x, y, assetIndex, asset: layer.assets[assetIndex].image, variation: layer.settings.sizeVariation ? layer.settings.sizeMin + random() * (layer.settings.sizeMax - layer.settings.sizeMin) : 1, rotation: layer.settings.rotation ? random() * Math.PI * 2 : 0, mirrored: layer.settings.mirror && random() > 0.5 });
    }
  }
  layer.placements.push(...added);
  layer.placements.sort((first, second) => first.y - second.y);
  redraw();
  $('#saveState').textContent = `${chunks.length} chunk(s) atualizada(s) • ${added.length} objeto(s) renderizado(s)`;
}

async function commitMaskEdits() {
  clearTimeout(maskCommitTimer); maskCommitTimer = 0;
  // Yield before canvas reads, region prioritization, and terrain generation so
  // callers such as pointerup can finish without inheriting that expensive work.
  await nextFrame();
  const layer = state.layers.find((item) => item.id === state.maskEditing);
  if (!layer || !strokeDirtyChunks.size) return maskChunkSaveChain;
  const revision = ++maskCommitRevision;
  const heightMode = Boolean(state.terrainHeightEditing);
  const keys = [...strokeDirtyChunks];
  strokeDirtyChunks = new Set();
  const captured = keys.map((key) => {
    const bounds = maskChunkBounds(key);
    return { ...bounds, pixels: maskEditContext.getImageData(bounds.x, bounds.y, bounds.width, bounds.height) };
  });
  const dirtyRectangle = captured.reduce((dirty, chunk) => {
    if (!dirty) return { x: chunk.x, y: chunk.y, width: chunk.width, height: chunk.height };
    const right = Math.max(dirty.x + dirty.width, chunk.x + chunk.width);
    const bottom = Math.max(dirty.y + dirty.height, chunk.y + chunk.height);
    const x = Math.min(dirty.x, chunk.x), y = Math.min(dirty.y, chunk.y);
    return { x, y, width: right - x, height: bottom - y };
  }, null);
  const targetProperty = heightMode ? 'heightMap' : 'mask';
  const chunksProperty = heightMode ? 'heightChunks' : 'maskChunks';
  const pendingProperty = heightMode ? 'pendingHeightChunks' : 'pendingMaskChunks';
  if (!(layer[targetProperty] instanceof HTMLCanvasElement)) {
    const merged = document.createElement('canvas'); merged.width = canvas.width; merged.height = canvas.height;
    const mergedContext = merged.getContext('2d');
    if (layer[targetProperty]) {
      layer[`${targetProperty}BaseSource`] = layer[targetProperty].src || null;
      mergedContext.drawImage(layer[targetProperty], 0, 0, canvas.width, canvas.height);
    } else { mergedContext.fillStyle = '#fff'; mergedContext.fillRect(0, 0, canvas.width, canvas.height); }
    layer[targetProperty] = merged;
  }
  const mergedContext = layer[targetProperty].getContext('2d');
  captured.forEach((chunk) => mergedContext.putImageData(chunk.pixels, chunk.x, chunk.y));
  layer[chunksProperty] ||= new Map();
  layer[pendingProperty] ||= new Map();
  captured.forEach((chunk) => layer[pendingProperty].set(chunk.key, chunk));
  layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null;
  if (!heightMode) { layer.maskName = 'Máscara criada no editor'; $('#maskName').textContent = layer.maskName; updateReadyState(); }
  if (revision === maskCommitRevision) {
    if (heightMode) {
      // paintTerrainHeight already refreshed this area while the stroke was in
      // progress. Keep the union for callers that need an explicit partial
      // refresh, without performing the former full-canvas render on release.
      layer.heightDirtyRectangle = dirtyRectangle;
      $('#saveState').textContent = `${captured.length} chunk(s) de altura pendente(s)`;
    } else if (layer.type === 'region') await applyRegionPriority(layer);
    else if (layer.type === 'terrain' && layer.assets.length) await generateTerrainChunks(layer, captured);
    else { redraw(); $('#saveState').textContent = 'Máscara atualizada automaticamente'; }
  }
  return maskChunkSaveChain;
}

function paintMask(event) {
  if (!maskDrawing || maskPaintPointerId !== event.pointerId || !(event.buttons & 1)) return;
  const heightLayer = state.terrainHeightEditing ? state.layers.find((layer) => layer.id === state.terrainHeightEditing) : null;
  if (maskTool === 'fill') {
    markMaskChunksDirty(0, 0, canvas.width, canvas.height);
    if (heightLayer) {
      const data = maskEditContext.getImageData(0, 0, canvas.width, canvas.height);
      const level = 255 - Math.round(Math.max(0, Math.min(100, Number($('#brushOpacity').value))) / 100 * 255);
      for (let index = 0; index < data.data.length; index += 4) {
        data.data[index] = data.data[index + 1] = data.data[index + 2] = level; data.data[index + 3] = 255;
      }
      maskEditContext.putImageData(data, 0, 0); renderTerrainHeight(heightLayer, maskEditCanvas); maskDrawing = false; scheduleMaskCommit(); return;
    }
    maskEditContext.globalCompositeOperation = 'source-over';
    maskEditContext.globalAlpha = Number($('#brushOpacity').value);
    maskEditContext.fillStyle = maskTool === 'eraser' ? '#fff' : '#000'; maskEditContext.fillRect(0, 0, canvas.width, canvas.height); maskEditContext.globalAlpha = 1;
    maskDrawing = false; scheduleMaskCommit();
    return;
  }
  const rectangle = maskEditCanvas.getBoundingClientRect();
  const x = (event.clientX - rectangle.left) * canvas.width / rectangle.width;
  const y = (event.clientY - rectangle.top) * canvas.height / rectangle.height;
  const brushSize = Number($('#brushSize').value), radius = brushSize / 2;
  const dirtyRadius = state.terrainBrushImage ? brushSize * Math.SQRT2 / 2 : radius;
  markMaskChunksDirty(x - dirtyRadius, y - dirtyRadius, dirtyRadius * 2, dirtyRadius * 2);
  if (heightLayer) {
    if (lastTerrainPaintPoint) {
      const distance = Math.hypot(x - lastTerrainPaintPoint.x, y - lastTerrainPaintPoint.y);
      const steps = Math.max(1, Math.ceil(distance / brushStampSpacing(brushSize)));
      for (let step = 1; step <= steps; step++) paintTerrainHeight(heightLayer, lastTerrainPaintPoint.x + (x - lastTerrainPaintPoint.x) * step / steps, lastTerrainPaintPoint.y + (y - lastTerrainPaintPoint.y) * step / steps, brushSize, false);
      const radius = brushSize / 2, left = Math.min(lastTerrainPaintPoint.x, x) - radius, top = Math.min(lastTerrainPaintPoint.y, y) - radius;
      renderTerrainHeight(heightLayer, maskEditCanvas, { x: left, y: top, width: Math.abs(x - lastTerrainPaintPoint.x) + brushSize, height: Math.abs(y - lastTerrainPaintPoint.y) + brushSize });
    } else paintTerrainHeight(heightLayer, x, y, brushSize);
    lastTerrainPaintPoint = { x, y }; scheduleMaskCommit(); return;
  }
  else {
    const start = lastTerrainPaintPoint || { x, y };
    const distance = Math.hypot(x - start.x, y - start.y);
    const steps = Math.max(1, Math.ceil(distance / brushStampSpacing(brushSize)));
    for (let step = 1; step <= steps; step++) paintDistributionStamp(start.x + (x - start.x) * step / steps, start.y + (y - start.y) * step / steps, brushSize);
    lastTerrainPaintPoint = { x, y }; scheduleMaskCommit();
  }
}
function stopBrushRepetition() {
  clearTimeout(brushRepetitionTimer);
  brushRepetitionTimer = 0;
  lastMaskPointerEvent = null;
}
function scheduleBrushRepetition() {
  clearTimeout(brushRepetitionTimer);
  if (!maskDrawing || maskTool === 'fill' || !lastMaskPointerEvent) return;
  const clicksPerSecond = 1 + state.terrainBrushRepetition / 100 * 59;
  brushRepetitionTimer = setTimeout(() => {
    if (!maskDrawing || !lastMaskPointerEvent) return;
    paintMask(lastMaskPointerEvent);
    scheduleBrushRepetition();
  }, 1000 / clicksPerSecond);
}
maskEditCanvas.oncontextmenu = (event) => event.preventDefault();
const maskShortcutKeys = new Set();
document.addEventListener('keydown', (event) => maskShortcutKeys.add(event.key.toLowerCase()));
document.addEventListener('keyup', (event) => maskShortcutKeys.delete(event.key.toLowerCase()));
maskEditCanvas.addEventListener('wheel', (event) => {
  const resizeBrush = maskShortcutKeys.has('f') || event.altKey;
  const changeOpacity = maskShortcutKeys.has('s');
  if ((!resizeBrush && !changeOpacity) || maskTool === 'fill') return;
  event.preventDefault();
  event.stopPropagation();
  const control = changeOpacity ? $('#brushOpacity') : $('#brushSize');
  const step = changeOpacity ? 0.05 : 5;
  const nextValue = Math.max(Number(control.min), Math.min(Number(control.max), Number(control.value) + (event.deltaY < 0 ? step : -step)));
  control.value = nextValue;
  control.dispatchEvent(new Event('input', { bubbles: true }));
}, { passive: false });
maskEditCanvas.onpointerdown = (event) => {
  event.stopPropagation();
  if (event.button === 2) {
    brushCursor.style.display = 'none';
    maskPanning = true; maskPanX = event.clientX; maskPanY = event.clientY;
  } else if (event.button === 0) {
    strokeDirtyChunks = new Set(); strokeChunkSnapshots = new Map();
    maskDrawing = true; maskPaintPointerId = event.pointerId; lastTerrainPaintPoint = null;
    lastMaskPointerEvent = { pointerId: event.pointerId, buttons: 1, clientX: event.clientX, clientY: event.clientY };
    paintMask(event); scheduleBrushRepetition();
  } else return;
  maskEditCanvas.setPointerCapture(event.pointerId);
};
maskEditCanvas.onpointermove = (event) => {
  event.stopPropagation();
  if (maskPanning) {
    if (!(event.buttons & 2)) { maskPanning = false; return; }
    state.x += event.clientX - maskPanX; state.y += event.clientY - maskPanY;
    maskPanX = event.clientX; maskPanY = event.clientY; updateTransform();
  } else {
    const rectangle = maskEditCanvas.getBoundingClientRect();
    const x = (event.clientX - rectangle.left) * canvas.width / rectangle.width;
    const y = (event.clientY - rectangle.top) * canvas.height / rectangle.height;
    brushCursor.style.left = `${x}px`; brushCursor.style.top = `${y}px`;
    brushCursor.style.display = maskTool === 'fill' ? 'none' : 'block';
    if (!(event.buttons & 1)) { maskDrawing = false; maskPaintPointerId = null; stopBrushRepetition(); return; }
    lastMaskPointerEvent = { pointerId: event.pointerId, buttons: 1, clientX: event.clientX, clientY: event.clientY };
    paintMask(event);
  }
};
maskEditCanvas.onpointerleave = () => { if (!maskDrawing) brushCursor.style.display = 'none'; };
maskEditCanvas.onpointerenter = (event) => { if (!maskPanning && maskTool !== 'fill') maskEditCanvas.onpointermove(event); };
function stopMaskPointer(event) {
  event?.stopPropagation();
  const painted = maskDrawing;
  maskDrawing = false; maskPanning = false; maskPaintPointerId = null;
  lastTerrainPaintPoint = null;
  stopBrushRepetition();
  if (painted && state.maskEditing) {
    if (strokeChunkSnapshots.size) { maskHistory.push([...strokeChunkSnapshots.values()]); if (maskHistory.length > 20) maskHistory.shift(); }
    scheduleMaskCommit(0);
  }
}
maskEditCanvas.onpointerup = stopMaskPointer;
maskEditCanvas.onpointercancel = stopMaskPointer;
maskEditCanvas.onlostpointercapture = stopMaskPointer;
async function closeMaskEditor() {
  const editingId = state.maskEditing;
  const layer = state.layers.find((item) => item.id === editingId);
  await commitMaskEdits();
  if (state.maskEditing !== editingId) return;
  state.maskEditing = null; state.terrainHeightEditing = null; maskEditCanvas.style.display = 'none'; maskEditCanvas.style.opacity = '1'; $('#maskTools').hidden = true; $('#brushSizeControl').hidden = true;
  $('#brushSizeControl span').textContent = 'Opacidade'; $('#brushOpacity').max = '1';
  $('#terrainBrushPresets').hidden = true; $('#terrainBrushUpload').hidden = true; $('#clearTerrainBrush').hidden = true;
  $('#terrainBrushRotationLabel').hidden = true; $('#terrainBrushRotation').hidden = true; $('#terrainBrushRotationValue').hidden = true;
  brushCursor.style.display = 'none'; maskHistory = [];
  if (layer?.id === state.selectedId) $('#createMaskBtn').textContent = layer.mask ? t('editMask') : t('createMask');
  redraw(); $('#saveState').textContent = 'Edição finalizada';
}
document.addEventListener('keydown', async (event) => {
  if (!state.maskEditing || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
  event.preventDefault();
  const snapshot = maskHistory.pop();
  if (!snapshot) return;
  maskEditContext.globalCompositeOperation = 'source-over';
  strokeDirtyChunks = new Set(); strokeChunkSnapshots = new Map();
  snapshot.forEach((chunk) => { maskEditContext.putImageData(chunk.pixels, chunk.x, chunk.y); strokeDirtyChunks.add(chunk.key); });
  if (state.terrainHeightEditing) renderTerrainHeight(state.layers.find((layer) => layer.id === state.terrainHeightEditing), maskEditCanvas);
  scheduleMaskCommit(); $('#saveState').textContent = `Desfazer • ${maskHistory.length} restante(s)`;
});
$('#randomSeed').onclick = () => {
  selectedLayer().settings.seed = Math.random().toString(36).slice(2, 10);
  $('#seed').value = selectedLayer().settings.seed;
};
$('#generateBtn').onclick = () => { const layer = selectedLayer(); layer.settings.seed = Math.random().toString(36).slice(2, 10); $('#seed').value = layer.settings.seed; generate(layer); };

function renameLayer(layer) {
  if (!layer) return false;
  const name = window.prompt('Nome da camada:', layer.name);
  if (!name?.trim()) return false;
  layer.name = name.trim();
  if (layer.id === state.selectedId) $('#layerName').value = layer.name;
  return true;
}

function deleteLayer(layer) {
  if (!layer || !window.confirm(`Excluir a camada “${layer.name}”? Esta ação não pode ser desfeita.`)) return false;
  const index = state.layers.indexOf(layer);
  if (layer.type === 'folder') state.layers.forEach((item) => { if (item.parentId === layer.id) item.parentId = null; });
  state.layers.splice(index, 1);
  if (!state.layers.length) state.layers.push(createLayer());
  if (layer.id === state.selectedId) selectLayer(state.layers[Math.min(index, state.layers.length - 1)].id);
  return true;
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (event.altKey && key === 's') {
    event.preventDefault();
    saveProjectToHandle(event.ctrlKey);
    return;
  }
  if (isTypingTarget(event.target) || event.repeat) return;
  if (state.maskEditing && (key === 'e' || key === 'b')) {
    event.preventDefault();
    document.querySelector(`[data-mask-tool="${key === 'e' ? 'eraser' : 'brush'}"]`)?.click();
    return;
  }
  if (event.key === 'F2') {
    event.preventDefault();
    if (renameLayer(selectedLayer())) { renderLayers(); redraw(); }
  } else if (event.key === 'Delete') {
    event.preventDefault();
    if (deleteLayer(selectedLayer())) { renderLayers(); redraw(); }
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('#layerContextMenu')) $('#layerContextMenu').hidden = true;
});
$('#layerContextMenu').addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  const layer = state.layers.find((item) => item.id === state.contextLayerId);
  if (!action || !layer) return;
  if (action === 'rename') {
    renameLayer(layer);
  } else if (action === 'toggle') {
    layer.visible = !layer.visible;
    if (layer.type === 'folder') state.layers.forEach((item) => { if (item.parentId === layer.id) item.visible = layer.visible; });
  } else if (action === 'duplicate') {
    const duplicate = createLayer(layer.type);
    const preserved = ['name', 'visible', 'parentId', 'collapsed', 'mask', 'maskName', 'maskBaseSource', 'maskExportSource', 'heightMap', 'heightMapBaseSource', 'heightMapExportSource', 'image', 'imageName', 'assets', 'placements'];
    preserved.forEach((key) => { if (key in layer) duplicate[key] = layer[key]; });
    duplicate.name = `${layer.name} (cópia)`;
    duplicate.settings = { ...layer.settings };
    if (layer.object) duplicate.object = JSON.parse(JSON.stringify(layer.object));
    if (layer.region) duplicate.region = JSON.parse(JSON.stringify(layer.region));
    if (layer.path) duplicate.path = JSON.parse(JSON.stringify(layer.path));
    for (const key of ['output', 'heightOutput']) if (layer[key]?.width) { duplicate[key].width = layer[key].width; duplicate[key].height = layer[key].height; duplicate[key].getContext('2d').drawImage(layer[key], 0, 0); }
    const index = state.layers.indexOf(layer); state.layers.splice(index + 1, 0, duplicate); selectLayer(duplicate.id);
  } else if (action === 'delete') {
    deleteLayer(layer);
  }
  $('#layerContextMenu').hidden = true;
  if (layer.id === state.selectedId) $('#layerName').value = layer.name;
  renderLayers(); redraw();
});

function downloadFile(name, contents, type) {
  const link = document.createElement('a');
  link.download = name;
  link.href = URL.createObjectURL(new Blob([contents], { type }));
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function serializeAsset(asset) {
  return { name: asset.file.name, source: asset.image.src, anchorX: asset.anchorX, anchorY: asset.anchorY };
}

function serializedChunks(chunks) { return chunks instanceof Map ? [...chunks.values()] : []; }

async function drawableDataUrl(drawable) {
  if (!drawable) return null;
  if (drawable.src?.startsWith('data:')) return drawable.src;
  if (drawable instanceof HTMLCanvasElement) return blobDataUrl(await canvasChunkBlob(drawable));
  return portableAssetSource({ image: drawable, file: { name: 'imagem.png' } });
}

async function canvasFromChunks(chunks, fallbackSource = null) {
  if (!chunks?.length) return fallbackSource ? imageFromSource(fallbackSource) : null;
  const merged = document.createElement('canvas'); merged.width = canvas.width; merged.height = canvas.height;
  const context = merged.getContext('2d');
  if (fallbackSource) context.drawImage(await imageFromSource(fallbackSource), 0, 0, canvas.width, canvas.height);
  else { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index]; context.drawImage(await imageFromSource(chunk.source), chunk.x, chunk.y, chunk.width, chunk.height);
    updateTaskProgress('Abrindo chunks do projeto', (index + 1) / chunks.length * 100); await nextFrame();
  }
  return merged;
}

function createProjectData() {
  const maskObjects = state.layers.flatMap((layer) => [
    layer.mask ? { id: `${layer.id}:mask`, layerId: layer.id, kind: 'distribution', name: layer.maskName || `${layer.name} mask`, source: layer.mask.src || layer.maskBaseSource || null, chunks: serializedChunks(layer.maskChunks) } : null,
    layer.heightMap ? { id: `${layer.id}:height`, layerId: layer.id, kind: layer.type === 'ground' ? 'ground-base' : 'heightmap', name: layer.maskName || `${layer.name} height`, source: layer.heightMap.src || layer.heightMapBaseSource || null, chunks: serializedChunks(layer.heightChunks) } : null,
  ].filter(Boolean));
  return {
    format: 'teralium-map-project', version: 2,
    canvas: { width: canvas.width, height: canvas.height },
    selectedId: state.selectedId,
    pathPresets: state.pathPresets,
    regionPresets: state.regionPresets,
    poiTypes: state.poiTypes,
    distanceScaleKm: state.distanceScaleKm,
    travelSpeeds: state.travelSpeeds,
    descriptionTemplates: state.descriptionTemplates,
    terrainColors: state.terrainColors,
    terrainBrushRotation: state.terrainBrushRotation,
    terrainBrushRepetition: state.terrainBrushRepetition,
    mapFilter: state.mapFilter,
    maskChunkSize: state.maskChunkSize,
    debugChunkGrid: state.debugChunkGrid,
    theme: state.theme,
    maskObjects,
    imageSets: state.imageSets.map((set) => ({ id: set.id, name: set.name, assets: set.assets.map(serializeAsset) })),
    layers: state.layers.map((layer) => ({
      id: layer.id, type: layer.type, name: layer.name, visible: layer.visible, parentId: layer.parentId, collapsed: layer.collapsed, selectedAssetIndex: layer.selectedAssetIndex,
      maskObjectId: layer.mask ? `${layer.id}:mask` : null, heightMapObjectId: layer.heightMap ? `${layer.id}:height` : null,
      maskName: layer.maskName, maskSource: layer.mask?.src || null, heightMapSource: layer.heightMap?.src || null, imageSource: layer.image?.src || null,
      assets: layer.assets.map(serializeAsset), settings: layer.settings, object: layer.object, region: layer.region, path: layer.path,
      placements: (layer.placements || []).map(({ x, y, assetIndex, variation, rotation, mirrored }) => ({ x, y, assetIndex, variation, rotation, mirrored })),
      outputSource: layer.output.width ? layer.output.toDataURL('image/png') : null,
    })),
  };
}

$('#saveProjectBtn').onclick = async () => {
  showTaskProgress('Salvando projeto', 0);
  try {
    await flushPendingMaskChunks('Codificando chunks do projeto'); updateTaskProgress('Serializando projeto', 40); await nextFrame();
    const project = createProjectData(); updateTaskProgress('Preparando download', 85);
    downloadFile('projeto-teralium.json', JSON.stringify(project), 'application/json'); $('#saveState').textContent = 'Projeto salvo';
  } finally { hideTaskProgress(); }
};

$('#openProjectBtn').onclick = () => { state.projectFileHandle = null; $('#projectInput').click(); };
function projectJsonFromZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (name === 'projeto-teralium.json') return decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  throw new Error('Arquivo de projeto não encontrado no ZIP');
}
$('#projectInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  showTaskProgress('Abrindo projeto', 0);
  try {
    $('#saveState').textContent = 'Abrindo…';
    const projectText = file.name.toLowerCase().endsWith('.zip') ? projectJsonFromZip(await file.arrayBuffer()) : await file.text();
    const project = JSON.parse(projectText);
    if (project.format !== 'teralium-map-project') throw new Error('Formato inválido');
    canvas.width = project.canvas.width; canvas.height = project.canvas.height;
    state.pathPresets = project.pathPresets?.length ? project.pathPresets : state.pathPresets;
    state.regionPresets = project.regionPresets?.length ? project.regionPresets : state.regionPresets;
    state.poiTypes = project.poiTypes?.length ? project.poiTypes : state.poiTypes;
    state.distanceScaleKm = Number(project.distanceScaleKm) || 100;
    state.travelSpeeds = { ...state.travelSpeeds, ...project.travelSpeeds };
    state.descriptionTemplates = project.descriptionTemplates || [];
    state.terrainColors = { ...state.terrainColors, ...project.terrainColors };
    applyTheme(project.theme || state.theme);
    setTerrainBrushRotation(project.terrainBrushRotation || 0);
    setBrushRepetition(project.terrainBrushRepetition ?? 100);
    state.mapFilter = ['linear', 'balanced', 'nearest'].includes(project.mapFilter) ? project.mapFilter : 'linear';
    state.maskChunkSize = [128, 256, 512, 1024, 2048].includes(Number(project.maskChunkSize)) ? Number(project.maskChunkSize) : 512;
    state.debugChunkGrid = Boolean(project.debugChunkGrid); updateChunkDebugGrid();
    $('#mapFilterSetting').value = state.mapFilter; applyMapFilter();
    state.imageSets = await Promise.all(project.imageSets.map(async (set) => ({
      ...set, assets: await Promise.all(set.assets.map(async (asset) => ({ file: { name: asset.name }, image: await imageFromSource(asset.source), anchorX: asset.anchorX, anchorY: asset.anchorY }))),
    })));
    state.layers = await Promise.all(project.layers.map(async (saved) => {
      const layer = createLayer(saved.type);
      Object.assign(layer, { id: saved.id, name: saved.name, visible: saved.visible, parentId: saved.parentId || null, collapsed: Boolean(saved.collapsed), maskName: saved.maskName, selectedAssetIndex: saved.selectedAssetIndex || 0, settings: { ...layer.settings, ...saved.settings } });
      if (saved.object) layer.object = saved.object;
      if (saved.region) layer.region = { ...layer.region, ...saved.region };
      if (saved.path) layer.path = saved.path;
      const maskObject = project.maskObjects?.find((item) => item.id === saved.maskObjectId);
      const heightMapObject = project.maskObjects?.find((item) => item.id === saved.heightMapObjectId);
      const maskSource = maskObject?.source || saved.maskSource;
      const heightMapSource = heightMapObject?.source || saved.heightMapSource;
      if (maskSource || maskObject?.chunks?.length) {
        layer.mask = await canvasFromChunks(maskObject?.chunks, maskSource);
        layer.maskBaseSource = maskSource || null;
        layer.maskChunks = new Map((maskObject?.chunks || []).map((chunk, index) => [`saved:${index}:${chunk.x}:${chunk.y}`, chunk]));
      }
      if (heightMapSource || heightMapObject?.chunks?.length) {
        layer.heightMap = await canvasFromChunks(heightMapObject?.chunks, heightMapSource);
        layer.heightMapBaseSource = heightMapSource || null;
        layer.heightChunks = new Map((heightMapObject?.chunks || []).map((chunk, index) => [`saved:${index}:${chunk.x}:${chunk.y}`, chunk]));
        renderTerrainHeight(layer);
      }
      if (saved.imageSource) layer.image = await imageFromSource(saved.imageSource);
      layer.assets = await Promise.all(saved.assets.map(async (asset) => ({ file: { name: asset.name }, image: await imageFromSource(asset.source), anchorX: asset.anchorX, anchorY: asset.anchorY })));
      layer.placements = saved.placements || [];
      if (saved.outputSource) {
        const output = await imageFromSource(saved.outputSource);
        layer.output.width = canvas.width; layer.output.height = canvas.height;
        layer.output.getContext('2d').drawImage(output, 0, 0);
      }
      return layer;
    }));
    state.selectedId = state.layers.some((layer) => layer.id === project.selectedId) ? project.selectedId : state.layers[0].id;
    stage.style.display = 'block'; $('#emptyState').style.display = 'none';
    selectLayer(state.selectedId); fit();
    $('#saveState').textContent = 'Projeto aberto';
  } catch (error) {
    $('#saveState').textContent = 'Erro ao abrir';
    window.alert(`Não foi possível abrir o projeto: ${error.message}`);
  }
  hideTaskProgress();
  event.target.value = '';
});

function editorWorldPoint(event) {
  const rectangle = viewport.getBoundingClientRect();
  return { x: (event.clientX - rectangle.left - state.x) / state.zoom, y: (event.clientY - rectangle.top - state.y) / state.zoom };
}

function maskCoverageAt(layer, x, y) {
  const localX = Math.floor(x - (layer.settings.layerOffsetX || 0)), localY = Math.floor(y - (layer.settings.layerOffsetY || 0));
  if (!layer.mask || localX < 0 || localY < 0 || localX >= canvas.width || localY >= canvas.height) return 0;
  const sample = document.createElement('canvas'); sample.width = sample.height = 1;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  sampleContext.drawImage(layer.mask, localX, localY, 1, 1, 0, 0, 1, 1);
  const pixel = sampleContext.getImageData(0, 0, 1, 1).data;
  return pixel[3] / 255 * (1 - (pixel[0] + pixel[1] + pixel[2]) / 765);
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - (start.x + dx * amount), point.y - (start.y + dy * amount));
}

function layerAtPoint(point) {
  for (const layer of state.layers) {
    if (!layer.visible || layer.type === 'folder') continue;
    const offsetX = layer.settings.layerOffsetX || 0, offsetY = layer.settings.layerOffsetY || 0;
    if (layer.type === 'object' && layer.object?.x !== null) {
      const icon = objectIconAsset(layer.object)?.image;
      if (icon) {
        const height = 48 * (layer.object.scale ?? 1), width = icon.naturalWidth / icon.naturalHeight * height;
        const left = layer.object.x + (layer.object.offsetX || 0) + offsetX - width * (layer.object.anchorX ?? 0.5);
        const top = layer.object.y + (layer.object.offsetY || 0) + offsetY - height * (layer.object.anchorY ?? 1);
        if (point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height) return layer;
      }
    }
    if (layer.type === 'path' && layer.path?.points.length > 1) {
      const local = { x: point.x - offsetX, y: point.y - offsetY };
      if (layer.path.points.slice(1).some((end, index) => distanceToSegment(local, layer.path.points[index], end) <= Math.max(8, pathPreset(layer).stroke / 2 + 5))) return layer;
    }
    if (layer.type === 'terrain' && layer.placements?.some((placement) => {
      const asset = layer.assets[placement.assetIndex]?.image || placement.asset;
      const radius = Math.max(asset?.naturalWidth || 0, asset?.naturalHeight || 0) * layer.settings.scale * placement.variation / 2;
      return Math.hypot(point.x - placement.x - offsetX, point.y - placement.y - offsetY) <= radius;
    })) return layer;
    if (['terrain', 'region'].includes(layer.type) && maskCoverageAt(layer, point.x, point.y) > 0.04) return layer;
    if (layer.type === 'image' && layer.image) {
      const imageX = offsetX + layer.settings.imageOffsetX, imageY = offsetY + layer.settings.imageOffsetY;
      if (point.x >= imageX && point.y >= imageY && point.x <= imageX + canvas.width && point.y <= imageY + canvas.height) return layer;
    }
    if (layer.type === 'ground' && layer.heightOutput.width && point.x >= offsetX && point.y >= offsetY && point.x <= offsetX + canvas.width && point.y <= offsetY + canvas.height) return layer;
  }
  return null;
}

document.querySelectorAll('[data-map-tool]').forEach((button) => {
  button.onclick = () => {
    state.activeMapTool = button.dataset.mapTool;
    document.querySelectorAll('[data-map-tool]').forEach((item) => item.classList.toggle('active', item === button));
    viewport.dataset.mapTool = state.activeMapTool;
  };
});
viewport.dataset.mapTool = state.activeMapTool;

viewport.addEventListener('pointerdown', (event) => {
  if (state.drawingPath && selectedLayer()?.type === 'path' && event.button === 0) {
    const rectangle = viewport.getBoundingClientRect();
    selectedLayer().path.points.push({ x: (event.clientX - rectangle.left - state.x) / state.zoom, y: (event.clientY - rectangle.top - state.y) / state.zoom });
    selectedLayer().path.distance = calculatePathDistance(selectedLayer().path.points);
    $('#pathDistance').textContent = `Distância: ${formatDistanceWithTravel(selectedLayer().path.distance)}`;
    redraw(); return;
  }
  if (state.placingObject && selectedLayer()?.type === 'object') {
    const rectangle = viewport.getBoundingClientRect();
    selectedLayer().object.x = (event.clientX - rectangle.left - state.x) / state.zoom;
    selectedLayer().object.y = (event.clientY - rectangle.top - state.y) / state.zoom;
    state.placingObject = false;
    $('#positionObject').classList.remove('active');
    $('#positionObject').textContent = '⌖ Posicionar no mapa';
    fillObjectInspector(selectedLayer().object);
    redraw();
    return;
  }
  if (event.button === 0 && state.activeMapTool === 'select') {
    const layer = layerAtPoint(editorWorldPoint(event));
    if (layer) selectLayer(layer.id);
    return;
  }
  if (event.button === 0 && state.activeMapTool === 'move') {
    if (!selectedLayer() || selectedLayer().type === 'folder') return;
    state.movingLayer = true; state.lastX = event.clientX; state.lastY = event.clientY;
    viewport.classList.add('moving-layer'); viewport.setPointerCapture(event.pointerId); return;
  }
  state.drag = true; state.lastX = event.clientX; state.lastY = event.clientY;
  viewport.classList.add('dragging');
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener('pointermove', (event) => {
  if (state.movingLayer) {
    const layer = selectedLayer();
    if (!layer) return;
    layer.settings.layerOffsetX = (layer.settings.layerOffsetX || 0) + (event.clientX - state.lastX) / state.zoom;
    layer.settings.layerOffsetY = (layer.settings.layerOffsetY || 0) + (event.clientY - state.lastY) / state.zoom;
    state.lastX = event.clientX; state.lastY = event.clientY; redraw(); return;
  }
  if (!state.drag) return;
  state.x += event.clientX - state.lastX; state.y += event.clientY - state.lastY;
  state.lastX = event.clientX; state.lastY = event.clientY;
  updateTransform();
});
viewport.addEventListener('pointerup', () => { state.drag = false; state.movingLayer = false; viewport.classList.remove('dragging', 'moving-layer'); });
viewport.addEventListener('pointercancel', () => { state.drag = false; state.movingLayer = false; viewport.classList.remove('dragging', 'moving-layer'); });
viewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rectangle = viewport.getBoundingClientRect();
  const mouseX = event.clientX - rectangle.left;
  const mouseY = event.clientY - rectangle.top;
  const oldZoom = state.zoom;
  state.zoom = Math.max(0.15, Math.min(5, state.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
  state.x = mouseX - (mouseX - state.x) * state.zoom / oldZoom;
  state.y = mouseY - (mouseY - state.y) * state.zoom / oldZoom;
  updateTransform();
}, { passive: false });

function zoomBy(multiplier) {
  const centerX = viewport.clientWidth / 2;
  const centerY = viewport.clientHeight / 2;
  const oldZoom = state.zoom;
  state.zoom = Math.max(0.15, Math.min(5, state.zoom * multiplier));
  state.x = centerX - (centerX - state.x) * state.zoom / oldZoom;
  state.y = centerY - (centerY - state.y) * state.zoom / oldZoom;
  updateTransform();
}
$('.zoom-controls').addEventListener('pointerdown', (event) => event.stopPropagation());
$('#zoomIn').onclick = () => zoomBy(1.15);
$('#zoomOut').onclick = () => zoomBy(0.85);
$('#fitBtn').onclick = fit;
function dataUrlBytes(source) {
  const binary = atob(source.split(',')[1]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipProject(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const directory = [];
  let offset = 0;
  const record = (size) => new DataView(new ArrayBuffer(size));
  for (const file of files) {
    const name = encoder.encode(file.name);
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : encoder.encode(file.bytes);
    const checksum = crc32(bytes);
    const header = record(30);
    header.setUint32(0, 0x04034b50, true); header.setUint16(4, 20, true); header.setUint16(6, 0x0800, true);
    header.setUint32(14, checksum, true); header.setUint32(18, bytes.length, true); header.setUint32(22, bytes.length, true); header.setUint16(26, name.length, true);
    chunks.push(header.buffer, name, bytes);
    directory.push({ name, bytes, checksum, offset });
    offset += header.byteLength + name.length + bytes.length;
  }
  const directoryOffset = offset;
  for (const file of directory) {
    const header = record(46);
    header.setUint32(0, 0x02014b50, true); header.setUint16(4, 20, true); header.setUint16(6, 20, true); header.setUint16(8, 0x0800, true);
    header.setUint32(16, file.checksum, true); header.setUint32(20, file.bytes.length, true); header.setUint32(24, file.bytes.length, true); header.setUint16(28, file.name.length, true); header.setUint32(42, file.offset, true);
    chunks.push(header.buffer, file.name); offset += header.byteLength + file.name.length;
  }
  const end = record(22);
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, directory.length, true); end.setUint16(10, directory.length, true); end.setUint32(12, offset - directoryOffset, true); end.setUint32(16, directoryOffset, true);
  chunks.push(end.buffer);
  return new Blob(chunks, { type: 'application/zip' });
}

function safeFileName(name, fallback) {
  return (name || fallback).replace(/[^a-z0-9._-]+/gi, '-');
}

$('#exportBtn').onclick = async () => {
  $('#saveState').textContent = 'Exportando projeto…';
  showTaskProgress('Preparando exportação', 0);
  try {
    await flushPendingMaskChunks('Codificando chunks para exportação'); redraw(true, false); await nextFrame();
    const project = createProjectData();
    const files = [{ name: 'projeto-teralium.json', bytes: JSON.stringify(project, null, 2) }, { name: 'mapa-render-final.png', bytes: new Uint8Array(await (await canvasChunkBlob(canvas)).arrayBuffer()) }];
    for (let index = 0; index < state.layers.length; index++) {
      const layer = state.layers[index];
      updateTaskProgress('Mesclando chunks das camadas', 10 + (index + 1) / Math.max(1, state.layers.length) * 65);
      if (layer.mask) files.push({ name: `mascaras/${index + 1}-${safeFileName(layer.maskName, layer.name)}.png`, bytes: dataUrlBytes(await drawableDataUrl(layer.mask)) });
      if (layer.heightMap) files.push({ name: `${layer.type === 'ground' ? 'ground-base' : 'alturas'}/${index + 1}-${safeFileName(layer.name, 'terreno')}.png`, bytes: dataUrlBytes(await drawableDataUrl(layer.heightMap)) });
      if (layer.image) files.push({ name: `assets/camadas/${index + 1}-${safeFileName(layer.name, 'imagem')}.png`, bytes: dataUrlBytes(await drawableDataUrl(layer.image)) });
      for (let assetIndex = 0; assetIndex < layer.assets.length; assetIndex++) files.push({ name: `assets/camadas/${index + 1}/${assetIndex + 1}-${safeFileName(layer.assets[assetIndex].file.name, 'asset')}`, bytes: dataUrlBytes(await portableAssetSource(layer.assets[assetIndex])) });
      await nextFrame();
    }
    for (let setIndex = 0; setIndex < state.imageSets.length; setIndex++) for (let assetIndex = 0; assetIndex < state.imageSets[setIndex].assets.length; assetIndex++) {
      const asset = state.imageSets[setIndex].assets[assetIndex];
      files.push({ name: `assets/biblioteca/${setIndex + 1}-${safeFileName(state.imageSets[setIndex].name, 'conjunto')}/${assetIndex + 1}-${safeFileName(asset.file.name, 'asset')}`, bytes: dataUrlBytes(await portableAssetSource(asset)) });
    }
    updateTaskProgress('Compactando projeto', 85); await nextFrame();
    downloadFile('projeto-teralium.zip', zipProject(files), 'application/zip'); updateTaskProgress('Projeto exportado', 100);
    $('#saveState').textContent = 'Projeto exportado';
  } finally { redraw(); hideTaskProgress(); }
};
const loreSectionLabels = { objects: 'Objetos', regions: 'Regiões', paths: 'Caminhos', layers: 'Outras camadas' };
let loreSectionOrder = ['objects', 'regions', 'paths', 'layers'];
const loreSectionEnabled = new Set(loreSectionOrder);

function loreThemeColors() {
  if (state.theme === 'light') return { background: '#ffffff', title: '#38551f', text: '#20261f' };
  if (state.theme === 'wine') return { background: '#271719', title: '#d2a84e', text: '#f5e9df' };
  if (state.theme === 'earth') return { background: '#242018', title: '#91b36b', text: '#eee8d7' };
  return { background: '#303330', title: '#b7df72', text: '#edf0ed' };
}

function renderLoreSectionOrder() {
  const container = $('#loreSectionOrder');
  container.replaceChildren(...loreSectionOrder.map((section, index) => {
    const row = document.createElement('div'); row.className = 'lore-section-row';
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = loreSectionEnabled.has(section);
    enabled.onchange = () => enabled.checked ? loreSectionEnabled.add(section) : loreSectionEnabled.delete(section);
    const label = document.createElement('span'); label.textContent = loreSectionLabels[section];
    const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = 'Mover para cima'; up.disabled = index === 0;
    const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.title = 'Mover para baixo'; down.disabled = index === loreSectionOrder.length - 1;
    up.onclick = () => { [loreSectionOrder[index - 1], loreSectionOrder[index]] = [section, loreSectionOrder[index - 1]]; renderLoreSectionOrder(); };
    down.onclick = () => { [loreSectionOrder[index], loreSectionOrder[index + 1]] = [loreSectionOrder[index + 1], section]; renderLoreSectionOrder(); };
    row.append(enabled, label, up, down); return row;
  }));
}

function openExportLoreModal() {
  const colors = loreThemeColors();
  $('#loreBackgroundColor').value = colors.background; $('#loreTitleColor').value = colors.title; $('#loreTextColor').value = colors.text;
  renderLoreSectionOrder(); $('#exportLoreModal').hidden = false;
}
$('#closeExportLore').onclick = () => { $('#exportLoreModal').hidden = true; };
$('#exportLoreModal').addEventListener('click', (event) => { if (event.target === $('#exportLoreModal')) $('#exportLoreModal').hidden = true; });

function escapeLoreHtml(value) {
  const element = document.createElement('div'); element.textContent = String(value ?? ''); return element.innerHTML;
}
function loreEntry(name, description = '', pages = []) {
  const simple = String(description || '').trim();
  const pageHtml = (pages || []).map((page) => `<section class="lore-page"><h3>${escapeLoreHtml(page.title || 'Página')}</h3>${sanitizeDescriptionHtml(page.content || '<p>Sem descrição.</p>')}</section>`).join('');
  return `<article class="entry"><h2>${escapeLoreHtml(name || 'Sem nome')}</h2>${simple ? `<p>${escapeLoreHtml(simple)}</p>` : ''}${pageHtml}</article>`;
}
function loreSectionHtml(section) {
  let entries = [];
  if (section === 'objects') entries = state.layers.filter((layer) => layer.type === 'object').map((layer) => loreEntry(layer.object?.name || layer.name, layer.object?.description, layer.object?.descriptionPages));
  if (section === 'regions') entries = state.layers.filter((layer) => layer.type === 'region').map((layer) => loreEntry(layer.region?.name || layer.name, layer.region?.description));
  if (section === 'paths') entries = state.layers.filter((layer) => layer.type === 'path').map((layer) => loreEntry(layer.path?.name || layer.name, layer.path?.description));
  if (section === 'layers') entries = state.layers.filter((layer) => !['object', 'region', 'path'].includes(layer.type)).map((layer) => loreEntry(layer.name, layer.description));
  return entries.length ? `<section class="chapter"><h1>${loreSectionLabels[section]}</h1>${entries.join('')}</section>` : '';
}
function createLoreHtml() {
  const titleFont = $('#loreTitleFont').value, bodyFont = $('#loreBodyFont').value;
  const titleSize = Math.max(12, Math.min(48, Number($('#loreTitleSize').value) || 26));
  const bodySize = Math.max(8, Math.min(24, Number($('#loreBodySize').value) || 11));
  const background = $('#loreBackgroundColor').value, titleColor = $('#loreTitleColor').value, textColor = $('#loreTextColor').value;
  const contents = loreSectionOrder.filter((section) => loreSectionEnabled.has(section)).map(loreSectionHtml).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Atlasmith Lore</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}html,body{background:${background};color:${textColor};font:${bodySize}pt ${bodyFont};line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;padding:18mm}h1,h2,h3{font-family:${titleFont};color:${titleColor};break-after:avoid}h1{font-size:${titleSize}pt;border-bottom:2px solid ${titleColor};padding-bottom:8px}h2{font-size:${Math.max(12,titleSize*.7)}pt;margin-bottom:6px}h3{font-size:${Math.max(10,titleSize*.52)}pt}.chapter{break-before:page}.chapter:first-child{break-before:auto}.entry{break-inside:avoid;margin:0 0 22px}.entry p{white-space:pre-wrap}.lore-page{margin-left:14px;padding-left:14px;border-left:2px solid ${titleColor}}@media print{body{padding:0}}</style></head><body>${contents || '<p>Nenhum conteúdo selecionado.</p>'}<script>addEventListener('load',()=>setTimeout(()=>print(),150));<\/script></body></html>`;
}
$('#confirmExportLore').onclick = () => {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) { window.alert('Permita pop-ups para gerar o PDF de Lore.'); return; }
  printWindow.document.open(); printWindow.document.write(createLoreHtml()); printWindow.document.close();
  $('#exportLoreModal').hidden = true;
};

function exportablePois() {
  return state.layers.filter((layer) => layer.visible && layer.type === 'object' && layer.object?.poi && layer.object.x !== null).map((layer) => {
    const object = layer.object;
    const iconSet = state.imageSets.find((set) => set.id === object.iconSetId);
    const gallerySet = state.imageSets.find((set) => set.id === object.gallerySetId);
    const type = state.poiTypes.find((item) => item.id === object.type) || state.poiTypes.at(-1);
    return { ...object, description: String(object.description ?? object.descricao ?? ''), simpleDescription: String(object.description ?? object.descricao ?? ''), x: object.x + (object.offsetX ?? 0) + (layer.settings.layerOffsetX || 0), y: object.y + (object.offsetY ?? 0) + (layer.settings.layerOffsetY || 0), id: layer.id, icon: objectIconAsset(object)?.image.src || '', iconNaturalWidth: objectIconAsset(object)?.image.naturalWidth || 48, iconNaturalHeight: objectIconAsset(object)?.image.naturalHeight || 48, gallery: gallerySet?.assets.map((asset) => asset.image.src) || [], typeName: type?.name || object.type, color: type?.color || '#fff' };
  }).filter((poi) => poi.icon);
}

function exportableRegions() {
  const candidates = state.layers.flatMap((layer) => {
    if (!layer.visible || !layer.mask) return [];
    if (layer.type === 'region') return [{ sourceLayer: layer, regionLayer: layer, terrainMask: false }];
    if (layer.type !== 'terrain' || !layer.settings.createRegion || !layer.settings.regionLayerId) return [];
    const regionLayer = state.layers.find((item) => item.type === 'region' && item.id === layer.settings.regionLayerId);
    return regionLayer ? [{ sourceLayer: layer, regionLayer, terrainMask: true }] : [];
  });
  return candidates.map(({ sourceLayer, regionLayer, terrainMask }) => {
    const scratch = document.createElement('canvas'); scratch.width = canvas.width; scratch.height = canvas.height;
    const regionContext = scratch.getContext('2d', { willReadFrequently: true });
    regionContext.drawImage(sourceLayer.mask, sourceLayer.settings.layerOffsetX || 0, sourceLayer.settings.layerOffsetY || 0, canvas.width, canvas.height);
    const imageData = regionContext.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    if (terrainMask) {
      for (let index = 0; index < pixels.length; index += 4) {
        const darkness = 1 - (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 765;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
        pixels[index + 3] = Math.round(pixels[index + 3] * Math.max(0, darkness));
      }
      regionContext.putImageData(imageData, 0, 0);
    }
    let totalX = 0, totalY = 0, count = 0;
    for (let y = 0; y < canvas.height; y += 4) for (let x = 0; x < canvas.width; x += 4) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 32) { totalX += x; totalY += y; count++; }
    }
    const region = regionLayer.region;
    return { id: terrainMask ? `${sourceLayer.id}:region` : regionLayer.id, group: region.group || 'Regiões', name: region.name, color: region.color, fillMode: region.fillMode || 'fill', outlineThickness: region.outlineThickness ?? 3, outlineDashed: Boolean(region.outlineDashed), outlineGap: region.outlineGap ?? 12, defaultOverview: Boolean(region.defaultOverview), mask: terrainMask ? scratch.toDataURL('image/png') : regionLayer.maskExportSource || regionLayer.mask.src, centerX: count ? totalX / count : canvas.width / 2, centerY: count ? totalY / count : canvas.height / 2 };
  });
}

function exportablePaths() {
  return state.layers.filter((layer) => layer.visible && layer.type === 'path' && layer.path?.showOnMap && layer.path.points.length > 1).map((layer) => {
    const preset = pathPreset(layer);
    const gallery = state.imageSets.find((set) => set.id === layer.path.gallerySetId)?.assets.map((asset) => asset.image.src) || [];
    return { id: layer.id, name: layer.path.name, description: String(layer.path.description ?? layer.path.descricao ?? ''), points: layer.path.points.map((point) => ({ x: point.x + (layer.settings.layerOffsetX || 0), y: point.y + (layer.settings.layerOffsetY || 0) })), distance: layer.path.distance || calculatePathDistance(layer.path.points), gallery, preset };
  });
}

function createMapHtml() {
  redraw(false, false, false);
  const image = canvas.toDataURL('image/png');
  redraw(true);
  const pois = JSON.stringify(exportablePois()).replace(/</g, '\\u003c');
  const regions = JSON.stringify(exportableRegions()).replace(/</g, '\\u003c');
  const paths = JSON.stringify(exportablePaths()).replace(/</g, '\\u003c');
  const types = JSON.stringify(state.poiTypes).replace(/</g, '\\u003c');
  const travelSpeeds = JSON.stringify(state.travelSpeeds);
  const distanceScaleKm = state.distanceScaleKm;
  const previewImageRendering = state.mapFilter === 'nearest' ? 'pixelated' : 'auto';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mapa de Teralium</title><style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#101311;color:#eef2ee;font-family:Arial,sans-serif}.side{position:fixed;z-index:10;inset:0 auto 0 0;width:280px;padding:22px 16px;background:#171a18;border-right:1px solid #303630;overflow:auto}.side h1{font-size:18px;margin:0 0 18px}.side input,.side select,.filter-button{width:100%;padding:10px;margin-bottom:8px;border:1px solid #343b35;border-radius:7px;background:#0f1210;color:#eef2ee}.filter-button{border:1px solid #343b35;border-radius:7px;background:#0f1210;color:#eef2ee;text-align:left;cursor:pointer}.type-choices{display:grid;gap:8px;margin-top:18px}.type-choices label{display:flex;gap:8px;align-items:center;padding:9px;border-radius:7px;background:#111512}.poi-list{display:grid;gap:5px;margin-top:12px}.poi-item{padding:10px;border:0;border-radius:7px;background:transparent;color:#eef2ee;text-align:left;cursor:pointer}.poi-item:hover{background:#252b26}.poi-item small{display:block;margin-top:3px;color:#89928b}.view{position:fixed;inset:0 0 0 280px;overflow:hidden;cursor:grab;background-image:linear-gradient(#1b201c 1px,transparent 1px),linear-gradient(90deg,#1b201c 1px,transparent 1px);background-size:24px 24px}.view.dragging{cursor:grabbing}.world{position:absolute;transform-origin:0 0}.map{position:absolute;inset:0;pointer-events:none;user-select:none;-webkit-user-drag:none;image-rendering:${previewImageRendering}}.paths{position:absolute;inset:0;overflow:visible}.path-line{fill:none;pointer-events:none;transition:filter .15s,stroke .15s}.path-line.hovered{stroke:#fff!important;filter:drop-shadow(0 0 5px #fff)}.path-hit{fill:none;pointer-events:stroke;cursor:pointer}.path-label{display:none;position:absolute;z-index:5;transform:translate(-50%,-100%);padding:5px 8px;border-radius:5px;background:#111d;color:#fff;font-size:12px;white-space:nowrap;pointer-events:none}.pin{position:absolute;width:0;height:0;padding:0;border:0;background:transparent;color:var(--color);cursor:pointer}.pin img{position:absolute;left:var(--icon-left);top:var(--icon-top);width:var(--render-width);height:var(--render-height);max-width:none;object-fit:fill;image-rendering:${previewImageRendering}}.pin span{position:absolute;top:var(--label-top);left:0;transform:translateX(-50%);color:var(--color);font-weight:700;font-size:14px;white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.pin:hover img{filter:drop-shadow(0 0 2px white) drop-shadow(0 0 5px var(--color))}.pin:hover span{color:#fff}.pin.focused img{filter:drop-shadow(0 0 3px #ff8a2a) drop-shadow(0 0 9px #ff8a2a)}.pin.focused span{color:#ff9b42}.view-tools{position:fixed;z-index:12;left:296px;top:50%;transform:translateY(-50%);display:grid;gap:4px;padding:5px;border:1px solid #3a423b;border-radius:9px;background:#181c19dd;box-shadow:0 8px 25px #0009}.view-tools button{width:38px;height:38px;padding:0;border:0;border-radius:6px;background:transparent;color:#879088;cursor:pointer}.view-tools button.active{background:#30392c;color:#b7df72}.measurement-tools{position:fixed;z-index:13;left:calc(50% + 140px);bottom:18px;transform:translateX(-50%);display:flex;gap:4px;padding:5px;border:1px solid #3a423b;border-radius:9px;background:#181c19dd;box-shadow:0 8px 25px #0009}.measurement-tools button{min-width:42px;height:38px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:#879088;font-size:19px;cursor:pointer}.measurement-tools button.active{background:#30392c;color:#b7df72}.measurement-layer{position:absolute;inset:0;overflow:visible;pointer-events:none}.measurement-line{fill:none;stroke:#f7d66d;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 2px #000)}.measurement-point{fill:#f7d66d;stroke:#151815;stroke-width:2;vector-effect:non-scaling-stroke}.measurement-badge{position:fixed;z-index:13;left:calc(50% + 140px);bottom:70px;transform:translateX(-50%);max-width:min(720px,calc(100vw - 32px));padding:8px 12px;border:1px solid #4b554c;border-radius:8px;background:#111512eF;color:#f4f6f4;font-size:12px;text-align:center;white-space:nowrap}.measurement-badge[hidden]{display:none}.region-layer{position:absolute;inset:0;display:none;pointer-events:none}.region-layer canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:${previewImageRendering}}.region-layer .fill,.region-layer .outline{display:none}.region-layer.hovered .outline{display:block}.region-layer span{position:absolute;transform:translate(-50%,-50%);font-weight:700;font-size:18px;color:#fff;white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.region-layer.hovered{display:block}.region-layer.overview{display:block;opacity:.5}.region-layer.overview .fill{display:block}.region-layer.overview .outline{display:none}.region-layer.overview.mode-outline .fill{display:none}.region-layer.overview.mode-outline .outline{display:block}.regions-mode #pins{display:none}.modal{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:25px;background:#050706d9}.modal[hidden]{display:none}.card{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;padding:25px;border:1px solid #3b433c;border-radius:14px;background:#191d1a}.close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#aaa;font-size:25px;cursor:pointer}.window-card{padding-top:70px;border:1px solid #4a554b;outline:7px solid #111512;box-shadow:0 25px 80px #000}.window-title{position:absolute;inset:0 0 auto;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #394139;background:#202521}.window-title h2{margin:0!important}.window-title-main{display:flex;align-items:center;gap:10px}.window-title-icon{width:34px;height:34px;object-fit:contain}.window-title .close{position:static}.card.detailed{width:50vw;min-width:700px;height:50vh;min-height:480px}.detail-layout{display:grid;grid-template-columns:0 1fr;height:100%}.card.detailed .detail-layout{grid-template-columns:190px 1fr;gap:22px}.detail-pages{display:none;overflow-y:auto;border-right:1px solid #343b35;padding-right:12px}.card.detailed .detail-pages{display:grid;align-content:start;gap:6px}.detail-pages button{padding:9px;text-align:left;border:0;border-radius:6px;background:transparent;color:#aaa;cursor:pointer}.detail-pages button.active{background:#2b3428;color:#b7df72}.detail-content{overflow-y:auto}.card h2{margin:0;color:var(--poi-color)}.kind{color:#929b94;font-size:11px}.simple-description,.description{display:block;color:#eef2ee;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.simple-description[hidden],.description[hidden]{display:none}.gallery{display:flex;gap:8px;overflow:auto;margin-top:20px}.gallery img{width:150px;height:100px;object-fit:cover;border-radius:7px;cursor:zoom-in}.lightbox{z-index:40}.lightbox img{max-width:92vw;max-height:90vh}.lightbox-nav{position:fixed;top:50%;transform:translateY(-50%);width:46px;height:46px;border:1px solid #ffffff66;border-radius:50%;background:#101411cc;color:#fff;font-size:28px;cursor:pointer}.lightbox-nav.previous{left:24px}.lightbox-nav.next{right:24px}.lightbox-nav:disabled{display:none}.empty{color:#7f8881;font-size:12px;padding:10px}.hint{position:fixed;right:16px;bottom:16px;padding:8px;border-radius:7px;background:#171a18cc;color:#999;font-size:11px;pointer-events:none}@media(max-width:700px){.side{width:220px}.view{left:220px}.view-tools{left:236px}}
</style></head><body><aside class="side"><h1>Pontos de interesse</h1><input id="search" placeholder="Pesquisar..."><button id="filterButton" class="filter-button">Tipos de navegação</button><div id="list" class="poi-list"></div></aside><div id="typeFilter" class="modal" hidden><article class="card"><button class="close">×</button><h2>Tipos visíveis</h2><div id="typeChoices" class="type-choices"></div></article></div><nav class="view-tools" aria-label="Modo do mapa"><button data-mode="objects" class="active" title="Objetos">⌖</button></nav><main id="view" class="view"><div id="world" class="world" style="width:${canvas.width}px;height:${canvas.height}px"><img class="map" src="${image}" alt="Mapa"><div id="regionLayers"></div><svg id="pathLayers" class="paths" width="${canvas.width}" height="${canvas.height}"></svg><svg id="measurementLayer" class="measurement-layer" width="${canvas.width}" height="${canvas.height}"><polyline class="measurement-line"></polyline><circle class="measurement-point" r="5" hidden></circle></svg><span id="pathLabel" class="path-label"></span><div id="pins"></div></div><span class="hint">Arraste para mover • Scroll para zoom</span></main><nav class="measurement-tools" aria-label="Ferramentas de medição"><button data-measure="select" class="active" title="Seleção" aria-label="Seleção">⌖</button><button data-measure="straight" title="Régua" aria-label="Régua">📏</button><button data-measure="free" title="Régua de desenho livre" aria-label="Régua de desenho livre">〰</button></nav><output id="measurementBadge" class="measurement-badge" hidden></output><div id="details" class="modal" hidden><article class="card window-card"><header class="window-title"><div class="window-title-main"><img class="window-title-icon" alt=""><div><h2></h2><small class="title-meta"></small></div></div><button class="close">×</button></header><div class="detail-layout"><nav id="detailPages" class="detail-pages"></nav><section class="detail-content"><small class="kind"></small><p class="simple-description"></p><div class="description"></div><div class="gallery"></div></section></div></article></div><div id="lightbox" class="modal lightbox" hidden><button class="lightbox-nav previous" type="button" aria-label="Imagem anterior">&lt;</button><img alt="Imagem ampliada"><button class="lightbox-nav next" type="button" aria-label="Próxima imagem">&gt;</button></div><script>
const pois=${pois},regions=${regions},paths=${paths},types=${types},travelSpeeds=${travelSpeeds},distanceScaleKm=${distanceScaleKm},view=document.querySelector('#view'),world=document.querySelector('#world'),pins=document.querySelector('#pins'),regionLayers=document.querySelector('#regionLayers'),pathLayers=document.querySelector('#pathLayers'),pathLabel=document.querySelector('#pathLabel'),measurementLayer=document.querySelector('#measurementLayer'),measurementBadge=document.querySelector('#measurementBadge'),list=document.querySelector('#list'),search=document.querySelector('#search'),filterButton=document.querySelector('#filterButton'),typeFilter=document.querySelector('#typeFilter'),typeChoices=document.querySelector('#typeChoices'),details=document.querySelector('#details'),detailPages=document.querySelector('#detailPages'),lightbox=document.querySelector('#lightbox');let zoom=1,x=0,y=0,drag=false,moved=false,lx=0,ly=0,mode='objects',measureMode='',measureDrawing=false,measurePoints=[],measureCursor=null;const regionViews=[];function duration(hours){if(!Number.isFinite(hours))return '—';return hours<24?(hours.toFixed(hours<10?1:0).replace('.',',')+'h'):((hours/24).toFixed(1).replace('.',',')+'d')}function formatDistance(km){km=Math.max(0,Number(km)||0);return Math.round(km)+' km · 🚶 '+duration(km/travelSpeeds.walking)+' · 🐎 '+duration(km/travelSpeeds.horse)+' · ⛵ '+duration(km/travelSpeeds.ship)+' · ✈ '+duration(km/travelSpeeds.air)}function worldPoint(e){const r=view.getBoundingClientRect();return{x:(e.clientX-r.left-x)/zoom,y:(e.clientY-r.top-y)/zoom}}function measuredDistance(points){return points.slice(1).reduce((sum,p,index)=>sum+Math.hypot(p.x-points[index].x,p.y-points[index].y),0)*distanceScaleKm/100}function clearMeasurement(){measurePoints=[];measureCursor=null;measureDrawing=false;renderMeasurement()}function renderMeasurement(){const points=measureMode==='straight'&&measurePoints.length&&measureCursor?[measurePoints[0],measureCursor]:measurePoints;measurementLayer.querySelector('.measurement-line').setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));const marker=measurementLayer.querySelector('.measurement-point');marker.hidden=!points.length;if(points.length){marker.setAttribute('cx',points[0].x);marker.setAttribute('cy',points[0].y)}measurementBadge.hidden=points.length<2;if(points.length>1)measurementBadge.textContent='Distância: '+formatDistance(measuredDistance(points))}for(const group of [...new Set(regions.map(r=>r.group))]){const button=document.createElement('button');button.dataset.mode='region:'+group;button.title=group;button.textContent='◒';document.querySelector('.view-tools').append(button)}function draw(){world.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')'}function center(p,targetZoom=2){zoom=targetZoom;x=view.clientWidth/2-p.x*zoom;y=view.clientHeight/2-p.y*zoom;draw()}function focusPoi(p){center(p,2);document.querySelectorAll('.pin').forEach(pin=>pin.classList.toggle('focused',pin.dataset.poiId===p.id))}function fit(){zoom=Math.min(view.clientWidth/${canvas.width},view.clientHeight/${canvas.height},.95);x=(view.clientWidth-${canvas.width}*zoom)/2;y=(view.clientHeight-${canvas.height}*zoom)/2;draw()}function sanitizeRichHTML(value){const template=document.createElement('template');template.innerHTML=value||'';const allowed=new Set(['B','STRONG','I','EM','U','S','SPAN','P','BR','UL','OL','LI','H3','H4']);template.content.querySelectorAll('script,style,iframe,object,embed').forEach(element=>element.remove());[...template.content.querySelectorAll('*')].forEach(element=>{if(!allowed.has(element.tagName)){element.replaceWith(...element.childNodes);return}const color=element.style.color,weight=element.style.fontWeight,fontStyle=element.style.fontStyle,decoration=element.style.textDecoration;[...element.attributes].forEach(attribute=>element.removeAttribute(attribute.name));if(color)element.style.color=color;if(weight)element.style.fontWeight=weight;if(fontStyle)element.style.fontStyle=fontStyle;if(decoration)element.style.textDecoration=decoration});return template.innerHTML}function openLightbox(sources,index){const image=lightbox.querySelector('img'),previous=lightbox.querySelector('.previous'),next=lightbox.querySelector('.next');const show=()=>{image.src=sources[index];image.alt='Imagem '+(index+1)+' de '+sources.length;previous.disabled=next.disabled=sources.length<2};previous.onclick=()=>{index=(index-1+sources.length)%sources.length;show()};next.onclick=()=>{index=(index+1)%sources.length;show()};show();lightbox.hidden=false}function fillDetailGallery(sources){const gallery=details.querySelector('.gallery');gallery.replaceChildren(...sources.map((src,index)=>{const image=new Image();image.src=src;image.onclick=()=>openLightbox(sources,index);return image}))}function showSimpleDescription(value){const simple=details.querySelector('.simple-description');simple.hidden=false;simple.removeAttribute('hidden');simple.style.display='block';simple.textContent=String(value??'').trim()||'Sem descrição.'}function openPoi(p){const card=details.querySelector('.card'),description=details.querySelector('.description'),simple=details.querySelector('.simple-description'),simpleDescription=String(p.description??p.simpleDescription??p.descricao??'').trim();details.style.setProperty('--poi-color',p.color);details.querySelector('h2').textContent=p.name;const titleIcon=details.querySelector('.window-title-icon');titleIcon.src=p.icon;titleIcon.hidden=!p.icon;details.querySelector('.title-meta').textContent='';details.querySelector('.kind').textContent=p.typeName;const pages=(p.descriptionPages||[]).filter(page=>String(page.content||'').trim()||(page.images||[]).length);card.classList.toggle('detailed',pages.length>0);detailPages.replaceChildren();showSimpleDescription(simpleDescription);description.hidden=!pages.length;if(pages.length){const showPage=(page,button)=>{detailPages.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));details.querySelector('.description').innerHTML=sanitizeRichHTML(page.content||'Sem descrição.');fillDetailGallery(page.images||[])};pages.forEach((page,index)=>{const button=document.createElement('button');button.textContent=page.title||('Página '+(index+1));button.onclick=()=>showPage(page,button);detailPages.append(button)});showPage(pages[0],detailPages.firstChild)}else{fillDetailGallery(p.gallery||[])}details.hidden=false}function openRegion(r){details.querySelector('.window-title-icon').hidden=true;details.querySelector('.card').classList.remove('detailed');detailPages.replaceChildren();details.style.setProperty('--poi-color',r.color);details.querySelector('h2').textContent=r.name;details.querySelector('.title-meta').textContent='';details.querySelector('.kind').textContent=r.group;details.querySelector('.description').hidden=true;showSimpleDescription('Região');details.querySelector('.gallery').replaceChildren();details.hidden=false}function openPath(p){details.querySelector('.window-title-icon').hidden=true;details.querySelector('.card').classList.remove('detailed');detailPages.replaceChildren();details.style.setProperty('--poi-color',p.preset.color);details.querySelector('h2').textContent=p.name;details.querySelector('.title-meta').textContent=formatDistance(p.distance);details.querySelector('.kind').textContent='Caminho';details.querySelector('.description').hidden=true;showSimpleDescription(p.description);fillDetailGallery(p.gallery);details.hidden=false}for(const p of paths){const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.classList.add('path-line');line.setAttribute('points',p.points.map(point=>point.x+','+point.y).join(' '));line.setAttribute('stroke',p.preset.color);line.setAttribute('stroke-width',p.preset.stroke);line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');if(p.preset.dashed)line.setAttribute('stroke-dasharray',(p.preset.stroke*2)+' '+(p.preset.dashGap??p.preset.stroke*1.5));const hit=line.cloneNode();hit.classList.remove('path-line');hit.classList.add('path-hit');hit.setAttribute('stroke','transparent');hit.setAttribute('stroke-width',Math.max(24,p.preset.stroke+16));hit.onmouseenter=()=>{line.classList.add('hovered');pathLabel.textContent=p.name;pathLabel.style.display='block'};hit.onmousemove=e=>{const r=view.getBoundingClientRect();pathLabel.style.left=((e.clientX-r.left-x)/zoom)+'px';pathLabel.style.top=((e.clientY-r.top-y)/zoom)+'px'};hit.onmouseleave=()=>{line.classList.remove('hovered');pathLabel.style.display='none'};hit.onclick=e=>{e.stopPropagation();openPath(p)};pathLayers.append(hit,line)}const enabledTypes=new Set(types.map(type=>type.id));for(const type of [...types.map(type=>({id:type.id,name:type.name,enabled:true})),{id:'paths',name:'Caminhos',enabled:false},{id:'regions',name:'Regiões',enabled:false}]){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=type.enabled;check.onchange=()=>{check.checked?enabledTypes.add(type.id):enabledTypes.delete(type.id);renderList()};label.append(check,type.name);typeChoices.append(label)}filterButton.onclick=()=>typeFilter.hidden=false;typeFilter.querySelector('.close').onclick=()=>typeFilter.hidden=true;typeFilter.onclick=e=>{if(e.target===typeFilter)typeFilter.hidden=true};for(const p of pois){const pin=document.createElement('button');pin.className='pin';pin.dataset.poiId=p.id;const iconHeight=48*(p.scale||1),iconWidth=(p.iconNaturalWidth||48)/(p.iconNaturalHeight||48)*iconHeight,anchorX=p.anchorX??.5,anchorY=p.anchorY??1;pin.style.cssText='left:'+p.x+'px;top:'+p.y+'px;--color:'+p.color+';--render-width:'+iconWidth+'px;--render-height:'+iconHeight+'px;--icon-left:'+(-iconWidth*anchorX)+'px;--icon-top:'+(-iconHeight*anchorY)+'px;--label-top:'+(iconHeight*(1-anchorY)+3)+'px;opacity:'+(p.opacity??1);pin.innerHTML='<img><span></span>';pin.querySelector('img').src=p.icon;pin.querySelector('span').textContent=p.name;pin.onclick=()=>{focusPoi(p);openPoi(p)};pins.append(pin)}for(const region of regions){const layer=document.createElement('div');layer.className='region-layer '+(region.fillMode==='outline'?'mode-outline':'mode-fill');layer.style.setProperty('--color',region.color);const surface=document.createElement('canvas'),outline=document.createElement('canvas');surface.className='fill';outline.className='outline';surface.width=outline.width=${canvas.width};surface.height=outline.height=${canvas.height};const label=document.createElement('span');label.textContent=region.name;label.style.cssText='left:'+region.centerX+'px;top:'+region.centerY+'px';layer.append(surface,outline,label);regionLayers.append(layer);const image=new Image();image.onload=()=>{const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const alpha=c.getImageData(0,0,surface.width,surface.height).data;c.globalCompositeOperation='source-in';c.fillStyle=region.color;c.fillRect(0,0,surface.width,surface.height);const o=outline.getContext('2d');for(let d=1;d<=(region.outlineThickness||3);d++){o.drawImage(surface,-d,0);o.drawImage(surface,d,0);o.drawImage(surface,0,-d);o.drawImage(surface,0,d)}o.globalCompositeOperation='destination-out';o.drawImage(image,0,0);if(region.outlineDashed){o.globalCompositeOperation='destination-in';o.fillStyle='#fff';const segment=Math.max(2,(region.outlineThickness||3)*3),gap=Math.max(1,region.outlineGap||12);for(let sx=0;sx<outline.width;sx+=segment+gap)o.fillRect(sx,0,segment,outline.height);o.globalCompositeOperation='source-over'}const item={layer,alpha,group:region.group,region};regionViews.push(item);if(region.defaultOverview)layer.classList.add('overview')};image.src=region.mask}function renderList(){const term=search.value.toLowerCase();const objectItems=pois.map(p=>({...p,navType:p.type,navKind:'object'})),pathItems=paths.map(p=>({...p,navType:'paths',navKind:'path',typeName:formatDistance(p.distance)})),regionItems=regions.map(p=>({...p,navType:'regions',navKind:'region',typeName:p.group,x:p.centerX,y:p.centerY}));const shown=[...objectItems,...pathItems,...regionItems].filter(p=>enabledTypes.has(p.navType)&&p.name.toLowerCase().includes(term));list.replaceChildren(...shown.map(p=>{const b=document.createElement('button');b.className='poi-item';b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=p.name;b.querySelector('b').style.color=p.navKind==='path'?p.preset.color:p.color;b.querySelector('small').textContent=p.navKind==='path'?'Caminho • '+p.typeName:p.navKind==='region'?'Região • '+p.typeName:p.typeName;b.onclick=()=>{if(p.navKind==='path'){const middle=p.points[Math.floor(p.points.length/2)];center(middle)}else if(p.navKind==='region'){center(p);openRegion(p)}else focusPoi(p)};return b}));if(!shown.length)list.innerHTML='<div class="empty">Nenhum ponto encontrado.</div>'}function regionAt(e,group){const r=view.getBoundingClientRect(),mx=Math.floor((e.clientX-r.left-x)/zoom),my=Math.floor((e.clientY-r.top-y)/zoom);if(mx<0||my<0||mx>=${canvas.width}||my>=${canvas.height})return null;return [...regionViews].reverse().find(item=>(!group||item.group===group)&&item.alpha[(my*${canvas.width}+mx)*4+3]>32)||null}function hoverRegion(e){if(mode!=='objects'||drag)return;const r=view.getBoundingClientRect(),mx=Math.floor((e.clientX-r.left-x)/zoom),my=Math.floor((e.clientY-r.top-y)/zoom);let found=null;if(mx>=0&&my>=0&&mx<${canvas.width}&&my<${canvas.height})for(const item of regionViews)if(item.alpha[(my*${canvas.width}+mx)*4+3]>32)found=item;for(const item of regionViews)item.layer.classList.toggle('hovered',item===found)}document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));view.classList.toggle('regions-mode',mode!=='objects');for(const item of regionViews){item.layer.classList.remove('hovered');item.layer.classList.toggle('overview',mode==='objects'?item.region.defaultOverview:mode==='region:'+item.group)}});document.querySelectorAll('[data-measure]').forEach(button=>button.onclick=()=>{const selected=button.dataset.measure;measureMode=selected==='select'?'':selected;document.querySelectorAll('[data-measure]').forEach(item=>item.classList.toggle('active',item.dataset.measure===(measureMode||'select')));clearMeasurement();view.style.cursor=measureMode?'crosshair':'grab'});search.oninput=renderList;renderList();fit();addEventListener('resize',fit);view.oncontextmenu=e=>e.preventDefault();view.onpointerdown=e=>{if(measureMode&&e.button===2){e.preventDefault();clearMeasurement();return}if(measureMode&&e.button===0){e.preventDefault();const point=worldPoint(e);if(measureMode==='straight'){measurePoints=[point];measureCursor=point}else{measureDrawing=true;measurePoints.push(point)}renderMeasurement();view.setPointerCapture(e.pointerId);return}if(e.target.closest('.pin')||e.target.closest('.path-line')||e.target.closest('.path-hit'))return;if(measureMode&&e.button!==1)return;if(![0,1,2].includes(e.button))return;e.preventDefault();drag=true;moved=false;lx=e.clientX;ly=e.clientY;view.classList.add('dragging');view.setPointerCapture(e.pointerId)};view.onpointermove=e=>{hoverRegion(e);if(measureMode==='straight'&&measurePoints.length){measureCursor=worldPoint(e);renderMeasurement()}if(measureMode==='free'&&measureDrawing&&(e.buttons&1)){const point=worldPoint(e),last=measurePoints[measurePoints.length-1];if(!last||Math.hypot(point.x-last.x,point.y-last.y)>2/zoom){measurePoints.push(point);renderMeasurement()}}if(!drag)return;if(Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly)>2)moved=true;x+=e.clientX-lx;y+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()};view.onpointerup=e=>{if(e.button===0&&measureMode){measureDrawing=false;return}if(!moved&&mode.startsWith('region:')&&!measureMode){const found=regionAt(e,mode.slice(7));if(found)openRegion(found.region)}drag=false;view.classList.remove('dragging')};view.onpointercancel=e=>{measureDrawing=false;drag=false;view.classList.remove('dragging')};view.onwheel=e=>{e.preventDefault();const r=view.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,old=zoom;zoom=Math.max(.05,Math.min(8,zoom*(e.deltaY<0?1.1:.9)));x=mx-(mx-x)*zoom/old;y=my-(my-y)*zoom/old;draw()};details.querySelector('.close').onclick=()=>details.hidden=true;details.onclick=e=>{if(e.target===details)details.hidden=true};lightbox.onclick=e=>{if(e.target===lightbox)lightbox.hidden=true};
<\/script></body></html>`;
}

async function prepareMergedLayerSources(label) {
  const layers = state.layers.filter((layer) => layer.mask instanceof HTMLCanvasElement);
  showTaskProgress(label, 0);
  try {
    await flushPendingMaskChunks('Codificando chunks para exportação');
    for (let index = 0; index < layers.length; index++) {
      layers[index].maskExportSource = await drawableDataUrl(layers[index].mask);
      updateTaskProgress(label, (index + 1) / Math.max(1, layers.length) * 100); await nextFrame();
    }
  } finally { hideTaskProgress(); }
}

$('#exportMapBtn').onclick = async () => { await prepareMergedLayerSources('Mesclando máscaras do mapa'); downloadFile('mapa-teralium.html', createMapHtml(), 'text/html'); };
$('#previewMapBtn').onclick = async () => {
  // Reserve the tab synchronously while this click still counts as a user
  // gesture. Opening it after the awaited chunk merge is blocked as a popup by
  // browsers, particularly when Atlasmith itself is running from file://.
  const previewWindow = window.open('about:blank', '_blank');
  if (!previewWindow) { window.alert('O navegador bloqueou a aba de pré-visualização. Permita pop-ups para o Atlasmith.'); return; }
  previewWindow.blur(); window.focus();
  previewWindow.document.title = 'Preparando pré-visualização…';
  previewWindow.document.body.innerHTML = '<p style="background:#101311;color:#edf0ed;font:14px sans-serif;margin:0;padding:24px">Preparando pré-visualização…</p>';
  try {
    await prepareMergedLayerSources('Preparando pré-visualização');
    const url = URL.createObjectURL(new Blob([createMapHtml()], { type: 'text/html' }));
    previewWindow.location.replace(url);
    previewWindow.blur(); window.focus();
    previewWindow.opener = null;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    previewWindow.close();
    window.alert(`Não foi possível abrir a pré-visualização: ${error.message}`);
  }
};

window.addEventListener('resize', () => { if (selectedLayer()?.mask) fit(); });

$('#languageSelect').addEventListener('change', (event) => applyLanguage(event.target.value));
$('#themeSetting').addEventListener('change', (event) => applyTheme(event.target.value));

const firstLayer = createLayer();
state.layers.push(firstLayer);
applyTheme(state.theme);
setBrushRepetition(state.terrainBrushRepetition);
selectLayer(firstLayer.id);
applyLanguage(state.language);
updateTransform();
fetch('../data/poi-types.json')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('Tipos indisponíveis')))
  .then((types) => { state.poiTypes = types; populateObjectOptions(); redraw(); })
  .catch(() => { /* The embedded defaults keep local file usage functional. */ });
