import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Meta } from './data'
import type { Selection } from './route'

type Slot = 'economy' | 'sector' | 'year' | 'partner'
const SLOTS = /\{(economy|sector|year|partner)\}/

interface Option { value: string; label: string; group?: string; code?: string }

/** The question at the top of every screen. Each {slot} in the template is a picker. */
export function Sentence({ template, sel, meta, go }: {
  template: string
  sel: Selection
  meta: Meta
  go: (change: Partial<Selection>) => void
}) {
  const [open, setOpen] = useState<{ slot: Slot; anchor: HTMLButtonElement } | null>(null)
  return (<>
    <h1 className="sentence">
      {words(template, sel, meta).map((w, i) => typeof w === 'string' ? w : (
        // The possessive stays glued to its noun when the line wraps.
        <span key={i} className="nowrap">
          <button
            type="button"
            className={`noun noun-${w.slot}`}
            aria-haspopup="dialog"
            aria-expanded={open?.slot === w.slot}
            aria-label={`${w.slot}: ${w.text}`}
            onClick={e => setOpen({ slot: w.slot, anchor: e.currentTarget })}
          >{w.text}</button>{w.suffix}
        </span>
      ))}
    </h1>
    {open && (
      <Picker
        slot={open.slot}
        anchor={open.anchor}
        options={optionsFor(open.slot, meta, sel)}
        value={String(sel[open.slot])}
        onPick={v => go({ [open.slot]: open.slot === 'year' ? Number(v) : v })}
        onClose={() => setOpen(null)}
      />
    )}
  </>)
}

/** The sentence as plain text, for the document title. */
export function plainSentence(template: string, sel: Selection, meta: Meta): string {
  return words(template, sel, meta).map(w => typeof w === 'string' ? w : w.text + w.suffix).join('')
}

type Word = string | { slot: Slot; text: string; suffix: string }

/** Split a template into text and slots; a following "'s" becomes the slot's suffix ("Philippines'"). */
function words(template: string, sel: Selection, meta: Meta): Word[] {
  const parts = template.split(SLOTS) // odd indices are slot names
  return parts.map((part, i) => {
    if (i % 2) {
      const text = slotText(part as Slot, sel, meta)
      const poss = /^'s\b/.test(parts[i + 1] ?? '')
      return { slot: part as Slot, text, suffix: poss ? (/s$/.test(text) ? "'" : "'s") : '' }
    }
    return i > 0 && /^'s\b/.test(part) ? part.slice(2) : part
  })
}

function slotText(slot: Slot, sel: Selection, meta: Meta): string {
  if (slot === 'year') return String(sel.year)
  if (slot === 'sector') return sel.sector === 'all' ? 'economy' : nameOf(meta.sectors, sel.sector)
  return nameOf(meta.economies, sel[slot])
}

function nameOf(list: { code: string; name: string }[], code: string) {
  return list.find(x => x.code === code)?.name ?? code
}

