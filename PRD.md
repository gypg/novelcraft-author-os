# 小说创作平台 - 产品需求文档（PRD）v5.2

> 更新时间：2026-05-08（v5.2 — 融入叙事约束系统、防幻觉机制、写法引擎、Diff 审查、上下文预算）
> 技术栈：Tauri 2 + React + TypeScript + Tiptap + SQLite
> 参考框架：inkos、novel-engine、claw-code、PlotPilot、Multi-Agent-Playground、Tiptap、NovelForge、cc-switch、AstrBot、cherry-studio、webnovel-writer、thriller-main、AI-Novel-Writing-Assistant、WenShape、web-novel-master、Humanizer-zh、dog-Engine

---

## 1. 产品概述

### 1.1 定位

**个人小说创作工具 + AI 小说工厂**

一款本地优先的小说创作平台，将 AI 能力深度整合进写作全流程。支持三种 AI 协作模式（单 agent / 多 agent / 蚁群），支持自动驾驶后台持续生成。本地存储，隐私安全。

### 1.2 目标用户

- 网文作者（日更连载，需要高效产出）
- 严肃文学创作者（注重结构和文笔打磨）
- AI 辅助写作爱好者（探索 AI 与创作的结合）
- 同人创作者
- 小说工作室（个人或小团队）

### 1.3 核心价值

1. **三模式 AI 引擎** — 单 agent（快/省）→ 多 agent（精）→ 蚁群（创），Coordinator 统一调度
2. **真相文件系统** — 7 个 JSON 状态文件作为唯一事实来源，Zod 校验，坏数据不滚雪球
3. **自动驾驶模式** — 后台持续生成章节，cron 调度 + 质量门控 + 通知推送
4. **本地优先** — SQLite + 文件系统，不依赖云服务，隐私可控
5. **模块化架构** — 每个功能模块独立，可插拔扩展，暴露标准化 ModuleDefinition 接口

---

## 2. 系统架构

### 2.1 技术栈

```
┌──────────────────────────────────────────────────┐
│               Tauri 2 (Rust 壳体)                 │
│  ┌──────────────────────────────────────────────┐ │
│  │          React 18 + TypeScript + Vite        │ │
│  │                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │ │
│  │  │ Tiptap   │ │ ChatPanel│ │ TruthFiles  │  │ │
│  │  │ 编辑器   │ │ AI 聊天  │ │ 真相文件    │  │ │
│  │  └──────────┘ └──────────┘ └─────────────┘  │ │
│  ├──────────────────────────────────────────────┤ │
│  │          AI Engine 层                        │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │ │
│  │  │单agent│ │多agent│ │蚁群  │ │ 自动驾驶   │  │ │
│  │  └──────┘ └──────┘ └──────┘ └───────────┘  │ │
│  │  Coordinator Agent + Workflow Engine         │ │
│  ├──────────────────────────────────────────────┤ │
│  │  Pipeline Engine（输入治理 + 审计修订循环）    │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  Plan → Compose → Write → Audit → Revise│ │ │
│  │  └────────────────────────────────────────┘  │ │
│  ├──────────────────────────────────────────────┤ │
│  │  数据层                                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │ │
│  │  │ SQLite   │ │ 文件系统  │ │ 时序记忆DB  │  │ │
│  │  │(元数据)  │ │(真相文件) │ │(事实有效期) │  │ │
│  │  └──────────┘ └──────────┘ └────────────┘  │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 桌面壳体 | Tauri 2 | 轻量、安全、Rust 性能 |
| 前端框架 | React 18 + TypeScript | 生态丰富、组件库选择多 |
| 富文本编辑器 | Tiptap 2（基于 ProseMirror） | 可扩展、headless、Bubble Menu |
| 样式 | Tailwind CSS + CSS Variables | 主题切换、快速开发 |
| UI 组件 | Radix UI + shadcn/ui | 无样式组件 + 预制主题 |
| 数据库 | SQLite（via Tauri plugin-sql） | 本地优先、零配置 |
| ORM | Drizzle ORM | 类型安全、轻量 |
| LLM 适配 | Vercel AI SDK（适配层） | 统一 OpenAI / Anthropic / 自定义接口 |
| 状态管理 | Zustand（分片 Store） | 轻量、避免大 store 性能问题 |
| 校验 | Zod | 真相文件 schema 校验，坏数据拒绝 |
| 导出 | Pandoc（通过 Tauri sidecar） | MD → DOCX/EPUB/PDF |
| 构建 | Vite | 快速 HMR |

### 2.3 模块化目录结构

```
src/
├── core/                        # 核心层（不可替换，零 UI 依赖）
│   ├── db/                      # Drizzle schema + 迁移
│   ├── ai-engine/               # AI 引擎抽象层
│   │   ├── providers/           # LLM Provider 注册（OpenAI/Anthropic/自定义）
│   │   ├── coordinator/         # Coordinator Agent
│   │   ├── modes/               # 三种模式实现
│   │   └── workflow-engine/     # 工作流编排引擎
│   ├── pipeline/                # 输入治理管线
│   │   ├── plan/                # Plan 阶段
│   │   ├── compose/             # Compose 阶段
│   │   ├── write/               # Write 阶段
│   │   ├── audit/               # 审计阶段
│   │   └── revise/              # 修订阶段
│   ├── truth-files/             # 真相文件系统（7 个 JSON 状态文件）
│   ├── temporal-memory/         # 时序记忆（SQLite facts with validity）
│   ├── settings/                # 全局设置（含 API Key 加密存储）
│   ├── events/                  # 事件总线（模块间通信）
│   └── scheduler/               # 自动驾驶 Cron 调度器
│
├── modules/                     # 功能模块（可独立开发/测试）
│   ├── bookshelf/               # 书库管理
│   ├── editor/                  # Tiptap 写作编辑器
│   ├── ai-collab/               # AI 协作面板（聊天 + 审稿报告）
│   ├── truth-files-ui/          # 真相文件可视化编辑器
│   ├── auto-pilot/              # 自动驾驶控制面板
│   ├── analytics/               # 数据分析（字数趋势、token 用量）
│   ├── export/                  # 导出发布
│   ├── style/                   # 文风分析与仿写
│   └── theme/                   # 主题系统
│
├── shared/                      # 共享组件和工具
│   ├── components/              # 通用 UI 组件
│   ├── hooks/                   # 公共 hooks（useSSE, useStream 等）
│   └── utils/                   # 工具函数
│
└── app/                         # 应用壳体（路由、布局、导航）
```

**模块间通信规则：**
- 模块之间**禁止直接 import**
- 通过事件总线（EventBus）或核心层服务通信
- 每个模块暴露标准化的 `ModuleDefinition` 接口
- `core/` 层无 UI 依赖，可被任何前端入口复用（参考 inkos 的 monorepo 分包策略）

---

## 3. 真相文件系统（Truth Files）

> 灵感来源：inkos 的 7 个真相文件 + novel-engine 的 story bible

### 3.1 设计原则

- **唯一事实来源**（Single Source of Truth）：所有 AI agent 的输入从真相文件编译，不各自拼装 prompt
- **JSON 为权威源**：AI agent 输出 JSON delta → Zod schema 校验 → immutable apply → 写入真相文件
- **Markdown 为人类投影**：真相文件同时渲染为 Markdown 供用户查看/编辑
- **坏数据不滚雪球**：校验失败直接拒绝，不写入真相文件

### 3.2 七个真相文件

```
books/<bookId>/story/state/
├── current_state.json       # 世界状态（地理位置、时间、天气等）
├── hooks.json               # 伏笔池（已埋/待回收/已回收）
├── summaries.json           # 章节摘要（每章一段）
├── subplots.json            # 支线进度（支线名/状态/关联章节）
├── emotional_arcs.json      # 情感弧线（角色→情绪→强度→章节）
├── character_matrix.json    # 角色交互矩阵（角色A↔角色B 关系+状态）
└── particle_ledger.json     # 资源账本（物品/能力/货币等可数资源）
```

### 3.3 数据流

```
Agent 输出 JSON delta
    ↓
