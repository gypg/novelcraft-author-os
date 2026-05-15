# NovelCraft — Code Wiki

> 版本：0.1.0 | 更新日期：2026-05-09
> 技术栈：Tauri 2 + React 19 + TypeScript + Tiptap + SQLite + Rust

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [前端核心层（core/）](#4-前端核心层core)
5. [功能模块层（modules/）](#5-功能模块层modules)
6. [共享层（shared/）](#6-共享层shared)
7. [应用壳体（app/）](#7-应用壳体app)
8. [Rust 后端（src-tauri/）](#8-rust-后端src-tauri)
9. [数据库设计](#9-数据库设计)
10. [事件系统](#10-事件系统)
11. [依赖关系图](#11-依赖关系图)
12. [项目运行方式](#12-项目运行方式)
13. [开发阶段与进度](#13-开发阶段与进度)

---

## 1. 项目概述

**NovelCraft** 是一款本地优先的 AI 小说创作平台，将 AI 能力深度整合进写作全流程。核心特性：

- **三模式 AI 引擎**：单 Agent（快/省）→ 多 Agent（精）→ 蚁群（创），Coordinator 统一调度
- **真相文件系统**：7 个 JSON 状态文件作为唯一事实来源，Zod 校验，坏数据不滚雪球
- **自动驾驶模式**：后台持续生成章节，熔断器 + 质量门控 + 通知推送
- **输入治理管线**：Plan → Compose → Write → Audit → Revise 三步分离
- **本地优先**：SQLite + 文件系统，不依赖云服务，隐私可控

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                     Tauri 2 (Rust 壳体)                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              React 19 + TypeScript + Vite 8              │ │
│  │                                                          │ │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │ │
│  │  │  App Shell   │ │   Modules    │ │   Shared Utils   │  │ │
│  │  │  路由/布局    │ │  功能模块     │ │   Hooks/组件     │  │ │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘  │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                    Core 核心层                            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │ │
│  │  │ AI Engine │ │ Pipeline │ │TruthFiles│ │ Scheduler │  │ │
│  │  │ 7 Agent   │ │ Plan/    │ │ 7 JSON   │ │ AutoPilot │  │ │
│  │  │ 3 Modes   │ │ Write/   │ │ Zod校验  │ │ PID Guard │  │ │
│  │  │ Resilience│ │ Audit    │ │ Snapshot │ │ DiskCheck │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │ │
│  │  │   DB     │ │  Events  │ │  Style   │ │  Export   │  │ │
│  │  │ Drizzle  │ │ EventBus │ │ Voice    │ │ TXT/MD/   │  │ │
│  │  │ SQLite   │ │ 松耦合   │ │ Profile  │ │ DOCX/EPUB │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  Tauri IPC Bridge                                        │ │
│  │  invoke() ←→ Rust Commands                               │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  Rust 后端                                                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │ │
│  │  │   DB     │ │   LLM    │ │  Logger  │ │  Plugins  │  │ │
│  │  │ rusqlite │ │ reqwest  │ │ JSONL    │ │ Shell/FS  │  │ │
│  │  │ WAL模式  │ │ SSE流式  │ │ 环形缓冲 │ │ Dialog    │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**架构原则：**

- **Core 层零 UI 依赖**：`core/` 不引入任何 React 组件，可被任何前端入口复用
- **模块间禁止直接 import**：通过 EventBus 或 Core 层服务通信
- **每个模块暴露标准化接口**：统一 Store 模式（Zustand）
- **Rust 负责所有 I/O 密集操作**：数据库、LLM 调用、文件系统、日志

---

## 3. 目录结构

```
novel-app/
├── public/                          # 静态资源
├── src/
│   ├── app/                         # 应用壳体
│   │   └── components/              # 布局组件
│   │       ├── AppLayout.tsx        # 主布局（三栏）
│   │       ├── TopBar.tsx           # 顶栏
│   │       ├── Sidebar.tsx          # 侧边栏导航
│   │       └── BottomBar.tsx        # 底栏（字数/状态）
│   ├── assets/                      # 图片资源
│   ├── components/ui/               # shadcn/ui 基础组件
│   ├── core/                        # 核心层（零 UI 依赖）
│   │   ├── ai-engine/               # AI 引擎
│   │   ├── constraints/             # 叙事约束系统
│   │   ├── db/                      # 数据库层
│   │   ├── events/                  # 事件总线
│   │   ├── export/                  # 导出引擎
│   │   ├── hooks/                   # 伏笔管理
│   │   ├── pipeline/                # 输入治理管线
│   │   ├── scheduler/               # 自动驾驶调度
│   │   ├── search/                  # 搜索引擎
│   │   ├── style/                   # 文风系统
│   │   ├── sync/                    # 同步引擎
│   │   ├── temporal-memory/         # 时序记忆
│   │   └── truth-files/             # 真相文件系统
│   ├── lib/utils.ts                 # cn() 工具函数
│   ├── modules/                     # 功能模块
│   │   ├── ai-collab/               # AI 协作面板
│   │   ├── analytics/               # 数据分析
│   │   ├── auto-pilot/              # 自动驾驶控制
│   │   ├── bookshelf/               # 书库管理
│   │   ├── editor/                  # 写作编辑器
│   │   ├── export/                  # 导出发布
│   │   ├── style/                   # 文风页面
│   │   └── theme/                   # 主题/设置/日志
│   ├── shared/                      # 共享工具
│   │   ├── components/              # 通用组件（Toast 等）
│   │   ├── hooks/                   # 公共 Hooks
│   │   └── utils/                   # 工具函数（Logger）
│   ├── App.tsx                      # 应用入口（路由定义）
│   ├── design-system.css            # 设计系统 CSS
│   ├── index.css                    # 全局样式
│   └── main.tsx                     # 渲染入口
├── src-tauri/                       # Rust 后端
│   ├── src/
│   │   ├── lib.rs                   # Tauri 命令注册
│   │   ├── main.rs                  # 程序入口
│   │   ├── db.rs                    # 数据库操作
│   │   ├── llm.rs                   # LLM 集成
│   │   └── logger.rs                # 日志系统
│   ├── Cargo.toml                   # Rust 依赖
│   └── tauri.conf.json              # Tauri 配置
├── package.json                     # 前端依赖
├── vite.config.ts                   # Vite 配置
├── drizzle.config.ts                # Drizzle ORM 配置
└── tsconfig.json                    # TypeScript 配置
```

---

## 4. 前端核心层（core/）

### 4.1 AI 引擎（ai-engine/）

**入口文件**：[index.ts](novel-app/src/core/ai-engine/index.ts)

统一导出所有 AI 引擎相关功能，是整个 AI 系统的总控接口。

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `callLlm` | 函数 | 基础 LLM 调用（SSE 流式） |
| `resilientCallLlm` | 函数 | 带容错的 LLM 调用（重试+退避） |
| `buildWritingContext` | 函数 | 构建写作上下文 |
| `buildStyleGuardPrompt` | 函数 | 构建去 AI 味 prompt |
| `estimateTokens` / `compressContext` | 函数 | Token 预估与上下文压缩 |
| `getModelRoute` / `setModelRoute` | 函数 | 多模型路由（按 Agent 角色配置） |
| `WriterAgent` ~ `DirectorAgent` | 类 | 7 个 Agent 实现 |
| `coordinator` | 对象 | Coordinator Agent（意图解析+模式路由） |
| `workflowEngine` | 对象 | 工作流编排引擎 |
| `runRouterMode` / `runSupervisorMode` | 函数 | 蚁群子模式 |
| `PROVIDER_PRESETS` | 常量 | 35+ LLM 服务商预设 |

#### providers.ts — LLM Provider 管理

- **API Key 安全存储**：Tauri 模式下 API Key 由 Rust 写入 **OS 凭据存储**（Windows Credential Manager / macOS Keychain / Linux Secret Service），DB 中只存哨兵 `<keychain>`；浏览器模式 fallback 使用 AES-GCM 加密落 localStorage（仅供开发预览）。前端 `encryptApiKey()` / `decryptApiKey()` 仅用于浏览器 fallback 与老数据兼容
- **Provider CRUD**：`createProvider()` / `listProviders()` / `updateProvider()` / `deleteProvider()` / `testProvider()`
- **协议路由**：每个 Provider 带 `api_format: 'openai' | 'anthropic' | 'gemini'`，Rust 后端按此分发到对应分支；前端通过 `resolveApiFormat()` 从 preset 自动注入
- **LLM 调用**：`callLlm(options)` — 通过 Tauri IPC 调用 Rust 后端，支持 SSE 流式输出，三种协议均已实现
- **服务商预设**：内置 **68 个** Provider（32 直连 + 36 TokenPlan 聚合网关，详见 `provider-presets.ts`）

关键类型：

```typescript
interface CallLlmOptions {
  providerId: string
  model?: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  onDelta?: (delta: string) => void    // SSE 流式回调
  onComplete?: (fullText: string) => void
  onError?: (error: string) => void
}
```

#### secret.rs — OS 凭据存储（src-tauri 端）

- 使用 `keyring` crate 封装跨平台凭据访问，service name = `"NovelCraft"`，account = provider id
- 3 个 Tauri 命令：`set_provider_secret` / `get_provider_secret` / `delete_provider_secret`
- 内部常量 `KEYCHAIN_SENTINEL = "<keychain>"` 用作 DB 哨兵
- **安全策略**：keychain 不可用时 **拒绝写入**（返回明确错误），不静默回退到 DB 明文存储，避免悄悄降级安全等级

#### resilience.ts — 容错机制

- **错误分类**：`parseLlmError()` — 将错误分为 RATE_LIMIT / TIMEOUT / NETWORK / AUTH / SERVER / TOKEN_LIMIT / UNKNOWN
- **指数退避重试**：`resilientCallLlm()` — 默认 3 次重试，429 错误更长延迟
- **超时控制**：`withTimeout()` — 默认 60s 超时
- **降级通知**：重试耗尽后通过 EventBus 发送 `ai:resilience:degraded` 事件

### 4.2 数据库层（db/）

#### schema.ts — Drizzle ORM Schema

定义三张核心表：

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `books` | 书籍 | id, title, author, status, wordCount, genre, tags |
| `volumes` | 卷 | id, bookId(FK), title, orderIndex |
| `chapters` | 章节 | id, bookId(FK), volumeId(FK), content(Tiptap JSON), wordCount, status, aiAuditScore |

#### repository.ts — 前端数据访问层

通过 Tauri `invoke()` 调用 Rust 后端命令：

| 函数 | 对应 Rust 命令 | 说明 |
|------|---------------|------|
| `createBook(input)` | `create_book` | 创建书籍 |
| `listBooks()` | `list_books` | 列出所有书籍 |
| `updateBook(id, input)` | `update_book` | 更新书籍 |
| `deleteBook(id)` | `delete_book` | 删除书籍 |
| `createChapter(input)` | `create_chapter` | 创建章节 |
| `listChapters(bookId)` | `list_chapters` | 列出章节 |
| `updateChapterContent(id, content)` | `update_chapter_content` | 更新章节内容 |
| `deleteChapter(id)` | `delete_chapter` | 删除章节 |
| `generateId()` | — | 生成 UUID |

### 4.3 真相文件系统（truth-files/）

#### schemas.ts — 7 个真相文件 Zod Schema

| 文件名 | Schema | 说明 |
|--------|--------|------|
| `current_state` | `CurrentStateSchema` | 世界状态（位置/时间/天气/条件） |
| `hooks` | `HooksSchema` | 伏笔池（类型/状态/埋设章/回收章） |
| `summaries` | `SummariesSchema` | 章节摘要（摘要/关键事件） |
| `subplots` | `SubplotsSchema` | 支线进度（状态/关联章节） |
| `emotional_arcs` | `EmotionalArcsSchema` | 情感弧线（角色→情绪→强度→章节） |
| `character_matrix` | `CharacterMatrixSchema` | 角色交互矩阵（关系类型/变化章节） |
| `particle_ledger` | `ParticleLedgerSchema` | 资源账本（物品/拥有者/数量） |

#### manager.ts — TruthFileManager 类

核心方法：

| 方法 | 说明 |
|------|------|
| `get(name)` / `getJson(name)` | 读取真相文件数据 |
| `set(name, value)` | 写入（自动 Zod 校验，校验失败拒绝写入） |
| `validate(name, value)` | 校验但不写入 |
| `validateAll()` | 校验全部 7 个文件 |
| `loadFromDb(bookId)` | 从 SQLite 加载 |
| `saveToDb(bookId)` | 保存到 SQLite |
| `exportAll()` | 导出全部为 JSON 字符串 |

#### snapshot.ts — 真相文件快照

- `createSnapshot()` — 创建章节级快照
- `getSnapshots()` / `getSnapshotByChapter()` — 查询快照
- `rollbackToSnapshot()` — 回滚到指定快照

### 4.4 输入治理管线（pipeline/）

#### plan/index.ts — Plan 阶段

```typescript
function runPlan(context: AgentContext): Promise<{ plan: ChapterPlan; raw: string }>
```

使用 `PlannerAgent` 生成章节计划（目标/必须保留/必须避免/基调/目标字数）。

#### write/index.ts — Write 阶段

```typescript
function runWrite(context: AgentContext, options?: { onDelta? }): Promise<{ content: string; raw: string }>
```

使用 `WriterAgent` 生成章节正文，支持 SSE 流式回调。

#### audit/index.ts — Audit 阶段

```typescript
function runAudit(context: AgentContext, options?): Promise<AuditResult>
```

使用 `AuditorAgent` 执行 37 维度审计，返回 `AuditReport`（评分/critical/warning/info 计数）。

### 4.5 叙事约束系统（constraints/）

#### schemas.ts — 四层约束 Schema

| Schema | 层级 | 说明 |
|--------|------|------|
| `MasterSettingSchema` | 全局约束 | 世界规则/核心承诺/禁区/叙事基调 |
| `VolumeContractSchema` | 卷级约束 | 必须节点/禁止揭示/新角色/情感走向 |
| `ChapterContractSchema` | 章级约束 | 必须场景/禁止行为/伏笔回应/字数范围 |
| `ReviewContractSchema` | 审查标准 | 必须维度/自定义规则/质量阈值 |

### 4.6 伏笔管理（hooks/）

#### hook-manager.ts

| 函数 | 说明 |
|------|------|
| `parseHooksFromJson(json)` | 从 JSON 解析伏笔列表 |
| `detectStaleHooks(hooks, currentChapter)` | 检测过期伏笔（>20 章未回收） |
| `getHookStats(hooks)` | 统计伏笔状态分布 |
| `suggestHookClosure(hook, currentChapter)` | 生成伏笔回收建议 |

### 4.7 文风系统（style/）

#### voice-profile.ts — Voice Profile

| 函数 | 说明 |
|------|------|
| `extractVoiceProfile(text, name)` | 从参考文本提取文风指纹（句长/方差/对话比/高频词/节奏/标点密度） |
| `compareProfiles(a, b)` | 比较两个文风指纹的相似度（加权余弦相似度） |
| `detectStyleDrift(target, actualText, threshold)` | 检测文风漂移（阈值 0.68） |
| `buildVoiceProfilePrompt(profile)` | 生成注入 Writer Agent 的文风 prompt |

文风指纹维度：

```typescript
interface VoiceProfileFingerprint {
  avgSentenceLength: number       // 平均句长
  sentenceLengthVariance: number  // 句长方差
  dialogueRatio: number           // 对话比例
  topWords: Record<string, number> // 高频词
  rhythmPattern: 'short-dense' | 'mixed' | 'long-flowing'  // 节奏模式
  punctuationDensity: number      // 标点密度
}
```

### 4.8 时序记忆（temporal-memory/）

#### bm25.ts — BM25 + 距离衰减检索

```typescript
function searchFacts(facts, query, maxResults?, chapterNumber?): Array<{ fact; score }>
```

- 使用 BM25 算法计算查询与事实的相关性
- 距离衰减：越近章节的事实权重越高（指数衰减 `e^(-distance * 0.05)`）
- 仍然有效的事实（`valid_until_chapter === null`）获得 1.2x 加权

### 4.9 搜索引擎（search/）

#### search-engine.ts

| 函数 | 说明 |
|------|------|
| `searchBook(bookId, query)` | 全书搜索（遍历章节，大小写不敏感） |
| `highlightQuery(text, query)` | 高亮搜索关键词 |

### 4.10 导出引擎（export/）

#### export-engine.ts

| 函数 | 说明 |
|------|------|
| `exportContent(options)` | 导出内容为 Blob（TXT/Markdown/DOCX/EPUB/PDF） |
| `downloadBlob(blob, filename)` | 触发浏览器下载 |
| `copyToClipboard(text)` | 复制到剪贴板 |
| `getExportFilename(...)` | 生成导出文件名 |

DOCX/EPUB/PDF 通过 Tauri IPC 调用 `pandoc_convert`，失败时降级为 Markdown。

### 4.11 同步引擎（sync/）

#### sync-engine.ts

| 函数 | 说明 |
|------|------|
| `getSyncConfig()` / `setSyncConfig()` | 读取/保存同步配置（localStorage） |
| `exportBackup()` | 导出 localStorage 数据为 JSON Blob |
| `importBackup(blob)` | 从 JSON Blob 恢复数据 |
| `syncToWebdav(config)` | 同步到 WebDAV 服务器 |

### 4.12 调度器（scheduler/）

#### auto-pilot.ts — 自动驾驶引擎

`AutoPilot` 类，核心状态机：`idle → planning → writing → auditing → revising → paused → completed`

| 方法 | 说明 |
|------|------|
| `start(bookId, bookTitle, chapters, fromIndex)` | 启动自动驾驶 |
| `stop()` | 停止（通过 AbortController） |
| `getStatus()` / `getLogs()` / `getConfig()` | 查询状态 |
| `setConfig(config)` | 更新配置 |

关键机制：
- **PID 防重入**：启动时获取锁，防止多实例
- **熔断器**：连续失败 5 次 → OPEN（暂停 120s）→ HALF_OPEN（试探）→ CLOSED/OPEN
- **每日上限**：可配置每日最大章数
- **磁盘检查**：可用空间 < 100MB 时暂停
- **断点续写**：每章完成后保存 checkpoint 到 localStorage
- **文风漂移检测**：每章完成后与目标 Voice Profile 比较

#### pid-guard.ts — PID 防重入

| 函数 | 说明 |
|------|------|
| `acquirePidLock()` | 获取 PID 锁（通过 Tauri IPC） |
| `releasePidLock()` | 释放 PID 锁 |

#### disk-check.ts — 磁盘空间检查

| 函数 | 说明 |
|------|------|
| `checkDiskSpace()` | 检查可用磁盘空间（阈值 100MB） |

### 4.13 事件总线（events/）

#### index.ts — EventBus 类

```typescript
class EventBus {
  on<T>(event: string, callback: (data: T) => void): () => void   // 订阅，返回取消函数
  once<T>(event: string, callback: (data: T) => void): () => void // 一次性订阅
  emit<T>(event: string, data: T): void                           // 发布事件
  off(event: string, callback?): void                             // 取消订阅
  clear(): void                                                    // 清空所有
}
```

单例导出：`export const eventBus = new EventBus()`

#### types.ts — AppEvents 类型定义

定义了 30+ 事件类型，覆盖：
- **书籍事件**：`book:created` / `book:updated` / `book:deleted`
- **章节事件**：`chapter:created` / `chapter:updated` / `chapter:deleted`
- **AI 事件**：`ai:stream:start/delta/complete/error` / `ai:mode:changed` / `ai:resilience:degraded`
- **管线事件**：`pipeline:stage:start/complete` / `pipeline:audit:complete` / `pipeline:quality-gate:*`
- **自动驾驶事件**：`auto-pilot:start/stop/chapter-complete`
- **蚁群事件**：`swarm:router:selected` / `swarm:supervisor:iteration`
- **文风事件**：`style:drift-detected`
- **UI 事件**：`ui:theme:changed` / `ui:sidebar:toggle`

---

## 5. 功能模块层（modules/）

每个模块遵循统一模式：**Store（Zustand）+ Page 组件**。

### 5.1 书库管理（bookshelf/）

**Store**：[store.ts](novel-app/src/modules/bookshelf/store.ts)

| 状态 | 类型 | 说明 |
|------|------|------|
| `books` | `BookRow[]` | 书籍列表 |
| `selectedBookId` | `string \| null` | 当前选中书籍 ID |
| `chapters` | `ChapterRow[]` | 当前书籍章节列表 |

| 方法 | 说明 |
|------|------|
| `setBooks(books)` | 设置书籍列表 |
| `selectBook(bookId, bookTitle)` | 选中书籍（自动持久化到 localStorage） |
| `addBook(book)` / `removeBook(bookId)` | 增删书籍 |
| `updateBookInList(bookId, updates)` | 更新书籍信息 |

**页面**：`BookshelfPage` — 卡片视图 + 创建对话框

### 5.2 写作编辑器（editor/）

**Store**：[store.ts](novel-app/src/modules/editor/store.ts)

| 状态 | 类型 | 说明 |
|------|------|------|
| `currentChapterId` | `string \| null` | 当前编辑章节 |
| `isDirty` | `boolean` | 是否有未保存修改 |
| `wordCount` | `number` | 当前章节字数 |
| `rightPanelVisible` | `boolean` | 右侧面板是否可见 |
| `rightPanelTab` | 枚举 | 右侧面板当前 Tab（outline/character/timeline/knowledge/versions/audit/context/constraints） |
| `isFullscreen` | `boolean` | 全屏编辑模式 |

**Extensions**：[extensions.ts](novel-app/src/modules/editor/extensions.ts)

Tiptap 扩展配置：StarterKit + SceneBreak + DialogueHighlight + SlashCommand

### 5.3 AI 协作面板（ai-collab/）

**Store**：[store.ts](novel-app/src/modules/ai-collab/store.ts)

| 状态 | 类型 | 说明 |
|------|------|------|
| `mode` | `'single' \| 'multi' \| 'swarm'` | AI 模式 |
| `swarmSubMode` | `'router' \| 'supervisor' \| 'peer' \| 'planner-executor' \| 'emergent'` | 蚁群子模式 |
| `selectedProviderId` | `string \| null` | 当前 Provider |
| `selectedModel` | `string \| null` | 当前模型 |
| `messages` | `ChatMessage[]` | 对话历史 |
| `isStreaming` | `boolean` | 是否正在流式输出 |
| `currentStage` | `string \| null` | 当前管线阶段 |
| `isPipelineRunning` | `boolean` | 管线是否运行中 |
| `pipelineIterations` | `number` | 审计-修订迭代次数 |

### 5.4 数据分析（analytics/）

**Store**：[store.ts](novel-app/src/modules/analytics/store.ts)

管理字数趋势、Token 用量、审计通过率等分析数据。

### 5.5 自动驾驶控制（auto-pilot/）

**Store**：[store.ts](novel-app/src/modules/auto-pilot/store.ts)

管理自动驾驶状态、配置和日志，与 `core/scheduler/auto-pilot` 联动。

### 5.6 导出发布（export/）

**Store**：[store.ts](novel-app/src/modules/export/store.ts)

管理导出格式、范围、模板选择等状态。

### 5.7 文风页面（style/）

**组件**：`StylePage` — 文风分析与仿写界面，使用 `core/style/voice-profile` 提取和比较文风。

### 5.8 主题/设置/日志（theme/）

**Store**：[store.ts](novel-app/src/modules/theme/store.ts) — 主题切换、Provider 配置

**组件**：
- `SettingsPage` — 设置页面（外观/AI模型/导出/高级）
- `LogViewer` — 日志查看器（级别过滤/搜索/颜色编码）

---

## 6. 共享层（shared/）

### 6.1 通用组件（shared/components/）

| 组件 | 说明 |
|------|------|
| `Toast` / `ToastProvider` | 全局消息提示（3s 自动消失） |
| `ErrorBoundary` | React 错误边界 |
| `SearchDialog` | 全局搜索对话框（Ctrl+K 触发） |

### 6.2 公共 Hooks（shared/hooks/）

| Hook | 文件 | 说明 |
|------|------|------|
| `useSSE(options)` | [use-sse.ts](novel-app/src/shared/hooks/use-sse.ts) | SSE 流式连接 Hook |
| `useTheme()` | [use-theme.ts](novel-app/src/shared/hooks/use-theme.ts) | 主题管理 Hook |

**useSSE** 返回值：

```typescript
interface UseSSEReturn {
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  connect: (body?: unknown) => void
  disconnect: () => void
  accumulatedText: string  // 累积的流式文本
}
```

### 6.3 工具函数（shared/utils/）

| 函数 | 文件 | 说明 |
|------|------|------|
| `logger.info(module, msg)` | [logger.ts](novel-app/src/shared/utils/logger.ts) | 日志记录（通过 Tauri IPC 写入 Rust 日志系统） |
| `logger.warn(module, msg)` | 同上 | 警告日志 |
| `logger.error(module, msg)` | 同上 | 错误日志 |

---

## 7. 应用壳体（app/）

### 路由定义

[App.tsx](novel-app/src/App.tsx) 定义了所有页面路由：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `BookshelfPage` | 书库首页 |
| `/editor` | `EditorPage` | 写作编辑器 |
| `/ai` | `AICollabPage` | AI 协作面板 |
| `/truth-files` | `TruthFilesPage` | 真相文件编辑器 |
| `/analytics` | `AnalyticsPage` | 数据分析 |
| `/settings` | `SettingsPage` | 设置页面 |
| `/autopilot` | `AutoPilotPage` | 自动驾驶控制 |
| `/world-bible` | `WorldBiblePage` | 世界观设定 |
| `/plugins` | `PluginManagerPage` | 插件管理 |
| `/characters` | `CharactersPage` | 角色管理 |
| `/timeline` | `TimelinePage` | 时间线 |
| `/knowledge-graph` | `KnowledgeGraphPage` | 知识图谱 |
| `/style` | `StylePage` | 文风分析 |

### 布局组件

| 组件 | 说明 |
|------|------|
| `AppLayout` | 三栏主布局（Sidebar + Content + RightPanel） |
| `TopBar` | 顶栏（Logo/书名/AI模式切换/自动驾驶/设置/主题） |
| `Sidebar` | 侧边栏导航（书架/卷/章/AI/分析/设置） |
| `BottomBar` | 底栏（字数/日更目标/AI状态/保存状态） |

---

## 8. Rust 后端（src-tauri/）

### 8.1 程序入口

[main.rs](novel-app/src-tauri/src/main.rs) — 仅调用 `novel_app_lib::run()`

[lib.rs](novel-app/src-tauri/src/lib.rs) — Tauri 应用初始化：

1. 初始化 Logger（日志文件：`app_data_dir/novelcraft.log`）
2. 初始化 SQLite 数据库（WAL 模式 + 外键约束）
3. 初始化 LLM Provider 表
4. 注册所有 Tauri 命令

### 8.2 数据库模块（db.rs）

**数据库表**：

| 表名 | 说明 |
|------|------|
| `books` | 书籍元数据 |
| `chapters` | 章节内容 |
| `outlines` | 大纲节点（树形结构） |
| `chapter_versions` | 版本历史（SHA-256 去重，最多 50 版本） |
| `chat_messages` | AI 对话历史 |
| `temporal_facts` | 时序记忆（事实有效期追踪） |
| `truth_files` | 真相文件（Upsert 语义） |

**Tauri 命令**（共 22 个）：

| 命令 | 说明 |
|------|------|
| `create_book` / `list_books` / `update_book` / `delete_book` | 书籍 CRUD |
| `create_chapter` / `list_chapters` / `update_chapter_content` / `delete_chapter` | 章节 CRUD |
| `create_outline_node` / `list_outlines` / `update_outline_node` / `delete_outline_node` | 大纲 CRUD（支持递归删除） |
| `save_chapter_version` / `list_chapter_versions` / `revert_chapter_to_version` | 版本历史管理 |
| `save_chat_message` / `list_chat_messages` / `clear_chat_messages` | 对话消息管理 |
| `save_temporal_facts` / `query_temporal_facts` / `invalidate_temporal_facts` | 时序记忆管理 |
| `save_truth_file` / `load_truth_file` / `load_all_truth_files` / `delete_truth_file` | 真相文件管理 |

**字数统计**：`count_words()` — 中文字符每个算 1 字，英文单词按空格分隔算 1 词。

**版本去重**：使用 SHA-256 哈希，相同内容不重复保存。

### 8.3 LLM 模块（llm.rs）

**Provider CRUD**：

| 命令 | 说明 |
|------|------|
| `create_llm_provider` | 创建 Provider（API Key 写入 OS keychain，DB 存哨兵） |
| `list_llm_providers` | 列出所有 Provider（哨兵自动解析回 plaintext） |
| `update_llm_provider` | 更新 Provider（api_key 变更同步写 keychain） |
| `delete_llm_provider` | 删除 Provider（幂等同步删 keychain 凭据） |
| `test_llm_provider` | 测试连接（按 api_format 分发到 openai/anthropic/gemini 分支） |

**Schema**：`llm_providers` 表带 `api_format` 列存协议格式（`'openai' | 'anthropic' | 'gemini'`），首次启动自动 ALTER TABLE 迁移已有库。

**LLM 调用**：`call_llm` — 核心流式调用命令

- 支持 **3 种协议**：OpenAI 兼容 / Anthropic / Gemini，按 `api_format` 字段路由
- 使用 `reqwest` + `futures_util` 实现 SSE 流式解析
- 通过 `app.emit("llm-stream-chunk", ...)` 向前端推送流式数据
- OpenAI 协议：解析 `data: {...}` 格式，提取 `choices[0].delta.content`
- Anthropic 协议：解析 `content_block_delta` 事件，提取 `delta.text`
- Gemini 协议：`POST /v1beta/models/{model}:streamGenerateContent?alt=sse`，OpenAI messages 自动转 contents，system 消息映射到 `systemInstruction`
- 调用前自动把 provider.api_key 中的 `<keychain>` 哨兵解析为 OS keychain 中的实际 plaintext

### 8.4 凭据存储模块（secret.rs）

- `keyring` crate 跨平台封装：Windows Credential Manager / macOS Keychain / Linux Secret Service
- Service name = `"NovelCraft"`，account = provider id
- Tauri 命令：`set_provider_secret` / `get_provider_secret` / `delete_provider_secret`
- 配套常量 `KEYCHAIN_SENTINEL = "<keychain>"`：DB `api_key` 列里看到此值即表示真实 plaintext 在 keychain
- 失败策略：keychain 写入失败时返回明确错误，绝不静默回退到 DB 明文存储

### 8.5 日志模块（logger.rs）

**Logger 结构体**：

- **环形缓冲区**：容量 500 条，满时淘汰最旧条目
- **JSONL 格式**：每行一个 JSON 对象（timestamp/level/module/message）
- **批量刷新**：每 10 条自动 flush 到文件
- **stderr 输出**：同时输出到 stderr（开发调试用）

**Tauri 命令**：

| 命令 | 说明 |
|------|------|
| `log_message(level, module, message)` | 写入日志 |
| `read_logs(lines?)` | 读取最近 N 条日志（默认 200） |

### 8.6 Rust 依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| `tauri` | 2 | 桌面应用框架 |
| `tauri-plugin-shell` | 2 | Shell 命令插件 |
| `tauri-plugin-dialog` | 2 | 系统对话框插件 |
| `tauri-plugin-fs` | 2 | 文件系统插件 |
| `serde` / `serde_json` | 1 | 序列化 |
| `rusqlite` | 0.32 | SQLite 绑定（bundled 模式） |
| `reqwest` | 0.12 | HTTP 客户端（json + stream） |
| `tokio` | 1 | 异步运行时 |
| `tokio-stream` | 0.1 | 异步流 |
| `futures-util` | 0.3 | Stream 工具 |
| `sha2` | 0.10 | SHA-256 哈希 |
| `hex` | 0.4 | 十六进制编码 |
| `keyring` | 3 | OS 凭据存储（apple-native / windows-native / linux-native 后端） |

---

## 9. 数据库设计

### ER 关系图

```
books (1) ──── (N) chapters (1) ──── (N) chapter_versions
  │                    │
  │                    └──── (N) temporal_facts
  │
  ├── (N) outlines (自引用树形)
  ├── (N) chat_messages
  ├── (7) truth_files
  └── (N) llm_providers (独立表)
```

### 表结构详情

**books**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| title | TEXT | NOT NULL | 书名 |
| author | TEXT | DEFAULT '' | 作者 |
| synopsis | TEXT | DEFAULT '' | 简介 |
| cover | TEXT | | 封面路径 |
| status | TEXT | DEFAULT 'ongoing' | 状态（ongoing/completed/paused） |
| word_count | INTEGER | DEFAULT 0 | 总字数 |
| target_daily_words | INTEGER | | 日更目标 |
| genre | TEXT | | 题材 |
| tags | TEXT | | 标签 |
| created_at | INTEGER | NOT NULL | 创建时间（ms） |
| updated_at | INTEGER | NOT NULL | 更新时间（ms） |

**chapters**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| book_id | TEXT | FK → books | 所属书籍 |
| volume_id | TEXT | FK → volumes | 所属卷 |
| title | TEXT | NOT NULL | 章节标题 |
| order_index | INTEGER | DEFAULT 0 | 排序序号 |
| content | TEXT | DEFAULT '' | Tiptap JSON 内容 |
| word_count | INTEGER | DEFAULT 0 | 字数 |
| status | TEXT | DEFAULT 'draft' | 状态（draft/reviewed/final/ai-generated） |
| ai_audit_score | INTEGER | | AI 审计评分 |

**temporal_facts**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| book_id | TEXT | FK → books | 所属书籍 |
| chapter_id | TEXT | FK → chapters | 关联章节 |
| subject | TEXT | NOT NULL | 主语 |
| predicate | TEXT | NOT NULL | 谓语 |
| object | TEXT | NOT NULL | 宾语 |
| valid_from_chapter | INTEGER | NOT NULL | 生效章节 |
| valid_until_chapter | INTEGER | | 失效章节（NULL=仍然有效） |

---

## 10. 事件系统

### 架构

```
模块 A ──emit──→ EventBus ──notify──→ 模块 B
                                    ──notify──→ 模块 C
```

### 事件分类

| 分类 | 事件 | 触发场景 |
|------|------|----------|
| **书籍** | `book:created/updated/deleted` | 书籍 CRUD 操作 |
| **章节** | `chapter:created/updated/deleted` | 章节 CRUD 操作 |
| **AI 流式** | `ai:stream:start/delta/complete/error` | LLM 调用生命周期 |
| **AI 模式** | `ai:mode:changed` | 切换 AI 模式 |
| **AI 容错** | `ai:resilience:degraded` | 重试耗尽降级 |
| **管线** | `pipeline:stage:start/complete` | 管线阶段开始/完成 |
| **管线审计** | `pipeline:audit:complete` | 审计完成 |
| **质量门控** | `pipeline:quality-gate:iteration/exceeded` | 审计-修订循环 |
| **自动驾驶** | `auto-pilot:start/stop/chapter-complete` | 自动驾驶状态变化 |
| **蚁群** | `swarm:router:selected/supervisor:iteration` | 蚁群模式执行 |
| **文风** | `style:drift-detected` | 文风漂移告警 |
| **UI** | `ui:theme:changed/sidebar:toggle` | UI 状态变化 |

---

## 11. 依赖关系图

### 前端依赖关系

```
App.tsx
├── app/components/AppLayout
│   ├── TopBar
│   ├── Sidebar
│   └── BottomBar
├── modules/bookshelf/BookshelfPage
│   └── core/db/repository
├── modules/editor/EditorPage
│   ├── core/db/repository
│   ├── core/ai-engine (callLlm, agents)
│   └── core/truth-files/manager
├── modules/ai-collab/AICollabPage
│   ├── core/ai-engine (coordinator, workflowEngine, modes)
│   ├── core/pipeline (plan, write, audit)
│   └── core/events (eventBus)
├── modules/auto-pilot/AutoPilotPage
│   └── core/scheduler/auto-pilot
│       ├── core/ai-engine/agents (DirectorAgent)
│       ├── core/style/voice-profile (detectStyleDrift)
│       ├── core/scheduler/pid-guard
│       └── core/scheduler/disk-check
└── modules/style/StylePage
    └── core/style/voice-profile
```

### 核心层内部依赖

```
ai-engine/
├── providers.ts ←→ Tauri IPC (llm.rs)
├── resilience.ts → providers.ts, events, logger
├── agents/ → providers.ts, resilience.ts
├── coordinator.ts → agents/
├── workflow-engine.ts → coordinator, agents
└── modes/ → agents/, coordinator

pipeline/
├── plan/ → ai-engine/agents (PlannerAgent)
├── write/ → ai-engine/agents (WriterAgent)
└── audit/ → ai-engine/agents (AuditorAgent)

scheduler/
├── auto-pilot.ts → ai-engine/agents, style, pid-guard, disk-check, events
├── pid-guard.ts → Tauri IPC
└── disk-check.ts → Tauri IPC

truth-files/
├── manager.ts → schemas, db/truth-file-repository, logger
├── schemas.ts → zod
└── snapshot.ts → manager.ts
```

### 前端 NPM 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react` / `react-dom` | 19.x | UI 框架 |
| `react-router-dom` | 7.x | 路由 |
| `@tauri-apps/api` | 2.x | Tauri IPC |
| `@tiptap/react` / `@tiptap/pm` / `@tiptap/starter-kit` / `@tiptap/suggestion` | 3.x | 富文本编辑器 |
| `zustand` | 5.x | 状态管理 |
| `zod` | 4.x | Schema 校验 |
| `diff` | 9.x | Diff 对比 |
| `lucide-react` | 1.x | 图标库 |
| `class-variance-authority` | 0.7.x | CSS 变体 |
| `clsx` / `tailwind-merge` | 2.x / 3.x | 类名合并 |
| `shadcn` | 4.x | UI 组件库 |
| `tippy.js` | 6.x | 浮层定位 |

---

## 12. 项目运行方式

### 环境要求

- **Node.js** ≥ 18
- **Rust** ≥ 1.70（Tauri 2 要求）
- **系统依赖**：参考 [Tauri 2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 开发模式

```bash
cd novel-app

# 安装前端依赖
npm install

# 启动开发服务器（前端 + Rust 后端同时启动）
npm run tauri dev
```

此命令会：
1. 启动 Vite 开发服务器（`http://localhost:5173`）
2. 编译 Rust 后端
3. 启动 Tauri 桌面窗口

### 构建发布

```bash
# 构建生产版本
npm run tauri build
```

输出安装包位于 `src-tauri/target/release/bundle/`。

### 其他命令

```bash
npm run dev        # 仅启动前端开发服务器
npm run build      # 仅构建前端（tsc + vite build）
npm run lint       # ESLint 检查
npm run preview    # 预览构建结果
```

### 配置文件

| 文件 | 说明 |
|------|------|
| `vite.config.ts` | Vite 配置（React 插件 + Tailwind + 路径别名 `@`） |
| `tauri.conf.json` | Tauri 配置（窗口 1280x800、最小 1024x768、CSP 关闭） |
| `drizzle.config.ts` | Drizzle ORM 配置（SQLite、schema 路径） |
| `tsconfig.json` | TypeScript 配置 |
| `eslint.config.js` | ESLint 配置 |

---

## 13. 开发阶段与进度

> 详细会话日志见 [progress.md](progress.md)。

| 阶段 | 状态 | 里程碑 |
|------|------|--------|
| **Phase 0**：UI Shell 骨架 | ✅ 完成 | 应用能启动，完整布局和空壳页面 |
| **Phase 1**：书库 + 编辑器 + 真相文件 | ✅ 完成 | 创建书籍→编辑章节→自动保存 |
| **Phase 2A**：AI 辅助最小可用 | ✅ 完成 | LLM Provider 配置 + 单 Agent 续写 + 大纲 + 去 AI 味 |
| **Phase 2B**：编辑器专业打磨 | ✅ 完成 | 小说扩展 + 斜杠命令 + 版本历史 + AI 内联 + 全屏 |
| **Phase 3**：多 Agent + 审计 | ✅ 完成 | 6 Agent 管线 + 37 维度审计 + 审计-修订循环 |
| **Phase 4**：输入治理 + 真相文件 AI 更新 | ✅ 完成 | Plan→Compose→Write→Observe→Audit→Revise |
| **Phase 5**：蚁群 + 自动驾驶 + 风格 | ✅ 完成 | 蚁群 5 子模式 + 自动驾驶 + Voice Profile |
| **Phase 6**：导出 + 数据分析 + 打磨 | ✅ 完成 | TXT/MD/DOCX/EPUB/PDF + 分析 + 全局搜索 |
| **Phase 7**：高级功能 | ✅ 完成 | 角色卡 / 时间线 / 知识图谱 / 伏笔台账 / 张力图 / 插件 / WorldBible / 云同步 |
