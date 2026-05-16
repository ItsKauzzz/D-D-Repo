const fieldIds = ["nome", "profissao", "cidadeNatal", "antepassado", "classe", "idade", "temperamento", "lealdade"];

function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }
function populateSelect(id, values) {
  const select = document.getElementById(id);
  const current = select.value;
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (current && values.includes(current)) select.value = current;
}

function generateCharacteristics(pack) {
  const extraCount = Math.random() < 0.45 ? 0 : (Math.random() < 0.8 ? 1 : 2);
  const extras = [];
  const nonNone = pack.caracteristicasExtras.filter((item) => item !== "Nenhuma");
  for (let i = 0; i < extraCount; i += 1) extras.push(randomFrom(nonNone));
  const uniqueExtras = [...new Set(extras)];
  const extrasText = uniqueExtras.length ? uniqueExtras.join(", ") : "Nenhuma";

  return {
    cabelo: `${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,
    olhos: `${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,
    rosto: randomFrom(pack.rosto),
    feicao: randomFrom(pack.feicao),
    peso: randomFrom(pack.peso),
    pele: randomFrom(pack.corPele),
    estruturaCorporal: randomFrom(pack.estruturaCorporal),
    extras: extrasText
  };
}

function renderCharacteristicsList(characteristics) {
  const listEl = document.getElementById("caracteristicasValue");
  listEl.innerHTML = "";
  const labelMap = [
    ["CABELO", characteristics.cabelo],
    ["OLHOS", characteristics.olhos],
    ["ROSTO", characteristics.rosto],
    ["FEIÇÃO", characteristics.feicao],
    ["PESO", characteristics.peso],
    ["COR DA PELE", characteristics.pele],
    ["ESTRUTURA CORPORAL", characteristics.estruturaCorporal],
    ["CARACTERÍSTICAS EXTRAS", characteristics.extras]
  ];
  labelMap.forEach(([label, value]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${label}:</strong> ${value}`;
    listEl.appendChild(li);
  });
}

function renderNpc(npc) {
  fieldIds.forEach((fieldId) => { document.getElementById(`${fieldId}Value`).textContent = npc[fieldId]; });
  renderCharacteristicsList(npc.caracteristicas);
  document.getElementById("cidadeNatalLink").href = `mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`;
}

function normalizeType(type) { return String(type || "").trim().toLowerCase(); }
function isCityOrVillage(type) {
  const t = normalizeType(type);
  return t.includes("cidade") || t.includes("vila");
}

async function loadCityVillageLocations() {
  const indexResponse = await fetch("data/locations/index.json");
  const files = await indexResponse.json();
  const entries = await Promise.all(files.map(async (file) => {
    const data = await (await fetch(`data/locations/${file}`)).json();
    return {
      file: String(file).replace(/\.json$/i, ""),
      type: String(data.type || ""),
      nome: String(data.name || ""),
      x: Number(data.x || 0),
      y: Number(data.y || 0)
    };
  }));
  return entries.filter((entry) => entry.nome && isCityOrVillage(entry.type));
}

function calculateDistancePercent(origin, target) {
  const mapWidth = 8000;
  const mapHeight = 5000;
  const maxDistance = Math.hypot(mapWidth, mapHeight);
  const distance = Math.hypot(origin.x - target.x, origin.y - target.y);
  return (distance / maxDistance) * 100;
}

function getAllowedLocations(allLocations) {
  const selectedName = document.getElementById("rangeCenterSelect").value;
  const maxPercent = Number(document.getElementById("distanceRange").value || 100);
  const center = allLocations.find((entry) => entry.nome === selectedName) || allLocations[0];
  if (!center) return [];
  return allLocations.filter((entry) => calculateDistancePercent(center, entry) <= maxPercent);
}

function refreshHometownOptions(allLocations) {
  const previous = document.getElementById("cidadeSelect").value;
  const allowed = getAllowedLocations(allLocations);
  populateSelect("cidadeSelect", allowed.map((entry) => entry.nome));
  if (previous && allowed.some((entry) => entry.nome === previous)) {
    document.getElementById("cidadeSelect").value = previous;
  }
  return allowed;
}

function buildNpcFromForm(cidadeMap, characteristicData) {
  const cidadeNome = document.getElementById("cidadeSelect").value;
  const cidade = cidadeMap.get(cidadeNome);
  const profile = document.getElementById("generoSelect").value;
  return {
    nome: document.getElementById("nomeSelect").value,
    profissao: document.getElementById("profissaoSelect").value,
    cidadeNatal: `${cidade.nome} (${cidade.tipo})`,
    cidadeFile: cidade.file,
    antepassado: document.getElementById("antepassadoSelect").value,
    classe: document.getElementById("classeSelect").value,
    idade: document.getElementById("idadeSelect").value,
    caracteristicas: generateCharacteristics(characteristicData[profile]),
    temperamento: document.getElementById("temperamentoSelect").value,
    lealdade: document.getElementById("lealdadeSelect").value
  };
}

async function init() {
  const [baseRes, charRes, cidades] = await Promise.all([fetch("./npc-data.json"), fetch("./npc-characteristics.json"), loadCityVillageLocations()]);
  const data = await baseRes.json();
  const characteristicData = await charRes.json();
  const normalizedCidades = cidades.map((entry) => ({ nome: entry.nome, tipo: entry.type, file: entry.file, x: entry.x, y: entry.y }));
  const cidadeMap = new Map(normalizedCidades.map((entry) => [entry.nome, entry]));

  populateSelect("nomeSelect", data.nomes);
  populateSelect("profissaoSelect", data.profissoes);
  populateSelect("rangeCenterSelect", normalizedCidades.map((c) => c.nome));
  refreshHometownOptions(normalizedCidades);
  populateSelect("antepassadoSelect", data.antepassados);
  populateSelect("classeSelect", data.classes);
  populateSelect("idadeSelect", data.idades);
  populateSelect("temperamentoSelect", data.temperamentos);
  populateSelect("lealdadeSelect", data.lealdades);

  const distanceRange = document.getElementById("distanceRange");
  const distanceValue = document.getElementById("distanceValue");
  const rangeCenterSelect = document.getElementById("rangeCenterSelect");
  const updateRange = () => {
    distanceValue.textContent = distanceRange.value;
    refreshHometownOptions(normalizedCidades);
  };
  distanceRange.addEventListener("input", updateRange);
  rangeCenterSelect.addEventListener("change", updateRange);

  document.getElementById("randomizeButton").addEventListener("click", () => {
    const allowedCidades = refreshHometownOptions(normalizedCidades);
    document.getElementById("nomeSelect").value = randomFrom(data.nomes);
    document.getElementById("profissaoSelect").value = randomFrom(data.profissoes);
    const pool = allowedCidades.length ? allowedCidades : normalizedCidades;
    document.getElementById("cidadeSelect").value = randomFrom(pool).nome;
    document.getElementById("antepassadoSelect").value = randomFrom(data.antepassados);
    document.getElementById("classeSelect").value = randomFrom(data.classes);
    document.getElementById("idadeSelect").value = randomFrom(data.idades);
    document.getElementById("temperamentoSelect").value = randomFrom(data.temperamentos);
    document.getElementById("lealdadeSelect").value = randomFrom(data.lealdades);
    document.getElementById("generoSelect").value = randomFrom(["homens", "mulheres", "androgenos"]);
    renderNpc(buildNpcFromForm(cidadeMap, characteristicData));
  });

  document.getElementById("applyButton").addEventListener("click", () => renderNpc(buildNpcFromForm(cidadeMap, characteristicData)));
  renderNpc(buildNpcFromForm(cidadeMap, characteristicData));
}

init();
