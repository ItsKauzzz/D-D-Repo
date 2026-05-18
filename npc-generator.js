const fieldIds = ["nome","sobrenome","profissao","cidadeNatal","sexo","antepassado","classe","level","idade","temperamento","lealdade"];
const attrs = ["forca","destreza","constituicao","inteligencia","sabedoria","carisma"];
const state = { npc:null, data:null, characteristicData:null, cidades:[], cidadeMap:null, locations:[], backgrounds:[], equipmentPool:[], itemPool:[], classProfiles:{}, classSpells:{}, classFeatures:{}, spellDescriptions:{} };

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
  comum: [12,11,10,10,9,8],
  treinado: [14,13,12,11,10,9],
  elite: [16,15,14,13,12,10],
  lendario: [18,17,16,15,13,12]
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
function renderItemsList(id, items){
  const el=document.getElementById(id); if(!el) return; el.innerHTML="";
  (items||[]).forEach((item)=>{
    const li=document.createElement("li");
    li.textContent = item;
    if(String(item).includes("[RARO]")) li.classList.add("rare-item");
    el.appendChild(li);
  });
}
function renderFeatureList(id, items){
  const el=document.getElementById(id); if(!el) return; el.innerHTML="";
  (items||[]).forEach((item)=>{
    const li=document.createElement("li");
    if(typeof item === "string"){ li.textContent=item; }
    else { li.innerHTML = `<strong>${item.titulo}</strong><span class="feature-desc">${item.descricao}</span>`; }
    el.appendChild(li);
  });
}
function renderSpellList(id, items){
  const el=document.getElementById(id); if(!el) return; el.innerHTML="";
  (items||[]).forEach((item)=>{
    const li=document.createElement("li");
    const match = String(item).match(/^([^:]+:\s*)?(.*)$/);
    const prefix = match?.[1] || "";
    const spellName = (match?.[2] || String(item)).trim();
    const desc = state.spellDescriptions[spellName] || "Descrição curta indisponível para esta magia.";
    li.innerHTML = `<strong>${prefix}${spellName}</strong><span class="feature-desc">${desc}</span>`;
    el.appendChild(li);
  });
}
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
function renderFamily(familia){
  const el = document.getElementById("familiaValue");
  if(!el) return;
  if(!familia){ el.innerHTML = ""; return; }
  const filhos = (familia.filhos||[]).length ? familia.filhos.join(", ") : "Nenhum";
  el.innerHTML = `
    <div class="family-compact-row"><strong>Mãe:</strong> <span>${familia.mae || "-"} <em>(${familia.profissaoMae || "sem profissão"})</em></span></div>
    <div class="family-compact-row"><strong>Pai:</strong> <span>${familia.pai || "-"} <em>(${familia.profissaoPai || "sem profissão"})</em></span></div>
    <div class="family-compact-row"><strong>Filhos:</strong> <span>${filhos}</span></div>
  `;
}
function renderNpc(npc){
fieldIds.forEach((id)=>{const el=document.getElementById(`${id}Value`); if(el) el.textContent=npc[id]||"";});
document.getElementById("sheetClassValue").textContent = npc.classe || "";
document.getElementById("sheetLevelValue").textContent = npc.level || "";
document.getElementById("sheetProfBonusValue").textContent = `+${npc.proficiencyBonus || 2}`;
document.getElementById("sheetAcValue").textContent = String(npc.ca ?? 10);
document.getElementById("sheetHpValue").textContent = String(npc.vida ?? 1);
renderCharacteristicsList(npc.caracteristicas);
renderSkillList("proficienciasSkillsValue", npc.proficienciasSkills, npc.proficiencyBonus, npc.ficha);
renderSimpleList("proficienciasGeraisValue", npc.proficienciasGerais);
renderSimpleList("equipamentosValue", npc.equipamentos);
renderItemsList("itensValue", npc.itens);
renderSpellList("magiasValue", npc.magias);
renderFeatureList("habilidadesClasseValue", npc.habilidadesClasse);
renderFamily(npc.familia);
renderSheet(npc.ficha);
document.getElementById("cidadeNatalLink").href=`mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}`;
const bgEl = document.getElementById("backgroundValue");
if (bgEl) bgEl.innerHTML = npc.background || "";
state.npc=npc;
}

