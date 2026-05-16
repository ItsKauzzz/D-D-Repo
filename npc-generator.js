const fieldIds = ["nome","sobrenome","profissao","cidadeNatal","sexo","antepassado","classe","level","idade","temperamento","lealdade"];
const attrs = ["forca","destreza","constituicao","inteligencia","sabedoria","carisma"];
const state = { npc:null, data:null, characteristicData:null, cidades:[], cidadeMap:null, locations:[], backgrounds:[], equipmentPool:[], itemPool:[], classProfiles:{} };

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
const classAttributePriority = {
  "Bardo": ["carisma", "destreza", "constituicao", "inteligencia", "sabedoria", "forca"],
  "Bruxo": ["carisma", "constituicao", "destreza", "sabedoria", "inteligencia", "forca"],
  "Bárbaro": ["forca", "constituicao", "destreza", "sabedoria", "carisma", "inteligencia"],
  "Clérigo": ["sabedoria", "constituicao", "forca", "carisma", "destreza", "inteligencia"],
  "Druida": ["sabedoria", "constituicao", "destreza", "inteligencia", "carisma", "forca"],
  "Feiticeiro": ["carisma", "constituicao", "destreza", "sabedoria", "inteligencia", "forca"],
  "Guerreiro": ["forca", "constituicao", "destreza", "sabedoria", "carisma", "inteligencia"],
  "Ladino": ["destreza", "inteligencia", "constituicao", "carisma", "sabedoria", "forca"],
  "Mago": ["inteligencia", "constituicao", "destreza", "sabedoria", "carisma", "forca"],
  "Monge": ["destreza", "sabedoria", "constituicao", "forca", "inteligencia", "carisma"],
  "Paladino": ["forca", "carisma", "constituicao", "sabedoria", "destreza", "inteligencia"],
  "Patrulheiro": ["destreza", "sabedoria", "constituicao", "forca", "inteligencia", "carisma"]
};
const standardArray = [15,14,13,12,10,8];
const levelTiers = [
  { min: 1, max: 4, profBonus: 2, skillMin: 1, skillMax: 2, tier: "comum", tags: ["Equipamentos simples", "1 ferramenta ou idioma extra"] },
  { min: 5, max: 8, profBonus: 3, skillMin: 3, skillMax: 4, tier: "treinado", tags: ["Pequeno talento ou habilidade especial", "Equipamentos melhores"] },
  { min: 9, max: 12, profBonus: 4, skillMin: 5, skillMax: 6, tier: "elite", tags: ["Item raro ou habilidade avançada", "Maior variedade de equipamentos"] },
  { min: 13, max: 16, profBonus: 5, skillMin: 7, skillMax: 8, tier: "elite", tags: ["Magia avançada, resistência ou habilidade única", "Equipamentos de elite"] },
  { min: 17, max: 20, profBonus: 6, skillMin: 9, skillMax: 11, tier: "lendario", tags: ["Múltiplas habilidades especiais", "Equipamentos lendários"] }
];
const tierArrays = {
  comum: [13,12,11,10,9,8],
  treinado: [15,14,13,12,11,10],
  elite: [18,16,15,14,13,12],
  lendario: [20,18,17,16,15,14]
};
function getLevelTier(level){ return levelTiers.find((t)=>level>=t.min&&level<=t.max) || levelTiers[0]; }
const getClassAccuracy = () => Number(document.getElementById("classAccurateRange")?.value || 50) / 100;
function generateSheet(characterClass, level){
  const tier = getLevelTier(level);
  const profile = getClassProfile(characterClass).preferredAttributes || {};
  const fallback = classAttributePriority[characterClass] || attrs;
  const prioritized = [...(profile.primary || []), ...(profile.secondary || [])];
  const orderedAttrs = [...new Set([...prioritized, ...fallback, ...attrs])];
  const base = tierArrays[tier.tier] || standardArray;
  const spread = [...base].sort((a,b)=>b-a);
  const accuracy = getClassAccuracy();
  if (accuracy < 1) {
    const shuffleMoves = Math.floor((1 - accuracy) * spread.length);
    for(let i=0;i<shuffleMoves;i++){ const a=Math.floor(Math.random()*spread.length); const b=Math.floor(Math.random()*spread.length); [spread[a],spread[b]]=[spread[b],spread[a]]; }
  }
  const sheet = {};
  orderedAttrs.forEach((attr, idx)=>{sheet[attr]=spread[idx];});
  return sheet;
}
const toModifier = (value) => Math.floor((Number(value) - 10) / 2);
function generateCharacteristics(pack){const nonNone=pack.caracteristicasExtras.filter(i=>i!=="Nenhuma");const n=Math.random()<0.45?0:(Math.random()<0.8?1:2);const extras=[...new Set(Array.from({length:n},()=>randomFrom(nonNone)))];return{cabelo:`${randomFrom(pack.cabelosComprimento)} ${randomFrom(pack.corCabelos)}`,olhos:`${randomFrom(pack.olhos)} (${randomFrom(pack.corOlhos)})`,rosto:randomFrom(pack.rosto),feicao:randomFrom(pack.feicao),peso:randomFrom(pack.peso),pele:randomFrom(pack.corPele),estruturaCorporal:randomFrom(pack.estruturaCorporal),extras:extras.length?extras.join(", "):"Nenhuma"};}
function rerollSingleCharacteristic(key,pack){return generateCharacteristics(pack)[key]||"";}

