# 会话进度日志

---

## 2026-05-14 — 会话 11（专业收尾：ESLint 清零 + 安全兜底硬化 + 文档同步）

### 完成

#### A. ProviderHealthBadge ESLint warning 清零
- [x] `src/shared/components/ProviderHealthBadge.tsx`：useEffect 依赖数组前加 `eslint-disable-next-line react-hooks/exhaustive-deps` + 4 行注释解释为何不依赖整个 `provider` 对象（避免无限循环）
- 结果：**ESLint 现在 0 errors 0 warnings**（之前 1 warning）

#### B. Keychain 失败兜底从"明文落库"改为"硬错误"
- [x] **专业判断**：原兜底逻辑（keychain 写入失败 → 把 plaintext 写 DB）是相对旧版 AES-GCM 加密的**安全退化**，悄悄降级不可接受
- [x] `create_llm_provider`：keychain 失败时返回明确错误，提示用户配置系统凭据管理服务（Windows Credential Manager / macOS Keychain / Linux gnome-keyring/kwallet）
- [x] `update_llm_provider`：同上策略，绝不静默回退
- [x] 这是个有意识的权衡：极少数无 keychain 后端的 Linux 用户会被阻塞，但换来"DB 不出现明文 API Key"的安全底线

#### C. CODE_WIKI 文档同步
- [x] **4.1 providers.ts** 章节：删除"XOR 加密"描述，补充 OS keychain + 哨兵机制；预设数量 35+ → 68
- [x] 新增 **4.1 secret.rs 章节**（前端层映射）
- [x] **8.3 LLM 模块** 章节：CRUD 表格补充哨兵机制；call_llm 段补 Gemini 协议描述
- [x] 新增 **8.4 凭据存储模块（secret.rs）** 章节
- [x] **8.5 日志模块** / **8.6 Rust 依赖** 章节号顺延
- [x] 8.6 依赖表新增 `keyring = 3` 条目

### 决策记录
对"Linux 无 Secret Service 时加密文件兜底"项的判断：**不做**。
- 成本：60+ 分钟（aes-gcm + rand 依赖、文件格式、权限处理、跨平台测试）
- 价值：覆盖一个对桌面端来说几乎不存在的用户场景（用户在 Windows 11）
- 反而把当前 bug（明文兜底）改成"硬错误"是性价比更高的处理

### 修改文件清单
- `novel-app/src/shared/components/ProviderHealthBadge.tsx` — eslint-disable + 解释注释
- `novel-app/src-tauri/src/llm.rs` — 2 处 keychain 兜底硬化
- `CODE_WIKI.md` — 4.1 / 8.3 / 新增 8.4 / 8.5-8.6 重编号 / 依赖表
- `progress.md` — 本会话记录

### 验证
- `cargo check` ✅
- `npx tsc -b --noEmit` ✅
- `vitest run` ✅ 120/120
- `npm run lint` ✅ **0 errors, 0 warnings**（彻底清零）

---

## 2026-05-14 — 会话 10（Provider UI 搜索 + OS keychain 集成）

### 完成

#### A. Provider 预设搜索 + 分组折叠（68 个按钮可用性改进）
- [x] **搜索框**：实时按 label / type / apiFormat 过滤，附计数（"N/68"）
- [x] **分组折叠**：「直连 API」「Token 计划」两组各自可折叠（搜索时强制展开）
- [x] **当前选中提示**：表单顶部显示选中 preset 的 icon/label/协议格式
- [x] **零结果提示**：搜索无匹配时显示引导文案
- [x] 修改文件：`src/modules/theme/SettingsPage.tsx`（ProviderForm 组件内）

#### B. OS Keychain 集成（API Key 安全升级）
- [x] **Cargo 依赖**：`keyring = "3"` 启用 apple-native / windows-native / linux-native 后端
- [x] **新模块 `src-tauri/src/secret.rs`**：
  - 3 个公开函数：`store(id, secret)` / `load(id)` / `delete(id)`
  - 3 个 Tauri 命令：`set_provider_secret` / `get_provider_secret` / `delete_provider_secret`
  - 常量 `KEYCHAIN_SENTINEL = "<keychain>"` 作 DB 哨兵
