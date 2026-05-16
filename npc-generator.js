const fieldIds = ["nome", "profissao", "cidadeNatal", "antepassado", "classe", "idade", "temperamento", "lealdade", "alinhamento"];
const state = { npc: null, data: null, characteristicData: null, cidades: [], cidadeMap: null };

const attrs = ["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma"];

function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }
function populateSelect(id, values) { const s=document.getElementById(id); s.innerHTML=""; values.forEach(v=>{const o=document.createElement("option"); o.value=v;o.textContent=v;s.appendChild(o);}); }
function normalizeType(type){return String(type||"").trim().toLowerCase();}
function isCityOrVillage(type){const t=normalizeType(type); return t.includes("cidade")||t.includes("vila");}
function getCheckedValues(containerId){return [...document.querySelectorAll(`#${containerId} input[type='checkbox']:checked`)].map(i=>i.value);}
function pickFromChecks(containerId,fallback){const vals=getCheckedValues(containerId); return randomFrom(vals.length?vals:fallback);}
function buildCheckList(containerId, values){const root=document.getElementById(containerId); root.innerHTML=""; values.forEach((v,idx)=>{const id=`${containerId}_${idx}`; const row=document.createElement("label"); row.className="check-item"; row.htmlFor=id; row.innerHTML=`<input type='checkbox' id='${id}' value='${v}'> ${v}`; root.appendChild(row);});}
function labelAlignment(v){ if(v<-25) return "BOM"; if(v>25) return "MAL"; return "Neutro"; }

function generateAgeForRace(race){const range=state.data.faixaEtariaPorAntepassado[race] || {min:18,max:80}; return String(Math.floor(Math.random()*(range.max-range.min+1))+range.min);}
function randomAttr(){ return Math.floor(Math.random()*16)+3; }
function generateSheet(){ return {forca:randomAttr(),destreza:randomAttr(),constituicao:randomAttr(),inteligencia:randomAttr(),sabedoria:randomAttr(),carisma:randomAttr()}; }
function generateCharacteristics(pack){const nonNone=pack.caracteristicasExtras.filter(i=>i!=="Nenhuma");const extraCount=Math.random()<0.45?0:(Math.random()<0.8?1:2);const extras=[...new Set(Array.from({length:extraCount},()=>randomFrom(nonNone)))];return{cabelo:`${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,olhos:`${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,rosto:randomFrom(pack.rosto),feicao:randomFrom(pack.feicao),peso:randomFrom(pack.peso),pele:randomFrom(pack.corPele),estruturaCorporal:randomFrom(pack.estruturaCorporal),extras:extras.length?extras.join(", "):"Nenhuma"};}
function rerollSingleCharacteristic(key,pack){return generateCharacteristics(pack)[key]||"";}

function renderCharacteristicsList(c){const el=document.getElementById("caracteristicasValue");el.innerHTML="";const entries=[["cabelo","cabelo"],["olhos","olhos"],["rosto","rosto"],["feição","feicao"],["peso","peso"],["cor da pele","pele"],["estrutura corporal","estruturaCorporal"],["características extras","extras"]];entries.forEach(([label,key])=>{const li=document.createElement("li");li.innerHTML=`<button class='reroll-char' type='button' data-char-key='${key}'>🎲</button> <strong>${label}:</strong> <span class='char-value'>${c[key]}</span>`;el.appendChild(li);});}
function renderSheet(sheet){attrs.forEach((k)=>{document.getElementById(`${k}Value`).textContent = sheet[k];});}
function renderNpc(npc){fieldIds.forEach(id=>{const el=document.getElementById(`${id}Value`); if(el) el.textContent=npc[id];}); renderCharacteristicsList(npc.caracteristicas); renderSheet(npc.ficha); document.getElementById("cidadeNatalLink").href=`mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`; state.npc=npc;}

async function loadCityVillageLocations(){const files=await (await fetch("data/locations/index.json")).json(); const entries=await Promise.all(files.map(async f=>{const d=await (await fetch(`data/locations/${f}`)).json(); return {file:String(f).replace(/\.json$/i,""),type:String(d.type||""),nome:String(d.name||""),x:Number(d.x||0),y:Number(d.y||0)};})); return entries.filter(e=>e.nome&&isCityOrVillage(e.type));}
function calculateDistancePercent(a,b){return (Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(8000,5000))*100;}
function getAllowedLocations(all){const selected=document.getElementById("rangeCenterSelect").value;const max=Number(document.getElementById("distanceRange").value||100);const center=all.find(e=>e.nome===selected)||all[0]; if(!center) return []; return all.filter(e=>calculateDistancePercent(center,e)<=max);}
function refreshHometownChecks(){const allowed=getAllowedLocations(state.cidades); buildCheckList("cidadeChecks", allowed.map(e=>e.nome)); return allowed;}

function buildNpcFromForm(){const allowed = getAllowedLocations(state.cidades); const cidadeNome=pickFromChecks("cidadeChecks", (allowed.length?allowed:state.cidades).map(c=>c.nome)); const cidade=state.cidadeMap.get(cidadeNome) || state.cidades[0]; const profile=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(state.data.nomes);
 const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado);
 const alignVal = Number(document.getElementById("alignmentRange").value || 0);
 return {nome, profissao:pickFromChecks("profissaoChecks", state.data.profissoes), cidadeNatal:`${cidade.nome} (${cidade.tipo})`, cidadeFile:cidade.file, antepassado, classe:pickFromChecks("classeChecks",state.data.classes), idade, caracteristicas:generateCharacteristics(state.characteristicData[profile]), temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos), lealdade:pickFromChecks("lealdadeChecks",state.data.lealdades), alinhamento: `${labelAlignment(alignVal)} (${alignVal})`, ficha: generateSheet()};}

