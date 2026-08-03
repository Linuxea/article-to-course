import { randomUUID } from 'node:crypto'
import { generateObject, generateText } from 'ai'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'
import { config } from './config'
import { generateObjectOptions } from './llm'
import {
  OutlineSchema,
  SectionDetailSchema,
  buildOutlinePrompt,
  buildSectionPrompt,
  type Outline,
  type OutlineSection,
} from './prompts'
import { CourseSchema, type Course, type Section } from '../shared/schema'
import { renderCourse } from './render'
import { loadAssets } from './assets'
import type { SectionDetail } from './prompts'

export type GenEvent =
  | { type: 'outline' }
  | { type: 'section'; index: number; total: number; title: string }
  | { type: 'rendering' }
  | { type: 'done'; html: string }
  | { type: 'error'; message: string }

/* ── Minimal async queue so concurrent workers can push events ── */
class AsyncQueue<T> {
  private items: T[] = []
  private waiters: ((r: IteratorResult<T>) => void)[] = []
  private closed = false
  push(v: T): void {
    if (this.closed) return
    const w = this.waiters.shift()
    if (w) w({ value: v, done: false })
    else this.items.push(v)
  }
  next(): Promise<IteratorResult<T>> {
    if (this.items.length) return Promise.resolve({ value: this.items.shift()!, done: false })
    if (this.closed) return Promise.resolve({ value: undefined as unknown as T, done: true })
    return new Promise((resolve) => this.waiters.push(resolve))
  }
  close(): void {
    this.closed = true
    while (this.waiters.length) this.waiters.shift()!({ value: undefined as unknown as T, done: true })
  }
}

async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>, signal?: AbortSignal): Promise<void> {
  let cursor = 0
  const size = Math.min(limit, items.length)
  const runners = Array.from({ length: size }, async () => {
    while (!signal?.aborted) {
      const i = cursor++
      if (i >= items.length) return
      await worker(items[i]!, i)
    }
  })
  await Promise.all(runners)
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Raised when the model's output is syntactically unparseable (or empty), as
 * opposed to structurally invalid. Lets callers classify degradations as
 * content errors instead of transport/auth errors.
 */
export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelOutputError'
  }
}

/** Compact one-line summary of Zod issues (path + message) for logs. */
export function summarizeZodIssues(e: ZodError): string {
  return e.issues
    .slice(0, 8)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
}

/** Truncated, JSON-quoted preview of raw model output for failure logs. */
function outputPreview(text: string): string {
  return JSON.stringify(text.trim().slice(0, 600))
}

/** True for AbortError / DOMException naming variants produced by fetch + ai SDK. */
function isAbortError(e: unknown): boolean {
  if (e instanceof Error) {
    const n = e.name
    if (n === 'AbortError' || n === 'TimeoutError') return true
  }
  return false
}

/** Tolerate markdown fences / surrounding prose when parsing model output by hand. */
export function parseJsonLenient(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error('no JSON object found in model output')
  }
}

/**
 * Structured generation with a plain-text fallback.
 *
 * Reasoning models on some OpenAI-compatible endpoints intermittently return zero
 * text tokens (empty content, finishReason "stop") when response_format is sent,
 * and DeepSeek's official API rejects json_schema outright. So unless the endpoint
 * is explicitly known to support structured outputs (LLM_STRUCTURED_OUTPUT=true),
 * this skips generateObject entirely and goes straight to plain-text generation;
 * the result is validated against the same Zod schema either way.
 */
async function generateJson<T>(requestId: string, label: string, schema: ZodType<T, ZodTypeDef, unknown>, instructions: string, prompt: string, requestSignal?: AbortSignal): Promise<T> {
  if (config.structuredOutput) {
    const startedAt = Date.now()
    try {
      const { object, finishReason } = await generateObject({
        ...generateObjectOptions(requestSignal),
        schema,
        instructions,
        prompt,
      })
      if (finishReason === 'length') {
        console.warn(`[generate:${requestId}] ${label}: structured output hit max tokens (finishReason=length), JSON may be truncated`)
      }
      return object
    } catch (e) {
      // Never swallow aborts or timeouts — they must propagate so the pipeline stops.
      if (requestSignal?.aborted || isAbortError(e)) throw e
      console.warn(`[generate:${requestId}] ${label}: structured call failed after ${Date.now() - startedAt}ms (${errMsg(e).split('\n')[0]}), falling back to plain-text JSON`)
    }
  }
  return generateJsonPlainText(requestId, label, schema, instructions, prompt, requestSignal)
}