Zod schema 校验（StateValidator）
    ↓ 通过
applyRuntimeStateDelta() — immutable 更新
    ↓
写入真相文件 JSON
    ↓ 同步
渲染 Markdown 投影（供 UI 显示）
    ↓
更新时序记忆 DB（记录 valid_from_chapter）
```

### 3.4 叙事约束系统（Contract System）

> 灵感来源：webnovel-writer 的合同驱动架构 + thriller-main 的知识状态追踪

**设计理念：** 真相文件追踪"事实是什么"，约束系统追踪"什么被允许/禁止"。

#### 3.4.1 四层约束架构

```
MASTER_SETTING（全局约束）
├── 世界观规则（魔法体系、科技水平、社会结构）
├── 核心承诺（读者预期，不能违背的承诺）
├── 禁区清单（绝不出现的元素）
└── 叙事基调（整体风格、尺度、禁忌话题）

VOLUME CONTRACT（卷级约束）
├── 本卷必须完成的叙事节点
├── 禁止提前揭示的信息
├── 本卷引入的新角色/势力
└── 本卷的情感走向

CHAPTER CONTRACT（章级约束）
├── 本章必须包含的场景
├── 禁止的行为（如"不能在此章杀死角色A"）
├── 必须回应的伏笔
└── 预期字数范围

REVIEW CONTRACT（审查标准）
├── 哪些维度必须通过（critical/warning/info）
├── 自定义检查规则
└── 质量阈值
```

#### 3.4.2 知识状态追踪

> 灵感来源：thriller-main 的角色知识矩阵 + 读者知识层

**角色知识矩阵：** 每个角色在每章知道什么

```typescript
interface KnowledgeState {
  characterId: string
  chapterNumber: number
  knownFacts: string[]        // 确知的事实
  speculatedFacts: string[]   // 推测的事实
  believedFalse: string[]     // 误信的虚假信息
  unknownFacts: string[]      // 尚不知道但读者已知的事实
}
```

**读者知识层：** 读者在不同阶段的信息状态
- **确知**：读者明确知道的事实
- **推测**：读者有依据的猜测
- **误信**：叙述者误导读者相信的虚假信息
- **不知**：读者尚不知道的信息（悬念来源）

**AI 写作时注入：** Writer Agent 的 prompt 中包含当前角色的知识状态，确保角色不会"知道不该知道的事"。

#### 3.4.3 约束校验流程

```
AI 生成章节草稿
    ↓
约束校验器
    ├── 全局约束检查：是否违反 MASTER_SETTING？
    ├── 卷级约束检查：是否违反当前卷的约束？
    ├── 章级约束检查：是否违反本章的合同？
    ├── 知识状态检查：角色是否"知道不该知道的事"？
    ├── 约束饱和检查：是否有未闭合的假设？
    └── 临时发明检测：AI 引入的新元素是否合理？
    ↓
通过 → 继续
不通过 → 标记违规 + 建议修复 → Reviser Agent 修复
```

---

## 4. 输入治理管线（Input Governance）

> 灵感来源：inkos 的 plan/compose/write 三步分离

### 4.1 三步分离原则

| 阶段 | 输入 | 输出 | 谁执行 |
|------|------|------|--------|
| **Plan** | 作者意图 + 当前焦点 + 记忆检索 | chapter-intent.md（目标/必须保留/必须避免） | Planner Agent |
| **Compose** | 真相文件全量 | context.json + rule-stack.yaml + trace.json | Composer Agent |
| **Write** | 精简后的上下文 + 规则栈 + 风格指南 | 章节正文草稿 | Writer Agent |

**核心理念：** "写什么"（intent）和"怎么写"（context + rules）分开编译，每步可独立检查、调试和覆写。不把所有上下文塞进一个巨型 prompt。

### 4.2 输入治理控制面

```
author_intent.md     — 长期意图（我想要什么样的故事）
current_focus.md     — 近期关注（这几章的重点是什么）
                     ↓
    plan chapter 编译上述两份 + 记忆检索
                     ↓
    chapter-intent.md（本章目标、冲突处理）
                     ↓
    compose chapter 编译全量真相文件
                     ↓
    context.json（精简上下文）
    rule-stack.yaml（优先级规则栈）
    trace.json（编译轨迹，可追溯）
                     ↓
    write 消费上述产物
```

---

## 5. AI 引擎设计

### 5.1 三模式架构 + 自动驾驶

```
用户请求 / Cron 触发
         ↓
    Coordinator Agent
    （意图解析 + 模式路由 + 上下文管理）
         ↓
    ┌────────┼──────────┬──────────┐
    ↓        ↓          ↓          ↓
  单 Agent  多 Agent   蚁 群    自动驾驶
```

### 5.2 模式 A：单 Agent

- **场景**：快速续写、简单润色、问答、大纲生成
- **架构**：单一 LLM 调用，完整上下文一次注入
- **上下文构建**（参考 novel-engine ContextBuilder）：
  - Token 预估器 → 动态对话压缩（根据剩余预算决定保留多少轮次）
  - 每个 Agent 有 read guidance（alwaysRead / readIfRelevant / neverRead）
- **优势**：响应快、成本低、简单可控

### 5.3 模式 B：多 Agent 分工

> 灵感来源：novel-engine 7 Agent + inkos 10 Agent 管线，取最佳实践

**6 Agent 分工：**

| Agent | 角色 | 职责 | 参考来源 |
|-------|------|------|----------|
| **Planner** | 大纲规划 | 结构、节奏、冲突设计 | inkos Planner + novel-engine Spark |
| **Writer** | 正文生成 | 模仿指定风格写作 | inkos Writer + novel-engine Verity |
| **Observer** | 事实提取 | 从正文提取 9 类事实变化 | inkos Observer |
| **Auditor** | 质量审计 | 37 维度一致性检查 | inkos ContinuityAuditor + novel-engine Lumen |
| **Reviser** | 修订润色 | spot-fix / polish / rewrite / anti-detect | inkos Reviser + novel-engine Sable |
| **Director** | 协调导演 | 合并输出、决策工作流走向 | novel-engine Forge |

**完整管线（8 阶段）：**

```
Plan → Compose → Write → [Observer→Reflector] → Audit → [Revise→Re-Audit] 循环 → Finalize
```

**审计-修订循环（质量门控）：**

```
Audit 输出问题列表
    ↓
分类：critical / warning / info
    ↓
IF 有 critical：
    ↓
    Reviser 修复（spot-fix / polish / rewrite）
    ↓
    Re-Audit（再次审计）
    ↓
    循环直到 critical 清零
    ↓
    超过最大重试次数（默认 3 次）→ 暂停，等待人工介入
    ↓
IF 通过：
    ↓
    Status: "ready-for-review" → 通知推送
