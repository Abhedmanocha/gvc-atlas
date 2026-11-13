import { useCallback, useEffect, useState } from 'react'
import type { Meta } from './data'

/** Everything a screen depends on. Lives in the URL: #/{economy}/{sector}/{year}/{view}[/{partner}] */
export interface Selection {
  economy: string // economy code, e.g. "IND"
  sector: string // sector code "c1"…"c35", or "all"
  year: number
  view: string
  partner: string // second economy; in the URL only when not the default
}

export const DEV = '#/dev'

export function defaultPartner(economy: string): string {
  return economy === 'PRC' ? 'USA' : 'PRC'
}

/** Read a hash, falling back part by part to IND / all / latest year / first view / default partner. */
export function parse(hash: string, meta: Meta, views: string[]): Selection {
  const [e = '', s = '', y = '', v = '', p = ''] = hash.replace(/^#\/?/, '').split('/')
  const economy = findCode(meta.economies, e) ?? 'IND'
  const partner = findCode(meta.economies, p)
  const year = Number(y)
  return {
    economy,
    sector: s.toLowerCase() === 'all' ? 'all' : findCode(meta.sectors, s) ?? 'all',
    year: meta.years.includes(year) ? year : Math.max(...meta.years),
    view: views.includes(v) ? v : views[0]!,
    partner: partner && partner !== economy ? partner : defaultPartner(economy),
  }
}

export function format(sel: Selection): string {
  const { economy, sector, year, view, partner } = sel
  const tail = partner === defaultPartner(economy) ? '' : `/${partner}`
  return `#/${economy}/${sector}/${year}/${view}${tail}`
}

function findCode(list: { code: string }[], code: string): string | undefined {
  return list.find(x => x.code.toLowerCase() === code.toLowerCase())?.code
}

/**
 * The current selection and a setter. Bad or missing URL parts are rewritten in place
 * (no history entry); `go` pushes a new entry so Back works. `sel` is null on #/dev.
 */
export function useRoute(meta: Meta, views: string[]) {
  const read = useCallback(() => {
    if (location.hash === DEV) return null
    const sel = parse(location.hash, meta, views)
    const canonical = format(sel)
    if (location.hash !== canonical) history.replaceState(null, '', canonical)
    return sel
  }, [meta, views])

  const [sel, setSel] = useState(read)

  useEffect(() => {
    const onHash = () => setSel(read())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [read])

  const go = useCallback((change: Partial<Selection>) => {
    if (!sel) return
    const next = { ...sel, ...change }
    // A partner that was only implied by the old economy follows the new one.
    if (change.economy && !change.partner &&
        (sel.partner === defaultPartner(sel.economy) || next.partner === next.economy)) {
      next.partner = defaultPartner(next.economy)
    }
    location.hash = format(next)
  }, [sel])

  return [sel, go] as const
}
