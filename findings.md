# 研究发现与技术调研

> 随 Phase 0 实施过程持续更新

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