- [x] **`llm.rs` 改造**：
  - `create_llm_provider`：明文 → keychain 存储，DB 列存哨兵；keychain 失败时回退到 DB 存值
  - `list_llm_providers`：返回前哨兵 → keychain plaintext 替换
  - `update_llm_provider`：api_key 字段变更时同步写 keychain
  - `delete_llm_provider`：删除 DB 行 + 同步删 keychain（幂等）
  - `call_llm`：调用前哨兵 → plaintext 解析
- [x] **`lib.rs`**：注册 `mod secret` + 3 个新命令到 invoke_handler
- [x] **前端 `providers.ts`**：
  - Tauri 模式：不再前端加密，明文经 IPC 交给 Rust 处理
  - 浏览器模式：保留 AES-GCM + localStorage（开发时用）
  - 兼容老数据：listProviders 检测 AES-GCM Base64 格式，对老数据沿用 decryptApiKey
- [x] **平台后端**（自动）：Windows Credential Manager / macOS Keychain / Linux Secret Service

### 安全改进
- 旧：硬编码 passphrase + salt 派生 AES-GCM 密钥，加密结果存 DB，任何拿到构建产物或 DB 文件的人可解密
- 新：API Key 存 OS 受保护凭据存储（Windows 用 DPAPI、macOS 用 Keychain、Linux 用 Secret Service），DB 只存哨兵；攻击者拿到 DB 文件也无法直接获取 API Key

### 兼容性
- 已存在的 AES-GCM 加密 provider 数据：listProviders 仍能解密展示，用户下次编辑保存即自动迁入 keychain
- keychain 不可用时（如某些 Linux 无 Secret Service）：自动回退到 DB 存值，不阻塞使用

### 修改文件清单
- `novel-app/src-tauri/Cargo.toml` — 新增 keyring 3 依赖
- `novel-app/src-tauri/src/secret.rs` — 新建（OS keychain 封装）
- `novel-app/src-tauri/src/lib.rs` — 注册 secret 模块和命令
- `novel-app/src-tauri/src/llm.rs` — 5 处方法接入 keychain
- `novel-app/src/core/ai-engine/providers.ts` — 移除 Tauri 模式前端加密，添加哨兵兼容
- `novel-app/src/modules/theme/SettingsPage.tsx` — ProviderForm 搜索 + 折叠
- `progress.md` — 本会话记录

### 验证
- `cargo check` ✅（新增 keyring v3.6.3 编译成功）
- `npx tsc -b --noEmit` ✅
- `vitest run` ✅ 120/120
- `npm run lint` ✅ 0 errors, 1 已知 warning

### 仍未做
- 🟢 ProviderHealthBadge useEffect 警告显式化
- 🟢 关联文档（CODE_WIKI.md）的 Provider Auth 章节同步更新
- 🟢 Linux 无 Secret Service 时的兜底：当前仅 stderr warn + DB 存值，可考虑加 random-key 加密文件兜底

---

## 2026-05-14 — 会话 9（Bug 修复 + Rust LLM 多协议支持 + 文档清理）

### 完成

#### A. 紧急 Bug 修复（3 个 TS 编译错误 + 1 个深层 Rust bug）
- [x] **auto-pilot.ts:160-163** — `disk` 可能为 null（浏览器模式），改为 `if (disk && !disk.sufficient)`，null 时跳过磁盘检查
- [x] **SettingsPage.tsx:529** — `testProvider` 返回 `string | { ok:false; msg:string }` 联合类型，用 `typeof result === 'string'` narrow
- [x] **db.rs update_book** — 同时存在两个 bug：① handover 提到的缺少 genre/tags 字段更新；② **更严重的参数顺序错位**：`sets = ["updated_at = ?", ...]` 起步但 `values = []` 起步，导致 `now` 被 push 到最后变成 `WHERE id = <timestamp>`，永远不匹配。一并修复：`values` 起始就放 `now`，并补齐 genre/tags 处理

#### B. Rust LLM 后端扩展（支持全部 68 种 Provider）
- [x] **新增 `api_format` 列**到 `llm_providers` 表（'openai' | 'anthropic' | 'gemini'），通过 `ALTER TABLE ... ADD COLUMN` 兼容已有库
- [x] **`resolve_api_format` helper**：优先用传入值，缺失时按 provider_type 兜底推断（66 种默认 openai 兼容）
- [x] **test_llm_provider / call_llm / fetch_models 重构**：从 `match provider_type` 改为 `match resolve_api_format(...)`，覆盖 anthropic / gemini / openai 三大分支
- [x] **新增 Gemini 协议支持**：
  - 测试连接：`POST /v1beta/models/{model}:generateContent`
  - 流式调用：`POST /v1beta/models/{model}:streamGenerateContent?alt=sse`，OpenAI messages → Gemini contents 自动转换，system 消息映射到 `systemInstruction`
  - 模型列表：`GET /v1beta/models`，剥离 `models/` 前缀
