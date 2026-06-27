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