function rerollField(field){if(!state.npc) return; const profile=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const allowed=getAllowedLocations(state.cidades);
 if(field==="nome") state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(state.data.nomes));
 if(field==="profissao") state.npc.profissao=pickFromChecks("profissaoChecks", state.data.profissoes);
 if(field==="cidadeNatal"){const pool=(allowed.length?allowed:state.cidades).map(c=>c.nome); const c=state.cidadeMap.get(randomFrom(pool)); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
 if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
 if(field==="classe") state.npc.classe=pickFromChecks("classeChecks",state.data.classes);
 if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
 if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
 if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
 if(field==="alinhamento"){const v=Number(document.getElementById("alignmentRange").value||0); state.npc.alinhamento=`${labelAlignment(v)} (${v})`;}
 if(field==="caracteristicas") state.npc.caracteristicas=generateCharacteristics(state.characteristicData[profile]);
 renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations()]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.cidades=cidades.map(e=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map(e=>[e.nome,e]));
 populateSelect("rangeCenterSelect",state.cidades.map(c=>c.nome));
 buildCheckList("profissaoChecks",state.data.profissoes); buildCheckList("antepassadoChecks",state.data.antepassados); buildCheckList("classeChecks",state.data.classes); buildCheckList("temperamentoChecks",state.data.temperamentos); buildCheckList("lealdadeChecks",state.data.lealdades); buildCheckList("sexoChecks", ["homens","mulheres","androgenos"]);
 refreshHometownChecks();
 const updateRange=()=>{document.getElementById("distanceValue").textContent=document.getElementById("distanceRange").value; refreshHometownChecks();};
 document.getElementById("distanceRange").addEventListener("input",updateRange); document.getElementById("rangeCenterSelect").addEventListener("change",updateRange);
 const align=document.getElementById("alignmentRange"); const alignLabel=document.getElementById("alignmentLabel");
 align.addEventListener("input",()=>{alignLabel.textContent=labelAlignment(Number(align.value)); if(state.npc){state.npc.alinhamento=`${labelAlignment(Number(align.value))} (${align.value})`; renderNpc(state.npc);}});
 document.getElementById("randomizeButton").addEventListener("click",()=>{refreshHometownChecks(); renderNpc(buildNpcFromForm());});
 document.getElementById("applyButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
 document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
 document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const profile=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const pack=state.characteristicData[profile]; state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,pack); renderNpc(state.npc);});
 renderNpc(buildNpcFromForm());
}
init();