- [x] **前端 providers.ts**：`LlmProviderRow` / `CreateProviderInput` / `UpdateProviderInput` 增加 `api_format` 字段；`resolveApiFormat()` 工具函数从 preset 自动注入；`updateProvider` 切换 provider_type 时自动重算 api_format

#### C. 过时文档清理
- [x] 删除 `task_plan.md`（Phase 2A 已完成，无当前 Phase 计划）
- [x] 更新 `CODE_WIKI.md` Section 13 开发阶段表（Phase 0-7 全部 ✅）
- [x] 更新 `CLAUDE.md` 每次对话必读列表（移除 task_plan.md 引用、补充 CODE_WIKI.md、重新编号）

### 修改文件清单
- `novel-app/src/core/scheduler/auto-pilot.ts` — disk 空值守卫
- `novel-app/src/modules/theme/SettingsPage.tsx` — testProvider 返回值类型 narrow
- `novel-app/src-tauri/src/db.rs` — update_book 参数顺序修复 + genre/tags 补齐
- `novel-app/src-tauri/src/llm.rs` — api_format 列 + 3 函数按协议分支 + Gemini 支持
- `novel-app/src/core/ai-engine/providers.ts` — api_format 字段 + preset 自动注入
- `CODE_WIKI.md` — Section 13 阶段状态更新
- `CLAUDE.md` — 必读文档列表更新
- `task_plan.md` — 已删除

### 验证
- `npx tsc -b --noEmit` ✅ 通过
- `cargo check` ✅ 通过
- `vitest run` ✅ 120/120
- `npm run lint` ✅ 0 errors, 1 warning（ProviderHealthBadge 已知警告，有意为之）

### 下一步候选
- 🟢 API Key 加密 passphrase 硬编码 → 移至 Rust keychain
- 🟢 Provider 预设 UI 68 个按钮 → 分页/搜索/折叠
- 🟢 ProviderHealthBadge useEffect 警告显式化（useMemo 包裹或加 disable 注释）

---

## 2026-05-08 — 会话 8（接线修复 + 上下文增强）

### 完成
- [x] **导航状态断裂修复**：useBookshelfStore 改为 persist 模式，sidebar 点击写入 store，所有页面统一从 store 读取 selectedBookId
- [x] **审计报告接线**：workflow-engine 发出 `pipeline:status` + `pipeline:report:ready` 事件，RightPanel 监听并更新 audit-store → AuditReportPanel 实际显示审计结果
- [x] **时序记忆接线**：ai-continue 写完后自动调用 `runObserve` 提取事实存入 temporal_facts → Timeline/Knowledge Graph 页面有真实数据
- [x] **编辑器斜杠命令接线**：新增 `/audit /revise /plan /run` 4 个斜杠命令，通过 window event → EditorPage → Coordinator Agent 执行
- [x] **上下文增强**：context-builder 现在注入真相文件（character_matrix/current_state/summaries/emotional_arcs）+ 时序记忆 → AI 续写质量提升
- [x] **死代码清理**：移除 better-sqlite3、drizzle-orm、drizzle-kit、@types/better-sqlite3 无用依赖
- [x] **AutoPilot store 同步**：AutoPilotPage 自动将 selectedBookId 同步到 auto-pilot singleton

### 修改文件清单
- `novel-app/src/modules/bookshelf/store.ts` — 添加 persist 中间件 + selectedBookTitle
- `novel-app/src/app/components/Sidebar.tsx` — 点击书籍时调用 selectBook
- `novel-app/src/modules/editor/EditorPage.tsx` — 移除 cleanup + 添加 slash command 事件监听 + coordinator 调用
- `novel-app/src/modules/analytics/AnalyticsPage.tsx` — 改为从 store 读取 bookId
- `novel-app/src/modules/auto-pilot/AutoPilotPage.tsx` — 同步 selectedBookId 到 auto-pilot
- `novel-app/src/core/scheduler/auto-pilot.ts` — 新增 setBookId 方法
- `novel-app/src/core/ai-engine/workflow-engine/index.ts` — 新增 pipeline:status + pipeline:report:ready 事件
- `novel-app/src/app/components/RightPanel.tsx` — 监听 pipeline 事件更新 audit-store
- `novel-app/src/core/events/types.ts` — 新增事件类型定义
- `novel-app/src/modules/editor/menu-items/ai-continue.ts` — 写完后调用 runObserve
- `novel-app/src/modules/editor/slash-commands/registry.ts` — 新增 /audit /revise /plan /run 命令
- `novel-app/src/core/ai-engine/context-builder.ts` — 注入真相文件 + 时序记忆到上下文
- `novel-app/package.json` — 移除 better-sqlite3 / drizzle 无用依赖

