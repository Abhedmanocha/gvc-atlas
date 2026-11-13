# GVC Atlas — site

```
npm install
npm run dev      # http://localhost:5173
npm run build    # strict tsc, then dist/ (relative paths, works from any sub-path)
```

`#/dev` (unlinked) shows `Bars`, `Trend`, the formats and the palette with fake numbers.

## Files

```
src/main.tsx       entry
src/app.tsx        shell: loads meta, switcher, sentence, answer, chart, footer
src/route.ts       URL ⇄ Selection, useRoute
src/sentence.tsx   the sentence and its pickers
src/charts.tsx     Bars, Trend
src/format.ts      pct, pp, usd, shift (every number)
src/words.ts       the(), cap(), lower(), ordinal(), sector and economy names, shared sentences
src/data.ts        loadJSON, loadMeta, useJSON
src/views/         one file per view + index.ts (registry and contract)
src/tokens.css     design tokens
src/styles.css     everything else
```

## URL

`#/{economy}/{sector}/{year}/{view}[/{partner}]`, e.g. `#/IND/c14/2024/exposure/USA`.
`sector` may be `all`. Anything missing or invalid is rewritten to IND / all / latest year / exposure.
`partner` defaults to PRC (USA when the economy is PRC) and is left out of the URL when it is the default.

## Adding a view

Create `src/views/{id}.tsx`, then import it and add it to `views` in `src/views/index.ts`.

```tsx
import { Bars } from '../charts'
import { useJSON } from '../data'
import { pct } from '../format'
import type { Screen, View, ViewProps } from '.'

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const data = useJSON<number[]>(`exposure/${sel.year}.json`)
  const sentence = "How much of {economy}'s {sector} depends on {partner} in {year}?"
  if (!data || data instanceof Error) return { sentence }
  return {
    sentence,
    answer: <>{pct(data[0]!)} of it.</>,
    chart: <Bars rows={[]} format={pct} onSelect={partner => go({ partner })} />,
  }
}

export default { id: 'exposure', label: 'Exposure', useScreen } satisfies View
```

- `useScreen` is a hook: it may call `useJSON`, `useMemo`, etc. The shell remounts it when the view changes.
- `sentence` is a template. `{economy} {sector} {year} {partner}` become pickers; only the slots you use appear.
  `{economy}'s` handles "the Philippines'"; `the` and `{sector}` are lower-case in running text (`{sector}` reads "economy" when the sector is `all`).
  In the answer, write names with `the()` and `cap()` from `words.ts` ("the United States", "The rest of the world"); chart rows and pickers use bare names.
  A failed load: `answer: <>{LOAD_ERROR}</>`, the same sentence on every screen.
- Leave `answer` and `chart` undefined while loading; the shell keeps the space.
- `go(change)` updates the URL, e.g. clicking a bar sets the partner.
- Data paths are relative to `public/data/` (`"meta.json"`, never `"/data/meta.json"`).

## Charts

`Bars({ rows, format, onSelect?, tones?, max?, diverging? })` — rows `{ key, label, value: number | number[], highlight?, gap? }`.
Up to three stacked segments, coloured home, partner, rest. Rows are buttons when `onSelect` is given. `diverging`: signed values around a zero line; `gap` adds a break above a row.
`Key({ tone, children })` underlines words in a segment colour: the answer is the chart's legend. Colours mean the same in every view: orange = bought directly from the source, blue = arrives via home suppliers, grey = via other countries (Risk: grey = all hidden).

`Trend({ years, series, format, zero? })` — series `{ label, values: (number | null)[], tone? }`, 1–3 of them.
Labelled at the line ends; no legend, no grid. `zero` (default true) starts the scale at 0.

## Tokens (`src/tokens.css`)

| Token | Use |
|---|---|
| `--text-s/m/l/xl` | chart labels / body / answer / sentence |
| `--space-1…8` | 4, 8, 12, 16, 24, 32, 48, 64 px |
| `--bg --surface --raised --line` | page, quiet fills, pickers, hairlines |
| `--ink --ink-2 --ink-3` | text, secondary text, the footer |
| `--accent` | focus and current selection; same hue as home |
| `--data-home --data-partner --data-rest` | blue, orange, neutral grey. Use the classes `tone-home/partner/rest` in SVG |
| `--seq-1…5` | sequential ramp, less → more |

Dark mode comes from `prefers-color-scheme`; every token above is redefined there. Motion uses `--fast`, which is 0 under reduced motion.
In the sentence, the home economy is written in `--data-home` and the partner in `--data-partner`: the sentence is the legend.
