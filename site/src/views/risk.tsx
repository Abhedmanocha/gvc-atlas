import { Bars } from '../charts'
import { useJSON } from '../data'
import { pct } from '../format'
import { rowOf, type Detail } from '../types'
import type { Screen, View, ViewProps } from '.'

const sentence = "Which of {economy}'s industries lean most on foreign suppliers in {year}?"

/** 1st, 2nd, 3rd, 4th, 11th, 21st … */
function ordinal(n: number): string {
  const t = n % 100
  if (t >= 11 && t <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const d = useJSON<Detail>(`${sel.year}/${sel.economy}.json`)
  if (!d || d instanceof Error) return { sentence }

  // Sectors with real output (at least 0.1% of the economy's) and a defined foreign share.
  const total = d.x[35] ?? 0
  const list = []
  for (let i = 0; i < 35; i++) {
    const x = d.x[i]!
    const fva = d.fva[i]
    if (x > 0 && fva != null && x >= total * 0.001) list.push({ i, fva, direct: Math.min(d.fdirect[i] ?? 0, fva) })
  }
  list.sort((a, b) => b.fva - a.fva)
  if (list.length === 0) return { sentence }

  const picked = sel.sector === 'all' || sel.sector === 'mfg' ? -1 : rowOf(sel.sector)
  const rank = list.findIndex(r => r.i === picked)
  const lead = list[rank >= 0 ? rank : 0]!
  const name = meta.sectors[lead.i]!.name
  const topEcon = d.top[lead.i] != null ? meta.economies[d.top[lead.i]!]?.name : undefined
  const topVa = d.topva[lead.i]

  const place = rank < 0 || rank === 0 ? 'the most'
    : rank === list.length - 1 ? 'the least'
    : `${ordinal(rank + 1)} most`
  const answer = <>
    {name}: {pct(lead.fva)} of every dollar is earned abroad
    {list.length > 1 ? `, ${place} of ${list.length} industries` : ''}.
    {topEcon && topVa != null ? ` ${topEcon} is the largest source at ${pct(topVa)}.` : ''}
  </>

  return {
    sentence,
    answer,
    chart: (
      <Bars
        rows={list.map(r => ({
          key: `c${r.i + 1}`,
          label: meta.sectors[r.i]!.name,
          value: [r.direct, r.fva - r.direct],
          highlight: r.i === picked,
        }))}
        format={pct}
        tones={['home', 'rest']}
        onSelect={sector => go({ sector })}
      />
    ),
  }
}

export default { id: 'risk', label: 'Risk', useScreen } satisfies View