### 下一步
- Phase 8: UI 打磨 + 端到端验证 + 真相文件 UI 编辑器完善

---

## 2026-05-07 — 会话 1

### 完成
- [x] 旧项目备份到 废弃2.0/
- [x] 创建 CLAUDE.md（项目指令，每次对话自动加载）
- [x] 创建 SKILLS_REFERENCE.md（250 个 skill 分类参考）
- [x] 收集需求（交互式问答：定位、技术栈、AI 架构、模块、UI）
- [x] 编写 PRD v3.0
- [x] 6 个 agent 并行深读 25+ 参考项目
- [x] 创建 REFERENCE_ANALYSIS.md（参考框架深度分析）
- [x] 重写 PRD v4.0（融合参考项目发现）
- [x] 审阅 PRD → 重排开发计划 + 补充容错/审计维度 → PRD v4.1
- [x] 创建 task_plan.md / findings.md / progress.md

### 进行中
- [x] Phase 0: UI Shell 骨架搭建 ✅ (2026-05-07)
- [x] Phase 1: 书库 + 编辑器 + 真相文件 ✅ (2026-05-07)
- [x] Phase 2A: AI 辅助最小可用（进行中）
  - [x] Step 1: LLM Provider 配置（Rust call_llm + Settings UI）
  - [x] Step 2: 单 Agent 续写（右键菜单 + SSE 流式 + 编辑器插入 + 停止生成）
  - [x] Step 3: 大纲视图（树形编辑 + 章节关联 + AI 联动 + Markdown 导出）
  - [x] Step 4: 去 AI 味 Prompt（style-guard.ts + 50 禁用句式 + 16 词汇疲劳表 + 风格红线）

### 文档更新 (2026-05-08)
- [x] PRD v5.2（融入叙事约束系统、防幻觉机制、写法引擎、Diff 审查、上下文预算）
- [x] REFERENCE_ANALYSIS.md（合并 V1+V2，17 个小说框架 + 6 个工具框架）
- [x] DEVELOPER_GUIDE.md（25 个项目的组件级 UI/功能分布/系统流程/代码路径速查）
- [x] 内置日志系统（Rust Logger + 前端 logger + JSONL 文件）
- [x] 修复 React StrictMode 导致的 editorInstance 丢失（改用 ref）
- [x] 修复右键菜单被浏览器默认菜单覆盖（全局 preventDefault）
- [x] 添加 AI 续写按钮到编辑器头部（不依赖右键菜单）
- [x] 修复顶栏/侧边栏不同步（从 store 读取当前书名和书籍列表）

### 当前状态（2026-05-08 更新）
- Phase 2A 功能代码已完成，核心链路已验证：
  - ✅ 书架页面：卡片显示、创建/删除书籍
  - ✅ 编辑器：章节加载、内容显示、自动保存、字数统计
  - ✅ AI 续写：Provider 自动选择、LLM 调用、日志记录
  - ✅ 右侧面板：大纲/审计/上下文 tabs
  - ✅ UI 改善：卡片样式、侧边栏图标、间距优化
- 下一步：继续 UI 打磨 + 功能完善

---

## 2026-05-07 — 会话 2（Phase 2B）

