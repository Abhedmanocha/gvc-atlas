// Shapes of the generated data files. Contract and formulas: docs/data.md.
// Rows: 0..34 = c1..c35, 35 = all, 36 = mfg. Economy arrays follow meta.json order (72 = RoW).
// Per $ = per $1 of the row's gross output. Levels in US$ million.

export const ROW_ALL = 35
export const ROW_MFG = 36

/** Row index for 'c1'..'c35' | 'all' | 'mfg'. */
export function rowOf(sectorCode: string): number {
  if (sectorCode === 'all') return ROW_ALL
  if (sectorCode === 'mfg') return ROW_MFG
  const m = /^c([1-9]|[12]\d|3[0-5])$/.exec(sectorCode)
  if (!m) throw new Error(`unknown sector ${sectorCode}`)
  return Number(m[1]) - 1
}

/** One value per row (37). */
type Rows<T> = T[]

/** Scalar fields, one value per row. */
export interface Scalars {
  /** Gross output, US$ m. */
  x: number
  /** Gross exports, sum of dest, US$ m. */
  e: number
  /** Own value added (incl. product taxes) per $. */
  own: number | null
  /** Foreign value added per $: sum of va over c ≠ home = 1 − va[home]. */
  fva: number | null
  /** Foreign value added bought directly from its origin, per $. Hidden foreign = fva − fdirect. */
  fdirect: number | null
  /** Concentration of foreign origins, sum of (va[c] / fva)², RoW as one origin. 0–1. */
  hhi: number | null
  /** Economy index of the largest foreign va[c], excluding RoW. */
  top: number | null
  /** va[top], per $. */
  topva: number | null
  /** Number of foreign economies (incl. RoW) with va[c] ≥ 0.01. */
  nsup: number | null
  /** Imported intermediate inputs per $, sum of imp. */
  imports: number | null
  /** Backward GVC participation (Borin & Mancini 2019), share of exports. */
  gvc_b: number | null
  /** Forward GVC participation (Borin & Mancini 2019), share of exports. */
  gvc_f: number | null
  /** Output upstreamness (Antràs et al. 2012), steps; 1 = all output goes to final use. */
  up: number | null
  /** Revealed comparative advantage in value added absorbed abroad; 1 for all. */
  rca: number | null
}

/** Array fields, one array per row. */
export interface Arrays {
  /** Value added from economy c embodied in the row's output, per $ [73]. */
  va: (number | null)[][]
  /** c's value added in inputs bought straight from c, per $ (0 at home) [73]. */
  direct: (number | null)[][]
  /** c's value added in inputs bought from the home economy, per $ [73]. */
  home: (number | null)[][]
  /** c's value added in inputs bought from any other economy, per $ [73]. */
  third: (number | null)[][]
  /** Intermediate inputs bought from economy s, per $ (home entry: domestic) [73]. */
  inputs: (number | null)[][]
  /** Gross exports to economy d, US$ m (0 at home) [73]. */
  dest: number[][]
  /** Imported intermediate inputs of product p, per $ [35]. */
  imp: (number | null)[][]
  /** Import share of the row's intermediate use of product p, 0–1 [35]. */
  impsh: (number | null)[][]
}

/** {year}/{ECON}.json: every field for one economy-year; field[row] or field[row][k]. */
export type Detail = Arrays & { [K in keyof Scalars]: Rows<Scalars[K]> }

/** {year}/index.json: field[economy][row]. */
export type Index = { [K in keyof Scalars]: Rows<Scalars[K]>[] }

/** series/{ECON}.json: field[year index in meta.years][row]. */
export type Series = { [K in keyof Scalars]: Rows<Scalars[K]>[] }
