const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inputs() {
  return {
    capital: clamp(Number(el('capital').value) || 100000, 100, 100000000),
    trades: Math.round(clamp(Number(el('trades').value) || 100, 1, 1000)),
    winRate: clamp(Number(el('win-rate').value) || 50, 1, 99) / 100,
    riskReward: clamp(Number(el('risk-reward').value) || 3, 0.1, 20),
    riskPerTrade: clamp(Number(el('risk-per-trade').value) || 1, 0.1, 20) / 100,
    simulations: Math.round(clamp(Number(el('simulations').value) || 2000, 100, 10000))
  };
}

function calculateMetrics(config) {
  const oneR = config.capital * config.riskPerTrade;
  const rewardAmount = config.riskReward * oneR;
  const expectancyCash = config.winRate * rewardAmount - (1 - config.winRate) * oneR;
  const expectancyR = expectancyCash / oneR;
  const expectedReturn = expectancyCash * config.trades;
  const returnPercentage = expectedReturn / config.capital;
  return { oneR, rewardAmount, expectancyCash, expectancyR, expectedReturn, returnPercentage };
}

function shuffledOutcomeCurve(config, metrics) {
  const wins = Math.round(config.winRate * config.trades);
  const outcomes = Array.from({ length: config.trades }, (_, i) => i < wins ? 1 : -1);
  for (let i = outcomes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
  }
  let equity = config.capital;
  return [equity, ...outcomes.map(outcome => {
    equity += outcome > 0 ? metrics.rewardAmount : -metrics.oneR;
    return equity;
  })];
}

function simulateMaxDrawdown(config, metrics) {
  let equity = config.capital;
  let peak = config.capital;
  let maxDrawdown = 0;
  for (let i = 0; i < config.trades; i++) {
    equity += Math.random() < config.winRate ? metrics.rewardAmount : -metrics.oneR;
    equity = Math.max(0, equity);
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? (peak - equity) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  return maxDrawdown * 100;
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function runSimulation(config, metrics) {
  const drawdowns = Array.from({ length: config.simulations }, () => simulateMaxDrawdown(config, metrics));
  return {
    drawdowns,
    p50: percentile(drawdowns, 50),
    p80: percentile(drawdowns, 80),
    p95: percentile(drawdowns, 95),
    worst: Math.max(...drawdowns)
  };
}

function describe(config, metrics, sim) {
  if (metrics.expectancyR <= 0) return 'This setup has zero or negative expectancy. Position sizing cannot rescue a bad edge; it can only decide how quickly the lesson arrives.';
  if (sim.p95 > 50) return 'Positive expectancy, but the estimated drawdown is savage. Lower risk per trade unless you enjoy emotional archaeology.';
  if (sim.p95 > 30) return 'The edge is there, but the drawdown is chunky. This may be tradable only with discipline and realistic expectations.';
  if (metrics.returnPercentage > 1 && sim.p95 < 25) return 'Strong objective fit: return is ambitious and the drawdown estimate is still reasonably contained.';
  return 'This setup has positive expectancy. Now check whether the drawdown is survivable.';
}

function drawLineChart(canvas, values, startValue) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);
  const min = Math.min(...values, startValue * 0.8);
  const max = Math.max(...values, startValue * 1.2);
  ctx.strokeStyle = 'rgba(218,228,215,.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + ((h - pad * 2) * i / 4);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  const scaleY = value => h - pad - ((value - min) / Math.max(1, max - min)) * (h - pad * 2);
  ctx.strokeStyle = '#597A77';
  ctx.beginPath(); ctx.moveTo(pad, scaleY(startValue)); ctx.lineTo(w - pad, scaleY(startValue)); ctx.stroke();
  ctx.strokeStyle = values.at(-1) >= startValue ? '#CFFC54' : '#FF5C00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  values.forEach((value, i) => {
    const x = pad + ((w - pad * 2) * (values.length === 1 ? 0 : i / (values.length - 1)));
    const y = scaleY(value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawHistogram(canvas, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);
  const maxValue = Math.max(1, ...values);
  const buckets = Array.from({ length: 24 }, () => 0);
  values.forEach(value => {
    const idx = Math.min(buckets.length - 1, Math.floor((value / maxValue) * buckets.length));
    buckets[idx] += 1;
  });
  const maxBucket = Math.max(...buckets, 1);
  const gap = 3;
  const barW = (w - pad * 2 - gap * (buckets.length - 1)) / buckets.length;
  buckets.forEach((count, i) => {
    const barH = ((h - pad * 2) * count) / maxBucket;
    const x = pad + i * (barW + gap);
    const y = h - pad - barH;
    ctx.fillStyle = i / buckets.length > 0.7 ? '#FF5C00' : '#CFFC54';
    ctx.fillRect(x, y, barW, barH);
  });
}

function updateLabels() {
  el('win-rate-label').textContent = `${Number(el('win-rate').value).toFixed(0)}%`;
  el('risk-label').textContent = `${Number(el('risk-per-trade').value).toFixed(2)}%`;
}

function calculate() {
  updateLabels();
  const config = inputs();
  const metrics = calculateMetrics(config);
  const sim = runSimulation(config, metrics);
  const curve = shuffledOutcomeCurve(config, metrics);

  el('one-r').textContent = fmt(metrics.oneR);
  el('risk-summary').textContent = `${(config.riskPerTrade * 100).toFixed(2)}% of ${fmt(config.capital)}`;
  el('return-percentage').textContent = `${metrics.returnPercentage >= 0 ? '+' : ''}${(metrics.returnPercentage * 100).toFixed(1)}%`;
  el('expectancy-r').textContent = `${metrics.expectancyR >= 0 ? '+' : ''}${metrics.expectancyR.toFixed(2)}R`;
  el('expectancy-cash').textContent = fmt(metrics.expectancyCash);
  el('drawdown-p95').textContent = `${sim.p95.toFixed(1)}%`;
  el('readout').textContent = describe(config, metrics, sim);

  drawLineChart(el('equity-chart'), curve, config.capital);
  drawHistogram(el('drawdown-chart'), sim.drawdowns);
}

function reset() {
  el('capital').value = 100000;
  el('trades').value = 100;
  el('win-rate').value = 50;
  el('risk-reward').value = 3;
  el('risk-per-trade').value = 1;
  el('simulations').value = 2000;
  calculate();
}

['capital', 'trades', 'win-rate', 'risk-reward', 'risk-per-trade', 'simulations'].forEach(id => {
  el(id).addEventListener('input', calculate);
  el(id).addEventListener('change', calculate);
});
el('calculate').addEventListener('click', calculate);
el('reset').addEventListener('click', reset);
calculate();