### 完成
- [x] Phase 2B: 编辑器专业打磨 ✅ (2026-05-07)
  - [x] SceneBreak 场景分隔符 Node（输入 `---` 或 `/scene` 插入）
  - [x] DialogueHighlight 对话高亮 Mark（`Ctrl+Shift+D` 或 `/dialogue` 切换）
  - [x] 斜杠命令菜单（`/` 触发，11 个命令，键盘导航 + 过滤搜索）
  - [x] 版本历史 — Rust 后端（chapter_versions 表 + SHA-256 去重 + 3 个 Tauri command）
  - [x] 版本历史 — 前端（版本列表 + diff 对比 + 一键回滚）
  - [x] AI 内联操作（选中文本 → 浮动菜单 → 润色/改写/去AI味/翻译，流式替换）
  - [x] 全屏编辑模式（`Ctrl+Shift+F` 或按钮切换，隐藏所有 chrome）
  - [x] npm 依赖：`@tiptap/suggestion` `tippy.js` `diff` `@types/diff`
  - [x] Rust 依赖：`sha2` `hex`（版本历史 SHA-256）
  - [x] CSS 样式：场景分隔符 / 对话高亮 / AI Bubble Menu / 斜杠命令菜单

### 文件清单
**新建 (11 个)：**
- `src/modules/editor/nodes/SceneBreak.ts`
- `src/modules/editor/marks/DialogueHighlight.ts`
- `src/modules/editor/slash-commands/registry.ts`
- `src/modules/editor/slash-commands/suggestion.ts`
- `src/modules/editor/slash-commands/SlashCommandList.tsx`
- `src/core/db/version-repository.ts`
- `src/modules/editor/version-store.ts`
- `src/modules/editor/VersionHistoryPanel.tsx`
- `src/modules/editor/ai-inline/AIBubbleMenu.tsx`
- `src/modules/editor/ai-inline/operations.ts`
- `src/modules/editor/ai-inline/execute-operation.ts`
- `src/shared/hooks/use-fullscreen.ts`

**修改 (9 个)：**
- `src/modules/editor/extensions.ts` — 注册 SceneBreak + DialogueHighlight + SlashCommand
- `src/modules/editor/NovelEditor.tsx` — 版本保存、BubbleMenu、providerId/model props
- `src/modules/editor/EditorPage.tsx` — 传递 provider props、全屏按钮、隐藏章节侧边栏
- `src/modules/editor/store.ts` — isFullscreen、versions tab
- `src/app/components/AppLayout.tsx` — 全屏条件隐藏
- `src/app/components/RightPanel.tsx` — 添加版本 tab
- `src-tauri/src/db.rs` — chapter_versions 表 + 3 个 command
- `src-tauri/src/lib.rs` — 注册新 command
- `src/index.css` — 新增样式

### 下一步
- Phase 3: AI 引擎进阶 — 多 Agent + 审计（第 9-12 周）

---

## 2026-05-07 — 会话 3（Phase 3）

### 完成
- [x] Phase 3: AI 引擎进阶 — 多 Agent + 审计 ✅ (2026-05-07)
  - [x] LLM 容错 resilience.ts（指数退避重试 3 次、超时、429 处理、优雅降级）
  - [x] 上下文预算 context-budget.ts（Token 估算、5 层预算分配、动态压缩）
  - [x] 多模型路由 model-router.ts（AgentRole → provider+model 映射，localStorage 持久化）
  - [x] Agent 类型 + 基类（AgentContext、BaseAgent 抽象类、模型路由+预算压缩+LLM 调用）
  - [x] Writer Agent（复用 style-guard prompt、context-builder 模式）
  - [x] Auditor Agent（8 维度基础审计、JSON 输出解析、Zod 校验兜底）
  - [x] Reviser Agent（接收 critical issues 列表、精准修订、保持原文风格）
  - [x] 审计管线编排 pipeline/audit（runAudit → AuditorAgent → parseOutput → 事件）
  - [x] 意图解析 coordinator/intent-parser（Slash 命令 + 自然语言关键词匹配）
  - [x] Coordinator Agent（统一入口、意图路由到管线或对话）
  - [x] 工作流引擎 workflow-engine（Write→Audit→Revise 循环、最多 3 次重试、中止支持）
  - [x] 审计 Store + 审稿报告 UI（分数进度条、维度卡片、问题列表、严重度徽章）
  - [x] RightPanel 审计 tab 接入 AuditReportPanel
  - [x] 事件类型扩展（model-route、resilience、quality-gate 事件）
  - [x] AI Engine 导出汇总（resilience、context-budget、model-router、agents、coordinator、workflow-engine）

