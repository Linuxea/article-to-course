export type GenEvent =
  | { type: 'outline' }
  | { type: 'section'; index: number; total: number; title: string }
  | { type: 'rendering' }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

export async function streamGenerate(article: string, onEvent: (ev: GenEvent) => void): Promise<void> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`请求失败 (HTTP ${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        onEvent(JSON.parse(payload) as GenEvent)
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
}
