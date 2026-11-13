import { useEffect, useState } from 'react'

export interface Economy { code: string; name: string }
export interface Sector { code: string; name: string; long: string; group: string }
export interface Meta { years: number[]; economies: Economy[]; sectors: Sector[] }

const cache = new Map<string, Promise<unknown>>()

/** Fetch a file under public/data/, once. Paths are relative ("meta.json"), never "/...". */
export function loadJSON<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${path}`).then(r => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const loadMeta = () => loadJSON<Meta>('meta.json')

/** The loaded value, undefined while loading, or the Error. Pass null to load nothing. */
export function useJSON<T>(path: string | null): T | Error | undefined {
  const [state, setState] = useState<{ path: string | null; value?: T | Error }>({ path })
  useEffect(() => {
    if (!path) return
    let live = true
    loadJSON<T>(path).then(
      value => { if (live) setState({ path, value }) },
      (e: unknown) => { if (live) setState({ path, value: e instanceof Error ? e : new Error(String(e)) }) },
    )
    return () => { live = false }
  }, [path])
  return state.path === path ? state.value : undefined
}
