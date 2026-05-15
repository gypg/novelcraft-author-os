# NovelCraft 项目交接文档

## 一、项目基本信息

| 项目 | 值 |
|---|---|
| 项目名 | NovelCraft — AI 驱动的小说写作平台 |
| 技术栈 | Tauri 2 + React 19 + TypeScript 6 + Rust + Vite 8 |
| 项目路径 | `c:\Users\69058\Desktop\project\自研小说软件\novel-app` |
| 前端框架 | React 19.2.5 + react-router-dom 7.15 |
| 状态管理 | Zustand 5.0.13 |
| 编辑器 | TipTap 3.22.5 |
| UI 工具 | lucide-react, class-variance-authority, clsx, tailwind-merge |
| CSS | Tailwind CSS 4.2.4 (via @tailwindcss/vite 插件) |
| 验证 | Zod 4.4.3 |
| 测试 | Vitest 4.1.5 + jsdom 29.1.1 |
| 后端 | Rust (Tauri 2) + rusqlite 0.32 (SQLite, bundled) + reqwest 0.12 |
| 开发端口 | http://localhost:5173/ (Vite dev server) |

## 二、当前质量状态

| 检查项 | 状态 |
|---|---|
| Vitest 测试 | ✅ 8 个测试文件，120 个测试全部通过 |
| ESLint | ⚠️ 0 errors, 1 warning (ProviderHealthBadge.tsx useEffect 依赖) |
| TypeScript | ❌ **3 个编译错误**（详见下方） |
| Vite build | ✅ 构建成功 |

### TypeScript 编译错误（需要修复）

**错误 1 & 2** — `src/core/scheduler/auto-pilot.ts:161-163`
```typescript
const disk = await checkDiskSpace()  // 返回类型含 null
if (!disk.sufficient) { ... }        // TS18047: 'disk' is possibly 'null'
```
`checkDiskSpace()` 返回 `Promise<{ available: number; sufficient: boolean } | null>`，在浏览器模式下返回 `null`。需要加 `if (!disk) { ... }` 空值守卫。

**错误 3** — `src/modules/theme/SettingsPage.tsx:530`
```typescript
const result = await testProvider({ ... })
setTestResult({ ok: true, msg: result })  // TS2322: result 类型是 string | { ok: false; msg: string }
```
`testProvider` 返回 `Promise<string | { ok: false; msg: string }>`，但 `setTestResult` 的 `msg` 字段期望 `string`。需要改为：
```typescript
if (typeof result === 'string') {
  setTestResult({ ok: true, msg: result })
} else {
  setTestResult({ ok: false, msg: result.msg })
}
```

## 三、项目架构

### 3.1 目录结构

