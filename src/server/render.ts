import { ACCENTS, type Accent, type Block, type Course } from '../shared/schema'

/* ── escaping ────────────────────────────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escAttr(s: string): string {
  return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface RenderAssets {
  css: string
  js: string
}

const CALLOUT_DEFAULT_ICON = { accent: '💡', info: 'ℹ️', warning: '⚠️' } as const

export function renderCourse(course: Course, assets: RenderAssets): string {
  let counter = 0
  const uid = (prefix: string) => `${prefix}-${++counter}`

  const accent: Accent = course.accent
  const a = ACCENTS[accent]

  const sectionsHtml = course.sections
    .map((section, i) => renderSection(section, i, uid))
    .join('\n')

  const navDots = course.sections
    .map(
      (section, i) =>
        `<button class="nav-dot" data-target="module-${i + 1}" data-tooltip="${escAttr(section.title)}" role="tab" aria-label="第${i + 1}节：${escAttr(section.title)}"></button>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(course.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
${assets.css}
    :root {
      --color-accent: ${a.color};
      --color-accent-hover: ${a.hover};
      --color-accent-light: ${a.light};
      --color-accent-muted: ${a.muted};
    }
  </style>
</head>
<body>
  <nav class="nav" id="nav">
    <div class="progress-bar" id="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
    <div class="nav-inner">
      <span class="nav-title">${esc(course.title)}</span>
      <div class="nav-dots" id="nav-dots" role="tablist">
        ${navDots}
      </div>
    </div>
  </nav>

  <main id="main">
${sectionsHtml}
  </main>

  <script>
${assets.js}
  </script>
</body>
</html>`
}

function renderSection(
  section: Course['sections'][number],
  index: number,
  uid: (p: string) => string,
): string {
  const number = String(index + 1).padStart(2, '0')
  const bg = index % 2 === 0 ? 'var(--color-bg)' : 'var(--color-bg-warm)'
  const screensHtml = section.screens.map((s) => renderScreen(s, uid)).join('\n')
  return `    <section class="module" id="module-${index + 1}" style="background: ${bg}">
      <div class="module-content">
        <header class="module-header animate-in">
          <span class="module-number">${number}</span>
          <h1 class="module-title">${esc(section.title)}</h1>
          ${section.subtitle ? `<p class="module-subtitle">${esc(section.subtitle)}</p>` : ''}
        </header>
        <div class="module-body">
${screensHtml}
        </div>
      </div>
    </section>`
}

function renderScreen(screen: { heading?: string; blocks: Block[] }, uid: (p: string) => string): string {
  const heading = screen.heading ? `          <h2 class="screen-heading">${esc(screen.heading)}</h2>` : ''
  const blocksHtml = screen.blocks.map((b) => '          ' + renderBlock(b, uid)).join('\n')
  return `          <section class="screen animate-in">
${heading}
${blocksHtml}
          </section>`
}

function renderBlock(block: Block, uid: (p: string) => string): string {
  switch (block.type) {
    case 'paragraph':
      return `<p>${block.segments
        .map((seg) =>
          seg.type === 'term'
            ? `<span class="term" data-definition="${escAttr(seg.definition)}">${esc(seg.text)}</span>`
            : esc(seg.text),
        )
        .join('')}</p>`

    case 'callout': {
      const icon = block.icon ?? CALLOUT_DEFAULT_ICON[block.variant]
      const title = block.title ? `<strong class="callout-title">${esc(block.title)}</strong>` : ''
      return `<div class="callout callout-${block.variant}">
            <div class="callout-icon">${esc(icon)}</div>
            <div class="callout-content">
              ${title}
              <p>${esc(block.body)}</p>
            </div>
          </div>`
    }

    case 'translation': {
      const left = block.original.map((l) => esc(l)).join('\n')
      const right = block.plain.map((p) => `<p class="tl">${esc(p)}</p>`).join('')
      return `<div class="translation-block animate-in">
            <div class="translation-code">
              <span class="translation-label">${esc(block.leftLabel ?? '原文')}</span>
              <pre><code>${left}</code></pre>
            </div>
            <div class="translation-english">
              <span class="translation-label">${esc(block.rightLabel ?? '通俗解释')}</span>
              <div class="translation-lines">
                ${right}
              </div>
            </div>
          </div>`
    }

    case 'quiz': {
      const id = uid('quiz')
      const options = block.options
        .map(
          (o) =>
            `<button class="quiz-option" data-value="${escAttr(o.value)}" onclick="selectOption(this)"><div class="quiz-option-radio"></div><span>${esc(o.text)}</span></button>`,
        )
        .join('')
      return `<div class="quiz-container" id="${id}">
            <div class="quiz-question-block" data-correct="${escAttr(block.correct)}" data-explanation-right="${escAttr(block.explanationRight)}" data-explanation-wrong="${escAttr(block.explanationWrong)}">
              <h3 class="quiz-question">${esc(block.question)}</h3>
              <div class="quiz-options">
                ${options}
              </div>
              <div class="quiz-feedback"></div>
            </div>
            <button class="btn quiz-check-btn" onclick="checkQuiz('${id}')">检查答案</button>
            <button class="btn quiz-reset-btn" onclick="resetQuiz('${id}')">再试一次</button>
          </div>`
    }

    case 'chat': {
      const id = uid('chat')
      const actorById = new Map(block.actors.map((ac) => [ac.id, ac]))
      const messages = block.messages
        .map((m, idx) => {
          const actor = actorById.get(m.actorId)
          const colorVar = actor ? `var(--color-actor-${actor.colorIndex})` : 'var(--color-accent)'
          const initial = actor ? esc(actor.name.slice(0, 1)) : '?'
          const name = actor ? esc(actor.name) : esc(m.actorId)
          return `<div class="chat-message" data-msg="${idx}" data-sender="${escAttr(m.actorId)}" style="display:none">
                <div class="chat-avatar" style="background: ${colorVar}">${initial}</div>
                <div class="chat-bubble">
                  <span class="chat-sender" style="color: ${colorVar}">${name}</span>
                  <p>${esc(m.text)}</p>
                </div>
              </div>`
        })
        .join('')
      return `<div class="chat-window" id="${id}">
            <div class="chat-messages">
              ${messages}
            </div>
            <div class="chat-typing" style="display:none">
              <div class="chat-avatar">?</div>
              <div class="chat-typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
            </div>
            <div class="chat-controls">
              <button class="btn chat-next-btn">下一条</button>
              <button class="btn chat-all-btn">全部播放</button>
              <button class="btn chat-reset-btn">重播</button>
              <span class="chat-progress"></span>
            </div>
          </div>`
    }

    case 'flow': {
      const stepsJson = block.steps.map((s) => ({
        highlight: `flow-actor-${s.from}`,
        label: s.label,
        packet: s.packet,
        from: `actor-${s.from}`,
        to: `actor-${s.to}`,
      }))
      const actors = block.actors
        .map(
          (ac, idx) =>
            `<div class="flow-actor" id="flow-actor-${idx + 1}"><div class="flow-actor-icon">${idx + 1}</div><span>${esc(ac.label)}</span></div>`,
        )
        .join('')
      return `<div class="flow-animation" data-steps="${escAttr(JSON.stringify(stepsJson))}">
            <div class="flow-actors">
              ${actors}
            </div>
            <div class="flow-packet"></div>
            <div class="flow-step-label">点击“下一步”开始</div>
            <div class="flow-controls">
              <button class="btn flow-next-btn">下一步</button>
              <button class="btn flow-reset-btn">重新开始</button>
              <span class="flow-progress"></span>
            </div>
          </div>`
    }

    case 'keypoints': {
      const cards = block.items
        .map((it, i) => {
          const c = `var(--color-actor-${(i % 5) + 1})`
          return `<div class="pattern-card" style="border-top: 3px solid ${c}">
                <div class="pattern-icon" style="background: ${c}">${esc(it.icon ?? '✨')}</div>
                <h4 class="pattern-title">${esc(it.title)}</h4>
                <p class="pattern-desc">${esc(it.body)}</p>
              </div>`
        })
        .join('')
      return `<div class="pattern-cards">
            ${cards}
          </div>`
    }

    case 'steps': {
      const cards = block.items
        .map(
          (it, i) =>
            `<div class="step-card">
                <div class="step-num">${i + 1}</div>
                <div class="step-body">
                  <strong>${esc(it.title)}</strong>
                  <p>${esc(it.body)}</p>
                </div>
              </div>`,
        )
        .join('')
      return `<div class="step-cards">
            ${cards}
          </div>`
    }
  }
}
