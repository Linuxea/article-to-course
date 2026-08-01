import { config } from './config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Extract the first balanced JSON object from a model response (handles code fences / prose). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response')
  }
  return candidate.slice(start, end + 1)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function chatOnce(messages: ChatMessage[]): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.llmModel,
    messages,
    temperature: 0.7,
  }
  if (config.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(`${config.llmBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`) as Error & {
      status?: number
    }
    err.status = res.status
    throw err
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM returned an empty response')
  return content
}

/**
 * Call an OpenAI-compatible chat endpoint and return parsed JSON.
 * Retries with exponential backoff on transient failures (network, 429, 5xx).
 */
export async function chatJson<T>(messages: ChatMessage[]): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const content = await chatOnce(messages)
      return JSON.parse(extractJson(content)) as T
    } catch (err) {
      lastErr = err
      const status = (err as { status?: number }).status
      const transient =
        err instanceof TypeError || // network / fetch failure
        status === 429 ||
        (typeof status === 'number' && status >= 500)
      if (!transient || attempt === config.maxRetries) break
      await sleep(800 * 2 ** attempt + Math.random() * 200)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('LLM call failed')
}
