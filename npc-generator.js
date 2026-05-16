const fieldIds = ["nome","sobrenome","profissao","cidadeNatal","sexo","antepassado","classe","idade","temperamento","lealdade"];
const attrs = ["forca","destreza","constituicao","inteligencia","sabedoria","carisma"];
const state = { npc:null, data:null, characteristicData:null, cidades:[], cidadeMap:null, locations:[], backgrounds:[] };

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const normalizeType = (t) => String(t||"").trim().toLowerCase();
const isCityOrVillage = (t) => normalizeType(t).includes("cidade") || normalizeType(t).includes("vila");
const getCheckedValues = (id) => [...document.querySelectorAll(`#${id} input[type='checkbox']:checked`)].map((i)=>i.value);
const pickFromChecks = (id, fallback) => randomFrom((getCheckedValues(id).length ? getCheckedValues(id) : fallback));
const labelAlignment = (v) => v < -25 ? "BOM" : (v > 25 ? "MAL" : "Neutro");

function pickLealdadeByAlignment(v){
  const pool=(state.data.lealdadesPonderadas||[]).filter((l)=>v>=Number(l.min)&&v<=Number(l.max));
  if(pool.length) return randomFrom(pool).nome;
  return pickFromChecks("lealdadeChecks", state.data.lealdades||[]);
}
const populateSelect = (id, values) => { const s=document.getElementById(id); if(!s) return; s.innerHTML=""; values.forEach((v)=>{const o=document.createElement("option"); o.value=v; o.textContent=v; s.appendChild(o);}); };

function buildCheckList(containerId, values) {
  const root = document.getElementById(containerId);
  const selected = new Set(getCheckedValues(containerId));
  root.innerHTML = "";
  values.forEach((v, idx) => {
    const id = `${containerId}_${idx}`;
    const row = document.createElement("label");
    row.className = "check-item";
    row.htmlFor = id;
    row.innerHTML = `<input type='checkbox' id='${id}' value='${v}' ${selected.has(v) ? "checked" : ""}> ${v}`;
    root.appendChild(row);
  });
}

