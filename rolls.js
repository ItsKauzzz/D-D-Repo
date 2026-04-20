const rollTypeList = document.getElementById('roll-type-list');
const rollTitle = document.getElementById('roll-title');
const rollDescription = document.getElementById('roll-description');
const inspectorControls = document.getElementById('inspector-controls');
const rollBtn = document.getElementById('roll-btn');
const rollResult = document.getElementById('roll-result');
const resultsList = document.getElementById('results-list');

const rollTypes = window.ROLLS_TYPES || [];

let activeRollId = rollTypes[0]?.id || '';
let controlState = {};

bootstrap();

function bootstrap() {
  renderRollTypeMenu();
  selectRollType(activeRollId);
  rollBtn.addEventListener('click', handleRoll);
}

function renderRollTypeMenu() {
  rollTypeList.innerHTML = '';
  rollTypes.forEach((rollType) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'roll-type-btn';
    button.textContent = rollType.name;
    button.dataset.rollId = rollType.id;
    button.addEventListener('click', () => selectRollType(rollType.id));
    item.appendChild(button);
    rollTypeList.appendChild(item);
  });
}

function selectRollType(rollId) {
  const selectedType = rollTypes.find((item) => item.id === rollId);
  if (!selectedType) return;
  activeRollId = selectedType.id;
  rollTitle.textContent = selectedType.name;
  rollDescription.textContent = selectedType.description;
  rollResult.textContent = 'Faça uma rolagem para ver o resultado.';

  controlState = {};
  selectedType.controls.forEach((control) => {
    controlState[control.id] = control.defaultValue;
  });

  renderControlInspector(selectedType);
  renderResults(selectedType);
  syncActiveButton();
}

function renderControlInspector(rollType) {
  inspectorControls.innerHTML = '';
  rollType.controls.forEach((control) => {
    const row = document.createElement('div');
    row.className = 'control-row';

    const label = document.createElement('label');
    label.textContent = control.label;
    label.htmlFor = `control-${control.id}`;

    const input = control.type === 'select' ? document.createElement('select') : document.createElement('input');
    if (control.type === 'select') {
      control.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        input.appendChild(optionElement);
      });
    } else {
      input.type = 'number';
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
    }

    input.id = `control-${control.id}`;
    input.value = String(control.defaultValue);
    input.addEventListener('input', () => {
      controlState[control.id] = control.type === 'number' ? Number(input.value || 0) : input.value;
    });

    row.appendChild(label);
    row.appendChild(input);
    inspectorControls.appendChild(row);
  });
}

function renderResults(rollType) {
  resultsList.innerHTML = '';
  rollType.results.forEach((entry) => {
    const item = document.createElement('li');

    if (typeof entry.value === 'number') {
      item.dataset.resultValue = String(entry.value);
      item.innerHTML = `<strong>${entry.value}</strong> — ${entry.text} <span class="group-label">${entry.group}</span>`;
    } else {
      item.innerHTML = `<strong>${entry.key}</strong> — ${entry.text} <span class="group-label">${entry.group}</span>`;
    }

    resultsList.appendChild(item);
  });
}

function handleRoll() {
  if (activeRollId === 'clima') {
    rollClimate();
    return;
  }
  if (activeRollId === 'descanso') {
    rollRest();
  }
}

function rollClimate() {
  const baseRoll = rollDie(100);
  const modifier = Number(controlState.modifier || 0);
  const regionBias = String(controlState.regionBias || 'none');
  const biasedRoll = applyRegionBias(baseRoll, regionBias);
  const finalRoll = clamp(biasedRoll + modifier, 1, 100);

  const climateType = rollTypes.find((item) => item.id === "clima");
  const result = climateType?.results.find((item) => item.value === finalRoll);
  if (!result) return;

  highlightResult(finalRoll);
  rollResult.innerHTML = [
    `<strong>Base:</strong> ${baseRoll}`,
    `<strong>Tendência:</strong> ${describeBias(regionBias, baseRoll, biasedRoll)}`,
    `<strong>Modificador:</strong> ${signed(modifier)}`,
    `<strong>Final:</strong> ${finalRoll}`,
    `<strong>Resultado:</strong> ${result.text}`
  ].join(' • ');
}

function rollRest() {
  const d20 = rollDie(20);
  const conMod = Number(controlState.conMod || 0);
  const shelter = Number(controlState.shelter || 0);
  const food = Number(controlState.food || 0);
  const extraMod = Number(controlState.extraMod || 0);
  const total = d20 + conMod + shelter + food + extraMod;

  const outcome = getRestOutcome(total);

  clearHighlight();
  rollResult.innerHTML = `
    <div class="roll-result-formula"><strong>${total}</strong> (1d20 ${signed(conMod)} ${signed(shelter)} ${signed(food)} ${signed(extraMod)})</div>
    <div class="roll-result-title roll-result-title--${outcome.tone}">${outcome.title}</div>
    <div class="roll-result-description">${outcome.description}</div>
    <div class="roll-result-breakdown">Rolagem base ${d20} • CON ${signed(conMod)} • Estadia ${signed(shelter)} • Alimento ${signed(food)} • Outros ${signed(extraMod)} • Faixa ${outcome.band}</div>
  `;
}


function getRestOutcome(total) {
  if (total <= 3) {
    return {
      band: '1–3',
      tone: 'bad',
      title: 'Descanso Ruim',
      description: 'Recupera metade do HP, não recupera todos os recursos e não remove exaustão.'
    };
  }
  if (total <= 10) {
    return {
      band: '4–10',
      tone: 'mid',
      title: 'Descanso Desconfortável',
      description: 'Recupera HP normal e apenas parte dos recursos (ex.: metade dos slots).'
    };
  }
  if (total <= 15) {
    return {
      band: '11–15',
      tone: 'mid',
      title: 'Descanso Normal',
      description: 'Regras padrão.'
    };
  }
  if (total <= 19) {
    return {
      band: '16–19',
      tone: 'good',
      title: 'Descanso Bom',
      description: 'Recupera tudo + vantagem no primeiro teste do dia.'
    };
  }
  return {
    band: '20+',
    tone: 'excellent',
    title: 'Descanso Excelente!',
    description: 'Tudo recuperado + inspiração.'
  };
}

function applyRegionBias(baseRoll, biasType) {
  if (biasType === 'warm') return clamp(baseRoll + 8, 1, 100);
  if (biasType === 'cold') return clamp(baseRoll - 8, 1, 100);
  if (biasType === 'unstable' && baseRoll >= 46 && baseRoll <= 85) {
    return Math.random() < 0.5 ? clamp(baseRoll - 40, 1, 100) : clamp(baseRoll + 15, 1, 100);
  }
  return baseRoll;
}

function describeBias(biasType, baseRoll, biasedRoll) {
  if (biasType === 'warm') return `Quente (${baseRoll} → ${biasedRoll})`;
  if (biasType === 'cold') return `Fria (${baseRoll} → ${biasedRoll})`;
  if (biasType === 'unstable') return `Instável (${baseRoll} → ${biasedRoll})`;
  return 'Neutra';
}

function highlightResult(value) {
  clearHighlight();
  const current = resultsList.querySelector(`[data-result-value="${value}"]`);
  if (!current) return;
  current.classList.add('is-highlighted');
  current.scrollIntoView({ block: 'nearest' });
}

function clearHighlight() {
  const previous = resultsList.querySelector('.is-highlighted');
  if (previous) previous.classList.remove('is-highlighted');
}

function syncActiveButton() {
  const buttons = rollTypeList.querySelectorAll('.roll-type-btn');
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.rollId === activeRollId);
  });
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
