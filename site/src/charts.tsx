import { useLayoutEffect, useRef, useState } from 'react'

/** Data roles, in segment/series order. Colours live in tokens.css. */
export type Tone = 'home' | 'partner' | 'rest'
const TONES: Tone[] = ['home', 'partner', 'rest']

export interface BarRow {
  key: string
  label: string
  /** One value, or up to three stacked segments (coloured home, partner, rest unless `tones` says otherwise). */
  value: number | number[]
  highlight?: boolean
}

/** Ranked horizontal bars: label, bar, value. Rows are buttons when `onSelect` is given. */
export function Bars({ rows, format, onSelect, tones = TONES, max }: {
  rows: BarRow[]
  format: (v: number) => string
  onSelect?: (key: string) => void
  tones?: Tone[]
  /** Scale maximum; defaults to the largest row total. */
  max?: number
}) {
  const totals = rows.map(r => sum(r.value))
  const top = max ?? Math.max(0, ...totals)
  return (
    <ol className="bars">
      {rows.map((row, i) => {
        const total = totals[i]!
        const segs = Array.isArray(row.value) ? row.value : [row.value]
        let x = 0
        const content = <>
          <span className="bars-label">{row.label}</span>
          <svg className="bars-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
            {segs.map((v, j) => {
              const w = top > 0 ? (Math.max(0, v) / top) * 100 : 0
              const rect = <rect key={j} x={x} y={0} width={w} height={10} className={`tone-${tones[j] ?? 'rest'}`} />
              x += w
              return rect
            })}
          </svg>
          <span className="bars-value">{format(total)}</span>
        </>
        const cls = row.highlight ? 'bars-row highlight' : 'bars-row'
        return (
          <li key={row.key}>
            {onSelect
              ? <button type="button" className={cls} onClick={() => onSelect(row.key)}>{content}</button>
              : <div className={cls}>{content}</div>}
          </li>
        )
      })}
    </ol>
  )
}

export interface Series {
  label: string
  /** One value per year; null for a gap. */
  values: (number | null)[]
  tone?: Tone
}

const H = 168 // px
const PAD = { top: 12, bottom: 24, left: 4 }
const LABEL_GAP = 16 // min vertical px between end labels

/** A small multi-year line chart, 1–3 series, labelled at the line ends. */
export function Trend({ years, series, format, zero = true }: {
  years: number[]
  series: Series[]
  format: (v: number) => string
  /** Start the y scale at 0 (honest for shares and levels). */
  zero?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const all = series.flatMap(s => s.values.filter((v): v is number => v !== null))
  const min = Math.min(...all)
  const hi = Math.max(...all)
  // Not from zero: a little air below the lowest point, and no baseline (it would read as 0).
  const lo = zero ? Math.min(0, min) : min - (hi - min) * 0.08
  const span = hi - lo || Math.abs(hi) || 1

  // End labels: value + name, right of the lines. Width is estimated; the font is fixed-size.
  const ends = series.map((s, i) => {
    const last = lastIndex(s.values)
    const v = last < 0 ? null : s.values[last]!
    return { s, i, last, v, text: v === null ? '' : `${format(v)} ${s.label}` }
  })
  const labelW = Math.min(width * 0.45, 8 + 7.2 * Math.max(0, ...ends.map(e => e.text.length)))
  const plotR = width - labelW
  const xAt = (i: number) => PAD.left + (years.length > 1 ? (i / (years.length - 1)) * (plotR - PAD.left - 8) : 0)
  const yAt = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom)

  // Nudge labels apart, top to bottom, then pull the stack back inside the plot.
  const placed = ends.filter(e => e.v !== null).map(e => ({ ...e, y: yAt(e.v!) })).sort((a, b) => a.y - b.y)
  placed.forEach((p, k) => { if (k > 0) p.y = Math.max(p.y, placed[k - 1]!.y + LABEL_GAP) })
  const overflow = (placed.at(-1)?.y ?? 0) - (H - PAD.bottom)
  if (overflow > 0) placed.forEach(p => { p.y -= overflow })

  const summary = ends.map(e => e.text).filter(Boolean).join(', ')
  return (
    <div ref={box} className="trend">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`${years[0]}–${years.at(-1)}: ${summary} in ${years.at(-1)}`}>
          {zero && <line className="trend-base" x1={PAD.left} x2={plotR - 8} y1={yAt(lo)} y2={yAt(lo)} />}
          <text className="trend-year" x={xAt(0)} y={H - 6}>{years[0]}</text>
          <text className="trend-year" x={xAt(years.length - 1)} y={H - 6} textAnchor="end">{years.at(-1)}</text>
          {ends.map(({ s, i, last }) => {
            const tone = s.tone ?? TONES[i] ?? 'rest'
            return (
              <g key={s.label} className={`tone-${tone}`}>
                <path className="trend-line" d={linePath(s.values, xAt, yAt)} />
                {last >= 0 && <circle cx={xAt(last)} cy={yAt(s.values[last]!)} r={3.5} />}
              </g>
            )
          })}
          {placed.map(p => (
            <text key={p.s.label} className="trend-label" x={plotR} y={p.y} dominantBaseline="middle">
              <tspan className="trend-value">{format(p.v!)}</tspan> {p.s.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

function sum(v: number | number[]) {
  return Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v
}

function lastIndex(values: (number | null)[]) {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i
  return -1
}

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v === null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return d
}
