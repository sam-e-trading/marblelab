const el = id => document.getElementById(id);

const presets = {
  tight: {
    name: 'Tight pyramid',
    stopDistance: 1,
    scaleDistance: 1,
    maxScaleIns: 2,
    sizingMode: 'equal',
    sizeSequence: '1, 1, 1',
    totalMove: 9,
    moves: [3, 5, 7, 9],
    description: '1 ATR stop, adds every 1 ATR.'
  },
  wide: {
    name: 'Wider structure',
    stopDistance: 2,
    scaleDistance: 2,
    maxScaleIns: 4,
    sizingMode: 'half',
    sizeSequence: '1, 0.5, 0.5',
    totalMove: 9,
    moves: [3, 5, 7, 9],
    description: '2 ATR stop, adds every 2 ATRs.'
  },
  slow: {
    name: 'Slow builder',
    stopDistance: 3,
    scaleDistance: 3,
    maxScaleIns: 3,
    sizingMode: 'pyramidDown',
    sizeSequence: '1, 0.75, 0.5, 0.25',
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

function formatPct(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function parseMoveSeries(text, fallback) {
  const moves = String(text)
    .split(/[\s,]+/)
    .map(part => Number(part.trim()))
    .filter(number => Number.isFinite(number) && number >= 0);
  const unique = [...new Set(moves.map(move => Number(move.toFixed(2))))];
  return unique.length ? unique.sort((a, b) => a - b) : fallback;
}

function parseTargetSeries(text, fallback) {
  const targets = String(text)
    .split(/[\s,]+/)
    .map(part => Number(part.trim()))
    .filter(number => Number.isFinite(number));
  const unique = [...new Set(targets.map(target => Number(target.toFixed(2))))];
  return unique.length ? unique.sort((a, b) => a - b) : fallback;
}

function formatSize(value) {
  const rounded = Number(value.toFixed(2));
  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })}x`;
}

function parseSizeSequence(text) {
  return String(text)
    .split(/[\s,]+/)
    .map(part => Number(part.trim()))
    .filter(number => Number.isFinite(number) && number > 0)
    .map(number => clamp(number, 0.01, 100, 1));
}

function sizeForEntry(index, mode, customSequence) {
  if (mode === 'half') return index === 0 ? 1 : 0.5;
  if (mode === 'double') return index === 0 ? 1 : 2;
  if (mode === 'pyramidDown') return Math.max(0.25, 1 - (index * 0.25));
  if (mode === 'custom') {
    if (!customSequence.length) return 1;
    return customSequence[Math.min(index, customSequence.length - 1)];
  }
  return 1;
}

function sizingLabel(mode) {
  return {
    equal: 'equal size',
    half: 'half-size adds',
    double: 'double-size adds',
    pyramidDown: 'pyramid down',
    custom: 'custom sizing'
  }[mode] || 'equal size';
}

function requiredWinRate(targetExpectancy, averageWinR, averageLossR) {
  const denominator = averageWinR + averageLossR;
  if (denominator <= 0) return Infinity;
  return ((targetExpectancy + averageLossR) / denominator) * 100;
}

function expectancyAt(winRatePct, averageWinR, averageLossR) {
  const winProb = winRatePct / 100;
  return (winProb * averageWinR) - ((1 - winProb) * averageLossR);
}

function stopModelLabel(model) {
  return {
    original: 'original stop',
    breakeven: 'breakeven on total position',
    trailing: 'ATR trailing stop',
    rPullback: 'R pullback from current move'
  }[model] || 'original stop';
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

function calculateStructure(stopDistance, scaleDistance, totalMove, maxScaleIns, sizingMode = 'equal', sizeSequence = []) {
  const levels = entryLevels(totalMove, scaleDistance, maxScaleIns);
  const entries = levels.map((level, index) => {
    const size = sizeForEntry(index, sizingMode, sizeSequence);
    const rawR = Math.max(totalMove - level, 0) / stopDistance;
    return {
      level,
      size,
      rawR,
      pnlR: rawR * size
    };
  });
  const grossUnitR = entries.reduce((sum, entry) => sum + entry.pnlR, 0);
  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const normalisedR = totalSize ? grossUnitR / totalSize : 0;
  return {
    entries,
    grossUnitR,
    normalisedR,
    totalSize,
    entryCount: entries.length,
    scaleIns: Math.max(0, entries.length - 1),
    lastEntry: entries.length ? entries[entries.length - 1].level : 0
  };
}

function calculateStopOut(result, inputs) {
  const weightedEntry = result.totalSize
    ? result.entries.reduce((sum, entry) => sum + (entry.level * entry.size), 0) / result.totalSize
    : 0;
  let stopLevel = -inputs.stopDistance;
  if (inputs.stopModel === 'breakeven') stopLevel = weightedEntry;
  if (inputs.stopModel === 'trailing') stopLevel = inputs.totalMove - inputs.trailingStopDistance;
  if (inputs.stopModel === 'rPullback') stopLevel = inputs.totalMove - (inputs.stopOutAfterR * inputs.stopDistance);
  stopLevel = Math.min(stopLevel, inputs.totalMove);
  const stopOutR = result.entries.reduce((sum, entry) => {
    return sum + (((stopLevel - entry.level) / inputs.stopDistance) * entry.size);
  }, 0);
  return {
    stopLevel,
    stopOutR,
    weightedEntry,
    modelLabel: stopModelLabel(inputs.stopModel)
  };
}

function currentInputs() {
  const stopDistance = clamp(el('stop-distance').value, 0.1, 20, 1);
  const scaleDistance = clamp(el('scale-distance').value, 0.1, 20, 1);
  const maxScaleIns = Math.round(clamp(el('max-scale-ins').value, 0, 50, 9));
  const totalMove = clamp(el('total-move').value, 0, 100, 9);
  const sizingMode = el('sizing-mode').value;
  const sizeSequence = parseSizeSequence(el('size-sequence').value);
  const stopModel = el('stop-model').value;
  const trailingStopDistance = clamp(el('trailing-stop-distance').value, 0.1, 50, stopDistance);
  const stopOutAfterR = clamp(el('stop-out-after-r').value, 0.1, 100, 1);
  const assumedLossR = clamp(el('assumed-loss-r').value, 0.01, 20, 1);
  const expectancyTargets = parseTargetSeries(el('expectancy-targets').value, [0, 0.25, 0.5, 1]);
  const comparisonMoves = parseMoveSeries(el('comparison-moves').value, [3, 5, 7, 9]);
  return { stopDistance, scaleDistance, maxScaleIns, totalMove, sizingMode, sizeSequence, stopModel, trailingStopDistance, stopOutAfterR, assumedLossR, expectancyTargets, comparisonMoves };
}

function applyPreset(key) {
  const preset = presets[key] || presets[defaultPresetKey];
  el('stop-distance').value = preset.stopDistance;
  el('scale-distance').value = preset.scaleDistance;
  el('max-scale-ins').value = preset.maxScaleIns;
  el('sizing-mode').value = preset.sizingMode;
  el('size-sequence').value = preset.sizeSequence;
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
  el('selected-total-r').textContent = formatR(result.grossUnitR);
  el('selected-context').textContent = `${result.entryCount} total entries · 1 initial + ${result.scaleIns} scale-ins`;
  el('stat-total-r').textContent = formatR(result.grossUnitR);
  el('stat-average-r').textContent = formatR(result.normalisedR);
  el('stat-entries').textContent = result.entryCount;
  el('stat-total-size').textContent = formatSize(result.totalSize);
  el('readout').textContent = `A ${formatAtr(inputs.totalMove)} move with a ${formatAtr(inputs.stopDistance)} stop, ${formatAtr(inputs.scaleDistance)} scale spacing, ${inputs.maxScaleIns} additional scale-ins, and ${sizingLabel(inputs.sizingMode)} produces ${formatR(result.grossUnitR)} total R from all entries combined. That is ${result.entryCount} entries: 1 initial + ${result.scaleIns} scale-ins, with ${formatSize(result.totalSize)} total position size. Average R per 1x unit is ${formatR(result.normalisedR)}.`;
  el('comparison-note').textContent = `${formatAtr(inputs.stopDistance)} stop · every ${formatAtr(inputs.scaleDistance)} · max ${inputs.maxScaleIns} adds · ${sizingLabel(inputs.sizingMode)}`;
  el('ladder-note').textContent = `0 to ${formatAtr(inputs.totalMove)}`;
}

function renderMoveBars(inputs) {
  const results = inputs.comparisonMoves.map(move => ({
    move,
    result: calculateStructure(inputs.stopDistance, inputs.scaleDistance, move, inputs.maxScaleIns, inputs.sizingMode, inputs.sizeSequence)
  }));
  const maxR = Math.max(...results.map(item => item.result.grossUnitR), 1);
  el('move-bars').innerHTML = results.map(item => {
    const width = (item.result.grossUnitR / maxR) * 100;
    return `
      <div class="bar-row">
        <span>${formatAtr(item.move)}</span>
        <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
        <span class="bar-value">${formatR(item.result.grossUnitR)}</span>
      </div>
    `;
  }).join('');
}

function renderExpectancy(inputs, result) {
  const winR = Math.max(result.grossUnitR, 0);
  const lossR = inputs.assumedLossR;
  const breakEven = requiredWinRate(0, winR, lossR);
  el('expectancy-note').textContent = `Using ${formatR(winR)} average winner and ${formatR(lossR)} average loser.`;
  el('breakeven-win-rate').textContent = breakEven > 100 ? '>100%' : formatPct(Math.max(0, breakEven));
  el('expectancy-at-50').textContent = formatR(expectancyAt(50, winR, lossR));
  el('expectancy-table').innerHTML = inputs.expectancyTargets.map(target => {
    const required = requiredWinRate(target, winR, lossR);
    const label = required > 100 ? '>100%' : formatPct(Math.max(0, required));
    const impossible = required > 100;
    return `
      <div class="expectancy-row ${impossible ? 'muted-row' : ''}">
        <span>${formatR(target)}</span>
        <div class="expectancy-track"><div class="expectancy-fill" style="width: ${Math.min(100, Math.max(0, required))}%"></div></div>
        <span class="expectancy-value">${label}</span>
      </div>
    `;
  }).join('');
}

function renderStopOut(inputs, result) {
  const stop = calculateStopOut(result, inputs);
  el('stop-model-note').textContent = `${stop.modelLabel} · stop at ${formatAtr(stop.stopLevel)}`;
  el('stop-out-r').textContent = formatR(stop.stopOutR);
  el('stop-level').textContent = formatAtr(stop.stopLevel);
  el('weighted-entry').textContent = formatAtr(stop.weightedEntry);
  el('stop-out-summary').textContent = `If the trade is stopped at ${formatAtr(stop.stopLevel)}, the combined position would be ${formatR(stop.stopOutR)}. Current selected target is ${formatAtr(inputs.totalMove)} with ${formatSize(result.totalSize)} total position size.`;

  const minLevel = Math.min(stop.stopLevel, -inputs.stopDistance, 0);
  const maxLevel = Math.max(inputs.totalMove, ...result.entries.map(entry => entry.level), stop.stopLevel, 1);
  const span = Math.max(1, maxLevel - minLevel);
  const leftFor = value => ((value - minLevel) / span) * 100;
  const stopClass = stop.stopOutR < 0 ? 'danger' : stop.stopOutR > 0 ? 'good' : 'neutral';
  el('stop-risk-ladder').innerHTML = `
    <div class="risk-track">
      <div class="risk-zone loss" style="left: 0%; width: ${leftFor(stop.weightedEntry)}%"></div>
      <div class="risk-zone profit" style="left: ${leftFor(stop.weightedEntry)}%; width: ${100 - leftFor(stop.weightedEntry)}%"></div>
      ${result.entries.map((entry, index) => `
        <span class="risk-marker entry" style="left: ${leftFor(entry.level)}%" title="${index === 0 ? 'Initial' : `Scale ${index}`} · ${formatAtr(entry.level)} · ${formatSize(entry.size)}"></span>
      `).join('')}
      <span class="risk-marker current" style="left: ${leftFor(inputs.totalMove)}%" title="Current move ${formatAtr(inputs.totalMove)}"></span>
      <span class="risk-marker stop ${stopClass}" style="left: ${leftFor(stop.stopLevel)}%" title="Stop ${formatAtr(stop.stopLevel)}"></span>
    </div>
    <div class="risk-legend">
      <span>Stop: ${formatAtr(stop.stopLevel)}</span>
      <span>Breakeven: ${formatAtr(stop.weightedEntry)}</span>
      <span>Current: ${formatAtr(inputs.totalMove)}</span>
    </div>
  `;
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
        <span class="ladder-r">${formatR(entry.pnlR)}<br><small>${formatSize(entry.size)}</small></span>
      </div>
    `;
  }).join('');
}

