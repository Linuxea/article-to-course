import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { config } from './config'

const provider = createOpenAICompatible({
  name: 'llm',
  baseURL: config.llmBaseUrl,
  apiKey: config.llmApiKey,
  // Only advertise json_schema support when the endpoint actually provides it
  // (LLM_STRUCTURED_OUTPUT=true). Otherwise the SDK downgrades to json_object,
  // which some providers (DeepSeek) answer with empty content.
  supportsStructuredOutputs: config.structuredOutput,
})

/** Configured language model (DeepSeek / OpenAI / any OpenAI-compatible endpoint). */
export const model = provider.chatModel(config.llmModel)

/**
 * Combine several abort signals into one. Uses listener composition so it works
 * without `AbortSignal.any` (typed only since TS lib ES2024). Returns the already-
 * aborted signal if any input is aborted; returns undefined when no signal is given.
 */
export function anySignal(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const live: AbortSignal[] = []
  for (const s of signals) {
    if (!s) continue
    if (s.aborted) return s
    live.push(s)
  }
  if (live.length === 0) return undefined
  const controller = new AbortController()
  const onAbort = (src: AbortSignal) => {
    controller.abort((src as { reason?: unknown }).reason)
    for (const s of live) s.removeEventListener('abort', onAbortCb)
  }
  const onAbortCb = () => onAbort(live.find((s) => s.aborted) ?? live[0]!)
  for (const s of live) s.addEventListener('abort', onAbortCb, { once: true })
  return controller.signal
}

/**
 * Per-call options shared by every `generateObject` invocation.
 * Pass the request's `AbortSignal` so a client disconnect cancels the in-flight
 * call instead of burning the full timeout budget.
 */
export function generateObjectOptions(requestSignal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(config.requestTimeoutMs)
  const abortSignal = anySignal([timeoutSignal, requestSignal]) ?? timeoutSignal
  return {
    model,
    temperature: 0.7,
    maxOutputTokens: config.maxOutputTokens,
    maxRetries: config.maxRetries,
    abortSignal,
  }
}
