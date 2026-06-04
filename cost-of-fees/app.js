const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const pct = value => `${value.toFixed(1)}%`;
const precisePct = value => `${value.toFixed(3)}%`;

const defaults = {
  capital: 100000,
  tradeSize: 50000,
  tradesMonth: 20,
  spreadCost: 0.02,
  commission: 3.5,
  commissionBasis: 'side',
  swapCost: 120,
  platformFee: 100,
  grossReturn: 2,
  months: 24
};

const presets = {
  low: { ...defaults, tradeSize: 35000, tradesMonth: 8, spreadCost: 0.01, commission: 2, swapCost: 0, platformFee: 30, grossReturn: 1.5 },
  active: { ...defaults },
  goblin: { ...defaults, tradeSize: 75000, tradesMonth: 95, spreadCost: 0.035, commission: 4, swapCost: 350, platformFee: 160, grossReturn: 2.5 }
};

function value(id) {
  return Number(el(id).value) || 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInputs() {
  return {
    capital: Math.max(100, value('capital')),
    tradeSize: Math.max(0, value('trade-size')),
    tradesMonth: clamp(value('trades-month'), 0, 10000),
    spreadCost: clamp(value('spread-cost'), 0, 1),
    commission: Math.max(0, value('commission')),
    commissionBasis: el('commission-basis').value,
    swapCost: Math.max(0, value('swap-cost')),
    platformFee: Math.max(0, value('platform-fee')),
    grossReturn: clamp(value('gross-return'), -10, 20),
    months: clamp(Math.round(value('months')), 1, 600)
  };
}

function monthlyCosts(inputs) {
  const spread = inputs.tradeSize * (inputs.spreadCost / 100) * inputs.tradesMonth;
  const commissionPerTrade = inputs.commissionBasis === 'side' ? inputs.commission * 2 : inputs.commission;
  const commission = commissionPerTrade * inputs.tradesMonth;
  const swap = inputs.swapCost;
  const platform = inputs.platformFee;
  const total = spread + commission + swap + platform;
  return { spread, commission, swap, platform, total };
}

function project(inputs, costs) {
  const rows = [];
  const monthlyReturn = inputs.grossReturn / 100;
  let gross = inputs.capital;
  let net = inputs.capital;
  for (let month = 1; month <= inputs.months; month++) {
    gross *= 1 + monthlyReturn;
    net = Math.max(0, net * (1 + monthlyReturn) - costs.total);
    rows.push({
      month,
      gross,
      net,
      fees: costs.total * month,
      gap: gross - net
    });
  }
  return rows;
}

function feeReadout(inputs, costs, rows) {
  const final = rows[rows.length - 1];
  const grossProfit = final.gross - inputs.capital;
  const totalFees = costs.total * inputs.months;
  const consumed = grossProfit > 0 ? (totalFees / grossProfit) * 100 : 0;
  if (grossProfit <= 0) return 'Gross profit is not positive in this projection, so fees are adding pain to an already negative path.';
  if (consumed >= 100) return `Fees consume more than the projected gross profit over ${inputs.months} months. That is not a leak; that is the pipe missing.`;
  if (consumed >= 50) return `Fees consume ${pct(consumed)} of the projected gross profit over ${inputs.months} months. The edge needs to be very real.`;
  if (consumed >= 25) return `Fees consume ${pct(consumed)} of the projected gross profit over ${inputs.months} months. Not fatal, but absolutely not background noise.`;
  return `Fees consume ${pct(consumed)} of the projected gross profit over ${inputs.months} months. Manageable, assuming the gross return is real.`;
}

function dominantCost(costs) {
  const parts = [
    ['Spreads', costs.spread],
    ['Commissions', costs.commission],
    ['Swap/overnight', costs.swap],
    ['Platform fees', costs.platform]
  ].sort((a, b) => b[1] - a[1]);
  if (costs.total <= 0) return 'No costs entered. The calculator is now suspiciously optimistic.';
  const [name, amount] = parts[0];
  const share = amount / costs.total * 100;
  return `${name} are doing most of the nibbling here at ${pct(share)} of monthly costs.`;
}

function drawGrowthChart(canvas, rows, capital) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 38;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);
  const max = Math.max(capital, ...rows.flatMap(row => [row.gross, row.net]));
  const min = Math.min(capital, ...rows.flatMap(row => [row.gross, row.net]));
  const span = Math.max(1, max - min);
  const x = index => pad + ((w - pad * 2) * index / Math.max(1, rows.length));
  const y = value => h - pad - ((h - pad * 2) * (value - min) / span);

  ctx.strokeStyle = 'rgba(218,228,215,.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const yy = pad + ((h - pad * 2) * i / 4);
    ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke();
  }

  const drawLine = (key, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x(0), y(capital));
    rows.forEach((row, index) => ctx.lineTo(x(index + 1), y(row[key])));
    ctx.stroke();
  };

  drawLine('gross', '#CFFC54');
  drawLine('net', '#FF5C00');
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = '#CFFC54';
  ctx.fillText('gross', pad, 22);
  ctx.fillStyle = '#FF5C00';
  ctx.fillText('net after fees', pad + 62, 22);
  ctx.fillStyle = 'rgba(255,255,255,.68)';
  ctx.textAlign = 'right';
  ctx.fillText(fmt(max), w - pad, 22);
  ctx.fillText(fmt(min), w - pad, h - 12);
  ctx.textAlign = 'left';
}