function renderPresetComparison(inputs) {
  const moves = inputs.comparisonMoves;
  const allResults = Object.values(presets).flatMap(preset =>
    moves.map(move => calculateStructure(preset.stopDistance, preset.scaleDistance, move, preset.maxScaleIns, preset.sizingMode, parseSizeSequence(preset.sizeSequence)).grossUnitR)
  );
  const maxR = Math.max(...allResults, 1);
  el('preset-comparison').innerHTML = Object.values(presets).map(preset => {
    const rows = moves.map(move => {
      const result = calculateStructure(preset.stopDistance, preset.scaleDistance, move, preset.maxScaleIns, preset.sizingMode, parseSizeSequence(preset.sizeSequence));
      const width = (result.grossUnitR / maxR) * 100;
      return `
        <div class="mini-row">
          <span>${formatAtr(move)}</span>
          <div class="mini-track"><div class="mini-fill" style="width: ${width}%"></div></div>
          <span class="mini-value">${formatR(result.grossUnitR)}</span>
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
  const result = calculateStructure(inputs.stopDistance, inputs.scaleDistance, inputs.totalMove, inputs.maxScaleIns, inputs.sizingMode, inputs.sizeSequence);
  renderStats(inputs, result);
  renderMoveBars(inputs);
  renderExpectancy(inputs, result);
  renderStopOut(inputs, result);
  renderLadder(inputs, result);
  renderPresetComparison(inputs);
}

['stop-distance', 'scale-distance', 'max-scale-ins', 'total-move', 'sizing-mode', 'size-sequence', 'stop-model', 'trailing-stop-distance', 'stop-out-after-r', 'assumed-loss-r', 'expectancy-targets', 'comparison-moves'].forEach(id => {
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
