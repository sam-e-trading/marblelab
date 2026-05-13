# Compounding Returns Calculator v2 — Monthly Path Visualisation Brief

## Summary

Add a more visual month-by-month return path to the Compounding Returns Calculator so users can see exactly how variable monthly returns compound into the final equity curve.

The key idea: show returns as a sequence like `+3.2%, -2.0%, +5.1%...`, then show how those monthly gains and losses affect account balance under different compounding models.

## Problem

The current v1 tool is useful for high-level outcomes:

- smooth ending balance
- median/p10/p90 simulated ending balance
- drawdown estimate
- broad ending balance distribution

But it does not clearly show the mechanics of compounding month by month. Users can see the final path, but not why the path changes.

The missing educational moment is:

> A -2% month followed by a +5% month does not behave the same as a smooth average return. Sequence, volatility, withdrawals, and compounding model all matter.

## Goal

Make variable returns feel concrete and visible.

Users should be able to see:

- each month’s return
- whether it was positive or negative
- how much money was gained/lost that month
- how the account balance changed after compounding
- how negative months interrupt compounding
- how different compounding models change the same return sequence

## Proposed v2 features

### 1. Monthly returns bar chart

Add a new chart showing each month’s return as a bar:

- positive months: green bars above zero
- negative months: orange bars below zero
- x-axis: month number
- y-axis: monthly return percentage

Example:

```text
Month 1: +2.4%
Month 2: -1.8%
Month 3: +5.0%
Month 4: -3.2%
```

This chart should sit above or beside the equity curve.

### 2. Linked equity impact

When the generated return series is applied, the tool should show:

- starting balance
- monthly return
- monthly P/L in dollars
- contribution/withdrawal
- ending balance

This can be shown as:

- a compact monthly table, or
- a hover/tap tooltip later, or
- a selected-month readout in v1.1/v2

Recommended v2 first pass: compact table beneath charts, limited to 36–60 months gracefully.

### 3. “Same returns, different compounding model” comparison

Allow users to compare the same monthly return sequence under different models.

Suggested models:

#### A. Fully compounded

Each month’s return applies to the latest balance.

```text
balance = balance × (1 + monthlyReturn) + cashflow
```

#### B. Simple / non-compounded

Each month’s return applies to starting capital, not current balance.

```text
balance = startingCapital + cumulative(startingCapital × monthlyReturn) + cashflows
```

Useful for showing what compounding adds.

#### C. Fixed-dollar risk / fixed notional

Monthly return applies to a fixed base amount, not current balance.

```text
monthlyPnL = baseCapital × monthlyReturn
balance = previousBalance + monthlyPnL + cashflow
```

This is close to a trader who does not scale size as the account grows/shrinks.

#### D. Withdraw profits / payout mode — optional v2.1

If monthly profit is positive, withdraw a percentage before compounding.

This is useful but probably not needed in the immediate v2.

## Recommended v2 scope

Build these now:

1. monthly returns bar chart
2. monthly return sequence generation
3. toggle/select for compounding model:
   - fully compounded
   - simple/non-compounded
   - fixed base
4. growth curve updates based on selected model
5. monthly impact table
6. readout explaining the selected model

Defer:

- payout/profit split mode
- manual editing of each month’s return
- exporting CSV
- hover tooltips
- saving scenarios

## UX structure

Suggested chart area:

1. Monthly returns bar chart
2. Account balance curve
3. Ending balance distribution / Monte Carlo chart

Suggested controls:

- Return path mode:
  - generated random path
  - fixed smooth path
  - custom monthly sequence — later
- Compounding model:
  - fully compounded
  - simple/non-compounded
  - fixed base

Suggested table columns:

| Month | Return | Start Balance | P/L | Cashflow | End Balance |
|---|---:|---:|---:|---:|---:|
| 1 | +2.4% | $100,000 | +$2,400 | $0 | $102,400 |
| 2 | -1.8% | $102,400 | -$1,843 | $0 | $100,557 |

Avoid markdown tables in the app itself; use responsive cards/table UI.

## Educational copy

Add plain-English explanation:

- “Negative months reduce the base that future gains compound from.”
- “A +10% month after a -10% month does not get you back to breakeven.”
- “Fully compounded sizing scales up and down with the account.”
- “Fixed-base mode shows what happens if size does not increase with equity.”
- “Simple return mode is useful for comparison, but it is not how account equity usually behaves.”

## Important design principle

Use the same monthly return sequence across models.

This is crucial. If each model gets a different random sequence, users cannot compare fairly.

Recommended implementation:

1. generate one monthly return array
2. calculate smooth/fixed/compound paths from that same array
3. if user changes model, do not regenerate returns
4. only regenerate returns when user clicks “Generate new path” or changes return/volatility inputs

## Data model

Example monthly row:

```js
{
  month: 1,
  returnPct: 0.024,
  startBalance: 100000,
  pnl: 2400,
  cashflow: 0,
  endBalance: 102400
}
```

Example scenario state:

```js
{
  monthlyReturns: [0.024, -0.018, 0.051],
  model: 'compound',
  capital: 100000,
  cashflow: 0
}
```

## Risks / things to avoid

- Do not make the tool feel like a backtester.
- Do not overfit with too many trading knobs.
- Do not imply the simulated path is predictive.
- Avoid too many charts at once on mobile.
- Keep the default experience simple and visual.

## Recommendation

Yes, build this as v2.

The monthly returns bar chart plus same-sequence model comparison will make the tool much more educational. It turns the calculator from “final balance estimator” into “compounding behaviour explainer”, which fits Marble Lab better.

## Suggested final route

Keep the same tool URL:

`/compounding-returns/`

This is an enhancement, not a separate tool.
