# 参考框架深度分析文档

> 更新时间：2026-05-08（合并 V1 + V2）
> 调研范围：6 个目录、30+ 个开源项目
> 用途：每次新对话时读取此文件，了解可借鉴的 UI 设计、功能按钮、日志系统、自动化流程

---

## 总览：项目借鉴价值矩阵

| 项目 | 有 UI | UI 类型 | AI 架构 | 存储 | 借鉴价值 | 核心亮点 |
|------|-------|---------|---------|------|----------|----------|
| **inkos** | Web + TUI + CLI | React + shadcn | 10 agent 管线 | 文件+SQLite | ★★★★★ | 真相文件、输入治理、去AI味、守护进程 |
| **novel-engine** | Electron 桌面 | React + Tailwind | 7 agent 管线 | SQLite+文件 | ★★★★★ | 14阶段管线、Voice Profile、修订队列 |
| **PlotPilot** | Web | Vue 3 | 自动驾驶 | SQLite+FAISS | ★★★★★ | 自动驾驶、伏笔台账、张力监控、文风漂移告警 |
| **NovelForge** | Electron 桌面 | Vue 3 | 卡片+工作流 | SQLite+Neo4j | ★★★★☆ | @DSL上下文注入、Schema校验、拆书工作流 |
| **AI-Novel-Writing-Assistant** | Web | React | 自动导演 | Prisma+Qdrant | ★★★★☆ | 自动导演、写法引擎特征提取、整本生产链 |
| **web-novel-master** | 无（Skill包） | — | 4种创作模式 | — | ★★★★☆ | 26位作者文风库、爆款四法则、市场数据 |
| **webnovel-writer** | 无（Skill包） | — | Story System | — | ★★★★☆ | 追读力系统、37个题材模板、Hook追踪 |
| **dog-Engine** | Web | Next.js + shadcn | AI仿写 | — | ★★★★☆ | 多书源解析、AI率检测、前端直调AI |
| **WenShape** | Web | React | 卡片系统 | 纯文本 | ★★★☆☆ | 事实距离衰减、同人百科抓取、提案机制 |
| **ai-novelist（青烛）** | Electron | React + Redux | MCP+RAG | ChromaDB | ★★★☆☆ | MCP客户端、Hashline方案、类Cursor体验 |
| **claw-code（Rust）** | 终端CLI | Rust+crossterm | Agent harness | JSONL | ★★★★☆ | 40工具、插件系统、权限管道、Worker状态机 |
| **Claude Code（TS源码）** | 终端 | React+Ink | Agent引擎 | — | ★★★☆☆ | 46K行Agent代码、140终端组件、工具注册 |
| **蚁群多Agent** | Web | Vue 3 + Canvas | LangGraph | SQLite | ★★★★☆ | 5种工作流模式、SSE流式追踪、工作流可视化 |
| **AI_NovelGenerator** | 桌面 | PySimpleGUI | 向量检索 | 向量DB | ★★☆☆☆ | 角色动力学、伏笔管理、三维度世界构建 |
| **auto_novel_writer** | 桌面 | PyQt | WriterAgent+ReviewerAgent | SQLite | ★★☆☆☆ | 评分机制（30%风格+40%逻辑+30%细节） |
| **Humanizer-zh** | 无（Skill包） | — | 24种AI痕迹检测 | — | ★★★☆☆ | 中文AI痕迹检测、改写指南 |
| **thriller** | 无（Skill包） | — | 25+剧本理论 | — | ★★☆☆☆ | GEP自我进化、互动小说、分镜分解 |
| **Tiptap** | 编辑器框架 | ProseMirror | — | — | ★★★★★ | 扩展架构、协作编辑、Bubble菜单 |
| **Pretext** | 无（库） | — | — | — | ★★☆☆☆ | 高性能文本度量、CJK支持 |
| **OpenClaw** | 多平台 | 原生+Web | 网关架构 | — | ★★☆☆☆ | 多渠道、插件SDK、提示词缓存 |

---

## 一、TOP 5 重点项目详解

---

### 1. inkos（最成熟的小说 AI 写作框架）

**位置：** `可以借用的开源小说成熟框架/inkos-master/`

**技术栈：** TypeScript monorepo — core + cli（TUI）+ studio（Web UI）
- 前端：React 19 + shadcn + Tailwind + Zustand + Hono
- LLM：@mariozechner/pi-ai（统一 OpenAI/Anthropic 协议适配）
- 校验：Zod schema
- 导出：epub-gen-memory、marked

#### UI 描述

