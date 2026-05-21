# Marble Lab — Project State

Last updated: 2026-05-21

## What this is

Marble Lab is a MarketMates tools vertical for simple, visual trading risk/growth education tools.

Tone: practical, clear, visual, lightly wry. Avoid overbuilding. No spreadsheet goblin nests.

## Locations

- Local repo: `~/ .openclaw/workspace/marblelab/` (workspace-relative: `marblelab/`)
- GitHub: https://github.com/sam-e-trading/marblelab
- Cloudflare Pages preview: https://marblelab.pages.dev
- Intended custom domain: https://marblelab.marketmates.com

## Deployment

Cloudflare Pages pulls from GitHub repo `sam-e-trading/marblelab`.

Build settings:

- Framework preset: `None`
- Build command: blank
- Output directory: `/`
- Production branch: `main`

Known pending task: connect `marblelab.marketmates.com` once Sam has the required MarketMates password/access.

## Current tools

### `/position-sizing/` — Position Sizing Game

Interactive R-multiple / risk sizing game.

Features:

- system presets
- custom win probability, average win R, average loss R
- trade count
- starting equity
- risk per trade
- take next trade / auto-run
- equity curve
- trade log
- copy result
- Marble Lab back link

### `/position-sizing-calculator/` — Position Sizing Calculator

Modernised from Sam’s older MarketMates lesson-page calculator.

Features:

- trading capital
- number of trades
- win rate
- risk/reward
- risk per trade
- Monte Carlo runs
- 1R dollar amount
- expected return
- expectancy in R and cash
- p95 max drawdown
- example equity curve
- drawdown distribution

### `/compounding-returns/` — Compounding Returns Calculator

Trader-focused growth path modeller.

Features:

- starting capital
- years / extra months
- average monthly return
- monthly volatility
- max losing month %
- max winning month %
- monthly contribution / withdrawal
- simulation paths
- compounding model selector:
  - fully compounded
  - simple / non-compounded
  - fixed base
- generate new path
- smooth ending balance
- median / p10 / p90 ending balances
- p95 max drawdown
- chance below starting capital
- generated monthly returns bar chart
- compounding impact path
- ending balance distribution
- month-by-month compounding impact table
- right-aligned tooltip definitions

### `/drawdown-recovery/` — Drawdown Recovery Calculator

Simple visual recovery maths tool.

Features:

- drawdown slider
- optional starting balance
- required recovery return headline
- starting balance / after drawdown / dollar loss / profit needed
- before/drawdown/recovery bar chart
- recovery curve
- quick reference graphic for 10%, 20%, 30%, 40%, 50%, 60% drawdowns
- tooltip definitions

Formula:

```text
recovery % = drawdown / (1 - drawdown)
```

### `/edge-simulator/` — Edge Simulator

Probability and expectancy simulator.

Features:

- win rate %
- average win in R
- average loss in R as a positive loss magnitude
- trades per month
- starting balance
- risk per trade %
- simulated months and simulation paths
- expectancy per trade in R
- expected R per month
- expected dollar result per month
- break-even win rate
- positive / negative / break-even edge status
- comparison cards and chart for example strategies:
  - 90% small win / big loss
  - 60% medium win
  - 30% large win
- lightweight fixed-fraction equity path simulation

Formulae:

```text
expectancy R = (win rate * average win R) - (loss rate * average loss R)
break-even win rate = average loss R / (average win R + average loss R)
```

### `/atr-scale-in/` — ATR Scale-In R Multiple Calculator

Visual gross-R calculator for fixed ATR scale-in structures.

Features:

- stop distance in ATR
- scale-in distance in ATR
- maximum number of scale-ins
- scale-in sizing modes: equal, half-size adds, double-size adds, pyramid down, and custom sequence
- selected total move in ATR
- user-defined comparison move series
- auto-generated simple comparison series
- presets:
  - tight pyramid: 1 ATR stop, scale every 1 ATR
  - wider structure: 2 ATR stop, scale every 2 ATRs
  - slow builder: 3 ATR stop, scale every 3 ATRs
- selected normalised trade R result
- gross weighted unit-R sum for context
- total position size/exposure
- entries and scale-ins counts
- comparison bars across ATR moves
- compact entry ladder showing each entry's contribution
- preset structure comparison

Formula:

```text
P&L per entry = size multiplier × max(totalMoveATR - entryATR, 0) / stopDistanceATR R
gross weighted unit-R = sum(P&L per entry)
normalised trade R = gross weighted unit-R / total position size
additional scale-ins = total entries - 1, capped by maximum additional scale-ins
```

## Supporting docs

Briefs live in `marblelab/docs/`, including:

- `compounding-returns-calculator-brief.md`
- `compounding-returns-monthly-path-v2-brief.md`
- `drawdown-recovery-tool-brief.md`
- `edge-simulator-brief.md`
- `atr-scale-in-tool-brief.md`

## Brand / wording guidance

Use MarketMates/Marble Lab framing.

It is okay for tools to be inspired by classic trading risk education concepts such as R-multiples, expectancy, position sizing, and drawdown recovery maths.

Avoid implying affiliation with Van Tharp, Van Tharp Institute, or proprietary “Tharp Think” branding.

Good public phrasing:

- “classic position-sizing concepts”
- “risk education”
- “educational simulator”
- “not financial advice”

Avoid:

- claiming endorsement
- copying proprietary course language
- presenting tools as trading systems

## Mission Control

Marble Lab is tracked as a vertical in `mission-control/state/*`.

When adding tools or major changes, update:

- `mission-control/state/tasks.json`
- `mission-control/state/watchlist.json`
- `mission-control/state/decisions.json` when it is a real decision
- `MEMORY.md` for durable cross-session memory if the change matters long-term

## Quick verification commands

From `marblelab/`:

```bash
node --check position-sizing/app.js
node --check position-sizing-calculator/app.js
node --check compounding-returns/app.js
node --check drawdown-recovery/app.js
node --check edge-simulator/app.js
node --check atr-scale-in/app.js
python3 -m http.server 8770
```

Local URLs:

- http://127.0.0.1:8770/
- http://127.0.0.1:8770/position-sizing/
- http://127.0.0.1:8770/position-sizing-calculator/
- http://127.0.0.1:8770/compounding-returns/
- http://127.0.0.1:8770/drawdown-recovery/
- http://127.0.0.1:8770/edge-simulator/
- http://127.0.0.1:8770/atr-scale-in/