function generateAgeForRace(race){const r=state.data.faixaEtariaPorAntepassado[race]||{min:18,max:80}; return String(Math.floor(Math.random()*(r.max-r.min+1))+r.min);}
function randomAttr(){ return Math.floor(Math.random()*16)+3; }
const classAttributePriority = {
  "Bardo": ["carisma", "destreza", "constituicao", "sabedoria", "inteligencia", "forca"],
  "Bruxo": ["carisma", "constituicao", "destreza", "sabedoria", "inteligencia", "forca"],
  "Bárbaro": ["forca", "constituicao", "destreza", "sabedoria", "carisma", "inteligencia"],
  "Clérigo": ["sabedoria", "constituicao", "carisma", "forca", "destreza", "inteligencia"],
  "Druida": ["sabedoria", "constituicao", "destreza", "inteligencia", "carisma", "forca"],
  "Feiticeiro": ["carisma", "constituicao", "destreza", "inteligencia", "sabedoria", "forca"],
  "Guerreiro": ["forca", "constituicao", "destreza", "sabedoria", "carisma", "inteligencia"],
  "Ladino": ["destreza", "inteligencia", "carisma", "constituicao", "sabedoria", "forca"],
  "Mago": ["inteligencia", "constituicao", "destreza", "sabedoria", "carisma", "forca"],
  "Monge": ["destreza", "sabedoria", "constituicao", "forca", "inteligencia", "carisma"],
  "Paladino": ["forca", "carisma", "constituicao", "sabedoria", "destreza", "inteligencia"],
  "Patrulheiro": ["destreza", "sabedoria", "constituicao", "forca", "inteligencia", "carisma"]
};
const standardArray = [15,14,13,12,10,8];
function generateSheet(characterClass){
  const orderedAttrs = classAttributePriority[characterClass] || attrs;
  const spread = [...standardArray].sort(()=>Math.random()-0.5);
  const sheet = {};
  orderedAttrs.forEach((attr, idx)=>{sheet[attr]=spread[idx];});
  return sheet;
}
const toModifier = (value) => Math.floor((Number(value) - 10) / 2);
function generateCharacteristics(pack){const nonNone=pack.caracteristicasExtras.filter(i=>i!=="Nenhuma");const n=Math.random()<0.45?0:(Math.random()<0.8?1:2);const extras=[...new Set(Array.from({length:n},()=>randomFrom(nonNone)))];return{cabelo:`${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,olhos:`${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,rosto:randomFrom(pack.rosto),feicao:randomFrom(pack.feicao),peso:randomFrom(pack.peso),pele:randomFrom(pack.corPele),estruturaCorporal:randomFrom(pack.estruturaCorporal),extras:extras.length?extras.join(", "):"Nenhuma"};}
function rerollSingleCharacteristic(key,pack){return generateCharacteristics(pack)[key]||"";}

function renderCharacteristicsList(c){const el=document.getElementById("caracteristicasValue");el.innerHTML="";[["cabelo","cabelo"],["olhos","olhos"],["rosto","rosto"],["feição","feicao"],["peso","peso"],["cor da pele","pele"],["estrutura corporal","estruturaCorporal"],["características extras","extras"]].forEach(([label,key])=>{const li=document.createElement("li");li.innerHTML=`<button class='reroll-char' type='button' data-char-key='${key}'>🎲</button> <strong>${label}:</strong> <span class='char-value'>${c[key]}</span>`;el.appendChild(li);});}
function renderSheet(sheet){attrs.forEach((k)=>{document.getElementById(`${k}Value`).textContent = sheet[k]; const mod = toModifier(sheet[k]); document.getElementById(`${k}Mod`).textContent = `MOD ${mod >= 0 ? "+" : ""}${mod}`;});}
function renderNpc(npc){
fieldIds.forEach((id)=>{const el=document.getElementById(`${id}Value`); if(el) el.textContent=npc[id]||"";});
renderCharacteristicsList(npc.caracteristicas);
renderSheet(npc.ficha);
document.getElementById("cidadeNatalLink").href=`mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`;
const bgEl = document.getElementById("backgroundValue");
if (bgEl) bgEl.innerHTML = npc.background || "";
state.npc=npc;
}

async function loadLocations(){const files=await (await fetch("data/locations/index.json")).json(); return Promise.all(files.map(async (f)=>{const d=await (await fetch(`data/locations/${f}`)).json(); return {file:String(f).replace(/\.json$/i,""),type:String(d.type||""),nome:String(d.name||""),x:Number(d.x||0),y:Number(d.y||0)};}));}
async function loadCityVillageLocations(){const entries = await loadLocations(); return entries.filter((e)=>e.nome&&isCityOrVillage(e.type));}
const calculateDistancePercent = (a,b) => (Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(8000,5000))*100;
function getAllowedLocations(all){const selected=document.getElementById("rangeCenterSelect").value;const max=Number(document.getElementById("distanceRange").value||100);const center=all.find((e)=>e.nome===selected)||all[0]; if(!center) return []; return all.filter((e)=>calculateDistancePercent(center,e)<=max);}
function refreshHometownChecks(){const selected = getCheckedValues("cidadeChecks"); const allowed=getAllowedLocations(state.cidades); buildCheckList("cidadeChecks", allowed.map((e)=>e.nome).sort((a,b)=>a.localeCompare(b, "pt-BR"))); document.querySelectorAll("#cidadeChecks input[type='checkbox']").forEach((c)=>{ if(selected.includes(c.value)) c.checked = true; }); return allowed;}

function getNamePoolBySexo(sexo){if(sexo==="homens") return state.data.nomesMasculinos; if(sexo==="mulheres") return state.data.nomesFemininos; return state.data.nomesAndrogenos;}
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const randomLocationBy = (predicate) => {
  const matches = state.locations.filter((l)=>l.nome && predicate(l));
  return matches.length ? randomFrom(matches) : randomFrom(state.locations.filter((l)=>l.nome));
};
function buildBackground(npc){
  if(!state.backgrounds.length) return "";
  const template = randomFrom(state.backgrounds);
  const randomPoi = randomLocationBy(()=>true);
  const randomCity = randomLocationBy((l)=>isCityOrVillage(l.type));
  const randomEvent = randomLocationBy((l)=>normalizeType(l.type).includes("acontecimento"));
  const mapLink = (loc) => `<a href="mapa.html?focus=${encodeURIComponent(loc.file)}" target="_blank" rel="noopener">${loc.nome}</a>`;
  const replacements = {
    NOME: `${npc.nome} ${npc.sobrenome}`,
    CIDADE_NATAL: mapLink({ nome: npc.cidadeNatal, file: npc.cidadeFile }),
    PROFISSAO: npc.profissao,
    PROFISSAO_ALEATORIA: randomFrom(state.data.profissoes),
    POI: mapLink(randomPoi),
    CIDADE: mapLink(randomCity),
    ACONTECIMENTO: mapLink(randomEvent)
  };
  return Object.entries(replacements).reduce((text,[key,val])=>text.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`,"g"),String(val)), template);
}

function buildNpcFromForm(){const allowed=getAllowedLocations(state.cidades); const cidadeNome=pickFromChecks("cidadeChecks", (allowed.length?allowed:state.cidades).map((c)=>c.nome)); const cidade=state.cidadeMap.get(cidadeNome)||state.cidades[0]; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const antepassado=pickFromChecks("antepassadoChecks", state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(getNamePoolBySexo(sexo)); const sobrenome=randomFrom(state.data.sobrenomes); const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado); const alignVal=Number(document.getElementById("alignmentRange").value||0) * -1;
const classe = pickFromChecks("classeChecks",state.data.classes);
const npc = {nome,sobrenome,profissao:pickFromChecks("profissaoChecks",state.data.profissoes),cidadeNatal:`${cidade.nome} (${cidade.tipo})`,cidadeFile:cidade.file,sexo,antepassado,classe,idade,caracteristicas:generateCharacteristics(state.characteristicData[sexo]),temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos),lealdade:pickLealdadeByAlignment(alignVal),ficha:generateSheet(classe)};
npc.background = buildBackground(npc);
return npc;}

function rerollField(field){if(!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const allowed=getAllowedLocations(state.cidades);
if(field==="nome"){ state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.sobrenome=randomFrom(state.data.sobrenomes); }
if(field==="profissao") state.npc.profissao=pickFromChecks("profissaoChecks", state.data.profissoes);
if(field==="cidadeNatal"){const pool=(allowed.length?allowed:state.cidades).map((c)=>c.nome); const c=state.cidadeMap.get(randomFrom(pool)); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
if(field==="sexo") { state.npc.sexo=sexo; state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.caracteristicas=generateCharacteristics(state.characteristicData[sexo]); }
if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
if(field==="classe") { state.npc.classe=pickFromChecks("classeChecks",state.data.classes); state.npc.ficha=generateSheet(state.npc.classe); }
if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
if(field==="alinhamento"){const v=Number(document.getElementById("alignmentRange").value||0) * -1; state.npc.lealdade=pickLealdadeByAlignment(v);}
state.npc.background = buildBackground(state.npc);
renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades,locations,backgroundRes]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations(),loadLocations(),fetch("./data/backgrounds.json")]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.locations=locations.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.backgrounds=(await backgroundRes.json()).templates.map((t)=>String(t.text||"")).filter(Boolean); state.cidades=cidades.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map((e)=>[e.nome,e]));
populateSelect("rangeCenterSelect",state.cidades.map((c)=>c.nome).sort((a,b)=>a.localeCompare(b, "pt-BR")));
buildCheckList("profissaoChecks",state.data.profissoes); buildCheckList("antepassadoChecks",state.data.antepassados); buildCheckList("classeChecks",state.data.classes); buildCheckList("temperamentoChecks",state.data.temperamentos); buildCheckList("lealdadeChecks",state.data.lealdades); buildCheckList("sexoChecks", ["homens","mulheres","androgenos"]);
refreshHometownChecks();
const updateRange=()=>{document.getElementById("distanceValue").textContent=document.getElementById("distanceRange").value; refreshHometownChecks();};
document.getElementById("distanceRange").addEventListener("input",updateRange); document.getElementById("rangeCenterSelect").addEventListener("change",updateRange);
const align=document.getElementById("alignmentRange"); const alignLabel=document.getElementById("alignmentLabel");
align.addEventListener("input",()=>{alignLabel.textContent=labelAlignment(Number(align.value)); if(state.npc){state.npc.lealdade=pickLealdadeByAlignment(Number(align.value) * -1); renderNpc(state.npc);}});
document.getElementById("randomizeButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.getElementById("applyButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,state.characteristicData[sexo]); renderNpc(state.npc);});
document.querySelectorAll(".clear-checks").forEach((btn)=>btn.addEventListener("click",()=>{const t=btn.dataset.target; document.querySelectorAll(`#${t} input[type='checkbox']`).forEach((c)=>{c.checked=false;});}));
renderNpc(buildNpcFromForm());
}
init();
