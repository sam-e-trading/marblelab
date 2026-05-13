const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const fmtSigned = value => `${value >= 0 ? '+' : ''}${fmt(value)}`;

let monthlyReturns = [];
let pathSignature = '';

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function pct(value, digits = 1) { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

function inputs() {
  const years = clamp(Number(el('years').value) || 0, 0, 50);
  const extraMonths = clamp(Number(el('months').value) || 0, 0, 11);
  const maxLoss = clamp(Number(el('max-loss').value) || -15, -80, 0) / 100;
  const maxWin = clamp(Number(el('max-win').value) || 25, 0, 150) / 100;
  return {
    capital: clamp(Number(el('capital').value) || 100000, 100, 100000000),
    months: Math.max(1, Math.round(years * 12 + extraMonths)),
    monthlyReturn: clamp(Number(el('monthly-return').value) || 0, -10, 20) / 100,
    monthlyVol: clamp(Number(el('monthly-vol').value) || 0, 0, 30) / 100,
    maxLoss: Math.min(maxLoss, maxWin),
    maxWin: Math.max(maxLoss, maxWin),
    cashflow: clamp(Number(el('cashflow').value) || 0, -1000000, 1000000),
    simulations: Math.round(clamp(Number(el('simulations').value) || 2000, 100, 10000)),
    model: el('model').value
  };
}

function signature(config) {
  return [config.months, config.monthlyReturn, config.monthlyVol, config.maxLoss, config.maxWin].join('|');
}

function randomNormal() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generateReturns(config) {
  monthlyReturns = Array.from({ length: config.months }, () => clamp(config.monthlyReturn + randomNormal() * config.monthlyVol, config.maxLoss, config.maxWin));
  pathSignature = signature(config);
}

function ensureReturns(config) {
  if (monthlyReturns.length !== config.months || pathSignature !== signature(config)) generateReturns(config);
}

function smoothPath(config) {
  let balance = config.capital;
  const values = [balance];
  for (let i = 0; i < config.months; i++) {
    balance = Math.max(0, balance * (1 + config.monthlyReturn) + config.cashflow);
    values.push(balance);
  }
  return values;
}

function calculatePath(config, returns = monthlyReturns, model = config.model) {
  let balance = config.capital;
  let peak = balance;
  let maxDrawdown = 0;
  const rows = [];
  const values = [balance];

  returns.forEach((monthlyReturn, index) => {
    const startBalance = balance;
    let pnl;
    if (model === 'compound') pnl = startBalance * monthlyReturn;
    if (model === 'simple') pnl = config.capital * monthlyReturn;
    if (model === 'fixed-base') pnl = config.capital * monthlyReturn;
    balance = Math.max(0, startBalance + pnl + config.cashflow);
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - balance) / peak : 0);
    rows.push({ month: index + 1, returnPct: monthlyReturn, startBalance, pnl, cashflow: config.cashflow, endBalance: balance });
    values.push(balance);
  });

  return { values, rows, ending: balance, maxDrawdown };
}