### 文件清单
**新建 (16 个)：**
- `src/core/ai-engine/resilience.ts`
- `src/core/ai-engine/context-budget.ts`
- `src/core/ai-engine/model-router.ts`
- `src/core/ai-engine/agents/types.ts`
- `src/core/ai-engine/agents/base-agent.ts`
- `src/core/ai-engine/agents/audit-types.ts`
- `src/core/ai-engine/agents/writer-agent.ts`
- `src/core/ai-engine/agents/auditor-agent.ts`
- `src/core/ai-engine/agents/reviser-agent.ts`
- `src/core/ai-engine/agents/index.ts`
- `src/core/pipeline/audit/index.ts`
- `src/core/ai-engine/coordinator/intent-parser.ts`
- `src/core/ai-engine/coordinator/index.ts`
- `src/core/ai-engine/workflow-engine/index.ts`
- `src/modules/ai-collab/audit-store.ts`
- `src/modules/ai-collab/AuditReportPanel.tsx`

**修改 (5 个)：**
- `src/core/events/types.ts` — 添加 4 个新事件类型
- `src/app/components/RightPanel.tsx` — 审计 tab → AuditReportPanel
- `src/core/ai-engine/index.ts` — 新 re-exports
- `src/modules/ai-collab/store.ts` — pipeline 状态字段
- `src/core/ai-engine/context-builder.ts` — 导出 stripHtml

### 下一步
- Phase 4: 输入治理 + 真相文件 AI 自动更新（第 13-15 周）

---

## 2026-05-07 — 会话 4（Phase 4）

### 完成
- [x] Phase 4: 输入治理 + 真相文件 AI 自动更新 ✅ (2026-05-07)
  - [x] Rust 后端：temporal_facts + truth_files 两张新表 + 7 个 Tauri command
  - [x] 前端 Repository：temporal-memory-repository.ts + truth-file-repository.ts
  - [x] 37 维度审计扩展（8→37，7 类别：prose/narrative/consistency/ai-trace/structure/emotional/craft）
  - [x] AgentRole 扩展（+planner/composer/observer/director，含温度配置和 Settings 路由）
  - [x] Agent 类型扩展（ChapterPlan/CompiledContext/FactDelta/扩展 AgentContext）
  - [x] Planner Agent（章节意图规划：goals/mustKeep/mustAvoid/tone/targetWordCount）
  - [x] Composer Agent（真相文件→精简上下文编译，token 预算控制）
  - [x] Observer Agent（正文→事实提取→FactDelta，DB 持久化到时序记忆）
  - [x] Director Agent（编排完整管线：Plan→Compose→Write→Observe→Audit→Revise 循环）
  - [x] 5 个 Pipeline 包装函数（plan/compose/write/revise/observe）
  - [x] 工作流引擎升级（full-pipeline 模式，委托 DirectorAgent）
  - [x] 意图解析扩展（/plan /compose /observe /run + 中文 NL 关键词）
  - [x] Coordinator 升级（full-pipeline/plan-chapter/observe-chapter 分支）
  - [x] 真相文件管理器 DB 集成（loadFromDb/saveToDb + 向后兼容）
  - [x] 事件类型扩展（plan:complete/observe:complete/truth-file:updated）

### 文件清单
**新建 (10 个)：**
- `src/core/db/temporal-memory-repository.ts`
- `src/core/db/truth-file-repository.ts`
- `src/core/ai-engine/agents/planner-agent.ts`
- `src/core/ai-engine/agents/composer-agent.ts`
- `src/core/ai-engine/agents/observer-agent.ts`
- `src/core/ai-engine/agents/director-agent.ts`
- `src/core/pipeline/plan/index.ts`
- `src/core/pipeline/compose/index.ts`
- `src/core/pipeline/write/index.ts`
- `src/core/pipeline/observe/index.ts`

**修改 (14 个)：**
- `src-tauri/src/db.rs` — 2 表 + 7 命令
- `src-tauri/src/lib.rs` — 注册新命令
- `src/core/ai-engine/agents/audit-types.ts` — 8→37 维度
- `src/core/ai-engine/model-router.ts` — +4 角色
- `src/core/events/types.ts` — +3 事件
- `src/core/ai-engine/agents/types.ts` — 新类型
- `src/core/ai-engine/agents/base-agent.ts` — 温度配置
- `src/core/ai-engine/agents/index.ts` — 新导出
- `src/core/ai-engine/workflow-engine/index.ts` — full-pipeline 模式
- `src/core/ai-engine/coordinator/intent-parser.ts` — 新命令
- `src/core/ai-engine/coordinator/index.ts` — 新分支
- `src/core/truth-files/manager.ts` — DB 集成
- `src/core/ai-engine/index.ts` — 新导出
- `src/core/pipeline/revise/index.ts` — 新建