/** Plain-text generation (no response_format) + lenient JSON parse + Zod validation. */
async function generateJsonPlainText<T>(requestId: string, label: string, schema: ZodType<T, ZodTypeDef, unknown>, instructions: string, prompt: string, requestSignal?: AbortSignal): Promise<T> {
  let text = ''
  try {
    const res = await generateText({
      ...generateObjectOptions(requestSignal),
      system: instructions,
      prompt,
    })
    text = res.text
    if (res.finishReason === 'length') {
      console.warn(`[generate:${requestId}] ${label}: output truncated (finishReason=length, ${text.length} chars)`)
    }
    return schema.parse(parseJsonLenient(text))
  } catch (e2) {
    if (requestSignal?.aborted || isAbortError(e2)) throw e2
    if (e2 instanceof ZodError) {
      console.error(`[generate:${requestId}] ${label}: model output failed schema validation — ${summarizeZodIssues(e2)}`)
      console.error(`[generate:${requestId}] ${label}: raw output preview: ${outputPreview(text)}`)
      throw e2
    }
    // Unparseable or empty output — a content failure, not a transport one.
    console.error(`[generate:${requestId}] ${label}: model output could not be parsed — ${errMsg(e2).split('\n')[0]}`)
    if (text) console.error(`[generate:${requestId}] ${label}: raw output preview: ${outputPreview(text)}`)
    throw new ModelOutputError(`${label}: ${errMsg(e2).split('\n')[0]}`)
  }
}

/* ── LLM calls (schema-validated via generateObject) ──────── */
async function callOutline(requestId: string, article: string, signal?: AbortSignal): Promise<Outline> {
  try {
    const { instructions, prompt } = buildOutlinePrompt(article)
    return await generateJson(requestId, 'outline', OutlineSchema, instructions, prompt, signal)
  } catch (e) {
    if (signal?.aborted || isAbortError(e)) throw e
    console.error(`[generate:${requestId}] outline generation failed: ${errMsg(e).split('\n')[0]}`)
    throw e
  }
}

/** Per-section result plus a flag telling whether the content is a degraded placeholder. */
interface SectionResult {
  detail: SectionDetail
  degraded: boolean
  reason?: string
}

const PLACEHOLDER_DETAIL: SectionDetail = {
  screens: [
    {
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              type: 'text',
              text: '本小节内容在生成时遇到了问题，未能完整呈现。可以尝试重新生成课程；若问题反复出现，请检查原文是否过短或稍后重试。',
            },
          ],
        },
      ],
    },
  ],
}

async function callSection(requestId: string, article: string, section: OutlineSection, outline: Outline, signal?: AbortSignal): Promise<SectionResult> {
  try {
    const { instructions, prompt } = buildSectionPrompt(article, section, outline)
    const detail = await generateJson(requestId, `section "${section.title}"`, SectionDetailSchema, instructions, prompt, signal)
    return { detail, degraded: false }
  } catch (e) {
    // Abort/timeout propagates so the pipeline can stop immediately on disconnect.
    if (signal?.aborted || isAbortError(e)) throw e
    // Only degrade on model-output failures (ZodError/ModelOutputError). Transport/auth/network
    // errors also degrade per-section, but the caller surfaces a top-level error if EVERY
    // section failed — so a total outage is never silently dressed up as a course.
    const isValidation = e instanceof ZodError || e instanceof ModelOutputError
    const reason = errMsg(e)
    console.error(`[generate:${requestId}] section "${section.title}" failed (${isValidation ? 'validation' : 'transport/auth'}): ${reason}`)
    if (e instanceof ZodError) {
      console.error(`[generate:${requestId}] section "${section.title}" validation issues: ${summarizeZodIssues(e)}`)
    }
    return { detail: PLACEHOLDER_DETAIL, degraded: true, reason }
  }
}

