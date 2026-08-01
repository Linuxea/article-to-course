# article-to-course

把一篇**文章**变成**可视化、可交互、具备教育意义**的单页网站。

粘贴文章全文 → 后端用 LLM（OpenAI 兼容）自动分析、重新组织 → 生成带术语解释、测验、群聊/数据流动画、原文↔大白话对照的单页课程 → 应用内实时预览 + 一键导出**自包含 HTML**。

## 快速开始

```bash
npm install

# 方式 A：不配 LLM，直接用本地 mock 跑通整条链路（最快看到效果）
npm run dev          # 打开 http://localhost:5173

# 方式 B：接真实 LLM
cp .env.example .env # 填入 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
npm run dev
```

开发态：Vite(:5173，前端) + Hono(:3000，API)，Vite 自动把 `/api` 代理到 :3000。

## 生产构建与运行

```bash
npm run build   # 构建前端到 dist/，打包服务端到 dist-server/index.mjs
npm start       # 单进程：托管 dist/ + 提供 /api（http://localhost:3000）
```

## 配置（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容的 base URL（DeepSeek / OpenAI / Ollama / vLLM 等） |
| `LLM_API_KEY` | （空） | 留空则自动进入 mock 模式 |
| `LLM_MODEL` | `deepseek-v4-flash` | 模型名 |
| `LLM_JSON_MODE` | `true` | 是否用 `response_format: json_object`（部分 provider 不支持时关掉） |
| `LLM_MOCK` | `false` | 强制 mock（无 API key 时也会自动开启） |
| `CONCURRENCY` | `3` | 并发生成多少个 section |
| `PORT` | `3000` | 服务端口 |

## 工作原理

```
粘贴文章 ─▶ POST /api/generate (SSE)
          │
          ├─ 1) LLM 生成大纲（标题 / 主题色 / 3–6 节 + 每节 focus）
          ├─ 2) 并发为每节生成结构化 JSON（screen + blocks）
          ├─ 3) Zod 校验（失败回灌重试 1 次，再失败降级为段落）
          └─ 4) renderCourse() 把 JSON 映射成既定 class 名的 HTML，内联 styles.css + main.js
                ─▶ 预览(iframe srcdoc) 与 导出(Blob 下载) 共用同一段 HTML，零差异
```

**核心设计**：LLM 只产出结构化 JSON（`src/shared/schema.ts` 的 Course Schema），渲染器（`src/server/render.ts`）把 JSON 映射成既定的 class 名 + `data-*` 属性。LLM 不碰 HTML/class，避免写错；样式与交互引擎（`src/server/assets/{styles.css,main.js}`）扫描 class 名自初始化。

支持的内容块：`paragraph`(含术语 tooltip)、`callout`、`translation`(原文↔通俗)、`quiz`、`chat`(群聊动画)、`flow`(数据流动画)、`keypoints`(要点卡片)、`steps`(编号步骤)。

## 主要文件

- `src/shared/schema.ts` — Zod Course Schema（前后端共享契约）
- `src/server/render.ts` — Course → 自包含 HTML
- `src/server/generate.ts` — 大纲 + 并发分节编排（SSE 事件流）
- `src/server/llm.ts` — OpenAI 兼容客户端（JSON mode + 重试退避）
- `src/server/prompts.ts` — 大纲/分节提示词与输出 schema
- `src/server/assets/{styles.css,main.js}` — 复用的设计系统（零依赖，内联进输出）
- `src/client/` — React 前端（粘贴 / 进度 / 预览 / 导出）

## 测试

```bash
npm test        # vitest：schema 校验 + render 快照式断言
npm run typecheck
```

`npx tsx scripts/render-fixture.ts` 可用一份示例 Course 渲染出 `demo/fixture.html` 供肉眼检查。

## 已知限制 / 后续

- 超长文章当前会把全文传给每个分节调用（典型文章无碍；超长可考虑大纲阶段分配片段）。
- "图表类"可视化用 flow/chat 覆盖流程与结构；真正的柱状/折线图属后续（可内联轻量 SVG）。
