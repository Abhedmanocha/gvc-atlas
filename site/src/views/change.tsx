import { Bars } from '../charts'
import { useJSON } from '../data'
import { pp, shift } from '../format'
import { rowOf } from '../types'
import type { Index } from '../types'
import { cap, economyName, LOAD_ERROR, ordinal, the } from '../words'
import type { Screen, View, ViewProps } from '.'

const BASE = 2017
const ROW_COUNT = 8 // shown from each end of the ranking
const MIN_EXPORTS = 50 // US$ m, in both years: tiny bases swing wildly
const RoW = 72 // Rest of World: not ranked

interface Entry { code: string; name: string; change: number; before: number; now: number }

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const last = meta.years.at(-1)!
  // Picking 2017 has nothing to compare with itself: compare it with the latest year.
  const end = sel.year === BASE ? last : sel.year
  const sentence = sel.year === BASE
    ? `Whose {sector} became more tied into global supply chains between {year} and ${last}?`
    : 'Whose {sector} became more tied into global supply chains between 2017 and {year}?'

  const then = useJSON<Index>(`${BASE}/index.json`)
  const now = useJSON<Index>(`${end}/index.json`)
  if (then instanceof Error || now instanceof Error) return { sentence, answer: <>{LOAD_ERROR}</> }
  if (!then || !now) return { sentence }

  const row = rowOf(sel.sector)
  const level = (d: Index, i: number) => {
    const b = d.gvc_b[i]![row]!, f = d.gvc_f[i]![row]!, e = d.e[i]![row]!
    return b == null || f == null || e == null || e < MIN_EXPORTS ? null : b + f
  }
  const ranked: Entry[] = []
  meta.economies.forEach((econ, i) => {
    if (i === RoW) return
    const before = level(then, i), after = level(now, i)
    if (before === null || after === null) return
    ranked.push({ code: econ.code, name: econ.name, change: after - before, before, now: after })
  })
  ranked.sort((a, b) => b.change - a.change)

  const at = ranked.findIndex(r => r.code === sel.economy)
  const me = ranked[at]
  const name = economyName(meta, sel.economy)

  const show = new Set<number>()
  ranked.forEach((_, i) => { if (i < ROW_COUNT || i >= ranked.length - ROW_COUNT || i === at) show.add(i) })
  const shown = [...show].sort((a, b) => a - b)

  return {
    sentence,
    answer: me
      ? <>{name}: {shift(me.before, me.now)} of its exports. {ordinal(at + 1)} of {ranked.length}.</>
      : sel.economy === 'RoW'
        ? <>{cap(the(name))} is a catch-all for many economies, so it is not ranked.</>
        : <>{cap(the(name))} exports too little here to compare.</>,
    chart: (
      <Bars
        diverging
        format={pp}
        onSelect={code => go({ economy: code })}
        rows={shown.map((i, k) => ({
          key: ranked[i]!.code,
          label: ranked[i]!.name,
          value: ranked[i]!.change,
          highlight: i === at,
          gap: k > 0 && i !== shown[k - 1]! + 1,
        }))}
      />
    ),
  }
}

export default { id: 'change', label: 'Change', useScreen } satisfies View
