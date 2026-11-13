import { Trend } from '../charts'
import { useJSON } from '../data'
import { pct, pp } from '../format'
import { rowOf, type Series } from '../types'
import type { Screen, View, ViewProps } from '.'

const FLAT = 0.01 // changes under 1 percentage point count as flat

/** First and last valid values of a series, with their years. */
function ends(values: (number | null)[], years: number[]) {
  const ok = values.flatMap((v, i) => (v === null ? [] : [{ v, year: years[i]! }]))
  return ok.length < 2 ? null : { from: ok[0]!, to: ok.at(-1)! }
}

function direction(d: number, up: string, down: string, same: string) {
  return d >= FLAT ? up : d <= -FLAT ? down : same
}

function useScreen({ sel, meta }: ViewProps): Screen {
  const data = useJSON<Series>(`series/${sel.economy}.json`)
  const sentence = "Is {economy}'s {sector} moving up the value chain?"
  if (!data || data instanceof Error) return { sentence }

  const row = rowOf(sel.sector)
  const b = data.gvc_b.map(y => y[row] ?? null)
  const f = data.gvc_f.map(y => y[row] ?? null)
  const eb = ends(b, meta.years)
  const ef = ends(f, meta.years)
  if (!eb || !ef) return { sentence, answer: <>Too few years of exports to tell.</> }

  const db = eb.to.v - eb.from.v
  const df = ef.to.v - ef.from.v
  const verdict =
    db <= -FLAT && df >= FLAT ? 'Yes.'
    : db >= FLAT && df <= -FLAT ? 'More assembly than before.'
    : db <= -FLAT && df < FLAT ? 'More home-made, but not more used in others’ exports.'
    : db > -FLAT && df >= FLAT ? 'More used in others’ exports, but not more home-made.'
    : db >= FLAT ? 'More imported parts, and not more used in others’ exports.'
    : 'Little has changed.'
  const tail = (e: NonNullable<typeof eb>, d: number, up: string, down: string, same: string) =>
    Math.abs(d) < FLAT
      ? `${same} ${pct(e.to.v)} (${pp(d)})`
      : `${direction(d, up, down, same)} from ${pct(e.from.v)} to ${pct(e.to.v)} (${pp(d)})`

  return {
    sentence,
    answer: <>
      {verdict} Foreign content in its exports {tail(eb, db, 'rose', 'fell', 'held near')} since {eb.from.year}, and
      the share other countries build into their own exports {tail(ef, df, 'rose', 'fell', 'held near')}.
    </>,
    chart: (
      <Trend
        years={meta.years}
        format={pct}
        series={[
          { label: 'foreign content', values: b },
          { label: 'reused abroad', values: f, tone: 'partner' },
        ]}
      />
    ),
  }
}

export default { id: 'position', label: 'Position', useScreen } satisfies View
