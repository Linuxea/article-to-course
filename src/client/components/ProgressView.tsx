import type { GenEvent } from '../sse'

export function ProgressView({ events }: { events: GenEvent[] }) {
  return (
    <div className="panel">
      <h1 className="panel-title">正在生成课程…</h1>
      <ul className="progress-list">
        {events.map((ev, i) => (
          <li key={i} className={`progress-item ${ev.type}`}>
            {label(ev)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function label(ev: GenEvent): string {
  switch (ev.type) {
    case 'outline':
      return '🧭 正在分析文章、规划课程大纲……'
    case 'section':
      return `✅ 第 ${ev.index}/${ev.total} 节完成：${ev.title}`
    case 'rendering':
      return '🎨 正在渲染可交互页面……'
    case 'error':
      return `❌ 出错了：${ev.message}`
    default:
      return ''
  }
}
