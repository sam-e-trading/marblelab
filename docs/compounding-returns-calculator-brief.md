# Compounding Returns Calculator — Product Brief

## Working name

**Compounding Returns Calculator**

Possible public names:

- Trader Compounding Calculator
- Returns Compounding Lab
- Growth Path Calculator
- Marble Lab Compounding Tool

## Purpose

A practical calculator for traders to understand how returns compound over time under different assumptions:

1. smooth fixed monthly returns
2. variable monthly returns using a return distribution
3. deposits/withdrawals and capital changes
4. different compounding assumptions

The goal is to make compounding feel tangible without pretending trading returns are smooth, guaranteed, or spreadsheet-obedient.

## Core user question

“If I start with this capital and target this kind of monthly return, what could my account look like over time — and how ugly might the path be?”

## Target users

- developing traders setting realistic growth objectives
- educators explaining compounding, volatility drag, and drawdowns
- funded-account traders comparing payout/reinvestment plans
- portfolio/risk-minded traders modelling return paths

## Key inputs

### Basic inputs

- Starting capital
- Time period
  - months
  - years
- Return input mode
  - fixed monthly return
  - annual return converted to monthly
  - custom monthly return distribution
- Monthly contribution / withdrawal
- Compounding frequency
  - monthly
  - quarterly
  - annually
  - no compounding / simple return comparison

### Distribution inputs

For variable returns mode:

- Average monthly return
- Monthly return volatility / standard deviation
- Best month cap
- Worst month cap
- Probability of losing month
- Optional skew setting
  - balanced
  - fat-tail downside
  - trend-following style: small losses, occasional big winners

### Trader-specific inputs

Optional later:

- Payout percentage
- Reinvest percentage
- Profit split
- Max drawdown limit
- Stop trading if drawdown threshold hit
- Reset / scale down after drawdown

## Outputs

### Headline metrics

- Ending balance
- Total return
- CAGR / annualised return
- Total contributions
- Profit after contributions
- Best case / median / worst case from simulations
- Max drawdown estimate
- Probability of finishing below starting capital
- Probability of hitting a drawdown threshold

### Visuals

- Smooth growth curve
- Simulated equity paths
- Distribution of ending balances
- Drawdown distribution
- Month-by-month table

## Calculation modes

### 1. Smooth fixed return

Simple compounding:

`ending balance = starting capital × (1 + monthly return)^months`

Plus optional monthly contributions:

`balance = balance × (1 + monthly return) + contribution`

Useful for understanding the idealised path.

### 2. Variable return simulation

Monte Carlo monthly returns using user-defined assumptions.

Each simulated month generates a return, applies it to balance, then applies contribution/withdrawal rules.

Outputs percentile bands:

- p10
- p25
- median
- p75
- p90

### 3. Simple vs compound comparison

Compare:

- simple non-compounded returns
- compounded returns
- compounded with contributions
- compounded with withdrawals/payouts

This makes the difference visible without needing a lecture.

## Important educational concepts

- Smooth returns are fiction, but useful fiction.
- Volatility drag matters: +10%, -10% does not equal flat.
- The average monthly return is not the same as the lived path.
- Big drawdowns require much bigger recoveries.
- Contributions can dominate returns early.
- Withdrawals/payouts reduce compounding power.
- High return targets can look silly once drawdown probability is shown.

## Suggested first version

Keep v1 focused:

1. Starting capital
2. Time horizon in years/months
3. Fixed monthly return
4. Optional monthly contribution/withdrawal
5. Variable return mode with:
   - average monthly return
   - monthly volatility
   - simulations count
6. Outputs:
   - smooth ending balance
   - simulated median ending balance
   - p10/p90 ending balance
   - max drawdown estimate
   - probability of finishing negative/under start
7. Charts:
   - smooth curve
   - simulated percentile fan chart
   - ending balance histogram

## Out of scope for v1

- tax
- brokerage fees
- swaps/financing
- trade-level expectancy modelling
- portfolio correlation
- exact strategy backtesting
- account currency conversion
- broker margin rules

Those are real, but adding them now would turn a useful calculator into a spreadsheet goblin nest.

## Recommended UX

Marble Lab style:

- left-side controls
- right-side dashboard outputs
- chart area below or beside metrics
- plain-English “readout” that explains the result
- warning when assumptions are extreme

Example readouts:

- “Smooth path looks lovely. The simulated path is less polite.”
- “Your median result is strong, but the left tail is doing crimes.”
- “Contributions are doing most of the heavy lifting early. This is normal.”
- “This target return implies a drawdown profile that may be hard to sit through.”

## Relationship to existing Marble Lab tools

- **Position Sizing Game**: teaches risk sizing through trade outcomes.
- **Position Sizing Calculator**: estimates 1R and objective-based sizing.
- **Compounding Returns Calculator**: models capital growth and return paths over time.

Together, these form a coherent risk/growth education suite.

## Recommended route

`/compounding-returns/`

Possible final URL:

`https://marblelab.marketmates.com/compounding-returns/`

## Open questions before build

1. Should this be trader-specific from day one, or a general compounding calculator with trader language?
2. Should monthly returns allow negative averages?
3. Should withdrawals/payouts be included in v1?
4. Should distribution mode be simple normal distribution, or should we offer trader-style presets?
5. Should the output include downloadable/copyable summary text?

## Recommendation

Build v1 as a trader-focused but simple compounding calculator:

- fixed monthly return mode
- variable monthly return simulation mode
- optional monthly contribution/withdrawal
- percentile outcomes
- drawdown estimate
- plain-English readout

Avoid funded-account/payout complexity until v2.
