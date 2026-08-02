import { z } from 'zod'

/* ── Block catalog the model is allowed to emit ──────────── */
export const BLOCK_CATALOG = `你只能使用以下 block 类型（每个对象都有固定的 "type" 字段）：

1. paragraph — 正文段落，支持内联术语解释。**这是课程的主要载体，一节里 paragraph 的数量应不少于其他所有 block 数量之和。**
   { "type":"paragraph", "segments":[ {"type":"text","text":"..."} , {"type":"term","text":"术语","definition":"1-2 句通俗解释"} ] }
   规则：专业术语在每节第一次出现时必须用 term 包裹；每段 3-6 句，逐步展开一个观点、给出例子或推理过程（而非只甩结论）。
   相邻 paragraph 之间要有论证链：用"先…再…所以…"、"举个例子"、"反过来"、"这意味着"等过渡词衔接，让多段读起来像连贯的讲解，而不是孤立的卡片。

2. callout — "为什么重要"提示框。
   { "type":"callout", "variant":"accent"|"info"|"warning", "title":"可选标题", "body":"内容" }

3. translation — 原文 ↔ 大白话左右对照。
   { "type":"translation", "original":["原文行1","原文行2"], "plain":["对应的通俗解释行1","解释行2"] }
   original 与 plain 的行尽量一一对应。
   使用条件：仅当原文有特别难懂、需要逐句对照的关键句时使用；一般性讲解直接用 paragraph 即可。

4. quiz — 单项选择测验（即时反馈）。
   { "type":"quiz", "question":"问题", "options":[{"value":"option-a","text":"A"},{"value":"option-b","text":"B"}],
     "correct":"option-b", "explanationRight":"答对时的解释", "explanationWrong":"答错时的引导" }
   options 的 value 必须形如 option-a / option-b / option-c ...；correct 必须等于其中某个 value；2-4 个选项。

5. chat — 群聊动画（把概念拟人化对话）。
   { "type":"chat", "actors":[{"id":"browser","name":"浏览器","colorIndex":1},{"id":"server","name":"服务器","colorIndex":2}],
     "messages":[{"actorId":"browser","text":"..."},{"actorId":"server","text":"..."}] }
   colorIndex 取 1-5；actorId 必须出现在 actors 里；至少 2 个 actor、3-8 条消息。

6. flow — 数据/流程逐步动画。
   { "type":"flow", "actors":[{"label":"浏览器"},{"label":"服务器"}],
     "steps":[{"from":1,"to":2,"label":"描述这一步","packet":true}] }
   from / to 是 actor 的序号（从 1 开始）；3-6 步为宜。

7. keypoints — 要点卡片网格（总结/清单）。
   { "type":"keypoints", "items":[{"title":"标题","body":"1-2 句，点明要点及其意义","icon":"可选emoji"}] }
   使用条件：仅在本节末尾做要点回顾、且要点数 ≤4 时使用；不要用它来替代正文讲解——该讲透的概念请用 paragraph。

8. steps — 编号步骤卡片。
   { "type":"steps", "items":[{"title":"标题","body":"描述"}] }
   使用条件：仅在读者需要"按顺序执行的操作步骤"时使用；概念性讲解、原理阐述请用 paragraph。

9. table — 对比表格（信息密度高，适合横向比较）。
   { "type":"table", "caption":"可选标题", "columns":["列1","列2"], "rows":[["a","b"],["c","d"]] }
   每一行的单元格数量必须严格等于 columns 的数量；至少 2 列。
   使用条件：仅当真正存在 ≥2 个对象在 ≥2 个维度上的横向对比时使用；否则用 paragraph 串起来讲更连贯。

10. arch — 可点击的架构/组成图（点击组件看解释）。
    { "type":"arch", "nodes":[{"id":"frontend","label":"前端","icon":"🖥️","desc":"通俗解释这个组件的职责"}] }
    至少 2 个节点；id 用 kebab-case 英文；desc 要说人话。`

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
  objectives: z.array(z.string()).min(3).max(5),
  sections: z.array(OutlineSectionSchema).min(3).max(8),
})
export type Outline = z.infer<typeof OutlineSchema>
export type OutlineSection = z.infer<typeof OutlineSectionSchema>

/* ── Per-section (phase 2) contract ──────────────────────── */
import { ScreenSchema } from '../shared/schema'
export const SectionDetailSchema = z.object({
  screens: z.array(ScreenSchema).min(1).max(4),
  takeaways: z.array(z.string()).min(1).max(4).optional(),
})
export type SectionDetail = z.infer<typeof SectionDetailSchema>