function drawCostChart(canvas, costs) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 34;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);
  const bars = [
    { label: 'Spread', value: costs.spread, color: '#CFFC54' },
    { label: 'Commission', value: costs.commission, color: '#D6DAF3' },
    { label: 'Swap', value: costs.swap, color: '#597A77' },
    { label: 'Platform', value: costs.platform, color: '#FF5C00' }
  ];
  const max = Math.max(...bars.map(bar => bar.value), 1);
  const gap = 18;
  const barW = (w - pad * 2 - gap * (bars.length - 1)) / bars.length;
  ctx.font = '800 13px system-ui, sans-serif';
  bars.forEach((bar, index) => {
    const barH = ((h - pad * 2 - 34) * bar.value) / max;
    const x = pad + index * (barW + gap);
    const y = h - pad - barH - 24;
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(fmt(bar.value), x + barW / 2, Math.max(18, y - 8));
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.fillText(bar.label, x + barW / 2, h - 18);
  });
  ctx.textAlign = 'left';
}

function renderTable(inputs, rows) {
  const every = Math.max(1, Math.ceil(inputs.months / 8));
  const selected = rows.filter(row => row.month === 1 || row.month === inputs.months || row.month % every === 0);
  el('projection-table').innerHTML = `
    <div class="projection-row header">
      <span>Month</span><span>Gross balance</span><span>Net balance</span><span>Total fees</span><span>Gross-net gap</span>
    </div>
    ${selected.map(row => `
      <div class="projection-row">
        <strong class="month">${row.month}</strong>
        <span class="gross">${fmt(row.gross)}</span>
        <span class="net">${fmt(row.net)}</span>
        <span class="fee">${fmt(row.fees)}</span>
        <span class="gap">${fmt(row.gap)}</span>
      </div>
    `).join('')}
  `;
}

function calculate() {
  const inputs = getInputs();
  const costs = monthlyCosts(inputs);
  const rows = project(inputs, costs);
  const final = rows[rows.length - 1];
  const totalFees = costs.total * inputs.months;
  const grossProfit = final.gross - inputs.capital;
  const netProfit = final.net - inputs.capital;
  const consumed = grossProfit > 0 ? (totalFees / grossProfit) * 100 : 0;
  const monthlyDrag = costs.total / inputs.capital * 100;

  el('spread-label').textContent = precisePct(inputs.spreadCost);
  el('return-label').textContent = pct(inputs.grossReturn);
  el('fee-drag-headline').textContent = `${pct(monthlyDrag)} / month`;
  el('fee-drag-context').textContent = `${fmt(costs.total)} monthly cost estimate`;
  el('monthly-cost').textContent = fmt(costs.total);
  el('annual-drag').textContent = pct(monthlyDrag * 12);
  el('gross-ending').textContent = fmt(final.gross);
  el('net-ending').textContent = fmt(final.net);
  el('readout').textContent = feeReadout(inputs, costs, rows);
  el('cost-mix').textContent = dominantCost(costs);
  el('summary-pill').textContent = `${inputs.months} month projection`;
  el('total-fees').textContent = fmt(totalFees);
  el('gross-profit').textContent = fmt(grossProfit);
  el('net-profit').textContent = fmt(netProfit);
  el('profit-consumed').textContent = grossProfit > 0 ? pct(consumed) : 'n/a';

  drawGrowthChart(el('growth-chart'), rows, inputs.capital);
  drawCostChart(el('cost-chart'), costs);
  renderTable(inputs, rows);
}

function setValues(values) {
  el('capital').value = values.capital;
  el('trade-size').value = values.tradeSize;
  el('trades-month').value = values.tradesMonth;
  el('spread-cost').value = values.spreadCost;
  el('commission').value = values.commission;
  el('commission-basis').value = values.commissionBasis;
  el('swap-cost').value = values.swapCost;
  el('platform-fee').value = values.platformFee;
  el('gross-return').value = values.grossReturn;
  el('months').value = values.months;
}

function selectPreset(name) {
  setValues(presets[name]);
  document.querySelectorAll('.preset').forEach(button => {
    button.classList.toggle('active', button.dataset.preset === name);
  });
  calculate();
}

function reset() {
  selectPreset('active');
}

document.querySelectorAll('input, select').forEach(input => input.addEventListener('input', calculate));
document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => selectPreset(button.dataset.preset)));
el('calculate').addEventListener('click', calculate);
el('reset').addEventListener('click', reset);
calculate();
