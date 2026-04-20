const rollTypes = [
  {
    id: 'clima',
    name: 'Clima (1d100)',
    description: 'Tabela de clima com extremos, instabilidades e condições estáveis.',
    controls: [
      { id: 'modifier', label: 'Modificador da rolagem', type: 'number', min: -30, max: 30, step: 1, defaultValue: 0 },
      {
        id: 'regionBias',
        label: 'Tendência regional',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'Neutra (0)' },
          { value: 'warm', label: 'Região quente (+8)' },
          { value: 'cold', label: 'Região fria (-8)' },
          { value: 'unstable', label: 'Região instável (força extremos)' }
        ]
      }
    ],
    results: [
      { value: 1, text: 'Tempestade violenta com raios constantes', group: 'Extremos / eventos raros (1–5)' },
      { value: 2, text: 'Ventania destrutiva (quase furacão)', group: 'Extremos / eventos raros (1–5)' },
      { value: 3, text: 'Granizo pesado', group: 'Extremos / eventos raros (1–5)' },
      { value: 4, text: 'Tempestade anômala (possível influência mágica)', group: 'Extremos / eventos raros (1–5)' },
      { value: 5, text: 'Fenômeno incomum (à escolha do DM)', group: 'Extremos / eventos raros (1–5)' },
      { value: 6, text: 'Chuva torrencial + trovões contínuos', group: 'Tempestade forte (6–15)' },
      { value: 7, text: 'Temporal com vento forte', group: 'Tempestade forte (6–15)' },
      { value: 8, text: 'Tempestade elétrica instável', group: 'Tempestade forte (6–15)' },
      { value: 9, text: 'Chuva pesada + lama difícil', group: 'Tempestade forte (6–15)' },
      { value: 10, text: 'Pancadas intensas intermitentes', group: 'Tempestade forte (6–15)' },
      { value: 11, text: 'Tempestade fria (quase gelo/neve)', group: 'Tempestade forte (6–15)' },
      { value: 12, text: 'Ventos fortes persistentes', group: 'Tempestade forte (6–15)' },
      { value: 13, text: 'Nuvens muito carregadas + trovões', group: 'Tempestade forte (6–15)' },
      { value: 14, text: 'Temporal começando (rápida piora)', group: 'Tempestade forte (6–15)' },
      { value: 15, text: 'Tempestade perdendo força (lenta melhora)', group: 'Tempestade forte (6–15)' },
      { value: 16, text: 'Chuva forte com baixa visibilidade', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 17, text: 'Chuva constante + vento lateral', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 18, text: 'Chuva persistente', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 19, text: 'Garoa pesada', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 20, text: 'Céu escuro + chuva intermitente', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 21, text: 'Chuva fria contínua', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 22, text: 'Pancadas ocasionais', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 23, text: 'Nublado carregado + risco de chuva', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 24, text: 'Chuva diminuindo gradualmente', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 25, text: 'Garoa constante', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 26, text: 'Céu fechado e úmido', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 27, text: 'Nuvens densas', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 28, text: 'Vento moderado + nuvens', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 29, text: 'Céu encoberto estável', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 30, text: 'Neblina leve + umidade', group: 'Chuva / clima hostil moderado (16–30)' },
      { value: 31, text: 'Alternância rápida (sol ↔ nuvens)', group: 'Instável / transição (31–45)' },
      { value: 32, text: 'Céu parcialmente fechado', group: 'Instável / transição (31–45)' },
      { value: 33, text: 'Vento moderado constante', group: 'Instável / transição (31–45)' },
      { value: 34, text: 'Ar abafado (antes de chuva)', group: 'Instável / transição (31–45)' },
      { value: 35, text: 'Nuvens escuras sem precipitação', group: 'Instável / transição (31–45)' },
      { value: 36, text: 'Mudanças leves de vento', group: 'Instável / transição (31–45)' },
      { value: 37, text: 'Céu encoberto leve', group: 'Instável / transição (31–45)' },
      { value: 38, text: 'Névoa leve', group: 'Instável / transição (31–45)' },
      { value: 39, text: 'Neblina moderada', group: 'Instável / transição (31–45)' },
      { value: 40, text: 'Vento irregular', group: 'Instável / transição (31–45)' },
      { value: 41, text: 'Nuvens dispersas em movimento', group: 'Instável / transição (31–45)' },
      { value: 42, text: 'Clima indeciso (mudanças frequentes)', group: 'Instável / transição (31–45)' },
      { value: 43, text: 'Céu cinza uniforme', group: 'Instável / transição (31–45)' },
      { value: 44, text: 'Vento fresco constante', group: 'Instável / transição (31–45)' },
      { value: 45, text: 'Tendência a estabilizar', group: 'Instável / transição (31–45)' },
      { value: 46, text: 'Parcialmente nublado', group: 'Clima comum / estável (46–85)' },
      { value: 47, text: 'Sol com poucas nuvens', group: 'Clima comum / estável (46–85)' },
      { value: 48, text: 'Clima agradável padrão', group: 'Clima comum / estável (46–85)' },
      { value: 49, text: 'Brisa leve', group: 'Clima comum / estável (46–85)' },
      { value: 50, text: 'Temperatura amena', group: 'Clima comum / estável (46–85)' },
      { value: 51, text: 'Céu limpo com brisa', group: 'Clima comum / estável (46–85)' },
      { value: 52, text: 'Dia claro', group: 'Clima comum / estável (46–85)' },
      { value: 53, text: 'Céu aberto com poucas nuvens', group: 'Clima comum / estável (46–85)' },
      { value: 54, text: 'Visibilidade excelente', group: 'Clima comum / estável (46–85)' },
      { value: 55, text: 'Ar seco confortável', group: 'Clima comum / estável (46–85)' },
      { value: 56, text: 'Clima estável', group: 'Clima comum / estável (46–85)' },
      { value: 57, text: 'Céu limpo e silencioso', group: 'Clima comum / estável (46–85)' },
      { value: 58, text: 'Brisa constante leve', group: 'Clima comum / estável (46–85)' },
      { value: 59, text: 'Temperatura confortável', group: 'Clima comum / estável (46–85)' },
      { value: 60, text: 'Dia tranquilo', group: 'Clima comum / estável (46–85)' },
      { value: 61, text: 'Clima ideal para viagem', group: 'Clima comum / estável (46–85)' },
      { value: 62, text: 'Sol leve (não agressivo)', group: 'Clima comum / estável (46–85)' },
      { value: 63, text: 'Parcialmente nublado estável', group: 'Clima comum / estável (46–85)' },
      { value: 64, text: 'Céu limpo estável', group: 'Clima comum / estável (46–85)' },
      { value: 65, text: 'Brisa fresca', group: 'Clima comum / estável (46–85)' },
      { value: 66, text: 'Dia equilibrado', group: 'Clima comum / estável (46–85)' },
      { value: 67, text: 'Leve variação térmica', group: 'Clima comum / estável (46–85)' },
      { value: 68, text: 'Céu claro amplo', group: 'Clima comum / estável (46–85)' },
      { value: 69, text: 'Clima previsível', group: 'Clima comum / estável (46–85)' },
      { value: 70, text: 'Ambiente agradável', group: 'Clima comum / estável (46–85)' },
      { value: 71, text: 'Sol com vento leve', group: 'Clima comum / estável (46–85)' },
      { value: 72, text: 'Céu limpo constante', group: 'Clima comum / estável (46–85)' },
      { value: 73, text: 'Ar leve e seco', group: 'Clima comum / estável (46–85)' },
      { value: 74, text: 'Temperatura neutra', group: 'Clima comum / estável (46–85)' },
      { value: 75, text: 'Dia comum', group: 'Clima comum / estável (46–85)' },
      { value: 76, text: 'Brisa suave constante', group: 'Clima comum / estável (46–85)' },
      { value: 77, text: 'Céu parcialmente limpo', group: 'Clima comum / estável (46–85)' },
      { value: 78, text: 'Clima sem interferências', group: 'Clima comum / estável (46–85)' },
      { value: 79, text: 'Boa visibilidade geral', group: 'Clima comum / estável (46–85)' },
      { value: 80, text: 'Dia calmo', group: 'Clima comum / estável (46–85)' },
      { value: 81, text: 'Céu claro com nuvens altas', group: 'Clima comum / estável (46–85)' },
      { value: 82, text: 'Condições ideais', group: 'Clima comum / estável (46–85)' },
      { value: 83, text: 'Clima estável prolongado', group: 'Clima comum / estável (46–85)' },
      { value: 84, text: 'Atmosfera tranquila', group: 'Clima comum / estável (46–85)' },
      { value: 85, text: 'Dia perfeito para viagem', group: 'Clima comum / estável (46–85)' },
      { value: 86, text: 'Calor forte', group: 'Temperatura intensa (86–100)' },
      { value: 87, text: 'Calor seco', group: 'Temperatura intensa (86–100)' },
      { value: 88, text: 'Calor úmido sufocante', group: 'Temperatura intensa (86–100)' },
      { value: 89, text: 'Sol intenso direto', group: 'Temperatura intensa (86–100)' },
      { value: 90, text: 'Pico de calor (risco leve)', group: 'Temperatura intensa (86–100)' },
      { value: 91, text: 'Frio intenso', group: 'Temperatura intensa (86–100)' },
      { value: 92, text: 'Frio seco cortante', group: 'Temperatura intensa (86–100)' },
      { value: 93, text: 'Frio úmido desconfortável', group: 'Temperatura intensa (86–100)' },
      { value: 94, text: 'Geada leve', group: 'Temperatura intensa (86–100)' },
      { value: 95, text: 'Frio extremo (risco)', group: 'Temperatura intensa (86–100)' },
      { value: 96, text: 'Calor anormal fora de época', group: 'Temperatura intensa (86–100)' },
      { value: 97, text: 'Frio anormal fora de época', group: 'Temperatura intensa (86–100)' },
      { value: 98, text: 'Oscilação térmica forte (dia/noite)', group: 'Temperatura intensa (86–100)' },
      { value: 99, text: 'Temperatura instável', group: 'Temperatura intensa (86–100)' },
      { value: 100, text: 'Condição térmica extrema incomum', group: 'Temperatura intensa (86–100)' }
    ]
  }
];

