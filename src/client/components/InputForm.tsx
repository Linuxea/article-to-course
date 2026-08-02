import { useState } from 'react'

const SAMPLE = `我们每天都在用浏览器上网，但很少有人想过：你在网上输入的密码、银行卡号，是怎么穿过千家万户的网线，安全抵达对面那台服务器的？

早期的 HTTP 协议就像寄明信片——内容完全暴露在外。你的数据会经过小区宽带箱、运营商机房、骨干网等十几个中转站，任何一个环节的人都能偷看甚至篡改。

HTTPS 的出现解决了这个问题。它在 HTTP 外面套了一层叫 TLS 的加密协议。建立连接时，浏览器和服务器会先进行一次"握手"：服务器出示由权威机构签发的数字证书，证明自己的身份；然后双方协商出一把只有彼此知道的对称密钥，后续所有通信都用这把钥匙加密。

这样一来，即使中间人截获了数据包，看到的也只是一堆乱码。加密保证了机密性，证书保证了对方不是冒牌货，而消息验证码则保证内容没被偷偷改过——这三者合在一起，构成了我们今天安全上网的基石。`

export function InputForm({
  initial,
  info,
  onSubmit,
}: {
  initial: string
  info: { mock: boolean; model: string } | null
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState(initial)
  return (
    <div className="panel">
      <span className="panel-eyebrow">✦ AI 课程生成器</span>
      <h1 className="panel-title">把一篇文章变成可交互的课程</h1>
      <p className="panel-sub">
        粘贴文章全文，AI 会把它重新组织成带术语解释、随堂测验、对话与流程动画、对比表格和架构图的单页交互课程。
      </p>
      <div className="input-wrap">
        <textarea
          className="article-input"
          placeholder="在这里粘贴文章全文……"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim()) onSubmit(text)
          }}
          autoFocus
        />
        <span className="char-count">{text.length} 字</span>
      </div>
      <div className="panel-actions">
        <span className="status">
          {info ? (info.mock ? `mock 模式（未接 LLM）` : `模型：${info.model}`) : '…'}
        </span>
        <button className="ghost-btn" onClick={() => setText(SAMPLE)}>
          填入示例文章
        </button>
        <span className="hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 生成
        </span>
        <button className="primary-btn" disabled={!text.trim()} onClick={() => onSubmit(text)}>
          生成课程 →
        </button>
      </div>
    </div>
  )
}