```
novel-app/
├── src/
│   ├── app/components/          # 应用壳组件
│   │   ├── AppLayout.tsx        # 主布局（侧边栏+顶栏+内容区+底栏）
│   │   ├── Sidebar.tsx          # 左侧导航
│   │   ├── TopBar.tsx           # 顶部栏
│   │   ├── BottomBar.tsx        # 底部状态栏
│   │   └── RightPanel.tsx       # 右侧面板
│   ├── core/                    # 核心业务逻辑（纯 TypeScript，无 UI）
│   │   ├── ai-engine/           # AI 引擎（最大模块）
│   │   │   ├── agents/          # 7 个 Agent（Writer/Auditor/Reviser/Planner/Composer/Observer/Director）
│   │   │   ├── coordinator/     # 意图解析 + 协调器
│   │   │   ├── modes/           # 5 种运行模式（Router/Supervisor/Emergent/PeerHandoff/PlannerExecutor）
│   │   │   ├── workflow-engine/ # 工作流引擎
│   │   │   ├── providers.ts     # Provider CRUD + API Key 加密 + LLM 调用 + 模型获取
│   │   │   ├── provider-presets.ts # 68 个预设提供商（32 直连 + 36 TokenPlan）
│   │   │   ├── model-router.ts  # 模型路由（按角色分配模型）
│   │   │   ├── context-builder.ts # 上下文构建
│   │   │   ├── context-budget.ts # 上下文预算控制
│   │   │   ├── resilience.ts    # 弹性调用（重试/降级）
│   │   │   ├── anti-hallucination.ts # 防幻觉
│   │   │   ├── style-guard.ts   # 风格守卫
│   │   │   └── read-guidance.ts # 阅读引导
│   │   ├── db/                  # 数据库层
│   │   │   ├── repository.ts    # 书籍/章节 CRUD（含浏览器 mock 数据）
│   │   │   ├── chat-repository.ts
│   │   │   ├── outline-repository.ts
│   │   │   ├── temporal-memory-repository.ts
│   │   │   ├── truth-file-repository.ts
│   │   │   ├── version-repository.ts
│   │   │   ├── validators.ts
│   │   │   └── schema.ts        # IndexedDB schema（旧版，已被 Rust SQLite 替代）
│   │   ├── analytics/           # 分析引擎（张力追踪/重复检测）
│   │   ├── characters/          # 角色档案
│   │   ├── constraints/         # 约束系统
│   │   ├── events/              # 事件系统
│   │   ├── export/              # 导出/导入引擎
│   │   ├── hooks/               # Hook 管理器
│   │   ├── input-governance/    # 输入治理
│   │   ├── knowledge-graph/     # 知识图谱
│   │   ├── pipeline/            # 写作管道（audit/compose/observe/plan/revise/write）
│   │   ├── plugins/             # 插件注册
│   │   ├── scheduler/           # 调度器（自动驾驶/cron/磁盘检查/通知/PID守护）
│   │   ├── search/              # 搜索引擎
│   │   ├── style/               # 写作风格/声音配置
│   │   ├── sync/                # 同步引擎
│   │   ├── temporal-memory/     # 时序记忆（BM25）
│   │   ├── timeline/            # 时间线引擎
│   │   └── truth-files/         # 真实性文件管理（实体/快照）
│   ├── modules/                 # 页面级 UI 模块
│   │   ├── bookshelf/           # 书架页（已完成 CRUD）
│   │   ├── editor/              # 编辑器页（TipTap，含 AI 内联/搜索替换/版本历史/大纲/斜杠命令）
│   │   ├── ai-collab/           # AI 协作页
│   │   ├── theme/               # 设置页（外观/AI模型/高级）
│   │   ├── analytics/           # 分析页
│   │   ├── auto-pilot/          # 自动驾驶页
│   │   ├── characters/          # 角色页
│   │   ├── timeline/            # 时间线页
│   │   ├── knowledge-graph/     # 知识图谱页
│   │   ├── truth-files-ui/      # 真实性文件页
│   │   ├── world-bible/         # 世界观圣经页
│   │   ├── style/               # 风格页
│   │   ├── export/              # 导出页
│   │   ├── input-governance/    # 输入治理页
│   │   └── plugins/             # 插件管理页
│   ├── shared/                  # 共享组件/工具
│   │   ├── components/          # ErrorBoundary/Toast/SearchDialog/ProviderHealthBadge 等
│   │   ├── hooks/               # 键盘快捷键/自动保存/焦点陷阱/网络状态/写作统计等
│   │   └── utils/               # logger/tauri-env
│   ├── App.tsx                  # 路由配置（lazy loading + ErrorBoundary）
│   ├── main.tsx                 # 入口（禁用右键菜单）
│   ├── design-system.css        # CSS 设计系统变量
│   └── index.css                # 全局样式
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口（仅调用 lib::run()）
│   │   ├── lib.rs               # Tauri 应用配置 + 数据库初始化 + 完整性检查 + 备份恢复
│   │   ├── db.rs                # SQLite 全部命令（书籍/章节/大纲/版本/聊天/时序/真实性/导出导入）
│   │   ├── llm.rs               # LLM Provider CRUD + 测试连接 + 流式调用 + 模型获取
│   │   └── logger.rs            # 日志系统（环形缓冲区 + JSONL 格式 + 文件持久化）
│   └── Cargo.toml               # Rust 依赖
├── package.json
├── vite.config.ts               # Vite 配置（别名 @/、手动分包）
├── tsconfig.json                # TypeScript 配置
└── tailwind.config.ts           # Tailwind 配置
```

### 3.2 双模式架构（关键设计）

项目采用 **Tauri + 浏览器双模式** 设计：

- **Tauri 模式**（桌面应用）：通过 `window.__TAURI_INTERNALS__` 检测，调用 Rust 后端 SQLite
- **浏览器模式**（开发预览）：所有 repository 函数使用内存 mock 数据或 localStorage

检测函数在 `src/shared/utils/tauri-env.ts`：
```typescript
export function isTauri(): boolean {
  return !!window.__TAURI_INTERNALS__
}
```

每个 repository 函数都遵循此模式：
```typescript
export async function someOperation(...) {
  const inv = await getInvoke()
  if (!inv) { /* 浏览器 mock 逻辑 */ }
  return inv('command_name', { ... })
}
```

**Provider 存储**：
- Tauri 模式：SQLite `llm_providers` 表，API Key 使用 AES-GCM 加密存储
- 浏览器模式：`localStorage` key `novelcraft_providers`，API Key 明文存储

