const el = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const signedMoney = value => `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`;
const signedR = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`;
const pct = value => `${value.toFixed(1)}%`;

const comparisonStrategies = [
  { name: '90% small win', winRate: 90, avgWin: 0.1, avgLoss: 1, trades: 10, description: '+$10 wins, -$100 losses' },
  { name: '60% medium win', winRate: 60, avgWin: 1.5, avgLoss: 1, trades: 10, description: '+$150 wins, -$100 losses' },
  { name: '30% large win', winRate: 30, avgWin: 5, avgLoss: 1, trades: 10, description: '+$500 wins, -$100 losses' }
];

let simulationSeed = 7;

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function expectancyR(winRate, avgWin, avgLoss) {
  const winProb = winRate / 100;
  return (winProb * avgWin) - ((1 - winProb) * avgLoss);
}

function breakEvenWinRate(avgWin, avgLoss) {
  return (avgLoss / (avgWin + avgLoss)) * 100;
}

function seededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function currentInputs() {
  return {
    winRate: clamp(el('win-rate').value, 1, 99, 60),
    avgWin: clamp(el('avg-win').value, 0.01, 50, 1.5),
    avgLoss: clamp(el('avg-loss').value, 0.01, 50, 1),
    tradesMonth: Math.round(clamp(el('trades-month').value, 1, 200, 10)),
    capital: clamp(el('capital').value, 100, 100000000, 100000),
    risk: clamp(el('risk').value, 0.1, 10, 1),
    months: Math.round(clamp(el('months').value, 1, 60, 12)),
    paths: Math.round(clamp(el('paths').value, 1, 120, 80))
  };
}

function readoutFor(edge, winRate, breakEven) {
  if (edge > 0.01) {
    return `This setup has positive expectancy. It can still lose over short samples, but the long-run math is tilted by ${signedR(edge)} per trade.`;
  }
  if (edge < -0.01) {
    return `This setup has negative expectancy. The win rate needs to clear ${pct(breakEven)}, or the payoff profile needs work.`;
  }
  return `This setup is roughly break-even before costs. After spread, slippage, and mistakes, flat math usually becomes expensive.`;
}

function drawStrategyChart(canvas, userProfile) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 38;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);

  const bars = [
    ...comparisonStrategies.map(strategy => ({
      label: strategy.name,
      value: expectancyR(strategy.winRate, strategy.avgWin, strategy.avgLoss) * strategy.trades,
      color: strategy.winRate === 90 ? '#FF5C00' : '#CFFC54'
    })),
    { label: 'Your setup', value: userProfile.monthlyR, color: '#D6DAF3' }
  ];
  const maxAbs = Math.max(...bars.map(bar => Math.abs(bar.value)), 1);
  const zeroY = h - pad - ((h - pad * 2) / 2);
  const gap = 18;
  const barW = (w - pad * 2 - gap * (bars.length - 1)) / bars.length;

  ctx.strokeStyle = 'rgba(218,228,215,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(w - pad, zeroY);
  ctx.stroke();

  ctx.font = '800 13px system-ui, sans-serif';
  bars.forEach((bar, i) => {
    const x = pad + i * (barW + gap);
    const barH = ((h - pad * 2) / 2) * (Math.abs(bar.value) / maxAbs);
    const y = bar.value >= 0 ? zeroY - barH : zeroY;
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barW, Math.max(2, barH));
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(signedR(bar.value), x + barW / 2, bar.value >= 0 ? y - 8 : y + barH + 18);
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    wrapText(ctx, bar.label, x + barW / 2, h - 25, barW + 8, 15);
  });
  ctx.textAlign = 'left';
}

function drawEquityChart(canvas, inputs) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 34;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);

  const trades = inputs.months * inputs.tradesMonth;
  const random = seededRandom(simulationSeed);
  const paths = [];
  for (let p = 0; p < inputs.paths; p++) {
    let equity = inputs.capital;
    const path = [equity];
    for (let t = 0; t < trades; t++) {
      const riskAmount = equity * (inputs.risk / 100);
      const resultR = random() < inputs.winRate / 100 ? inputs.avgWin : -inputs.avgLoss;
      equity = Math.max(0, equity + riskAmount * resultR);
      path.push(equity);
    }
    paths.push(path);
  }

  let minValue = inputs.capital;
  let maxValue = inputs.capital;
  paths.forEach(path => {
    path.forEach(value => {
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    });
  });
  const min = minValue * 0.98;
  const max = maxValue * 1.02;
  const x = index => pad + ((w - pad * 2) * (index / Math.max(1, trades)));
  const y = value => h - pad - ((h - pad * 2) * ((value - min) / Math.max(1, max - min)));

  ctx.strokeStyle = 'rgba(218,228,215,.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const yy = pad + ((h - pad * 2) * i / 3);
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(w - pad, yy);
    ctx.stroke();
  }

  paths.forEach(path => {
    ctx.strokeStyle = 'rgba(214,218,243,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    path.forEach((value, index) => {
      if (index === 0) ctx.moveTo(x(index), y(value));
      else ctx.lineTo(x(index), y(value));
    });
    ctx.stroke();
  });

  const averagePath = [];
  for (let i = 0; i <= trades; i++) {
    averagePath.push(paths.reduce((sum, path) => sum + path[i], 0) / paths.length);
  }
  ctx.strokeStyle = '#CFFC54';
  ctx.lineWidth = 4;
  ctx.beginPath();
  averagePath.forEach((value, index) => {
    if (index === 0) ctx.moveTo(x(index), y(value));
    else ctx.lineTo(x(index), y(value));
  });
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(pad, y(inputs.capital));
  ctx.lineTo(w - pad, y(inputs.capital));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText(`Start ${money(inputs.capital)}`, pad, y(inputs.capital) - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`${trades} simulated trades`, w - pad, h - 12);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineNumber = 0;
  words.forEach(word => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineNumber * lineHeight);
      line = word;
      lineNumber += 1;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line, x, y + lineNumber * lineHeight);
}

function renderStrategyCards() {
  el('strategy-cards').innerHTML = comparisonStrategies.map(strategy => {
    const edge = expectancyR(strategy.winRate, strategy.avgWin, strategy.avgLoss);
    const monthly = edge * strategy.trades;
    const result = monthly * 100;
    return `
      <article class="strategy-card">
        <small>${strategy.winRate}% win rate</small>
        <h3>${strategy.name}</h3>
        <p class="meta">${strategy.description}. Average profile: +${strategy.avgWin.toFixed(1)}R win, -${strategy.avgLoss.toFixed(1)}R loss.</p>
        <strong class="${monthly < 0 ? 'negative' : ''}">${signedR(monthly)} / month</strong>
        <p class="meta">${signedMoney(result)} per 10 trades when 1R is $100.</p>
      </article>
    `;
  }).join('');
}

function calculate() {
  const inputs = currentInputs();
  const edge = expectancyR(inputs.winRate, inputs.avgWin, inputs.avgLoss);
  const monthlyR = edge * inputs.tradesMonth;
  const riskAmount = inputs.capital * (inputs.risk / 100);
  const monthlyCash = monthlyR * riskAmount;
  const breakEven = breakEvenWinRate(inputs.avgWin, inputs.avgLoss);
  const isPositive = edge > 0.000001;

  el('win-rate-label').textContent = `${inputs.winRate}%`;
  el('risk-label').textContent = `${inputs.risk.toFixed(2)}%`;
  el('expectancy-r').textContent = signedR(edge);
  el('monthly-r').textContent = signedR(monthlyR);
  el('monthly-cash').textContent = signedMoney(monthlyCash);
  el('breakeven-rate').textContent = pct(breakEven);
  el('edge-status').textContent = isPositive ? 'Positive edge' : edge < -0.000001 ? 'Negative edge' : 'Break-even edge';
  el('status-context').textContent = `${signedR(edge)} expectancy per trade`;
  el('status-card').classList.toggle('negative', edge < 0);
  el('expectancy-r').classList.toggle('negative', edge < 0);
  el('monthly-r').classList.toggle('negative', monthlyR < 0);
  el('monthly-cash').classList.toggle('negative', monthlyCash < 0);
  el('readout').textContent = readoutFor(edge, inputs.winRate, breakEven);

  drawStrategyChart(el('strategy-chart'), { monthlyR });
  drawEquityChart(el('equity-chart'), inputs);
}

function reset() {
  el('win-rate').value = 60;
  el('avg-win').value = 1.5;
  el('avg-loss').value = 1;
  el('trades-month').value = 10;
  el('capital').value = 100000;
  el('risk').value = 1;
  el('months').value = 12;
  el('paths').value = 80;
  simulationSeed = 7;
  calculate();
}

['win-rate', 'avg-win', 'avg-loss', 'trades-month', 'capital', 'risk', 'months', 'paths'].forEach(id => {
  el(id).addEventListener('input', calculate);
});
el('simulate').addEventListener('click', () => {
  simulationSeed += 101;
  calculate();
});
el('reset').addEventListener('click', reset);

renderStrategyCards();
calculate();
