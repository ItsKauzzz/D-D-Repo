const fieldIds = ["nome", "profissao", "cidadeNatal", "antepassado", "classe", "idade", "temperamento", "lealdade"];
const state = { npc: null, data: null, characteristicData: null, cidades: [], cidadeMap: null };

function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }
function populateSelect(id, values) { const s=document.getElementById(id); s.innerHTML=""; values.forEach(v=>{const o=document.createElement("option"); o.value=v;o.textContent=v;s.appendChild(o);}); }
function normalizeType(type){return String(type||"").trim().toLowerCase();}
function isCityOrVillage(type){const t=normalizeType(type); return t.includes("cidade")||t.includes("vila");}
function getCheckedValues(containerId){return [...document.querySelectorAll(`#${containerId} input[type='checkbox']:checked`)].map(i=>i.value);}
function pickFromChecks(containerId,fallback){const vals=getCheckedValues(containerId); return randomFrom(vals.length?vals:fallback);}
function buildCheckList(containerId, values){const root=document.getElementById(containerId); root.innerHTML=""; values.forEach((v,idx)=>{const id=`${containerId}_${idx}`; const row=document.createElement("label"); row.className="check-item"; row.innerHTML=`<input type='checkbox' id='${id}' value='${v}'> ${v}`; root.appendChild(row);});}

function generateAgeForRace(race){const range=state.data.faixaEtariaPorAntepassado[race] || {min:18,max:80}; return String(Math.floor(Math.random()*(range.max-range.min+1))+range.min);}
function generateCharacteristics(pack){const nonNone=pack.caracteristicasExtras.filter(i=>i!=="Nenhuma");const extraCount=Math.random()<0.45?0:(Math.random()<0.8?1:2);const extras=[...new Set(Array.from({length:extraCount},()=>randomFrom(nonNone)))];return{cabelo:`${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,olhos:`${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,rosto:randomFrom(pack.rosto),feicao:randomFrom(pack.feicao),peso:randomFrom(pack.peso),pele:randomFrom(pack.corPele),estruturaCorporal:randomFrom(pack.estruturaCorporal),extras:extras.length?extras.join(", "):"Nenhuma"};}
function rerollSingleCharacteristic(key,pack){return generateCharacteristics(pack)[key]||"";}

function renderCharacteristicsList(c){const el=document.getElementById("caracteristicasValue");el.innerHTML="";const entries=[["cabelo","cabelo"],["olhos","olhos"],["rosto","rosto"],["feição","feicao"],["peso","peso"],["cor da pele","pele"],["estrutura corporal","estruturaCorporal"],["características extras","extras"]];entries.forEach(([label,key])=>{const li=document.createElement("li");li.innerHTML=`<button class='reroll-char' type='button' data-char-key='${key}'>🎲</button> <strong>${label}:</strong> <span class='char-value'>${c[key]}</span>`;el.appendChild(li);});}
function renderNpc(npc){fieldIds.forEach(id=>document.getElementById(`${id}Value`).textContent=npc[id]); renderCharacteristicsList(npc.caracteristicas); document.getElementById("cidadeNatalLink").href=`mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`; state.npc=npc;}

async function loadCityVillageLocations(){const files=await (await fetch("data/locations/index.json")).json(); const entries=await Promise.all(files.map(async f=>{const d=await (await fetch(`data/locations/${f}`)).json(); return {file:String(f).replace(/\.json$/i,""),type:String(d.type||""),nome:String(d.name||""),x:Number(d.x||0),y:Number(d.y||0)};})); return entries.filter(e=>e.nome&&isCityOrVillage(e.type));}
function calculateDistancePercent(a,b){return (Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(8000,5000))*100;}
function getAllowedLocations(all){const selected=document.getElementById("rangeCenterSelect").value;const max=Number(document.getElementById("distanceRange").value||100);const center=all.find(e=>e.nome===selected)||all[0]; if(!center) return []; return all.filter(e=>calculateDistancePercent(center,e)<=max);}
function refreshHometownOptions(){const prev=document.getElementById("cidadeSelect").value; const allowed=getAllowedLocations(state.cidades); populateSelect("cidadeSelect",allowed.map(e=>e.nome)); if(prev&&allowed.some(e=>e.nome===prev))document.getElementById("cidadeSelect").value=prev; return allowed;}

function buildNpcFromForm(){const cidadeNome=document.getElementById("cidadeSelect").value; const cidade=state.cidadeMap.get(cidadeNome); const profile=document.getElementById("generoSelect").value; const antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(state.data.nomes);
 const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado);
 return {nome, profissao:document.getElementById("profissaoSelect").value, cidadeNatal:`${cidade.nome} (${cidade.tipo})`, cidadeFile:cidade.file, antepassado, classe:pickFromChecks("classeChecks",state.data.classes), idade, caracteristicas:generateCharacteristics(state.characteristicData[profile]), temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos), lealdade:pickFromChecks("lealdadeChecks",state.data.lealdades)};}

function rerollField(field){if(!state.npc) return; const profile=document.getElementById("generoSelect").value; const allowed=refreshHometownOptions();
 if(field==="nome") state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(state.data.nomes));
 if(field==="profissao") state.npc.profissao=document.getElementById("profissaoSelect").value;
 if(field==="cidadeNatal"){const pool=allowed.length?allowed:state.cidades; const c=randomFrom(pool); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
 if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
 if(field==="classe") state.npc.classe=pickFromChecks("classeChecks",state.data.classes);
 if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
 if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
 if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
 if(field==="caracteristicas") state.npc.caracteristicas=generateCharacteristics(state.characteristicData[profile]);
 renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations()]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.cidades=cidades.map(e=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map(e=>[e.nome,e]));
 populateSelect("profissaoSelect",state.data.profissoes); populateSelect("rangeCenterSelect",state.cidades.map(c=>c.nome)); refreshHometownOptions();
 buildCheckList("antepassadoChecks",state.data.antepassados); buildCheckList("classeChecks",state.data.classes); buildCheckList("temperamentoChecks",state.data.temperamentos); buildCheckList("lealdadeChecks",state.data.lealdades);
 const updateRange=()=>{document.getElementById("distanceValue").textContent=document.getElementById("distanceRange").value; refreshHometownOptions();};
 document.getElementById("distanceRange").addEventListener("input",updateRange); document.getElementById("rangeCenterSelect").addEventListener("change",updateRange);
 document.getElementById("randomizeButton").addEventListener("click",()=>{const allowed=refreshHometownOptions(); const pool=allowed.length?allowed:state.cidades; document.getElementById("cidadeSelect").value=randomFrom(pool).nome; document.getElementById("profissaoSelect").value=randomFrom(state.data.profissoes); document.getElementById("generoSelect").value=randomFrom(["homens","mulheres","androgenos"]); renderNpc(buildNpcFromForm());});
 document.getElementById("applyButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
 document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
 document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const pack=state.characteristicData[document.getElementById("generoSelect").value]; state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,pack); renderNpc(state.npc);});
 renderNpc(buildNpcFromForm());
}
init();