**Studio Web UI（`localhost:4567`）：**
```
┌──────────┬────────────────────────────────────┐
│  Sidebar │  主内容区                           │
│          │                                    │
│  书籍列表 │  Dashboard / ChatPage / BookDetail │
│  会话列表 │  TruthFiles / Analytics            │
│  导航菜单 │  DaemonControl / RadarView         │
│          │  GenreManager / StyleManager        │
└──────────┴────────────────────────────────────┘
```
- 14+ 页面：Dashboard、ChatPage、BookDetail、BookCreate、ChapterReader、Analytics、TruthFiles、DaemonControl、LogViewer、ServiceListPage、GenreManager、StyleManager、ImportManager、RadarView、DoctorView
- 支持深色/浅色主题，i18n 中英文双语

**TUI 终端仪表盘：**
- 顶部 Header + 中间对话区 + 底部输入框
- 支持 slash 命令自动补全
- 全键盘操作

#### 10 Agent 管线（核心写作流程）

```
Plan → Compose → Write → [Observer → Reflector → Normalizer] → Post-Validate → Audit → [Revise → Re-Audit] 循环
```

| Agent | 职责 |
|-------|------|
| **Radar** | 扫描市场趋势和读者偏好（可插拔） |
| **Planner** | 读取作者意图 + 焦点 → 产出 chapter-intent.md |
| **Composer** | 从真相文件编译上下文 + 规则栈 + trace |
| **Architect** | 建书时规划世界观、角色卡、伏笔池 |
| **Writer** | 基于精简上下文生成正文，内嵌字数治理 |
| **Observer** | 从正文提取 9 类事实变化 |
| **Reflector** | 输出 JSON delta → Zod 校验 → 写入真相文件 |
| **Normalizer** | 压缩/扩展字数到允许区间 |
| **Auditor** | 37 维度一致性检查 |
| **Reviser** | spot-fix / polish / rewrite / rework / anti-detect |

#### 真相文件系统（7 个 JSON 状态文件）

```
story/state/
├── current_state.json      # 世界状态
├── hooks.json              # 伏笔池
├── summaries.json          # 章节摘要
├── subplots.json           # 支线进度
├── emotional_arcs.json     # 情感弧线
├── character_matrix.json   # 角色交互矩阵
└── particle_ledger.json    # 资源账本
```
- JSON 为权威源，Markdown 为人类可读投影
- Zod schema 校验，坏数据直接拒绝

#### 可直接借鉴的设计

| 模式 | 说明 | 我们的用法 |
|------|------|-----------|
| 真相文件系统 | 7 个 JSON 状态文件，Zod 校验 | 小说世界观和角色状态管理 |
| 输入治理分离 | plan / compose / write 三步 | AI 写作管线设计 |
| 审计-修订循环 | critical 才触发修订，超限暂停 | 质量门控 |
| 去 AI 味 Prompt 工程 | 禁用句式 + 词汇疲劳表 + 风格指纹 | 从 prompt 层减少 AI 痕迹 |
| 守护进程 + Cron | 后台自动写章 + 雷达扫描 | 自动化创作 |
| Provider Bank | 35+ 服务商预设，按 Agent 路由 | 多模型接入 |
| 时序记忆 DB | SQLite 记录事实有效期 | 长篇小说上下文管理 |

---

### 2. novel-engine（最完整的桌面小说编辑器）

**位置：** `可以借用的开源小说成熟框架/novel-engine-0.7.0/`

**技术栈：** Electron 33 + React 18 + Zustand 5 + Tailwind CSS 4 + better-sqlite3 + Pandoc

#### UI 描述

**8 个主要视图：**
```
┌───────────────────────────────────────────────┐
│  TitleBar                                      │
├───────┬──────────────────────────┬─────────────┤
│Sidebar│  Main Content            │ Right Panel │
│       │                          │             │
│Book   │  Dashboard / Chat /      │ Pipeline    │
│Panel  │  Files / Build /         │ Tracker     │
│(书架) │  Settings / Statistics / │ (14阶段)    │
│       │  Pitch Room / Reading    │             │
│       │  Mode                    │             │
├───────┴──────────────────────────┴─────────────┤
│  ChatModal (可叠加) | RevisionQueue | CLI Activity │
└───────────────────────────────────────────────┘
```

- **Dashboard**：管线进度、字数、最近文件
- **Chat**：流式消息 + thinking blocks 可折叠
- **Files**：5 标签页（Source/Chapters/Agents/Explorer/Motif Ledger）
- **Pitch Room**：头脑风暴独立空间
- **Reading Mode**：无干扰纯阅读
- **Statistics**：Recharts 图表（token 用量、费用、字数趋势）
- 前端"全挂载+隐藏切换"模式（保持状态和滚动位置）

#### 14 阶段管线

```
Pitch → Scaffold → Draft → First Read → Structural Assessment →
Revision Plan → Revision → Second Read → Second Assessment →
Copy Edit → Fix Planning → Mechanical Fixes → Build → Publish & Audit
```

#### 7 Agent

