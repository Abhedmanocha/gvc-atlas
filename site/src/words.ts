// Every name and phrase the views share: articles, capitals, ordinals, empty states.
import type { Meta } from './data'

/** One sentence for every failed load, so every screen fails the same way. */
export const LOAD_ERROR = "Couldn't load this data. Check your connection and try again."

/** A route under 5% of its total is not worth a word. */
export const NEGLIGIBLE = 0.05

const THE = new Set([
  'United States', 'United Kingdom', 'United Arab Emirates', 'Netherlands', 'Philippines',
  'Czech Republic', 'Kyrgyz Republic', 'Maldives',
])

/** An economy in running text: "the United States", "the rest of the world". Pickers and chart rows use the bare name. */
export function the(name: string): string {
  if (name === 'Rest of World') return 'the rest of the world'
  return THE.has(name) ? `the ${name}` : name
}

/** "the United States'", "India's". */
export const possessive = (s: string) => (/s$/.test(s) ? `${s}'` : `${s}'s`)

/** Capital first letter: the start of an answer. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Lower-case first letter: a sector name in running text ("electronics & electrical"). */
export const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export const economyName = (meta: Meta, code: string) => meta.economies.find(e => e.code === code)?.name ?? code

/** A sector in running text. */
export function sectorWord(meta: Meta, code: string): string {
  if (code === 'all') return 'economy'
  if (code === 'mfg') return 'manufacturing'
  return lower(meta.sectors.find(s => s.code === code)?.name ?? code)
}

/** 1st, 2nd, 3rd, 4th, 11th, 21st … */
export function ordinal(n: number): string {
  const t = n % 100
  if (t >= 11 && t <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}