---

## 2026-05-07 — 会话 5（Phase 5）

### 完成
- [x] Phase 5: 蚁群 + 自动驾驶 + 风格仿写 ✅ (2026-05-07)
  - [x] 蚁群共享机制 swarm-engine.ts（Validator 退回、JSON 修复、max_hops）
  - [x] Router 模式（Router 选择最佳专家 → 执行）
  - [x] Supervisor-Dynamic 模式（任务分解 → Worker → 审查 → 循环）
  - [x] 自动驾驶状态机（熔断器 5-fail/120s、章间冷却、每日上限）
  - [x] Cron 调度器 + 通知推送（桌面 Notification API）
  - [x] 自动驾驶控制面板 UI
  - [x] Voice Profile 文风指纹提取（余弦相似度对比）
  - [x] 写法引擎 WritingFormula（4 预设文风库）
  - [x] Writer Agent 文风注入 + AgentRole 扩展 + Coordinator /swarm /autopilot

### 文件清单
**新建 (12 个)：** modes/swarm-engine、router-mode、supervisor-mode、index；scheduler/auto-pilot、cron-scheduler、notifications；auto-pilot/store、AutoPilotPage；style/voice-profile、writing-formula、index

**修改 (8 个)：** writer-agent、intent-parser、coordinator、events/types、model-router、ai-engine/index、App.tsx

---

## 2026-05-07 — 会话 6（Phase 6）

### 完成
- [x] Phase 6: 导出 + 数据分析 + 打磨 ✅ (2026-05-07)
  - [x] 多格式导出引擎（TXT/Markdown/DOCX/EPUB/PDF，Pandoc sidecar 降级到纯前端）
  - [x] 导出模板系统（4 平台预设：起点/番茄/晋江/Kindle，排版参数配置）
  - [x] 导出 UI（格式选择/范围选择/模板选择/一键复制）
  - [x] 数据分析引擎（字数趋势/审计趋势/模型使用统计）
  - [x] 数据分析面板（总览卡片/趋势图/高频问题/章节质量）
  - [x] 全局搜索（Ctrl+K 打开、跨章搜索、高亮匹配、键盘导航）
  - [x] 快捷键系统（Ctrl+K 搜索、Ctrl+S 保存、Ctrl+Shift+F 全屏等）
  - [x] 跨章重复检测（段落/标题/开篇/结尾/结构 5 种检测，余弦相似度 + Jaccard）
  - [x] App.tsx 全局挂载搜索对话框 + 快捷键

### 文件清单
**新建 (10 个)：**
- `src/core/export/export-engine.ts`
- `src/core/export/templates.ts`
- `src/modules/export/store.ts`
- `src/modules/export/ExportPanel.tsx`
- `src/core/analytics/analytics-engine.ts`
- `src/modules/analytics/store.ts`
- `src/core/search/search-engine.ts`
- `src/shared/components/SearchDialog.tsx`
- `src/shared/hooks/use-keyboard-shortcuts.ts`
- `src/core/analytics/duplicate-detector.ts`

**修改 (5 个)：**
- `src/modules/analytics/AnalyticsPage.tsx` — 真实分析面板
- `src/core/events/types.ts` — export 事件
- `src/App.tsx` — SearchDialog + 快捷键全局挂载

---

## 2026-05-07 — 会话 7（Phase 7）

### 完成
- [x] Phase 7: 高级功能 ✅ (2026-05-07)
  - [x] 蚁群 Peer-Handoff / Planner-Executor / Emergent 3 种子模式
  - [x] 角色档案卡（从 character_matrix 提取 + 卡片 UI）
  - [x] 时间线可视化（CSS 垂直时间线 + 矛盾检测）
  - [x] 知识图谱（SVG 节点关系图 + 可交互）
  - [x] 伏笔台账自动闭合（过期检测 + 回收建议）
  - [x] 张力心电图（0-10 分趋势图 + 异常检测）
  - [x] 插件系统（PluginManifest + 注册/启用/卸载 UI）
  - [x] 设定集 World Bible（7 真相文件统一视图 + 搜索）
  - [x] 云同步（本地备份 + WebDAV）
  - [x] 导航扩展 + 路由 + 事件
