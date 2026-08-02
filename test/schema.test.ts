import { describe, it, expect } from 'vitest'
import { CourseSchema } from '../src/shared/schema'
import { fixtureCourse } from './fixtures'

describe('CourseSchema', () => {
  it('accepts a valid fixture course', () => {
    const parsed = CourseSchema.parse(fixtureCourse)
    expect(parsed.title).toBe('什么是 HTTPS？')
    expect(parsed.accent).toBe('teal')
    expect(parsed.sections).toHaveLength(3)
  })

  it('defaults accent to vermillion when omitted', () => {
    const parsed = CourseSchema.parse({
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [{ blocks: [{ type: 'paragraph', segments: [{ type: 'text', text: 'x' }] }] }],
        },
      ],
    })
    expect(parsed.accent).toBe('vermillion')
  })

  it('rejects a screen with an empty blocks array', () => {
    const bad = {
      title: 'T',
      sections: [{ id: 's', title: 'S', screens: [{ blocks: [] }] }],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })

  it('rejects an unknown block type', () => {
    const bad = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [{ blocks: [{ type: 'nonsense', segments: [] }] }],
        },
      ],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })

  it('rejects a quiz whose `correct` does not match any option', () => {
    const quiz = (correct: string) => ({
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            {
              blocks: [
                {
                  type: 'quiz',
                  question: 'q?',
                  options: [
                    { value: 'option-a', text: 'a' },
                    { value: 'option-b', text: 'b' },
                  ],
                  correct,
                  explanationRight: 'r',
                  explanationWrong: 'w',
                },
              ],
            },
          ],
        },
      ],
    })
    expect(CourseSchema.parse(quiz('option-a'))).toBeTruthy()
    expect(() => CourseSchema.parse(quiz('option-z'))).toThrow()
  })

  it('rejects chat whose actorId is not declared in actors', () => {
    const bad = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            {
              blocks: [
                {
                  type: 'chat',
                  actors: [
                    { id: 'a', name: 'A', colorIndex: 1 },
                    { id: 'b', name: 'B', colorIndex: 2 },
                  ],
                  messages: [
                    { actorId: 'a', text: '1' },
                    { actorId: 'ghost', text: '2' },
                    { actorId: 'b', text: '3' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })

  it('rejects a flow step referencing an actor index out of range', () => {
    const flow = (to: number) => ({
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            {
              blocks: [
                {
                  type: 'flow',
                  actors: [{ label: 'A' }, { label: 'B' }],
                  steps: [
                    { from: 1, to: 2, label: 's1', packet: true },
                    { from: 2, to, label: 's2', packet: true },
                    { from: 1, to: 2, label: 's3', packet: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(CourseSchema.parse(flow(1))).toBeTruthy()
    expect(() => CourseSchema.parse(flow(3))).toThrow()
  })

  it('rejects chat with fewer than 2 actors', () => {
    const bad = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [{ blocks: [{ type: 'chat', actors: [{ id: 'a', name: 'A', colorIndex: 1 }], messages: [] }] }],
        },
      ],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })

  it('rejects a table whose row length differs from columns', () => {
    const bad = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            { blocks: [{ type: 'table', columns: ['a', 'b'], rows: [['1', '2'], ['3']] }] },
          ],
        },
      ],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })

  it('accepts a well-formed table and rejects arch with fewer than 2 nodes', () => {
    const good = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            { blocks: [{ type: 'table', columns: ['a', 'b'], rows: [['1', '2'], ['3', '4']] }] },
          ],
        },
      ],
    }
    expect(CourseSchema.parse(good)).toBeTruthy()

    const bad = {
      title: 'T',
      sections: [
        {
          id: 's',
          title: 'S',
          screens: [
            { blocks: [{ type: 'arch', nodes: [{ id: 'x', label: 'X', desc: 'd' }] }] },
          ],
        },
      ],
    }
    expect(() => CourseSchema.parse(bad)).toThrow()
  })
})
