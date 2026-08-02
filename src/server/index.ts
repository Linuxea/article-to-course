import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync, readFileSync } from 'node:fs'
import { generate } from './generate'
import { config } from './config'

const app = new Hono()

app.get('/api/info', (c) =>
  c.json({ mock: config.mock, model: config.llmModel }),
)

app.post('/api/generate', async (c) => {
  let article = ''
  let tooLarge = false
  try {
    const body = (await c.req.json()) as { article?: unknown }
    if (typeof body.article === 'string') article = body.article
    if (Buffer.byteLength(article, 'utf8') > config.maxBodyBytes) tooLarge = true
  } catch {
    // fall through to the empty-string check
  }
  if (tooLarge) {
    return c.json({ error: `文章过长（上限 ${config.maxBodyBytes} 字节），请精简后重试。` }, 413)
  }
  if (article.trim().length === 0) {
    return c.json({ error: '请求体需要 { "article": "<文章文本>" }' }, 400)
  }

  // The request's abort signal fires when the client disconnects; threading it
  // through `generate` lets us cancel in-flight LLM calls instead of running the
  // whole pipeline for a vanished reader.
  const signal = c.req.raw.signal

  return streamSSE(c, async (stream) => {
    // Keep proxies / load balancers from killing an idle SSE connection during a
    // long generation. SSE comments (": ping") are ignored by the client parser.
    const ping = setInterval(() => {
      void stream.write(`: keep-alive\n\n`)
    }, config.ssePingSeconds * 1000)

    try {
      for await (const ev of generate(article, signal)) {
        await stream.writeSSE({ data: JSON.stringify(ev) })
      }
    } catch (e) {
      // Writes after disconnect are silent no-ops (Hono swallows them), so only
      // attempt to report the error to a live client.
      if (!signal.aborted) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'error', message: e instanceof Error ? e.message : String(e) }),
        })
      }
    } finally {
      clearInterval(ping)
    }
    await stream.writeSSE({ data: '[DONE]' })
  })
})

// Production: serve the built client.
app.use('/*', serveStatic({ root: './dist' }))
app.get('*', (c) => {
  const index = './dist/index.html'
  if (existsSync(index)) return c.html(readFileSync(index, 'utf8'))
  return c.text('Client not built. Run `npm run dev` to use Vite, or `npm run build`.', 404)
})

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`article-to-course server → http://localhost:${info.port}  (mock=${config.mock}, model=${config.llmModel})`)
})