### 3.3 API Key 加密方案

在 `src/core/ai-engine/providers.ts:32-120`：

- **当前方案**：AES-256-GCM via Web Crypto API
  - PBKDF2 派生密钥（100000 迭代，SHA-256）
  - 硬编码 passphrase: `'novelcraft-aesgcm-2026'`
  - 硬编码 salt: `'novelcraft-salt-v1'`
  - 12 字节随机 IV
  - 密文末尾附加 `0xae` 标记字节
- **旧版兼容**：XOR 混淆（passphrase: `'novelcraft-enc-key-2024'`），通过 `isLegacyFormat()` 自动检测并回退
- **⚠️ 安全问题**：passphrase 和 salt 硬编码在前端代码中，仅提供混淆级保护，不是真正的安全方案

## 四、已完成功能详细状态

### 4.1 书架模块 ✅ 可用

- `src/modules/bookshelf/BookshelfPage.tsx`
- 书籍 CRUD（创建/编辑/删除）
- 编辑对话框使用 `key={editingBook.id}` 强制重新挂载
- `updateBook` 过滤 undefined 值防止覆盖
- 题材预设：15 种（玄幻/仙侠/都市/科幻等）
- 统计卡片：书籍总数/连载中/累计字数
- 点击书籍跳转编辑器

### 4.2 编辑器模块 ⚠️ 部分可用

- `src/modules/editor/EditorPage.tsx` — TipTap 编辑器
- AI 内联操作（`src/modules/editor/ai-inline/AIBubbleMenu.tsx`）
- 搜索替换（`src/modules/editor/extensions/SearchReplace.ts`）
- 版本历史（`src/modules/editor/VersionHistoryPanel.tsx`）
- 大纲面板（`src/modules/editor/OutlinePanel.tsx`）
- 章节树（`src/modules/editor/ChapterTree.tsx`）
- 斜杠命令（`src/modules/editor/slash-commands/SlashCommandList.tsx`）
- 自定义标记：角色标记（CharacterMark）、对话高亮（DialogueHighlight）
- 自定义节点：笔记节点（NoteNode）、场景分隔（SceneBreak）

### 4.3 设置模块 ✅ 可用

- `src/modules/theme/SettingsPage.tsx`
- 三个 Tab：外观 / AI 模型 / 高级
- 外观：3 种主题（极简白/深色/暖色）
- AI 模型：Provider 管理（添加/编辑/删除/测试连接/获取模型列表）
- 高级：数据备份与恢复（导出/导入 JSON）
- **⚠️ TypeScript 错误**：`handleTest` 中 `testProvider` 返回值类型处理不正确

### 4.4 AI Provider 预设系统 ✅ 可用

- `src/core/ai-engine/provider-presets.ts` — 1196 行
- **68 个预设提供商**，分两大类：
  - `DIRECT_PROVIDERS`（32 个）：OpenAI/Anthropic/Google/DeepSeek/MiniMax(国内+国际)/Moonshot/Kimi Coding/智谱(国内+国际)/通义千问/百炼 Coding/百川/零一万物/豆包/阶跃星辰(国内+国际)/腾讯混元/百度千帆/百度千帆 Coding/小米 MiMo/Groq/Mistral/Perplexity/Grok/NVIDIA/Cerebras/Together/Fireworks/Ollama/LM Studio
  - `TOKENPLAN_PROVIDERS`（36 个）：硅基流动(国内+国际)/OpenRouter/TheRouter/AiHubMix/302.AI/DMXAPI/ModelScope/LongCat/PPIO/Novita/PIPELLM/胜算云/优云智算+Coding/KAT-Coder/百灵/PackyCode/Cubence/AIGoCode/RightCode/AICodeMirror/AICoding/CrazyRouter/SSSAiCode/Micu/CTok/DDSHub/E-FlowCode/LionCCAPI/LemonData/GitHub Copilot/Codex/AWS Bedrock/自定义
- 每个预设包含：type/category/label/baseUrl/anthropicBaseUrl/apiFormat/icon/color/models/defaultModel/websiteUrl/apiKeyUrl/modelsUrl
- **双地址系统**：`baseUrl`（OpenAI 兼容）+ `anthropicBaseUrl`（Anthropic 兼容）
- **API 格式**：`'openai' | 'anthropic' | 'gemini'`
- **模型获取**：`buildModelsUrlCandidates()` 生成候选 URL 列表，支持预设 `modelsUrl` 优先

### 4.5 Rust 后端 ✅ 可用

- **数据库**：SQLite + WAL 模式 + 外键约束
  - 完整性检查 + 自动备份恢复（.db.bak）
  - Schema 版本迁移（当前 v2）
