# Marble Lab

Small practical trading tools and experiments from MarketMates.

## Tools

- `/position-sizing/` — Position Sizing Game, a browser-based simulator for position sizing, expectancy, drawdown, and risk behaviour.
- `/position-sizing-calculator/` — Position Sizing Calculator, an objective-based calculator for 1R, expected return, expectancy, and drawdown.
- `/compounding-returns/` — Compounding Returns Calculator, a trader-focused growth path modeller with smooth returns, variable monthly simulations, percentile outcomes, and drawdown estimates.
- `/drawdown-recovery/` — Drawdown Recovery Calculator, a simple visual tool showing the return required to recover from drawdowns.

## Deploy

This is a static site. Deploy with Cloudflare Pages:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`
- Production branch: `main`

Then add the custom domain:

`marblelab.marketmates.com`

Position Sizing Game will be available at:

`https://marblelab.marketmates.com/position-sizing/`

The Position Sizing Calculator will be available at:

`https://marblelab.marketmates.com/position-sizing-calculator/`

The Compounding Returns Calculator will be available at:

`https://marblelab.marketmates.com/compounding-returns/`

The Drawdown Recovery Calculator will be available at:

`https://marblelab.marketmates.com/drawdown-recovery/`
