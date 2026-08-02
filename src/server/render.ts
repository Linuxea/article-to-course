import { ACCENTS, type Accent, type Block, type Course, type Section, type Screen } from '../shared/schema'

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
const INTERACTIVE_TYPES = new Set(['quiz', 'chat', 'flow', 'arch'])

interface Stats {
  interactive: number
  terms: number
  minutes: number
}

function collectStats(course: Course): Stats {
  let interactive = 0
  let terms = 0
  let chars = 0
  for (const section of course.sections) {
    for (const screen of section.screens) {
      for (const b of screen.blocks) {
        if (INTERACTIVE_TYPES.has(b.type)) interactive++
        switch (b.type) {
          case 'paragraph':
            for (const seg of b.segments) {
              chars += seg.text.length
              if (seg.type === 'term') terms++
            }
            break
          case 'callout':
            chars += b.body.length + (b.title?.length ?? 0)
            break
          case 'translation':
            chars += b.original.join('').length + b.plain.join('').length
            break
          case 'quiz':
            chars += b.question.length + b.options.reduce((n, o) => n + o.text.length, 0)
            break
          case 'chat':
            chars += b.messages.reduce((n, m) => n + m.text.length, 0)
            break
          case 'flow':
            chars += b.steps.reduce((n, s) => n + s.label.length, 0)
            break
          case 'keypoints':
          case 'steps':
            chars += b.items.reduce((n, it) => n + it.title.length + it.body.length, 0)
            break
          case 'table':
            chars += b.columns.join('').length + b.rows.flat().join('').length
            break
          case 'arch':
            chars += b.nodes.reduce((n, nd) => n + nd.label.length + nd.desc.length, 0)
            break
          default: {
            const _exhaustive: never = b
            throw new Error(`unknown block type: ${JSON.stringify(_exhaustive)}`)
          }
        }
      }
    }
  }
  return { interactive, terms, minutes: Math.max(1, Math.round(chars / 350)) }
}

export function renderCourse(course: Course, assets: RenderAssets): string {
  const accent: Accent = course.accent
  const a = ACCENTS[accent]
  const stats = collectStats(course)

  const tocLinks = course.sections
    .map(
      (s, i) =>
        `        <li><a class="toc-link" href="#ch-${i + 1}" data-chapter="ch-${i + 1}"><span class="toc-num">${String(i + 1).padStart(2, '0')}</span><span class="toc-text">${esc(s.title)}</span></a></li>`,
    )
    .join('\n')

  const chapters = course.sections.map((s, i) => renderChapter(s, i)).join('\n')

  const objectives = course.objectives?.length
    ? `      <div class="objectives reveal">
        <div class="objectives-label">你将学到</div>
        <div class="objectives-grid">
          ${course.objectives.map((o) => `<div class="objective-card"><span class="objective-check">✓</span><span>${esc(o)}</span></div>`).join('\n          ')}
        </div>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'">
  <title>${esc(course.title)}</title>
  <noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
${assets.css}
    :root {
      --accent: ${a.color};
      --accent-hover: ${a.hover};
      --accent-soft: ${a.light};
      --accent-muted: ${a.muted};
    }
  </style>
</head>
<body>
  <nav class="topnav">
    <div class="topnav-inner">
      <span class="topnav-badge">✦</span>
      <span class="topnav-title">${esc(course.title)}</span>
    </div>
    <div class="progress-track"><div class="progress-bar" id="progressBar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div>
  </nav>

  <div class="layout">
    <aside class="toc">
      <div class="toc-label">课程目录</div>
      <ol class="toc-list">
${tocLinks}
      </ol>
    </aside>

    <main class="content">
      <header class="hero">
        <span class="hero-badge">✦ 交互式课程</span>
        <h1 class="hero-title">${esc(course.title)}</h1>
        ${course.subtitle ? `<p class="hero-sub">${esc(course.subtitle)}</p>` : ''}
        <div class="hero-meta">
          <span class="meta-chip">📚 ${course.sections.length} 个章节</span>
          <span class="meta-chip">🎮 ${stats.interactive} 个互动</span>
          <span class="meta-chip">🔖 ${stats.terms} 个术语</span>
          <span class="meta-chip">⏱ 约 ${stats.minutes} 分钟</span>
        </div>
      </header>

${objectives}

${chapters}

      <footer class="endnote reveal">
        <div class="endnote-emoji">🎉</div>
        <p class="endnote-title">课程结束，恭喜学完！</p>
        <p class="endnote-sub">本页面由「文章 → 交互课程」自动生成</p>
      </footer>
    </main>
  </div>

  <script>
${assets.js}
  </script>
</body>
</html>`
}

