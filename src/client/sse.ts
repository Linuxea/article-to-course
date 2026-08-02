export type GenEvent =
  | { type: 'outline' }
  | { type: 'section'; index: number; total: number; title: string }
  | { type: 'rendering' }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

export async function streamGenerate(article: string, onEvent: (ev: GenEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article }),
    signal,
  })
  if (!res.ok || !res.body) {
    // Surface the server's own message (e.g. "文章太短…" / "文章过长…") when present.
    let message = `请求失败 (HTTP ${res.status})`
    try {
      const body = (await res.json()) as { error?: unknown }
      if (typeof body.error === 'string') message = body.error
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminated = false

  const process = (chunk: string): void => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') {
        terminated = true
        break
      }
      try {
        const ev = JSON.parse(payload) as GenEvent
        if (ev.type === 'done' || ev.type === 'error') terminated = true
        onEvent(ev)
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    process(decoder.decode(value, { stream: true }))
  }
  // Flush any trailing partial multibyte sequence so the final 'done' event isn't lost.
  process(decoder.decode())
  if (!terminated) {
    throw new Error('生成中断：连接提前关闭，请重试。')
  }
}