- **7 张表**：books, chapters, outlines, chapter_versions, chat_messages, temporal_facts, truth_files, llm_providers
- **LLM 调用**：支持 OpenAI 和 Anthropic 格式的流式调用
- **数据导出**：完整导出书籍+章节+大纲+真实性文件+时序事实为 JSON

## 五、已知问题与待修复项

### 5.1 必须修复（TypeScript 编译错误）

1. **SettingsPage.tsx:530** — `testProvider` 返回值类型处理
   ```typescript
   // 当前（错误）:
   const result = await testProvider({ ... })
   setTestResult({ ok: true, msg: result })  // result 可能是 { ok: false; msg: string }

   // 应改为:
   const result = await testProvider({ ... })
   if (typeof result === 'string') {
     setTestResult({ ok: true, msg: result })
   } else {
     setTestResult({ ok: false, msg: result.msg })
   }
   ```

2. **auto-pilot.ts:161-163** — `checkDiskSpace()` 返回 null 的空值守卫
   ```typescript
   // 当前（错误）:
   const disk = await checkDiskSpace()
   if (!disk.sufficient) { ... }

   // 应改为:
   const disk = await checkDiskSpace()
   if (!disk || !disk.sufficient) { ... }
   ```

### 5.2 ESLint 警告

- **ProviderHealthBadge.tsx:44** — useEffect 依赖数组 `[provider.name, provider.base_url, provider.api_key]` 缺少 `provider`。这是有意为之（避免对象引用变化导致无限重渲染），但 ESLint 不认可。可以考虑用 `useMemo` 包裹 provider 或添加 eslint-disable 注释。

### 5.3 架构级问题

1. **API Key 安全**：AES-GCM 的 passphrase 和 salt 硬编码在前端代码中，任何人都可从构建产物中提取。如需真正安全，应将加密移至 Rust 后端或使用操作系统密钥链（keychain/credential manager）。

2. **浏览器模式 mock 数据不一致**：
   - `repository.ts` 使用内存中的 `MOCK_BOOKS` / `MOCK_CHAPTERS` 数组
   - `providers.ts` 使用 `localStorage`
   - 其他 repository（chat/outline/temporal/truth-file/version）在浏览器模式下没有 mock 数据

3. **Rust 后端 `test_llm_provider` 只支持 openai/anthropic/custom 三种 provider_type**，但前端预设系统有 68 种 type。当用户选择 DeepSeek/Moonshot 等国内提供商时，Rust 端会走到 `custom` 分支（OpenAI 兼容），这大部分情况下能工作，但 Anthropic 格式的提供商会失败。

4. **Rust 后端 `fetch_models` 也只支持 openai/custom/anthropic 三种**，Anthropic 直接返回错误"不支持模型列表接口"。但前端 `fetchModelsViaHttp` 可以通过 HTTP 直接获取，所以浏览器模式下反而能工作。

5. **`update_book` Rust 端缺少 genre/tags 字段更新**：`src-tauri/src/db.rs:273-300` 的 `update_book` 动态 SET 子句中没有 `genre` 和 `tags`，但前端 `UpdateBookInput` 包含这两个字段。在 Tauri 模式下编辑书籍的题材和标签不会保存。

### 5.4 功能待完善

1. **模型获取不稳定**：很多 TokenPlan 提供商的 `/v1/models` 端点不支持标准 OpenAI 格式，或需要特殊认证头。`fetchModelsViaHttp` 对这些提供商可能失败。

2. **Provider 编辑后状态同步**：编辑 Provider 后，`ProviderHealthBadge` 的 useEffect 依赖 `[provider.name, provider.base_url, provider.api_key]`，如果只改了 models 不会触发重新检测。

3. **大量预设提供商的 UI 体验**：68 个提供商按钮全部平铺在表单中，没有分页/搜索/折叠，在小屏幕上体验差。

4. **AI 协作页/AutoPilot/知识图谱等页面**：目前只有骨架代码，核心功能未实现。

## 六、开发命令速查

```bash
# 安装依赖
npm install

# 启动开发服务器（浏览器模式，端口 5173）
npm run dev

# 启动 Tauri 桌面应用（需要 Rust 工具链）
npm run tauri dev

# 运行测试
npm run test          # vitest run
npm run test:watch    # vitest watch

# 代码检查
npm run lint          # ESLint
npx tsc -b --noEmit   # TypeScript 类型检查

# 构建
npm run build         # tsc + vite build
npm run tauri build   # Tauri 桌面应用构建
```

## 七、参考项目

用户之前提供了两个开源项目作为 AI Provider 系统的参考：

