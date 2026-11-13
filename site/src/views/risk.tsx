import type { ReactNode } from 'react'
import { Bars, Key } from '../charts'
import { useJSON } from '../data'
import { pct } from '../format'
import { rowOf, type Detail } from '../types'
import { cap, LOAD_ERROR, NEGLIGIBLE, ordinal, the } from '../words'
import type { Screen, View, ViewProps } from '.'

const sentence = "Which of {economy}'s industries lean most on foreign suppliers in {year}?"

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const d = useJSON<Detail>(`${sel.year}/${sel.economy}.json`)
  if (!d) return { sentence }
  if (d instanceof Error) return { sentence, answer: <>{LOAD_ERROR}</> }

  // Sectors with real output (at least 0.1% of the economy's) and a defined foreign share.
  const total = d.x[35] ?? 0
  const list = []
  for (let i = 0; i < 35; i++) {
    const x = d.x[i]!
    const fva = d.fva[i]
    if (x > 0 && fva != null && x >= total * 0.001) list.push({ i, fva, direct: Math.min(d.fdirect[i] ?? 0, fva) })
  }
  list.sort((a, b) => b.fva - a.fva)
  if (list.length === 0) return { sentence, answer: <>There is no output here to rank.</> }

  const picked = sel.sector === 'all' || sel.sector === 'mfg' ? -1 : rowOf(sel.sector)
  const rank = list.findIndex(r => r.i === picked)
  const lead = list[rank >= 0 ? rank : 0]!
  const name = meta.sectors[lead.i]!.name
  const topEcon = d.top[lead.i] != null ? meta.economies[d.top[lead.i]!]?.name : undefined
  const topVa = d.topva[lead.i]

  const place = rank < 0 || rank === 0 ? 'the most'
    : rank === list.length - 1 ? 'the least'
    : `${ordinal(rank + 1)} most`
  const hidden = lead.fva - lead.direct
  const bought = <Key tone="partner">bought directly from abroad</Key>
  const buried = <Key tone="rest">hidden inside inputs from other suppliers</Key>
  let split: ReactNode = null
  if (lead.fva >= 0.0005) {
    if (hidden / lead.fva < NEGLIGIBLE) split = <> Nearly all of it is {bought}.</>
    else if (lead.direct / lead.fva < NEGLIGIBLE) split = <> Almost none of it is {bought}; it arrives {buried}.</>
    else split = <> {pct(lead.direct)} is {bought}; {pct(hidden)} is {buried}.</>
  }
  const answer = <>
    {name}: {pct(lead.fva)} of every dollar is earned abroad
    {list.length > 1 ? `, ${place} of ${list.length} industries` : ''}.
    {topEcon && topVa != null ? ` ${cap(the(topEcon))} is the largest source at ${pct(topVa)}.` : ''}
    {split}
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
        tones={['partner', 'rest']}
        onSelect={sector => go({ sector })}
      />
    ),
  }
}

export default { id: 'risk', label: 'Risk', useScreen } satisfies View