function generateFamily(npcSexo, antepassado){
  const makeName = (sexo, forcedLastName = '') => {
    const first = randomFrom(getNamePoolBySexo(sexo));
    const last = forcedLastName || randomFrom(state.data.sobrenomes || ["SemSobrenome"]);
    return `${first} ${last}`.trim();
  };
  const familyLastName = randomFrom(state.data.sobrenomes || ["SemSobrenome"]);
  const motherUsesDifferentLastName = Math.random() < 0.55;
  const mae = motherUsesDifferentLastName ? makeName("mulheres") : makeName("mulheres", familyLastName);
  const pai = makeName("homens", familyLastName);
  const raceAge = state.data.faixaEtariaPorAntepassado?.[antepassado] || { min: 18, max: 80 };
  const childCount = Math.floor(Math.random() * 4);
  const profissaoMae = randomFrom(state.data.profissoes || ["Trabalhadora local"]);
  const profissaoPai = randomFrom(state.data.profissoes || ["Trabalhador local"]);
  const filhos = Array.from({length: childCount}, () => {
    const sexo = randomFrom(["homens","mulheres","androgenos"]);
    const childAgeMax = Math.max(4, Math.floor((raceAge.max - raceAge.min) * 0.3));
    const idade = Math.floor(Math.random() * childAgeMax) + 1;
    const nome = makeName(sexo, familyLastName);
    return `${nome} (${idade})`;
  });
  return { mae, pai, filhos, profissaoMae, profissaoPai };
}

function exportNpcAsPdf(){
  if(!state.npc){ alert("Gere um NPC antes de exportar."); return; }
  window.print();
}

