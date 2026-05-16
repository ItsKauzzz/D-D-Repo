const fallbackOptions = {
  antepassados: ["Camponês", "Nobre", "Exilado", "Mercenário", "Erudito"],
  classes: ["Guerreiro", "Mago", "Ladino", "Clérigo", "Patrulheiro"],
  temperamentos: ["Calmo", "Impulsivo", "Cínico", "Carismático", "Reservado"],
  lealdades: ["Reino", "Família", "Guilda", "A si mesmo", "Ordem arcana"]
};

const fieldIds = [
  "nome",
  "profissao",
  "cidadeNatal",
  "antepassado",
  "classe",
  "idade",
  "caracteristicas",
  "temperamento",
  "lealdade"
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

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

  if (current && values.includes(current)) {
    select.value = current;
  }
}

function renderNpc(npc) {
  fieldIds.forEach((fieldId) => {
    const valueEl = document.getElementById(`${fieldId}Value`);
    valueEl.textContent = npc[fieldId];
  });
}

function buildNpcFromForm() {
  return {
    nome: document.getElementById("nomeSelect").value,
    profissao: document.getElementById("profissaoSelect").value,
    cidadeNatal: document.getElementById("cidadeSelect").value,
    antepassado: document.getElementById("antepassadoSelect").value,
    classe: document.getElementById("classeSelect").value,
    idade: document.getElementById("idadeInput").value || "Desconhecida",
    caracteristicas: "(Gerador dedicado será integrado em breve)",
    temperamento: document.getElementById("temperamentoSelect").value,
    lealdade: document.getElementById("lealdadeSelect").value
  };
}

async function init() {
  const response = await fetch("./npc-data.json");
  const data = await response.json();

  populateSelect("nomeSelect", data.nomes);
  populateSelect("profissaoSelect", data.profissoes);
  populateSelect("cidadeSelect", data.cidadesNatais);
  populateSelect("antepassadoSelect", fallbackOptions.antepassados);
  populateSelect("classeSelect", fallbackOptions.classes);
  populateSelect("temperamentoSelect", fallbackOptions.temperamentos);
  populateSelect("lealdadeSelect", fallbackOptions.lealdades);

  document.getElementById("randomizeButton").addEventListener("click", () => {
    document.getElementById("nomeSelect").value = randomFrom(data.nomes);
    document.getElementById("profissaoSelect").value = randomFrom(data.profissoes);
    document.getElementById("cidadeSelect").value = randomFrom(data.cidadesNatais);
    document.getElementById("antepassadoSelect").value = randomFrom(fallbackOptions.antepassados);
    document.getElementById("classeSelect").value = randomFrom(fallbackOptions.classes);
    document.getElementById("idadeInput").value = String(Math.floor(Math.random() * 50) + 18);
    document.getElementById("temperamentoSelect").value = randomFrom(fallbackOptions.temperamentos);
    document.getElementById("lealdadeSelect").value = randomFrom(fallbackOptions.lealdades);
    renderNpc(buildNpcFromForm());
  });

  document.getElementById("applyButton").addEventListener("click", () => {
    renderNpc(buildNpcFromForm());
  });

  renderNpc(buildNpcFromForm());
}

init();