function renderCharacteristicsList(c){const el=document.getElementById("caracteristicasValue");el.innerHTML="";[["cabelo","cabelo"],["olhos","olhos"],["rosto","rosto"],["feição","feicao"],["peso","peso"],["cor da pele","pele"],["estrutura corporal","estruturaCorporal"],["características extras","extras"]].forEach(([label,key])=>{const li=document.createElement("li");li.innerHTML=`<button class='reroll-char' type='button' data-char-key='${key}'>🎲</button> <strong>${label}:</strong> <span class='char-value'>${c[key]}</span>`;el.appendChild(li);});}
function renderSimpleList(id, items){const el=document.getElementById(id); if(!el) return; el.innerHTML=""; (items||[]).forEach((item)=>{const li=document.createElement("li"); li.textContent=item; el.appendChild(li);});}
const skillToAttr = {
  "Acrobacia": "destreza",
  "Arcanismo": "inteligencia",
  "Atletismo": "forca",
  "Atuação": "carisma",
  "Enganação": "carisma",
  "Furtividade": "destreza",
  "História": "inteligencia",
  "Intimidação": "carisma",
  "Intuição": "sabedoria",
  "Investigação": "inteligencia",
  "Lidar com Animais": "sabedoria",
  "Medicina": "sabedoria",
  "Natureza": "inteligencia",
  "Percepção": "sabedoria",
  "Persuasão": "carisma",
  "Prestidigitação": "destreza",
  "Religião": "inteligencia",
  "Sobrevivência": "sabedoria"
};
function renderSkillList(id, skills, profBonus, sheet){
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = "";
  dndSkills.forEach((skill)=>{
    const attrKey = skillToAttr[skill] || "sabedoria";
    const attrMod = toModifier(sheet?.[attrKey] || 10);
    const isProficient = (skills||[]).includes(skill);
    const total = attrMod + (isProficient ? Number(profBonus || 2) : 0);
    const li=document.createElement("li");
    li.innerHTML = `<div class="skill-roll-row ${isProficient ? "" : "skill-not-proficient"}"><span>${skill} (${attrKey.toUpperCase()} ${attrMod >= 0 ? "+" : ""}${attrMod} + PROF ${isProficient ? (profBonus >= 0 ? "+" : "") + profBonus : "+0"} = <span class="skill-total-mod">${total >= 0 ? "+" : ""}${total}</span>)</span><button class="skill-roll-btn" data-skill-mod="${total}" type="button">🎲</button><span class="skill-roll-result"></span></div>`;
    el.appendChild(li);
  });
}
function renderSheet(sheet){attrs.forEach((k)=>{document.getElementById(`${k}Value`).textContent = sheet[k]; const mod = toModifier(sheet[k]); document.getElementById(`${k}Mod`).textContent = `MOD ${mod >= 0 ? "+" : ""}${mod}`;});}
function renderNpc(npc){
fieldIds.forEach((id)=>{const el=document.getElementById(`${id}Value`); if(el) el.textContent=npc[id]||"";});
document.getElementById("sheetClassValue").textContent = npc.classe || "";
document.getElementById("sheetLevelValue").textContent = npc.level || "";
document.getElementById("sheetProfBonusValue").textContent = `+${npc.proficiencyBonus || 2}`;
document.getElementById("sheetAcValue").textContent = String(npc.ca ?? 10);
renderCharacteristicsList(npc.caracteristicas);
renderSkillList("proficienciasSkillsValue", npc.proficienciasSkills, npc.proficiencyBonus, npc.ficha);
renderSimpleList("proficienciasGeraisValue", npc.proficienciasGerais);
renderSimpleList("equipamentosValue", npc.equipamentos);
renderSimpleList("itensValue", npc.itens);
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
const dndSkills = ["Acrobacia","Arcanismo","Atletismo","Atuação","Enganação","Furtividade","História","Intimidação","Intuição","Investigação","Lidar com Animais","Medicina","Natureza","Percepção","Persuasão","Prestidigitação","Religião","Sobrevivência"];
const skillBuckets = {
  marciais: ["Atletismo","Acrobacia","Sobrevivência","Intimidação"],
  magicas: ["Arcanismo","Religião","História","Intuição"],
  sociais: ["Persuasão","Enganação","Atuação"],
  furtivas: ["Furtividade","Prestidigitação","Investigação"]
};
const getClassProfile = (classe) => state.classProfiles?.[classe] || {};
const armorBaseAc = {
  "Acolchoada": 11, "Couro": 11, "Couro batido": 12,
  "Camisa de malha": 13, "Cota de escamas": 14, "Gibão de peles": 12, "Meia armadura": 15, "Peitoral": 14,
  "Cota de anéis": 14, "Cota de malha": 16, "Splint": 17, "Placas": 18
};
function randomSample(list, n){const pool=[...list]; const out=[]; while(pool.length && out.length<n){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out;}
function flattenPool(data, rootKey){const root = data?.[rootKey] || {}; return Object.values(root).flat().filter(Boolean);}
function getInventoryCategory(data, rootKey, category){return (data?.[rootKey]?.[category] || []).filter(Boolean);}
function getLevelRange(){const minInput = Number(document.getElementById("levelMinInput").value || 1); const maxInput = Number(document.getElementById("levelMaxInput").value || 20); const low = Math.max(1, Math.min(minInput, maxInput)); const high = Math.min(20, Math.max(minInput, maxInput)); return {low,high};}
function buildProficiencias(classe, level){
  const tier = getLevelTier(level);
  const base = getClassProfile(classe).generalProficiencies || [];
  const affinity = (getClassProfile(classe).skillBuckets || []).flatMap((k)=>skillBuckets[k] || []);
  const accuracy = Number(document.getElementById("classAccurateRange")?.value || 50) / 100;
  const favoredCount = Math.round(accuracy * tier.skillMax);
  const preferred = [...new Set([...affinity, ...dndSkills])];
  const skillCount = Math.floor(Math.random() * (tier.skillMax - tier.skillMin + 1)) + tier.skillMin;
  const favoredSkills = randomSample(preferred, Math.min(favoredCount, skillCount));
  const remainder = randomSample(dndSkills.filter((s)=>!favoredSkills.includes(s)), Math.max(0, skillCount - favoredSkills.length));
  return { gerais: base, skills: [...favoredSkills, ...remainder] };
}
function buildLoadout(classe, inventoryData){
  const pref = getClassProfile(classe).equipPreference || { armor: null, shield: false, melee: true, ranged: true };
  const armorPool = pref.armor ? getInventoryCategory(inventoryData, "Equipamentos", pref.armor) : [];
  const shieldPool = getInventoryCategory(inventoryData, "Equipamentos", "Escudos");
  const meleePool = getInventoryCategory(inventoryData, "Equipamentos", "Armas corpo a corpo");
  const rangedPool = getInventoryCategory(inventoryData, "Equipamentos", "Armas a distância");
  const focusPool = getInventoryCategory(inventoryData, "Equipamentos", "Focos mágicos");
  const equipped = [];
  const equippedArmor = armorPool.length && Math.random() < 0.85 ? randomFrom(armorPool) : null;
  const equippedShield = pref.shield && shieldPool.length && Math.random() < 0.6 ? randomFrom(shieldPool) : null;
  const equippedMelee = pref.melee && meleePool.length && Math.random() < 0.75 ? randomFrom(meleePool) : null;
  const equippedRanged = pref.ranged && rangedPool.length && Math.random() < 0.75 ? randomFrom(rangedPool) : null;
  if (equippedArmor) equipped.push(`Armadura: ${equippedArmor}`);
  if (equippedShield) equipped.push(`Escudo: ${equippedShield}`);
  if (equippedMelee) equipped.push(`Melee: ${equippedMelee}`);
  if (equippedRanged) equipped.push(`Ranged: ${equippedRanged}`);
  if (pref.magicalFocus && focusPool.length && Math.random() < 0.85) equipped.push(`Foco mágico: ${randomFrom(focusPool)}`);
  if (!equippedMelee && !equippedRanged) equipped.push("Melee: Adaga");
  return { equippedArmor, equippedShield: Boolean(equippedShield), equipped };
}
function calculateAc(sheet, loadout){
  const dexMod = toModifier(sheet.destreza || 10);
  const armor = loadout?.equippedArmor;
  if (!armor) return 10 + dexMod;
  const base = armorBaseAc[armor] || 10;
  const isMedium = ["Camisa de malha","Cota de escamas","Gibão de peles","Meia armadura","Peitoral"].includes(armor);
  const isHeavy = ["Cota de anéis","Cota de malha","Splint","Placas"].includes(armor);
  let ac = base + (isHeavy ? 0 : (isMedium ? Math.min(2, dexMod) : dexMod));
  if (loadout?.equippedShield) ac += 2;
  return ac;
}

function buildNpcFromForm(){const allowed=getAllowedLocations(state.cidades); const cidadeNome=pickFromChecks("cidadeChecks", (allowed.length?allowed:state.cidades).map((c)=>c.nome)); const cidade=state.cidadeMap.get(cidadeNome)||state.cidades[0]; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const antepassado=pickFromChecks("antepassadoChecks", state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(getNamePoolBySexo(sexo)); const sobrenome=randomFrom(state.data.sobrenomes); const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado); const alignVal=Number(document.getElementById("alignmentRange").value||0) * -1;
const classe = pickFromChecks("classeChecks",state.data.classes);
const {low,high} = getLevelRange();
const level = Math.floor(Math.random() * (high - low + 1)) + low;
const tier = getLevelTier(level);
const equipCount = tier.min >= 13 ? 7 : (tier.min >= 9 ? 6 : (tier.min >= 5 ? 5 : 4));
const itemCount = tier.min >= 13 ? 8 : (tier.min >= 9 ? 7 : (tier.min >= 5 ? 6 : 5));
const profs = buildProficiencias(classe, level);
const ficha = generateSheet(classe, level);
const loadout = buildLoadout(classe, state.equipmentData || {});
const npc = {nome,sobrenome,profissao:pickFromChecks("profissaoChecks",state.data.profissoes),cidadeNatal:`${cidade.nome} (${cidade.tipo})`,cidadeFile:cidade.file,sexo,antepassado,classe,level,idade,proficiencyBonus:tier.profBonus,ca:calculateAc(ficha, loadout),caracteristicas:generateCharacteristics(state.characteristicData[sexo]),temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos),lealdade:pickLealdadeByAlignment(alignVal),ficha,proficienciasGerais:profs.gerais,proficienciasSkills:profs.skills,equipamentos:loadout.equipped,itens:randomSample(state.itemPool, itemCount)};
npc.background = buildBackground(npc);
return npc;}

function rerollField(field){if(!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const allowed=getAllowedLocations(state.cidades);
if(field==="nome"){ state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.sobrenome=randomFrom(state.data.sobrenomes); }
if(field==="profissao") state.npc.profissao=pickFromChecks("profissaoChecks", state.data.profissoes);
if(field==="cidadeNatal"){const pool=(allowed.length?allowed:state.cidades).map((c)=>c.nome); const c=state.cidadeMap.get(randomFrom(pool)); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
if(field==="sexo") { state.npc.sexo=sexo; state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.caracteristicas=generateCharacteristics(state.characteristicData[sexo]); }
if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
if(field==="classe") { state.npc.classe=pickFromChecks("classeChecks",state.data.classes); state.npc.ficha=generateSheet(state.npc.classe, state.npc.level); const p=buildProficiencias(state.npc.classe, state.npc.level); state.npc.proficienciasGerais=p.gerais; state.npc.proficienciasSkills=p.skills; }
if(field==="level"){const {low,high} = getLevelRange(); state.npc.level = Math.floor(Math.random() * (high - low + 1)) + low; const tier=getLevelTier(state.npc.level); state.npc.proficiencyBonus=tier.profBonus; state.npc.ficha=generateSheet(state.npc.classe, state.npc.level); const p=buildProficiencias(state.npc.classe, state.npc.level); state.npc.proficienciasGerais=p.gerais; state.npc.proficienciasSkills=p.skills;}
if(field==="profissao"){const tier=getLevelTier(state.npc.level); const itemCount = tier.min >= 13 ? 8 : (tier.min >= 9 ? 7 : (tier.min >= 5 ? 6 : 5)); const loadout = buildLoadout(state.npc.classe, state.equipmentData || {}); state.npc.equipamentos=loadout.equipped; state.npc.ca=calculateAc(state.npc.ficha, loadout); state.npc.itens=randomSample(state.itemPool, itemCount);}
if(field==="classe"||field==="level"){const loadout = buildLoadout(state.npc.classe, state.equipmentData || {}); state.npc.equipamentos=loadout.equipped; state.npc.ca=calculateAc(state.npc.ficha, loadout);}
if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
if(field==="alinhamento"){const v=Number(document.getElementById("alignmentRange").value||0) * -1; state.npc.lealdade=pickLealdadeByAlignment(v);}
state.npc.background = buildBackground(state.npc);
renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades,locations,backgroundRes,equipmentRes,itemRes,classProfilesRes]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations(),loadLocations(),fetch("./data/backgrounds.json"),fetch("./data/inventory/equipment.json"),fetch("./data/inventory/itens.json"),fetch("./data/class-profiles.json")]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.locations=locations.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.backgrounds=(await backgroundRes.json()).templates.map((t)=>String(t.text||"")).filter(Boolean); state.cidades=cidades.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map((e)=>[e.nome,e])); state.equipmentData=await equipmentRes.json(); state.itemPool=flattenPool(await itemRes.json(), "Itens"); state.equipmentPool=flattenPool(state.equipmentData, "Equipamentos"); state.classProfiles=await classProfilesRes.json();
populateSelect("rangeCenterSelect",state.cidades.map((c)=>c.nome).sort((a,b)=>a.localeCompare(b, "pt-BR")));
buildCheckList("profissaoChecks",state.data.profissoes); buildCheckList("antepassadoChecks",state.data.antepassados); buildCheckList("classeChecks",state.data.classes); buildCheckList("temperamentoChecks",state.data.temperamentos); buildCheckList("lealdadeChecks",state.data.lealdades); buildCheckList("sexoChecks", ["homens","mulheres","androgenos"]);
refreshHometownChecks();
const updateRange=()=>{document.getElementById("distanceValue").textContent=document.getElementById("distanceRange").value; refreshHometownChecks();};
document.getElementById("distanceRange").addEventListener("input",updateRange); document.getElementById("rangeCenterSelect").addEventListener("change",updateRange);
const align=document.getElementById("alignmentRange"); const alignLabel=document.getElementById("alignmentLabel");
const classAccurate=document.getElementById("classAccurateRange"); const classAccurateValue=document.getElementById("classAccurateValue");
classAccurate.addEventListener("input",()=>{classAccurateValue.textContent=classAccurate.value;});
const levelMinRange=document.getElementById("levelMinInput");
const levelMaxRange=document.getElementById("levelMaxInput");
const levelMinValue=document.getElementById("levelMinValue");
const levelMaxValue=document.getElementById("levelMaxValue");
const syncLevelLabels = ()=>{levelMinValue.textContent = levelMinRange.value; levelMaxValue.textContent = levelMaxRange.value;};
levelMinRange.addEventListener("input",syncLevelLabels);
levelMaxRange.addEventListener("input",syncLevelLabels);
syncLevelLabels();
align.addEventListener("input",()=>{alignLabel.textContent=labelAlignment(Number(align.value)); if(state.npc){state.npc.lealdade=pickLealdadeByAlignment(Number(align.value) * -1); renderNpc(state.npc);}});
document.getElementById("randomizeButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.getElementById("applyButton").addEventListener("click",()=>renderNpc(buildNpcFromForm()));
document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,state.characteristicData[sexo]); renderNpc(state.npc);});
document.getElementById("proficienciasSkillsValue").addEventListener("click",(e)=>{const b=e.target.closest(".skill-roll-btn"); if(!b) return; const mod=Number(b.dataset.skillMod||0); const roll=Math.floor(Math.random()*20)+1; const total=roll+mod; const out=b.parentElement.querySelector(".skill-roll-result"); if(out) out.textContent=`${roll} ${mod>=0?'+':''}${mod} = ${total}`;});
document.querySelectorAll(".clear-checks").forEach((btn)=>btn.addEventListener("click",()=>{const t=btn.dataset.target; document.querySelectorAll(`#${t} input[type='checkbox']`).forEach((c)=>{c.checked=false;});}));
renderNpc(buildNpcFromForm());
}
init();
