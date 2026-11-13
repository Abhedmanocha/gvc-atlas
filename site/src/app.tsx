import { useEffect, useState } from 'react'
import { loadMeta } from './data'
import type { Meta } from './data'
import { format, useRoute } from './route'
import { plainSentence, Sentence } from './sentence'
import { views, viewIds } from './views'
import type { View, ViewProps } from './views'
import { Dev } from './dev'

export function App() {
  const [meta, setMeta] = useState<Meta | Error>()
  useEffect(() => { loadMeta().then(setMeta, setMeta) }, [])
  if (!meta) return null
  if (meta instanceof Error) return <main className="shell"><p className="error">{meta.message}</p></main>
  return <Shell meta={meta} />
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
