const catalogGrid = document.getElementById('catalog-grid');
const categoryList = document.getElementById('category-list');
const itemCount = document.getElementById('item-count');
const catalogTitle = document.getElementById('catalog-title');
const searchInput = document.getElementById('item-search');

const extraCategories = {
  'Poções e Preparados': ['Poção de cura', 'Poção mágica', 'Antídoto', 'Água benta', 'Óleo', 'Kit de herbalismo', 'Kit de venenos'],
  'Moradia e Hospedagem': ['Quarto comum em estalagem', 'Quarto confortável em estalagem', 'Casa simples', 'Casa urbana', 'Mansão nobre', 'Torre de mago', 'Fortaleza pequena', 'Tenda de campanha', 'Estábulo para montaria'],
  'Serviços de Contratação': ['Mensageiro', 'Guia local', 'Mercenário', 'Curandeiro', 'Escriba', 'Ferreiro sob encomenda', 'Caravana protegida']
};

const descriptions = {
  'Poção de cura': 'Frasco rubro de alquimia vital; restaura ferimentos leves e é presença obrigatória na mochila de aventureiros prudentes.',
  'Poção mágica': 'Preparado arcano de efeito variável, comprado em lojas místicas ou com boticários de reputação duvidosa.',
  'Antídoto': 'Mistura amarga contra venenos comuns; valiosa antes de explorar pântanos, criptas e covis de assassinos.',
  'Água benta': 'Água consagrada em templo, usada contra mortos-vivos, profanações e rituais sombrios.',
  'Casa simples': 'Moradia modesta de madeira e pedra, adequada para descanso entre aventuras e armazenamento básico.',
  'Casa urbana': 'Residência dentro de muralhas ou vila grande, útil para contatos, oficinas e vida social de campanha.',
  'Mansão nobre': 'Propriedade luxuosa com salões, criados e prestígio; perfeita para personagens influentes.',
  'Torre de mago': 'Moradia vertical fortificada para estudos arcanos, biblioteca, observatório e experimentos perigosos.',
  'Fortaleza pequena': 'Bastião murado para guarnição, tesouro e domínio territorial em campanhas de alto nível.'
};

const categoryDescriptions = [
  [/arma|espada|machado|arco|besta|adaga|lança|maça|martelo|tridente|chicote|foice|glaive|pique|porrete|funda|dardo|rede|zarabatana/i, 'Equipamento ofensivo para duelos, caçadas, escoltas e batalhas de masmorra.'],
  [/armadura|escudo|cota|couro|placas|peitoral|gibão/i, 'Proteção de batalha feita para desviar lâminas, flechas, garras e azar.'],
  [/poção|antídoto|água benta|óleo|ração|kit de primeiros/i, 'Consumível prático para sobreviver a viagens, venenos, ferimentos e ameaças sobrenaturais.'],
  [/casa|mansão|torre|fortaleza|quarto|estalagem|estábulo|moradia/i, 'Compra ou aluguel de abrigo, status e segurança para períodos entre aventuras.'],
  [/cavalo|mula|burro|camelo|elefante|mastim|pônei|cão/i, 'Animal treinado ou montaria para viagem, carga, guarda e presença cênica.'],
  [/barco|navio|carroça|carruagem|trenó|veículo/i, 'Transporte para atravessar estradas, rios, mares, neve ou rotas comerciais perigosas.'],
  [/ferramentas|kit|utensílios|instrumento|alaúde|flauta|harpa|tambor|violino/i, 'Conjunto especializado para ofícios, perícias, apresentações e planos engenhosos.'],
  [/anel|capa|botas|varinha|cajado|pergaminho|manto|gema|ioun|bastão/i, 'Item encantado negociado por arcanistas, relíquias de ruínas ou mercadores raros.']
];

let allItems = [];
let activeCategory = 'Todos';

function describeItem(name, category) {
  if (descriptions[name]) return descriptions[name];
  const match = categoryDescriptions.find(([pattern]) => pattern.test(name) || pattern.test(category));
  if (match) return match[1];
  return `Item comprável de ${category.toLowerCase()}, útil para equipar personagens, decorar cenas e resolver desafios durante a campanha.`;
}

function addItemsFromGroups(groups, sourceLabel, target) {
  Object.entries(groups).forEach(([category, items]) => {
    items.forEach((name) => {
      const key = name.toLocaleLowerCase('pt-BR');
      if (!target.has(key)) {
        target.set(key, { name, category, source: sourceLabel, description: describeItem(name, category) });
      }
    });
  });
}

async function loadCatalog() {
  const [itemsResponse, equipmentResponse] = await Promise.all([
    fetch('./data/inventory/itens.json'),
    fetch('./data/inventory/equipment.json')
  ]);
  const itemsData = await itemsResponse.json();
  const equipmentData = await equipmentResponse.json();
  const merged = new Map();

  addItemsFromGroups(equipmentData.Equipamentos, 'Equipamento', merged);
  addItemsFromGroups(itemsData.Itens, 'Mercado', merged);
  addItemsFromGroups(extraCategories, 'Mesa de jogo', merged);

  allItems = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  renderCategories();
  renderCatalog();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function renderCategories() {
  const categories = ['Todos', ...new Set(allItems.map((item) => item.category))].sort((a, b) => a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b, 'pt-BR'));
  categoryList.innerHTML = categories.map((category) => `<button class="category-button${category === activeCategory ? ' active' : ''}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
}

function renderCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
  const filtered = allItems.filter((item) => {
    const inCategory = activeCategory === 'Todos' || item.category === activeCategory;
    const inSearch = !query || `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase('pt-BR').includes(query);
    return inCategory && inSearch;
  });

  catalogTitle.textContent = activeCategory === 'Todos' ? 'Todos os itens' : activeCategory;
  itemCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'item' : 'itens'}`;
  catalogGrid.innerHTML = filtered.length ? filtered.map((item) => `
    <article class="item-card">
      <span class="badge">${escapeHtml(item.category)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
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

loadCatalog().catch(() => {
  catalogGrid.innerHTML = '<p class="empty">Não foi possível carregar o catálogo do mercado.</p>';
});
