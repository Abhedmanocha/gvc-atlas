import { Bars } from '../charts'
import { useJSON } from '../data'
import { pct, pp } from '../format'
import { rowOf } from '../types'
import type { Index } from '../types'
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
  if (!then || !now || then instanceof Error || now instanceof Error) return { sentence }

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
  const name = meta.economies.find(e => e.code === sel.economy)?.name ?? sel.economy

  const show = new Set<number>()
  ranked.forEach((_, i) => { if (i < ROW_COUNT || i >= ranked.length - ROW_COUNT || i === at) show.add(i) })
  const shown = [...show].sort((a, b) => a - b)

  return {
    sentence,
    answer: me
      ? <>{name}: {describe(me)}. {ordinal(at + 1)} of {ranked.length}.</>
      : sel.economy === 'RoW'
        ? <>Rest of World is a catch-all for many economies, so it is not ranked.</>
        : <>{name} exports too little in this sector to compare.</>,
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

/** "up 3.2 points, from 34% to 37% of its exports" */
function describe(e: Entry): string {
  const points = pp(Math.abs(e.change)).replace(/^\S/, '').replace(' pp', '')
  const span = `from ${pct(e.before)} to ${pct(e.now)} of its exports`
  if (pp(e.change).startsWith('±')) return `little changed, at ${pct(e.now)} of its exports`
  return `${e.change > 0 ? 'up' : 'down'} ${points} points, ${span}`
}

function ordinal(n: number): string {
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]!
  return `${n}${suffix}`
}

export default { id: 'change', label: 'Change', useScreen } satisfies View
