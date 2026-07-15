const catalogGrid = document.getElementById('catalog-grid');
const categoryList = document.getElementById('category-list');
const itemCount = document.getElementById('item-count');
const catalogTitle = document.getElementById('catalog-title');
const searchInput = document.getElementById('item-search');
const viewToggle = document.getElementById('view-toggle');
const sortSelect = document.getElementById('sort-select');

let allItems = [];
let activeCategory = 'Todos';
let listMode = false;
let sortMode = 'name-asc';

async function loadCatalog() {
  const response = await fetch('./data/inventory/shop-items.json');
  allItems = await response.json();
  renderCategories();
  renderCatalog();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (sortMode === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
    if (sortMode === 'price-asc') return a.priceValue - b.priceValue || a.name.localeCompare(b.name, 'pt-BR');
    if (sortMode === 'price-desc') return b.priceValue - a.priceValue || a.name.localeCompare(b.name, 'pt-BR');
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

function renderCategories() {
  const categories = ['Todos', ...new Set(allItems.map((item) => item.category))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b, 'pt-BR'));
  categoryList.innerHTML = categories.map((category) => `<button class="category-button${category === activeCategory ? ' active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
}

function renderCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = sortItems(allItems.filter((item) => {
    const inCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const searchableText = `${item.name} ${item.category} ${item.source} ${item.description} ${item.price} ${item.details} ${item.effect}`;
    const inSearch = !query || searchableText.toLocaleLowerCase('pt-BR').includes(query);
    return inCategory && inSearch;
  }));

  catalogTitle.textContent = activeCategory === 'Todos' ? 'Todos os itens' : activeCategory;
  itemCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'itens'}`;
  catalogGrid.classList.toggle('catalog-grid--list', listMode);
  viewToggle.textContent = listMode ? '▦ Modo cards' : '☰ Modo lista';
  viewToggle.setAttribute('aria-pressed', String(listMode));
  catalogGrid.innerHTML = filtered.length ? filtered.map((item) => `
    <article class="item-card">
      <div class="item-card-header">
        <span class="badge">${escapeHtml(item.category)}</span>
        <strong class="price-tag">${escapeHtml(item.price)}</strong>
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <dl class="item-stats">
        <div>
          <dt>Preço</dt>
          <dd>${escapeHtml(item.price)}</dd>
        </div>
        <div>
          <dt>Uso / Regra</dt>
          <dd>${escapeHtml(item.details)}</dd>
        </div>
        <div>
          <dt>Efeito</dt>
          <dd>${escapeHtml(item.effect)}</dd>
        </div>
      </dl>
    </article>
  `).join('') : '<p class="empty">Nenhum item encontrado neste corredor do mercado.</p>';
}

categoryList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderCatalog();
});

searchInput.addEventListener('input', renderCatalog);
sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  renderCatalog();
});
viewToggle.addEventListener('click', () => {
  listMode = !listMode;
  renderCatalog();
});

loadCatalog().catch(() => {
  catalogGrid.innerHTML = '<p class="empty">Não foi possível carregar o catálogo do mercado.</p>';
});

const generatorOpen = document.getElementById('shop-generator-open');
const generatorModal = document.getElementById('shop-generator-modal');
const generatorClose = document.getElementById('shop-generator-close');
const generatorForm = document.getElementById('shop-generator-form');
const generatorResults = document.getElementById('shop-generator-results');
const generatorSummary = document.getElementById('shop-generator-summary');
const generatorPdf = document.getElementById('shop-generator-pdf');
const shopWealth = document.getElementById('shop-wealth');
const shopType = document.getElementById('shop-type');
const shopPriceModifier = document.getElementById('shop-price-modifier');
const shopSale = document.getElementById('shop-sale');

const SHOP_WEALTH = {
  modesta: { label: 'Loja Modesta', gold: 2000, minItems: 12, maxItems: 24, magicWeight: 0.08 },
  comum: { label: 'Loja Comum', gold: 6000, minItems: 22, maxItems: 42, magicWeight: 0.14 },
  rica: { label: 'Loja Rica', gold: 20000, minItems: 45, maxItems: 78, magicWeight: 0.24 },
  lendaria: { label: 'Loja Lendária', gold: 60000, minItems: 75, maxItems: 125, magicWeight: 0.36 }
};

const SHOP_TYPES = {
  equipamentos: { label: 'Equipamentos', categories: ['Armaduras', 'Armas marciais corpo a corpo', 'Armas marciais à distância', 'Armas simples corpo a corpo', 'Armas simples à distância', 'Equipamento de aventura', 'Equipamentos reforçados', 'Equipamentos utilitários', 'Ferramentas profissionais', 'Munição'] },
  armaria: { label: 'Armaria', categories: ['Armaduras', 'Armas marciais corpo a corpo', 'Armas marciais à distância', 'Armas simples corpo a corpo', 'Armas simples à distância', 'Munição', 'Equipamentos reforçados'] },
  arcana: { label: 'Arcana / Alquímica', categories: ['Itens mágicos', 'Poções de cura', 'Poções e óleos mágicos', 'Focos Arcanos', 'Focos Druídicos', 'Símbolos Sagrados', 'Serviços de Conjuração', 'Equipamento de aventura'] },
  servicos: { label: 'Serviços e Estadia', categories: ['Hospedagem (Alojamento por Dia)', 'Refeições', 'Serviços comerciais', 'Serviços de Conjuração', 'Serviços de higiene', 'Serviços médicos', 'Serviços profissionais', 'Serviços urbanos', 'Trabalhadores', 'Viagem'] },
  geral: { label: 'Mercado Geral', categories: [] }
};