```

### 5.4 模式 C：蚁群

> 灵感来源：Multi-Agent-Playground 的 5 种工作流模式

**5 种蚁群子模式（用户可选）：**

| 子模式 | 流程 | 适用场景 |
|--------|------|----------|
| **Router** | Router → 最佳专家 → Finalizer | 一个任务选一个专家 |
| **Planner-Executor** | Planner → Validator → Dispatcher → Workers → Synthesizer | 复杂任务分解，Validator 可退回重规划 |
| **Supervisor-Dynamic** | Intake → Delegation → Worker → Review → 循环 | 多轮迭代，动态分配 |
| **Peer-Handoff** | Agent → decide(continue/handoff/review/complete) → 循环 | 自主 agent，Agent 自行决定下一步 |
| **Emergent** | 多个轻量 Writer + 共享黑板（blackboard） | 纯创意发散，涌现行为 |

**关键机制（来自蚁群项目）：**
- **Validator 退回**：低质量计划退回重规划，不直接执行
- **执行+决策分离**：先做事，再决策（两步 LLM 调用，提高输出质量）
- **max_hops 限制**：防止无限循环
- **Repair Layer**：LLM 返回无效 JSON 时自动修复

### 5.5 模式 D：自动驾驶

> 灵感来源：PlotPilot 自动驾驶 + inkos 守护进程

- **触发方式**：用户点击"启动自动驾驶" 或 cron 定时
- **后台循环**：Plan → Compose → Write → Audit → Revise → 下一章
- **质量门控**：
  - 连续失败 3 次 → 自动暂停
  - 每日章数上限（可配置）
  - 失败维度聚类分析
- **状态监控**：实时进度、当前阶段、token 用量
- **通知推送**：每章完成 / 暂停 / 出错时推送
- **PID 防重入**：防止多个自动驾驶实例同时运行

### 5.6 Coordinator Agent

- **角色**：所有 AI 请求的统一入口
- **意图解析**（参考 inkos InteractionRuntime）：
  - 自然语言 → 结构化 InteractionRequest（Zod 校验）
  - 支持 slash 命令（`/write`、`/review`、`/outline`、`/audit`）
  - 支持自然语言（"帮我写下一章"、"检查第 5 章的设定一致性"）
- **模式路由**：根据当前模式 + 意图选择执行路径
- **上下文管理**：管理对话历史、真相文件引用、时序记忆查询

### 5.7 LLM 接入层

> 灵感来源：inkos Provider Bank + claw-code ProviderClient

**Provider Bank（服务商预设）：**

```typescript
interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  models: string[];
  compat: {
    supportsStreaming: boolean;
    supportsThinking: boolean;
    maxContextWindow: number;
  };
}

// 内置预设（参考 inkos 的 35+ 服务商）
内置支持：
- Anthropic: Claude Sonnet / Opus / Haiku
- OpenAI: GPT-4o / GPT-4.1 / o3
- 自定义: 任意 OpenAI 兼容接口（Ollama、vLLM、DeepSeek 等）
```

**多模型路由（按 Agent 粒度）：**
- Writer Agent → 可用最强模型（Claude Opus / GPT-4o）
- Auditor Agent → 可用高推理模型
- Observer Agent → 可用轻量模型（节省成本）
- 用户可在设置中为每个 Agent 角色单独配置模型

### 5.8 去 AI 味工程

> 灵感来源：inkos anti-AI-tell prompt 工程 + Humanizer-zh 检测规则

**从 prompt 层消除 AI 痕迹（Writer Agent 内置）：**
- 禁用句式列表（"在这个充满...的世界里"、"值得一提的是" 等）
- 词汇疲劳词表（避免重复使用 AI 偏好词汇）
- 风格指纹注入（从参考文本提取的统计特征）
- 字数治理（保守型字数管理，自动推导允许区间）

**后验检测（审计阶段）：**
- 段落长度漂移检测
- 跨章重复检测（同构检测、标题聚集检测）
- AI 痕迹评分（参考 Humanizer-zh 的 24 种痕迹模式）

### 5.9 文风系统（Voice Profile + 写法引擎）

> 灵感来源：novel-engine Voice Profile + inkos StyleAnalyzer + AI-Novel-Writing-Assistant 写法引擎 + web-novel-master 26 位作者文风库

**双层文风系统：**

#### Layer 1: Voice Profile（统计指纹）
- **分析阶段**：用户提供参考文本 → 提取统计指纹（句长分布、词频、节奏模式、对话比例）
- **存储**：`voice-profile.json`（向量化指纹）
- **应用**：Writer Agent 写作时注入风格指纹
- **漂移检测**：Auditor 检测实际输出是否偏离目标风格（参考 PlotPilot 文风漂移告警）

#### Layer 2: 写法引擎（技法标签）
- **技法提取**：参考 5.13 节写法引擎
- **与 Voice Profile 的关系**：
  - Voice Profile = **宏观风格**（整体感觉）
  - 写法引擎 = **微观技法**（具体手法）
  - 两者同时注入 Writer Agent，Voice Profile 控制整体方向，写法引擎控制具体执行

#### 预设文风库（参考 web-novel-master 26 位作者）

| 赛道 | 代表作者 | 核心技法 |
|------|---------|---------|
| 玄幻修仙 | 天蚕土豆、辰东、忘语 | 短句密集、升级爽感、金手指明确 |
| 都市异能 | 我吃西红柿、鱼人二代 | 节奏明快、冲突密集、反转多 |
| 现代言情 | 顾漫、桐华 | 情感细腻、对话精彩、细节丰富 |
| 悬疑推理 | 南派三叔、天下霸唱 | 伏笔深远、节奏紧凑、悬念管理 |
| 历史架空 | 月关、孑与2 | 知识密度高、考据严谨 |

### 5.10 时序记忆

> 灵感来源：inkos SQLite 时序记忆

```
facts 表：
- subject（主语）
- predicate（谓语）
- object（宾语）
- valid_from_chapter（从第几章生效）
- valid_until_chapter（到第几章失效，null=仍然有效）
```

**解决长篇小说核心问题：** "角色在第 5 章知道什么？""第 10 章时某某物品在哪？"
- Planner Agent 可精确查询特定章节的事实状态
- 避免全量注入导致上下文膨胀
- 每章写完后 Observer 提取的事实自动写入时序记忆

### 5.11 防幻觉机制

> 灵感来源：webnovel-writer 防幻觉三定律 + thriller-main 约束饱和检查

**五层防护：**

| 层级 | 机制 | 检查内容 |
|------|------|----------|
| **L1 大纲约束** | AI 输出必须符合已确认的大纲节点 | 是否偏离大纲方向 |
| **L2 设定一致性** | AI 不能违背已建立的世界观规则 | 是否违反魔法/科技/社会规则 |
| **L3 发明标记** | AI 引入的新元素必须被标记和审核 | 是否有未授权的新角色/物品/地点 |
| **L4 约束饱和** | 自动检测未闭合的假设 | 是否有悬而未决的设计问题 |
| **L5 临时发明检测** | 区分合理扩展 vs 危险编造 | 新元素的合理性评估 |

**L3 发明标记详细流程：**
```
AI 引入新元素（角色/物品/地点/事件）
    → Observer 检测到新实体
    → 对比真相文件，确认是否为"发明"
    → 如果是发明：
        ├── 合理扩展（在已有设定框架内的自然延伸）→ 自动接受，更新真相文件
        └── 危险编造（违反设定或与已有信息矛盾）→ 标记为 pending_review → 用户确认
```

**L4 约束饱和检查：**
- 检查每个已建立的伏笔是否有回收计划
- 检查每个角色是否有明确的目标和动机
- 检查世界观规则是否有自相矛盾
- 输出"饱和度报告"：哪些约束已闭合，哪些仍有缺口

### 5.12 上下文预算管理

> 灵感来源：WenShape 上下文选择引擎 + AI-Novel-Writing-Assistant 上下文管理

**核心问题：** LLM 上下文窗口有限，不能把所有信息都塞进去。需要智能选择最有价值的上下文。

**上下文分层：**

| 层级 | 内容 | 注入方式 | Token 占比 |
|------|------|----------|-----------|
| **核心设定** | MASTER_SETTING + 当前卷/章合同 | 常驻注入 | ~20% |
| **近期相关** | 前 2-3 章内容 + 真相文件相关部分 | 动态选择 | ~30% |
| **历史检索** | 按相关性从时序记忆中检索 | BM25 + 距离衰减 | ~20% |
| **对话历史** | 当前会话的对话记录 | 动态压缩 | ~15% |
| **生成预留** | 为 AI 输出保留的空间 | 静态预留 | ~15% |

**相关性检索（BM25 + 距离衰减）：**
```
用户请求："写第 10 章，主角进入废弃工厂"
    ↓
从时序记忆中检索相关事实：
    - "废弃工厂" 出现在第 3 章（距离衰减：近）→ 高权重
    - "主角装备" 在第 8 章更新（距离衰减：近）→ 高权重
    - "世界观规则-工厂区" 是常驻设定 → 常驻注入
    - "第 1 章伏笔-工厂秘密" 距离远但关联强 → 中权重
    ↓
按 token 预算选择 top-N 相关事实
    ↓
