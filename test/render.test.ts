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
    expect(html).toContain('--accent: #2A7B9B')
    expect(html).toContain('--accent-hover: #1F6280')
  })

  it('renders topnav with progress bar and one toc link per chapter', () => {
    expect(html).toContain('class="topnav"')
    expect(html).toContain('id="progressBar"')
    expect(html).toContain('data-chapter="ch-1"')
    expect(html).toContain('data-chapter="ch-2"')
    expect(html).toContain('data-chapter="ch-3"')
    expect(html).toContain('href="#ch-1"')
    expect(html).toContain('id="ch-1"')
  })

  it('renders hero with meta chips and objectives', () => {
    expect(html).toContain('class="hero"')
    expect(html).toContain('3 个章节')
    expect(html).toContain('个互动')
    expect(html).toContain('个术语')
    expect(html).toContain('分钟')
    expect(html).toContain('class="objectives reveal"')
    expect(html).toContain('说清 HTTP 和 HTTPS 的区别')
  })

  it('renders chapter heads with zero-padded numbers and takeaways', () => {
    expect(html).toContain('class="chapter-num">01<')
    expect(html).toContain('class="chapter-title">先看一个生活比喻<')
    expect(html).toContain('class="takeaways reveal"')
    expect(html).toContain('HTTP 像明信片，内容人人可见')
  })
})

describe('renderCourse — block types emit correct engine contract', () => {
  const html = render()

  it('paragraph: emits prose with glossary term spans', () => {
    expect(html).toContain('class="prose reveal"')
    expect(html).toContain('class="term"')
    expect(html).toContain('data-definition=')
  })

  it('callout: emits callout--variant class', () => {
    expect(html).toContain('class="callout callout--accent reveal"')
  })

  it('translation: emits xl-block with both panes', () => {
    expect(html).toContain('class="xl-block reveal"')
    expect(html).toContain('xl-pane xl-pane--src')
    expect(html).toContain('xl-pane xl-pane--plain')
  })

  it('quiz: emits data-driven quiz without inline onclick', () => {
    expect(html).toContain('class="quiz reveal"')
    expect(html).toContain('data-correct="option-b"')
    expect(html).toContain('data-right=')
    expect(html).toContain('data-wrong=')
    expect(html).toContain('class="quiz-opt" data-value="option-a"')
    expect(html).not.toContain('onclick')
  })

  it('chat: emits messages with data-sender wiring and controls', () => {
    expect(html).toContain('class="chat reveal"')
    expect(html).toContain('class="chat-msg"')
    expect(html).toContain('var(--actor-1)')
    expect(html).toContain('chat-next')
    expect(html).toContain('chat-all')
    expect(html).toContain('chat-replay')
  })

  it('flow: emits flow with JSON data-steps and actor ids', () => {
    expect(html).toContain('class="flow reveal" data-steps="')
    expect(html).toContain('data-actor="actor-1"')
    expect(html).toContain('data-actor="actor-2"')
    const match = html.match(/data-steps="([^"]*)"/)
    expect(match).not.toBeNull()
    const decoded = (match?.[1] as string)
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    const steps = JSON.parse(decoded)
    expect(steps[0].from).toBe('actor-1')
    expect(steps[0].to).toBe('actor-2')
    expect(steps[0].packet).toBe(true)
  })

  it('flow: packet lives inside .flow-actors so absolute positioning math holds', () => {
    const m = html.match(/<div class="flow-actors">([\s\S]*?)<\/div>\s*<div class="flow-label">/)
    expect(m).not.toBeNull()
    expect(m?.[1]).toContain('class="flow-packet"')
  })

  it('emits a CSP meta tag and a noscript reveal fallback', () => {
    expect(html).toContain('http-equiv="Content-Security-Policy"')
    expect(html).toContain('<noscript><style>.reveal')
  })

  it('keypoints: emits kp-grid with cards', () => {
    expect(html).toContain('class="kp-grid reveal"')
    expect(html).toContain('class="kp-card"')
  })

  it('steps: emits ordered steps list', () => {
    expect(html).toContain('class="steps reveal"')
    expect(html).toContain('class="step"')
    expect(html).toContain('class="step-n"')
  })

  it('table: emits caption, thead and tbody with matching cells', () => {
    expect(html).toContain('class="tbl reveal"')
    expect(html).toContain('HTTP 与 HTTPS 对比')
    expect(html).toContain('<th>维度</th>')
    expect(html).toContain('<td>明文，人人可读</td>')
  })

  it('arch: emits clickable nodes with data-desc and detail panel', () => {
    expect(html).toContain('class="arch reveal"')
    expect(html).toContain('class="arch-node"')
    expect(html).toContain('data-label="TLS 加密层"')
    expect(html).toContain('data-desc=')
    expect(html).toContain('class="arch-detail"')
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
    expect(html).toContain('<span class="toc-text">Title "quoted"</span>')
    // attribute-escaped definition
    expect(html).toContain('data-definition="a &lt;b&gt; &amp; &quot;c&quot;"')
    // raw unescaped angle brackets from the payload must NOT leak as markup
    expect(html).not.toContain('<b>')
  })

  it('chat attributes are escaped exactly once and avatars are code-point safe', () => {
    const html = renderCourse(
      {
        title: 'T',
        accent: 'teal',
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
                      { id: 'a', name: '小<明>', colorIndex: 1 },
                      { id: 'b', name: '😀机器人', colorIndex: 2 },
                    ],
                    messages: [
                      { actorId: 'a', text: 'hi' },
                      { actorId: 'b', text: 'yo' },
                      { actorId: 'a', text: 'bye' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      STUB,
    )
    // attribute escaped exactly once — no double-escaping like &amp;lt;
    expect(html).toContain('data-who="小&lt;明&gt;"')
    expect(html).not.toContain('&amp;lt;')
    // bubble text renders the escaped name as content
    expect(html).toContain('<span class="chat-who" style="color:var(--actor-1)">小&lt;明&gt;</span>')
    // emoji name: avatar is the full code point, not a broken surrogate half
    expect(html).toContain('data-ava="😀"')
    expect(html).not.toContain('\uD83D</div>')
  })
})
