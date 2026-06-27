const catalogGrid = document.getElementById('catalog-grid');
const categoryList = document.getElementById('category-list');
const itemCount = document.getElementById('item-count');
const catalogTitle = document.getElementById('catalog-title');
const searchInput = document.getElementById('item-search');
const viewToggle = document.getElementById('view-toggle');

const extraCategories = {
  'Poções e Preparados': ['Poção de cura', 'Poção de cura maior', 'Poção de cura superior', 'Poção de cura suprema', 'Poção mágica', 'Antídoto', 'Água benta', 'Óleo', 'Kit de herbalismo', 'Kit de venenos'],
  'Moradia e Hospedagem': ['Quarto comum em estalagem', 'Quarto confortável em estalagem', 'Casa simples', 'Casa urbana', 'Mansão nobre', 'Torre de mago', 'Fortaleza pequena', 'Tenda de campanha', 'Estábulo para montaria'],
  'Serviços de Contratação': ['Mensageiro', 'Guia local', 'Mercenário', 'Curandeiro', 'Escriba', 'Ferreiro sob encomenda', 'Caravana protegida']
};

const exactItemInfo = {
  'Adaga': { price: '2 po', details: 'Dano 1d4 perfurante; finesse, leve, arremesso 6/18 m.' },
  'Alabarda': { price: '20 po', details: 'Dano 1d10 cortante; pesada, alcance, duas mãos.' },
  'Azagaia': { price: '5 pp', details: 'Dano 1d6 perfurante; arremesso 9/36 m.' },
  'Bordão': { price: '2 pp', details: 'Dano 1d6 contundente; versátil 1d8.' },
  'Chicote': { price: '2 po', details: 'Dano 1d4 cortante; finesse, alcance.' },
  'Clava': { price: '1 pp', details: 'Dano 1d4 contundente; leve.' },
  'Cimitarra': { price: '25 po', details: 'Dano 1d6 cortante; finesse, leve.' },
  'Espada curta': { price: '10 po', details: 'Dano 1d6 perfurante; finesse, leve.' },
  'Espada longa': { price: '15 po', details: 'Dano 1d8 cortante; versátil 1d10.' },
  'Espadão': { price: '50 po', details: 'Dano 2d6 cortante; pesada, duas mãos.' },
  'Florete': { price: '25 po', details: 'Dano 1d8 perfurante; finesse.' },
  'Foice': { price: '1 po', details: 'Dano 1d4 cortante; leve.' },
  'Glaive': { price: '20 po', details: 'Dano 1d10 cortante; pesada, alcance, duas mãos.' },
  'Lança': { price: '1 po', details: 'Dano 1d6 perfurante; arremesso 6/18 m, versátil 1d8.' },
  'Lança de cavalaria': { price: '10 po', details: 'Dano 1d12 perfurante; alcance, especial; ótima montado.' },
  'Machado de batalha': { price: '10 po', details: 'Dano 1d8 cortante; versátil 1d10.' },
  'Machado grande': { price: '30 po', details: 'Dano 1d12 cortante; pesada, duas mãos.' },
  'Machadinha': { price: '5 po', details: 'Dano 1d6 cortante; leve, arremesso 6/18 m.' },
  'Maça': { price: '5 po', details: 'Dano 1d6 contundente.' },
  'Mangual': { price: '10 po', details: 'Dano 1d8 contundente.' },
  'Martelo de guerra': { price: '15 po', details: 'Dano 1d8 contundente; versátil 1d10.' },
  'Martelo leve': { price: '2 po', details: 'Dano 1d4 contundente; leve, arremesso 6/18 m.' },
  'Maul': { price: '10 po', details: 'Dano 2d6 contundente; pesada, duas mãos.' },
  'Morningstar': { price: '15 po', details: 'Dano 1d8 perfurante.' },
  'Pique': { price: '5 po', details: 'Dano 1d10 perfurante; pesada, alcance, duas mãos.' },
  'Porrete': { price: '2 pp', details: 'Dano 1d4 contundente; leve.' },
  'Rapieira': { price: '25 po', details: 'Dano 1d8 perfurante; finesse.' },
  'Tridente': { price: '5 po', details: 'Dano 1d6 perfurante; arremesso 6/18 m, versátil 1d8.' },
  'Arco curto': { price: '25 po', details: 'Dano 1d6 perfurante; munição 24/96 m, duas mãos.' },
  'Arco longo': { price: '50 po', details: 'Dano 1d8 perfurante; munição 45/180 m, pesada, duas mãos.' },
  'Besta leve': { price: '25 po', details: 'Dano 1d8 perfurante; munição 24/96 m, recarga, duas mãos.' },
  'Besta pesada': { price: '50 po', details: 'Dano 1d10 perfurante; munição 30/120 m, pesada, recarga, duas mãos.' },
  'Besta de mão': { price: '75 po', details: 'Dano 1d6 perfurante; munição 9/36 m, leve, recarga.' },
  'Dardo': { price: '5 pc', details: 'Dano 1d4 perfurante; finesse, arremesso 6/18 m.' },
  'Funda': { price: '1 pp', details: 'Dano 1d4 contundente; munição 9/36 m.' },
  'Rede': { price: '1 po', details: 'Sem dano; arremesso 1,5/4,5 m; pode restringir criatura Grande ou menor.' },
  'Zarabatana': { price: '10 po', details: 'Dano 1 perfurante; munição 7,5/30 m, recarga.' },
  'Acolchoada': { price: '5 po', details: 'CA 11 + Des; desvantagem em Furtividade.' },
  'Couro': { price: '10 po', details: 'CA 11 + Des; armadura leve discreta.' },
  'Couro batido': { price: '45 po', details: 'CA 12 + Des; melhor armadura leve comum.' },
  'Camisa de malha': { price: '50 po', details: 'CA 13 + Des máx. 2; armadura média.' },
  'Cota de escamas': { price: '50 po', details: 'CA 14 + Des máx. 2; desvantagem em Furtividade.' },
  'Gibão de peles': { price: '10 po', details: 'CA 12 + Des máx. 2; armadura média rústica.' },
  'Meia armadura': { price: '750 po', details: 'CA 15 + Des máx. 2; desvantagem em Furtividade.' },
  'Peitoral': { price: '400 po', details: 'CA 14 + Des máx. 2; proteção média sem penalizar Furtividade.' },
  'Cota de anéis': { price: '30 po', details: 'CA 14; desvantagem em Furtividade.' },
  'Cota de malha': { price: '75 po', details: 'CA 16; For 13; desvantagem em Furtividade.' },
  'Placas': { price: '1.500 po', details: 'CA 18; For 15; desvantagem em Furtividade.' },
  'Splint': { price: '200 po', details: 'CA 17; For 15; desvantagem em Furtividade.' },
  'Escudo': { price: '10 po', details: '+2 CA enquanto empunhado.' },
  'Poção de cura': { price: '50 po', details: 'Cura 2d4 + 2 PV ao beber.' },
  'Poção de cura maior': { price: '150 po', details: 'Cura 4d4 + 4 PV ao beber.' },
  'Poção de cura superior': { price: '450 po', details: 'Cura 8d4 + 8 PV ao beber.' },
  'Poção de cura suprema': { price: '1.350 po', details: 'Cura 10d4 + 20 PV ao beber.' },
  'Poção mágica': { price: 'Preço variável', details: 'Efeito definido pelo tipo de poção; use raridade e disponibilidade da campanha.' },
  'Antídoto': { price: '50 po', details: 'Concede vantagem em testes contra veneno por 1 hora.' },
  'Água benta': { price: '25 po', details: 'Pode causar 2d6 radiante contra mortos-vivos ou ínferos.' },
  'Kit de primeiros socorros': { price: '5 po', details: '10 usos; estabiliza criatura sem teste de Medicina.' },
  'Flechas': { price: '1 po', details: 'Munição para arcos; pacote com 20 flechas.' },
  'Virotes': { price: '1 po', details: 'Munição para bestas; pacote com 20 virotes.' },
  'Balas de funda': { price: '4 pc', details: 'Munição para funda; pacote com 20 balas.' },
  'Agulhas de zarabatana': { price: '1 po', details: 'Munição para zarabatana; pacote com 50 agulhas.' },
  'Quarto comum em estalagem': { price: '2 pp/noite', details: 'Descanso modesto em salão compartilhado; inclui abrigo básico.' },
  'Quarto confortável em estalagem': { price: '8 pp/noite', details: 'Quarto privado simples, banho e refeição decente.' },
  'Casa simples': { price: '1.000 po', details: 'Moradia modesta; abriga um grupo pequeno e permite guardar equipamentos.' },
  'Casa urbana': { price: '5.000 po', details: 'Residência em vila/cidade; bom ponto seguro para contatos e negócios.' },
  'Mansão nobre': { price: '25.000 po', details: 'Propriedade de prestígio com salas, criados e espaço para influência social.' },
  'Torre de mago': { price: '15.000 po', details: 'Base fortificada para biblioteca, laboratório e observatório arcano.' },
  'Fortaleza pequena': { price: '50.000 po', details: 'Domínio defensável com muralhas, pátio e espaço para guarnição.' },
  'Estábulo para montaria': { price: '5 pp/noite', details: 'Cuidados básicos, água e ração para uma montaria.' },
  'Mensageiro': { price: '2 pc/km', details: 'Entrega recados, mapas ou pequenos pacotes por estradas seguras.' },
  'Guia local': { price: '2 po/dia', details: 'Ajuda em navegação, rumores, trilhas e costumes da região.' },
  'Mercenário': { price: '2 po/dia', details: 'Combatente contratado; estatísticas e lealdade ficam a critério do mestre.' },
  'Curandeiro': { price: '5 po/atendimento', details: 'Tratamento mundano, diagnóstico e suporte em recuperação.' },
  'Escriba': { price: '2 po/dia', details: 'Copia textos, contratos, mapas simples ou cartas formais.' },
  'Ferreiro sob encomenda': { price: '5 po/dia + material', details: 'Repara e fabrica itens metálicos conforme tempo e recursos disponíveis.' },
  'Caravana protegida': { price: '10 po/dia', details: 'Vaga em grupo armado de viagem; reduz riscos de estrada.' }
};

