# Position Sizing Lab

A free, dependency-free trading-risk simulator for learning position sizing, expectancy, drawdown, and risk of ruin.

Use a preset trading system or define your own win rate, average win, and average loss. The sizing is yours. That is usually where the bodies are buried.

## Public/community intent

This project is designed to be simple enough for community use, workshops, trading education sessions, and local tinkering:

- no build step
- no dependencies
- no accounts
- no tracking
- no backend
- works from a static host

## What it teaches

- Expectancy is not enough.
- Position sizing controls survival.
- Positive-edge systems can still have ugly drawdowns.
- Oversizing can ruin a good strategy.
- Fixed-fractional sizing is boring in exactly the way seatbelts are boring.
- Small changes in win rate, payoff ratio, or average loss can completely change the shape of the equity curve.

## Run locally

From this folder:

```bash
python3 -m http.server 8766
```

Then open:

```text
http://localhost:8766
```

You can also open `index.html` directly in a browser.

## Deploy publicly

Because this is static HTML/CSS/JS, you can host it on:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- any ordinary static web server

Upload the contents of this folder and point the static host at `index.html`.

## Files

- `index.html` — app shell and public copy
- `styles.css` — visual design
- `app.js` — simulator logic
- `LICENSE` — MIT license
- `CONTRIBUTING.md` — community contribution notes

## Attribution / affiliation

This is an original educational simulator inspired by classic position-sizing lessons popularised in trading education, including Van Tharp-style exercises. It is not affiliated with or endorsed by Van Tharp, the Van Tharp Institute, or any trading education provider.

## Disclaimer

Educational only. Not financial advice. Not investment advice. Not a trading system. Real markets include slippage, correlation, changing volatility, liquidity constraints, execution risk, broker issues, psychological errors, and many other little goblins.
