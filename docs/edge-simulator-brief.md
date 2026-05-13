# Edge Simulator Brief

## Purpose

Build a Marble Lab tool for MarketMates lesson #2, "Mastering Statistics and Probabilities for Traders." The tool helps traders see that an edge comes from the combination of win rate, average win size, average loss size, and execution over a sample of trades.

## Route

`/edge-simulator/`

## Public name

Edge Simulator

## Lesson concepts supported

- Trading edge as a statistical advantage over time.
- Casino / lucky-dip framing: each trade is one draw from a distribution of possible R outcomes.
- High win rate does not automatically mean profitability.
- Payoff profile matters: average win versus average loss.
- R-multiples as a cleaner way to compare trades and strategies.
- Expectancy as average R per trade.
- Entries and exits affect both win rate and payoff.
- Position sizing changes the dollar impact of a strategy, but does not create edge by itself.
- Traders need to think probabilistically across a series of trades, not judge a system by one outcome.

## Inputs

- Win rate %
- Average win in R
- Average loss in R, entered as a positive loss magnitude
- Trades per month
- Starting balance
- Risk per trade %
- Simulated months
- Simulation paths

## Outputs

- Expectancy per trade in R
- Expected R per month
- Expected dollar result per month based on risk % and starting balance
- Break-even win rate for the current average win/loss profile
- Positive / negative / break-even edge status
- Comparison against the lesson examples:
  - 90% win rate, +0.1R average win, -1R average loss
  - 60% win rate, +1.5R average win, -1R average loss
  - 30% win rate, +5R average win, -1R average loss
- Lightweight simulated equity paths using a fixed-fraction risk model.

## Formulae

```text
Expectancy R = (win rate * average win R) - (loss rate * average loss R)
Expected monthly R = expectancy R * trades per month
Risk amount = starting balance * risk per trade %
Expected monthly dollars = expected monthly R * risk amount
Break-even win rate = average loss R / (average win R + average loss R)
```

## Copy and compliance

The page uses original MarketMates / Marble Lab framing and avoids implying any Van Tharp affiliation. It includes an educational-only, not-financial-advice disclaimer and highlights that high win rate does not equal profitability.
