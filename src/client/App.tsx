import { useCallback, useRef, useState } from 'react'
import { streamGenerate, type GenEvent } from './sse'
import { InputForm } from './components/InputForm'
import { ProgressView } from './components/ProgressView'
import { PreviewFrame, useMockInfo } from './components/PreviewFrame'
import { ExportBar } from './components/ExportBar'

type Phase = 'idle' | 'generating' | 'done' | 'error'

export function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [article, setArticle] = useState('')
  const [events, setEvents] = useState<GenEvent[]>([])
  const [html, setHtml] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const info = useMockInfo()
  const busyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const title = html ? (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '课程') : '课程'

  const handleSubmit = useCallback((text: string) => {
    if (busyRef.current) return
    setArticle(text)
    setEvents([])
    setHtml('')
    setErrorMsg('')
    setPhase('generating')
    busyRef.current = true

    const controller = new AbortController()
    abortRef.current = controller

    streamGenerate(
      text,
      (ev) => {
        setEvents((prev) => [...prev, ev])
        if (ev.type === 'done') {
          setHtml(ev.html)
          setPhase('done')
          busyRef.current = false
          abortRef.current = null
        } else if (ev.type === 'error') {
          setErrorMsg(ev.message)
          setPhase('error')
          busyRef.current = false
          abortRef.current = null
        }
      },
      controller.signal,
    ).catch((e: unknown) => {
      // User-initiated cancel: return to the input, not to an error screen.
      if (controller.signal.aborted) {
        setPhase('idle')
      } else {
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
      busyRef.current = false
      abortRef.current = null
    })
  }, [])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    busyRef.current = false
    setPhase('idle')
    setEvents([])
  }, [])

  const handleRegenerate = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    busyRef.current = false
    setPhase('idle')
    setEvents([])
    setHtml('')
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark">✦</span> 文章 → 交互课程
        </span>
        <span className="status-pill">
          {info ? (info.mock ? 'mock 模式' : info.model) : '…'}
        </span>
      </header>

      {phase === 'done' ? (
        <div className="stage-done">
          <ExportBar html={html} title={title} onRegenerate={handleRegenerate} />
          <PreviewFrame html={html} />
        </div>
      ) : (
        <main className="stage-center">
          {phase === 'generating' ? (
            <ProgressView events={events} onCancel={handleCancel} />
          ) : phase === 'error' ? (
            <div className="panel">
              <h1 className="panel-title">出错了 😢</h1>
              <p className="error-msg">{errorMsg}</p>
              <button className="primary-btn" onClick={handleRegenerate}>返回重试</button>
            </div>
          ) : (
            <InputForm initial={article} info={info} onSubmit={handleSubmit} />
          )}
        </main>
      )}
    </div>
  )
}
