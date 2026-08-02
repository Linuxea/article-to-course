import { describe, it, expect } from 'vitest'
import { parseJsonLenient } from '../src/server/generate'

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