| Agent | 角色 | Thinking Budget |
|-------|------|-----------------|
| **Spark** | 头脑风暴 | 4K |
| **Verity** | 代笔作家（唯一直接写散文的） | 10K |
| **Ghostlight** | 首读者（冷读反馈） | 6K |
| **Lumen** | 策划编辑（七维度诊断） | 16K |
| **Sable** | 文字编辑（语法/风格打磨） | 4K |
| **Forge** | 任务大师（综合修订计划） | 8K |
| **Quill** | 出版商（发布元数据） | 4K |

#### 关键架构模式

| 模式 | 说明 |
|------|------|
| **Clean Architecture 分层** | Domain ← Infrastructure ← Application ← IPC ← Renderer |
| **上下文预算感知** | TokenEstimator + 动态对话压缩，按 Agent 差异化保留轮次 |
| **Agent Prompt 组合式加载** | CORE.md 基础 + 阶段补充 prompt |
| **流式事件架构** | 统一 StreamEvent union type，持久化到 SQLite |
| **修订队列** | Forge 输出 JSON → Wrangler 解析 → 按序执行 |
| **Voice Profile** | 捕获作者风格，供 Verity 仿写 |
| **SHA-256 版本控制** | 文件内容去重，保留最近 50 版本 |
| **孤儿会话恢复** | 启动时检测中断 session |

---

### 3. PlotPilot 墨枢（最适合商业化的架构）

**位置：** `可以借用的开源小说成熟框架/PlotPilot-1.0.4/`

**技术栈：** Python FastAPI + Vue 3 + TypeScript + SQLite + FAISS（本地向量）
- 有 Tauri 桌面版 + Windows 一键启动包

#### 核心功能亮点

| 功能 | 说明 |
|------|------|
| **自动驾驶模式** | 后台持续生成章节，无需手动触发 |
| **伏笔台账** | 自动追踪并闭合叙事钩子 |
| **张力心电图** | 0-10 分实时监控故事张力 |
| **文风漂移告警** | 偏离时定向修写 |
| **知识图谱** | 自动提取故事三元组 |
| **风格分析** | 作者声音漂移检测 |
| **DDD 四层架构** | 领域驱动设计 |

#### 可借鉴

- 自动驾驶模式（后台 cron 循环）
- 伏笔台账的追踪和自动闭合
- 张力评分的实时可视化
- DDD 架构分层

---

### 4. claw-code Rust 重写（Agent Harness 架构参考）

**位置：** `rust重构Claudecode/claw-code-main/`

**技术栈：** Rust（48.5K 行代码）— 9 个 crate workspace

#### 无 GUI，纯 CLI，但有精心设计的终端渲染

- Markdown 流式渲染 + 代码语法高亮（syntect）
- Spinner 旋转加载动画
- rustyline 行编辑器 + Tab 补全

#### 9 层 crate 架构

```
CLI → Commands → Tools → Runtime → API → Plugins → Telemetry
```

#### 40 个工具的 Action Space

核心：bash, read/write/edit file, glob/grep search
高级：Agent（子代理）, Task 系列（后台任务）, Worker 系列（Worker 生命周期）, Team, Cron, MCP, LSP, Skill, Config, Plan Mode

#### 插件系统

```
PluginManifest {
  name, version, permissions,
  hooks: { PreToolUse, PostToolUse, PostToolUseFailure },
  tools: [PluginToolManifest],
  commands: [PluginCommandManifest]
}
```

#### 可借鉴

| 模式 | 说明 |
|------|------|
| **Tool Registry** | 三层来源（builtin/runtime/plugin），统一注册 |
| **Permission Pipeline** | Hook override → Policy → Enforcer → Prompter |
| **Hook 生命周期** | Pre/Post/PostFailure，可修改输入和覆盖权限 |
| **Worker 状态机** | Spawning → TrustRequired → Running → Finished/Failed |
| **会话工作区隔离** | 按工作区哈希命名空间，支持并行无冲突 |
| **会话压缩** | 自动检测 token 阈值，触发压缩 + 健康探测 |
| **结构化错误分类** | classify_error_kind() → 机器可读 token |

---

### 5. 蚁群多 Agent Playground（工作流可视化参考）

**位置：** `自研开源蚁群多智能agent源码/Multi-Agent-Playground-main/`

**技术栈：** Python FastAPI + Vue 3 + LangGraph + OpenAI SDK + Electron
- Canvas 绘制工作流图（非第三方图库）

#### 5 种工作流模式

| 模式 | 流程 | 适用场景 |
|------|------|----------|
| **SingleAgent** | 用户 → Agent → 回复 | 简单对话 |
| **Router-Specialists** | 用户 → Router → 专家 → Finalizer | 一个任务选一个专家 |
| **Planner-Executor** | 用户 → Planner → Validator → Dispatcher → Workers → Synthesizer | 复杂任务分解 |
| **Supervisor-Dynamic** | 用户 → Intake → Delegation → Worker → Review → 循环 | 多轮迭代 |
| **Peer-Handoff** | Agent → decide(continue/handoff/review/complete) → 循环 | 自主 agent |

