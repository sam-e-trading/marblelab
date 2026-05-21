# ATR Scale-In R Multiple Calculator Brief

Static Marble Lab tool at `/atr-scale-in/`.

## Purpose

Show the gross R impact of scaling into a trade at fixed ATR intervals. The v1 model is intentionally simple so users can compare structures quickly without a full trade-management simulator.

## Inputs

- Stop distance (ATR)
- Scale-in every (ATR)
- Maximum additional scale-ins
- Scale-in sizing mode: equal, half-size adds, double-size adds, pyramid down, or custom sequence
- Selected total move (ATR)
- Comparison moves as CSV/list, with an auto-generated simple series option

## Formula

```text
entries = 0 ATR, then every scale-in distance up to and including total move, capped by maximum additional scale-ins
P&L per entry = size multiplier * max(totalMoveATR - entryATR, 0) / stopDistanceATR R
gross weighted unit-R = sum(P&L per entry)
normalised trade R = gross weighted unit-R / total position size
additional scale-ins = total entries - 1
```

## Included Presets

- Tight pyramid: 1 ATR stop, scale every 1 ATR, moves 3, 5, 7, 9
- Wider structure: 2 ATR stop, scale every 2 ATRs, moves 3, 5, 7, 9
- Slow builder: 3 ATR stop, scale every 3 ATRs, moves 3, 6, 9, 12

## Assumptions

One 1x unit stopped at the chosen ATR stop distance equals -1R. Size multipliers weight each entry; custom sequences repeat the final value if there are more entries than supplied values. The headline output is normalised by total position size so capped scale-in examples do not display the summed unit-R as if it were the whole-trade R multiple. Stop movement, breakeven logic, spread, slippage, partial exits, skipped fills, and position limits are outside v1.

Public education only. Not financial advice.
