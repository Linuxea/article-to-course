import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { RenderAssets } from './render'

const here = dirname(fileURLToPath(import.meta.url))

let cached: RenderAssets | null = null

export function loadAssets(): RenderAssets {
  if (cached) return cached
  const css = readFileSync(resolve(here, 'assets/styles.css'), 'utf8')
  const js = readFileSync(resolve(here, 'assets/main.js'), 'utf8')
  cached = { css, js }
  return cached
}