#### UI 描述

**Playground 页面（核心交互）：**
```
┌──────────┬────────────────────┬───────────────┐
│ 工作流图  │   聊天交互          │  追踪面板      │
│          │                    │               │
│ Graph    │   ChatRunner       │  TraceViewer  │
│ Viewer   │   (SSE流式)        │  (实时事件)    │
│ (Canvas) │                    │               │
└──────────┴────────────────────┴───────────────┘
```
- GraphViewer：Canvas 绘制，支持拖拽、hover、运行时高亮活跃节点
- ChatRunner：SSE 流式输出 + Markdown 渲染
- TraceViewer：实时追踪每一步事件

#### 可借鉴

| 模式 | 说明 |
|------|------|
| **LangGraph StateGraph** | 节点是函数，边是路由，共享 State 对象通信 |
| **SSE 流式追踪** | threading + Queue + SSE，实时推送前端 |
| **工作流图可视化** | Canvas 绘制 + 运行时高亮 |
| **Validator 退回机制** | 低质量计划退回重规划 |
| **Peer Handoff** | Agent 自行决定下一步 + max_hops 防死循环 |
| **执行+决策分离** | 两步 LLM 调用：先做事，再决策 |
| **LLM Gateway 统一网关** | 统一调用层 + fallback + trace hook |
| **SkillHub 市场** | 技能可从市场同步安装 |

---

## 二、高价值功能参考清单

### AI 写作相关

| 功能 | 来源 | 说明 |
|------|------|------|
| **真相文件系统** | inkos | 7 个 JSON 状态文件 + Zod 校验 |
| **输入治理** | inkos | plan / compose / write 三步分离 |
| **审计-修订循环** | inkos | critical 触发，超限暂停 |
| **37 维度审计** | inkos | OOC/设定/战力/伏笔/节奏/AI痕迹等 |
| **去 AI 味 Prompt 工程** | inkos | 禁用句式 + 词汇疲劳表 + 风格指纹 |
| **时序记忆** | inkos | SQLite 记录事实有效期（valid_from/until chapter） |
| **自动驾驶** | PlotPilot | 后台持续生成，无需手动触发 |
| **伏笔台账自动闭合** | PlotPilot | 追踪并自动闭合叙事钩子 |
| **张力心电图** | PlotPilot | 0-10 分实时监控 |
| **文风漂移告警** | PlotPilot | 偏离时定向修写 |
| **Voice Profile** | novel-engine | 捕获作者风格供仿写 |
| **14 阶段管线** | novel-engine | 从 Pitch 到 Publish 的完整流程 |
| **上下文预算感知** | novel-engine | TokenEstimator + 动态压缩 |
| **修订队列** | novel-engine | 自动化修订执行 |
| **SHA-256 版本控制** | novel-engine | 内容去重，保留历史版本 |
| **@DSL 上下文注入** | NovelForge | 精确引用项目数据的语法 |
| **Schema-first** | NovelForge | JSON Schema 校验 AI 输出 |
| **拆书工作流** | NovelForge | 逆向工程已有小说 |
| **自动导演** | AI-Novel-Writing-Assistant | AI 接管从灵感→整本书 |
| **写法引擎** | AI-Novel-Writing-Assistant | 风格特征提取+绑定 |
| **追读力系统** | webnovel-writer | Hook/Cool-point/微兑现/债务追踪 |
| **26 位作者文风库** | web-novel-master | 天蚕土豆/辰东/猫腻/桐华等 |
| **爆款四法则** | web-novel-master | 爽点驱动/情绪波动/金句记忆/名场面 |
| **事实距离衰减** | WenShape | 越近的事实权重越高 |
| **AI 痕迹检测 24 种** | Humanizer-zh | 中文 AI 痕迹识别和改写 |
| **25+ 剧本理论** | thriller | McKee/Hitchcock/Christie 等 |

### UI/交互相关

| 功能 | 来源 | 说明 |
|------|------|------|
| **Tiptap 扩展架构** | Tiptap | 高度可插拔的编辑器框架 |
| **Bubble/Floating Menu** | Tiptap | 浮动工具栏交互 |
| **斜杠命令** | Novel | /command 快速插入 |
| **AI 自动补全** | Novel | Vercel AI SDK + useCompletion |
| **工作流图可视化** | 蚁群 | Canvas 绘制 + 运行时高亮 |
| **SSE 流式追踪面板** | 蚁群 | 实时追踪每步事件 |
| **Studio Web UI** | inkos | 14+ 页面的完整 Web 工作台 |
| **TUI 仪表盘** | inkos | 终端全屏交互 |
| **全挂载+隐藏切换** | novel-engine | 保持所有视图状态 |
| **ChatModal 浮窗** | novel-engine | 任何视图可调出聊天 |
| **多书源解析引擎** | dog-Engine | CSS/JS/JSONPath 混合规则 |
| **前端直调 AI** | dog-Engine | 隐私保护，无需后端 |

