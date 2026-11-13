import { useMemo } from 'react'
import { Bars } from '../charts'
import { useJSON } from '../data'
import { pct, usd } from '../format'
import { rowOf, type Detail } from '../types'
import { cap, economyName, LOAD_ERROR, lower, the } from '../words'
import type { Screen, View, ViewProps } from '.'

const MIN_IMPORTED = 0.1 // a tenth of what the buyer uses of the product comes from abroad

const SENTENCE = "Which imported inputs could {economy}'s {sector} buy at home in {year}?"

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const data = useJSON<Detail>(`${sel.year}/${sel.economy}.json`)
  const loaded = data && !(data instanceof Error) ? data : null

  // Products the economy exports competitively (rca > 1) but its buyers still import a real share of, largest first.
  const found = useMemo(() => {
    if (!loaded) return null
    const r = rowOf(sel.sector)
    const out = loaded.x[r] ?? 0
    return meta.sectors
      .map((s, p) => ({
        code: s.code,
        name: s.name,
        usd: (loaded.imp[r]?.[p] ?? 0) * out,
        share: loaded.impsh[r]?.[p] ?? 0,
        rca: loaded.rca[p] ?? 0,
      }))
      .filter(o => o.rca > 1 && o.share >= MIN_IMPORTED && o.usd > 0 && o.code !== sel.sector)
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 12)
  }, [loaded, meta, sel.sector])

  if (data instanceof Error) return { sentence: SENTENCE, answer: <>{LOAD_ERROR}</> }
  if (!found) return { sentence: SENTENCE }
  if (found.length === 0) {
    return { sentence: SENTENCE, answer: <>None. Nothing it imports here is also something it exports competitively.</> }
  }
  const top = found[0]!
  const economy = cap(the(economyName(meta, sel.economy)))
  const name = lower(top.name)
  return {
    sentence: SENTENCE,
    answer: <>{usd(top.usd)} of {name}. {economy} already exports {name} competitively, yet its buyers import {pct(top.share)} of what they use.</>,
    chart: (
      <Bars
        rows={found.map(o => ({ key: o.code, label: o.name, value: o.usd }))}
        format={usd}
        onSelect={sector => go({ sector })}
      />
    ),
  }
}

export default { id: 'gaps', label: 'Gaps', useScreen } satisfies View