- **cc-switch**：`C:\Users\69058\Desktop\project\自研小说软件\API代理路由和接入api的agent项目\cc-switch` — Claude Code 代理路由工具，定义了完整的提供商预设系统
- **CherryStudio**：`C:\Users\69058\Desktop\project\自研小说软件\API代理路由和接入api的agent项目\CherryStudio` — AI 桌面客户端，有丰富的模型预设和提供商配置

这两个项目的核心参考价值在于：
1. 提供商分类（直连 vs 聚合网关/TokenPlan）
2. 双地址支持（OpenAI 兼容 + Anthropic 兼容端点）
3. 大量预设模型列表
4. 高级选项（自定义请求头、API 版本等）

## 八、数据模型

### 8.1 SQLite 表结构（Rust 端，Schema v2）

```sql
-- 核心表
books (id, title, author, synopsis, cover, status, word_count, target_daily_words, genre, tags, created_at, updated_at)
chapters (id, book_id, volume_id, title, order_index, content, word_count, status, ai_audit_score, created_at, updated_at)
outlines (id, book_id, parent_id, title, description, chapter_id, order_index, created_at, updated_at)
chapter_versions (id, chapter_id, content_hash, content, created_at)  -- 最多 50 版/章
chat_messages (id, book_id, chapter_id, role, content, metadata, created_at)
temporal_facts (id, book_id, chapter_id, subject, predicate, object, valid_from_chapter, valid_until_chapter, created_at, updated_at)
truth_files (id, book_id, file_type, content_json, updated_at)  -- UNIQUE(book_id, file_type)
llm_providers (id, name, provider_type, base_url, api_key, models, default_model, created_at)
_schema_meta (key, value)  -- Schema 版本追踪
```

### 8.2 前端 TypeScript 类型

- `BookRow` / `ChapterRow` — 与 Rust 端对应
- `LlmProviderRow` — Provider 数据行
- `CreateProviderInput` / `UpdateProviderInput` — Provider 创建/更新输入
- `ProviderPreset` — 预设配置（type/category/label/baseUrl/anthropicBaseUrl/apiFormat/icon/color/models/...）
- `ProviderType` — 68 种提供商类型联合
- `ProviderCategory` — `'direct' | 'tokenplan'`
- `ApiFormat` — `'openai' | 'anthropic' | 'gemini'`

## 九、关键设计决策记录

1. **为什么用 `key={editingBook.id}` 而非 useEffect 同步状态？** — ESLint 规则 `react-hooks/set-state-in-effect` 禁止在 useEffect 中调用 setState。使用 key 强制重新挂载是 React 推荐的模式。

2. **为什么 `updateBook` 要过滤 undefined？** — `UpdateBookInput` 的字段是 `string | undefined`，直接展开 `{ ...existing, ...input }` 会导致 undefined 覆盖已有值。

3. **为什么 ProviderHealthBadge 的 useEffect 依赖是 `[provider.name, provider.base_url, provider.api_key]` 而非 `[provider]`？** — provider 是每次渲染新建的对象，放入依赖会导致无限循环（useEffect → setState → 重渲染 → 新 provider 对象 → useEffect...）。

4. **为什么 `testProvider` 返回 `string | { ok: false; msg: string }` 而非抛异常？** — 测试连接失败是预期行为（不是异常），需要区分"连接成功返回消息"和"连接失败返回原因"两种情况。

5. **为什么 `buildModelsUrlCandidates` 生成多个候选 URL？** — 不同提供商的模型列表端点位置不同，有的在 `/v1/models`，有的在 `/models`，有的需要去掉 `/anthropic` 后缀才能找到。多候选依次尝试提高成功率。

## 十、优先修复清单（按紧急程度排序）

1. 🔴 **SettingsPage.tsx:530** — testProvider 返回值类型处理（TypeScript 编译错误）
2. 🔴 **auto-pilot.ts:161-163** — checkDiskSpace 空值守卫（TypeScript 编译错误）
3. 🔴 **db.rs update_book** — 缺少 genre/tags 字段更新（Tauri 模式下数据丢失 bug）
4. 🟡 **ProviderHealthBadge.tsx** — ESLint warning（useEffect 依赖）
5. 🟡 **Rust 端 test_llm_provider** — 只支持 3 种 provider_type，需扩展到支持所有 68 种
6. 🟡 **Rust 端 fetch_models** — Anthropic 直接返回错误，应改为尝试 HTTP 获取
7. 🟢 **API Key 安全** — passphrase 硬编码问题
8. 🟢 **Provider 预设 UI** — 68 个按钮平铺，需分页/搜索/折叠