### 架构/工程相关

| 功能 | 来源 | 说明 |
|------|------|------|
| **Clean Architecture 分层** | novel-engine | Domain←Infra←App←IPC←Renderer |
| **Monorepo 分包** | inkos | core(纯逻辑) / cli(TUI) / studio(Web) |
| **Tool Registry 三层** | claw-code | builtin/runtime/plugin 统一注册 |
| **Permission Pipeline** | claw-code | Hook→Policy→Enforcer→Prompter |
| **Hook 生命周期** | claw-code | Pre/Post/PostFailure |
| **Worker 状态机** | claw-code | Spawning→Running→Finished |
| **会话压缩** | claw-code | 自动检测阈值+健康探测 |
| **Provider Bank** | inkos | 35+ 服务商预设 |
| **LLM Gateway** | 蚁群 | 统一调用层+fallback+trace |
| **LangGraph StateGraph** | 蚁群 | 节点=函数，边=路由，共享State |
| **5 种工作流模式** | 蚁群 | SingleAgent→Router→Planner→Supervisor→Peer |
| **执行+决策分离** | 蚁群 | 两步 LLM：先做事再决策 |
| **SQLite 增量迁移** | 蚁群 | _ensure_column 增量 schema |
| **Zustand 分片 Store** | inkos/novel-engine | 避免大 store 性能问题 |
| **Docker 桌面打包** | 多个 | Electron + PyInstaller / Tauri |
| **Pandoc 导出** | novel-engine | MD → DOCX/EPUB/PDF |
| **SHA-256 版本快照** | novel-engine | 内容去重的版本控制 |
| **孤儿会话恢复** | novel-engine | 启动时检测中断 session |

---

## 三、UI 布局参考汇总

### inkos Studio 布局
```
┌──────────┬────────────────────────────────────┐
│  Sidebar │  Dashboard / ChatPage / ...         │
│  书籍列表 │                                    │
│  会话列表 │  支持深色/浅色主题                   │
│  导航菜单 │  i18n 中英文                       │
└──────────┴────────────────────────────────────┘
```

### novel-engine 布局
```
┌───────────────────────────────────────────────┐
│  TitleBar                                      │
├───────┬──────────────────────────┬─────────────┤
│Sidebar│  Main (8个视图切换)       │ Right Panel │
│(书架) │  + ChatModal 浮窗叠加    │ (管线进度)   │
├───────┴──────────────────────────┴─────────────┤
│  右下角 HelperPanel | 左下角 CLI Activity        │
└───────────────────────────────────────────────┘
```

### 蚁群 Playground 布局
```
┌──────────┬────────────────────┬───────────────┐
│ 工作流图  │   聊天交互          │  追踪面板      │
│ (Canvas) │   (SSE 流式)       │  (实时事件)    │
└──────────┴────────────────────┴───────────────┘
```

### 我们的推荐布局
```
┌──────────────────────────────────────────────────┐
│  顶栏：Logo  书名  [模式切换]  [设置]  [主题]   │
├─────────┬────────────────────┬───────────────────┤
│ 侧边栏  │    主内容区         │   右侧面板        │
│ 书架    │  Tiptap 编辑器      │  大纲/AI报告      │
│ 卷/章   │                    │  上下文管理       │
│ 导航    │  + AI 聊天浮窗      │                   │
├─────────┴────────────────────┴───────────────────┤
│  底栏：字数统计  写作目标  自动保存状态           │
└──────────────────────────────────────────────────┘
```
- 融合了 novel-engine 的三栏布局 + inkos 的 Sidebar 书架 + 蚁群的右侧面板
- ChatModal 可在任何视图叠加调出

---

## 四、LLM 接入层参考

### 各项目接入方式对比

| 项目 | 方式 | 支持的 Provider |
|------|------|----------------|
| inkos | @mariozechner/pi-ai | 35+ 服务商预设，自动探测流式/非流式 |
| novel-engine | Claude CLI 子进程 + OpenAI 兼容 | Claude（默认）+ 任意 OpenAI 兼容 |
| claw-code | reqwest HTTP + SSE | Anthropic + OpenAI 兼容 |
| 蚁群 | OpenAI SDK | 任意 OpenAI 兼容（Kimi、GLM 等） |
| dog-Engine | 前端直调 | 豆包 AI + 任意前端可调的 API |

### 推荐方案

```
用户配置 → LLM Provider Manager（类似 inkos 的 Provider Bank）
         → 统一 LLM Client（类似 claw-code 的 ProviderClient trait）
         → 支持 OpenAI 格式 + Anthropic 格式 + 自定义
         → SSE 流式输出
```

---

## 五、Agent 角色参考库

综合所有项目，以下 Agent 角色最适合我们的三模式架构：