const rollTypeList = document.getElementById('roll-type-list');
const rollTitle = document.getElementById('roll-title');
const rollDescription = document.getElementById('roll-description');
const inspectorControls = document.getElementById('inspector-controls');
const rollBtn = document.getElementById('roll-btn');
const rollResult = document.getElementById('roll-result');
const resultsList = document.getElementById('results-list');

let activeRollId = rollTypes[0].id;
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

    button.addEventListener('click', () => {
      selectRollType(rollType.id);
    });

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

    let input;
    if (control.type === 'select') {
      input = document.createElement('select');
      control.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        input.appendChild(optionElement);
      });
    } else {
      input = document.createElement('input');
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
    item.dataset.resultValue = String(entry.value);
    item.innerHTML = `<strong>${entry.value}</strong> — ${entry.text} <span class="group-label">${entry.group}</span>`;
    resultsList.appendChild(item);
  });
}

function handleRoll() {
  const rollType = rollTypes.find((item) => item.id === activeRollId);
  if (!rollType) return;

  const baseRoll = rollD100();
  const modifier = Number(controlState.modifier || 0);
  const regionBias = String(controlState.regionBias || 'none');

  const biasedRoll = applyRegionBias(baseRoll, regionBias);
  const finalRoll = clamp(biasedRoll + modifier, 1, 100);

  const result = rollType.results.find((item) => item.value === finalRoll);
  if (!result) return;

  highlightResult(result.value);

  rollResult.innerHTML = [
    `<strong>Base:</strong> ${baseRoll}`,
    `<strong>Tendência regional:</strong> ${describeBias(regionBias, baseRoll, biasedRoll)}`,
    `<strong>Modificador:</strong> ${modifier >= 0 ? `+${modifier}` : modifier}`,
    `<strong>Final:</strong> ${finalRoll}`,
    `<strong>Resultado:</strong> ${result.text}`
  ].join(' • ');
}

