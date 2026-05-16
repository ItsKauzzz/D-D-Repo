const fieldIds = ["nome","sobrenome","profissao","cidadeNatal","sexo","antepassado","classe","idade","temperamento","lealdade","alinhamento"];
const attrs = ["forca","destreza","constituicao","inteligencia","sabedoria","carisma"];
const state = { npc:null, data:null, characteristicData:null, cidades:[], cidadeMap:null };

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const normalizeType = (t) => String(t||"").trim().toLowerCase();
const isCityOrVillage = (t) => normalizeType(t).includes("cidade") || normalizeType(t).includes("vila");
const getCheckedValues = (id) => [...document.querySelectorAll(`#${id} input[type='checkbox']:checked`)].map((i)=>i.value);
const pickFromChecks = (id, fallback) => randomFrom((getCheckedValues(id).length ? getCheckedValues(id) : fallback));
const labelAlignment = (v) => v < -25 ? "BOM" : (v > 25 ? "MAL" : "Neutro");
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
function generateSheet(){ return {forca:randomAttr(),destreza:randomAttr(),constituicao:randomAttr(),inteligencia:randomAttr(),sabedoria:randomAttr(),carisma:randomAttr()}; }
function generateCharacteristics(pack){const nonNone=pack.caracteristicasExtras.filter(i=>i!=="Nenhuma");const n=Math.random()<0.45?0:(Math.random()<0.8?1:2);const extras=[...new Set(Array.from({length:n},()=>randomFrom(nonNone)))];return{cabelo:`${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,olhos:`${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,rosto:randomFrom(pack.rosto),feicao:randomFrom(pack.feicao),peso:randomFrom(pack.peso),pele:randomFrom(pack.corPele),estruturaCorporal:randomFrom(pack.estruturaCorporal),extras:extras.length?extras.join(", "):"Nenhuma"};}
function rerollSingleCharacteristic(key,pack){return generateCharacteristics(pack)[key]||"";}

function renderCharacteristicsList(c){const el=document.getElementById("caracteristicasValue");el.innerHTML="";[["cabelo","cabelo"],["olhos","olhos"],["rosto","rosto"],["feição","feicao"],["peso","peso"],["cor da pele","pele"],["estrutura corporal","estruturaCorporal"],["características extras","extras"]].forEach(([label,key])=>{const li=document.createElement("li");li.innerHTML=`<button class='reroll-char' type='button' data-char-key='${key}'>🎲</button> <strong>${label}:</strong> <span class='char-value'>${c[key]}</span>`;el.appendChild(li);});}
function renderSheet(sheet){attrs.forEach((k)=>{document.getElementById(`${k}Value`).textContent = sheet[k];});}
function renderNpc(npc){fieldIds.forEach((id)=>{const el=document.getElementById(`${id}Value`); if(el) el.textContent=npc[id]||"";}); renderCharacteristicsList(npc.caracteristicas); renderSheet(npc.ficha); document.getElementById("cidadeNatalLink").href=`mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`; state.npc=npc;}

async function loadCityVillageLocations(){const files=await (await fetch("data/locations/index.json")).json(); const entries=await Promise.all(files.map(async (f)=>{const d=await (await fetch(`data/locations/${f}`)).json(); return {file:String(f).replace(/\.json$/i,""),type:String(d.type||""),nome:String(d.name||""),x:Number(d.x||0),y:Number(d.y||0)};})); return entries.filter((e)=>e.nome&&isCityOrVillage(e.type));}
const calculateDistancePercent = (a,b) => (Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(8000,5000))*100;
function getAllowedLocations(all){const selected=document.getElementById("rangeCenterSelect").value;const max=Number(document.getElementById("distanceRange").value||100);const center=all.find((e)=>e.nome===selected)||all[0]; if(!center) return []; return all.filter((e)=>calculateDistancePercent(center,e)<=max);}
function refreshHometownChecks(){const selected = getCheckedValues("cidadeChecks"); const allowed=getAllowedLocations(state.cidades); buildCheckList("cidadeChecks", allowed.map((e)=>e.nome)); document.querySelectorAll("#cidadeChecks input[type='checkbox']").forEach((c)=>{ if(selected.includes(c.value)) c.checked = true; }); return allowed;}

function getNamePoolBySexo(sexo){if(sexo==="homens") return state.data.nomesMasculinos; if(sexo==="mulheres") return state.data.nomesFemininos; return state.data.nomesAndrogenos;}

function buildNpcFromForm(){const allowed=getAllowedLocations(state.cidades); const cidadeNome=pickFromChecks("cidadeChecks", (allowed.length?allowed:state.cidades).map((c)=>c.nome)); const cidade=state.cidadeMap.get(cidadeNome)||state.cidades[0]; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const antepassado=pickFromChecks("antepassadoChecks", state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(getNamePoolBySexo(sexo)); const sobrenome=randomFrom(state.data.sobrenomes); const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado); const alignVal=Number(document.getElementById("alignmentRange").value||0);
return {nome,sobrenome,profissao:pickFromChecks("profissaoChecks",state.data.profissoes),cidadeNatal:`${cidade.nome} (${cidade.tipo})`,cidadeFile:cidade.file,sexo,antepassado,classe:pickFromChecks("classeChecks",state.data.classes),idade,caracteristicas:generateCharacteristics(state.characteristicData[sexo]),temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos),lealdade:pickFromChecks("lealdadeChecks",state.data.lealdades),alinhamento:`${labelAlignment(alignVal)} (${alignVal})`,ficha:generateSheet()};}

