const presets = {
  classic: { name: 'Classic edge', winProb: 0.40, winR: 2, lossR: -1 },
  smoother: { name: 'Smoother', winProb: 0.50, winR: 1.4, lossR: -1 },
  wild: { name: 'Wild trend', winProb: 0.30, winR: 3.5, lossR: -1 },
  coinflip: { name: 'No edge', winProb: 0.50, winR: 1, lossR: -1 }
};

const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

let state;

function expectancy(system) {
  return system.winProb * system.winR + (1 - system.winProb) * system.lossR;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function selectedSystem() {
  if (el('preset').value !== 'custom') return presets[el('preset').value];
  const winProb = clamp((Number(el('custom-win-prob').value) || 40) / 100, 0.01, 0.99);
  const winR = clamp(Number(el('custom-win-r').value) || 2, 0.1, 20);
  const lossR = -clamp(Number(el('custom-loss-r').value) || 1, 0.1, 10);
  return { name: 'Custom setup', winProb, winR, lossR };
}

function updateCustomSetup() {
  const isCustom = el('preset').value === 'custom';
  el('custom-setup').hidden = !isCustom;
  const system = selectedSystem();
  const winPct = (system.winProb * 100).toFixed(0);
  const lossPct = (100 - system.winProb * 100).toFixed(0);
  const exp = expectancy(system);
  el('custom-win-label').textContent = `${winPct}%`;
  el('custom-summary').textContent = `${winPct}% wins at +${system.winR.toFixed(1)}R, ${lossPct}% losses at ${system.lossR.toFixed(1)}R · expectancy ${exp >= 0 ? '+' : ''}${exp.toFixed(2)}R`;
  if (state && isCustom) {
    state.system = system;
    updateUI('Custom setup updated. Start a new game to reset the round.');
  }
}

function newGame() {
  updateCustomSetup();
  const startEquity = Number(el('start-equity').value) || 100000;
  state = {
    system: selectedSystem(),
    startEquity,
    equity: startEquity,
    tradeLimit: Number(el('trade-count').value) || 30,
    trades: [],
    equityCurve: [startEquity],
    peak: startEquity,
    maxDrawdown: 0,
    wins: 0
  };
  updateUI('New round loaded. Choose your risk.');
}

function currentRisk() {
  return Number(el('risk').value) / 100;
}

function takeTrade() {
  if (state.trades.length >= state.tradeLimit || state.equity <= 0) return;
  const riskPct = currentRisk();
  const riskDollars = state.equity * riskPct;
  const isWin = Math.random() < state.system.winProb;
  const r = isWin ? state.system.winR : state.system.lossR;
  const pnl = riskDollars * r;
  const before = state.equity;
  state.equity = Math.max(0, state.equity + pnl);
  if (isWin) state.wins += 1;
  state.peak = Math.max(state.peak, state.equity);
  const dd = state.peak > 0 ? (state.peak - state.equity) / state.peak : 0;
  state.maxDrawdown = Math.max(state.maxDrawdown, dd);
  const trade = { n: state.trades.length + 1, isWin, r, riskPct, pnl, before, after: state.equity, dd };
  state.trades.push(trade);
  state.equityCurve.push(state.equity);
  updateUI(describeTrade(trade));
}

function describeTrade(trade) {
  const side = trade.isWin ? 'Win' : 'Loss';
  const sign = trade.pnl >= 0 ? '+' : '';
  return `${side} ${trade.r}R · ${sign}${fmt(trade.pnl)} at ${(trade.riskPct * 100).toFixed(2)}% risk`;
}

function autoRun() {
  while (state.trades.length < state.tradeLimit && state.equity > 0) takeTrade();
}

function lesson() {
  if (!state.trades.length) return 'Positive expectancy is not permission to bet like a lunatic.';
  const risk = currentRisk() * 100;
  const ret = (state.equity / state.startEquity - 1) * 100;
  if (state.equity <= 0) return 'Ruin. The edge was alive; the sizing murdered it.';
  if (state.maxDrawdown > 0.45) return 'That drawdown is the tuition bill for oversized confidence.';
  if (risk <= 2 && ret > 0) return 'Boring sizing, useful compounding. Annoyingly sensible.';
  if (risk >= 10 && ret > 0) return 'You survived the dragon. Do not confuse that with taming it.';
  if (ret < 0 && expectancy(state.system) > 0) return 'Positive expectancy can still lose over a short sample. Size for survival.';
  return 'The same system feels completely different under different sizing.';
}


function summaryText() {
  const trades = state.trades.length;
  const ret = ((state.equity / state.startEquity - 1) * 100);
  const winRate = trades ? ((state.wins / trades) * 100).toFixed(1) : '0.0';
  return [
    'Position Sizing Lab result',
    `System: ${state.system.name}`,
    `Trades: ${trades}/${state.tradeLimit}`,
    `Risk per trade: ${Number(el('risk').value).toFixed(2)}%`,
    `Start equity: ${fmt(state.startEquity)}`,
    `End equity: ${fmt(state.equity)} (${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%)`,
    `Win rate: ${winRate}%`,
    `Max drawdown: ${(state.maxDrawdown * 100).toFixed(1)}%`,
    `Lesson: ${lesson()}`
  ].join('\n');
}

async function copySummary() {
  const text = summaryText();
  try {
    await navigator.clipboard.writeText(text);
    updateUI('Result copied to clipboard. Go forth and annoy a risk committee.');
  } catch (_) {
    window.prompt('Copy your result:', text);
  }
}

function updateUI(lastText = 'Ready') {
  const trades = state.trades.length;
  const winRate = trades ? `${((state.wins / trades) * 100).toFixed(1)}%` : '–';
  const ret = ((state.equity / state.startEquity - 1) * 100);
  el('equity').textContent = fmt(state.equity);
  el('equity').classList.toggle('bust', state.equity <= 0);
  el('equity-change').textContent = `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}% from start`;
  el('trade-number').textContent = `${trades} / ${state.tradeLimit}`;
  el('win-rate').textContent = winRate;
  el('max-dd').textContent = `${(state.maxDrawdown * 100).toFixed(1)}%`;
  el('expectancy').textContent = `${expectancy(state.system) >= 0 ? '+' : ''}${expectancy(state.system).toFixed(2)}R`;
  el('last-trade').textContent = lastText;
  el('lesson').textContent = lesson();
  el('take-trade').disabled = trades >= state.tradeLimit || state.equity <= 0;
  el('auto-run').disabled = trades >= state.tradeLimit || state.equity <= 0;
  renderLog();
  drawChart();
}

function renderLog() {
  el('trade-log').innerHTML = state.trades.slice().reverse().map(t => `
    <article class="trade ${t.isWin ? 'win' : 'loss'}">
      <strong>#${t.n} · ${t.isWin ? 'WIN' : 'LOSS'} · ${t.r}R</strong>
      <small>Risk ${(t.riskPct * 100).toFixed(2)}% · P/L ${t.pnl >= 0 ? '+' : ''}${fmt(t.pnl)}</small>
      <small>${fmt(t.before)} → ${fmt(t.after)} · DD ${(t.dd * 100).toFixed(1)}%</small>
    </article>
  `).join('') || '<p class="note">No trades yet. The safest equity curve is always the one before the first click.</p>';
}

function drawChart() {
  const canvas = el('equity-chart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fillRect(0, 0, w, h);
  const values = state.equityCurve;
  const min = Math.min(...values, state.startEquity * 0.75);
  const max = Math.max(...values, state.startEquity * 1.25);
  const pad = 28;
  ctx.strokeStyle = 'rgba(218,228,215,.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + ((h - pad * 2) * i / 4);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  ctx.strokeStyle = '#597A77';
  const startY = scaleY(state.startEquity, min, max, h, pad);
  ctx.beginPath(); ctx.moveTo(pad, startY); ctx.lineTo(w - pad, startY); ctx.stroke();
  ctx.strokeStyle = state.equity <= state.startEquity ? '#FF5C00' : '#CFFC54';
  ctx.lineWidth = 4;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + ((w - pad * 2) * (values.length === 1 ? 0 : i / (values.length - 1)));
    const y = scaleY(v, min, max, h, pad);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function scaleY(value, min, max, h, pad) {
  return h - pad - ((value - min) / Math.max(1, max - min)) * (h - pad * 2);
}

el('risk').addEventListener('input', () => {
  el('risk-label').textContent = `${Number(el('risk').value).toFixed(1)}%`;
});
el('new-game').addEventListener('click', newGame);
el('take-trade').addEventListener('click', takeTrade);
el('auto-run').addEventListener('click', autoRun);
el('clear-log').addEventListener('click', () => { state.trades = []; state.equityCurve = [state.equity]; state.wins = 0; state.maxDrawdown = 0; updateUI('Log cleared, equity retained. A bookkeeping crime, but allowed.'); });
el('copy-summary').addEventListener('click', copySummary);
el('preset').addEventListener('change', newGame);
['custom-win-prob', 'custom-win-r', 'custom-loss-r'].forEach(id => {
  el(id).addEventListener('input', updateCustomSetup);
  el(id).addEventListener('change', updateCustomSetup);
});
document.querySelectorAll('[data-risk]').forEach(button => button.addEventListener('click', () => {
  el('risk').value = button.dataset.risk;
  el('risk-label').textContent = `${Number(button.dataset.risk).toFixed(1)}%`;
}));

updateCustomSetup();
newGame();
