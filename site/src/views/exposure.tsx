import type { ReactNode } from 'react'
import { Bars } from '../charts'
import type { Tone } from '../charts'
import { useJSON } from '../data'
import { pct } from '../format'
import { rowOf } from '../types'
import type { Detail } from '../types'
import type { Screen, View, ViewProps } from '.'

const SENTENCE = "How much of {economy}'s {sector} depends on {partner} in {year}?"
const SHOWN = 12 // foreign origins in the chart
const NEGLIGIBLE = 0.05 // a route under 5% of the total is not worth a word

/** Segment colours = the colours of the words in the answer: the answer is the legend. */
const TONES: Tone[] = ['partner', 'home', 'rest'] // bought direct, via home suppliers, via other countries

function Key({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span style={{
      textDecoration: 'underline',
      textDecorationColor: `var(--data-${tone})`,
      textDecorationThickness: '3px',
      textUnderlineOffset: '4px',
    }}>{children}</span>
  )
}

function useScreen({ sel, meta, go }: ViewProps): Screen {
  const data = useJSON<Detail>(`${sel.year}/${sel.economy}.json`)
  if (!data || data instanceof Error) return { sentence: SENTENCE }

  const r = rowOf(sel.sector)
  const at = (field: (number | null)[][], c: number) => field[r]?.[c] ?? 0
  const parts = (c: number) => [at(data.direct, c), at(data.home, c), at(data.third, c)]
  const total = (c: number) => parts(c).reduce((a, b) => a + b, 0)

  const home = meta.economies.findIndex(e => e.code === sel.economy)
  const partner = meta.economies.findIndex(e => e.code === sel.partner)
  const name = (c: number) => meta.economies[c]!.name

  const ranked = meta.economies.map((_, c) => c).filter(c => c !== home).sort((a, b) => total(b) - total(a))
  if (!ranked.some(c => total(c) > 0)) return { sentence: SENTENCE, answer: <>No output to trace.</> }
  const shown = ranked.slice(0, SHOWN)
  if (!shown.includes(partner)) shown.push(partner)

  const [direct, viaHome, viaOthers] = parts(partner)
  const all = direct! + viaHome! + viaOthers!
  const hidden = viaHome! + viaOthers!
  const from = <Key tone="partner">a purchase from {name(partner)}</Key>
  const big = (v: number) => v / all >= NEGLIGIBLE || v >= hidden / 2 // never leave both routes unnamed
  const routes = [
    big(viaHome!) && <Key key="h" tone="home">suppliers in {name(home)}</Key>,
    big(viaOthers!) && <Key key="o" tone="rest">other countries</Key>,
  ].filter(Boolean)

  let rest: ReactNode = null
  if (all >= 0.0005) {
    const h = hidden / all
    if (h < NEGLIGIBLE) rest = <> Nearly all of it is {from}.</>
    else {
      const how = h >= 0.95 ? 'Almost all' : h >= 0.45 && h <= 0.55 ? 'About half' : `${pct(h)}`
      rest = <> {how} of that never shows up as {from}: it arrives inside inputs from {routes[0]}{routes[1] && <> and {routes[1]}</>}.</>
    }
  }

  return {
    sentence: SENTENCE,
    answer: <>{pct(all)} of every dollar.{rest}</>,
    chart: (
      <Bars
        rows={shown.map(c => ({
          key: meta.economies[c]!.code,
          label: name(c),
          value: parts(c),
          highlight: c === partner,
        }))}
        format={pct}
        tones={TONES}
        onSelect={code => go({ partner: code })}
      />
    ),
  }
}

export default { id: 'exposure', label: 'Exposure', useScreen } satisfies View
