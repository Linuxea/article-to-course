// Load .env from cwd if present (Node ≥20.12). Does not override already-set env vars.
try {
  process.loadEnvFile()
} catch {
  // no .env file — rely on real environment variables
}

function num(name: string, fallback: number): number {
  const v = process.env[name]
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name]?.toLowerCase()
  if (v === undefined) return fallback
  return v === '1' || v === 'true' || v === 'yes'
}

export const config = {
  llmBaseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmModel: process.env.LLM_MODEL ?? 'deepseek-v4-flash',
  /** When true, send response_format json_object and instruct JSON-only output. */
  jsonMode: bool('LLM_JSON_MODE', true),
  /** When true (or when no API key is set), generate from a local mock instead of calling an LLM. */
  mock: bool('LLM_MOCK', false) || (process.env.LLM_API_KEY ?? '').length === 0,
  concurrency: num('CONCURRENCY', 3),
  requestTimeoutMs: num('LLM_TIMEOUT_MS', 120_000),
  maxRetries: num('LLM_MAX_RETRIES', 2),
  port: num('PORT', 3000),
} as const

export type AppConfig = typeof config
