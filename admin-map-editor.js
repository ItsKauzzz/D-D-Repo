const canvas = document.querySelector('#mapCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.querySelector('#viewport');
const stage = document.querySelector('#stage');
const $ = (selector) => document.querySelector(selector);

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
};

function createLayer(type = 'terrain') {
  const number = state.layers.length + 1;
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${number}`,
    type,
    name: type === 'image' ? `Imagem ${number}` : type === 'object' ? `Objeto ${number}` : type === 'region' ? `Região ${number}` : (number === 1 ? 'Cobertura vegetal' : `Terreno ${number}`),
    visible: true,
    mask: null,
    maskName: '',
    maskPixels: null,
    clip: null,
    bounds: null,
    assets: [],
    image: null,
    object: type === 'object' ? { name: '', type: 'vila', iconSetId: '', gallerySetId: '', description: '', poi: true, x: null, y: null, scale: 1, opacity: 1, offsetX: 0, offsetY: 0 } : null,
    region: type === 'region' ? { group: 'Regiões', name: `Região ${number}`, color: '#6fa86b', drawnAt: 0 } : null,
    output: document.createElement('canvas'),
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

function redraw(includeObjects = true) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // The first layer in the list has the highest visual priority, so paint bottom-up.
  for (const layer of [...state.layers].reverse()) {
    if (!layer.visible) continue;
    if (layer.type === 'image' && layer.image) {
      ctx.save();
      ctx.globalAlpha = layer.settings.imageOpacity;
      ctx.drawImage(layer.image, layer.settings.imageOffsetX, layer.settings.imageOffsetY, canvas.width, canvas.height);
      ctx.restore();
    }
    if (layer.type === 'terrain' && layer.output.width) ctx.drawImage(layer.output, 0, 0);
    if (layer.type === 'object' && layer.object?.x !== null && (includeObjects || !layer.object.poi)) drawMapObject(layer.object);
  }

  const selected = selectedLayer();
  if (includeObjects && !state.maskEditing && selected?.mask) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.drawImage(selected.mask, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

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
  ctx.drawImage(icon, x - width / 2, y - size, width, size);
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
    const layerMeta = layer.type === 'image' ? ['▧', 'Imagem'] : layer.type === 'object' ? ['⌖', 'Objeto'] : layer.type === 'region' ? ['◒', 'Região'] : ['⌁', 'Terreno'];
    button.innerHTML = `<span class="layer-icon">${layerMeta[0]}</span><div><b></b><small>${layerMeta[1]}</small></div><span class="visibility" title="Alternar visibilidade">◉</span>`;
    button.draggable = true;
    button.dataset.layerId = layer.id;
    button.querySelector('b').textContent = layer.name;
    button.addEventListener('click', () => selectLayer(layer.id));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      state.contextLayerId = layer.id;
      const menu = $('#layerContextMenu');
      menu.querySelector('[data-action="toggle"]').textContent = layer.visible ? 'Ocultar' : 'Exibir';
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
      state.layers.splice(to, 0, moved);
      renderLayers(); redraw();
    });
    button.querySelector('.visibility').addEventListener('click', (event) => {
      event.stopPropagation();
      layer.visible = !layer.visible;
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
}

function renderAssets() {
  const layer = selectedLayer();
  const grid = $('#assetGrid');
  grid.replaceChildren();
  layer.assets.forEach((asset, index) => {
    const item = document.createElement('div');
    item.className = 'asset';
    const image = document.createElement('img');
    image.src = asset.image.src;
    image.alt = asset.file.name;
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.ariaLabel = 'Remover';
    remove.onclick = () => {
      layer.assets.splice(index, 1);
      renderAssets();
      updateReadyState();
    };
    item.append(image, remove);
    grid.append(item);
  });
  if (!layer.assets.length) grid.innerHTML = '<p>Adicione árvores, pedras ou qualquer elemento que queira distribuir.</p>';
  $('#assetCount').textContent = layer.assets.length;
}

function selectLayer(id) {
  state.selectedId = id;
  const layer = selectedLayer();
  $('#layerName').value = layer.name;
  $('#maskName').textContent = layer.maskName || 'Nenhuma máscara selecionada';
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
  $('#typeBadge').textContent = layer.type === 'image' ? 'Imagem' : layer.type === 'object' ? 'Objeto' : layer.type === 'region' ? 'Região' : 'Terreno';
  document.querySelectorAll('.terrain-control, .image-control, .object-control, .region-control').forEach((control) => {
    control.hidden = !control.classList.contains(`${layer.type}-control`);
  });
  const upload = document.querySelector('.upload');
  upload.querySelector('b').textContent = layer.type === 'image' ? 'Enviar imagem' : 'Enviar máscara';
  upload.querySelector('small').textContent = layer.type === 'image' ? 'Background ou elemento visual' : 'PNG preto com transparência recomendado';
  $('#generateBtn').hidden = layer.type !== 'terrain';
  $('#footerHint').textContent = layer.type === 'terrain' ? 'A seed mantém o resultado reproduzível.' : 'Arraste a camada para definir sua prioridade.';
  if (layer.type === 'object') fillObjectInspector(layer.object);
  if (layer.type === 'region') {
    $('#regionGroup').value = layer.region.group || 'Regiões';
    $('#regionName').value = layer.region.name;
    $('#regionColor').value = layer.region.color;
  }
  if (layer.type === 'terrain' || layer.type === 'region') renderMaskPreview(layer);
  updateOutputs();
  renderLayers();
  renderAssets();
  updateReadyState();
  redraw();
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
    layer.mask = null; layer.maskName = ''; layer.maskPixels = null; layer.clip = null; layer.bounds = null; layer.output.width = 0;
    $('#maskName').textContent = 'Nenhuma máscara selecionada'; renderMaskPreview(layer); updateReadyState(); redraw();
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
    layer.maskPixels = null; layer.clip = null; layer.bounds = null;
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
  $('#objectPosition').textContent = object.x === null ? 'Ainda não posicionado' : `Posição: ${Math.round(object.x)}, ${Math.round(object.y)}`;
}

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
  // 100 is the base occupancy; 1000 layers roughly ten passes over the same
  // footprint and is intended to produce an almost completely filled mask.
  // The point budget remains independent of asset count.
  const attempts = Math.min(250000, Math.round((width * height / (footprint * footprint)) * layer.settings.density / 100));
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
        placements.push({
          x, y,
          asset: layer.assets[Math.floor(random() * layer.assets.length)].image,
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
        outputContext.save();
        outputContext.translate(placement.x, placement.y);
        outputContext.rotate(placement.rotation);
        if (placement.mirrored) outputContext.scale(-1, 1);
        outputContext.drawImage(placement.asset, -width / 2, -height / 2, width, height);
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
  redraw();

  if (token === state.generationToken) {
    $('#saveState').textContent = 'Atualizado';
    updateReadyState();
  }
}

$('#addLayer').onclick = () => {
  $('#addLayerMenu').hidden = !$('#addLayerMenu').hidden;
};
document.querySelectorAll('[data-layer-type]').forEach((button) => {
  button.onclick = () => {
    const type = button.dataset.layerType;
    const layer = createLayer(type);
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
  layer.clip = null;
  layer.bounds = null;
  layer.output.width = 0;
  if (!state.layers.some((item) => item.mask && item.id !== layer.id)) {
    canvas.width = layer.mask.naturalWidth;
    canvas.height = layer.mask.naturalHeight;
  }
  stage.style.display = 'block';
  $('#emptyState').style.display = 'none';
  $('#maskName').textContent = file.name;
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
        redraw();
        $('#assetModal').hidden = true;
        return;
      }
      const existing = new Set(layer.assets.map((asset) => asset.image.src));
      layer.assets.push(...set.assets.filter((asset) => !existing.has(asset.image.src)));
      renderAssets(); updateReadyState();
      $('#assetModal').hidden = true;
    };
    list.append(item);
  }
  if (!state.imageSets.length) list.innerHTML = '<div class="set-empty">Nenhum conjunto criado ainda.</div>';
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
    redraw();
  });
}
$('#regionName').addEventListener('input', (event) => {
  const layer = selectedLayer(); if (layer.type !== 'region') return;
  layer.region.name = event.target.value; layer.name = event.target.value || 'Região';
  $('#layerName').value = layer.name; renderLayers();
});
$('#regionGroup').addEventListener('change', async (event) => {
  const layer = selectedLayer(); if (layer.type !== 'region') return;
  layer.region.group = event.target.value.trim() || 'Regiões';
  if (layer.mask) await applyRegionPriority(layer);
  renderLayers();
});
$('#regionColor').addEventListener('input', (event) => {
  const layer = selectedLayer(); if (layer.type !== 'region') return;
  layer.region.color = event.target.value;
});
$('#positionObject').onclick = () => {
  state.placingObject = true;
  $('#positionObject').classList.add('active');
  $('#positionObject').textContent = 'Clique no mapa…';
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
bindNumberInput('brushSizeValue', 'brushSize', () => {});
function paintMask(event) {
  if (!maskDrawing || maskPaintPointerId !== event.pointerId || !(event.buttons & 1)) return;
  if (maskTool === 'fill') {
    maskEditContext.globalCompositeOperation = 'source-over';
    maskEditContext.fillStyle = '#000'; maskEditContext.fillRect(0, 0, canvas.width, canvas.height);
    maskDrawing = false;
    return;
  }
  const rectangle = maskEditCanvas.getBoundingClientRect();
  const x = (event.clientX - rectangle.left) * canvas.width / rectangle.width;
  const y = (event.clientY - rectangle.top) * canvas.height / rectangle.height;
  maskEditContext.globalCompositeOperation = maskTool === 'eraser' ? 'destination-out' : 'source-over';
  maskEditContext.fillStyle = '#000';
  maskEditContext.beginPath(); maskEditContext.arc(x, y, Number($('#brushSize').value) / 2, 0, Math.PI * 2); maskEditContext.fill();
}
maskEditCanvas.oncontextmenu = (event) => event.preventDefault();
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
    layer.maskName = 'Máscara criada no editor'; layer.maskPixels = null; layer.clip = null; layer.bounds = null; layer.output.width = 0;
    if (layer.type === 'region') await applyRegionPriority(layer);
    $('#maskName').textContent = layer.maskName; renderMaskPreview(layer); updateReadyState(); redraw();
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
  return { name: asset.file.name, source: asset.image.src };
}

$('#saveProjectBtn').onclick = () => {
  const project = {
    format: 'teralium-map-project', version: 1,
    canvas: { width: canvas.width, height: canvas.height },
    selectedId: state.selectedId,
    imageSets: state.imageSets.map((set) => ({ id: set.id, name: set.name, assets: set.assets.map(serializeAsset) })),
    layers: state.layers.map((layer) => ({
      id: layer.id, type: layer.type, name: layer.name, visible: layer.visible,
      maskName: layer.maskName, maskSource: layer.mask?.src || null, imageSource: layer.image?.src || null,
      assets: layer.assets.map(serializeAsset), settings: layer.settings, object: layer.object, region: layer.region,
      outputSource: layer.output.width ? layer.output.toDataURL('image/png') : null,
    })),
  };
  downloadFile('projeto-teralium.json', JSON.stringify(project), 'application/json');
  $('#saveState').textContent = 'Projeto salvo';
};

$('#openProjectBtn').onclick = () => $('#projectInput').click();
$('#projectInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    $('#saveState').textContent = 'Abrindo…';
    const project = JSON.parse(await file.text());
    if (project.format !== 'teralium-map-project') throw new Error('Formato inválido');
    canvas.width = project.canvas.width; canvas.height = project.canvas.height;
    state.imageSets = await Promise.all(project.imageSets.map(async (set) => ({
      ...set, assets: await Promise.all(set.assets.map(async (asset) => ({ file: { name: asset.name }, image: await imageFromSource(asset.source) }))),
    })));
    state.layers = await Promise.all(project.layers.map(async (saved) => {
      const layer = createLayer(saved.type);
      Object.assign(layer, { id: saved.id, name: saved.name, visible: saved.visible, maskName: saved.maskName, settings: { ...layer.settings, ...saved.settings } });
      if (saved.object) layer.object = saved.object;
      if (saved.region) layer.region = saved.region;
      if (saved.maskSource) layer.mask = await imageFromSource(saved.maskSource);
      if (saved.imageSource) layer.image = await imageFromSource(saved.imageSource);
      layer.assets = await Promise.all(saved.assets.map(async (asset) => ({ file: { name: asset.name }, image: await imageFromSource(asset.source) })));
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
  state.zoom = Math.max(0.15, Math.min(3, state.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
  state.x = mouseX - (mouseX - state.x) * state.zoom / oldZoom;
  state.y = mouseY - (mouseY - state.y) * state.zoom / oldZoom;
  updateTransform();
}, { passive: false });

function zoomBy(multiplier) {
  const centerX = viewport.clientWidth / 2;
  const centerY = viewport.clientHeight / 2;
  const oldZoom = state.zoom;
  state.zoom = Math.max(0.15, Math.min(3, state.zoom * multiplier));
  state.x = centerX - (centerX - state.x) * state.zoom / oldZoom;
  state.y = centerY - (centerY - state.y) * state.zoom / oldZoom;
  updateTransform();
}
$('.zoom-controls').addEventListener('pointerdown', (event) => event.stopPropagation());
$('#zoomIn').onclick = () => zoomBy(1.15);
$('#zoomOut').onclick = () => zoomBy(0.85);
$('#fitBtn').onclick = fit;
$('#exportBtn').onclick = () => {
  redraw();
  const link = document.createElement('a');
  link.download = 'mapa-teralium.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
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
    return { id: layer.id, group: layer.region.group || 'Regiões', name: layer.region.name, color: layer.region.color, mask: layer.mask.src, centerX: count ? totalX / count : canvas.width / 2, centerY: count ? totalY / count : canvas.height / 2 };
  });
}

function createMapHtml() {
  redraw(false);
  const image = canvas.toDataURL('image/png');
  redraw(true);
  const pois = JSON.stringify(exportablePois()).replace(/</g, '\\u003c');
  const regions = JSON.stringify(exportableRegions()).replace(/</g, '\\u003c');
  const types = JSON.stringify(state.poiTypes).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mapa de Teralium</title><style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#101311;color:#eef2ee;font-family:Arial,sans-serif}.side{position:fixed;z-index:10;inset:0 auto 0 0;width:280px;padding:22px 16px;background:#171a18;border-right:1px solid #303630;overflow:auto}.side h1{font-size:18px;margin:0 0 18px}.side input,.side select{width:100%;padding:10px;margin-bottom:8px;border:1px solid #343b35;border-radius:7px;background:#0f1210;color:#eef2ee}.poi-list{display:grid;gap:5px;margin-top:12px}.poi-item{padding:10px;border:0;border-radius:7px;background:transparent;color:#eef2ee;text-align:left;cursor:pointer}.poi-item:hover{background:#252b26}.poi-item small{display:block;margin-top:3px;color:#89928b}.view{position:fixed;inset:0 0 0 280px;overflow:hidden;cursor:grab;background-image:linear-gradient(#1b201c 1px,transparent 1px),linear-gradient(90deg,#1b201c 1px,transparent 1px);background-size:24px 24px}.view.dragging{cursor:grabbing}.world{position:absolute;transform-origin:0 0}.map{position:absolute;inset:0;user-select:none;-webkit-user-drag:none;image-rendering:pixelated}.pin{position:absolute;transform:translate(-50%,calc(-48px * var(--scale)));display:grid;justify-items:center;border:0;background:transparent;color:var(--color);cursor:pointer}.pin img{width:calc(48px * var(--scale));height:calc(48px * var(--scale));object-fit:contain;image-rendering:pixelated}.pin span{margin-top:3px;color:var(--color);font-weight:700;font-size:14px;white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.pin:hover img{filter:drop-shadow(0 0 2px white) drop-shadow(0 0 5px var(--color))}.pin:hover span{color:#fff}.view-tools{position:fixed;z-index:12;left:296px;top:50%;transform:translateY(-50%);display:grid;gap:4px;padding:5px;border:1px solid #3a423b;border-radius:9px;background:#181c19dd;box-shadow:0 8px 25px #0009}.view-tools button{width:38px;height:38px;padding:0;border:0;border-radius:6px;background:transparent;color:#879088;cursor:pointer}.view-tools button.active{background:#30392c;color:#b7df72}.region-layer{position:absolute;inset:0;display:none;pointer-events:none}.region-layer canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}.region-layer .fill,.region-layer .outline{display:none}.region-layer.hovered .outline{display:block}.region-layer span{position:absolute;transform:translate(-50%,-50%);font-weight:700;font-size:18px;color:var(--color);white-space:nowrap;-webkit-text-stroke:1px #111;paint-order:stroke fill}.region-layer.hovered{display:block}.region-layer.overview{display:block;opacity:.5}.region-layer.overview .fill{display:block}.region-layer.overview .outline{display:none}.regions-mode #pins{display:none}.modal{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:25px;background:#050706d9}.modal[hidden]{display:none}.card{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;padding:25px;border:1px solid #3b433c;border-radius:14px;background:#191d1a}.close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#aaa;font-size:25px;cursor:pointer}.card h2{margin:0;color:var(--poi-color)}.kind{color:#929b94;font-size:11px}.description{line-height:1.6;white-space:pre-wrap}.gallery{display:flex;gap:8px;overflow:auto;margin-top:20px}.gallery img{width:150px;height:100px;object-fit:cover;border-radius:7px;cursor:zoom-in}.lightbox{z-index:40}.lightbox img{max-width:92vw;max-height:90vh}.empty{color:#7f8881;font-size:12px;padding:10px}.hint{position:fixed;right:16px;bottom:16px;padding:8px;border-radius:7px;background:#171a18cc;color:#999;font-size:11px;pointer-events:none}@media(max-width:700px){.side{width:220px}.view{left:220px}.view-tools{left:236px}}
</style></head><body><aside class="side"><h1>Pontos de interesse</h1><input id="search" placeholder="Pesquisar..."><select id="filter"><option value="">Todos os tipos</option></select><div id="list" class="poi-list"></div></aside><nav class="view-tools" aria-label="Modo do mapa"><button data-mode="objects" class="active" title="Objetos">⌖</button></nav><main id="view" class="view"><div id="world" class="world" style="width:${canvas.width}px;height:${canvas.height}px"><img class="map" src="${image}" alt="Mapa"><div id="regionLayers"></div><div id="pins"></div></div><span class="hint">Arraste para mover • Scroll para zoom</span></main><div id="details" class="modal" hidden><article class="card"><button class="close">×</button><small class="kind"></small><h2></h2><p class="description"></p><div class="gallery"></div></article></div><div id="lightbox" class="modal lightbox" hidden><img alt="Imagem ampliada"></div><script>
const pois=${pois},regions=${regions},types=${types},view=document.querySelector('#view'),world=document.querySelector('#world'),pins=document.querySelector('#pins'),regionLayers=document.querySelector('#regionLayers'),list=document.querySelector('#list'),search=document.querySelector('#search'),filter=document.querySelector('#filter'),details=document.querySelector('#details'),lightbox=document.querySelector('#lightbox');let zoom=1,x=0,y=0,drag=false,lx=0,ly=0,mode='objects';const regionViews=[];for(const group of [...new Set(regions.map(r=>r.group))]){const button=document.createElement('button');button.dataset.mode='region:'+group;button.title=group;button.textContent='◒';document.querySelector('.view-tools').append(button)}function draw(){world.style.transform='translate('+x+'px,'+y+'px) scale('+zoom+')'}function center(p){zoom=1;x=view.clientWidth/2-p.x;y=view.clientHeight/2-p.y;draw()}function fit(){zoom=Math.min(view.clientWidth/${canvas.width},view.clientHeight/${canvas.height},.95);x=(view.clientWidth-${canvas.width}*zoom)/2;y=(view.clientHeight-${canvas.height}*zoom)/2;draw()}function openPoi(p){details.style.setProperty('--poi-color',p.color);details.querySelector('h2').textContent=p.name;details.querySelector('.kind').textContent=p.typeName;details.querySelector('.description').textContent=p.description||'Sem descrição.';const gallery=details.querySelector('.gallery');gallery.replaceChildren(...p.gallery.map(src=>{const image=new Image();image.src=src;image.onclick=()=>{lightbox.querySelector('img').src=src;lightbox.hidden=false};return image}));details.hidden=false}for(const type of types)filter.add(new Option(type.name,type.id));for(const p of pois){const pin=document.createElement('button');pin.className='pin';pin.style.cssText='left:'+p.x+'px;top:'+p.y+'px;--color:'+p.color+';--scale:'+(p.scale||1)+';opacity:'+(p.opacity??1);pin.innerHTML='<img><span></span>';pin.querySelector('img').src=p.icon;pin.querySelector('span').textContent=p.name;pin.onclick=()=>openPoi(p);pins.append(pin)}for(const region of regions){const layer=document.createElement('div');layer.className='region-layer';layer.style.setProperty('--color',region.color);const surface=document.createElement('canvas'),outline=document.createElement('canvas');surface.className='fill';outline.className='outline';surface.width=outline.width=${canvas.width};surface.height=outline.height=${canvas.height};const label=document.createElement('span');label.textContent=region.name;label.style.cssText='left:'+region.centerX+'px;top:'+region.centerY+'px';layer.append(surface,outline,label);regionLayers.append(layer);const image=new Image();image.onload=()=>{const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const alpha=c.getImageData(0,0,surface.width,surface.height).data;c.globalCompositeOperation='source-in';c.fillStyle=region.color;c.fillRect(0,0,surface.width,surface.height);const o=outline.getContext('2d');for(let d=1;d<=3;d++){o.drawImage(surface,-d,0);o.drawImage(surface,d,0);o.drawImage(surface,0,-d);o.drawImage(surface,0,d)}o.globalCompositeOperation='destination-out';o.drawImage(image,0,0);regionViews.push({layer,alpha,group:region.group})};image.src=region.mask}function renderList(){const term=search.value.toLowerCase();const shown=pois.filter(p=>(!filter.value||p.type===filter.value)&&p.name.toLowerCase().includes(term));list.replaceChildren(...shown.map(p=>{const b=document.createElement('button');b.className='poi-item';b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=p.name;b.querySelector('b').style.color=p.color;b.querySelector('small').textContent=p.typeName;b.onclick=()=>center(p);return b}));if(!shown.length)list.innerHTML='<div class="empty">Nenhum ponto encontrado.</div>'}function hoverRegion(e){if(mode!=='objects'||drag)return;const r=view.getBoundingClientRect(),mx=Math.floor((e.clientX-r.left-x)/zoom),my=Math.floor((e.clientY-r.top-y)/zoom);let found=null;if(mx>=0&&my>=0&&mx<${canvas.width}&&my<${canvas.height})for(const item of regionViews)if(item.alpha[(my*${canvas.width}+mx)*4+3]>32)found=item;for(const item of regionViews)item.layer.classList.toggle('hovered',item===found)}document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));view.classList.toggle('regions-mode',mode!=='objects');for(const item of regionViews){item.layer.classList.remove('hovered');item.layer.classList.toggle('overview',mode==='region:'+item.group)}});search.oninput=renderList;filter.onchange=renderList;renderList();fit();addEventListener('resize',fit);view.onpointerdown=e=>{if(e.target.closest('.pin'))return;if(e.button!==0)return;drag=true;lx=e.clientX;ly=e.clientY;view.classList.add('dragging');view.setPointerCapture(e.pointerId)};view.onpointermove=e=>{hoverRegion(e);if(!drag)return;x+=e.clientX-lx;y+=e.clientY-ly;lx=e.clientX;ly=e.clientY;draw()};view.onpointerup=()=>{drag=false;view.classList.remove('dragging')};view.onwheel=e=>{e.preventDefault();const r=view.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,old=zoom;zoom=Math.max(.05,Math.min(8,zoom*(e.deltaY<0?1.1:.9)));x=mx-(mx-x)*zoom/old;y=my-(my-y)*zoom/old;draw()};details.querySelector('.close').onclick=()=>details.hidden=true;details.onclick=e=>{if(e.target===details)details.hidden=true};lightbox.onclick=()=>lightbox.hidden=true;
<\/script></body></html>`;
}

$('#exportMapBtn').onclick = () => downloadFile('mapa-teralium.html', createMapHtml(), 'text/html');
$('#previewMapBtn').onclick = () => {
  const url = URL.createObjectURL(new Blob([createMapHtml()], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

window.addEventListener('resize', () => { if (selectedLayer()?.mask) fit(); });

const firstLayer = createLayer();
state.layers.push(firstLayer);
selectLayer(firstLayer.id);
updateTransform();
fetch('data/poi-types.json')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('Tipos indisponíveis')))
  .then((types) => { state.poiTypes = types; populateObjectOptions(); redraw(); })
  .catch(() => { /* The embedded defaults keep local file usage functional. */ });