组装上下文 prompt
```

**预算控制算法：**
1. 分配固定预算给各层（核心20% / 近期30% / 检索20% / 对话15% / 预留15%）
2. 每层内按相关性排序，取 top-N 直到填满该层预算
3. 如果某层未满，剩余预算分配给相邻层
4. 总计不超过 maxContextTokens - responseMaxTokens

### 5.13 写法引擎（Writing Formula Engine）

> 灵感来源：AI-Novel-Writing-Assistant 写法引擎 + web-novel-master 26 位作者文风库

**与 Voice Profile 的区别：**
- Voice Profile 提取**统计特征**（句长分布、词频、节奏模式）
- 写法引擎提取**技法标签**（具体的写作手法和策略）

**技法提取流程：**
```
用户提供参考文本
    ↓
技法提取 Agent 分析
    ├── 句法技法：短句密集推进 / 长句舒缓铺陈 / 对话碎片化
    ├── 叙事技法：视角切换频率 / 时间跳跃方式 / 信息投喂节奏
    ├── 情感技法：间接表达为主 / 环境烘托 / 行为暗示
    ├── 结构技法：场景切换节奏 / 章末钩子类型 / 伏笔埋设方式
    └── 对话技法：口语化程度 / 潜台词密度 / 打断/省略使用
    ↓
输出写法配方（WritingFormula）
    ↓
绑定到 Writer Agent 的 prompt 中
```

**写法配方数据结构：**
```typescript
interface WritingFormula {
  id: string
  name: string
  sourceText: string        // 参考文本来源
  techniques: {             // 技法标签
    syntax: string[]        // 句法技法
    narrative: string[]     // 叙事技法
    emotion: string[]       // 情感技法
    structure: string[]     // 结构技法
    dialogue: string[]      // 对话技法
  }
  antiPatterns: string[]    // 应避免的模式
  targetGenre: string       // 适用题材
}
```

**技法库预设（参考 web-novel-master）：**
- **天蚕土豆式**：短句密集、升级爽感、金手指明确
- **辰东式**：宏大世界观、伏笔深远、节奏沉稳
- **猫腻式**：对话精彩、人物鲜明、情节巧妙
- **桐华式**：情感细腻、虐心设计、回忆穿插

---

## 6. 模块详细需求

### 6.1 书库管理（Bookshelf）

**功能：**
- 创建/编辑/删除书籍
- 书籍元数据：标题、作者、题材、标签、封面、简介、状态（连载中/已完结/暂停）
- 书籍列表视图：卡片式 / 列表式切换
- 筛选与搜索：按题材、标签、状态
- 最近编辑排序
- **题材预设**（参考 inkos 15 种 genre profile）：玄幻、仙侠、都市、科幻、悬疑、恐怖、历史、言情、武侠、LITRPG 等

**数据模型：**
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  genre: string[];        // 题材标签
  tags: string[];
  cover?: string;
  synopsis: string;
  status: 'ongoing' | 'completed' | 'paused';
  wordCount: number;
  targetDailyWords?: number;  // 日更目标
  createdAt: Date;
  updatedAt: Date;
}

interface Chapter {
  id: string;
  bookId: string;
  title: string;
  volumeId?: string;
  orderIndex: number;
  content: string;         // Tiptap JSON
  wordCount: number;
  status: 'draft' | 'reviewed' | 'final' | 'ai-generated';
  aiAuditScore?: number;   // AI 审计评分（0-100）
  createdAt: Date;
  updatedAt: Date;
}

interface Volume {
  id: string;
  bookId: string;
  title: string;
  orderIndex: number;
}
```

### 6.2 写作编辑器（Editor）

**功能：**
- **Tiptap 富文本编辑**
  - 基础格式：标题、段落、粗体、斜体、引用、列表
  - 小说专用扩展（自定义 Tiptap Node）：对话高亮、场景分隔符、内心独白样式
  - 斜杠命令菜单（参考 novel-main 的 slash-command 扩展）
- **章节管理**
  - 左侧边栏：卷 → 章节树形结构
  - 拖拽排序
  - 快速新建/删除
- **大纲视图**
  - 右侧面板：当前章节大纲
  - 与正文双向联动
- **AI 内联操作**
  - 选中文本 → Bubble Menu → AI 操作（续写/改写/润色/翻译/去 AI 味）
  - AI 输出以 diff 形式展示，支持接受/拒绝
  - 参考 novel-main 的 AI Selector 组件
- **自动保存**（防抖 2s）+ **版本历史**（SHA-256 内容去重，保留 50 版本）
- **字数统计**：实时（当前章/全书）+ 写作目标追踪

### 6.3 AI 协作面板（AI Collab）

**功能：**
- **聊天面板**
  - 与 Coordinator Agent 自然语言对话
  - SSE 流式输出 + Markdown 渲染
  - slash 命令体系（`/write` `/review` `/outline` `/audit` `/revise` `/status`）
  - 对话历史持久化到 SQLite
- **模式切换**
  - 顶栏快速切换：单 Agent / 多 Agent / 蚁群
  - 蚁群子模式选择（Router / Planner-Executor / Supervisor / Peer / Emergent）
  - 当前模式状态指示器（显示活跃 Agent 和进度）
- **审稿报告 + Diff 审查**
  - 37 维度审计结果可视化
  - 问题严重度分级：critical（红）/ warning（黄）/ info（蓝）
  - 点击问题跳转到对应文本位置
  - 审计通过率趋势图
  - **Diff 审查模式**（参考 WenShape + NovelForge）：
    - AI 审计发现问题 → 生成具体修改建议（不是抽象描述，而是"把第3段改成..."）
    - 以 Diff 视图展示（删除线 + 新增内容）
    - 用户点击「接受」或「拒绝」
    - 接受的内容直接应用到编辑器（通过 Tiptap Transaction）
    - 拒绝的内容标记为"已审核-不修改"
  - **批量操作**：全选接受/全选拒绝/逐条审核
- **约束状态面板**
  - 显示当前卷/章的约束满足情况
  - 约束饱和度进度条（已闭合/未闭合比例）
  - 临时发明列表（pending_review 状态）
  - 知识状态矩阵（角色 × 章节 知道什么）
- **上下文管理**
  - 当前章节 + 按相关性检索的历史章节
  - 真相文件引用状态（哪些文件被加载）
  - 时序记忆查询面板
  - **上下文预算可视化**（显示各层 token 占用比例）

### 6.4 真相文件编辑器（Truth Files UI）

> 灵感来源：inkos TruthFiles 页面

- 7 个真相文件的可视化编辑器
- JSON 和 Markdown 双视图切换
- 编辑时实时 Zod 校验，错误高亮
- 章节状态快照（可回滚到任意章节的状态）
- 实体全局改名（扫描所有真相文件 + 章节，一次替换）

### 6.5 自动驾驶控制面板（Auto-Pilot）

> 灵感来源：PlotPilot 自动驾驶 + inkos DaemonControl

- 启动/停止自动驾驶
- 当前进度：第 X 章 / 共 Y 章
- 实时日志：当前阶段、token 用量
- 质量门控状态：连续成功/失败次数
- 每日章数设置 + 章节字数范围
- 暂停条件配置
- 通知推送设置

### 6.6 数据分析（Analytics）

> 灵感来源：novel-engine Statistics + inkos Analytics

- 字数趋势图（日/周/月）
- token 用量和费用估算
- 审计通过率趋势
- 高频问题统计
- 章节质量排名
- AI 模型使用分布

### 6.7 导出发布（Export）

> 灵感来源：novel-engine BuildService + Pandoc

- **导出格式**：TXT / Markdown / DOCX / EPUB / PDF
- **导出范围**：单章 / 多章 / 全书
- **模板系统**：
  - 排版模板（字体、行距、页边距）
  - 平台预设（起点/番茄/晋江/Kindle 格式模板）
- **一键复制**：适配各平台格式到剪贴板
- **构建流程**（参考 novel-engine）：章节 → 拼接 Markdown → Pandoc 转换