function applyRegionBias(baseRoll, biasType) {
  if (biasType === 'warm') return clamp(baseRoll + 8, 1, 100);
  if (biasType === 'cold') return clamp(baseRoll - 8, 1, 100);
  if (biasType === 'unstable') {
    if (baseRoll >= 46 && baseRoll <= 85) {
      return Math.random() < 0.5 ? clamp(baseRoll - 40, 1, 100) : clamp(baseRoll + 15, 1, 100);
    }
  }
  return baseRoll;
}

function describeBias(biasType, baseRoll, biasedRoll) {
  if (biasType === 'none') return 'Neutra (sem alteração)';
  if (biasType === 'warm') return `Região quente (${baseRoll} → ${biasedRoll})`;
  if (biasType === 'cold') return `Região fria (${baseRoll} → ${biasedRoll})`;
  if (biasType === 'unstable') return `Região instável (${baseRoll} → ${biasedRoll})`;
  return 'Neutra (sem alteração)';
}

function highlightResult(value) {
  const previous = resultsList.querySelector('.is-highlighted');
  if (previous) previous.classList.remove('is-highlighted');

  const current = resultsList.querySelector(`[data-result-value="${value}"]`);
  if (!current) return;

  current.classList.add('is-highlighted');
  current.scrollIntoView({ block: 'nearest' });
}

function syncActiveButton() {
  const buttons = rollTypeList.querySelectorAll('.roll-type-btn');
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.rollId === activeRollId);
  });
}

function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
