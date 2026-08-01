import { z } from 'zod'
import type { ChatMessage } from './llm'

/* ── Block catalog the model is allowed to emit ──────────── */
export const BLOCK_CATALOG = `你只能使用以下 block 类型（每个对象都有固定的 "type" 字段）：

1. paragraph — 正文段落，支持内联术语解释。
   { "type":"paragraph", "segments":[ {"type":"text","text":"..."} , {"type":"term","text":"术语","definition":"1-2 句通俗解释"} ] }
   规则：专业术语在每节第一次出现时用 term 包裹；每段 2-3 句。

2. callout — "为什么重要"提示框。
   { "type":"callout", "variant":"accent"|"info"|"warning", "title":"可选标题", "body":"内容" }

3. translation — 原文 ↔ 大白话左右对照。
   { "type":"translation", "original":["原文行1","原文行2"], "plain":["对应的通俗解释行1","解释行2"] }
   original 与 plain 的行尽量一一对应。

4. quiz — 单项选择测验（即时反馈）。
   { "type":"quiz", "question":"问题", "options":[{"value":"option-a","text":"A"},{"value":"option-b","text":"B"}],
     "correct":"option-b", "explanationRight":"答对时的解释", "explanationWrong":"答错时的引导" }
   options 的 value 必须形如 option-a / option-b / option-c ...；correct 必须等于其中某个 value；至少 2 个选项。

5. chat — 群聊动画（把概念拟人化对话）。
   { "type":"chat", "actors":[{"id":"browser","name":"浏览器","colorIndex":1},{"id":"server","name":"服务器","colorIndex":2}],
     "messages":[{"actorId":"browser","text":"..."},{"actorId":"server","text":"..."}] }
   colorIndex 取 1-5；actorId 必须出现在 actors 里；至少 2 个 actor、2 条消息。

6. flow — 数据/流程逐步动画。
   { "type":"flow", "actors":[{"label":"浏览器"},{"label":"服务器"}],
     "steps":[{"from":1,"to":2,"label":"描述这一步","packet":true}] }
   from / to 是 actor 的序号（从 1 开始）。

7. keypoints — 要点卡片网格（总结/清单）。
   { "type":"keypoints", "items":[{"title":"标题","body":"一句话","icon":"可选emoji"}] }

8. steps — 编号步骤卡片。
   { "type":"steps", "items":[{"title":"标题","body":"描述"}] }`

/* ── Outline (phase 1) contract ──────────────────────────── */
export const OutlineSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  title: z.string(),
  subtitle: z.string().optional(),
  focus: z.string().min(1),
})
export const OutlineSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  accent: z.enum(['vermillion', 'coral', 'teal', 'amber', 'forest']),
  sections: z.array(OutlineSectionSchema).min(2).max(8),
})
export type Outline = z.infer<typeof OutlineSchema>
export type OutlineSection = z.infer<typeof OutlineSectionSchema>

/* ── Per-section (phase 2) contract ──────────────────────── */
import { ScreenSchema } from '../shared/schema'
export const SectionDetailSchema = z.object({ screens: z.array(ScreenSchema).min(1).max(4) })
export type SectionDetail = z.infer<typeof SectionDetailSchema>

/* ── Prompt builders ─────────────────────────────────────── */
export function buildOutlineMessages(article: string): ChatMessage[] {
  const system = `你是一位资深教学内容设计师。你的任务是把一篇【文章】重新组织成一个【可视化、可交互、有教育意义】的网页课程的大纲。
请使用与原文相同的语言输出。
只输出一个 JSON 对象，不要输出 markdown 代码块、不要任何解释文字。
JSON 结构：
{
  "title": "课程标题（吸引人、点明主题）",
  "subtitle": "一句话副标题",
  "accent": "vermillion" | "coral" | "teal" | "amber" | "forest",
  "sections": [
    { "id": "kebab-case-英文id", "title": "本节标题", "subtitle": "一句话", "focus": "本节要讲清楚什么、覆盖原文哪些部分、适合用什么交互元素" }
  ]
}
要求：
- 设计 3 到 6 个 section，按"先是什么 → 怎么运作 → 为什么重要 → 检验理解"的递进顺序。
- 第一个 section 用生活化比喻引入；最后一个 section 适合放测验(keypoints/quiz)巩固。
- focus 要具体，说明这节重点和推荐的交互方式（quiz/chat/flow/translation 等）。`

  const user = `【文章】\n${article}\n\n请输出大纲 JSON。`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function buildSectionMessages(
  article: string,
  section: OutlineSection,
  outline: Outline,
): ChatMessage[] {
  const sectionTitles = outline.sections.map((s) => `- ${s.title}`).join('\n')
  const system = `你正在和别人合作把一篇文章做成一节【可视化、可交互、有教育意义】的网页课程。你只负责写其中【一节】的内容。
整门课的大纲：
${sectionTitles}

你要写的这一节：
- 标题：${section.title}
- 重点：${section.focus}

输出要求：
- 使用与原文相同的语言。
- 只输出一个 JSON 对象：{ "screens": [ { "heading": "可选的小标题", "blocks": [ ... ] } ] }
- 产出 1 到 3 个 screen；每个 screen 放 1 到 4 个 block。
- 这一节里至少出现一个【交互】元素（quiz / chat / flow 之一），其余可用 paragraph / callout / translation / keypoints / steps。
- 用大白话，每段 2-3 句；专业术语第一次出现时用 paragraph 的 term 包裹并给 1-2 句通俗定义。
- 不要照抄原文，要重新组织、降低阅读门槛；translation 的 original 可摘录原文关键句。
- 只输出 JSON，不要 markdown 代码块或解释。

${BLOCK_CATALOG}`

  const user = `【完整文章】\n${article}\n\n请为这一节输出 JSON：{ "screens": [...] }`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

/** Second-attempt prompt that feeds back a validation error to the model. */
export function buildSectionRepairMessages(
  article: string,
  section: OutlineSection,
  outline: Outline,
  errorMessage: string,
  badOutput: string,
): ChatMessage[] {
  const base = buildSectionMessages(article, section, outline)
  return [
    ...base,
    { role: 'assistant', content: badOutput },
    {
      role: 'user',
      content: `上一次输出的 JSON 校验失败：${errorMessage}\n请修正后只重新输出符合 schema 的 JSON 对象。`,
    },
  ]
}
