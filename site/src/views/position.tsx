import { Trend } from '../charts'
import { useJSON } from '../data'
import { pct, shift } from '../format'
import { rowOf, type Series } from '../types'
import { LOAD_ERROR } from '../words'
import type { Screen, View, ViewProps } from '.'

const FLAT = 0.01 // changes under 1 percentage point count as flat

/** Verdicts by [foreign content][reused abroad], each 0 = down, 1 = flat, 2 = up. */
const VERDICT = [
  ['Pulling back from supply chains.', 'More home-made, but not more used in others’ exports.', 'Yes.'],
  ['Less used in others’ exports, and no more home-made.', 'Little has changed.', 'More used in others’ exports, but not more home-made.'],
  ['More assembly than before.', 'More imported parts, and not more used in others’ exports.', 'Deeper in supply chains, both ways.'],
] as const

const trend = (d: number) => (d >= FLAT ? 2 : d <= -FLAT ? 0 : 1)

/** First and last valid values of a series, with their years. Tiny negative shares show as 0. */
function ends(values: (number | null)[], years: number[]) {
  const ok = values.flatMap((v, i) => (v === null ? [] : [{ v: Math.max(0, v), year: years[i]! }]))
  return ok.length < 2 ? null : { from: ok[0]!, to: ok.at(-1)! }
}

function useScreen({ sel, meta }: ViewProps): Screen {
  const data = useJSON<Series>(`series/${sel.economy}.json`)
  const sentence = "Is {economy}'s {sector} moving up the value chain?"
  if (!data) return { sentence }
  if (data instanceof Error) return { sentence, answer: <>{LOAD_ERROR}</> }

  const row = rowOf(sel.sector)
  const clamp = (v: number | null | undefined) => (v == null ? null : Math.max(0, v))
  const b = data.gvc_b.map(y => clamp(y[row]))
  const f = data.gvc_f.map(y => clamp(y[row]))
  const eb = ends(b, meta.years)
  const ef = ends(f, meta.years)
  if (!eb || !ef) return { sentence, answer: <>There are too few years of exports here to tell.</> }

  const verdict = VERDICT[trend(eb.to.v - eb.from.v)]![trend(ef.to.v - ef.from.v)]!
  // One "since" for both only when both start in the same year.
  const sinceF = ef.from.year === eb.from.year ? '' : `since ${ef.from.year}, `

  return {
    sentence,
    answer: <>
      {verdict} Since {eb.from.year}, foreign content in its exports is {shift(eb.from.v, eb.to.v, FLAT)}, and {sinceF}
      the share other countries build into their own exports is {shift(ef.from.v, ef.to.v, FLAT)}.
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