function renderChapter(section: Section, index: number): string {
  const number = String(index + 1).padStart(2, '0')
  const screens = section.screens.map((s) => renderScreen(s)).join('\n')
  const takeaways = section.takeaways?.length
    ? `      <div class="takeaways reveal">
        <div class="takeaways-label">📌 本节小结</div>
        <ul class="takeaways-list">
          ${section.takeaways.map((t) => `<li>${esc(t)}</li>`).join('\n          ')}
        </ul>
      </div>`
    : ''
  return `      <section class="chapter" id="ch-${index + 1}">
        <header class="chapter-head reveal">
          <span class="chapter-num">${number}</span>
          <div class="chapter-headings">
            <h2 class="chapter-title">${esc(section.title)}</h2>
            ${section.subtitle ? `<p class="chapter-sub">${esc(section.subtitle)}</p>` : ''}
          </div>
        </header>
${screens}
${takeaways}
      </section>`
}

function renderScreen(screen: Screen): string {
  const heading = screen.heading ? `        <h3 class="screen-heading reveal">${esc(screen.heading)}</h3>` : ''
  const blocks = screen.blocks.map((b) => renderBlock(b)).join('\n')
  return `${heading}
${blocks}`
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'paragraph':
      return `        <p class="prose reveal">${block.segments
        .map((seg) =>
          seg.type === 'term'
            ? `<span class="term" data-definition="${escAttr(seg.definition)}">${esc(seg.text)}</span>`
            : esc(seg.text),
        )
        .join('')}</p>`

    case 'callout': {
      const icon = block.icon ?? CALLOUT_DEFAULT_ICON[block.variant]
      const title = block.title ? `<strong class="callout-title">${esc(block.title)}</strong>` : ''
      return `        <div class="callout callout--${block.variant} reveal">
          <div class="callout-icon">${esc(icon)}</div>
          <div class="callout-body">${title}<p>${esc(block.body)}</p></div>
        </div>`
    }

    case 'translation': {
      const left = block.original.map((l) => esc(l)).join('\n')
      const right = block.plain.map((p) => `<p>${esc(p)}</p>`).join('')
      return `        <div class="xl-block reveal">
          <div class="xl-pane xl-pane--src">
            <span class="xl-label">${esc(block.leftLabel ?? '原文')}</span>
            <pre><code>${left}</code></pre>
          </div>
          <div class="xl-arrow" aria-hidden="true">→</div>
          <div class="xl-pane xl-pane--plain">
            <span class="xl-label">${esc(block.rightLabel ?? '通俗解释')}</span>
            <div class="xl-lines">${right}</div>
          </div>
        </div>`
    }

    case 'quiz': {
      const options = block.options
        .map(
          (o) =>
            `<button class="quiz-opt" data-value="${escAttr(o.value)}"><span class="quiz-radio"></span><span class="quiz-opt-text">${esc(o.text)}</span></button>`,
        )
        .join('\n            ')
      return `        <div class="quiz reveal" data-correct="${escAttr(block.correct)}" data-right="${escAttr(block.explanationRight)}" data-wrong="${escAttr(block.explanationWrong)}">
          <div class="quiz-tag">✅ 随堂测验</div>
          <p class="quiz-q">${esc(block.question)}</p>
          <div class="quiz-opts">
            ${options}
          </div>
          <div class="quiz-foot">
            <button class="btn btn--primary quiz-check">检查答案</button>
            <button class="btn quiz-reset" hidden>再试一次</button>
          </div>
          <div class="quiz-fb" role="status"></div>
        </div>`
    }

    case 'chat': {
      const actorById = new Map(block.actors.map((ac) => [ac.id, ac]))
      const messages = block.messages
        .map((m) => {
          const actor = actorById.get(m.actorId)
          const colorVar = actor ? `var(--actor-${actor.colorIndex})` : 'var(--accent)'
          const rawName = actor ? actor.name : m.actorId
          const initial = Array.from(rawName)[0] ?? '?'
          return `<div class="chat-msg" data-ava="${escAttr(initial)}" data-who="${escAttr(rawName)}" hidden>
              <div class="chat-ava" style="background:${colorVar}">${esc(initial)}</div>
              <div class="chat-bub"><span class="chat-who" style="color:${colorVar}">${esc(rawName)}</span><p>${esc(m.text)}</p></div>
            </div>`
        })
        .join('\n            ')
      return `        <div class="chat reveal">
          <div class="chat-body">
            ${messages}
            <div class="chat-typing" hidden><div class="chat-ava">?</div><div class="chat-dots"><span></span><span></span><span></span></div></div>
          </div>
          <div class="chat-bar">
            <button class="btn btn--primary chat-next">下一条</button>
            <button class="btn chat-all">全部播放</button>
            <button class="btn chat-replay" hidden>重播</button>
            <span class="chat-count"></span>
          </div>
        </div>`
    }

    case 'flow': {
      const stepsJson = block.steps.map((s) => ({
        from: `actor-${s.from}`,
        to: `actor-${s.to}`,
        label: s.label,
        packet: s.packet,
      }))
      const actors = block.actors
        .map(
          (ac, idx) =>
            `<div class="flow-actor" data-actor="actor-${idx + 1}"><div class="flow-ava">${idx + 1}</div><span class="flow-actor-label">${esc(ac.label)}</span></div>`,
        )
        .join('\n            ')
      return `        <div class="flow reveal" data-steps="${escAttr(JSON.stringify(stepsJson))}">
          <div class="flow-actors">
            ${actors}
            <div class="flow-packet" hidden></div>
          </div>
          <div class="flow-label">点击「下一步」开始演示</div>
          <div class="flow-bar">
            <button class="btn btn--primary flow-next">下一步</button>
            <button class="btn flow-replay" hidden>重新开始</button>
            <span class="flow-count"></span>
          </div>
        </div>`
    }

    case 'keypoints': {
      const cards = block.items
        .map((it, i) => {
          const c = `var(--actor-${(i % 5) + 1})`
          return `<div class="kp-card" style="--kp:${c}">
            <div class="kp-ico" style="background:${c}">${esc(it.icon ?? '✨')}</div>
            <h4 class="kp-title">${esc(it.title)}</h4>
            <p class="kp-desc">${esc(it.body)}</p>
          </div>`
        })
        .join('\n          ')
      return `        <div class="kp-grid reveal">
          ${cards}
        </div>`
    }

    case 'steps': {
      const items = block.items
        .map(
          (it, i) =>
            `<li class="step">
            <span class="step-n">${i + 1}</span>
            <div class="step-txt"><strong>${esc(it.title)}</strong><p>${esc(it.body)}</p></div>
          </li>`,
        )
        .join('\n          ')
      return `        <ol class="steps reveal">
          ${items}
        </ol>`
    }

    case 'table': {
      const head = block.columns.map((c) => `<th>${esc(c)}</th>`).join('')
      const body = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
        .join('\n            ')
      const caption = block.caption ? `<figcaption class="tbl-caption">${esc(block.caption)}</figcaption>` : ''
      return `        <figure class="tbl reveal">
          ${caption}
          <div class="tbl-scroll">
            <table>
              <thead><tr>${head}</tr></thead>
              <tbody>
            ${body}
              </tbody>
            </table>
          </div>
        </figure>`
    }

    case 'arch': {
      const nodes = block.nodes
        .map(
          (n) =>
            `<button class="arch-node" data-label="${escAttr(n.label)}" data-desc="${escAttr(n.desc)}">
              <span class="arch-ico">${esc(n.icon ?? '🧩')}</span>
              <span class="arch-name">${esc(n.label)}</span>
            </button>`,
        )
        .join('\n            ')
      return `        <div class="arch reveal">
          <div class="arch-nodes">
            ${nodes}
          </div>
          <div class="arch-detail">
            <div class="arch-detail-title">👆 点击任意组件</div>
            <p class="arch-detail-desc">查看它在整体中扮演什么角色。</p>
          </div>
        </div>`
    }

    default: {
      const _exhaustive: never = block
      throw new Error(`unknown block type: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
