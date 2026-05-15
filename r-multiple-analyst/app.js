(function (root) {
  "use strict";

  const DATE_RE = /^\d{4}[./-]\d{2}[./-]\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/;
  const EPSILON = 0.0000001;

  const state = {
    rows: [],
    fileName: "",
    trades: [],
    stats: null
  };

  function clean(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function normalizeHeader(value) {
    return clean(value).toLowerCase().replace(/\s+/g, "").replace(/\//g, "");
  }

  function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    let text = clean(value).replace(/,/g, "").replace(/[−–—]/g, "-");
    if (!text) return 0;
    const parenthesisedNegative = /^\((.*)\)$/.test(text);
    if (parenthesisedNegative) text = text.replace(/^\((.*)\)$/, "$1");
    const n = Number(text);
    if (!Number.isFinite(n)) return 0;
    return parenthesisedNegative ? -Math.abs(n) : n;
  }

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const text = clean(value);
    if (!text) return null;
    const match = text.match(/^(\d{4})[./-](\d{2})[./-](\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const [, y, m, d, hh, mm, ss = "0"] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }

  function isDateLike(value) {
    return value instanceof Date || DATE_RE.test(clean(value));
  }

  function formatMoney(value) {
    const sign = value < -EPSILON ? "-" : "";
    return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatR(value) {
    if (!Number.isFinite(value)) return "0.00R";
    const sign = value > EPSILON ? "+" : value < -EPSILON ? "" : "";
    return `${sign}${value.toFixed(2)}R`;
  }

  function formatPercent(value) {
    return `${value.toFixed(1)}%`;
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "0.00";
    return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return "n/a";
    if (minutes < 1) return "<1m";
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function headerMap(row) {
    const map = {};
    row.forEach((cell, index) => {
      const key = normalizeHeader(cell);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(index);
    });
    return map;
  }

  function findPositionsHeader(rows) {
    const sectionIndex = rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === "positions"));
    if (sectionIndex < 0) return null;

    for (let i = sectionIndex + 1; i < Math.min(rows.length, sectionIndex + 8); i += 1) {
      const map = headerMap(rows[i]);
      if (map.time && map.position && map.symbol && map.type && map.profit) {
        return { sectionIndex, headerIndex: i, map };
      }
    }
    return null;
  }

  function getIndex(map, key, fallback, occurrence = 0) {
    const list = map[key] || [];
    return Number.isInteger(list[occurrence]) ? list[occurrence] : fallback;
  }

  function stopDiagnostic(side, entry, stop) {
    if (!Number.isFinite(stop) || Math.abs(stop) < EPSILON) return "missing stop";
    if (!Number.isFinite(entry) || Math.abs(entry) < EPSILON) return "unreadable stop";
    if (Math.abs(stop - entry) < EPSILON) return "breakeven stop";
    if (side === "buy") return stop < entry ? "adverse stop" : "stop moved / non-adverse stop";
    if (side === "sell") return stop > entry ? "adverse stop" : "stop moved / non-adverse stop";
    return "unreadable stop";
  }

  function parsePositions(rows, oneR) {
    const found = findPositionsHeader(rows);
    if (!found) {
      throw new Error("Could not find a Positions table with MT5 columns.");
    }

    const { headerIndex, map } = found;
    const columns = {
      openTime: getIndex(map, "time", 0, 0),
      position: getIndex(map, "position", 1),
      symbol: getIndex(map, "symbol", 2),
      type: getIndex(map, "type", 3),
      volume: getIndex(map, "volume", 4),
      entryPrice: getIndex(map, "price", 5, 0),
      stopLoss: getIndex(map, "sl", 6),
      takeProfit: getIndex(map, "tp", 7),
      closeTime: getIndex(map, "time", 8, 1),
      closePrice: getIndex(map, "price", 9, 1),
      commission: getIndex(map, "commission", 10),
      swap: getIndex(map, "swap", 11),
      profit: getIndex(map, "profit", 12)
    };

    const trades = [];
    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const firstCell = normalizeHeader(row[0]);
      if (firstCell === "orders") break;
      if (!isDateLike(row[columns.openTime])) {
        if (row.some((cell) => clean(cell))) break;
        continue;
      }

      const side = clean(row[columns.type]).toLowerCase();
      const openTimeText = clean(row[columns.openTime]);
      const closeTimeText = clean(row[columns.closeTime]);
      const openDate = parseDate(row[columns.openTime]);
      const closeDate = parseDate(row[columns.closeTime]);
      const commission = parseNumber(row[columns.commission]);
      const swap = parseNumber(row[columns.swap]);
      const profit = parseNumber(row[columns.profit]);
      const netPnL = profit + commission + swap;
      const rMultiple = netPnL / oneR;
      const entryPrice = parseNumber(row[columns.entryPrice]);
      const closePrice = parseNumber(row[columns.closePrice]);
      const stopLoss = parseNumber(row[columns.stopLoss]);
      const diagnostic = stopDiagnostic(side, entryPrice, stopLoss);
      const holdingMinutes = openDate && closeDate ? (closeDate.getTime() - openDate.getTime()) / 60000 : null;

      trades.push({
        openTime: openTimeText,
        position: clean(row[columns.position]),
        symbol: clean(row[columns.symbol]) || "Unknown",
        type: side || "unknown",
        volume: parseNumber(row[columns.volume]),
        entryPrice,
        stopLoss,
        takeProfit: parseNumber(row[columns.takeProfit]),
        closeTime: closeTimeText,
        closePrice,
        commission,
        swap,
        profit,
        netPnL,
        rMultiple,
        outcome: netPnL > EPSILON ? "win" : netPnL < -EPSILON ? "loss" : "breakeven",
        stopDiagnostic: diagnostic,
        holdingMinutes
      });
    }

    return trades;
  }

  function combineStopDiagnostics(trades) {
    const unique = [...new Set(trades.map((trade) => trade.stopDiagnostic).filter(Boolean))];
    if (!unique.length) return "n/a";
    if (unique.length === 1) return unique[0];
    const adverse = trades.filter((trade) => trade.stopDiagnostic === "adverse stop").length;
    return `${adverse}/${trades.length} adverse stops`;
  }

  function groupScaledTrades(trades) {
    const bySymbol = new Map();
    trades.forEach((trade, index) => {
      const symbol = trade.symbol || "Unknown";
      if (!bySymbol.has(symbol)) bySymbol.set(symbol, []);
      bySymbol.get(symbol).push({ trade, index, openDate: parseDate(trade.openTime), closeDate: parseDate(trade.closeTime) });
    });

    const groups = [];
    bySymbol.forEach((symbolTrades) => {
      const dated = symbolTrades.filter((item) => item.openDate && item.closeDate)
        .sort((a, b) => a.openDate - b.openDate || a.closeDate - b.closeDate || a.index - b.index);
      const undated = symbolTrades.filter((item) => !item.openDate || !item.closeDate);

      let current = null;
      dated.forEach((item) => {
        if (!current || item.openDate > current.closeDate) {
          current = { firstIndex: item.index, closeDate: item.closeDate, trades: [item.trade] };
          groups.push(current);
          return;
        }
        current.trades.push(item.trade);
        current.firstIndex = Math.min(current.firstIndex, item.index);
        if (item.closeDate > current.closeDate) current.closeDate = item.closeDate;
      });

      undated.forEach((item) => {
        const fallback = groups.find((group) => group.trades[0]?.symbol === item.trade.symbol && group.trades[0]?.openTime === item.trade.openTime);
        if (fallback) {
          fallback.trades.push(item.trade);
          fallback.firstIndex = Math.min(fallback.firstIndex, item.index);
        } else {
          groups.push({ firstIndex: item.index, closeDate: item.closeDate, trades: [item.trade] });
        }
      });
    });

    return groups
      .sort((a, b) => a.firstIndex - b.firstIndex)
      .map(({ trades: group }) => {
        if (group.length === 1) return { ...group[0], scaleCount: 1 };

        const first = group[0];
        const latestClose = group.reduce((latest, trade) => {
          const currentDate = parseDate(trade.closeTime);
          if (!currentDate) return latest;
          if (!latest.date || currentDate > latest.date) return { text: trade.closeTime, date: currentDate };
          return latest;
        }, { text: first.closeTime, date: parseDate(first.closeTime) });
        const closeDate = latestClose.date;
        const openDate = parseDate(first.openTime);
        const netPnL = sum(group, "netPnL");
        const profit = sum(group, "profit");
        const commission = sum(group, "commission");
        const swap = sum(group, "swap");
        const rMultiple = sum(group, "rMultiple");
        const types = [...new Set(group.map((trade) => trade.type).filter(Boolean))];

        return {
          ...first,
          position: group.map((trade) => trade.position).filter(Boolean).join(" + ") || `${group.length} positions`,
          type: types.length === 1 ? types[0] : "mixed",
          volume: sum(group, "volume"),
          closeTime: latestClose.text,
          commission,
          swap,
          profit,
          netPnL,
          rMultiple,
          outcome: netPnL > EPSILON ? "win" : netPnL < -EPSILON ? "loss" : "breakeven",
          stopDiagnostic: combineStopDiagnostics(group),
          holdingMinutes: openDate && closeDate ? (closeDate.getTime() - openDate.getTime()) / 60000 : null,
          scaleCount: group.length
        };
      });
  }

  function summariseGroup(trades) {
    const netPnL = sum(trades, "netPnL");
    const totalR = sum(trades, "rMultiple");
    const wins = trades.filter((trade) => trade.netPnL > EPSILON);
    const losses = trades.filter((trade) => trade.netPnL < -EPSILON);
    return {
      trades: trades.length,
      netPnL,
      totalR,
      winRate: trades.length ? wins.length / trades.length * 100 : 0,
      avgR: trades.length ? totalR / trades.length : 0,
      avgWinR: wins.length ? sum(wins, "rMultiple") / wins.length : 0,
      avgLossR: losses.length ? sum(losses, "rMultiple") / losses.length : 0
    };
  }

  function groupBy(trades, key) {
    return trades.reduce((groups, trade) => {
      const groupKey = trade[key] || "Unknown";
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(trade);
      return groups;
    }, {});
  }

  function sum(items, key) {
    return items.reduce((total, item) => total + (Number.isFinite(item[key]) ? item[key] : 0), 0);
  }

  function calculateStats(trades) {
    const wins = trades.filter((trade) => trade.netPnL > EPSILON);
    const losses = trades.filter((trade) => trade.netPnL < -EPSILON);
    const breakeven = trades.filter((trade) => Math.abs(trade.netPnL) <= EPSILON);
    const netPnL = sum(trades, "netPnL");
    const totalR = sum(trades, "rMultiple");
    const grossWin = sum(wins, "netPnL");
    const grossLoss = Math.abs(sum(losses, "netPnL"));
    const avgWinR = wins.length ? sum(wins, "rMultiple") / wins.length : 0;
    const avgLossR = losses.length ? sum(losses, "rMultiple") / losses.length : 0;
    const bestTradeR = trades.length ? Math.max(...trades.map((trade) => trade.rMultiple)) : 0;
    const worstTradeR = trades.length ? Math.min(...trades.map((trade) => trade.rMultiple)) : 0;
    const holding = trades.map((trade) => trade.holdingMinutes).filter(Number.isFinite);
    const stopCounts = trades.reduce((counts, trade) => {
      counts[trade.stopDiagnostic] = (counts[trade.stopDiagnostic] || 0) + 1;
      return counts;
    }, {});

    const symbolBreakdown = Object.entries(groupBy(trades, "symbol"))
      .map(([symbol, group]) => ({ label: symbol, ...summariseGroup(group) }))
      .sort((a, b) => Math.abs(b.totalR) - Math.abs(a.totalR));

    const sideBreakdown = Object.entries(groupBy(trades, "type"))
      .map(([type, group]) => ({ label: type, ...summariseGroup(group) }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      netPnL,
      totalR,
      expectancyR: trades.length ? totalR / trades.length : 0,
      winRate: trades.length ? wins.length / trades.length * 100 : 0,
      avgWinR,
      avgLossR,
      payoffRatio: Math.abs(avgLossR) > EPSILON ? avgWinR / Math.abs(avgLossR) : 0,
      profitFactor: grossLoss > EPSILON ? grossWin / grossLoss : grossWin > EPSILON ? Infinity : 0,
      bestTradeR,
      worstTradeR,
      avgHoldMinutes: holding.length ? holding.reduce((a, b) => a + b, 0) / holding.length : null,
      symbolBreakdown,
      sideBreakdown,
      stopCounts,
      topTrades: [...trades].sort((a, b) => Math.abs(b.rMultiple) - Math.abs(a.rMultiple)).slice(0, 20)
    };
  }

  function rowsFromWorkbook(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("Workbook has no worksheets.");
    return root.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      header: 1,
      raw: true,
      defval: "",
      blankrows: false
    });
  }

  function analyseRows(rows, oneR, options = {}) {
    if (!Number.isFinite(oneR) || oneR <= 0) {
      throw new Error("Enter a fixed 1R dollar value greater than zero.");
    }
    const positions = parsePositions(rows, oneR);
    if (!positions.length) {
      throw new Error("No closed positions were found in the Positions section.");
    }
    const trades = options.scaleMode ? groupScaledTrades(positions) : positions;
    return { trades, stats: calculateStats(trades) };
  }

  function renderStats(stats) {
    setText("trades", String(stats.trades));
    setText("net-pnl", formatMoney(stats.netPnL));
    setClassByValue("net-pnl", stats.netPnL);
    setText("total-r-stat", formatR(stats.totalR));
    setClassByValue("total-r-stat", stats.totalR);
    setText("expectancy", formatR(stats.expectancyR));
    setClassByValue("expectancy", stats.expectancyR);
    setText("win-rate", formatPercent(stats.winRate));
    setText("avg-win", formatR(stats.avgWinR));
    setText("avg-loss", formatR(stats.avgLossR));
    setClassByValue("avg-loss", stats.avgLossR);
    setText("payoff-ratio", formatNumber(stats.payoffRatio));
    setText("profit-factor", stats.profitFactor === Infinity ? "∞" : formatNumber(stats.profitFactor));
    setText("best-worst", `${formatR(stats.bestTradeR)} / ${formatR(stats.worstTradeR)}`);
    setText("total-r", formatR(stats.totalR));
    setText("total-context", `${formatMoney(stats.netPnL)} across ${stats.trades} ${stats.trades === 1 ? "trade" : "trades"}`);
    setClassByValue("total-r", stats.totalR);
    const card = document.getElementById("result-card");
    if (card) card.classList.toggle("negative", stats.totalR < -EPSILON);
    setText("chart-note", `${formatR(stats.totalR)} total`);
    setText("symbol-count", `${stats.symbolBreakdown.length} symbols`);
    setText("sl-summary", stopSummary(stats.stopCounts));
  }

  function stopSummary(stopCounts) {
    const adverse = stopCounts["adverse stop"] || 0;
    const flagged = Object.entries(stopCounts)
      .filter(([key]) => key !== "adverse stop")
      .reduce((total, [, count]) => total + count, 0);
    return `${adverse} adverse stops · ${flagged} flagged`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setClassByValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("negative", value < -EPSILON);
  }

  function status(message, warning = false) {
    const el = document.getElementById("status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("warning", warning);
  }

  function renderBreakdown(id, rows) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="empty-state">No data yet.</div>';
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Name</th><th>Trades</th><th>Win rate</th><th>Net P/L</th><th>Total R</th><th>Avg R</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td><strong>${escapeHtml(row.label)}</strong></td>
        <td>${row.trades}</td>
        <td>${formatPercent(row.winRate)}</td>
        <td class="${row.netPnL < -EPSILON ? "r-bad" : "r-good"}">${formatMoney(row.netPnL)}</td>
        <td class="${row.totalR < -EPSILON ? "r-bad" : "r-good"}">${formatR(row.totalR)}</td>
        <td>${formatR(row.avgR)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }

  function renderTrades(trades) {
    const el = document.getElementById("trades-table");
    if (!el) return;
    if (!trades.length) {
      el.innerHTML = '<div class="empty-state">Upload a statement to see trades.</div>';
      return;
    }
    el.innerHTML = `<table>
      <thead><tr><th>Open time</th><th>Position</th><th>Symbol</th><th>Side</th><th>Volume</th><th>Net P/L</th><th>R</th><th>Hold</th><th>S/L diagnostic</th><th>Close time</th></tr></thead>
      <tbody>${trades.map((trade) => `<tr>
        <td>${escapeHtml(trade.openTime)}</td>
        <td>${escapeHtml(trade.scaleCount > 1 ? `${trade.scaleCount} scaled positions` : trade.position)}</td>
        <td><strong>${escapeHtml(trade.symbol)}</strong></td>
        <td>${escapeHtml(trade.type)}</td>
        <td>${formatNumber(trade.volume, 2)}</td>
        <td class="${trade.netPnL < -EPSILON ? "r-bad" : "r-good"}">${formatMoney(trade.netPnL)}</td>
        <td class="${trade.rMultiple < -EPSILON ? "r-bad" : "r-good"}">${formatR(trade.rMultiple)}</td>
        <td>${formatDuration(trade.holdingMinutes)}</td>
        <td>${escapeHtml(trade.stopDiagnostic)}</td>
        <td>${escapeHtml(trade.closeTime)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  }

  function drawCurve(trades) {
    const canvas = document.getElementById("equity-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.fillRect(0, 0, width, height);

    const padding = 34;
    const values = [0];
    trades.forEach((trade) => values.push(values[values.length - 1] + trade.rMultiple));
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = Math.max(max - min, 1);
    const xStep = (width - padding * 2) / Math.max(values.length - 1, 1);
    const y = (value) => height - padding - ((value - min) / range) * (height - padding * 2);

    ctx.strokeStyle = "rgba(218,228,215,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y(0));
    ctx.lineTo(width - padding, y(0));
    ctx.stroke();

    ctx.strokeStyle = "#CFFC54";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + index * xStep;
      const yy = y(value);
      if (index === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText(`${formatR(values[values.length - 1])} cumulative`, padding, 34);
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.fillText(`High ${formatR(max)} · Low ${formatR(min)}`, padding, 56);
  }

  function render(result) {
    state.trades = result.trades;
    state.stats = result.stats;
    renderStats(result.stats);
    renderBreakdown("symbol-breakdown", result.stats.symbolBreakdown);
    renderBreakdown("side-breakdown", result.stats.sideBreakdown);
    renderTrades(result.stats.topTrades);
    drawCurve(result.trades);
    const scaleMode = Boolean(document.getElementById("scale-mode")?.checked);
    status(`Parsed ${result.stats.trades} ${scaleMode ? "scale-grouped trades" : "positions"} from ${state.fileName || "the workbook"}. Fixed-risk results use the entered 1R value only.`);
  }

  async function readSelectedFile(file) {
    if (!root.XLSX) throw new Error("SheetJS XLSX did not load. Check the network connection and reload the page.");
    const buffer = await file.arrayBuffer();
    const workbook = root.XLSX.read(buffer, { type: "array", cellDates: false });
    return rowsFromWorkbook(workbook);
  }

  async function handleAnalyse() {
    try {
      const oneR = parseNumber(document.getElementById("one-r").value);
      const scaleMode = Boolean(document.getElementById("scale-mode")?.checked);
      const input = document.getElementById("statement-file");
      if (!state.rows.length) {
        if (!input.files || !input.files[0]) throw new Error("Choose an MT5 XLSX statement first.");
        state.fileName = input.files[0].name;
        state.rows = await readSelectedFile(input.files[0]);
      }
      render(analyseRows(state.rows, oneR, { scaleMode }));
    } catch (error) {
      status(error.message, true);
    }
  }

  function resetUi() {
    state.rows = [];
    state.fileName = "";
    state.trades = [];
    state.stats = null;
    const file = document.getElementById("statement-file");
    if (file) file.value = "";
    const scaleMode = document.getElementById("scale-mode");
    if (scaleMode) scaleMode.checked = false;
    status("Choose an MT5 XLSX statement, enter the fixed dollar value for 1R, then run the analysis.");
    renderStats(calculateStats([]));
    renderBreakdown("symbol-breakdown", []);
    renderBreakdown("side-breakdown", []);
    renderTrades([]);
    drawCurve([]);
    setText("sl-summary", "No S/L diagnostics yet");
    setText("total-context", "Upload a statement to begin");
  }

  function init() {
    if (!root.document) return;
    const analyse = document.getElementById("analyse");
    const reset = document.getElementById("reset");
    const file = document.getElementById("statement-file");
    const oneR = document.getElementById("one-r");
    const scaleMode = document.getElementById("scale-mode");
    if (analyse) analyse.addEventListener("click", handleAnalyse);
    if (reset) reset.addEventListener("click", resetUi);
    if (file) file.addEventListener("change", () => {
      state.rows = [];
      state.fileName = file.files && file.files[0] ? file.files[0].name : "";
      status(state.fileName ? `${state.fileName} selected. Run the analysis when ready.` : "Choose an MT5 XLSX statement first.");
    });
    if (oneR) oneR.addEventListener("input", () => {
      if (state.rows.length) handleAnalyse();
    });
    if (scaleMode) scaleMode.addEventListener("change", () => {
      if (state.rows.length) handleAnalyse();
    });
    resetUi();
  }

  const api = {
    analyseRows,
    calculateStats,
    parsePositions,
    groupScaledTrades,
    findPositionsHeader,
    formatR,
    formatMoney
  };

  root.RMultipleAnalyst = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) init();
})(typeof window !== "undefined" ? window : globalThis);