const genericInfo = [
  [/ferramentas|kit de disfarce|kit de falsificação|kit de herbalismo|kit de venenos|utensílios/i, { price: '25 po', details: 'Permite testes com proficiência quando o personagem domina a ferramenta.' }],
  [/alaúde|corneta|flauta|gaita|harpa|lira|shawm|tambor|violino/i, { price: '30 po', details: 'Instrumento para apresentações, disfarces sociais e coleta de moedas em tavernas.' }],
  [/anel|capa|botas|varinha|cajado|pergaminho|manto|gema|ioun|bastão|armadura de resistência|escudo \+2/i, { price: 'Preço variável', details: 'Item mágico; disponibilidade e custo dependem de raridade, campanha e aprovação do mestre.' }],
  [/burro|mula/i, { price: '8 po', details: 'Montaria/carga comum; boa para trilhas e transporte de suprimentos.' }],
  [/cavalo|pônei|camelo|elefante|mastim|cão/i, { price: '75 po', details: 'Animal treinado; use para viagem, guarda ou carga conforme o tipo.' }],
  [/barco|navio|carruagem|carroça|trenó/i, { price: 'Preço variável', details: 'Veículo para deslocamento e comércio; capacidade e velocidade dependem do modelo.' }],
  [/lâmpada|lanterna|tocha|vela|óleo/i, { price: '1 pp', details: 'Fonte de luz; essencial para masmorras, vigílias e exploração noturna.' }],
  [/corda|gancho|pitons|escada|kit de escalada/i, { price: '2 po', details: 'Ajuda em escaladas, travessias e resgates; combine com testes de Atletismo.' }],
  [/baú|barril|bolsa|caixa|cantil|frasco|garrafa|jarra|mochila|saco|cesto/i, { price: '5 pp', details: 'Contêiner para carregar, guardar ou ocultar suprimentos e tesouros.' }]
];

