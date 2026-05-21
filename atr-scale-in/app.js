const el = id => document.getElementById(id);

const presets = {
  tight: {
    name: 'Tight pyramid',
    stopDistance: 1,
    scaleDistance: 1,
    maxScaleIns: 9,
    totalMove: 9,
    moves: [3, 5, 7, 9],
    description: '1 ATR stop, adds every 1 ATR.'
  },
  wide: {
    name: 'Wider structure',
    stopDistance: 2,
    scaleDistance: 2,
    maxScaleIns: 4,
    totalMove: 9,
    moves: [3, 5, 7, 9],
    description: '2 ATR stop, adds every 2 ATRs.'
  },
  slow: {
    name: 'Slow builder',
    stopDistance: 3,
    scaleDistance: 3,
    maxScaleIns: 3,
    totalMove: 12,
    moves: [3, 6, 9, 12],
    description: '3 ATR stop, adds every 3 ATRs.'
  }
};

const defaultPresetKey = 'tight';

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function formatAtr(value) {
  const rounded = Number(value.toFixed(2));
  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })} ATR`;
}

function formatR(value) {
  return `${value.toFixed(2)}R`;
}

function parseMoveSeries(text, fallback) {
  const moves = String(text)
    .split(/[\s,]+/)
    .map(part => Number(part.trim()))
    .filter(number => Number.isFinite(number) && number >= 0);
  const unique = [...new Set(moves.map(move => Number(move.toFixed(2))))];
  return unique.length ? unique.sort((a, b) => a - b) : fallback;
}

function entryLevels(totalMove, scaleDistance, maxScaleIns) {
  const levels = [0];
  if (scaleDistance <= 0) return levels;
  const scaleLimit = Math.max(0, Math.floor(maxScaleIns));
  for (let level = scaleDistance; level <= totalMove + 1e-9 && levels.length <= scaleLimit; level += scaleDistance) {
    levels.push(Number(level.toFixed(10)));
  }
  return levels;
}

function calculateStructure(stopDistance, scaleDistance, totalMove, maxScaleIns) {
  const levels = entryLevels(totalMove, scaleDistance, maxScaleIns);
  const entries = levels.map(level => ({
    level,
    pnlR: Math.max(totalMove - level, 0) / stopDistance
  }));
  const totalR = entries.reduce((sum, entry) => sum + entry.pnlR, 0);
  return {
    entries,
    totalR,
    entryCount: entries.length,
    scaleIns: Math.max(0, entries.length - 1),
    lastEntry: entries.length ? entries[entries.length - 1].level : 0
  };
}

function currentInputs() {
  const stopDistance = clamp(el('stop-distance').value, 0.1, 20, 1);
  const scaleDistance = clamp(el('scale-distance').value, 0.1, 20, 1);
  const maxScaleIns = Math.round(clamp(el('max-scale-ins').value, 0, 50, 9));
  const totalMove = clamp(el('total-move').value, 0, 100, 9);
  const comparisonMoves = parseMoveSeries(el('comparison-moves').value, [3, 5, 7, 9]);
  return { stopDistance, scaleDistance, maxScaleIns, totalMove, comparisonMoves };
}

function applyPreset(key) {
  const preset = presets[key] || presets[defaultPresetKey];
  el('stop-distance').value = preset.stopDistance;
  el('scale-distance').value = preset.scaleDistance;
  el('max-scale-ins').value = preset.maxScaleIns;
  el('total-move').value = preset.totalMove;
  el('comparison-moves').value = preset.moves.join(', ');
  document.querySelectorAll('.preset').forEach(button => {
    button.classList.toggle('active', button.dataset.preset === key);
  });
  render();
}

function autoSeries() {
  const { scaleDistance, totalMove } = currentInputs();
  const step = Math.max(scaleDistance, 1);
  const maxMove = Math.max(totalMove, step * 4);
  const moves = [];
  for (let move = step; move <= maxMove + 1e-9 && moves.length < 7; move += step) {
    moves.push(Number(move.toFixed(2)));
  }
  if (!moves.includes(totalMove)) moves.push(totalMove);
  const cleanMoves = [...new Set(moves)].sort((a, b) => a - b);
  el('comparison-moves').value = cleanMoves.join(', ');
  render();
}

function renderStats(inputs, result) {
  el('selected-total-r').textContent = formatR(result.totalR);
  el('selected-context').textContent = `${result.entryCount} entries · ${result.scaleIns} scale-ins`;
  el('stat-total-r').textContent = formatR(result.totalR);
  el('stat-entries').textContent = result.entryCount;
  el('stat-scale-ins').textContent = result.scaleIns;
  el('stat-last-entry').textContent = formatAtr(result.lastEntry);
  el('readout').textContent = `A ${formatAtr(inputs.totalMove)} move with a ${formatAtr(inputs.stopDistance)} stop, ${formatAtr(inputs.scaleDistance)} scale spacing, and a ${inputs.maxScaleIns} scale-in cap creates ${formatR(result.totalR)} gross across ${result.entryCount} equal entries.`;
  el('comparison-note').textContent = `${formatAtr(inputs.stopDistance)} stop · every ${formatAtr(inputs.scaleDistance)} · max ${inputs.maxScaleIns} scale-ins`;
  el('ladder-note').textContent = `0 to ${formatAtr(inputs.totalMove)}`;
}

function renderMoveBars(inputs) {
  const results = inputs.comparisonMoves.map(move => ({
    move,
    result: calculateStructure(inputs.stopDistance, inputs.scaleDistance, move, inputs.maxScaleIns)
  }));
  const maxR = Math.max(...results.map(item => item.result.totalR), 1);
  el('move-bars').innerHTML = results.map(item => {
    const width = (item.result.totalR / maxR) * 100;
    return `
      <div class="bar-row">
        <span>${formatAtr(item.move)}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
        <span class="bar-value">${formatR(item.result.totalR)}</span>
      </div>
    `;
  }).join('');
}

function renderLadder(inputs, result) {
  const maxPnl = Math.max(...result.entries.map(entry => entry.pnlR), 1);
  const maxMove = Math.max(inputs.totalMove, inputs.scaleDistance, 1);
  el('entry-ladder').innerHTML = result.entries.map((entry, index) => {
    const fillWidth = (entry.pnlR / maxPnl) * 100;
    const dotLeft = (entry.level / maxMove) * 100;
    const label = index === 0 ? 'Initial' : `Scale ${index}`;
    return `
      <div class="ladder-row">
        <span class="ladder-level">${label}<br>${formatAtr(entry.level)}</span>
        <div class="ladder-track">
          <div class="ladder-fill" style="width: ${fillWidth}%"></div>
          <span class="ladder-dot" style="left: ${dotLeft}%"></span>
        </div>
        <span class="ladder-r">${formatR(entry.pnlR)}</span>
      </div>
    `;
  }).join('');
}

function renderPresetComparison(inputs) {
  const moves = inputs.comparisonMoves;
  const allResults = Object.values(presets).flatMap(preset =>
    moves.map(move => calculateStructure(preset.stopDistance, preset.scaleDistance, move, preset.maxScaleIns).totalR)
  );
  const maxR = Math.max(...allResults, 1);
  el('preset-comparison').innerHTML = Object.values(presets).map(preset => {
    const rows = moves.map(move => {
      const result = calculateStructure(preset.stopDistance, preset.scaleDistance, move, preset.maxScaleIns);
      const width = (result.totalR / maxR) * 100;
      return `
        <div class="mini-row">
          <span>${formatAtr(move)}</span>
          <div class="mini-track"><div class="mini-fill" style="width: ${width}%"></div></div>
          <span class="mini-value">${formatR(result.totalR)}</span>
        </div>
      `;
    }).join('');
    return `
      <article class="structure-card">
        <h3>${preset.name}</h3>
        <p>${preset.description}</p>
        <div class="mini-bars">${rows}</div>
      </article>
    `;
  }).join('');
}

function render() {
  const inputs = currentInputs();
  const result = calculateStructure(inputs.stopDistance, inputs.scaleDistance, inputs.totalMove, inputs.maxScaleIns);
  renderStats(inputs, result);
  renderMoveBars(inputs);
  renderLadder(inputs, result);
  renderPresetComparison(inputs);
}

['stop-distance', 'scale-distance', 'max-scale-ins', 'total-move', 'comparison-moves'].forEach(id => {
  el(id).addEventListener('input', () => {
    document.querySelectorAll('.preset').forEach(button => button.classList.remove('active'));
    render();
  });
});

document.querySelectorAll('.preset').forEach(button => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset));
});

el('auto-series').addEventListener('click', autoSeries);
el('reset').addEventListener('click', () => applyPreset(defaultPresetKey));

render();
