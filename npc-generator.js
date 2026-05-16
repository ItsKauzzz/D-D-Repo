const fieldIds = ["nome", "profissao", "cidadeNatal", "antepassado", "classe", "idade", "caracteristicas", "temperamento", "lealdade"];

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

  return `Cabelo ${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}; olhos ${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)}); rosto ${randomFrom(pack.rosto)}; feição ${randomFrom(pack.feicao)}; peso ${randomFrom(pack.peso)}; pele ${randomFrom(pack.corPele)}; estrutura ${randomFrom(pack.estruturaCorporal)}; extras: ${extrasText}.`;
}

function renderNpc(npc) {
  fieldIds.forEach((fieldId) => { document.getElementById(`${fieldId}Value`).textContent = npc[fieldId]; });
  document.getElementById("cidadeNatalLink").href = `mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`;
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
  const [baseRes, charRes] = await Promise.all([fetch("./npc-data.json"), fetch("./npc-characteristics.json")]);
  const data = await baseRes.json();
  const characteristicData = await charRes.json();
  const cidades = data.cidadesNatais;
  const cidadeMap = new Map(cidades.map((entry) => [entry.nome, entry]));

  populateSelect("nomeSelect", data.nomes);
  populateSelect("profissaoSelect", data.profissoes);
  populateSelect("cidadeSelect", cidades.map((c) => c.nome));
  populateSelect("antepassadoSelect", data.antepassados);
  populateSelect("classeSelect", data.classes);
  populateSelect("idadeSelect", data.idades);
  populateSelect("temperamentoSelect", data.temperamentos);
  populateSelect("lealdadeSelect", data.lealdades);

  document.getElementById("randomizeButton").addEventListener("click", () => {
    document.getElementById("nomeSelect").value = randomFrom(data.nomes);
    document.getElementById("profissaoSelect").value = randomFrom(data.profissoes);
    document.getElementById("cidadeSelect").value = randomFrom(cidades).nome;
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
