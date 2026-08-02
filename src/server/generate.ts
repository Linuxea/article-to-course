import { config } from './config'
import { chatJson } from './llm'
import {
  OutlineSchema,
  SectionDetailSchema,
  buildOutlineMessages,
  buildSectionMessages,
  buildSectionRepairMessages,
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

async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0
  const size = Math.min(limit, items.length)
  const runners = Array.from({ length: size }, async () => {
    while (true) {
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

/* ── LLM calls (with one Zod-repair retry for sections) ─────── */
async function callOutline(article: string): Promise<Outline> {
  const raw = await chatJson<unknown>(buildOutlineMessages(article))
  return OutlineSchema.parse(raw)
}

async function callSection(article: string, section: OutlineSection, outline: Outline): Promise<SectionDetail> {
  const firstRaw = await chatJson<unknown>(buildSectionMessages(article, section, outline))
  const first = SectionDetailSchema.safeParse(firstRaw)
  if (first.success) return first.data

  // one repair attempt feeding the error back
  const repairedRaw = await chatJson<unknown>(
    buildSectionRepairMessages(article, section, outline, first.error.message, JSON.stringify(firstRaw)),
  )
  const repaired = SectionDetailSchema.safeParse(repairedRaw)
  if (repaired.success) return repaired.data

  // degrade gracefully: a single paragraph noting the section couldn't be fully generated
  return {
    screens: [
      { heading: section.title, blocks: [{ type: 'paragraph', segments: [{ type: 'text', text: section.focus }] }] },
    ],
  }
}

/* ── Public entry: an async generator of GenEvent ──────────── */
export async function* generate(article: string): AsyncGenerator<GenEvent> {
  const q = new AsyncQueue<GenEvent>()

  void (async () => {
    try {
      const clean = article.trim()
      if (clean.length < 80) {
        q.push({ type: 'error', message: '文章太短（少于 80 字），请粘贴更完整的内容。' })
        return
      }

      q.push({ type: 'outline' })
      const outline: Outline = config.mock ? mockOutline(clean) : await callOutline(clean)
      const total = outline.sections.length

      const sections: Section[] = new Array(total)
      let completed = 0
      await runPool(outline.sections, config.concurrency, async (s: OutlineSection, i: number) => {
        const detail = config.mock
          ? mockSectionScreens(clean, i, total)
          : await callSection(clean, s, outline)
        sections[i] = { id: s.id, title: s.title, subtitle: s.subtitle, takeaways: detail.takeaways, screens: detail.screens }
        completed++
        q.push({ type: 'section', index: completed, total, title: s.title })
      })

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
      q.push({ type: 'done', html })
    } catch (e) {
      q.push({ type: 'error', message: errMsg(e) })
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
