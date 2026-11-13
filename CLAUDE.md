# GVC Atlas

A static site that answers supply-chain questions from the ADB Multiregional Input-Output tables (72 economies + Rest of World, 35 sectors, 2017–2024).

## Bar

Linear's website, Apple Notes. Simple purpose, simple architecture, simple design, simple implementation. No taglines, helper text or secondary labels: if a screen needs them, fix the layout. Every choice must serve the reader, the developer and an AI agent at once. Fewer files, fewer dependencies, fewer concepts.

## Shape

```
*.xlsx                 raw ADB tables. Never committed, never modified.
pipeline/              Python, run with uv. xlsx -> cache -> metrics -> JSON.
  mrio/load.py         xlsx -> data/cache/{year}.npz
  mrio/metrics.py      every metric, defined once
  mrio/export.py       cache -> site/public/data/
  tests/
data/cache/            gitignored
site/                  Vite + React + TypeScript. Reads JSON only. No server.
site/public/data/      generated, committed. The public data API.
docs/data.md           the data contract: every file, every field, every formula
```

One command rebuilds everything: `uv run --project pipeline python -m mrio` (load, compute, validate, export).

## Data rules

- Node order is fixed: economy index `e` (0–72, order of `meta.json`), sector index `s` (0–34). Node `n = e*35 + s`. Arrays in JSON follow this order; never repeat labels inside data files.
- Parse the xlsx by labels (economy code row, `c1…c35`, `F1…F5`, row codes `r60 r99 r64 r69`), never by fixed cell position. Layout differs between years; some sheets report a million blank rows.
- Every year has the same 73 economies in the same order. Assert it.
- Units: millions of current US$. Shares are fractions 0–1, rounded to 4 significant digits in JSON.
- ADB's own `GVC Participation` and `Agglomeration Index` workbooks (2022–24) are test fixtures, not inputs.

## Site rules

- The URL is the state: `/#/{economy}/{sector}/{year}/{view}`, e.g. `/#/IND/c14/2024/exposure`. Besides `c1…c35`, the sector can be an aggregate: `all` (whole economy) or `mfg` (manufacturing, c3–c16).
- Views: `exposure`, `risk`, `position`, `gaps`, `change`.
- A screen is one sentence with pickers in it, one answer, one chart.
- Dependencies need a reason. No UI kit, no state library, no chart library unless hand-written SVG is clearly worse.
- Light and dark from `prefers-color-scheme`. Works at 360px wide.

## Working rules

- Stay inside your task's folder. Do not commit; the conductor reviews and commits.
- Report what you verified and what you did not.