---

## 7. UI 设计规范（基于参考项目提炼）

> 参考来源：cc-switch（Provider 卡片）、novel-engine（三栏布局+全挂载）、inkos（Sidebar+AI 面板）、PlotPilot（自动驾驶仪表盘）、NovelForge（卡片树+右键菜单）、Tiptap（Bubble Menu）、Novel（Headless 编辑器 UI）

### 7.1 主题系统

三套内置主题，CSS Variables 驱动：

| 主题 | 背景 | 文字 | 卡片 | 适用场景 |
|------|------|------|------|----------|
| **极简白** | #FFFFFF | #1A1A1A | #F5F5F5 | 日间使用 |
| **深色专业** | #1A1A1A | #E0E0E0 | #2D2D2D | 夜间/专注写作 |
| **暖色护眼** | #FFF8F0 | #3D3229 | #FFF0E0 | 长时间写作 |

### 7.2 三栏主布局（对齐 novel-engine）

```
┌──────────────────────────────────────────────────────────┐
│  顶栏：Logo  书名  [AI模式切换 ▾]  [自动驾驶]  [⚙] [☾] │
├─────────┬──────────────────────┬─────────────────────────┤
│ Sidebar │     主内容区          │    右侧面板              │
│ (260px  │                      │    (320px)              │
│  可折叠)│  ┌────────────────┐  │  ┌─────────────────┐   │
│         │  │  Tiptap 编辑器  │  │  │ 大纲/审计/上下文 │   │
│  书架   │  │  (全挂载+隐藏   │  │  │ (Tab 切换)       │   │
│  导航   │  │   切换)         │  │  └─────────────────┘   │
│  分组   │  └────────────────┘  │                         │
│         │  ┌────────────────┐  │                         │
│         │  │ AI 浮窗(可展开) │  │                         │
│         │  └────────────────┘  │                         │
├─────────┴──────────────────────┴─────────────────────────┤
│  底栏：字数  日更目标  AI状态  保存状态                    │
└──────────────────────────────────────────────────────────┘
```

**关键设计决策（来自调研）：**
- **全挂载+隐藏切换**（novel-engine）：所有视图同时 mount，CSS hidden 切换，保持滚动位置和状态
- **Sidebar 可折叠**：260px 默认宽度，拖拽可调（200-440px）
- **右面板可折叠**：Tab 切换（大纲/审计/上下文）

### 7.3 Provider 卡片设计（对齐 cc-switch）

```
┌──────────────────────────────────────────────┐
│  [渐变背景层]  ← 激活状态时显示绿色/蓝色渐变    │
│  ┌────┬────────────────────────┬───────────┐ │
│  │ 🟢 │ 名称 + 健康徽章         │ [设置][删]│ │
│  │ 图标│ base_url              │ (悬停显示) │ │
│  │    │ 模型: gpt-4o, ...      │           │ │
│  └────┴────────────────────────┴───────────┘ │
└──────────────────────────────────────────────┘
```

- **卡片圆角**：`rounded-xl`，padding 16px
- **渐变背景**：激活状态 `bg-gradient-to-r from-emerald-500/10 to-transparent`
- **健康徽章**：绿色（正常）/ 黄色（降级）/ 红色（熔断）
- **操作按钮**：`opacity-0 group-hover:opacity-100`，悬停渐显
- **图标系统**：内置 SVG → URL 图标 → 首字母 Fallback（三级降级）

### 7.4 功能按钮组织规范

**AI 操作按钮（三种入口并存）：**

| 入口 | 形式 | 适用场景 |
|------|------|----------|
| **编辑器头部按钮** | 「✨ AI 续写」「📥 MD」等固定按钮 | 最常用操作，一键触发 |
| **Bubble Menu** | 选中文本 → 浮动菜单 → AI 选项 | 上下文相关操作（润色/改写/翻译） |
| **Slash 命令** | `/write` `/audit` `/revise` 等 | 高级用户快捷操作 |

**QuickActions 弹出菜单（参考 novel-engine）：**
- 闪电图标 → 弹出浮层（Built-in 预设 + Saved 自定义 两个标签页）
- 预设操作：续写、审稿、去 AI 味、导出等
- 用户可保存自定义 prompt

**操作反馈层级（必须全部实现）：**
1. **即时反馈**：按钮 loading 状态 + 文字变化（"AI 续写" → "生成中..." → "✅ 完成"）
2. **流式反馈**：SSE 实时推送到编辑器/面板
3. **进度反馈**：Pipeline Tracker（多阶段进度条）+ 阶段文字提示
4. **完成通知**：Toast 提示（操作成功/失败，3秒自动消失）
5. **错误通知**：全局 Error Banner（严重错误，需手动关闭）

### 7.5b QuickActions 弹出菜单（对齐 novel-engine / inkos）

- **入口**：编辑器输入区旁的闪电图标 ⚡
- **弹出浮层**：两个标签页
  - **Built-in**：预设操作（续写、审稿、去 AI 味、翻译、导出 Markdown）
  - **Saved**：用户保存的自定义 prompt
- **交互**：选择后自动注入到 AI 聊天输入框或直接触发

### 7.5c Slash 命令体系（对齐 inkos / claw-code）

**命令分级（参考 OpenClaw 三级渐进展示）：**

| 级别 | 命令 | 说明 |
|------|------|------|
| **Essential** | `/write` `/review` `/outline` `/export` | 核心操作，所有用户常用 |
| **Standard** `/audit` `/revise` `/status` `/help` | 进阶操作，日常使用 |
| **Power** `/compact` `/config` `/debug` `/model` | 高级操作，开发者/深度用户 |

- 触发字符：`/`
- 菜单最大高度 330px，可滚动
- 每项：图标 + 命令名 + 简短描述
- 支持模糊搜索过滤
- Tab 补全

### 7.5d 会话管理（基础版）

- **对话历史持久化**：聊天消息存 SQLite（messages 表）
- **章节级上下文**：每个章节独立的 AI 对话历史
- **上下文清理**：提供 `/compact` 命令压缩历史（参考 claw-code）
- **会话恢复**：应用重启后可恢复上次对话

### 7.5e 日志查看器 UI（参考 AstrBot ConsoleDisplayer）

**位置**：设置页 → 高级 → 日志 Tab

**功能：**
- 读取 `novelcraft.log` 文件，显示最近 200 条
- **级别过滤**：5 个芯片按钮（DEBUG/INFO/WARN/ERROR/CRIT），多选
- **搜索**：关键词过滤
- **自动滚动**：新日志自动滚到底部，可关闭
- **颜色编码**：DEBUG 蓝 / INFO 青 / WARN 黄 / ERROR 红 / CRIT 深红
- **导出**：下载 .log 文件
- **布局**：CSS Grid（时间 | 级别 | 消息），固定宽度级别列

### 7.5 编辑器 UI（对齐 Tiptap + Novel）

**Bubble Menu（选中文本浮动菜单）：**
```
┌──────────────────────────────────────────────┐
│ [B] [I] [~] │ [节点选择▾] │ [链接] │ [✨AI▾] │
└──────────────────────────────────────────────┘
```
- 基于 Tiptap BubbleMenu + floating-ui 定位
- 默认 `placement: 'top'`, `offset: 8`
- AI 子菜单：续写 / 润色 / 改写 / 去 AI 味 / 翻译

**Slash Command 菜单：**
- 触发字符：`/`
- 最大高度 330px，可滚动
- 每项：图标 + 标题 + 描述
- 支持模糊搜索过滤

**章节列表（左侧 Sidebar）：**
- 树形结构，缩进表示层级
- 选中态高亮 + 字数显示
- 拖拽排序（Phase 2B）
- 右键菜单：新建/重命名/删除/关联大纲

### 7.6 设置页面（对齐 cc-switch）