function simulatePath(config) {
  const returns = Array.from({ length: config.months }, () => clamp(config.monthlyReturn + randomNormal() * config.monthlyVol, config.maxLoss, config.maxWin));
  return calculatePath(config, returns, config.model);
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function run(config) {
  const paths = Array.from({ length: config.simulations }, () => simulatePath(config));
  const endings = paths.map(p => p.ending);
  const dds = paths.map(p => p.maxDrawdown);
  return {
    paths,
    endings,
    p10: percentile(endings, 10),
    p50: percentile(endings, 50),
    p90: percentile(endings, 90),
    p95Drawdown: percentile(dds, 95),
    chanceBelowStart: endings.filter(v => v < config.capital).length / endings.length
  };
}

function modelLabel(model) {
  return {
    compound: 'Fully compounded',
    simple: 'Simple / non-compounded',
    'fixed-base': 'Fixed base'
  }[model] || 'Fully compounded';
}

function modelReadout(model) {
  if (model === 'compound') return 'Fully compounded: each month applies to the current balance, so losses shrink the base and gains grow it.';
  if (model === 'simple') return 'Simple mode: each return applies to starting capital, useful as a clean comparison rather than real account behaviour.';
  return 'Fixed base: returns apply to the original account size, like a trader who does not scale size up or down with equity.';
}

function drawGrowth(canvas, smooth, actual, start) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const values = smooth.concat(actual);
  const min = Math.min(...values, start * 0.8);
  const max = Math.max(...values, start * 1.2);
  const y = value => h - pad - ((value - min) / Math.max(1, max - min)) * (h - pad * 2);
  const x = (i, len) => pad + ((w - pad * 2) * (len === 1 ? 0 : i / (len - 1)));
  ctx.strokeStyle = 'rgba(218,228,215,.16)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const yy = pad + ((h - pad * 2) * i / 4); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke(); }
  ctx.strokeStyle = '#D6DAF3'; ctx.lineWidth = 3; ctx.beginPath();
  smooth.forEach((v, i) => i ? ctx.lineTo(x(i, smooth.length), y(v)) : ctx.moveTo(x(i, smooth.length), y(v))); ctx.stroke();
  ctx.strokeStyle = '#CFFC54'; ctx.lineWidth = 4; ctx.beginPath();
  actual.forEach((v, i) => i ? ctx.lineTo(x(i, actual.length), y(v)) : ctx.moveTo(x(i, actual.length), y(v))); ctx.stroke();
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = '#D6DAF3'; ctx.fillRect(pad, 12, 14, 4); ctx.fillText('smooth path', pad + 20, 17);
  ctx.fillStyle = '#CFFC54'; ctx.fillRect(pad + 130, 12, 14, 4); ctx.fillText('selected model', pad + 150, 17);
  ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillText('start', pad, h - 8);
  ctx.textAlign = 'right'; ctx.fillText('end', w - pad, h - 8); ctx.textAlign = 'left';
}

function drawReturns(canvas, returns) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 30;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const maxAbs = Math.max(0.01, ...returns.map(v => Math.abs(v)));
  const zeroY = h / 2;
  ctx.strokeStyle = 'rgba(218,228,215,.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, zeroY); ctx.lineTo(w - pad, zeroY); ctx.stroke();
  const gap = 2;
  const barW = Math.max(2, (w - pad * 2 - gap * (returns.length - 1)) / returns.length);
  returns.forEach((value, i) => {
    const barH = (Math.abs(value) / maxAbs) * (h / 2 - pad);
    const x = pad + i * (barW + gap);
    const y = value >= 0 ? zeroY - barH : zeroY;
    ctx.fillStyle = value >= 0 ? '#CFFC54' : '#FF5C00';
    ctx.fillRect(x, y, barW, barH);
  });
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText('positive months', pad, 18);
  ctx.fillText('negative months', pad, h - 10);
  ctx.textAlign = 'right';
  ctx.fillText(`max ${pct(maxAbs, 1)} / min ${pct(-maxAbs, 1)}`, w - pad, 18);
  ctx.textAlign = 'left';
}

function drawHistogram(canvas, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const min = Math.min(...values), max = Math.max(...values);
  const buckets = Array.from({ length: 28 }, () => 0);
  values.forEach(v => { const idx = Math.min(buckets.length - 1, Math.floor(((v - min) / Math.max(1, max - min)) * buckets.length)); buckets[idx]++; });
  const maxBucket = Math.max(...buckets, 1), gap = 3, barW = (w - pad * 2 - gap * (buckets.length - 1)) / buckets.length;
  buckets.forEach((count, i) => { const barH = ((h - pad * 2) * count) / maxBucket; ctx.fillStyle = i < buckets.length * .25 ? '#FF5C00' : '#CFFC54'; ctx.fillRect(pad + i * (barW + gap), h - pad - barH, barW, barH); });
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(`lower outcomes · ${fmt(min)}`, pad, h - 8);
  ctx.textAlign = 'right'; ctx.fillText(`higher outcomes · ${fmt(max)}`, w - pad, h - 8); ctx.textAlign = 'left';
}