const defaultPricesByCategory = [
  [/Equipamentos de aventura|Aventura e Utilidade/i, '1 po'],
  [/Consumíveis|Poções/i, '50 po'],
  [/Contêineres/i, '5 pp'],
  [/Focos mágicos|Focos Mágicos/i, '10 po'],
  [/Pacotes|Kits/i, '10 po'],
  [/Itens Supérfluos/i, '2 po'],
  [/Moradia/i, 'Preço variável'],
  [/Serviços/i, 'Preço variável']
];

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
let listMode = false;

function describeItem(name, category) {
  if (descriptions[name]) return descriptions[name];
  const match = categoryDescriptions.find(([pattern]) => pattern.test(name) || pattern.test(category));
  if (match) return match[1];
  return `Item comprável de ${category.toLowerCase()}, útil para equipar personagens, decorar cenas e resolver desafios durante a campanha.`;
}

function getItemInfo(name, category) {
  if (exactItemInfo[name]) return exactItemInfo[name];
  const genericMatch = genericInfo.find(([pattern]) => pattern.test(name) || pattern.test(category));
  if (genericMatch) return genericMatch[1];
  const categoryPrice = defaultPricesByCategory.find(([pattern]) => pattern.test(category));
  return {
    price: categoryPrice ? categoryPrice[1] : 'Preço variável',
    details: 'Uso narrativo e mecânico definido pelo mestre conforme a cena, perícia aplicável e disponibilidade local.'
  };
}

function addItemsFromGroups(groups, sourceLabel, target) {
  Object.entries(groups).forEach(([category, items]) => {
    items.forEach((name) => {
      const key = name.toLocaleLowerCase('pt-BR');
      if (!target.has(key)) {
        const info = getItemInfo(name, category);
        target.set(key, {
          name,
          category,
          source: sourceLabel,
          price: info.price,
          details: info.details,
          description: describeItem(name, category)
        });
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
  return String(value).replace(/[&<>"']/g, (char) => ({
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
    const searchableText = `${item.name} ${item.category} ${item.description} ${item.price} ${item.details}`;
    const inSearch = !query || searchableText.toLocaleLowerCase('pt-BR').includes(query);
    return inCategory && inSearch;
  });

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
viewToggle.addEventListener('click', () => {
  listMode = !listMode;
  renderCatalog();
});

loadCatalog().catch(() => {
  catalogGrid.innerHTML = '<p class="empty">Não foi possível carregar o catálogo do mercado.</p>';
});
