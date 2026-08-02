import type { GenEvent } from '../sse'

export function ProgressView({ events }: { events: GenEvent[] }) {
  return (
    <div className="panel">
      <h1 className="panel-title">正在生成课程…</h1>
      <p className="panel-sub">AI 正在阅读文章、规划大纲并逐章撰写内容，通常需要几十秒。</p>
      <ol className="stepper">
        {events.map((ev, i) => {
          const meta = stepMeta(ev)
          const isLast = i === events.length - 1
          const cls = ev.type === 'error' ? 'err' : isLast && ev.type !== 'done' ? 'current' : 'done-step'
          return (
            <li key={i} className={`step-item ${cls}`}>
              <span className="step-dot">{meta.icon}</span>
              <div className="step-body">
                <div className="step-label">{meta.label}</div>
                {meta.sub && <div className="step-sub">{meta.sub}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function stepMeta(ev: GenEvent): { icon: string; label: string; sub?: string } {
  switch (ev.type) {
    case 'outline':
      return { icon: '🧭', label: '分析文章，规划课程大纲', sub: '拆分章节、设计学习路径' }
    case 'section':
      return { icon: '✍️', label: `撰写章节 ${ev.index} / ${ev.total}`, sub: ev.title }
    case 'rendering':
      return { icon: '🎨', label: '渲染可交互页面', sub: '组装课程与交互组件' }
    case 'done':
      return { icon: '🎉', label: '完成' }
    case 'error':
      return { icon: '⚠️', label: '出错了', sub: ev.message }
  }
}
