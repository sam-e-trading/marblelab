const el = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const pct = value => `${value.toFixed(1)}%`;

function recovery(drawdownPct) {
  const d = drawdownPct / 100;
  return (d / (1 - d)) * 100;
}

function readout(drawdown, recoveryPct) {
  if (drawdown >= 70) return 'This is no longer a dip. It is a mountain climb in bad shoes.';
  if (drawdown >= 50) return 'At 50% down, breakeven means doubling what remains. Maths with teeth.';
  if (drawdown >= 30) return 'This is where recovery starts getting much harder than the original loss feels.';
  return 'Small drawdowns are recoverable. Keep them small and life stays simpler.';
}

function drawBars(canvas, capital, after, profitNeeded) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 34;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const bars = [
    { label: 'Start', value: capital, color: '#CFFC54' },
    { label: 'After drawdown', value: after, color: '#FF5C00' },
    { label: 'Profit needed', value: profitNeeded, color: '#D6DAF3' }
  ];
  const max = Math.max(...bars.map(b => b.value), 1);
  const gap = 24;
  const barW = (w - pad * 2 - gap * (bars.length - 1)) / bars.length;
  ctx.font = '800 14px system-ui, sans-serif';
  bars.forEach((bar, i) => {
    const barH = ((h - pad * 2 - 34) * bar.value) / max;
    const x = pad + i * (barW + gap);
    const y = h - pad - barH - 24;
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(fmt(bar.value), x + barW / 2, y - 8);
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.fillText(bar.label, x + barW / 2, h - 18);
  });
  ctx.textAlign = 'left';
}

function drawCurve(canvas, selectedDrawdown) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, pad = 34;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, w, h);
  const x = d => pad + ((w - pad * 2) * (d / 90));
  const y = r => h - pad - ((h - pad * 2) * (Math.min(r, 900) / 900));
  ctx.strokeStyle = 'rgba(218,228,215,.16)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const yy = pad + ((h - pad * 2) * i / 4); ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(w - pad, yy); ctx.stroke(); }
  ctx.strokeStyle = '#CFFC54'; ctx.lineWidth = 4; ctx.beginPath();
  for (let d = 1; d <= 90; d++) {
    const xx = x(d); const yy = y(recovery(d));
    if (d === 1) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  const sx = x(selectedDrawdown), sy = y(recovery(selectedDrawdown));
  ctx.fillStyle = '#FF5C00'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText('drawdown →', pad, h - 8);
  ctx.textAlign = 'right'; ctx.fillText('recovery required ↑', w - pad, 18); ctx.textAlign = 'left';
}

function renderSummary() {
  const rows = [10, 20, 30, 40, 50, 60];
  el('summary-table').innerHTML = rows.map(d => `
    <article class="summary-card">
      <span>${d}% drawdown</span>
      <strong>${pct(recovery(d))}</strong>
      <span>to recover</span>
    </article>
  `).join('');
}

function calculate() {
  const drawdown = Number(el('drawdown').value) || 30;
  const capital = Math.max(100, Number(el('capital').value) || 100000);
  const recoveryPct = recovery(drawdown);
  const after = capital * (1 - drawdown / 100);
  const loss = capital - after;
  const profitNeeded = capital - after;
  el('drawdown-label').textContent = `${drawdown}%`;
  el('recovery-headline').textContent = pct(recoveryPct);
  el('headline-context').textContent = `to recover from a ${drawdown}% drawdown`;
  el('start-balance').textContent = fmt(capital);
  el('after-drawdown').textContent = fmt(after);
  el('dollar-loss').textContent = `-${fmt(loss)}`;
  el('profit-needed').textContent = `+${fmt(profitNeeded)}`;
  el('readout').textContent = `A ${drawdown}% drawdown requires a ${pct(recoveryPct)} gain to recover.`;
  el('lesson').textContent = readout(drawdown, recoveryPct);
  drawBars(el('bar-chart'), capital, after, profitNeeded);
  drawCurve(el('curve-chart'), drawdown);
}

function reset() {
  el('drawdown').value = 30;
  el('capital').value = 100000;
  calculate();
}

el('drawdown').addEventListener('input', calculate);
el('capital').addEventListener('input', calculate);
el('reset').addEventListener('click', reset);
renderSummary();
calculate();
