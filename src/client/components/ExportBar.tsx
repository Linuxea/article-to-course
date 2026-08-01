export function ExportBar({ html, title, onRegenerate }: { html: string; title: string; onRegenerate: () => void }) {
  const download = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitize(title) || 'article-to-course'}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const openTab = () => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <div className="export-bar">
      <button className="ghost-btn" onClick={onRegenerate}>← 重新生成</button>
      <span className="export-title">{title}</span>
      <div className="spacer" />
      <button className="ghost-btn" onClick={openTab}>新标签页打开</button>
      <button className="primary-btn" onClick={download}>下载 HTML</button>
    </div>
  )
}

function sanitize(s: string): string {
  return s.replace(/[^\w\u4e00-\u9fa5-]+/g, '_').slice(0, 40)
}