/* ── Public entry: an async generator of GenEvent ──────────── */
export async function* generate(article: string, requestSignal?: AbortSignal): AsyncGenerator<GenEvent> {
  const requestId = randomUUID().slice(0, 8)
  const q = new AsyncQueue<GenEvent>()
  const aborted = () => !!requestSignal?.aborted

  void (async () => {
    try {
      if (aborted()) return
      const clean = article.trim()
      if (clean.length < 80) {
        q.push({ type: 'error', message: '文章太短（少于 80 字），请粘贴更完整的内容。' })
        return
      }
      console.info(`[generate:${requestId}] start: article ${clean.length} chars, mock=${config.mock}, concurrency=${config.concurrency}`)

      q.push({ type: 'outline' })
      const outline: Outline = config.mock ? mockOutline(clean) : await callOutline(requestId, clean, requestSignal)
      if (aborted()) return
      const total = outline.sections.length

      const sections: Section[] = new Array(total)
      let completed = 0
      let degraded = 0
      await runPool(outline.sections, config.concurrency, async (s: OutlineSection, i: number) => {
        if (aborted()) return
        const result = config.mock
          ? ({ detail: mockSectionScreens(clean, i, total), degraded: false } satisfies SectionResult)
          : await callSection(requestId, clean, s, outline, requestSignal)
        if (aborted()) return
        const d = result.detail
        sections[i] = { id: s.id, title: s.title, subtitle: s.subtitle, takeaways: d.takeaways, screens: d.screens }
        if (result.degraded) degraded++
        completed++
        q.push({ type: 'section', index: completed, total, title: s.title })
      })
      if (aborted()) return
      console.info(`[generate:${requestId}] sections done: ${completed}/${total}, ${degraded} degraded`)

      // Every section failed → almost certainly a systemic outage (bad key, model
      // name, network). Surface it instead of rendering an all-placeholder course.
      if (!config.mock && total > 0 && degraded === total) {
        q.push({
          type: 'error',
          message: `全部 ${total} 个章节均生成失败，课程无法呈现。请检查 LLM 配置（API Key、模型名、网络）后重试。`,
        })
        return
      }

      q.push({ type: 'rendering' })
      const course: Course = {
        title: outline.title,
        subtitle: outline.subtitle,
        accent: outline.accent,
        objectives: outline.objectives,
        sections,
      }
      const validated = CourseSchema.parse(course)
      const html = renderCourse(validated, loadAssets())
      if (aborted()) return
      q.push({ type: 'done', html })
    } catch (e) {
      // A disconnect/abort is expected — don't emit a misleading error event.
      if (!aborted() && !isAbortError(e)) {
        console.error(`[generate:${requestId}] pipeline failed: ${errMsg(e).split('\n')[0]}`)
        q.push({ type: 'error', message: errMsg(e) })
      }
    } finally {
      q.close()
    }
  })()

  while (true) {
    const r = await q.next()
    if (r.done) return
    yield r.value
    if (r.value.type === 'error') return
  }
}

/* ── Mock generators (used when LLM_MOCK or no API key) ─────── */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function mockOutline(article: string): Outline {
  const paras = splitParagraphs(article)
  const title = paras[0] ? paras[0].slice(0, 24) : '示例课程'
  return {
    title: `${title}…（mock）`,
    subtitle: '当前为本地 mock 模式，未调用真实 LLM',
    accent: 'coral',
    objectives: ['说清文章的核心概念', '理解其运作流程', '记住最关键的要点'],
    sections: [
      { id: 'intro', title: '先了解一下', subtitle: '导入', focus: '用比喻引入主题' },
      { id: 'main', title: '核心讲解', subtitle: '展开', focus: '讲解文章主要内容' },
      { id: 'check', title: '检验理解', subtitle: '巩固', focus: '用测验巩固' },
    ],
  }
}

function mockSectionScreens(article: string, i: number, total: number): SectionDetail {
  const paras = splitParagraphs(article)
  const chunk = paras.slice(
    Math.floor((i * paras.length) / total),
    Math.floor(((i + 1) * paras.length) / total),
  )
  const text = chunk.join(' ') || article.slice(0, 200)
  const detail: SectionDetail = {
    screens: [
      {
        blocks: [
          {
            type: 'paragraph',
            segments: [
              { type: 'text', text: '（mock）' },
              { type: 'term', text: '核心概念', definition: 'mock 模式下的占位术语，开启真实 LLM 后会自动替换。' },
              { type: 'text', text: '：' + (text.length > 160 ? text.slice(0, 160) + '…' : text) },
            ],
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'mock 提示',
            body: '这是本地 mock 生成的占位内容，配置 LLM_API_KEY 后将由模型生成完整课程。',
          },
          {
            type: 'table',
            caption: 'mock 对比表',
            columns: ['维度', '说明'],
            rows: [
              ['内容来源', '直接截取原文片段'],
              ['交互元素', '仅占位'],
            ],
          },
        ],
      },
    ],
    takeaways: ['这是 mock 小结：配置 API key 后体验完整生成效果。'],
  }
  if (i === total - 1) {
    detail.screens[0]!.blocks.push({
      type: 'quiz',
      question: '（mock 测验）这是一个占位问题，开启真实 LLM 后会自动生成。',
      options: [
        { value: 'option-a', text: '选项 A' },
        { value: 'option-b', text: '选项 B' },
      ],
      correct: 'option-a',
      explanationRight: 'mock 正确解释。',
      explanationWrong: 'mock 错误引导。',
    })
  }
  return detail
}
