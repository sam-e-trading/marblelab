const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function pct(value) { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`; }

function inputs() {
  const years = clamp(Number(el('years').value) || 0, 0, 50);
  const extraMonths = clamp(Number(el('months').value) || 0, 0, 11);
  return {
    capital: clamp(Number(el('capital').value) || 100000, 100, 100000000),
    months: Math.max(1, Math.round(years * 12 + extraMonths)),
    monthlyReturn: clamp(Number(el('monthly-return').value) || 0, -10, 20) / 100,
    monthlyVol: clamp(Number(el('monthly-vol').value) || 0, 0, 30) / 100,
    cashflow: clamp(Number(el('cashflow').value) || 0, -1000000, 1000000),
    simulations: Math.round(clamp(Number(el('simulations').value) || 2000, 100, 10000))
  };
}

function randomNormal() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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

function simulatePath(config) {
  let balance = config.capital;
  let peak = balance;
  let maxDrawdown = 0;
  const values = [balance];
  for (let i = 0; i < config.months; i++) {
    const monthly = clamp(config.monthlyReturn + randomNormal() * config.monthlyVol, -0.8, 1.5);
    balance = Math.max(0, balance * (1 + monthly) + config.cashflow);
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - balance) / peak : 0);
    values.push(balance);
  }
  return { values, ending: balance, maxDrawdown };
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
  const medianEnding = percentile(endings, 50);
  const medianPath = Array.from({ length: config.months + 1 }, (_, month) => percentile(paths.map(p => p.values[month]), 50));
  return {
    paths,
    endings,
    medianPath,
    p10: percentile(endings, 10),
    p50: medianEnding,
    p90: percentile(endings, 90),
    p95Drawdown: percentile(dds, 95),
    chanceBelowStart: endings.filter(v => v < config.capital).length / endings.length
  };
}

function drawGrowth(canvas, smooth, median, start) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 28;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const values = smooth.concat(median);
  const min = Math.min(...values, start * 0.8);
  const max = Math.max(...values, start * 1.2);
  const y = value => h - pad - ((value - min) / Math.max(1, max - min)) * (h - pad * 2);
  const x = (i, len) => pad + ((w - pad * 2) * (len === 1 ? 0 : i / (len - 1)));
  ctx.strokeStyle = 'rgba(218,228,215,.16)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const yy = pad + ((h - pad * 2) * i / 4); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke(); }
  ctx.strokeStyle = '#D6DAF3'; ctx.lineWidth = 3; ctx.beginPath();
  smooth.forEach((v, i) => i ? ctx.lineTo(x(i, smooth.length), y(v)) : ctx.moveTo(x(i, smooth.length), y(v))); ctx.stroke();
  ctx.strokeStyle = '#CFFC54'; ctx.lineWidth = 4; ctx.beginPath();
  median.forEach((v, i) => i ? ctx.lineTo(x(i, median.length), y(v)) : ctx.moveTo(x(i, median.length), y(v))); ctx.stroke();
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = '#D6DAF3'; ctx.fillRect(pad, 12, 14, 4); ctx.fillText('smooth path', pad + 20, 17);
  ctx.fillStyle = '#CFFC54'; ctx.fillRect(pad + 130, 12, 14, 4); ctx.fillText('median simulation', pad + 150, 17);
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.fillText('start', pad, h - 8);
  ctx.textAlign = 'right'; ctx.fillText('end', w - pad, h - 8);
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
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(`lower outcomes · ${fmt(min)}`, pad, h - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`higher outcomes · ${fmt(max)}`, w - pad, h - 8);
  ctx.textAlign = 'left';
}

function readout(config, smooth, sim) {
  if (config.monthlyReturn < 0) return 'Negative average return compounds exactly as rudely as you would expect.';
  if (config.monthlyVol === 0) return 'This is the smooth fiction version. Useful, but suspiciously well behaved.';
  if (sim.chanceBelowStart > 0.35) return 'There is a chunky chance of finishing below the starting balance. The left tail is doing crimes.';
  if (sim.p95Drawdown > 0.4) return 'The ending balance may look attractive, but the drawdown profile is spicy. Possibly too spicy.';
  if (smooth.at(-1) > config.capital * 2) return 'Compounding is doing real work here. Keep one eye on the path, not just the destination.';
  return 'Smooth path looks tidy. Simulated path is less polite.';
}

function calculate() {
  const config = inputs();
  el('return-label').textContent = `${(config.monthlyReturn * 100).toFixed(2)}%`;
  el('vol-label').textContent = `${(config.monthlyVol * 100).toFixed(1)}%`;
  const smooth = smoothPath(config);
  const sim = run(config);
  const smoothEnding = smooth.at(-1);
  el('smooth-ending').textContent = fmt(smoothEnding);
  el('smooth-return').textContent = `${pct(smoothEnding / config.capital - 1)} total return`;
  el('median-ending').textContent = fmt(sim.p50);
  el('p10-ending').textContent = fmt(sim.p10);
  el('p90-ending').textContent = fmt(sim.p90);
  el('p95-dd').textContent = `${(sim.p95Drawdown * 100).toFixed(1)}%`;
  el('readout').textContent = readout(config, smooth, sim);
  el('risk-check').textContent = `${(sim.chanceBelowStart * 100).toFixed(1)}% of simulations finished below starting capital.`;
  drawGrowth(el('growth-chart'), smooth, sim.medianPath, config.capital);
  drawHistogram(el('distribution-chart'), sim.endings);
}

function reset() {
  el('capital').value = 100000; el('years').value = 3; el('months').value = 0; el('monthly-return').value = 1.65; el('monthly-vol').value = 5; el('cashflow').value = 0; el('simulations').value = 2000; calculate();
}

['capital','years','months','monthly-return','monthly-vol','cashflow','simulations'].forEach(id => { el(id).addEventListener('input', calculate); el(id).addEventListener('change', calculate); });
el('calculate').addEventListener('click', calculate);
el('reset').addEventListener('click', reset);
calculate();