function readout(config, smooth, sim, path) {
  if (config.monthlyReturn < 0) return 'Negative average return compounds exactly as rudely as you would expect.';
  if (config.monthlyVol === 0) return 'This is the smooth fiction version. Useful, but suspiciously well behaved.';
  if (path.maxDrawdown > 0.25) return 'The monthly path shows the lesson: negative months reduce the base future gains compound from.';
  if (sim.chanceBelowStart > 0.35) return 'There is a chunky chance of finishing below the starting balance. The left tail is doing crimes.';
  if (sim.p95Drawdown > 0.4) return 'The ending balance may look attractive, but the drawdown profile is spicy. Possibly too spicy.';
  if (smooth.at(-1) > config.capital * 2) return 'Compounding is doing real work here. Keep one eye on the path, not just the destination.';
  return 'Smooth path looks tidy. The month-by-month path shows where compounding gets polite or painful.';
}

function renderMonthlyTable(rows) {
  const visibleRows = rows.slice(0, 120);
  el('monthly-table').innerHTML = `
    <div class="monthly-row header"><span>Month</span><span>Return</span><span>Start</span><span>P/L</span><span>Cashflow</span><span>End</span></div>
    ${visibleRows.map(row => `
      <div class="monthly-row">
        <strong>Month ${row.month}</strong>
        <strong class="${row.returnPct >= 0 ? 'positive' : 'negative'}">${pct(row.returnPct, 1)}</strong>
        <span>${fmt(row.startBalance)}</span>
        <span class="${row.pnl >= 0 ? 'positive' : 'negative'}">${fmtSigned(row.pnl)}</span>
        <span class="${row.cashflow >= 0 ? 'positive' : 'negative'}">${fmtSigned(row.cashflow)}</span>
        <strong>${fmt(row.endBalance)}</strong>
      </div>`).join('')}
  `;
}

function calculate({ regenerate = false } = {}) {
  const config = inputs();
  if (regenerate) generateReturns(config); else ensureReturns(config);
  el('return-label').textContent = `${(config.monthlyReturn * 100).toFixed(2)}%`;
  el('vol-label').textContent = `${(config.monthlyVol * 100).toFixed(1)}%`;
  const smooth = smoothPath(config);
  const path = calculatePath(config);
  const sim = run(config);
  const smoothEnding = smooth.at(-1);
  el('smooth-ending').textContent = fmt(smoothEnding);
  el('smooth-return').textContent = `${pct(smoothEnding / config.capital - 1)} total return`;
  el('median-ending').textContent = fmt(sim.p50);
  el('p10-ending').textContent = fmt(sim.p10);
  el('p90-ending').textContent = fmt(sim.p90);
  el('p95-dd').textContent = `${(sim.p95Drawdown * 100).toFixed(1)}%`;
  el('readout').textContent = readout(config, smooth, sim, path);
  el('risk-check').textContent = `${(sim.chanceBelowStart * 100).toFixed(1)}% of simulations finished below starting capital. Current path max drawdown: ${(path.maxDrawdown * 100).toFixed(1)}%.`;
  el('model-summary').textContent = modelReadout(config.model);
  drawReturns(el('returns-chart'), monthlyReturns);
  drawGrowth(el('growth-chart'), smooth, path.values, config.capital);
  drawHistogram(el('distribution-chart'), sim.endings);
  renderMonthlyTable(path.rows);
}

function reset() {
  el('capital').value = 100000;
  el('years').value = 3;
  el('months').value = 0;
  el('monthly-return').value = 1.65;
  el('monthly-vol').value = 5;
  el('max-loss').value = -15;
  el('max-win').value = 25;
  el('cashflow').value = 0;
  el('simulations').value = 2000;
  el('model').value = 'compound';
  calculate({ regenerate: true });
}

['capital','years','months','monthly-return','monthly-vol','max-loss','max-win','cashflow','simulations','model'].forEach(id => {
  el(id).addEventListener('input', () => calculate());
  el(id).addEventListener('change', () => calculate());
});
el('calculate').addEventListener('click', () => calculate());
el('generate-path').addEventListener('click', () => calculate({ regenerate: true }));
el('reset').addEventListener('click', reset);
calculate({ regenerate: true });
