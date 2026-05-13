# Drawdown Recovery Tool — Product Brief

## Working name

**Drawdown Recovery Calculator**

Possible public names:

- Drawdown Recovery Tool
- Recovery From Drawdown Calculator
- Drawdown Climb Calculator
- The Recovery Hill

## Purpose

A simple visual tool that shows how much return is required to recover from a given drawdown.

The teaching point:

> Losses and recovery are asymmetric. A 50% drawdown needs a 100% gain to get back to breakeven.

This should be short, punchy, and visual — not a complex simulator.

## Core user question

“If my account is down X%, what return do I need just to get back to breakeven?”

## Formula

Required recovery return:

```text
recovery % = drawdown / (1 - drawdown)
```

Where drawdown is expressed as a decimal.

Examples:

- 10% drawdown → 11.1% recovery needed
- 20% drawdown → 25.0% recovery needed
- 30% drawdown → 42.9% recovery needed
- 50% drawdown → 100.0% recovery needed
- 75% drawdown → 300.0% recovery needed

## Recommended v1 scope

Inputs:

- Drawdown percentage slider/input
- Optional starting balance for dollar context

Outputs:

- Current balance after drawdown
- Dollar loss
- Required return to recover
- Required profit in dollars
- Plain-English readout

Visuals:

1. **Before / after / recovery bars**
   - starting balance bar
   - post-drawdown balance bar
   - recovery required bar

2. **Recovery curve**
   - x-axis: drawdown %
   - y-axis: required recovery %
   - highlight selected drawdown

3. **Summary table graphic**
   - a clean, glanceable table/card graphic near the bottom
   - left column: drawdown amount
   - right column: recovery return required
   - suggested rows: 10%, 20%, 30%, 40%, 50%, 60%
   - purpose: make the main lesson obvious at a glance, even without touching the slider

   Example rows:
   - 10% → 11.1%
   - 20% → 25.0%
   - 30% → 42.9%
   - 40% → 66.7%
   - 50% → 100.0%
   - 60% → 150.0%

## UX style

Keep it dead simple:

- Left side: drawdown and starting balance controls
- Right side: big headline result
- Below: visual bars and quick reference

Example headline:

> A 30% drawdown requires a 42.9% gain to recover.

Example readouts:

- “Small drawdowns are annoying. Large drawdowns are maths with teeth.”
- “At 50% down, breakeven requires doubling the remaining account.”
- “This is why avoiding deep drawdowns matters more than it feels in the moment.”

## Route

`/drawdown-recovery/`

Final custom-domain URL:

`https://marblelab.marketmates.com/drawdown-recovery/`

## Relationship to other Marble Lab tools

- **Position Sizing Game** teaches how risk sizing creates drawdowns.
- **Position Sizing Calculator** helps estimate sizing from objectives.
- **Compounding Returns Calculator** shows growth paths and negative month impact.
- **Drawdown Recovery Tool** isolates the recovery maths in a simple visual lesson.

## Recommendation

Build this as a small standalone Marble Lab tool.

Do not add Monte Carlo, simulations, or trade inputs. The power is in the simplicity.
