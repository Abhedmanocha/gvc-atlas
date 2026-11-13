// Every number on the site goes through here.

const MINUS = '−'

/** One decimal under 10, none above: 4.2, 34. Rounding never produces "10.0". */
function short(v: number): string {
  const one = v.toFixed(1)
  return Number(one) < 10 ? one : v.toFixed(0)
}

/** Share 0–1 → "34%", "4.2%", "<0.1%". */
export function pct(x: number): string {
  if (!Number.isFinite(x)) return '–'
  const p = Math.abs(x) * 100
  if (p === 0) return '0%'
  if (p < 0.05) return x < 0 ? `>${MINUS}0.1%` : '<0.1%'
  return `${x < 0 ? MINUS : ''}${short(p)}%`
}

/** Change in a share (difference of two 0–1 shares) → "+1.2 pp", "−14 pp". */
export function pp(x: number): string {
  if (!Number.isFinite(x)) return '–'
  const s = short(Math.abs(x) * 100)
  return `${Number(s) === 0 ? '±' : x > 0 ? '+' : MINUS}${s} pp`
}

/** Millions of current US$ → "$640m", "$3.2bn", "$140bn", "$1.4tn". */
export function usd(millions: number): string {
  if (!Number.isFinite(millions)) return '–'
  const sign = millions < 0 ? MINUS : ''
  let m = Math.abs(millions)
  for (const unit of ['m', 'bn', 'tn']) {
    const s = unit === 'm' ? m.toFixed(0) : short(m)
    if (Number(s) < 1000 || unit === 'tn') return `${sign}$${s}${unit}`
    m /= 1000
  }
  return '–'
}
