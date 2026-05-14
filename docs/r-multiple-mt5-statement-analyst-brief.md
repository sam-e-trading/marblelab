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
The sample is enough to build a first version of the analyst, but true R-multiple quality depends on whether the S/L column represents the original planned stop.

In the sample, some closed trades have S/L on the profitable side of entry or equal to entry. Those are likely moved stops / breakeven / take-profit-like exits, so they should be flagged rather than treated as original 1R.

## R calculation approach
For trades where the stop is adverse to entry:

- Buy: `R = (close_price - entry_price) / (entry_price - stop_loss)`
- Sell: `R = (entry_price - close_price) / (stop_loss - entry_price)`

Only calculate direct R when:
- buy stop loss < entry, or
- sell stop loss > entry.

Otherwise mark R as one of:
- `stop moved / non-adverse stop`
- `breakeven stop`
- `missing stop`
- `manual 1R required`

## First-pass sample stats
From the received sample:
- Total closed positions: 96
- Trades with adverse stop suitable for direct R estimate: 78
- Trades needing flags/manual interpretation: 18
- Net P/L: 692.42
- Net winners: 21
- Net losers: 75
- Approx R sum across directly R-able trades: -41.56R
- Approx average R: -0.53R
- Approx median R: -0.73R
- Approx best direct R: +4.61R
- Approx worst direct R: -1.00R

These are provisional because moved stops can distort the R interpretation.

## Suggested tool outputs
- Upload MT5 XLSX/HTML statement.
- Parse positions, orders, deals, and results.
- Show import quality warnings.
- Show table of trades with:
  - symbol, side, volume, entry, stop, close, P/L, commission, swap, net P/L
  - direct R where valid
  - flag where R cannot be trusted
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

## Design decision needed
Choose default handling for non-direct-R trades:
1. strict mode: exclude from R stats and flag clearly
2. assisted mode: let user enter planned risk per trade or account risk setting
3. hybrid mode: direct R where valid, manual/estimated R where not

Recommended MVP: hybrid mode, with strict default and visible warnings.
