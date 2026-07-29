const canvas = document.querySelector('#mapCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.querySelector('#viewport');
const stage = document.querySelector('#stage');
const $ = (selector) => document.querySelector(selector);
document.addEventListener('contextmenu', (event) => event.preventDefault());

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
  imageSets: [],
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
  $('.language-picker').firstChild.textContent = `${t('language')} `;
  const layer = selectedLayer();
  if (layer) {
    $('#createMaskBtn').textContent = layer.mask ? t('editMask') : t('createMask');
    document.querySelector('.upload b').textContent = layer.type === 'image' ? t('uploadImage') : t('uploadMask');
    if (layer.type === 'terrain') renderTerrainAnchorPreview(layer);
    if (layer.type === 'object') renderObjectAnchorPreview(layer.object);
  }
  translateDocument();
}

function createLayer(type = 'terrain') {
  const number = state.layers.length + 1;
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${number}`,
    type,
    name: type === 'image' ? `Imagem ${number}` : type === 'object' ? `Objeto ${number}` : type === 'region' ? `Região ${number}` : type === 'path' ? `Caminho ${number}` : type === 'folder' ? `Folder ${number}` : (number === 1 ? 'Cobertura vegetal' : `Terreno ${number}`),
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
    object: type === 'object' ? { name: '', type: 'vila', iconSetId: '', gallerySetId: '', description: '', detailedTemplateId: '', descriptionPages: [], poi: true, x: null, y: null, scale: 1, opacity: 1, offsetX: 0, offsetY: 0, anchorX: 0.5, anchorY: 1 } : null,
    region: type === 'region' ? { group: 'Regiões', presetId: 'regions', name: `Região ${number}`, color: '#6fa86b', fillMode: 'fill', outlineThickness: 3, outlineDashed: false, outlineGap: 12, defaultOverview: false, drawnAt: 0 } : null,
    path: type === 'path' ? { name: `Caminho ${number}`, description: '', gallerySetId: '', showOnMap: true, presetId: 'road', points: [], distance: 0 } : null,
    output: document.createElement('canvas'),
    placements: [],
    settings: { density: 45, scale: 1, sizeVariation: true, sizeMin: 0.7, sizeMax: 1.3, seed: `Teralium-0${number}`, rotation: true, mirror: true, slice: false, imageOffsetX: 0, imageOffsetY: 0, imageOpacity: 1 },
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

function redraw(includeObjects = true, showSelection = true, includePaths = true) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Background images retain their explicit layer priority.
  for (const layer of [...state.layers].reverse()) {
    if (!layer.visible) continue;
    if (layer.type === 'image' && layer.image) {
      ctx.save();
      ctx.globalAlpha = layer.settings.imageOpacity;
      ctx.drawImage(layer.image, layer.settings.imageOffsetX, layer.settings.imageOffsetY, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  // Every generated asset and placed object shares one Y-sorted scene, even
  // when the entries came from different layers.
  const depthEntries = [];
  state.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    if (layer.type === 'terrain') {
      if (layer.placements?.length) {
        if (layer.settings.slice && layer.mask && !layer.maskPath) prepareMask(layer);
        layer.placements.forEach((placement) => depthEntries.push({ y: placement.y, layerIndex, layer, placement }));
      }
      else if (layer.output.width) depthEntries.push({ y: -Infinity, layerIndex, layer });
    }
    if (layer.type === 'object' && layer.object?.x !== null && (includeObjects || !layer.object.poi)) {
      depthEntries.push({ y: layer.object.y + (layer.object.offsetY ?? 0), layerIndex, object: layer.object });
    }
  });
  depthEntries.sort((first, second) => first.y - second.y || second.layerIndex - first.layerIndex);
  for (const entry of depthEntries) {
    if (entry.object) drawMapObject(entry.object);
    else if (entry.placement) drawTerrainPlacement(entry.layer, entry.placement, ctx);
    else ctx.drawImage(entry.layer.output, 0, 0);
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
    ctx.drawImage(outline, 0, 0);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.drawImage(layer.mask, 0, 0, canvas.width, canvas.height); ctx.restore();
  }
  if (layer.type === 'path' && layer.path.points.length) {
    const preset = pathPreset(layer); ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = preset.stroke + 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    layer.path.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke(); ctx.restore(); drawPathLayer(layer);
  }
  if (layer.type === 'image' && layer.image) { ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4); ctx.restore(); }
  if (layer.type === 'object' && layer.object?.x !== null) {
    const icon = state.imageSets.find((set) => set.id === layer.object.iconSetId)?.assets[0]?.image;
    if (icon) {
      const height = 48 * (layer.object.scale ?? 1), width = icon.naturalWidth / icon.naturalHeight * height;
      const x = layer.object.x + (layer.object.offsetX ?? 0) - width * (layer.object.anchorX ?? 0.5);
      const y = layer.object.y + (layer.object.offsetY ?? 0) - height * (layer.object.anchorY ?? 1);
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

function drawTerrainPlacement(layer, placement, context) {
  const assetEntry = layer.assets[placement.assetIndex];
  const asset = assetEntry?.image || placement.asset;
  if (!asset) return;
  const width = asset.naturalWidth * layer.settings.scale * placement.variation;
  const height = asset.naturalHeight * layer.settings.scale * placement.variation;
  context.save();
  if (layer.settings.slice && layer.maskPath) context.clip(layer.maskPath);
  context.translate(placement.x, placement.y);
  context.rotate(placement.rotation);
  if (placement.mirrored) context.scale(-1, 1);
  context.drawImage(asset, -width * (assetEntry?.anchorX ?? 0.5), -height * (assetEntry?.anchorY ?? 0.5), width, height);
  context.restore();
}

function drawMapObject(object) {
  const set = state.imageSets.find((item) => item.id === object.iconSetId);
  const icon = set?.assets[0]?.image;
  if (!icon) return;
  const size = 48 * (object.scale ?? 1);
  const width = icon.naturalWidth / icon.naturalHeight * size;
  const x = object.x + (object.offsetX ?? 0);
  const y = object.y + (object.offsetY ?? 0);
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
  const regionGroups = new Map();
  for (const layer of state.layers) {
    const button = document.createElement('button');
    button.className = `layer-card${layer.id === state.selectedId ? ' active' : ''}${layer.visible ? '' : ' is-hidden'}`;
    const layerMeta = layer.type === 'image' ? ['▧', 'Imagem'] : layer.type === 'object' ? ['⌖', 'Objeto'] : layer.type === 'region' ? ['◒', 'Região'] : layer.type === 'path' ? ['〰', 'Caminho'] : layer.type === 'folder' ? ['▰', 'Folder'] : ['⌁', 'Terreno'];
    button.innerHTML = `<span class="layer-icon">${layerMeta[0]}</span><div><b></b><small>${layerMeta[1]}</small></div><span class="visibility" title="Alternar visibilidade">◉</span>`;
    button.draggable = true;
    button.dataset.layerId = layer.id;
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
    if (layer.type === 'region') {
      const groupName = layer.region.group || 'Regiões';
      let group = regionGroups.get(groupName);
      if (!group) {
        group = document.createElement('section'); group.className = 'region-layer-group';
        const title = document.createElement('p'); title.textContent = groupName;
        group.append(title); regionGroups.set(groupName, group); list.append(group);
      }
      group.append(button);
    } else list.append(button);
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

function selectLayer(id) {
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
  $('#rotation').checked = layer.settings.rotation;
  $('#mirror').checked = layer.settings.mirror;
  $('#slice').checked = layer.settings.slice;
  $('#imageOffsetX').value = layer.settings.imageOffsetX;
  $('#imageOffsetY').value = layer.settings.imageOffsetY;
  $('#imageOpacity').value = layer.settings.imageOpacity;
  $('#imageOffsetXValue').value = layer.settings.imageOffsetX;
  $('#imageOffsetYValue').value = layer.settings.imageOffsetY;
  $('#imageOpacityValue').value = Math.round(layer.settings.imageOpacity * 100);
  $('#typeBadge').textContent = layer.type === 'image' ? 'Imagem' : layer.type === 'object' ? 'Objeto' : layer.type === 'region' ? 'Região' : layer.type === 'path' ? 'Caminho' : layer.type === 'folder' ? 'Folder' : 'Terreno';
  document.querySelectorAll('.terrain-control, .image-control, .object-control, .region-control, .path-control').forEach((control) => {
    control.hidden = !control.classList.contains(`${layer.type}-control`);
  });
  const upload = document.querySelector('.upload');
  upload.querySelector('b').textContent = layer.type === 'image' ? t('uploadImage') : t('uploadMask');
  upload.querySelector('small').textContent = layer.type === 'image' ? 'Background ou elemento visual' : 'PNG preto com transparência recomendado';
  $('#generateBtn').hidden = layer.type !== 'terrain';
  $('#footerHint').textContent = layer.type === 'terrain' ? 'A seed mantém o resultado reproduzível.' : 'Arraste a camada para definir sua prioridade.';
  if (layer.type === 'object') fillObjectInspector(layer.object);
  if (layer.type === 'region') {
    $('#regionName').value = layer.region.name;
    renderRegionPresets(layer.region.presetId);
  }
  if (layer.type === 'path') fillPathInspector(layer);
  if (layer.type === 'terrain' || layer.type === 'region') renderMaskPreview(layer);
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
  const image = new Image(); image.src = layer.mask.src; image.alt = layer.maskName;
  const name = document.createElement('small'); name.textContent = layer.maskName;
  const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remover máscara';
  remove.onclick = () => {
    layer.mask = null; layer.maskName = ''; layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null; layer.output.width = 0;
    layer.placements = [];
    $('#maskName').textContent = 'Nenhuma máscara selecionada'; $('#createMaskBtn').textContent = t('createMask'); renderMaskPreview(layer); updateReadyState(); redraw();
  };
  card.append(image, name, remove); preview.append(card);
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
  $('#pathDistance').textContent = `Distância: ${Math.round(layer.path.distance || calculatePathDistance(layer.path.points))} km`;
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
  const image = trigger.querySelector('img'); image.src = set?.assets[0]?.image.src || ''; image.hidden = !set?.assets.length;
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
      layer.object.iconSetId = set.id; $('#objectIconSet').value = set.id;
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
function cloneDescriptionPages(pages) { return (pages || []).map((page) => ({ ...page, images: [...(page.images || [])] })); }

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
    const content = document.createElement('textarea'); content.rows = 8; content.value = page.content; content.placeholder = 'Conteúdo desta página...'; content.oninput = () => { page.content = content.value; };
    const images = document.createElement('div'); images.className = 'description-page-images'; images.replaceChildren(...page.images.map((source) => { const image = new Image(); image.src = source; return image; }));
    const upload = document.createElement('label'); upload.className = 'position-object'; upload.textContent = '＋ Adicionar imagens nesta página';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
    input.onchange = async () => { for (const file of input.files) page.images.push((await fileImage(file)).src); renderDescriptionPageEditor(); }; upload.append(input);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger-button position-object'; remove.textContent = 'Excluir página'; remove.onclick = () => { editingDescriptionPages.splice(index, 1); activeDescriptionPageIndex = Math.max(0, Math.min(index, editingDescriptionPages.length - 1)); renderDescriptionPageEditor(); };
    card.append(title);
    if (!editingTemplateStructureOnly) card.append(content, images, upload);
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
  const icon = state.imageSets.find((item) => item.id === object.iconSetId)?.assets[0]?.image;
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
      const image = new Image(); image.src = asset.image.src; image.alt = asset.file.name; return image;
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
      if (pixels[index + 3] > 16 && darkness > 0.2) {
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

async function generate() {
  const layer = selectedLayer();
  if (!layer.mask || !layer.assets.length) return;
  if (!layer.maskPixels) prepareMask(layer);
  if (!layer.bounds) {
    $('#saveState').textContent = 'Máscara vazia';
    return;
  }

  const token = ++state.generationToken;
  $('#saveState').textContent = 'Calculando…';
  $('#generateBtn').disabled = true;
  layer.output.width = canvas.width;
  layer.output.height = canvas.height;
  layer.placements = [];
  const outputContext = layer.output.getContext('2d');
  outputContext.imageSmoothingEnabled = false;
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
  // Below the default scale, progressively apply an additional boost of up to
  // 5x. This sits on top of the inverse-square footprint compensation above.
  const smallScaleBoost = layer.settings.scale < 1
    ? 1 + (1 - layer.settings.scale) * 4
    : 1;
  // 100 is the base occupancy; 1000 layers roughly ten passes over the same
  // footprint and is intended to produce an almost completely filled mask.
  // The point budget remains independent of asset count.
  const attempts = Math.min(1250000, Math.round((width * height / (footprint * footprint)) * layer.settings.density / 100 * smallScaleBoost));
  const placements = [];
  let iteration = 0;

  // Resolve spawn points in small batches. The mask chooses the origin only;
  // graphics may naturally extend beyond it unless Slice is enabled.
  await new Promise((resolve) => {
    function calculateBatch() {
      if (token !== state.generationToken) return resolve();
      const batchEnd = Math.min(iteration + 2500, attempts);
      for (; iteration < batchEnd; iteration++) {
        const x = minX + random() * width;
        const y = minY + random() * height;
        const pixel = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const alpha = layer.maskPixels[pixel + 3] / 255;
        const darkness = 1 - (layer.maskPixels[pixel] + layer.maskPixels[pixel + 1] + layer.maskPixels[pixel + 2]) / 765;
        const coverage = alpha * darkness;
        if (coverage < 0.2 || random() > coverage) continue;
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
  $('#distanceScaleKm').value = state.distanceScaleKm;
  $('#speedWalking').value = state.travelSpeeds.walking; $('#speedHorse').value = state.travelSpeeds.horse; $('#speedShip').value = state.travelSpeeds.ship; $('#speedAir').value = state.travelSpeeds.air;
  $('#projectSettingsModal').hidden = false;
};
$('#closeProjectSettings').onclick = () => { $('#projectSettingsModal').hidden = true; };
$('#projectSettingsModal').addEventListener('click', (event) => { if (event.target === $('#projectSettingsModal')) $('#projectSettingsModal').hidden = true; });
$('#distanceScaleKm').addEventListener('input', (event) => {
  state.distanceScaleKm = Math.max(0.01, Number(event.target.value) || 100);
  state.layers.filter((layer) => layer.type === 'path').forEach((layer) => { layer.path.distance = calculatePathDistance(layer.path.points); });
  if (selectedLayer()?.type === 'path') fillPathInspector(selectedLayer());
});
for (const [id, property] of Object.entries({ speedWalking: 'walking', speedHorse: 'horse', speedShip: 'ship', speedAir: 'air' })) {
  $(`#${id}`).addEventListener('input', (event) => { state.travelSpeeds[property] = Math.max(0.01, Number(event.target.value) || 0.01); });
}
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
  for (const set of state.imageSets) {
    const item = document.createElement('div');
    item.className = 'image-set';
    item.innerHTML = '<div><b></b><small></small></div><button class="edit-set" title="Editar">✎</button><button class="use-set">Usar</button>';
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
  if (!state.imageSets.length) list.innerHTML = '<div class="set-empty">Nenhum conjunto criado ainda.</div>';
  translateDocument(list);
}

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

