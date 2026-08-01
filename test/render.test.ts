import { describe, it, expect } from 'vitest'
import { renderCourse } from '../src/server/render'
import { fixtureCourse } from './fixtures'

const STUB = { css: '/*CSS*/', js: '/*JS*/' }

function render() {
  return renderCourse(fixtureCourse, STUB)
}

describe('renderCourse — shell', () => {
  const html = render()

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('</html>')
  })

  it('inlines css and js', () => {
    expect(html).toContain('/*CSS*/')
    expect(html).toContain('/*JS*/')
  })

  it('injects accent variables for the chosen accent (teal)', () => {
    expect(html).toContain('--color-accent: #2A7B9B')
    expect(html).toContain('--color-accent-hover: #1F6280')
  })

  it('renders one nav-dot per section with correct data-target', () => {
    expect(html).toContain('data-target="module-1"')
    expect(html).toContain('data-target="module-2"')
    expect(html).toContain('data-target="module-3"')
    expect(html).toContain('data-tooltip="先看一个生活比喻"')
  })

  it('renders alternating backgrounds', () => {
    expect(html).toContain('background: var(--color-bg)')
    expect(html).toContain('background: var(--color-bg-warm)')
  })
})

describe('renderCourse — block types emit correct engine contract', () => {
  const html = render()

  it('paragraph: emits glossary term spans with data-definition', () => {
    expect(html).toContain('class="term"')
    expect(html).toContain('data-definition=')
  })

  it('callout: emits callout + variant class', () => {
    expect(html).toContain('class="callout callout-accent"')
  })

  it('translation: emits translation-block with code + english panels', () => {
    expect(html).toContain('class="translation-block animate-in"')
    expect(html).toContain('class="translation-code"')
    expect(html).toContain('class="translation-english"')
  })

  it('quiz: emits container id, question block with data-correct + onclick wiring', () => {
    expect(html).toContain('class="quiz-container" id="quiz-')
    expect(html).toContain('data-correct="option-b"')
    expect(html).toContain('onclick="checkQuiz(\'quiz-')
    expect(html).toContain('onclick="selectOption(this)"')
  })

  it('chat: emits chat-window with unique id, messages with data-sender + actor color', () => {
    expect(html).toContain('class="chat-window" id="chat-')
    expect(html).toContain('data-sender="browser"')
    expect(html).toContain('var(--color-actor-1)')
    expect(html).toContain('chat-next-btn')
  })

  it('flow: emits flow-animation with JSON data-steps and flow-actor-N ids', () => {
    expect(html).toContain('class="flow-animation" data-steps="')
    expect(html).toContain('id="flow-actor-1"')
    expect(html).toContain('id="flow-actor-2"')
    // The attribute value is HTML-escaped; decode + parse to verify the contract main.js expects.
    const match = html.match(/data-steps="([^"]*)"/)
    expect(match).not.toBeNull()
    const decoded = (match?.[1] as string)
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    const steps = JSON.parse(decoded)
    expect(steps[0].highlight).toBe('flow-actor-1')
    expect(steps[0].from).toBe('actor-1')
    expect(steps[0].to).toBe('actor-2')
    expect(steps[0].packet).toBe(true)
  })

  it('keypoints: emits pattern-cards grid', () => {
    expect(html).toContain('class="pattern-cards"')
    expect(html).toContain('class="pattern-card"')
  })

  it('steps: emits step-cards', () => {
    expect(html).toContain('class="step-cards"')
    expect(html).toContain('class="step-card"')
  })
})

describe('renderCourse — escaping', () => {
  it('escapes HTML-special characters in text and attributes', () => {
    const html = renderCourse(
      {
        title: 'A & B <c>',
        accent: 'vermillion',
        sections: [
          {
            id: 's',
            title: 'Title "quoted"',
            screens: [
              {
                blocks: [
                  {
                    type: 'paragraph',
                    segments: [{ type: 'term', text: 'x', definition: 'a <b> & "c"' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      STUB,
    )
    expect(html).toContain('A &amp; B &lt;c&gt;')
    expect(html).toContain('data-tooltip="Title &quot;quoted&quot;"')
    // attribute-escaped definition
    expect(html).toContain('data-definition="a &lt;b&gt; &amp; &quot;c&quot;"')
    // raw unescaped angle brackets from the payload must NOT leak as markup
    expect(html).not.toContain('<b>')
  })
})
