import { useEffect, useState } from 'react'

export function PreviewFrame({ html }: { html: string }) {
  // srcDoc updates reload the iframe on their own, so no remount key is needed.
  return (
    <iframe
      title="预览"
      className="preview-frame"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-popups"
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