['density', 'scale', 'sizeMin', 'sizeMax'].forEach((id) => {
  $(`#${id}`).addEventListener('input', (event) => {
    const layer = selectedLayer();
    layer.settings[id] = Number(event.target.value);
    if (id === 'sizeMin' && layer.settings.sizeMin > layer.settings.sizeMax) layer.settings.sizeMax = layer.settings.sizeMin;
    if (id === 'sizeMax' && layer.settings.sizeMax < layer.settings.sizeMin) layer.settings.sizeMin = layer.settings.sizeMax;
    $('#sizeMin').value = layer.settings.sizeMin;
    $('#sizeMax').value = layer.settings.sizeMax;
    updateOutputs();
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
bindNumberInput('densityValue', 'density', (value) => { selectedLayer().settings.density = value; });
bindNumberInput('scaleValue', 'scale', (value) => { selectedLayer().settings.scale = value; });
bindNumberInput('imageOffsetXValue', 'imageOffsetX', (value) => { selectedLayer().settings.imageOffsetX = value; redraw(); });
bindNumberInput('imageOffsetYValue', 'imageOffsetY', (value) => { selectedLayer().settings.imageOffsetY = value; redraw(); });
bindNumberInput('imageOpacityValue', 'imageOpacity', (value) => { selectedLayer().settings.imageOpacity = value; redraw(); }, 100);
bindNumberInput('objectScaleValue', 'objectScale', (value) => { selectedLayer().object.scale = value; redraw(); });
bindNumberInput('objectOpacityValue', 'objectOpacity', (value) => { selectedLayer().object.opacity = value; redraw(); }, 100);
bindNumberInput('objectOffsetXValue', 'objectOffsetX', (value) => { selectedLayer().object.offsetX = value; redraw(); });
bindNumberInput('objectOffsetYValue', 'objectOffsetY', (value) => { selectedLayer().object.offsetY = value; redraw(); });
$('#sizeVariation').addEventListener('change', (event) => {
  selectedLayer().settings.sizeVariation = event.target.checked;
  updateOutputs();
});
$('#seed').addEventListener('input', (event) => { selectedLayer().settings.seed = event.target.value; });
$('#rotation').addEventListener('change', (event) => { selectedLayer().settings.rotation = event.target.checked; });
$('#mirror').addEventListener('change', (event) => { selectedLayer().settings.mirror = event.target.checked; });
$('#slice').addEventListener('change', (event) => { selectedLayer().settings.slice = event.target.checked; });
const maskEditCanvas = $('#maskEditCanvas');
const maskEditContext = maskEditCanvas.getContext('2d');
let maskTool = 'brush';
let maskDrawing = false;
let maskPanning = false;
let maskPanX = 0;
let maskPanY = 0;
let maskPaintPointerId = null;
let maskHistory = [];
const brushCursor = $('#brushCursor');

$('#createMaskBtn').onclick = () => {
  const layer = selectedLayer();
  maskEditCanvas.width = canvas.width; maskEditCanvas.height = canvas.height;
  maskEditContext.clearRect(0, 0, canvas.width, canvas.height);
  if (layer.mask) maskEditContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
  state.maskEditing = layer.id;
  maskHistory = [];
  state.drag = false;
  viewport.classList.remove('dragging');
  maskEditCanvas.style.display = 'block';
  redraw();
  $('#maskTools').hidden = false; $('#brushSizeControl').hidden = false;
  $('#saveState').textContent = 'Editando máscara';
};
document.querySelectorAll('[data-mask-tool]').forEach((button) => {
  button.onclick = () => {
    maskTool = button.dataset.maskTool;
    document.querySelectorAll('[data-mask-tool]').forEach((item) => item.classList.toggle('active', item === button));
    $('#brushSizeControl').hidden = maskTool === 'fill';
  };
});
$('#brushSize').oninput = (event) => {
  $('#brushSizeValue').value = event.target.value;
  brushCursor.style.width = `${event.target.value}px`; brushCursor.style.height = `${event.target.value}px`;
};
$('#brushOpacity').oninput = (event) => { $('#brushOpacityValue').value = Math.round(event.target.value * 100); };
bindNumberInput('brushSizeValue', 'brushSize', () => {});
bindNumberInput('brushOpacityValue', 'brushOpacity', () => {}, 100);
function paintMask(event) {
  if (!maskDrawing || maskPaintPointerId !== event.pointerId || !(event.buttons & 1)) return;
  if (maskTool === 'fill') {
    maskEditContext.globalCompositeOperation = 'source-over';
    maskEditContext.globalAlpha = Number($('#brushOpacity').value);
    maskEditContext.fillStyle = '#000'; maskEditContext.fillRect(0, 0, canvas.width, canvas.height); maskEditContext.globalAlpha = 1;
    maskDrawing = false;
    return;
  }
  const rectangle = maskEditCanvas.getBoundingClientRect();
  const x = (event.clientX - rectangle.left) * canvas.width / rectangle.width;
  const y = (event.clientY - rectangle.top) * canvas.height / rectangle.height;
  maskEditContext.globalCompositeOperation = maskTool === 'eraser' ? 'destination-out' : 'source-over';
  maskEditContext.globalAlpha = Number($('#brushOpacity').value);
  maskEditContext.fillStyle = '#000';
  maskEditContext.beginPath(); maskEditContext.arc(x, y, Number($('#brushSize').value) / 2, 0, Math.PI * 2); maskEditContext.fill(); maskEditContext.globalAlpha = 1;
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
    maskHistory.push(maskEditCanvas.toDataURL('image/png'));
    if (maskHistory.length > 20) maskHistory.shift();
    maskDrawing = true; maskPaintPointerId = event.pointerId; paintMask(event);
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
    if (!(event.buttons & 1)) { maskDrawing = false; maskPaintPointerId = null; return; }
    paintMask(event);
  }
};
maskEditCanvas.onpointerleave = () => { if (!maskDrawing) brushCursor.style.display = 'none'; };
maskEditCanvas.onpointerenter = (event) => { if (!maskPanning && maskTool !== 'fill') maskEditCanvas.onpointermove(event); };
function stopMaskPointer(event) {
  event?.stopPropagation();
  maskDrawing = false; maskPanning = false; maskPaintPointerId = null;
}
maskEditCanvas.onpointerup = stopMaskPointer;
maskEditCanvas.onpointercancel = stopMaskPointer;
maskEditCanvas.onlostpointercapture = stopMaskPointer;
async function closeMaskEditor(save) {
  const layer = state.layers.find((item) => item.id === state.maskEditing);
  if (save && layer) {
    layer.mask = await imageFromSource(maskEditCanvas.toDataURL('image/png'));
    layer.maskName = 'Máscara criada no editor'; layer.maskPixels = null; layer.maskPath = null; layer.clip = null; layer.bounds = null; layer.output.width = 0; layer.placements = [];
    if (layer.type === 'region') await applyRegionPriority(layer);
    $('#maskName').textContent = layer.maskName; $('#createMaskBtn').textContent = t('editMask'); renderMaskPreview(layer); updateReadyState(); redraw();
  }
  state.maskEditing = null; maskEditCanvas.style.display = 'none'; $('#maskTools').hidden = true; $('#brushSizeControl').hidden = true;
  brushCursor.style.display = 'none'; maskHistory = [];
  redraw();
  $('#saveState').textContent = save ? 'Máscara atualizada' : 'Edição cancelada';
}
$('#finishMask').onclick = () => closeMaskEditor(true);
$('#cancelMask').onclick = () => closeMaskEditor(false);
document.addEventListener('keydown', async (event) => {
  if (!state.maskEditing || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
  event.preventDefault();
  const snapshot = maskHistory.pop();
  if (!snapshot) return;
  const image = await imageFromSource(snapshot);
  maskEditContext.globalCompositeOperation = 'source-over';
  maskEditContext.clearRect(0, 0, canvas.width, canvas.height);
  maskEditContext.drawImage(image, 0, 0);
  $('#saveState').textContent = `Desfazer • ${maskHistory.length} restante(s)`;
});
$('#randomSeed').onclick = () => {
  selectedLayer().settings.seed = Math.random().toString(36).slice(2, 10);
  $('#seed').value = selectedLayer().settings.seed;
};
$('#generateBtn').onclick = generate;

document.addEventListener('click', (event) => {
  if (!event.target.closest('#layerContextMenu')) $('#layerContextMenu').hidden = true;
});
$('#layerContextMenu').addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  const layer = state.layers.find((item) => item.id === state.contextLayerId);
  if (!action || !layer) return;
  if (action === 'rename') {
    const name = window.prompt('Nome da camada:', layer.name);
    if (name?.trim()) layer.name = name.trim();
  } else if (action === 'toggle') {
    layer.visible = !layer.visible;
    if (layer.type === 'folder') state.layers.forEach((item) => { if (item.parentId === layer.id) item.visible = layer.visible; });
  } else if (action === 'delete') {
    const index = state.layers.indexOf(layer);
    if (layer.type === 'folder') state.layers.forEach((item) => { if (item.parentId === layer.id) item.parentId = null; });
    state.layers.splice(index, 1);
    if (!state.layers.length) state.layers.push(createLayer());
    if (layer.id === state.selectedId) selectLayer(state.layers[Math.min(index, state.layers.length - 1)].id);
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

function createProjectData() {
  return {
    format: 'teralium-map-project', version: 2,
    canvas: { width: canvas.width, height: canvas.height },
    selectedId: state.selectedId,
    pathPresets: state.pathPresets,
    regionPresets: state.regionPresets,
    distanceScaleKm: state.distanceScaleKm,
    travelSpeeds: state.travelSpeeds,
    descriptionTemplates: state.descriptionTemplates,
    imageSets: state.imageSets.map((set) => ({ id: set.id, name: set.name, assets: set.assets.map(serializeAsset) })),
    layers: state.layers.map((layer) => ({
      id: layer.id, type: layer.type, name: layer.name, visible: layer.visible, parentId: layer.parentId, collapsed: layer.collapsed, selectedAssetIndex: layer.selectedAssetIndex,
      maskName: layer.maskName, maskSource: layer.mask?.src || null, imageSource: layer.image?.src || null,
      assets: layer.assets.map(serializeAsset), settings: layer.settings, object: layer.object, region: layer.region, path: layer.path,
      placements: (layer.placements || []).map(({ x, y, assetIndex, variation, rotation, mirrored }) => ({ x, y, assetIndex, variation, rotation, mirrored })),
      outputSource: layer.output.width ? layer.output.toDataURL('image/png') : null,
    })),
  };
}

$('#saveProjectBtn').onclick = () => {
  const project = createProjectData();
  downloadFile('projeto-teralium.json', JSON.stringify(project), 'application/json');
  $('#saveState').textContent = 'Projeto salvo';
};

$('#openProjectBtn').onclick = () => $('#projectInput').click();
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
  try {
    $('#saveState').textContent = 'Abrindo…';
    const projectText = file.name.toLowerCase().endsWith('.zip') ? projectJsonFromZip(await file.arrayBuffer()) : await file.text();
    const project = JSON.parse(projectText);
    if (project.format !== 'teralium-map-project') throw new Error('Formato inválido');
    canvas.width = project.canvas.width; canvas.height = project.canvas.height;
    state.pathPresets = project.pathPresets?.length ? project.pathPresets : state.pathPresets;
    state.regionPresets = project.regionPresets?.length ? project.regionPresets : state.regionPresets;
    state.distanceScaleKm = Number(project.distanceScaleKm) || 100;
    state.travelSpeeds = { ...state.travelSpeeds, ...project.travelSpeeds };
    state.descriptionTemplates = project.descriptionTemplates || [];
    state.imageSets = await Promise.all(project.imageSets.map(async (set) => ({
      ...set, assets: await Promise.all(set.assets.map(async (asset) => ({ file: { name: asset.name }, image: await imageFromSource(asset.source), anchorX: asset.anchorX, anchorY: asset.anchorY }))),
    })));
    state.layers = await Promise.all(project.layers.map(async (saved) => {
      const layer = createLayer(saved.type);
      Object.assign(layer, { id: saved.id, name: saved.name, visible: saved.visible, parentId: saved.parentId || null, collapsed: Boolean(saved.collapsed), maskName: saved.maskName, selectedAssetIndex: saved.selectedAssetIndex || 0, settings: { ...layer.settings, ...saved.settings } });
      if (saved.object) layer.object = saved.object;
      if (saved.region) layer.region = { ...layer.region, ...saved.region };
      if (saved.path) layer.path = saved.path;
      if (saved.maskSource) layer.mask = await imageFromSource(saved.maskSource);
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
  event.target.value = '';
});

viewport.addEventListener('pointerdown', (event) => {
  if (state.drawingPath && selectedLayer()?.type === 'path' && event.button === 0) {
    const rectangle = viewport.getBoundingClientRect();
    selectedLayer().path.points.push({ x: (event.clientX - rectangle.left - state.x) / state.zoom, y: (event.clientY - rectangle.top - state.y) / state.zoom });
    selectedLayer().path.distance = calculatePathDistance(selectedLayer().path.points);
    $('#pathDistance').textContent = `Distância: ${Math.round(selectedLayer().path.distance)} km`;
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
  state.drag = true; state.lastX = event.clientX; state.lastY = event.clientY;
  viewport.classList.add('dragging');
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener('pointermove', (event) => {
  if (!state.drag) return;
  state.x += event.clientX - state.lastX; state.y += event.clientY - state.lastY;
  state.lastX = event.clientX; state.lastY = event.clientY;
  updateTransform();
});
viewport.addEventListener('pointerup', () => { state.drag = false; viewport.classList.remove('dragging'); });
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

$('#exportBtn').onclick = () => {
  $('#saveState').textContent = 'Exportando projeto…';
  redraw(true, false);
  const project = createProjectData();
  const files = [
    { name: 'projeto-teralium.json', bytes: JSON.stringify(project, null, 2) },
    { name: 'mapa-render-final.png', bytes: dataUrlBytes(canvas.toDataURL('image/png')) },
  ];
  state.layers.forEach((layer, index) => {
    if (layer.mask) files.push({ name: `mascaras/${index + 1}-${safeFileName(layer.maskName, layer.name)}.png`, bytes: dataUrlBytes(layer.mask.src) });
    if (layer.image) files.push({ name: `assets/camadas/${index + 1}-${safeFileName(layer.name, 'imagem')}.png`, bytes: dataUrlBytes(layer.image.src) });
    layer.assets.forEach((asset, assetIndex) => files.push({ name: `assets/camadas/${index + 1}/${assetIndex + 1}-${safeFileName(asset.file.name, 'asset')}`, bytes: dataUrlBytes(asset.image.src) }));
  });
  state.imageSets.forEach((set, setIndex) => set.assets.forEach((asset, assetIndex) => files.push({ name: `assets/biblioteca/${setIndex + 1}-${safeFileName(set.name, 'conjunto')}/${assetIndex + 1}-${safeFileName(asset.file.name, 'asset')}`, bytes: dataUrlBytes(asset.image.src) })));
  downloadFile('projeto-teralium.zip', zipProject(files), 'application/zip');
  redraw();
  $('#saveState').textContent = 'Projeto exportado';
};
function exportablePois() {
  return state.layers.filter((layer) => layer.visible && layer.type === 'object' && layer.object?.poi && layer.object.x !== null).map((layer) => {
    const object = layer.object;
    const iconSet = state.imageSets.find((set) => set.id === object.iconSetId);
    const gallerySet = state.imageSets.find((set) => set.id === object.gallerySetId);
    const type = state.poiTypes.find((item) => item.id === object.type) || state.poiTypes.at(-1);
    return { ...object, x: object.x + (object.offsetX ?? 0), y: object.y + (object.offsetY ?? 0), id: layer.id, icon: iconSet?.assets[0]?.image.src || '', gallery: gallerySet?.assets.map((asset) => asset.image.src) || [], typeName: type?.name || object.type, color: type?.color || '#fff' };
  }).filter((poi) => poi.icon);
}

function exportableRegions() {
  return state.layers.filter((layer) => layer.visible && layer.type === 'region' && layer.mask).map((layer) => {
    const scratch = document.createElement('canvas'); scratch.width = canvas.width; scratch.height = canvas.height;
    const regionContext = scratch.getContext('2d', { willReadFrequently: true });
    regionContext.drawImage(layer.mask, 0, 0, canvas.width, canvas.height);
    const pixels = regionContext.getImageData(0, 0, canvas.width, canvas.height).data;
    let totalX = 0, totalY = 0, count = 0;
    for (let y = 0; y < canvas.height; y += 4) for (let x = 0; x < canvas.width; x += 4) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 32) { totalX += x; totalY += y; count++; }
    }
    return { id: layer.id, group: layer.region.group || 'Regiões', name: layer.region.name, color: layer.region.color, fillMode: layer.region.fillMode || 'fill', outlineThickness: layer.region.outlineThickness ?? 3, outlineDashed: Boolean(layer.region.outlineDashed), outlineGap: layer.region.outlineGap ?? 12, defaultOverview: Boolean(layer.region.defaultOverview), mask: layer.mask.src, centerX: count ? totalX / count : canvas.width / 2, centerY: count ? totalY / count : canvas.height / 2 };
  });
}

function exportablePaths() {
  return state.layers.filter((layer) => layer.visible && layer.type === 'path' && layer.path?.showOnMap && layer.path.points.length > 1).map((layer) => {
    const preset = pathPreset(layer);
    const gallery = state.imageSets.find((set) => set.id === layer.path.gallerySetId)?.assets.map((asset) => asset.image.src) || [];
    return { id: layer.id, name: layer.path.name, description: layer.path.description, points: layer.path.points, distance: layer.path.distance || calculatePathDistance(layer.path.points), gallery, preset };
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
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mapa de Teralium</title><style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#101311;color:#eef2ee;font-family:Arial,sans-serif}.side{position:fixed;z-index:10;inset:0 auto 0 0;width:280px;padding:22px 16px;background:#171a18;border-right:1px solid #303630;overflow:auto}.side h1{font-size:18px;margin:0 0 18px}.side input,.side select,.filter-button{width:100%;padding:10px;margin-bottom:8px;border:1px solid #343b35;border-radius:7px;background:#0f1210;color:#eef2ee}.filter-button{border:1px solid #343b35;border-radius:7px;background:#0f1210;color:#eef2ee;text-align:left;cursor:pointer}.type-choices{display:grid;gap:8px;margin-top:18px}.type-choices label{display:flex;gap:8px;align-items:center;padding:9px;border-radius:7px;background:#111512}.poi-list{display:grid;gap:5px;margin-top:12px}.poi-item{padding:10px;border:0;border-radius:7px;background:transparent;color:#eef2ee;text-align:left;cursor:pointer}.poi-item:hover{background:#252b26}.poi-item small{display:block;margin-top:3px;color:#89928b}.view{position:fixed;inset:0 0 0 280px;overflow:hidden;cursor:grab;background-image:linear-gradient(#1b201c 1px,transparent 1px),linear-gradient(90deg,#1b201c 1px,transparent 1px);background-size:24px 24px}.view.dragging{cursor:grabbing}.world{position:absolute;transform-origin:0 0}.map{position:absolute;inset:0;pointer-events:none;user-select:none;-webkit-user-drag:none;image-rendering:pixelated}.paths{position:absolute;inset:0;overflow:visible}.path-line{fill:none;pointer-events:stroke;cursor:pointer;transition:filter .15s,stroke .15s}.path-line:hover{stroke:#fff!important;filter:drop-shadow(0 0 5px #fff)}.path-label{display:none;position:absolute;z-index:5;transform:translate(-50%,-100%);padding:5px 8px;border-radius:5px;background:#111d;color:#fff;font-size:12px;white-space:nowrap;pointer-events:none}.pin{position:absolute;transform:translate(-50%,calc(-48px * var(--scale)));display:grid;justify-items:center;border:0;background:transparent;color:var(--color);cursor:pointer}.pin img{width:calc(48px * var(--scale));height:calc(48px * var(--scale));object-fit:contain;image-rendering:pixelated}.pin span{margin-top:3px;color:var(--color);font-weight:700;font-size:14px;white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.pin:hover img{filter:drop-shadow(0 0 2px white) drop-shadow(0 0 5px var(--color))}.pin:hover span{color:#fff}.pin.focused img{filter:drop-shadow(0 0 3px #ff8a2a) drop-shadow(0 0 9px #ff8a2a)}.pin.focused span{color:#ff9b42}.view-tools{position:fixed;z-index:12;left:296px;top:50%;transform:translateY(-50%);display:grid;gap:4px;padding:5px;border:1px solid #3a423b;border-radius:9px;background:#181c19dd;box-shadow:0 8px 25px #0009}.view-tools button{width:38px;height:38px;padding:0;border:0;border-radius:6px;background:transparent;color:#879088;cursor:pointer}.view-tools button.active{background:#30392c;color:#b7df72}.region-layer{position:absolute;inset:0;display:none;pointer-events:none}.region-layer canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}.region-layer .fill,.region-layer .outline{display:none}.region-layer.hovered .outline{display:block}.region-layer span{position:absolute;transform:translate(-50%,-50%);font-weight:700;font-size:18px;color:#fff;white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.region-layer.hovered{display:block}.region-layer.overview{display:block;opacity:.5}.region-layer.overview .fill{display:block}.region-layer.overview .outline{display:none}.region-layer.overview.mode-outline .fill{display:none}.region-layer.overview.mode-outline .outline{display:block}.regions-mode #pins{display:none}.modal{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:25px;background:#050706d9}.modal[hidden]{display:none}.card{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;padding:25px;border:1px solid #3b433c;border-radius:14px;background:#191d1a}.close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#aaa;font-size:25px;cursor:pointer}.card.detailed{width:50vw;min-width:700px;height:50vh;min-height:480px}.detail-layout{display:grid;grid-template-columns:0 1fr;height:100%}.card.detailed .detail-layout{grid-template-columns:190px 1fr;gap:22px}.detail-pages{display:none;overflow-y:auto;border-right:1px solid #343b35;padding-right:12px}.card.detailed .detail-pages{display:grid;align-content:start;gap:6px}.detail-pages button{padding:9px;text-align:left;border:0;border-radius:6px;background:transparent;color:#aaa;cursor:pointer}.detail-pages button.active{background:#2b3428;color:#b7df72}.detail-content{overflow-y:auto}.card h2{margin:0;color:var(--poi-color)}.kind{color:#929b94;font-size:11px}.description{line-height:1.6;white-space:pre-wrap}.gallery{display:flex;gap:8px;overflow:auto;margin-top:20px}.gallery img{width:150px;height:100px;object-fit:cover;border-radius:7px;cursor:zoom-in}.lightbox{z-index:40}.lightbox img{max-width:92vw;max-height:90vh}.empty{color:#7f8881;font-size:12px;padding:10px}.hint{position:fixed;right:16px;bottom:16px;padding:8px;border-radius:7px;background:#171a18cc;color:#999;font-size:11px;pointer-events:none}@media(max-width:700px){.side{width:220px}.view{left:220px}.view-tools{left:236px}}
</style></head><body><aside class="side"><h1>Pontos de interesse</h1><input id="search" placeholder="Pesquisar..."><button id="filterButton" class="filter-button">Tipos de navegação</button><div id="list" class="poi-list"></div></aside><div id="typeFilter" class="modal" hidden><article class="card"><button class="close">×</button><h2>Tipos visíveis</h2><div id="typeChoices" class="type-choices"></div></article></div><nav class="view-tools" aria-label="Modo do mapa"><button data-mode="objects" class="active" title="Objetos">⌖</button></nav><main id="view" class="view"><div id="world" class="world" style="width:${canvas.width}px;height:${canvas.height}px"><img class="map" src="${image}" alt="Mapa"><div id="regionLayers"></div><svg id="pathLayers" class="paths" width="${canvas.width}" height="${canvas.height}"></svg><span id="pathLabel" class="path-label"></span><div id="pins"></div></div><span class="hint">Arraste para mover • Scroll para zoom</span></main><div id="details" class="modal" hidden><article class="card"><button class="close">×</button><div class="detail-layout"><nav id="detailPages" class="detail-pages"></nav><section class="detail-content"><small class="kind"></small><h2></h2><p class="description"></p><div class="gallery"></div></section></div></article></div><div id="lightbox" class="modal lightbox" hidden><img alt="Imagem ampliada"></div><script>
const pois=${pois},regions=${regions},paths=${paths},types=${types},view=document.querySelector('#view'),world=document.querySelector('#world'),pins=document.querySelector('#pins'),regionLayers=document.querySelector('#regionLayers'),pathLayers=document.querySelector('#pathLayers'),pathLabel=document.querySelector('#pathLabel'),list=document.querySelector('#list'),search=document.querySelector('#search'),filterButton=document.querySelector('#filterButton'),typeFilter=document.querySelector('#typeFilter'),typeChoices=document.querySelector('#typeChoices'),details=document.querySelector('#details'),detailPages=document.querySelector('#detailPages'),lightbox=document.querySelector('#lightbox');let zoom=1,x=0,y=0,drag=false,moved=false,lx=0,ly=0,mode='objects';const regionViews=[];for(const group of [...new Set(regions.map(r=>r.group))]){const button=document.createElement('button');button.dataset.mode='region:'+group;button.title=group;button.textContent='◒';document.querySelector('.view-tools').append(button)}function draw(){world.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')'}function center(p,targetZoom=2){zoom=targetZoom;x=view.clientWidth/2-p.x*zoom;y=view.clientHeight/2-p.y*zoom;draw()}function focusPoi(p){center(p,2);document.querySelectorAll('.pin').forEach(pin=>pin.classList.toggle('focused',pin.dataset.poiId===p.id))}function fit(){zoom=Math.min(view.clientWidth/${canvas.width},view.clientHeight/${canvas.height},.95);x=(view.clientWidth-${canvas.width}*zoom)/2;y=(view.clientHeight-${canvas.height}*zoom)/2;draw()}function fillDetailGallery(sources){const gallery=details.querySelector('.gallery');gallery.replaceChildren(...sources.map(src=>{const image=new Image();image.src=src;image.onclick=()=>{lightbox.querySelector('img').src=src;lightbox.hidden=false};return image}))}function openPoi(p){const card=details.querySelector('.card');details.style.setProperty('--poi-color',p.color);details.querySelector('h2').textContent=p.name;details.querySelector('.kind').textContent=p.typeName;const pages=p.descriptionPages||[];card.classList.toggle('detailed',pages.length>0);detailPages.replaceChildren();if(pages.length){const showPage=(page,button)=>{detailPages.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));details.querySelector('.description').textContent=page.content||'Sem descrição.';fillDetailGallery(page.images||[])};pages.forEach((page,index)=>{const button=document.createElement('button');button.textContent=page.title||('Página '+(index+1));button.onclick=()=>showPage(page,button);detailPages.append(button)});showPage(pages[0],detailPages.firstChild)}else{details.querySelector('.description').textContent=p.description||'Sem descrição.';fillDetailGallery(p.gallery)}details.hidden=false}function openRegion(r){details.querySelector('.card').classList.remove('detailed');detailPages.replaceChildren();details.style.setProperty('--poi-color',r.color);details.querySelector('h2').textContent=r.name;details.querySelector('.kind').textContent=r.group;details.querySelector('.description').textContent='Região';details.querySelector('.gallery').replaceChildren();details.hidden=false}function openPath(p){details.querySelector('.card').classList.remove('detailed');detailPages.replaceChildren();details.style.setProperty('--poi-color',p.preset.color);details.querySelector('h2').textContent=p.name;details.querySelector('.kind').textContent=Math.round(p.distance)+' km';details.querySelector('.description').textContent=p.description||'Sem descrição.';const gallery=details.querySelector('.gallery');gallery.replaceChildren(...p.gallery.map(src=>{const image=new Image();image.src=src;image.onclick=()=>{lightbox.querySelector('img').src=src;lightbox.hidden=false};return image}));details.hidden=false}for(const p of paths){const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.classList.add('path-line');line.setAttribute('points',p.points.map(point=>point.x+','+point.y).join(' '));line.setAttribute('stroke',p.preset.color);line.setAttribute('stroke-width',p.preset.stroke);line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');if(p.preset.dashed)line.setAttribute('stroke-dasharray',(p.preset.stroke*2)+' '+(p.preset.dashGap??p.preset.stroke*1.5));line.onmouseenter=e=>{pathLabel.textContent=p.name;pathLabel.style.display='block'};line.onmousemove=e=>{const r=view.getBoundingClientRect();pathLabel.style.left=((e.clientX-r.left-x)/zoom)+'px';pathLabel.style.top=((e.clientY-r.top-y)/zoom)+'px'};line.onmouseleave=()=>pathLabel.style.display='none';line.onclick=e=>{e.stopPropagation();openPath(p)};pathLayers.append(line)}const enabledTypes=new Set(types.map(type=>type.id));for(const type of [...types.map(type=>({id:type.id,name:type.name,enabled:true})),{id:'paths',name:'Caminhos',enabled:false},{id:'regions',name:'Regiões',enabled:false}]){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=type.enabled;check.onchange=()=>{check.checked?enabledTypes.add(type.id):enabledTypes.delete(type.id);renderList()};label.append(check,type.name);typeChoices.append(label)}filterButton.onclick=()=>typeFilter.hidden=false;typeFilter.querySelector('.close').onclick=()=>typeFilter.hidden=true;typeFilter.onclick=e=>{if(e.target===typeFilter)typeFilter.hidden=true};for(const p of pois){const pin=document.createElement('button');pin.className='pin';pin.dataset.poiId=p.id;pin.style.cssText='left:'+p.x+'px;top:'+p.y+'px;--color:'+p.color+';--scale:'+(p.scale||1)+';opacity:'+(p.opacity??1);pin.innerHTML='<img><span></span>';pin.querySelector('img').src=p.icon;pin.querySelector('span').textContent=p.name;pin.onclick=()=>{focusPoi(p);openPoi(p)};pins.append(pin)}for(const region of regions){const layer=document.createElement('div');layer.className='region-layer '+(region.fillMode==='outline'?'mode-outline':'mode-fill');layer.style.setProperty('--color',region.color);const surface=document.createElement('canvas'),outline=document.createElement('canvas');surface.className='fill';outline.className='outline';surface.width=outline.width=${canvas.width};surface.height=outline.height=${canvas.height};const label=document.createElement('span');label.textContent=region.name;label.style.cssText='left:'+region.centerX+'px;top:'+region.centerY+'px';layer.append(surface,outline,label);regionLayers.append(layer);const image=new Image();image.onload=()=>{const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const alpha=c.getImageData(0,0,surface.width,surface.height).data;c.globalCompositeOperation='source-in';c.fillStyle=region.color;c.fillRect(0,0,surface.width,surface.height);const o=outline.getContext('2d');for(let d=1;d<=(region.outlineThickness||3);d++){o.drawImage(surface,-d,0);o.drawImage(surface,d,0);o.drawImage(surface,0,-d);o.drawImage(surface,0,d)}o.globalCompositeOperation='destination-out';o.drawImage(image,0,0);if(region.outlineDashed){o.globalCompositeOperation='destination-in';o.fillStyle='#fff';const segment=Math.max(2,(region.outlineThickness||3)*3),gap=Math.max(1,region.outlineGap||12);for(let sx=0;sx<outline.width;sx+=segment+gap)o.fillRect(sx,0,segment,outline.height);o.globalCompositeOperation='source-over'}const item={layer,alpha,group:region.group,region};regionViews.push(item);if(region.defaultOverview)layer.classList.add('overview')};image.src=region.mask}function renderList(){const term=search.value.toLowerCase();const objectItems=pois.map(p=>({...p,navType:p.type,navKind:'object'})),pathItems=paths.map(p=>({...p,navType:'paths',navKind:'path',typeName:Math.round(p.distance)+' km'})),regionItems=regions.map(p=>({...p,navType:'regions',navKind:'region',typeName:p.group,x:p.centerX,y:p.centerY}));const shown=[...objectItems,...pathItems,...regionItems].filter(p=>enabledTypes.has(p.navType)&&p.name.toLowerCase().includes(term));list.replaceChildren(...shown.map(p=>{const b=document.createElement('button');b.className='poi-item';b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=p.name;b.querySelector('b').style.color=p.navKind==='path'?p.preset.color:p.color;b.querySelector('small').textContent=p.navKind==='path'?'Caminho • '+p.typeName:p.navKind==='region'?'Região • '+p.typeName:p.typeName;b.onclick=()=>{if(p.navKind==='path'){const middle=p.points[Math.floor(p.points.length/2)];center(middle)}else if(p.navKind==='region'){center(p);openRegion(p)}else focusPoi(p)};return b}));if(!shown.length)list.innerHTML='<div class="empty">Nenhum ponto encontrado.</div>'}function regionAt(e,group){const r=view.getBoundingClientRect(),mx=Math.floor((e.clientX-r.left-x)/zoom),my=Math.floor((e.clientY-r.top-y)/zoom);if(mx<0||my<0||mx>=${canvas.width}||my>=${canvas.height})return null;return [...regionViews].reverse().find(item=>(!group||item.group===group)&&item.alpha[(my*${canvas.width}+mx)*4+3]>32)||null}function hoverRegion(e){if(mode!=='objects'||drag)return;const r=view.getBoundingClientRect(),mx=Math.floor((e.clientX-r.left-x)/zoom),my=Math.floor((e.clientY-r.top-y)/zoom);let found=null;if(mx>=0&&my>=0&&mx<${canvas.width}&&my<${canvas.height})for(const item of regionViews)if(item.alpha[(my*${canvas.width}+mx)*4+3]>32)found=item;for(const item of regionViews)item.layer.classList.toggle('hovered',item===found)}document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));view.classList.toggle('regions-mode',mode!=='objects');for(const item of regionViews){item.layer.classList.remove('hovered');item.layer.classList.toggle('overview',mode==='objects'?item.region.defaultOverview:mode==='region:'+item.group)}});search.oninput=renderList;renderList();fit();addEventListener('resize',fit);view.oncontextmenu=e=>e.preventDefault();view.onpointerdown=e=>{if(e.target.closest('.pin')||e.target.closest('.path-line'))return;if(![0,1,2].includes(e.button))return;e.preventDefault();drag=true;moved=false;lx=e.clientX;ly=e.clientY;view.classList.add('dragging');view.setPointerCapture(e.pointerId)};view.onpointermove=e=>{hoverRegion(e);if(!drag)return;if(Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly)>2)moved=true;x+=e.clientX-lx;y+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()};view.onpointerup=e=>{if(!moved&&mode.startsWith('region:')){const found=regionAt(e,mode.slice(7));if(found)openRegion(found.region)}drag=false;view.classList.remove('dragging')};view.onwheel=e=>{e.preventDefault();const r=view.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,old=zoom;zoom=Math.max(.05,Math.min(8,zoom*(e.deltaY<0?1.1:.9)));x=mx-(mx-x)*zoom/old;y=my-(my-y)*zoom/old;draw()};details.querySelector('.close').onclick=()=>details.hidden=true;details.onclick=e=>{if(e.target===details)details.hidden=true};lightbox.onclick=()=>lightbox.hidden=true;
<\/script></body></html>`;
}

$('#exportMapBtn').onclick = () => downloadFile('mapa-teralium.html', createMapHtml(), 'text/html');
$('#previewMapBtn').onclick = () => {
  const url = URL.createObjectURL(new Blob([createMapHtml()], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

window.addEventListener('resize', () => { if (selectedLayer()?.mask) fit(); });

$('#languageSelect').addEventListener('change', (event) => applyLanguage(event.target.value));

const firstLayer = createLayer();
state.layers.push(firstLayer);
selectLayer(firstLayer.id);
applyLanguage(state.language);
updateTransform();
fetch('data/poi-types.json')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('Tipos indisponíveis')))
  .then((types) => { state.poiTypes = types; populateObjectOptions(); redraw(); })
  .catch(() => { /* The embedded defaults keep local file usage functional. */ });
