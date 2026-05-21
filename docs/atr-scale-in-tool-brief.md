# ATR Scale-In R Multiple Calculator Brief

Static Marble Lab tool at `/atr-scale-in/`.

## Purpose

Show the gross R impact of scaling into a trade at fixed ATR intervals. The v1 model is intentionally simple so users can compare structures quickly without a full trade-management simulator.

## Inputs

- Stop distance (ATR)
- Scale-in every (ATR)
- Maximum scale-ins
- Selected total move (ATR)
- Comparison moves as CSV/list, with an auto-generated simple series option

## Formula

```text
entries = 0 ATR, then every scale-in distance up to and including total move, capped by maximum scale-ins
P&L per entry = max(totalMoveATR - entryATR, 0) / stopDistanceATR R
gross unit-R = sum(P&L per entry)
normalised trade R = gross unit-R / total entries
scale-ins = entries - 1
```

## Included Presets

- Tight pyramid: 1 ATR stop, scale every 1 ATR, moves 3, 5, 7, 9
- Wider structure: 2 ATR stop, scale every 2 ATRs, moves 3, 5, 7, 9
- Slow builder: 3 ATR stop, scale every 3 ATRs, moves 3, 6, 9, 12

## Assumptions

Each entry uses the same initial unit size. One unit stopped at the chosen ATR stop distance equals -1R. The headline output is normalised across entries so capped scale-in examples do not display the summed unit-R as if it were the whole-trade R multiple. Stop movement, breakeven logic, spread, slippage, partial exits, skipped fills, and position limits are outside v1.

Public education only. Not financial advice.