```
┌──────────────────────────────────────────────┐
│  设置                                         │
├──────────────────────────────────────────────┤
│  [外观] [AI 模型] [导出] [高级]               │
├──────────────────────────────────────────────┤
│                                              │
│  ── 外观 ──                                  │
│  主题选择（3 个卡片，带颜色预览）              │
│                                              │
│  ── AI 模型 ──                               │
│  Provider 卡片列表                            │
│  [+ 添加 Provider]                           │
│                                              │
│  ── 高级 ──                                  │
│  ▶ 日志配置                                  │
│  ▶ 数据管理                                  │
│  ▶ 备份恢复                                  │
│                                              │
└──────────────────────────────────────────────┘
```

- **Tab 页式设计**：4 个 Tab（外观/AI模型/导出/高级）
- **Accordion 折叠面板**：高级设置用可折叠面板组织
- **即时保存**：外观和 AI 模型设置自动保存，无需手动点击
| **暖色护眼** | #FFF8F0 | #3D3229 | #FFF0E0 | 长时间写作 |

### 7.2 主布局

融合 novel-engine 三栏布局 + inkos Sidebar + 蚁群右侧面板的最佳实践：

```
┌──────────────────────────────────────────────────────────┐
│  顶栏：Logo  书名  [AI模式切换 ▾]  [自动驾驶]  [⚙] [☾] │
├─────────┬──────────────────────────┬─────────────────────┤
│         │                          │                     │
│ Sidebar │     主内容区              │    右侧面板          │
│         │                          │                     │
│ 📚 书架 │  ┌────────────────────┐  │  📋 大纲视图         │
│ 📖 卷   │  │   Tiptap 编辑器    │  │  ──────────         │
│ 📄 章   │  │                    │  │  📊 审稿报告         │
│ ────── │  │   (全屏模式可隐藏    │  │  ──────────         │
│ 🤖 AI   │  │    所有面板)        │  │  🔍 上下文管理       │
│ 📊 分析 │  │                    │  │  ──────────         │
│ 🔧 设置 │  └────────────────────┘  │  📜 真相文件状态      │
│         │                          │                     │
│         │  ┌────────────────────┐  │                     │
│         │  │  AI 聊天浮窗       │  │                     │
│         │  │  (可展开/收起)     │  │                     │
│         │  └────────────────────┘  │                     │
├─────────┴──────────────────────────┴─────────────────────┤
│  底栏：字数 32,450/50,000  日更目标  AI模式:多Agent  🟢已保存 │
└──────────────────────────────────────────────────────────┘
```

**交互特性：**
- 侧边栏可折叠（参考 novel-engine）
- 右侧面板可折叠
- AI 聊天浮窗可在任何视图叠加调出（参考 novel-engine ChatModal）
- 全屏编辑模式（隐藏顶栏、侧边栏、右面板）
- 所有视图"全挂载+隐藏切换"，切换时保持状态和滚动位置（参考 novel-engine）

### 7.3 AI 聊天浮窗

```
┌──────────────────────────────────┐
│  AI 协作          [单Agent|多Agent|蚁群] │
├──────────────────────────────────┤
│  👤 帮我写下一章的开头            │
│                                  │
│  🤖 正在 Plan 阶段...            │
│  ├─ ✅ 章节意图已生成            │
│  ├─ 🔄 正在编排上下文...          │
│  └─ ⏳ 等待中...                 │
│                                  │
│  📊 Token: 12,340 | 费用: $0.15 │
├──────────────────────────────────┤
│  输入消息...            [发送]   │
└──────────────────────────────────┘
```

- 实时显示当前 Agent 执行阶段（参考 novel-engine progressStage）
- SSE 流式输出
- token 用量实时统计

### 7.4 响应式

- 最小窗口：1024 x 768
- 侧边栏 / 右面板可折叠
- 支持全屏编辑模式

---

## 8. 渐进式开发计划

> **设计原则：** 每个 Phase 结束时都有可运行、可体验的完整链路。先窄后宽，先跑通再扩展。
> **核心节奏：** Phase 1 解决"能写字"，Phase 2A 解决"AI 帮你写"，后续 Phase 逐步深化 AI 能力。

### Phase 0：UI Shell 骨架 ✅（第 1-2 周）

**里程碑：** 应用能启动，看到完整布局和所有空壳页面

- [x] Tauri 2 项目初始化
- [x] React + TypeScript + Vite 配置
- [x] Tailwind CSS + shadcn/ui 集成
- [x] SQLite 初始化 + Drizzle ORM + Zod
- [x] 三套主题 CSS Variables（极简白/深色/暖色）
- [x] 模块化目录结构搭建
- [x] 事件总线（EventBus）实现
- [x] Zustand Store 架构（分片）
- [x] 路由和基础布局（所有页面空壳）
- [x] SSE streaming hook（useSSE）

### Phase 1：书库 + 编辑器 + 真相文件 ✅（第 3-4 周）

**里程碑：** 创建书籍 → 打开章节 → 用 Tiptap 编辑器写作 → 自动保存

- [x] Book / Chapter Volume 数据库 schema + Rust CRUD（8 个 Tauri Commands）
- [x] 7 个真相文件 Zod Schema + TruthFileManager
- [x] 真相文件只读查看器（JSON + 校验状态）
- [x] 书库页面：创建/删除书籍（卡片视图 + 创建对话框）
- [x] 最小 Tiptap 编辑器（StarterKit + 章节切换 + debounce 自动保存）
- [x] 字数统计 + 实时同步到书架
- [x] Settings 页面（主题切换 + Provider 占位）
- [x] 扩展数组可配置（方便 Phase 2B 无缝加入小说扩展）

### Phase 2A：AI 辅助最小可用（第 5-6 周）

**里程碑：** 写作卡住时 → 右键"AI 续写" → 流式输出到编辑器。第一次人机协同写作闭环。

- [ ] **LLM Provider 配置**（用 Phase 1 Settings 架子，接入 Vercel AI SDK）
  - OpenAI / Anthropic / 自定义（OpenAI 兼容）三种 Provider
  - API Key 存储 + 模型选择
  - 连接测试按钮
- [ ] **单 Agent 续写**（核心功能）
  - 选中位置或光标处 → 右键菜单 → "AI 续写"
  - SSE 流式输出到编辑器光标位置
  - 上下文构建：当前章节 + 前 2 章 + 大纲节点
  - 可中断（停止生成）
- [ ] **大纲视图**（右侧面板第一版）
  - 树形大纲编辑（手动增删改节点）
  - 大纲节点与章节关联
  - 大纲作为 AI 续写的导航地图
- [ ] **去 AI 味基础 prompt**（Writer Agent 内置禁用句式列表）

### Phase 2B：编辑器专业打磨（第 7-8 周）

**里程碑：** 小说专用编辑体验 + 更丰富的 AI 操作

- [ ] 小说专用 Tiptap 扩展（场景分隔符 SceneBreak、对话高亮 DialogueHighlight）
- [ ] 斜杠命令菜单（`/outline` `/continue` `/scene` 等）
- [ ] 版本历史（SHA-256 去重，保留 50 版本，diff 对比 + 一键 revert）
- [ ] AI 内联操作扩展（选中文本 → Bubble Menu → 润色/改写/去 AI 味）
- [ ] 全屏编辑模式

### Phase 3：AI 引擎进阶 — 多 Agent + 审计（第 9-12 周）

**里程碑：** 6 Agent 分工管线 + 审计-修订循环 + 审稿报告

- [ ] 多模型路由（按 Agent 角色配置不同模型）
- [ ] Coordinator Agent + 意图解析（自然语言 + slash 命令）
- [ ] **审计管线**：Write → Audit → 审稿报告
  - Auditor Agent：37 维度一致性检查
  - 审稿报告 UI（问题列表 + 严重度分级 + 跳转定位）
- [ ] **审计-修订循环**（quality gates）
  - critical 问题触发 Reviser Agent 自动修订
  - 最大重试 3 次，超限暂停等人工
- [ ] 上下文预算感知（TokenEstimator + 动态压缩）
- [ ] 容错策略：LLM 调用失败重试 + 超时 + 降级

### Phase 4：输入治理 + 真相文件 AI 自动更新（第 13-15 周）

