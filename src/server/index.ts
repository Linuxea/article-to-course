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
  try {
    const body = (await c.req.json()) as { article?: unknown }
    if (typeof body.article === 'string') article = body.article
  } catch {
    // fall through to the empty-string check
  }
  if (article.trim().length === 0) {
    return c.json({ error: '请求体需要 { "article": "<文章文本>" }' }, 400)
  }

  return streamSSE(c, async (stream) => {
    try {
      for await (const ev of generate(article)) {
        await stream.writeSSE({ data: JSON.stringify(ev) })
      }
    } catch (e) {
      await stream.writeSSE({
        data: JSON.stringify({ type: 'error', message: e instanceof Error ? e.message : String(e) }),
      })
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