### 单 Agent 模式
- **全能 Writer**（灵感来自 inkos Writer + novel-engine Verity）

### 多 Agent 模式
- **Planner**（章节规划）← inkos Planner + novel-engine Spark
- **Writer**（正文生成）← inkos Writer + novel-engine Verity
- **Auditor**（质量审计）← inkos Auditor + novel-engine Lumen
- **Reviser**（修订润色）← inkos Reviser + novel-engine Sable
- **Coordinator**（协调调度）← novel-engine Forge

### 蚁群模式
- 多个轻量 Writer 实例 + 黑板（blackboard）共享状态
- 参考蚁群的 Peer-Handoff 模式

---

## 六、数据存储参考

| 项目 | 存储方案 | 特点 |
|------|----------|------|
| inkos | 文件（JSON+MD）+ SQLite 记忆 | 真相文件 JSON 为权威源 |
| novel-engine | SQLite + 文件系统 | 双层：SQLite 存元数据，文件存内容 |
| claw-code | JSONL 文件 | 按工作区哈希隔离 |
| 蚁群 | SQLite | 增量 schema 迁移 |
| PlotPilot | SQLite + FAISS | 向量检索 |
| NovelForge | SQLite + Neo4j | 知识图谱 |

### 推荐方案

```
SQLite（Drizzle ORM）—— 存书籍/章节/对话/设置等结构化数据
文件系统 —— 存真相文件、章节正文（Markdown）、AI 运行时产物
```
兼顾 inkos 的真相文件模式 + novel-engine 的 SQLite 元数据模式。

---

## 七、快速查阅索引

需要了解某个方面的细节时，直接去读对应源码：

### 想了解 UI 设计 →
- inkos Studio: `inkos-master/packages/studio/src/`
- novel-engine UI: `novel-engine-0.7.0/src/renderer/`
- 蚁群 Playground: `Multi-Agent-Playground-main/frontend/src/`

### 想了解 AI 管线 →
- inkos 管线: `inkos-master/packages/core/src/pipeline/`
- novel-engine 管线: `novel-engine-0.7.0/src/application/`

### 想了解 Agent 定义 →
- inkos Agents: `inkos-master/packages/core/src/agents/`
- novel-engine Agents: `novel-engine-0.7.0/agents/*.md`
- 蚁群 Workflows: `Multi-Agent-Playground-main/backend/app/workflows/`

### 想了解 LLM 接入 →
- inkos Provider Bank: `inkos-master/packages/core/src/llm/providers/`
- claw-code API: `claw-code-main/rust/crates/api/src/`
- 蚁群 Gateway: `Multi-Agent-Playground-main/backend/app/runtime.py`

### 想了解编辑器 →
- Tiptap 核心: `tiptap-main/`
- Novel 编辑器集成: `novel-main/src/`

### 想了解插件系统 →
- claw-code 插件: `claw-code-main/rust/crates/plugins/src/`
- claw-code Hook: `claw-code-main/rust/crates/runtime/src/hooks.rs`

### 想了解导出 →
- novel-engine Build: `novel-engine-0.7.0/src/application/BuildService.ts`
- inkos Export: `inkos-master/packages/core/src/`（epub-gen-memory）

---

# V2 新增：UI 布局 / 功能按钮 / 日志系统 / 全自动化

> 以下内容来自 2026-05-08 的深度调研，覆盖 cc-switch、AstrBot、claw-code、Multi-Agent-Playground、Tiptap、Novel、Claude Code、OpenClaw

---

## 一、UI 布局模式汇总

### 1.1 三栏布局（最通用）

| 项目 | 左栏 | 中栏 | 右栏 |
|------|------|------|------|
| **novel-engine** | Sidebar（书架+导航+260px可拖拽） | Main View（8种视图切换，CSS hidden 保持状态） | Pipeline Tracker + CLI Activity |
| **PlotPilot** | Chapter List（12%-30%可调） | WorkArea（编辑器+预览） | Settings Panel（Story Bible/伏笔/知识图谱/监控） |
| **NovelForge** | 卡片树导航 + 搜索 | 通用卡片编辑器 + 章节编辑器 | Context Panel + Outline + 关系图 |
| **Multi-Agent-Playground** | GraphViewer（Canvas 工作流图） | ChatRunner（SSE 流式对话） | TraceViewer（追踪日志） |

**novel-engine 关键设计**：所有 View 同时 mount，CSS `hidden` 切换，保持所有视图状态和滚动位置。

### 1.2 Sidebar 导航模式

| 项目 | 导航结构 | 特色 |
|------|----------|------|
| **inkos Studio** | 书籍导航 + 功能导航（14+ 页面） | hash 路由，ChatPage 作为右侧 AI 面板 |
| **novel-engine** | BookPanel + 底部导航组（可展开子项） | Chat 导航组包含 HotTake / AdhocRevision |
| **cc-switch** | 6-Tab 页式设置 + Provider 卡片列表 | Cmd+F 浮动搜索，毛玻璃效果 |
| **NovelForge** | 卡片类型列表 + 项目卡片树（el-tree） | 右键菜单（新建/重命名/引用/删除） |

