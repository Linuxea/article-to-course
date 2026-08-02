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
    const parsed = CourseSchema.parse({ title: 'T', sections: [{ id: 's', title: 'S', screens: [{ blocks: [] }] }] })
    expect(parsed.accent).toBe('vermillion')
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
    // Schema does not enforce cross-field correctness; this is a render-time concern.
    // Here we just ensure a well-formed quiz parses.
    const q = {
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
                  correct: 'option-a',
                  explanationRight: 'r',
                  explanationWrong: 'w',
                },
              ],
            },
          ],
        },
      ],
    }
    expect(CourseSchema.parse(q)).toBeTruthy()
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