function rerollField(field){if(!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const allowed=getAllowedLocations(state.cidades);
if(field==="nome"){ state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.sobrenome=randomFrom(state.data.sobrenomes); }
if(field==="profissao") state.npc.profissao=pickFromChecks("profissaoChecks", state.data.profissoes);
if(field==="cidadeNatal"){const pool=(allowed.length?allowed:state.cidades).map((c)=>c.nome); const c=state.cidadeMap.get(randomFrom(pool)); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
if(field==="sexo") { state.npc.sexo=sexo; state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.caracteristicas=generateCharacteristics(state.characteristicData[sexo]); }
if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
if(field==="classe") state.npc.classe=pickFromChecks("classeChecks",state.data.classes);
if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
if(field==="alinhamento"){const v=Number(document.getElementById("alignmentRange").value||0); state.npc.alinhamento=`${labelAlignment(v)} (${v})`;}
renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations()]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.cidades=cidades.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map((e)=>[e.nome,e]));
populateSelect("rangeCenterSelect",state.cidades.map((c)=>c.nome));
buildCheckList("profissaoChecks",state.data.profissoes); buildCheckList("antepassadoChecks",state.data.antepassados); buildCheckList("classeChecks",state.data.classes); buildCheckList("temperamentoChecks",state.data.temperamentos); buildCheckList("lealdadeChecks",state.data.lealdades); buildCheckList("sexoChecks", ["homens","mulheres","androgenos"]);
refreshHometownChecks();
const updateRange=()=>{document.getElementById("distanceValue").textContent=document.getElementById("distanceRange").value; refreshHometownChecks();};
document.getElementById("distanceRange").addEventListener("input",updateRange); document.getElementById("rangeCenterSelect").addEventListener("change",updateRange);
const align=document.getElementById("alignmentRange"); const alignLabel=document.getElementById("alignmentLabel");
align.addEventListener("input",()=>{alignLabel.textContent=labelAlignment(Number(align.value)); if(state.npc){state.npc.alinhamento=`${labelAlignment(Number(align.value))} (${align.value})`; renderNpc(state.npc);}});
document.getElementById("randomizeButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.getElementById("applyButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,state.characteristicData[sexo]); renderNpc(state.npc);});
document.querySelectorAll(".clear-checks").forEach((btn)=>btn.addEventListener("click",()=>{const t=btn.dataset.target; document.querySelectorAll(`#${t} input[type='checkbox']`).forEach((c)=>{c.checked=false;});}));
renderNpc(buildNpcFromForm());
}
init();