**里程碑：** Plan → Compose → Write 三步分离 + AI 自动更新真相文件

- [ ] **输入治理管线**：Plan → Compose → Write（三步分离）
- [ ] Planner Agent（章节意图规划）
- [ ] Composer Agent（真相文件 → 精简上下文编译）
- [ ] Observer Agent（正文 → 事实提取 → 写入真相文件）
- [ ] Reviser Agent（spot-fix / polish / rewrite）
- [ ] Director Agent（协调多 Agent 输出）
- [ ] 37 维度审计检查器（详见附录 A）
- [ ] 时序记忆 DB（事实有效期追踪）

### Phase 5：蚁群 + 自动驾驶 + 风格（第 16-18 周）

**里程碑：** 三模式 AI 全部可用 + 后台自动写章 + 风格仿写

- [ ] **蚁群 2 种子模式**
  - Router 模式：Router → 最佳专家 → Finalizer
  - Supervisor-Dynamic 模式：Intake → Delegation → Worker → Review → 循环
- [ ] **自动驾驶模式** + Cron 调度器
- [ ] 自动驾驶控制面板（启动/停止/进度/日志）
- [ ] 质量门控（连续失败暂停、每日章数上限）
- [ ] 通知推送（桌面通知）
- [ ] 文风分析与仿写（Voice Profile）
- [ ] 文风漂移告警

### Phase 6：导出 + 数据分析 + 打磨（第 19-21 周）

**里程碑：** 完整的创作→编辑→AI 辅助→导出闭环

- [ ] TXT / Markdown / DOCX / EPUB / PDF 导出（Pandoc sidecar）
- [ ] 导出模板系统 + 平台预设（起点/番茄/晋江/Kindle）
- [ ] 数据分析面板（字数趋势、token 用量、审计通过率）
- [ ] 全局搜索
- [ ] 快捷键系统
- [ ] 性能优化
- [ ] 跨章重复检测

### Phase 7：高级功能（后续迭代）

- [ ] 蚁群剩余 3 种子模式（Peer-Handoff / Planner-Executor / Emergent）
- [ ] 角色档案卡
- [ ] 时间线可视化
- [ ] 知识图谱（参考 NovelForge）
- [ ] 插件系统（参考 claw-code PluginManifest）
- [ ] 设定集（World Bible）高级管理
- [ ] 云同步
- [ ] 同人创作模式（参考 inkos fanfic）
- [ ] 伏笔台账自动闭合（参考 PlotPilot）
- [ ] 张力心电图可视化
- [ ] AI 检测对接（GPTZero 等）
- [ ] macOS/iOS 通知推送（APNs）

---

## 9. 容错策略

> 灵感来源：inkos QualityGates + claw-code error classification

### 9.1 LLM 调用容错

| 场景 | 策略 |
|------|------|
| **网络超时** | 指数退避重试（3 次），间隔 2s/4s/8s |
| **API 限流（429）** | 读取 Retry-After 头，等待后重试 |
| **API 错误（5xx）** | 重试 2 次，失败后降级提示用户 |
| **Token 超限** | 自动压缩对话历史后重试（参考 novel-engine ContextBuilder） |
| **响应格式异常** | Repair Layer 修复（参考蚁群），或丢弃重试 |
| **Provider 不可用** | 提示用户切换 Provider，不阻塞编辑器 |

### 9.2 自动驾驶容错

| 场景 | 策略 |
|------|------|
| **连续失败 3 次** | 自动暂停，推送通知 |
| **单章审计 critical > 5** | 自动暂停，等待人工审查 |
| **进程被杀** | PID 文件清理 + 启动时检测孤儿 |
| **磁盘空间不足** | 检测可用空间 < 100MB 时暂停 |

### 9.3 数据容错

| 场景 | 策略 |
|------|------|
| **真相文件校验失败** | 拒绝写入，返回错误详情给 Agent |
| **SQLite 锁冲突** | WAL 模式 + 重试 |
| **版本历史损坏** | 保留最近快照，跳过损坏版本 |

---

## 10. 附录 A：37 维度审计检查清单

> 灵感来源：inkos ContinuityAuditor，适配我们的需求

### 设定一致性（8 维度）
1. **角色名称一致性** — 全文角色名是否统一
2. **角色外貌一致性** — 描述是否前后矛盾
3. **角色能力一致性** — 战力/技能是否前后一致
4. **地理位置一致性** — 地名/距离/方位是否矛盾
5. **时间线一致性** — 事件顺序是否合理
6. **物品状态一致性** — 物品位置/状态是否追踪正确
7. **规则体系一致性** — 修炼/魔法/科技体系是否自洽
8. **资源一致性** — 金钱/物品数量是否追踪正确

### 叙事质量（9 维度）
9. **角色弧光** — 主角是否有成长/变化
10. **配角功能** — 配角是否有存在意义
11. **节奏检查** — 张力是否波动（不能一直高/一直低）
12. **场景必要性** — 每个场景是否推动剧情
13. **冲突密度** — 是否有足够的冲突驱动
14. **悬念管理** — 伏笔是否及时回收
15. **信息投喂** — 信息量是否适中（不过载/不匮乏）
16. **章节钩子** — 章末是否有继续阅读的动力
17. **结局满足度** — 章节是否有完整的收束

### 文笔质量（7 维度）
18. **段落长度漂移** — 是否有过长/过短段落
19. **句式多样性** — 是否句式过于单一
20. **词汇丰富度** — 是否重复用词
21. **对话自然度** — 对话是否像真人说话
22. **描写平衡** — 叙述/描写/对话比例是否合理
23. **情感表达** — 情感是否通过行为/细节传达（非直说）
24. **节奏韵律** — 句子长短交替是否自然

### AI 痕迹（7 维度）
25. **禁用句式检测** — 是否使用 AI 偏好句式
26. **词汇疲劳** — 是否重复使用 AI 偏好词汇
27. **过渡词过度** — "然而"、"此外"等是否过多
28. **总结句倾向** — 是否每段末尾都有总结句
29. **列表化倾向** — 是否有不应该列表的地方用了列表
30. **过度解释** — 是否有不必要的解释性语句
31. **情感标签** — 是否直接标注情绪（"他感到愤怒"）

### 跨章一致性（6 维度）
32. **跨章重复段落** — 是否有复制粘贴的段落
33. **标题聚集检测** — 章节标题是否过于相似
34. **开篇模式重复** — 连续几章开篇结构是否雷同
35. **结尾模式重复** — 连续几章结尾是否雷同
36. **段落结构重复** — 跨章段落结构是否同构
37. **字数波动** — 章节字数是否异常波动

**审计输出格式：**
```typescript
interface AuditReport {
  overallScore: number;          // 0-100
  dimensions: AuditDimension[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

interface AuditDimension {
  id: number;
  name: string;
  category: 'setting' | 'narrative' | 'prose' | 'ai-trace' | 'cross-chapter';
  severity: 'critical' | 'warning' | 'info' | 'pass';
  issues: AuditIssue[];
}

interface AuditIssue {
  severity: 'critical' | 'warning' | 'info';
  location: { chapter: number; paragraph?: number; offset?: number };
  description: string;
  suggestion?: string;
}
```

---

## 11. 非功能需求

| 维度 | 要求 |
|------|------|
| **性能** | 编辑器输入延迟 < 16ms；AI 响应首 token < 2s |
| **数据安全** | 所有数据本地存储；API Key 加密（系统 keyring） |
| **离线** | 编辑功能完全离线可用；AI 功能需联网 |
| **可扩展** | 模块可独立禁用；LLM Provider 可动态注册；Agent 可扩展 |
| **可测试** | core/ 层零 UI 依赖，可独立单元测试；AI 引擎可用 mock 测试 |
| **容错** | 真相文件 Zod 校验，坏数据拒绝不滚雪球；会话压缩防上下文溢出 |
| **可观测** | token 用量追踪；审计日志；自动驾驶状态监控 |

---

## 12. 日志系统设计（基于 AstrBot + claw-code）

