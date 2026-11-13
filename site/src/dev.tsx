// #/dev — unlinked review page for the chart primitives. Every number here is made up.
import { useState } from 'react'
import { Bars, Trend } from './charts'
import { pct, pp, usd } from './format'

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]

const ROWS = [
  { key: 'PRC', label: 'China', value: [0.081, 0.034, 0.012] },
  { key: 'USA', label: 'United States', value: [0.024, 0.011, 0.009] },
  { key: 'KOR', label: 'South Korea', value: [0.019, 0.006, 0.004] },
  { key: 'JPN', label: 'Japan', value: [0.015, 0.007, 0.003] },
  { key: 'TAP', label: 'Taipei,China', value: [0.011, 0.008, 0.001] },
  { key: 'GER', label: 'Germany', value: [0.009, 0.004, 0.002] },
  { key: 'RoW', label: 'Rest of World', value: [0.006, 0.002, 0.001] },
]

const FLAT = [
  { key: 'c14', label: 'Electronics & electrical', value: 412_000 },
  { key: 'c15', label: 'Transport equipment', value: 268_500 },
  { key: 'c9', label: 'Chemicals & pharma', value: 151_200 },
  { key: 'c12', label: 'Metals', value: 98_400 },
  { key: 'c4', label: 'Textiles', value: 3_150 },
  { key: 'c1', label: 'Agriculture', value: 640 },
]

export function Dev() {
  const [picked, setPicked] = useState('PRC')
  return (
    <main className="shell dev">
      <h1 className="sentence">Primitives</h1>

      <h2>Bars, stacked, clickable</h2>
      <Bars rows={ROWS.map(r => ({ ...r, highlight: r.key === picked }))} format={pct} onSelect={setPicked} />

      <h2>Bars, single, static</h2>
      <Bars rows={FLAT} format={usd} />

      <h2>Trend, three series</h2>
      <Trend
        years={YEARS}
        format={pct}
        series={[
          { label: 'China', values: [0.08, 0.09, 0.095, 0.11, 0.12, 0.118, 0.121, 0.127] },
          { label: 'United States', values: [0.05, 0.048, 0.045, 0.04, 0.041, 0.039, 0.036, 0.035], tone: 'partner' },
          { label: 'Everyone else', values: [0.11, 0.112, 0.108, 0.1, 0.104, 0.11, 0.115, 0.118], tone: 'rest' },
        ]}
      />

      <h2>Trend, one series, gap, not from zero</h2>
      <Trend years={YEARS} format={usd} zero={false}
        series={[{ label: 'India', values: [820_000, 870_000, 905_000, null, 990_000, 1_120_000, 1_240_000, 1_410_000] }]} />

      <h2>Format</h2>
      <p className="dev-format">
        {[0, 0.0004, 0.042, 0.0999, 0.342, 1].map(pct).join('  ')}<br />
        {[0.012, -0.14, 0.00001].map(pp).join('  ')}<br />
        {[0.4, 640, 999.7, 3_150, 9_960, 140_000, 1_400_000].map(usd).join('  ')}
      </p>

      <h2>Palette</h2>
      <div className="dev-swatches">
        {['home', 'partner', 'rest', 'seq-1', 'seq-2', 'seq-3', 'seq-4', 'seq-5', 'accent'].map(t => (
          <span key={t} style={{ background: `var(--${t.startsWith('seq') || t === 'accent' ? t : `data-${t}`})` }} title={t} />
        ))}
      </div>
    </main>
  )
}