### 1.3 顶栏/底栏设计

| 项目 | 顶栏内容 | 底栏/状态栏 |
|------|----------|------------|
| **inkos Studio** | Logo + 导航 + 主题切换 + 语言切换 | 无固定底栏 |
| **novel-engine** | Electron 自定义标题栏 | 字数统计 + 管线进度 + 保存状态 |
| **PlotPilot** | StatsTopBar（统计+LLM设置） | AutopilotDashboard（自动驾驶仪表盘） |
| **NovelForge** | 导航 + 设置入口 + 版本更新红点 | WorkflowStatusBar（全局后台运行状态） |
| **Multi-Agent-Playground** | Logo + 5导航 + 语言切换 + 状态指示器 | 无 |

---

## 二、功能按钮/操作体系汇总

### 2.1 AI 操作按钮组织方式

| 方式 | 项目 | 实现 |
|------|------|------|
| **QuickActions 弹出菜单** | novel-engine、inkos | 闪电图标 → 弹出浮层（Built-in + Saved 两个标签页）→ 选择后注入输入框 |
| **右键菜单** | NovelForge | 卡片节点右键 → 新建/重命名/引用/删除/结构编辑 |
| **Slash 命令** | inkos（15条）、claw-code（20+条） | `/write` `/audit` `/revise` `/export` 等，支持 Tab 补全 |
| **AI 聊天面板** | inkos Studio、novel-engine | 右侧/浮窗对话面板，自然语言操作 |
| **后端 SSE 推送** | PlotPilot | AI 操作结果通过 SSE 流式推送到前端组件 |
| **工作流系统** | NovelForge | 代码式 DSL 工作流 + 可视化编辑 + 触发器 |

### 2.2 关键操作按钮清单

**写作类：** AI 续写 / AI 润色 / AI 改写 / AI 审稿 / 去 AI 味

**管理类：** 新建书籍/章节/大纲节点 / 导出 / 保存/撤销 / 全局改名

**自动化类：** 启动自动驾驶 / 暂停/停止 / 紧急停止

### 2.3 操作反馈设计

| 反馈类型 | 实现方式 | 项目来源 |
|----------|----------|----------|
| **流式输出** | SSE 实时推送到编辑器/面板 | PlotPilot、Multi-Agent-Playground |
| **进度指示** | Pipeline Tracker（14阶段进度条） | novel-engine |
| **生成状态条** | 底部浮动条（生成中/已完成/错误） | 当前实现 |
| **Toast 通知** | 操作成功/失败的短暂提示 | 多个项目通用 |
| **错误横幅** | 全局错误 banner | Multi-Agent-Playground |

---

## 三、日志系统架构汇总

### 3.1 日志架构对比

| 项目 | 后端日志 | 前端查看 | 实时推送 | 格式 |
|------|----------|----------|----------|------|
| **AstrBot** | loguru + LogBroker（500条缓存） | ConsoleDisplayer（Vue） | SSE + 断线重连 | ANSI 颜色 + 结构化 |
| **claw-code** | JsonlTelemetrySink + SessionTracer | 无 Web UI（终端） | 无 | JSONL |
| **PlotPilot** | Python logging + log 文件 | tail_logs.py 脚本 | 无 | 文本 |
| **inkos** | inkos.log（JSON Lines） | CLI 日志查看 | 无 | JSON Lines |
| **novel-engine** | CLI Activity Panel（实时流式） | 内嵌面板 | 直接流式 | 结构化事件 |

### 3.2 AstrBot 日志架构详解（最佳参考）

```
标准 logging → _LoguruInterceptHandler → loguru
                                        ↓
                                   LogBroker（发布订阅）
                                   ├── 缓存: deque(maxlen=500)
                                   ├── 订阅者: register() → asyncio.Queue
                                   └── 推送: publish() → 所有订阅者
                                        ↓
                                   LogQueueHandler → SSE 推送
                                        ↓
                                   前端 ConsoleDisplayer
                                   ├── 连接 /api/live-log（SSE）
                                   ├── 断线重连（指数退避，max 30s，max 10次）
                                   ├── ANSII 颜色 → CSS 映射
                                   ├── 级别过滤（DEBUG/INFO/WARN/ERROR/CRIT）
                                   ├── 自动滚动（可关闭）
                                   └── 缓存管理（max 200条）
```

---

## 四、全自动化系统汇总

### 4.1 自动驾驶模式对比

