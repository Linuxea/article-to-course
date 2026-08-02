import { describe, it, expect } from 'vitest'
import { generate, parseJsonLenient } from '../src/server/generate'
import { OutlineSchema } from '../src/server/prompts'

describe('parseJsonLenient', () => {
  it('parses raw JSON', () => {
    expect(parseJsonLenient('{"a": 1}')).toEqual({ a: 1 })
  })

  it('strips markdown code fences', () => {
    expect(parseJsonLenient('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(parseJsonLenient('```\n{"a": 1}\n```')).toEqual({ a: 1 })
  })

  it('slices the outermost braces when prose surrounds the object', () => {
    expect(parseJsonLenient('好的，这是结果：\n{"a": {"b": 2}}\n希望有帮助')).toEqual({ a: { b: 2 } })
  })

  it('throws when no JSON object is present', () => {
    expect(() => parseJsonLenient('')).toThrow()
    expect(() => parseJsonLenient('no braces here')).toThrow('no JSON object found')
    expect(() => parseJsonLenient('{"broken":')).toThrow()
  })
})

describe('generate (mock mode)', () => {
  it('emits an error event when the article is too short', async () => {
    const events = []
    for await (const ev of generate('短文')) events.push(ev)
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('error')
  })

  it('yields no events when the request signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const events = []
    for await (const ev of generate('一篇足够长的文章以通过长度检查，但abort在此之前就已成立，因此不应产出任何事件', controller.signal)) {
      events.push(ev)
    }
    expect(events).toEqual([])
  })
})

describe('OutlineSchema leniency', () => {
  it('defaults accent and tolerates a single objective / section', () => {
    const parsed = OutlineSchema.parse({
      title: 'T',
      objectives: ['only one'],
      sections: [{ id: 's', title: 'S', focus: 'f' }],
    })
    expect(parsed.accent).toBe('vermillion')
    expect(parsed.objectives).toHaveLength(1)
    expect(parsed.sections).toHaveLength(1)
  })
})