function exportNpcToNotekeeper(){
  if(!state.npc){ alert("Gere um NPC antes de exportar."); return; }
  const npc = state.npc;
  const pageTitle = `${npc.nome} ${npc.sobrenome}`.trim();
  const list = (items) => `<ul>${(items||[]).map((item)=>`<li>${item}</li>`).join("")}</ul>`;
  const content = `
    <h1>${pageTitle}</h1>
    <p><strong>Classe:</strong> ${npc.classe} · <strong>Nível:</strong> ${npc.level} · <strong>Local:</strong> <a href="../mapa.html?focus=${encodeURIComponent(npc.cidadeFile)}" target="_blank" rel="noopener">${npc.cidadeNatal}</a></p>
    <p><strong>Profissão:</strong> ${npc.profissao} · <strong>Sexo:</strong> ${npc.sexo} · <strong>Antepassado:</strong> ${npc.antepassado}</p>
    <p><strong>Idade:</strong> ${npc.idade} · <strong>Temperamento:</strong> ${npc.temperamento} · <strong>Lealdade:</strong> ${npc.lealdade}</p>
    <h2>Background</h2>
    <p>${npc.background || ""}</p>
    <h2>Equipamentos</h2>${list(npc.equipamentos)}
    <h2>Itens</h2>${list(npc.itens)}
    <h2>Magias</h2>${list(npc.magias)}
  `;
  const payload = {
    app: 'NoteKeeper',
    version: 5,
    exportedAt: new Date().toISOString(),
    page: {
      id: crypto.randomUUID(),
      title: pageTitle || 'NPC',
      content,
      plainText: `${pageTitle} ${npc.classe} ${npc.level}`.trim(),
      anchors: [],
      sectionId: null
    }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(pageTitle || 'npc').toLowerCase().replace(/\s+/g, '-')}-notekeeper.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  magicas: ["Arcanismo","Religião","História","Intuição","Natureza"],
  sociais: ["Persuasão","Enganação","Atuação"],
  furtivas: ["Furtividade","Prestidigitação","Investigação"]
};
const classSignatureSkills = {
  "Bárbaro": ["Atletismo","Sobrevivência","Intimidação","Percepção"],
  "Bardo": ["Atuação","Persuasão","Enganação","Intuição"],
  "Bruxo": ["Enganação","Arcanismo","Intimidação","Investigação"],
  "Clérigo": ["Religião","Intuição","Medicina","História"],
  "Druida": ["Natureza","Lidar com Animais","Sobrevivência","Medicina"],
  "Feiticeiro": ["Arcanismo","Persuasão","Enganação","Intimidação"],
  "Guerreiro": ["Atletismo","Intimidação","Sobrevivência","Percepção"],
  "Ladino": ["Furtividade","Prestidigitação","Enganação","Investigação"],
  "Mago": ["Arcanismo","História","Investigação","Intuição"],
  "Monge": ["Acrobacia","Furtividade","Intuição","Atletismo"],
  "Paladino": ["Persuasão","Atletismo","Religião","Intimidação"],
  "Patrulheiro": ["Sobrevivência","Natureza","Percepção","Furtividade"],
  "Artífice": ["Arcanismo","Investigação","História","Prestidigitação"]
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
  const signatures = classSignatureSkills[classe] || [];
  const accuracy = Number(document.getElementById("classAccurateRange")?.value || 50) / 100;
  const favoredCount = Math.round(accuracy * tier.skillMax);
  const preferred = [...new Set([...signatures, ...affinity, ...dndSkills])];
  const skillCount = Math.floor(Math.random() * (tier.skillMax - tier.skillMin + 1)) + tier.skillMin;
  const mandatoryFromSignature = accuracy >= 1 ? signatures.slice(0, Math.min(signatures.length, skillCount)) : [];
  const remainingPreferredPool = preferred.filter((s)=>!mandatoryFromSignature.includes(s));
  const favoredSkills = [...mandatoryFromSignature, ...randomSample(remainingPreferredPool, Math.max(0, Math.min(favoredCount, skillCount) - mandatoryFromSignature.length))];
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
const classHitDie = {
  "Bárbaro": 12, "Guerreiro": 10, "Paladino": 10, "Patrulheiro": 10,
  "Bardo": 8, "Bruxo": 8, "Clérigo": 8, "Druida": 8, "Ladino": 8, "Monge": 8, "Artífice": 8,
  "Feiticeiro": 6, "Mago": 6
};
function calculateHp(classe, level, sheet){
  const hitDie = classHitDie[classe] || 8;
  const conMod = toModifier(sheet.constituicao || 10);
  const lvl = Math.max(1, Number(level || 1));
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  const base = hitDie + conMod;
  const extra = (lvl - 1) * (avgPerLevel + conMod);
  return Math.max(lvl, base + extra);
}
function maxSpellLevelByCharacterLevel(level){
  if(level>=17) return 9; if(level>=15) return 8; if(level>=13) return 7; if(level>=11) return 6;
  if(level>=9) return 5; if(level>=7) return 4; if(level>=5) return 3; if(level>=3) return 2; return 1;
}
function buildSpells(classe, level){
  const spellbook = state.classSpells?.[classe];
  if(!spellbook) return [];
  const cantripCount = level >= 10 ? 4 : 3;
  const spells = [];
  spells.push(...randomSample(spellbook.truques || [], cantripCount).map((s)=>`Truque: ${s}`));
  const maxLv = maxSpellLevelByCharacterLevel(level);
  for(let lv=1; lv<=maxLv; lv++){
    const pool = spellbook[String(lv)] || [];
    const pickCount = lv <= 2 ? 2 : 1;
    spells.push(...randomSample(pool, pickCount).map((s)=>`${lv}º: ${s}`));
  }
  return spells;
}
function buildClassFeatures(classe, level){
  const table = state.classFeatures?.[classe];
  if(!table) return [];
  const unlocked = Object.keys(table).map(Number).filter((lv)=>lv<=level).sort((a,b)=>a-b);
  const out = [];
  unlocked.forEach((lv)=>{
    (table[String(lv)]||[]).forEach((entry)=>{
      if(typeof entry === "string") out.push({ titulo: `${lv}º: ${entry}`, descricao: "" });
      else out.push({ titulo: `${lv}º: ${entry.nome}`, descricao: entry.descricao || "" });
    });
  });
  return out;
}
function rollCoinPurse(level){
  const tier = getLevelTier(level);
  const richnessByTier = { comum: 0.35, treinado: 0.55, elite: 0.78, lendario: 1 };
  const richness = Math.random() * richnessByTier[tier.tier];
  const gold = Math.floor(richness * 100);
  const silver = Math.floor(Math.random() * 40);
  const copper = Math.floor(Math.random() * 80);
  return `${gold} PO, ${silver} PP, ${copper} PC`;
}
function buildNpcItems(level){
  const tier = getLevelTier(level);
  const itemCount = tier.min >= 13 ? 8 : (tier.min >= 9 ? 7 : (tier.min >= 5 ? 6 : 5));
  const baseItems = randomSample(state.itemPool, itemCount);
  const fullItems = [`Moedas: ${rollCoinPurse(level)}`, ...baseItems];
  const rareChance = tier.min >= 13 ? 0.3 : (tier.min >= 9 ? 0.2 : 0.08);
  if(state.rareItemPool?.length && Math.random() < rareChance){
    fullItems.push(`[RARO] ${randomFrom(state.rareItemPool)}`);
  }
  return fullItems;
}

function buildNpcFromForm(){const allowed=getAllowedLocations(state.cidades); const cidadeNome=pickFromChecks("cidadeChecks", (allowed.length?allowed:state.cidades).map((c)=>c.nome)); const cidade=state.cidadeMap.get(cidadeNome)||state.cidades[0]; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const antepassado=pickFromChecks("antepassadoChecks", state.data.antepassados); const nomeManual=document.getElementById("nomeInput").value.trim(); const nome=nomeManual||randomFrom(getNamePoolBySexo(sexo)); const sobrenome=randomFrom(state.data.sobrenomes); const idadeManual=document.getElementById("idadeInput").value.trim(); const idade=idadeManual||generateAgeForRace(antepassado); const alignVal=Number(document.getElementById("alignmentRange").value||0) * -1;
const classe = pickFromChecks("classeChecks",state.data.classes);
const {low,high} = getLevelRange();
const level = Math.floor(Math.random() * (high - low + 1)) + low;
const tier = getLevelTier(level);
const equipCount = tier.min >= 13 ? 7 : (tier.min >= 9 ? 6 : (tier.min >= 5 ? 5 : 4));
const profs = buildProficiencias(classe, level);
const ficha = generateSheet(classe, level);
const loadout = buildLoadout(classe, state.equipmentData || {});
const npc = {nome,sobrenome,profissao:pickFromChecks("profissaoChecks",state.data.profissoes),cidadeNatal:`${cidade.nome} (${cidade.tipo})`,cidadeFile:cidade.file,sexo,antepassado,classe,level,idade,proficiencyBonus:tier.profBonus,ca:calculateAc(ficha, loadout),vida:calculateHp(classe, level, ficha),caracteristicas:generateCharacteristics(state.characteristicData[sexo]),temperamento:pickFromChecks("temperamentoChecks",state.data.temperamentos),lealdade:pickLealdadeByAlignment(alignVal),ficha,proficienciasGerais:profs.gerais,proficienciasSkills:profs.skills,equipamentos:loadout.equipped,itens:buildNpcItems(level),magias:buildSpells(classe, level),habilidadesClasse:buildClassFeatures(classe, level),familia:generateFamily(sexo, antepassado)};
npc.background = buildBackground(npc);
return npc;}

function rerollField(field){if(!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); const allowed=getAllowedLocations(state.cidades);
if(field==="nome"){ state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.sobrenome=randomFrom(state.data.sobrenomes); }
if(field==="profissao") state.npc.profissao=pickFromChecks("profissaoChecks", state.data.profissoes);
if(field==="cidadeNatal"){const pool=(allowed.length?allowed:state.cidades).map((c)=>c.nome); const c=state.cidadeMap.get(randomFrom(pool)); state.npc.cidadeNatal=`${c.nome} (${c.tipo})`; state.npc.cidadeFile=c.file;}
if(field==="sexo") { state.npc.sexo=sexo; state.npc.nome=(document.getElementById("nomeInput").value.trim()||randomFrom(getNamePoolBySexo(sexo))); state.npc.caracteristicas=generateCharacteristics(state.characteristicData[sexo]); }
if(field==="antepassado"){state.npc.antepassado=pickFromChecks("antepassadoChecks",state.data.antepassados); state.npc.idade=generateAgeForRace(state.npc.antepassado);}
if(field==="classe") { state.npc.classe=pickFromChecks("classeChecks",state.data.classes); state.npc.ficha=generateSheet(state.npc.classe, state.npc.level); const p=buildProficiencias(state.npc.classe, state.npc.level); state.npc.proficienciasGerais=p.gerais; state.npc.proficienciasSkills=p.skills; state.npc.magias=buildSpells(state.npc.classe, state.npc.level); state.npc.habilidadesClasse=buildClassFeatures(state.npc.classe, state.npc.level); state.npc.vida=calculateHp(state.npc.classe, state.npc.level, state.npc.ficha); }
if(field==="level"){const {low,high} = getLevelRange(); state.npc.level = Math.floor(Math.random() * (high - low + 1)) + low; const tier=getLevelTier(state.npc.level); state.npc.proficiencyBonus=tier.profBonus; state.npc.ficha=generateSheet(state.npc.classe, state.npc.level); const p=buildProficiencias(state.npc.classe, state.npc.level); state.npc.proficienciasGerais=p.gerais; state.npc.proficienciasSkills=p.skills; state.npc.magias=buildSpells(state.npc.classe, state.npc.level); state.npc.habilidadesClasse=buildClassFeatures(state.npc.classe, state.npc.level); state.npc.vida=calculateHp(state.npc.classe, state.npc.level, state.npc.ficha);}
if(field==="profissao"){const loadout = buildLoadout(state.npc.classe, state.equipmentData || {}); state.npc.equipamentos=loadout.equipped; state.npc.ca=calculateAc(state.npc.ficha, loadout); state.npc.itens=buildNpcItems(state.npc.level);}
if(field==="classe"||field==="level"){const loadout = buildLoadout(state.npc.classe, state.equipmentData || {}); state.npc.equipamentos=loadout.equipped; state.npc.ca=calculateAc(state.npc.ficha, loadout);}
if(field==="idade") state.npc.idade=generateAgeForRace(state.npc.antepassado);
if(field==="temperamento") state.npc.temperamento=pickFromChecks("temperamentoChecks",state.data.temperamentos);
if(field==="lealdade") state.npc.lealdade=pickFromChecks("lealdadeChecks",state.data.lealdades);
if(field==="alinhamento"){const v=Number(document.getElementById("alignmentRange").value||0) * -1; state.npc.lealdade=pickLealdadeByAlignment(v);}
if(field==="nome"||field==="sexo"||field==="antepassado"){ state.npc.familia = generateFamily(state.npc.sexo, state.npc.antepassado); }
state.npc.background = buildBackground(state.npc);
renderNpc(state.npc);
}

async function init(){const [baseRes,charRes,cidades,locations,backgroundRes,equipmentRes,itemRes,classProfilesRes,classSpellsRes,classFeaturesRes,spellDescriptionsRes]=await Promise.all([fetch("./npc-data.json"),fetch("./npc-characteristics.json"),loadCityVillageLocations(),loadLocations(),fetch("./data/backgrounds.json"),fetch("./data/inventory/equipment.json"),fetch("./data/inventory/itens.json"),fetch("./data/class-profiles.json"),fetch("./data/class-spells.json"),fetch("./data/class-features.json"),fetch("./data/spell-descriptions.json")]); state.data=await baseRes.json(); state.characteristicData=await charRes.json(); state.locations=locations.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.backgrounds=(await backgroundRes.json()).templates.map((t)=>String(t.text||"")).filter(Boolean); state.cidades=cidades.map((e)=>({nome:e.nome,tipo:e.type,file:e.file,x:e.x,y:e.y})); state.cidadeMap=new Map(state.cidades.map((e)=>[e.nome,e])); state.equipmentData=await equipmentRes.json(); const itemData = await itemRes.json(); state.itemPool=flattenPool(itemData, "Itens"); state.rareItemPool=(itemData?.Itens?.["Itens Mágicos Raros"]||[]).filter(Boolean); state.equipmentPool=flattenPool(state.equipmentData, "Equipamentos"); state.classProfiles=await classProfilesRes.json(); state.classSpells=await classSpellsRes.json(); state.classFeatures=await classFeaturesRes.json(); state.spellDescriptions=(await spellDescriptionsRes.json()).spells || {};
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
document.getElementById("exportPdfButton").addEventListener("click", exportNpcAsPdf);
document.getElementById("exportNotekeeperButton").addEventListener("click", exportNpcToNotekeeper);
document.querySelector(".npc-list").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-field"); if(b) rerollField(b.dataset.field);});
document.getElementById("caracteristicasValue").addEventListener("click",(e)=>{const b=e.target.closest(".reroll-char"); if(!b||!state.npc) return; const sexo=pickFromChecks("sexoChecks", ["homens","mulheres","androgenos"]); state.npc.caracteristicas[b.dataset.charKey]=rerollSingleCharacteristic(b.dataset.charKey,state.characteristicData[sexo]); renderNpc(state.npc);});
document.getElementById("proficienciasSkillsValue").addEventListener("click",(e)=>{const b=e.target.closest(".skill-roll-btn"); if(!b) return; const mod=Number(b.dataset.skillMod||0); const roll=Math.floor(Math.random()*20)+1; const total=roll+mod; const out=b.parentElement.querySelector(".skill-roll-result"); if(out) out.textContent=`${roll} ${mod>=0?'+':''}${mod} = ${total}`;});
document.querySelectorAll(".reroll-section").forEach((btn)=>btn.addEventListener("click",(e)=>{e.preventDefault(); e.stopPropagation(); if(!state.npc) return; const section=btn.dataset.section; if(section==='proficienciasSkills'){const p=buildProficiencias(state.npc.classe,state.npc.level); state.npc.proficienciasGerais=p.gerais; state.npc.proficienciasSkills=p.skills;} if(section==='equipItens'){const loadout=buildLoadout(state.npc.classe,state.equipmentData||{}); state.npc.equipamentos=loadout.equipped; state.npc.ca=calculateAc(state.npc.ficha,loadout); state.npc.itens=buildNpcItems(state.npc.level);} if(section==='magias'){state.npc.magias=buildSpells(state.npc.classe,state.npc.level);} renderNpc(state.npc);}));
document.querySelectorAll(".clear-checks").forEach((btn)=>btn.addEventListener("click",()=>{const t=btn.dataset.target; document.querySelectorAll(`#${t} input[type='checkbox']`).forEach((c)=>{c.checked=false;});}));
renderNpc(buildNpcFromForm());
}
init();
