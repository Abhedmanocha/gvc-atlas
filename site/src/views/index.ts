import type { ReactNode } from 'react'
import type { Meta } from '../data'
import type { Selection } from '../route'
import exposure from './exposure'
import risk from './risk'
import position from './position'
import gaps from './gaps'
import change from './change'

/** What a view hands the shell. The shell owns layout, pickers and the empty state. */
export interface Screen {
  /** Question with slots: {economy} {sector} {year} {partner}. Slots become pickers. */
  sentence: string
  /** The one-line answer. Omit while loading. */
  answer?: ReactNode
  /** The one chart. Omit while loading. */
  chart?: ReactNode
}

export interface ViewProps {
  sel: Selection
  meta: Meta
  /** Change the selection (pushes a URL), e.g. go({ partner: 'USA' }) from a chart click. */
  go: (change: Partial<Selection>) => void
}

export interface View {
  id: string // URL segment
  label: string // switcher text
  /** A React hook: called once per render, remounted when the view changes. */
  useScreen: (props: ViewProps) => Screen
}

/** Switcher order. Adding a view: one file in this folder, one import, one entry here. */
export const views: View[] = [exposure, risk, position, gaps, change]

export const viewIds = views.map(v => v.id)