let generatedShop = null;

function isMagicItem(item) {
  return /mágic|magic|poç|pergaminho|arcano|druídico|conjuração/i.test(`${item.category} ${item.name} ${item.description}`);
}

function getItemWeight(item, wealthConfig) {
  const price = Math.max(item.priceValue || 1, 1);
  const rarity = isMagicItem(item) ? wealthConfig.magicWeight : 1;
  const affordability = price > wealthConfig.gold ? 0.02 : Math.max(0.08, 1 - (price / wealthConfig.gold));
  const categoryBoost = /Armas|Armaduras|Equipamento|Ferramentas|Munição/i.test(item.category) ? 1.25 : 1;
  return rarity * affordability * categoryBoost;
}

function pickWeighted(items, wealthConfig) {
  const weighted = items.map((item) => ({ item, weight: getItemWeight(item, wealthConfig) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  return weighted.find((entry) => (roll -= entry.weight) <= 0)?.item || weighted[weighted.length - 1].item;
}

function formatGold(value) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} po`;
}

function generateShopInventory() {
  const wealth = SHOP_WEALTH[shopWealth.value];
  const type = SHOP_TYPES[shopType.value];
  const priceModifier = Number(shopPriceModifier.value);
  const modifierMultiplier = 1 + (priceModifier / 100);
  const pool = allItems.filter((item) => item.priceValue > 0 && (!type.categories.length || type.categories.includes(item.category)));
  const targetItems = Math.floor(wealth.minItems + Math.random() * (wealth.maxItems - wealth.minItems + 1));
  const selected = new Map();
  let safety = 0;

  while (selected.size < targetItems && safety < targetItems * 20 && pool.length) {
    safety += 1;
    const item = pickWeighted(pool, wealth);
    const runningTotal = [...selected.values()].reduce((sum, entry) => sum + entry.basePrice, 0);
    if (runningTotal + item.priceValue <= wealth.gold || selected.size < wealth.minItems) selected.set(`${item.category}:${item.name}`, { ...item, basePrice: item.priceValue });
  }

  const entries = [...selected.values()].map((item) => ({
    ...item,
    saleDiscount: 0,
    finalPrice: Math.max(0.01, item.basePrice * modifierMultiplier)
  }));

  if (shopSale.checked && entries.length) {
    [...entries].sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.ceil(entries.length * 0.05))).forEach((item) => {
      item.saleDiscount = Math.floor(5 + Math.random() * 36);
      item.finalPrice = item.finalPrice * (1 - item.saleDiscount / 100);
    });
  }

  generatedShop = { wealth, type, priceModifier, sale: shopSale.checked, entries: entries.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR')) };
  renderGeneratedShop();
}

function renderGeneratedShop() {
  const total = generatedShop.entries.reduce((sum, item) => sum + item.finalPrice, 0);
  generatorSummary.innerHTML = `<strong>${generatedShop.wealth.label}</strong> (${formatGold(generatedShop.wealth.gold)}) • <strong>${generatedShop.type.label}</strong> • Preço ${generatedShop.priceModifier > 0 ? '+' : ''}${generatedShop.priceModifier}% • ${generatedShop.entries.length} itens • Total: <strong>${formatGold(total)}</strong>`;
  generatorResults.innerHTML = `<table class="generator-table"><thead><tr><th>Item</th><th>Categoria</th><th>Preço final</th><th>SALE</th><th>Detalhes</th></tr></thead><tbody>${generatedShop.entries.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.category)}</td><td>${formatGold(item.finalPrice)}</td><td>${item.saleDiscount ? `-${item.saleDiscount}%` : '—'}</td><td>${escapeHtml(item.details)}</td></tr>`).join('')}</tbody></table>`;
  generatorPdf.disabled = false;
}

function normalizePdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?');
}


function pdfEscape(value) {
  return normalizePdfText(value).replace(/[\\()]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function downloadGeneratedPdf() {
  if (!generatedShop) return;

  const lines = [
    'Sorteador de Loja D&D',
    generatorSummary.textContent,
    '',
    ...generatedShop.entries.map((item) => `${item.name} | ${item.category} | ${formatGold(item.finalPrice)} | SALE ${item.saleDiscount ? `-${item.saleDiscount}%` : '-'} | ${item.details}`)
  ];
  const pages = [];
  for (let index = 0; index < lines.length; index += 34) pages.push(lines.slice(index, index + 34));

  const objects = [null, ''];
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const pageRefs = [];

  pages.forEach((pageLines, pageIndex) => {
    const contentId = 4 + (pageIndex * 2);
    const pageId = contentId + 1;
    const content = `BT /F1 10 Tf 40 800 Td 14 TL ${pageLines.map((line) => `(${pdfEscape(line).slice(0, 170)}) Tj T*`).join(' ')} ET`;
    objects[contentId] = `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    pageRefs.push(`${pageId} 0 R`);
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  const offsets = [];
  let pdf = '%PDF-1.4\n';
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = byteLength(pdf);
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }
  const xref = byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let objectId = 1; objectId < objects.length; objectId += 1) pdf += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  link.download = `loja-dnd-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

generatorOpen.addEventListener('click', () => { generatorModal.hidden = false; generatorForm.querySelector('select').focus(); });
generatorClose.addEventListener('click', () => { generatorModal.hidden = true; });
generatorModal.addEventListener('click', (event) => { if (event.target === generatorModal) generatorModal.hidden = true; });
generatorForm.addEventListener('submit', (event) => { event.preventDefault(); generateShopInventory(); });
generatorPdf.addEventListener('click', downloadGeneratedPdf);