> AstrBot：loguru + LogBroker 发布订阅 + SSE 实时推送 + ConsoleDisplayer
> claw-code：JsonlTelemetrySink + SessionTracer 双通道 + 结构化错误分类

### 12.1 架构

```
┌─ 前端 ──────────────────────────────────────────┐
│  logger.info/warn/error(module, msg)            │
│  → invoke('log_message') → Rust Logger          │
│  → 同时 console.log（开发调试）                  │
└──────────────────────────────────────────────────┘
         ↓ Tauri IPC
┌─ Rust Logger ───────────────────────────────────┐
│  环形缓冲区（500 条）→ 批量 flush to JSONL 文件 │
│  文件路径: app_data_dir/novelcraft.log          │
│  eprintln! 同时输出 stderr（开发调试）           │
└──────────────────────────────────────────────────┘
         ↓ 可选扩展
┌─ 日志查看器 UI（/settings → Logs Tab）──────────┐
│  读取日志文件 → 级别过滤 → 搜索 → 自动滚动     │
│  参考 AstrBot ConsoleDisplayer：                │
│  - 级别颜色：DEBUG 蓝 / INFO 青 / WARN 黄 /    │
│    ERROR 红 / CRIT 深红                         │
│  - CSS Grid 布局：时间 | 级别 | 消息            │
│  - 缓存管理：max 200 条                        │
│  - 导出：下载 .log 文件                         │
└──────────────────────────────────────────────────┘
```

### 12.2 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试 | `Auto-save: chapter=xxx html_len=1234` |
| INFO | 正常操作 | `Loaded 2 chapters for book xxx` |
| WARN | 需关注但不阻断 | `LLM response slow: 5200ms` |
| ERROR | 操作失败 | `call_llm failed: HTTP 429` |
| CRITICAL | 系统级故障 | `Database connection lost` |

### 12.3 日志格式

```
[YYYY-MM-DD HH:mm:ss] [LEVEL] [module] message
```

---

## 13. 错误处理设计（基于 claw-code）

### 13.1 三层错误分类

**API 层（12 种）：**
MissingCredentials / ContextWindowExceeded / ExpiredOAuthToken / Auth / InvalidApiKeyEnv / Http / Io / Json / Api / RetriesExhausted / InvalidSseFrame / BackoffOverflow

**安全失败分类（9 种）：**
context_window / provider_auth / provider_rate_limit / provider_internal / provider_error / provider_transport / provider_retry_exhausted / runtime_io / request_size

**CLI/用户层（12 种）：**
missing_credentials / session_not_found / cli_parse / invalid_model / unsupported_command / confirmation_required / api_http_error / unknown

### 13.2 错误处理策略

| 错误类型 | 策略 | 用户提示 |
|----------|------|----------|
| 网络超时 | 指数退避重试（3次） | "网络超时，正在重试..." |
| API 限流（429） | 读取 Retry-After，等待后重试 | "请求过多，请稍后重试" |
| API Key 无效 | 立即失败，不重试 | "API Key 无效，请检查设置" |
| 上下文超限 | 自动压缩后重试 | "上下文过长，已自动压缩" |
| 格式异常 | Repair Layer 修复 | "AI 输出格式异常，已自动修复" |
| 数据库错误 | 重试 + 降级 | "数据保存失败，内容已缓存" |

### 13.3 用户友好提示设计

- **错误消息结构**：`{ type: "error", error: "短原因", kind: "分类", hint: "详细提示" }`
- **上下文超限提示**：显示 `estimated_input + requested_output = total vs context_window_tokens` 计算详情
- **Windows 特殊处理**：环境变量设置提示（`setx` 命令 + `.env` 替代方案）

---

## 14. 自动驾驶设计（基于 PlotPilot + inkos）

### 14.1 状态机

```
IDLE → PLANNING → WRITING → AUDITING → PAUSED_FOR_REVIEW
  ↑                                          │
  └──────────── auto_approve ────────────────┘
                    │
              手动确认 → WRITING (下一章)
```

### 14.2 核心机制（来自 PlotPilot）

| 机制 | 说明 |
|------|------|
| **节拍级幂等** | 每个写作节拍完成后立即落库，断点续写 |
| **熔断器** | CLOSED → 连续5次失败 → OPEN（暂停120s）→ HALF_OPEN（试探1次）→ CLOSED/OPEN |
| **文风漂移检测** | 余弦相似度 > 0.68 阈值触发定向修写 |
| **章间冷却** | 每章完成后等待 configurable 秒 |
| **每日上限** | 可配置每日最大章数 |

### 14.3 守护进程（来自 inkos）

- **PID 文件防重入**：`novelcraft.pid`，启动时检查
- **信号处理**：SIGINT/SIGTERM → 优雅关闭（完成当前章 → 保存 → 退出）
- **通知推送**：桌面通知 + Webhook（可选）
- **日志**：JSON Lines 格式，`novelcraft-daemon.log`

### 14.4 自动恢复配方（来自 claw-code）

| 故障 | 恢复步骤 | 升级 |
|------|---------|------|
| LLM 调用失败 | 重试（3次） | 暂停，通知用户 |
| 网络断开 | 等待重连 | 超时暂停 |
| 数据库写入失败 | 内存缓存 + 重试 | 暂停 |
| 审计连续失败 | 减少温度重试 | 暂停，人工介入 |
| 磁盘空间不足 | 暂停 | 紧急通知 |

---

## 15. 参考框架借鉴点

| 来源 | 借鉴内容 |
|------|----------|
| **inkos** | 真相文件系统（7 个 JSON 状态文件 + Zod 校验）；输入治理分离（plan/compose/write）；审计-修订循环；37 维度审计；去 AI 味 prompt 工程；时序记忆；Provider Bank（35+ 服务商）；守护进程+Cron；monorepo 分包 |
| **novel-engine** | 14 阶段管线；7 Agent 分工；上下文预算感知（TokenEstimator）；Agent Prompt 组合式加载；流式事件架构；修订队列；Voice Profile；SHA-256 版本控制；全挂载+隐藏切换 UI 模式；ChatModal 浮窗 |
| **PlotPilot** | 自动驾驶模式；伏笔台账自动闭合；张力心电图（0-10 分）；文风漂移告警；DDD 四层架构 |
| **claw-code** | Agent harness 架构（40 工具）；Tool Registry 三层（builtin/runtime/plugin）；Permission Pipeline；Hook 生命周期；Worker 状态机；会话压缩；插件系统 |
| **蚁群 Playgroud** | 5 种工作流模式（Router/Planner/Supervisor/Peer/Emergent）；LangGraph StateGraph 编排；SSE 流式追踪；工作流图 Canvas 可视化；Validator 退回机制；执行+决策分离；LLM Gateway 统一网关 |
| **Tiptap** | 扩展架构（headless 编辑器）；Bubble/Floating Menu；协作编辑能力 |
| **NovelForge** | @DSL 上下文注入；Schema-first 设计（JSON Schema 校验 AI 输出）；拆书工作流 |
| **novel (AI editor)** | AI 自动补全（Vercel AI SDK + useCompletion）；斜杠命令系统 |
| **Humanizer-zh** | 中文 AI 痕迹检测（24 种模式）；改写指南 |
| **web-novel-master** | 26 位作者文风库；爆款四法则；市场数据 |
| **webnovel-writer** | 追读力系统（Hook/Cool-point/微兑现）；37 个题材模板 |

---

## 16. 开放问题

1. **云同步方案** — Phase 6 是否考虑？用什么后端？
2. **多用户/协作** — 是否需要多人同时编辑一本书？
3. **移动端** — 是否考虑 React Native 移动端？
4. **AI 计费** — 是否内置预算控制和费用告警？
5. **插件系统** — 第三方如何开发？参考 claw-code 还是 inkos 的 SkillHub？
6. **伏笔台账** — 是否需要 PlotPilot 风格的自动闭合，还是 Phase 6 再加？
7. **知识图谱** — 是否需要 Neo4j / 本地图数据库？
