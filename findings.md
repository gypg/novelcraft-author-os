# 研究发现与技术调研

> 随 Phase 0 实施过程持续更新

---

## 2026-06-08: Sprint D Planning — UI Diagnostics / Redaction Hardening

### PR setup findings

- GitHub remote initially had `feature/author-os-knowledge-base` as default branch and no remote `main`, so `gh pr create --base main` failed with blank base/head sha.
- Pushing local `main` and setting GitHub default branch to `main` fixed PR creation.
- Sprint A/B/C PR is https://github.com/gypg/novelcraft-author-os/pull/1.

### Sprint D design decisions

- Start with a shared `knowledge-redaction.ts` helper so retrieval scoring, prompt serialization, and future UI diagnostics use the same direct-forbidden safety invariant.
- Keep Author Memory UI inside `/knowledge-base` rather than adding a top-level route.
- Expose Writer context diagnostics from module/application boundaries after `buildWritingContext`; `core` must not import `modules` stores.
- Use `bookId` / `chapterId` on diagnostics to detect stale right-panel output after navigation.

### Sprint D plan critique incorporated

- Added D0 contract lock to avoid accidentally replacing Sprint C's knowledge-item-backed Author Memory model with a separate versioned table model.
- Revised sequencing to safe projection / DTO contracts before React UI panels.
- Author Memory remains in the existing Knowledge Base / Author OS surface; no new route.
- Retrieval visualization requires a stable safe DTO with library/canonical/quote/redaction display fields, not only `{ id, score, scoreBreakdown }`.
- Context budget panel must handle no-run/stale diagnostics because `budgetReport` exists only after `buildWritingContext()` runs.

---
## 2026-06-08: Sprint C Research — Author Memory / Retrieval / Budget

### Existing repo patterns

- Author Profile already lives in `core/author-os` + `core/db/author-profile-repository.ts`, with browser fallback and Tauri IPC.
- Knowledge Base already has `knowledge_items` with `library_type: 'author' | 'project' | 'external'`, `canonical_level`, `quote_policy`, status, and browser fallback.
- Temporal Memory already has a small BM25 implementation in `core/temporal-memory/bm25.ts`; no external dependency is necessary for Sprint C retrieval.
- Context Builder currently injects outline, truth files, temporal facts, recent summaries, current tail, and default Author Profile, but lacks retrieval metadata and finer context layers.

### Reuse decision

- Build Sprint C using existing Knowledge Base tables rather than creating a new DB table immediately.
- Author Memory can be represented as confirmed `knowledge_items` where `library_type='author'` and `canonical_level='reference'`.
- Retrieval should rank `project > author > external` for authority while still surfacing author preferences and external inspiration as lower-priority context.
- No new npm package is needed for BM25/keyword retrieval.

### Claude/API relevance

- Project remains provider-agnostic via Vercel/OpenAI/Anthropic-compatible provider abstractions.
- Do not hardcode Claude SDK calls or Anthropic-only model parameters in Sprint C.
- Context budget should remain model-agnostic and rely on local token estimation unless future work explicitly adds provider token counting.

---

## 2026-05-07: 参考框架调研总结

### 可直接借鉴的 UI 布局

1. **novel-engine** — 三栏布局（Sidebar + Main + Right Panel），全挂载+隐藏切换，ChatModal 浮窗
2. **inkos Studio** — Sidebar 书架 + 主内容区 + 14 个页面
3. **蚁群 Playground** — Canvas 工作流图 + 聊天 + 追踪面板

### 技术兼容性发现

- **Tauri 2 + React**：成熟组合，文档完善
- **Drizzle ORM + SQLite**：Drizzle 支持 better-sqlite3，与 Tauri plugin-sql 需验证
- **shadcn/ui**：纯 React 组件，无 Node.js 依赖，Tauri 兼容无问题
- **Tiptap 2**：框架无关，React 集成有官方包 @tiptap/react

### 待验证

- [ ] Tauri 2 plugin-sql 的实际 API 是否与 Drizzle 的 SQLite adapter 兼容
- [ ] Vite + Tauri 2 的 HMR 配置
- [ ] Rust sidecar（Pandoc）在 Windows 上的打包方式