/* ── Prompt builders ─────────────────────────────────────── */
export interface PromptParts {
  /** System-level instructions (passed to generateObject as `instructions`). */
  instructions: string
  /** The user prompt (passed to generateObject as `prompt`). */
  prompt: string
}

export function buildOutlinePrompt(article: string): PromptParts {
  const instructions = `你是一位资深教学内容设计师。你的任务是把一篇【文章】重新组织成一个【可视化、可交互、有教育意义】的网页课程的大纲。
请使用与原文相同的语言输出。
只输出一个 JSON 对象，不要输出 markdown 代码块、不要任何解释文字。
JSON 结构：
{
  "title": "课程标题（吸引人、点明主题）",
  "subtitle": "一句话副标题",
  "accent": "vermillion" | "coral" | "teal" | "amber" | "forest",
  "objectives": ["学完能达到的目标 1", "目标 2", "目标 3"],
  "sections": [
    { "id": "kebab-case-英文id", "title": "本节标题", "subtitle": "一句话", "focus": "本节要讲清楚什么、覆盖原文哪些部分、推荐以连贯段落展开还是搭配某种交互元素" }
  ]
}
要求：
- objectives 写 3 到 5 条，每条是一个具体、可衡量的学习收获（动词开头，如"能说清……""会判断……"）。
- 设计 4 到 7 个 section，按"先是什么 → 怎么运作 → 细节展开 → 为什么重要 → 检验理解"的递进顺序，充分覆盖原文的要点，不要遗漏重要内容。
- 第一个 section 用生活化比喻引入；最后一个 section 适合放测验(keypoints/quiz)巩固。
- focus 要具体，说明这节重点；若适合用 quiz/chat/flow/translation/table/arch 等交互元素可一并推荐，但默认应以连贯 paragraph 展开为主。`

  const prompt = `【文章】\n${article}\n\n请输出大纲 JSON。`
  return { instructions, prompt }
}

export function buildSectionPrompt(
  article: string,
  section: OutlineSection,
  outline: Outline,
): PromptParts {
  const sectionTitles = outline.sections.map((s) => `- ${s.title}`).join('\n')
  const instructions = `你正在和别人合作把一篇文章做成一节【可视化、可交互、有教育意义】的网页课程。你只负责写其中【一节】的内容。
整门课的大纲：
${sectionTitles}

你要写的这一节：
- 标题：${section.title}
- 重点：${section.focus}

输出要求：
- 使用与原文相同的语言。
- 只输出一个 JSON 对象：{ "screens": [ { "heading": "可选的小标题", "blocks": [ ... ] } ], "takeaways": ["本节小结 1", "小结 2"] }
- 产出 2 到 4 个 screen；每个 screen 以 paragraph 为主体（通常 2-4 个连贯的 paragraph），仅在需要时插入 1 个交互或结构化 block。**整节 paragraph 总数应明显多于其他 block 之和（目标 60%-80%）。**
- 这一节里至少出现一个【交互】元素（quiz / chat / flow / arch 之一）作为点睛之笔；其余以 paragraph 为主，callout / translation / keypoints / steps / table 仅在 BLOCK_CATALOG 中注明的使用条件下才用。
- 涉及多方对比、优缺点、参数差异时，优先用 table；涉及系统组成、模块职责时，优先用 arch；除此之外尽量用 paragraph 讲透。
- 写作风格：像在给朋友讲解一个概念——先铺垫、再展开、给例子、最后点出意义。相邻 paragraph 之间用过渡词衔接，不要把段落写成彼此孤立的卡片。
- 用大白话，每段 3-6 句，把概念讲透、给出例子或推理过程（而不是只给结论）；专业术语第一次出现时必须用 paragraph 的 term 包裹并给 1-2 句通俗定义。
- 不要照抄原文，要重新组织、降低阅读门槛；translation 的 original 可摘录原文关键句。
- takeaways 写 1 到 3 条，每条 1-2 句概括本节最值得记住的点。
- 只输出 JSON，不要 markdown 代码块或解释。

${BLOCK_CATALOG}`

  const prompt = `【完整文章】\n${article}\n\n请为这一节输出 JSON：{ "screens": [...], "takeaways": [...] }`
  return { instructions, prompt }
}
