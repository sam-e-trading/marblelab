# R-Multiple MT5 Statement Analyst — Brief

## Input sample
- MT5 XLSX trade history report received from Sam on 2026-05-14.
- Workbook structure includes one worksheet with sections: account metadata, `Positions`, `Orders`, `Deals`, and `Results`.

## Usable fields in `Positions`
Columns observed:
- Open time
- Position id
- Symbol
- Type (`buy` / `sell`)
- Volume
- Entry price
- S/L
- T/P
- Close time
- Close price
- Commission
- Swap
- Profit

## Key finding
The sample is enough to build a first version of the analyst. For the MVP, Sam wants the user to enter one account-wide dollar value for 1R rather than trying to infer the original planned risk from the MT5 S/L column.

Example:
- User enters: `1R = $100`
- Trade net P/L: `$250`
- Trade result: `+2.5R`

This is deliberately simple and avoids pretending the MT5 report always preserves original risk. In the sample, some closed trades have S/L on the profitable side of entry or equal to entry. Those are likely moved stops / breakeven / take-profit-like exits, so S/L-based R should be treated as diagnostic/optional rather than the MVP source of truth.

## MVP R calculation approach
Primary MVP calculation:

- `net_pnl = profit + commission + swap`
- `R = net_pnl / user_entered_one_r_dollars`

Required user input:
- `1R dollar value` for the uploaded statement, e.g. `$100`

Validation:
- 1R must be greater than zero.
- The tool should clearly state that this assumes the same planned dollar risk for all trades in the uploaded statement.
- If a trader varied risk per trade, v1 results are approximate and should be interpreted as a normalised review rather than exact original R.

Optional diagnostic calculation from S/L where the stop is adverse to entry:

- Buy: `price_R = (close_price - entry_price) / (entry_price - stop_loss)`
- Sell: `price_R = (entry_price - close_price) / (stop_loss - entry_price)`

Only calculate diagnostic price-R when:
- buy stop loss < entry, or
- sell stop loss > entry.

Otherwise mark S/L status as one of:
- `stop moved / non-adverse stop`
- `breakeven stop`
- `missing stop`

## First-pass sample stats
From the received sample:
- Total closed positions: 96
- Net P/L: 692.42
- Net winners: 21
- Net losers: 75
- If user entered `1R = $100`, statement result would be approximately `+6.92R` net.
- Trades with adverse stop suitable for optional diagnostic price-R: 78
- Trades needing S/L flags/manual interpretation if using stop-based diagnostics: 18

The previous stop-based direct-R estimates are useful as diagnostics only because moved stops can distort the original-risk interpretation.

## Suggested tool outputs
- Upload MT5 XLSX/HTML statement.
- User enters the dollar value of 1R for this statement, e.g. `$100`.
- Parse positions, orders, deals, and results.
- Show import quality warnings and explain the fixed-1R assumption.
- Show table of trades with:
  - symbol, side, volume, entry, stop, close, P/L, commission, swap, net P/L
  - net P/L
  - R based on user-entered 1R dollars
  - optional S/L diagnostic flag where stop data looks moved/missing/non-adverse
- Summary stats:
  - total trades
  - win rate
  - gross/net P&L
  - profit factor
  - expectancy in money and R
  - average win/loss
  - average win R / average loss R
  - payoff ratio
  - cumulative R curve
  - drawdown in money and R
  - symbol breakdown
  - long/short breakdown
  - holding time stats
  - consecutive wins/losses
- Educational framing only, not financial advice.

## Phase 2 idea
Later, build or support an MT5 algo/EA/export that records better original-risk data per trade, especially:
- max gross loss per trade
- original planned stop/risk at entry
- MAE/MFE if available
- per-trade intended 1R in account currency

Then allow the user to upload that alongside the statement for more accurate per-trade R analysis.

## R method decision update
Default user-facing methods:

1. **Stop-loss max loss** — preferred default. User enters the gross dollar loss expected if the stop-loss is hit. Example: if the planned max loss at stop is `$50`, then `1R = $50`.
2. **Median gross loss estimate** — fallback when exact planned risk is missing. The tool estimates `1R` from the median absolute gross loss of losing trades in the statement. This must be labelled as estimated because it infers risk after the fact.

Keep **Fixed 1R dollar value** as a compatibility/manual mode for users who already know their account-wide 1R.

Current implementation: upload + R method selector + clear caveat that median mode is approximate.
