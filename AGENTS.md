# AGENTS.md — article-to-course

## 常用命令

- `npm run dev` — 开发：Vite(:5173) + Hono(:5173→:3000 代理)。无 API key 时自动 mock。
- `npm run build` — 构建前端(dist/) + 打包服务端(dist-server/index.mjs)
- `npm start` — 生产：`node dist-server/index.mjs`（托管 dist/ + /api）
- `npm test` — vitest 单测（schema + render）
- `npm run typecheck` — `tsc --noEmit`（strict + noUncheckedIndexedAccess）

## 关键约定

- LLM 只产出 JSON（见 `src/shared/schema.ts`），渲染器 `src/server/render.ts` 负责 JSON→HTML。
  改任何内容块类型时：同步改 schema、render、prompts 的 BLOCK_CATALOG 三处。
- `src/server/assets/{styles.css,main.js}` 是从外部 skill 复制的设计系统，**不要手改**；
  它们靠 class 名 + `data-*` 自初始化——渲染器必须严格按 `references/interactive-elements.md` 的 class 词表输出。
- 预览与导出共用同一段 HTML 字符串（`renderCourse` 的返回值），改动渲染逻辑两者同步生效。
- 前后端共享类型放 `src/shared/`，服务端用相对路径导入（esbuild/tsx 都能解析）。

## 环境变量见 `.env.example`（留空 LLM_API_KEY 即 mock 模式）。
