import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { renderCourse } from '../src/server/render'
import { fixtureCourse } from '../test/fixtures'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../src/server/assets/styles.css'), 'utf8')
const js = readFileSync(resolve(here, '../src/server/assets/main.js'), 'utf8')
const html = renderCourse(fixtureCourse, { css, js })

mkdirSync(resolve(here, '../demo'), { recursive: true })
writeFileSync(resolve(here, '../demo/fixture.html'), html)
console.log(`wrote demo/fixture.html (${html.length} bytes)`)