| 项目 | 触发方式 | 循环机制 | 停止条件 | 恢复机制 |
|------|----------|----------|----------|----------|
| **inkos** | `inkos up` cron 调度 | Scheduler 定时执行管线 | PID 文件 / SIGINT | `inkos down` 停止 |
| **novel-engine** | UI 内 Auto-Draft 按钮 | 逐章循环（150次上限） | CLI 错误 / 手动停止 | Resume/Stop |
| **PlotPilot** | FastAPI 启动自动拉起 | Daemon 线程轮询 | 熔断器 / 手动停止 | 自动恢复（半开试探） |
| **NovelForge** | 工作流触发器 | 代码式 DSL 执行 | 手动暂停 | 暂停/恢复 |

### 4.2 PlotPilot 自动驾驶详解（最完善）

```
AutopilotDaemon.run_forever()
    ↓
熔断器检查 → OPEN? → 等待 reset_timeout
    ↓ CLOSED/HALF_OPEN
查询 autopilot_status=RUNNING 的小说
    ↓
逐本 _process_novel():
    ├── 状态机: MACRO_PLANNING → ACT_PLANNING → WRITING → AUDITING → PAUSED_FOR_REVIEW
    ├── WRITING: 节拍级幂等（断点续写），每拍写完立即落库
    ├── AUDITING: 章末审阅 + 文风漂移检测（>0.68 阈值 → 定向修写）
    └── PAUSED_FOR_REVIEW: auto_approve_mode? → 自动继续 / 暂停等确认

错误恢复:
    连续失败 3 次 → 单本挂起
    全局熔断器: 连续 5 次 → 暂停 120s → 半开试探
    每轮检查用户停止标志
```

### 4.3 claw-code 自动恢复配方（最详细的错误恢复）

| 故障场景 | 恢复步骤 | 升级策略 |
|----------|---------|---------|
| TrustPromptUnresolved | AcceptTrustPrompt | AlertHuman |
| PromptMisdelivery | RedirectPromptToAgent | AlertHuman |
| StaleBranch | RebaseBranch + CleanBuild | AlertHuman |
| CompileRedCrossCrate | CleanBuild | AlertHuman |
| McpHandshakeFailure | RetryMcpHandshake(5000ms) | Abort |
| PartialPluginStartup | RestartPlugin + Retry(3000ms) | LogAndContinue |
| ProviderFailure | RestartWorker | AlertHuman |

### 4.4 错误分类体系（claw-code 最完善）

**12 种 API 错误类型：** MissingCredentials / ContextWindowExceeded / ExpiredOAuthToken / Auth / InvalidApiKeyEnv / Http / Io / Json / Api / RetriesExhausted / InvalidSseFrame / BackoffOverflow

**9 种安全失败分类：** context_window / provider_auth / provider_rate_limit / provider_internal / provider_error / provider_transport / provider_retry_exhausted / runtime_io / request_size

---

## 五、编辑器 UI 组件参考

### 5.1 Tiptap Bubble Menu

- 基于 `@floating-ui/dom` 定位，middleware 链（flip/shift/offset/arrow）
- 默认 `placement: 'top'`, `offset: 8`
- Dismissed range 机制防止重复触发

### 5.2 Novel Headless 编辑器

- Headless 核心包 + Tailwind 示例分层
- tunnel-rat 解决编辑器内 Portal 渲染
- GenerativeMenuSwitch：AI 功能无缝嵌入 Bubble Menu
- cmdk 命令面板实现 Slash Command

### 5.3 cc-switch Provider 卡片

- 渐变背景层 + 边框颜色状态（绿/蓝/红）
- `group-hover:opacity-100` 操作按钮渐显
- 图标三级降级：SVG → URL → 首字母

### 5.4 OpenClaw Slash 命令

- 三级渐进展示：essential / standard / power
- 防止新手被复杂命令淹没

---

## 六、对 novel-app 的改进建议汇总

### UI 布局
1. 三栏布局 + 全挂载隐藏切换（novel-engine）
2. Sidebar 可折叠 260px + Cmd+F 搜索（cc-switch）
3. Provider 卡片渐变背景 + 悬停操作按钮（cc-switch）
4. 设置页 6-Tab + Accordion 折叠（cc-switch）

### 功能按钮
1. QuickActions 弹出菜单（novel-engine）
2. Bubble Menu + AI 子菜单（Tiptap + Novel）
3. Slash 命令 + Tab 补全（inkos / claw-code）
4. 操作反馈层级：即时→流式→进度→Toast

### 日志系统
1. LogBroker 发布订阅 + SSE（AstrBot）
2. ConsoleDisplayer 前端查看器（AstrBot）
3. 三层错误分类（claw-code）
4. 断线重连（指数退避 + Last-Event-ID）

### 自动化
1. 状态机 + 熔断器 + 节拍幂等（PlotPilot）
2. 7 种恢复配方（claw-code）
3. PID 文件 + 信号处理（inkos）
4. 自动恢复 + 半开试探（PlotPilot）
