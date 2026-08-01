export function InputForm({
  initial,
  busy,
  info,
  onSubmit,
}: {
  initial: string
  busy: boolean
  info: { mock: boolean; model: string } | null
  onSubmit: (text: string) => void
}) {
  return (
    <div className="panel">
      <h1 className="panel-title">把一篇文章变成可交互的教育网站</h1>
      <p className="panel-sub">
        粘贴文章全文，AI 会把它重新组织成带术语解释、测验、动画与通俗对照的单页课程。
      </p>
      <textarea
        className="article-input"
        placeholder="在这里粘贴文章全文……"
        defaultValue={initial}
        autoFocus
      />
      <div className="panel-actions">
        <span className="status">
          {info ? (info.mock ? `mock 模式（未接 LLM）` : `模型：${info.model}`) : '…'}
        </span>
        <button
          className="primary-btn"
          disabled={busy}
          onClick={() => {
            const ta = document.querySelector<HTMLTextAreaElement>('.article-input')
            onSubmit(ta?.value ?? '')
          }}
        >
          {busy ? '生成中…' : '生成课程'}
        </button>
      </div>
    </div>
  )
}
