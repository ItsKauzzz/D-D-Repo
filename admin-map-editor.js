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
};

function createLayer(type = 'terrain') {
  const number = state.layers.length + 1;
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${number}`,
    type,
    name: type === 'image' ? `Imagem ${number}` : (number === 1 ? 'Cobertura vegetal' : `Terreno ${number}`),
    visible: true,
    mask: null,
    maskName: '',
    maskPixels: null,
    clip: null,
    bounds: null,
    assets: [],
    image: null,
    output: document.createElement('canvas'),
    settings: { density: 45, scale: 1, sizeVariation: true, sizeMin: 0.7, sizeMax: 1.3, seed: `Teralium-0${number}`, rotation: true, mirror: true, slice: false },
  };
}

function selectedLayer() {
  return state.layers.find((layer) => layer.id === state.selectedId);
}

function fileImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
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

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // The first layer in the list has the highest visual priority, so paint bottom-up.
  for (const layer of [...state.layers].reverse()) {
    if (!layer.visible) continue;
    if (layer.type === 'image' && layer.image) ctx.drawImage(layer.image, 0, 0, canvas.width, canvas.height);
    if (layer.type === 'terrain' && layer.output.width) ctx.drawImage(layer.output, 0, 0);
  }

  const current = selectedLayer();
  if (current?.type === 'terrain' && current.mask && !current.output.width) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.drawImage(current.mask, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function renderLayers() {
  const list = $('#layerList');
  list.replaceChildren();
  for (const layer of state.layers) {
    const button = document.createElement('button');
    button.className = `layer-card${layer.id === state.selectedId ? ' active' : ''}${layer.visible ? '' : ' is-hidden'}`;
    button.innerHTML = `<span class="layer-icon">${layer.type === 'image' ? '▧' : '⌁'}</span><div><b></b><small>${layer.type === 'image' ? 'Imagem' : 'Terreno'}</small></div><span class="visibility" title="Alternar visibilidade">◉</span>`;
    button.draggable = true;
    button.dataset.layerId = layer.id;
    button.querySelector('b').textContent = layer.name;
    button.addEventListener('click', () => selectLayer(layer.id));
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
    list.append(button);
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
  $('#typeBadge').textContent = layer.type === 'image' ? 'Imagem' : 'Terreno';
  document.querySelectorAll('.terrain-control').forEach((control) => { control.hidden = layer.type !== 'terrain'; });
  document.querySelectorAll('.image-control').forEach((control) => { control.hidden = false; });
  const upload = document.querySelector('.upload');
  upload.querySelector('b').textContent = layer.type === 'image' ? 'Enviar imagem' : 'Enviar máscara';
  upload.querySelector('small').textContent = layer.type === 'image' ? 'Background ou elemento visual' : 'PNG com transparência recomendado';
  $('#generateBtn').hidden = layer.type === 'image';
  $('#footerHint').textContent = layer.type === 'image' ? 'Arraste a camada para definir sua prioridade.' : 'A seed mantém o resultado reproduzível.';
  updateOutputs();
  renderLayers();
  renderAssets();
  updateReadyState();
  redraw();
}

function updateOutputs() {
  const layer = selectedLayer();
  $('#densityValue').value = layer.settings.density;
  $('#scaleValue').value = `${Number(layer.settings.scale).toFixed(2).replace(/\.00$/, '')}×`;
  $('#sizeValue').value = `${layer.settings.sizeMin}×–${layer.settings.sizeMax}×`;
  $('#sizeVariationFields').hidden = !layer.settings.sizeVariation;
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
  const random = randomFactory(hashSeed(layer.settings.seed));
  const { minX, minY, maxX, maxY } = layer.bounds;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const averageAssetSize = layer.assets.reduce((sum, asset) => sum + Math.max(asset.image.naturalWidth, asset.image.naturalHeight), 0) / layer.assets.length;
  const averageVariation = layer.settings.sizeVariation ? (layer.settings.sizeMin + layer.settings.sizeMax) / 2 : 1;
  const footprint = Math.max(8, averageAssetSize * layer.settings.scale * averageVariation);
  const attempts = Math.min(250000, Math.round((width * height / (footprint * footprint)) * layer.settings.density / 1.7));
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
  redraw();
  fit();
  updateReadyState();
  event.target.value = '';
});
$('#assetInput').addEventListener('change', async (event) => {
  const layer = selectedLayer();
  for (const file of event.target.files) layer.assets.push({ file, image: await fileImage(file) });
  renderAssets();
  updateReadyState();
  event.target.value = '';
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
$('#sizeVariation').addEventListener('change', (event) => {
  selectedLayer().settings.sizeVariation = event.target.checked;
  updateOutputs();
});
$('#seed').addEventListener('input', (event) => { selectedLayer().settings.seed = event.target.value; });
$('#rotation').addEventListener('change', (event) => { selectedLayer().settings.rotation = event.target.checked; });
$('#mirror').addEventListener('change', (event) => { selectedLayer().settings.mirror = event.target.checked; });
$('#slice').addEventListener('change', (event) => { selectedLayer().settings.slice = event.target.checked; });
$('#randomSeed').onclick = () => {
  selectedLayer().settings.seed = Math.random().toString(36).slice(2, 10);
  $('#seed').value = selectedLayer().settings.seed;
};
$('#generateBtn').onclick = generate;

viewport.addEventListener('pointerdown', (event) => {
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
  state.zoom = Math.max(0.15, Math.min(3, state.zoom * multiplier));
  updateTransform();
}
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
window.addEventListener('resize', () => { if (selectedLayer()?.mask) fit(); });

const firstLayer = createLayer();
state.layers.push(firstLayer);
selectLayer(firstLayer.id);
updateTransform();
