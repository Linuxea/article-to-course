import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { config } from './config'

const provider = createOpenAICompatible({
  name: 'llm',
  baseURL: config.llmBaseUrl,
  apiKey: config.llmApiKey,
})

/** Configured language model (DeepSeek / OpenAI / any OpenAI-compatible endpoint). */
export const model = provider.chatModel(config.llmModel)

/**
 * Per-call options shared by every `generateObject` invocation.
 * `abortSignal` is created fresh on each call so the timeout window restarts.
 */
export function generateObjectOptions() {
  return {
    model,
    temperature: 0.7,
    maxRetries: config.maxRetries,
    abortSignal: AbortSignal.timeout(config.requestTimeoutMs),
  }
}
