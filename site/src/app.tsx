import { useEffect, useState } from 'react'
import { loadMeta } from './data'
import type { Meta } from './data'
import { format, useRoute } from './route'
import { plainSentence, Sentence } from './sentence'
import { views, viewIds } from './views'
import type { View, ViewProps } from './views'
import { Dev } from './dev'
import { LOAD_ERROR } from './words'

const DATA_URL = 'https://kidb.adb.org/globalization'
const REPO_URL = 'https://github.com/OWNER/gvc-atlas'

export function App() {
  const [meta, setMeta] = useState<Meta | Error>()
  useEffect(() => { loadMeta().then(setMeta, setMeta) }, [])
  if (!meta) return null
  if (meta instanceof Error) return <main className="shell"><p className="answer">{LOAD_ERROR}</p></main>
  return <><Shell meta={meta} /><Footer meta={meta} /></>
}

function Footer({ meta }: { meta: Meta }) {
  return (
    <footer className="footer">
      Data: <a href={DATA_URL} rel="noopener">Asian Development Bank MRIO</a>, {meta.years[0]}–{meta.years.at(-1)}
      {' '}<span className="nowrap"><span aria-hidden="true">· </span><a href={REPO_URL} rel="noopener">Source</a></span>
    </footer>
  )
}

function Shell({ meta }: { meta: Meta }) {
  const [sel, go] = useRoute(meta, viewIds)
  if (!sel) return <Dev />
  const view = views.find(v => v.id === sel.view)!
  return (
    <main className="shell">
      <nav className="views">
        {views.map(v => (
          <a key={v.id} href={format({ ...sel, view: v.id })} aria-current={v === view ? 'page' : undefined}>
            {v.label}
          </a>
        ))}
      </nav>
      {/* Keyed so each view's hooks start fresh. */}
      <Screen key={view.id} view={view} sel={sel} meta={meta} go={go} />
    </main>
  )
}

function Screen({ view, ...props }: ViewProps & { view: View }) {
  const { sentence, answer, chart } = view.useScreen(props)
  const title = plainSentence(sentence, props.sel, props.meta)
  useEffect(() => { document.title = title }, [title])
  return (
    <>
      <Sentence template={sentence} {...props} />
      <section className="screen" aria-live="polite">
        {answer !== undefined && <p className="answer">{answer}</p>}
        {chart ?? <div className="placeholder" />}
      </section>
    </>
  )
}
