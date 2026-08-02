import { z } from 'zod'

/* ── Accents ─────────────────────────────────────────────── */
export const AccentSchema = z.enum(['vermillion', 'coral', 'teal', 'amber', 'forest'])
export type Accent = z.infer<typeof AccentSchema>

export const ACCENTS: Record<Accent, { color: string; hover: string; light: string; muted: string }> = {
  vermillion: { color: '#D94F30', hover: '#C4432A', light: '#FDEEE9', muted: '#E8836C' },
  coral: { color: '#E06B56', hover: '#C85A47', light: '#FDECEA', muted: '#E89585' },
  teal: { color: '#2A7B9B', hover: '#1F6280', light: '#E4F2F7', muted: '#5A9DB8' },
  amber: { color: '#D4A843', hover: '#BF9530', light: '#FDF5E0', muted: '#E0C070' },
  forest: { color: '#2D8B55', hover: '#226B41', light: '#E8F5EE', muted: '#5AAD7A' },
}

/* ── Inline rich text (paragraphs with glossary terms) ───── */
export const SegmentSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('term'), text: z.string(), definition: z.string() }),
])
export type Segment = z.infer<typeof SegmentSchema>

/* ── Block types (discriminated union) ───────────────────── */
export const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  segments: z.array(SegmentSchema).min(1),
})

export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['accent', 'info', 'warning']),
  title: z.string().optional(),
  body: z.string(),
  icon: z.string().optional(),
})

export const TranslationBlockSchema = z.object({
  type: z.literal('translation'),
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  original: z.array(z.string()).min(1),
  plain: z.array(z.string()).min(1),
})

export const QuizOptionSchema = z.object({ value: z.string(), text: z.string() })
export const QuizBlockSchema = z.object({
  type: z.literal('quiz'),
  question: z.string(),
  options: z.array(QuizOptionSchema).min(2),
  correct: z.string(),
  explanationRight: z.string(),
  explanationWrong: z.string(),
})

export const ChatActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorIndex: z.number().int().min(1).max(5),
})
export const ChatMessageSchema = z.object({ actorId: z.string(), text: z.string() })
export const ChatBlockSchema = z.object({
  type: z.literal('chat'),
  actors: z.array(ChatActorSchema).min(2),
  messages: z.array(ChatMessageSchema).min(1),
})

export const FlowStepSchema = z.object({
  from: z.number().int().min(1),
  to: z.number().int().min(1),
  label: z.string(),
  packet: z.boolean().default(true),
})
export const FlowBlockSchema = z.object({
  type: z.literal('flow'),
  actors: z.array(z.object({ label: z.string() })).min(2),
  steps: z.array(FlowStepSchema).min(1),
})

export const KeypointsBlockSchema = z.object({
  type: z.literal('keypoints'),
  items: z.array(z.object({ title: z.string(), body: z.string(), icon: z.string().optional() })).min(1),
})

export const StepsBlockSchema = z.object({
  type: z.literal('steps'),
  items: z.array(z.object({ title: z.string(), body: z.string() })).min(1),
})

export const TableBlockSchema = z
  .object({
    type: z.literal('table'),
    caption: z.string().optional(),
    columns: z.array(z.string()).min(2),
    rows: z.array(z.array(z.string())).min(1),
  })
  .superRefine((t, ctx) => {
    t.rows.forEach((row, i) => {
      if (row.length !== t.columns.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `row ${i} has ${row.length} cells but table has ${t.columns.length} columns`,
        })
      }
    })
  })

export const ArchNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  icon: z.string().optional(),
  desc: z.string(),
})
export const ArchBlockSchema = z.object({
  type: z.literal('arch'),
  nodes: z.array(ArchNodeSchema).min(2),
})

export const BlockSchema = z.union([
  ParagraphBlockSchema,
  CalloutBlockSchema,
  TranslationBlockSchema,
  QuizBlockSchema,
  ChatBlockSchema,
  FlowBlockSchema,
  KeypointsBlockSchema,
  StepsBlockSchema,
  TableBlockSchema,
  ArchBlockSchema,
])
export type Block = z.infer<typeof BlockSchema>

/* ── Structure: Course → Section → Screen → blocks ───────── */
export const ScreenSchema = z.object({
  heading: z.string().optional(),
  blocks: z.array(BlockSchema),
})
export type Screen = z.infer<typeof ScreenSchema>

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  takeaways: z.array(z.string()).min(1).optional(),
  screens: z.array(ScreenSchema).min(1),
})
export type Section = z.infer<typeof SectionSchema>

export const CourseSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  accent: AccentSchema.default('vermillion'),
  objectives: z.array(z.string()).min(1).optional(),
  sections: z.array(SectionSchema).min(1),
})
export type Course = z.infer<typeof CourseSchema>
