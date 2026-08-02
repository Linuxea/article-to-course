# AGENTS.md

Notes for agents working in this repo. Complements `README.md` (which has the user-facing overview).

## Verification

There is **no lint script**. The pre-commit check is:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run (non-watch)
```

Run a single test file or test name:

```bash
npx vitest run test/render.test.ts
npx vitest run -t "accepts a valid fixture course"
```

Visual sanity check after touching rendering — writes `demo/fixture.html` (gitignored) from the test fixture:

```bash
npx tsx scripts/render-fixture.ts
```

## Dev / run

- `npm run dev` starts **two** processes via `concurrently`: Hono server on `:3000` and Vite on `:5173`. Vite proxies `/api` → `:3000`. Open `:5173` in dev.
- Production is single-port: `npm run build && npm start` serves built `dist/` + `/api` on `:3000` only.
- **Mock mode** auto-activates when `LLM_API_KEY` is empty (src/server/config.ts:25) — the full pipeline runs offline without an LLM. Set `LLM_MOCK=true` to force it.
- Requires Node ≥ 20.12 (uses `process.loadEnvFile()`).

## Architecture invariants

- **The Zod schema in `src/shared/schema.ts` is the contract** shared by client, server, and tests. The LLM emits only JSON that conforms to it; `generateObject` validates.
- **The LLM never produces HTML.** `src/server/render.ts` maps JSON → fixed class names + `data-*` attributes. The design system (`src/server/assets/{styles.css,main.js}`) scans those classes to self-init. Keep CSS/JS **zero-dependency** — they are inlined verbatim into every exported HTML.
- **Two-stage pipeline** (`src/server/generate.ts`): (1) outline, (2) per-section, run concurrently (`CONCURRENCY` env, default 3). Results stream to the client as SSE events from `POST /api/generate`. A failing section degrades to a single paragraph rather than failing the whole course (generate.ts:85).
- Path alias `@shared/*` → `src/shared/*`, configured in both `tsconfig.json` and `vite.config.ts`.

## Adding a new block type

Touch **all five**, or tests/renderer will be inconsistent:

1. `src/shared/schema.ts` — add the Zod schema + include in `BlockSchema` union
2. `src/server/render.ts` — add a `case` in `renderBlock`; update `collectStats` if it carries meaningful text
3. `src/server/prompts.ts` — document shape + constraints in `BLOCK_CATALOG`
4. `src/server/assets/{styles.css,main.js}` — styling and any init/interaction logic
5. `test/fixtures.ts` — exercise it so render/schema tests cover it

## Style / conventions

- `tsconfig.json` is strict: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`. Don't leave dead vars or skip switch defaults.
- **User-facing strings and LLM prompts are Chinese**; code, identifiers, and commit messages are English.
- Commit subject style: short imperative English (e.g. `Tune prompts for narrative-first output`).