function optionsFor(slot: Slot, meta: Meta, sel: Selection): Option[] {
  if (slot === 'year') return meta.years.map(y => ({ value: String(y), label: String(y) }))
  if (slot === 'sector') {
    return [
      { value: 'all', label: 'Whole economy' },
      ...meta.sectors.map(s => ({ value: s.code, label: s.name, group: s.group })),
    ]
  }
  // Alphabetical, Rest of World last; a partner is never the home economy.
  return meta.economies
    .filter(e => slot !== 'partner' || e.code !== sel.economy)
    .map(e => ({ value: e.code, label: e.name, code: e.code }))
    .sort((a, b) => Number(a.value === 'RoW') - Number(b.value === 'RoW') || a.label.localeCompare(b.label))
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** 0 = best. Infinity = no match. */
function rank(o: Option, q: string): number {
  if (!q) return 0
  const label = fold(o.label)
  if (o.code && fold(o.code) === q) return 0
  if (label.startsWith(q)) return 1
  if (label.split(/[\s,&-]+/).some(w => w.startsWith(q))) return 2
  if (label.includes(q)) return 3
  return Infinity
}

const GRID_COLUMNS = 4 // matches .picker-grid in styles.css

function Picker({ slot, anchor, options, value, onPick, onClose }: {
  slot: Slot
  anchor: HTMLElement
  options: Option[]
  value: string
  onPick: (value: string) => void
  onClose: () => void
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const searchable = slot !== 'year'
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = fold(query.trim())
    const groups = [...new Set(options.map(o => o.group))]
    return options
      .map((o, i) => ({ o, i, r: rank(o, q) }))
      .filter(x => x.r < Infinity)
      .sort((a, b) => groups.indexOf(a.o.group) - groups.indexOf(b.o.group) || a.r - b.r || a.i - b.i)
      .map(x => x.o)
  }, [options, query])

  const [active, setActive] = useState(() => Math.max(0, shown.findIndex(o => o.value === value)))
  const keyed = useRef(true) // scroll the active option into view only after keyboard moves

  useLayoutEffect(() => {
    const d = dialog.current!
    const r = anchor.getBoundingClientRect()
    d.style.setProperty('--x', `${Math.round(r.left)}px`)
    d.style.setProperty('--y', `${Math.round(r.bottom + 8)}px`)
    if (!d.open) d.showModal()
    // On touch screens, don't summon the keyboard until asked.
    if (searchable && !matchMedia('(pointer: coarse)').matches) input.current!.focus()
    else list.current!.focus()
    // Close before refocusing: nothing outside an open modal dialog can take focus.
    return () => { d.close(); anchor.focus() }
  }, [anchor, searchable])

  const opened = useRef(false)
  useEffect(() => {
    if (!keyed.current) return
    const el = list.current?.querySelector('[aria-selected="true"]')
    el?.scrollIntoView({ block: opened.current ? 'nearest' : 'center' })
    opened.current = true
  }, [active, shown])

  const pick = (o: Option | undefined) => {
    if (!o) return
    if (o.value !== value) onPick(o.value)
    onClose()
  }

  const move = (to: number) => {
    keyed.current = true
    setActive(Math.min(shown.length - 1, Math.max(0, to)))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const row = searchable ? 1 : GRID_COLUMNS // years sit in a grid: up/down moves a row
    const step = { ArrowDown: row, ArrowUp: -row, ArrowRight: searchable ? 0 : 1, ArrowLeft: searchable ? 0 : -1 }[e.key]
    if (step) { e.preventDefault(); move(active + step) }
    else if (e.key === 'PageDown') { e.preventDefault(); move(active + 8) }
    else if (e.key === 'PageUp') { e.preventDefault(); move(active - 8) }
    else if (e.key === 'Home' && document.activeElement !== input.current) { e.preventDefault(); move(0) }
    else if (e.key === 'End' && document.activeElement !== input.current) { e.preventDefault(); move(shown.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[active]) }
    else if (searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey && document.activeElement !== input.current) {
      input.current!.focus() // type-to-filter from anywhere in the picker
    }
  }

  const optionId = (i: number) => `${id}-${i}`
  const activeId = shown[active] ? optionId(active) : undefined
  let lastGroup: string | undefined

  return (
    <dialog
      ref={dialog}
      className={`picker picker-${searchable ? 'list' : 'grid'}`}
      aria-label={slot}
      onKeyDown={onKeyDown}
      onCancel={e => { e.preventDefault(); onClose() }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {searchable && (
        <label className="picker-search">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.75" /><path d="M10.5 10.5 14 14" />
          </svg>
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={activeId}
            aria-label={`Find ${slot}`}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={e => { setQuery(e.target.value); list.current!.scrollTop = 0; keyed.current = true; setActive(0) }}
          />
        </label>
      )}
      <div
        ref={list}
        id={`${id}-list`}
        className="picker-options"
        role="listbox"
        aria-label={slot}
        aria-activedescendant={searchable ? undefined : activeId}
        tabIndex={-1}
      >
        {shown.map((o, i) => {
          const header = o.group !== lastGroup && o.group
          lastGroup = o.group
          return (
            <Fragment key={o.value}>
              {header && <div className="picker-group" role="presentation">{header}</div>}
              <div
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={o.value === value ? 'picker-option current' : 'picker-option'}
                onPointerMove={() => { if (i !== active) { keyed.current = false; setActive(i) } }}
                onClick={() => pick(o)}
              >{o.label}</div>
            </Fragment>
          )
        })}
      </div>
    </dialog>
  )
}
