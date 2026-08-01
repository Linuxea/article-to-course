import { useEffect, useState } from 'react'

export function PreviewFrame({ html }: { html: string }) {
  // Keyed by html length so React remounts on a new generation (fresh scroll state).
  return (
    <iframe
      title="预览"
      className="preview-frame"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-popups"
      key={html.length}
    />
  )
}

export function useMockInfo() {
  const [info, setInfo] = useState<{ mock: boolean; model: string } | null>(null)
  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => undefined)
  }, [])
  return info
}
