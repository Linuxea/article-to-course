import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { RenderAssets } from './render'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Read the design-system files fresh on every call. `renderCourse` runs once per
 * generation (not a hot path), and skipping the cache means editing styles.css /
 * main.js is picked up immediately under `tsx watch` (which only restarts on TS
 * changes, not on these read-at-runtime assets).
 */
export function loadAssets(): RenderAssets {
  const css = readFileSync(resolve(here, 'assets/styles.css'), 'utf8')
  const js = readFileSync(resolve(here, 'assets/main.js'), 'utf8')
  return { css, js }
}
