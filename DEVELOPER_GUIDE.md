# 开发者参考指南 — 组件级 UI / 功能分布 / 系统流程

> 更新时间：2026-05-08
> 基于 17+ 个开源小说框架 + 6 个工具框架的深度阅读
> 用途：每次开发新功能时读取，了解最佳实践和可复用模式

---

## 一、各项目能帮我们做什么（按项目分）

### 1. inkos — 小说 AI 写作的核心参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| Studio UI 三栏布局 | Sidebar(260px) + 内容区 + AI 面板 | 整体布局 |
| 树形折叠导航 | 书籍→会话列表，可展开/收起 | Sidebar |
| Truth Files 双栏编辑器 | 左文件列表 + 右内联编辑 + Zod 校验 | 真相文件模块 |
| Slash 命令体系 | 15 条命令 + Tab 补全 + 自动补全菜单 | AI 协作面板 |
| 20+ 用户意图 | Zod schema 定义的意图分类路由 | Coordinator Agent |
| Scheduler + 质量门控 | cron 定时 + 温度递增重试 + 每日章节数上限 | 自动驾驶 |
| 服务配置卡片 | 分组筛选 + 搜索 + 连接状态探测 | Settings 页面 |
| Provider Bank | 35+ 服务商预设，按 Agent 粒度路由模型 | LLM 接入层 |

### 2. novel-engine — 桌面应用架构参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| 全挂载视图架构 | 所有 View 同时 mount，CSS hidden 切换 | 整体布局 |
| 细粒度 Zustand 选择器 | `useStore(s => s.xxx)` 避免不必要重渲染 | 所有 Store |
| QuickActions 双标签页 | ⚡图标 → Built-in + Saved prompt 弹出菜单 | AI 操作入口 |
| PipelineTracker 状态机 UI | 4 种状态 + 操作按钮 + 双击确认 | 管线进度追踪 |
| MessageBubble | 用户蓝色/AI 灰色 + ThinkingBlock 可折叠 | 聊天面板 |
| 智能滚动 | IntersectionObserver + MutationObserver | 消息列表 |
| ErrorBoundary 嵌套 | 顶层 + 组件级双层防护 | 错误处理 |
| BookPanel 封面预览 | novel-asset:// 协议 + hover 上传 | 书库管理 |
| Provider 卡片 | 状态点（红/绿/灰）+ 测试连接按钮 | Settings 页面 |
| 防闪烁 Loading | 主题匹配的空屏幕避免白屏闪烁 | 应用启动 |

### 3. cherry-studio — Provider 管理和编辑器参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| TopView 命令式弹窗 | Class 静态方法 + Promise，全局弹窗管理器 | 所有弹窗 |
| DraggableVirtualList | 虚拟滚动 + 拖拽排序，长列表高性能 | Provider 列表 |
| Provider 双栏布局 | 左列表 + 右详情 Master-Detail | Settings 页面 |
| 防抖输入 + 外部更新追踪 | 避免受控组件双向绑定循环 | 所有表单 |
| Markdown 存储 + HTML 渲染 | Tiptap 编辑器数据架构 | 编辑器模块 |
| 双进程日志 | renderer console + main Winston 文件 | 日志系统 |
| 设置页面样式组件库 | SettingContainer/Title/Subtitle/Row/HelpText | Settings 页面 |
| EventEmitter 消息系统 | 组件间松耦合通信 | 聊天面板 |
| 消息倒序渲染 + 无限滚动 | flex-direction: column-reverse | 消息列表 |
| TopView 弹窗系统 | 全局栈管理 + 全屏遮罩 + Promise | 所有弹窗 |
| InputbarCore props 注入 | 核心组件与业务逻辑分离 | 编辑器输入 |

### 4. PlotPilot — 自动驾驶和监控参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| AutopilotDashboard | 5 组件网格布局（张力图/终端日志/文风/伏笔/熔断器） | 自动驾驶面板 |
| AutopilotPanel | 状态机驱动 UI + 进度条 + 数据格 + 配置弹窗 | 自动驾驶控制 |
| AutopilotWritingStream | 实时写作速度 + 智能截断（1200字） | AI 输出展示 |
| 章节列表双视图 | 平铺分页 + 树形叙事结构 | 章节管理 |
| SettingsPanel 惰性加载 | `display-directive="if"` 控制组件挂载 | 右侧面板 |
| 自动驾驶守护进程 | 5 秒轮询 + 节拍级幂等 + 事务最小化 | 自动驾驶后端 |
| 熔断器 | CLOSED→OPEN→HALF_OPEN 三态 + 5 次阈值 | 容错系统 |
| Composable 模式 | 复杂状态逻辑封装到 composable | 状态管理 |

### 5. NovelForge — 工作流和 AI 助手参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| 三栏编辑器 | 卡片树 + 编辑器 + 助手面板，上下文感知 Tab | 编辑器布局 |
| AssistantPanel | 接收当前卡片内容作为上下文给 AI | AI 协作面板 |
| React-Tool 协议 | `<Action>{"tool":"...","args":{...}}</Action>` | AI 工具调用 |
| JSON 修复机制 | `json_repair` 库修复 AI 输出格式错误 | AI 输出解析 |
| 工作流幂等键 | 防止重复执行 + 断点续传 | 自动驾驶 |
| AsyncExecutor | 事件队列 + 检查点 + 暂停/恢复 | 工作流执行 |
| QuotaManager | 预检查配额 + 用量记录 | API 管理 |
| 卡片树拖拽 | 拖拽排序 + 搜索 + 批量操作 | 大纲管理 |

### 6. claw-code — Agent 框架和错误处理参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| 流式 Markdown 边界检测 | 栈追踪围栏配对，安全切分流式输出 | AI 流式渲染 |
| 声明式命令注册 | 静态数组定义命令元数据 | Slash 命令系统 |
| ContentBlock 枚举 | Text/Thinking/ToolUse/ToolResult 灵活消息模型 | 聊天消息 |
| 会话压缩 | SessionCompaction 追踪压缩历史 | 会话管理 |
| 恢复配方模式 | 6 种场景 + 步骤序列 + 升级策略 | 容错系统 |
| 多维度错误分类 | is_retryable / safe_failure_class / is_context_window | 错误处理 |
| 工作区隔离 | workspace_root 防止并行竞态 | 自动驾驶 |
| 归一化补全列表 | BTreeSet 自动去重 + 前缀匹配 | Slash 命令补全 |

### 7. Multi-Agent-Playground — 工作流可视化参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| GraphViewer Canvas 可视化 | 5 种布局算法 + 节点拖拽 + 贝塞尔连线 | 工作流可视化 |
| TraceViewer | Agent 执行块聚合 + 多层级事件处理 | 追踪面板 |
| ChatRunner | 自适应 textarea + Markdown 混合渲染 + 停止按钮 | 聊天面板 |
| SSE 队列 + 线程 | worker 线程 → Queue → SSE 推送 | 流式输出 |
| 5 种工作流模式 | Single/Router/Planner/Supervisor/Peer | 蚁群模式 |
| Agent 执行块聚合 | node_entered/node_exited 配对识别范围 | 追踪可视化 |
| 工作区上下文共享 | workspace_dir + artifacts + tool_evidence | 多 Agent 协作 |

### 8. AstrBot — 日志系统参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| LogBroker 发布订阅 | deque 500 条缓存 + 订阅者 Queue | 日志架构 |
| SSE 实时日志流 | /api/live-log + 断线重连 + Last-Event-ID | 日志推送 |
| ConsoleDisplayer | ANSI→CSS 颜色映射 + 级别过滤 + 自动滚动 | 日志查看器 |
| 级别过滤芯片 | 5 级多选 + 独立颜色 | 日志 UI |
| 缓存管理 | max 200 条 + 去重（time+data+level） | 日志存储 |

### 9. cc-switch — Provider 卡片和设置参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| ProviderCard 渐变背景 | 激活状态 from-emerald-500/10 to-transparent | Provider 卡片 |
| 边框颜色状态 | 绿色=代理活跃 / 蓝色=当前激活 | Provider 状态 |
| 悬停渐显操作 | opacity-0 group-hover:opacity-100 | 操作按钮 |
| Cmd+F 搜索 | 浮动搜索框 + backdrop-blur-md | Sidebar 搜索 |
| 6-Tab + Accordion | 设置页面折叠面板 | Settings 页面 |
| 端点测速面板 | 延迟颜色编码 <300绿 <500黄 <800红 | Provider 测试 |
| 健康徽章 | 连续失败次数→状态（0=绿 1-4=黄 5+=红） | Provider 健康 |

### 10. Tiptap — 编辑器扩展参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| Bubble Menu floating-ui | middleware 链定位（flip/shift/offset/arrow） | 编辑器菜单 |
| Suggestion 状态机 | Dismissed range + Decoration + 生命周期钩子 | Slash 命令 |
| 扩展注册架构 | 高度可插拔，按需组合 | 编辑器扩展 |

### 11. Novel — AI 编辑器 UI 参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| Headless + Tailwind 分层 | 核心逻辑与样式解耦 | 编辑器架构 |
| GenerativeMenuSwitch | AI 功能无缝嵌入 Bubble Menu | AI 内联操作 |
| tunnel-rat Portal | 解决编辑器内 Portal 渲染难题 | 编辑器菜单 |
| cmdk 命令面板 | Slash Command 的 UI 实现 | 命令面板 |
| localStorage 保存 | 500ms 防抖 + 3 个 key | 自动保存 |

### 12. Claude Code — 终端设计系统参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| ThemeProvider + ThemedBox | 主题感知组件 + auto 模式检测 | 主题系统 |
| Dialog 组件 | 标题 + 副标题 + 内容 + 快捷键提示 | 弹窗设计 |
| FuzzyPicker | 模糊搜索 + 键盘导航选择 | 搜索组件 |
| 键盘快捷键系统 | useKeybinding + 可配置快捷键 | 全局快捷键 |

### 13. OpenClaw — Slash 命令参考

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| Slash 三级渐进 | essential / standard / power 分层展示 | 命令体系 |
| 多会话管理 | 切换 + 缓存 + 分支 + 历史 | 会话管理 |
| 工具执行卡片 | 可视化工具调用的 UI 模式 | AI 工具展示 |

### 14. AI-Novel-Writing-Assistant — 全链路自动导演（借鉴价值极高）

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **自动导演开书** | 从一句灵感 → 整本方向 → 方案选择 → 自动推进到可开写 | 自动驾驶 |
| **Creative Hub 统一中枢** | 对话+追问+规划+工具调用+状态卡片+回合总结 | AI 协作面板 |
| **Planner 编译架构** | LLM 解析意图 → 结构化计划 → 风险分级 → Agent 执行 | Coordinator Agent |
| **写法引擎** | 风格特征提取 → 特征池 → 规则编译 → 绑定生成 | Voice Profile |
| **57 种工具 + 28 种意图** | 覆盖小说生产全环节的工具集 | AI 工具体系 |
| **整本批量 Pipeline** | 排队执行 + 状态追踪 + 失败重试 | 自动驾驶 |
| **Prisma 多状态枚举** | ChapterGenerationState / PipelineJobStatus / FactCategory | 数据模型设计 |

### 15. webnovel-writer — 合同驱动架构（借鉴价值极高）

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **合同驱动架构** | MASTER_SETTING → Volume → Chapter → Review 层级约束 | 大纲管理 |
| **防幻觉三定律** | 大纲即法律、设定即物理、发明需识别 | AI 写作约束 |
| **六维审查系统** | 爽点密度/设定一致性/节奏比例/OOC/连续性/钩子强度 | 审稿报告 |
| **长期记忆三层** | Working + Episodic + Semantic + memory_scratchpad | 上下文管理 |
| **事件投影链** | 正文→提取→投影到 5 个数据视图 | 数据同步 |
| **Strand Weave 节奏** | 主线60% / 感情线20% / 世界观20% | 节奏管理 |
| **6 步写章流程** | preflight→上下文→起草→审查→润色→提交 | 写作管线 |

### 16. thriller-main — 知识状态追踪和自进化（借鉴价值极高）

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **35 个命令体系** | 13 个写作命令 + 9 个互动小说 + 8 个分镜 + 5 个进化 | 命令系统 |
| **知识状态追踪** | 角色知识矩阵 + 读者知识层（确知/推测/误信/不知） | 叙事质量 |
| **约束饱和检查** | 自动检测设计假设与约束缺口 | AI 写作约束 |
| **多维度加权评分** | 按子类型权重不同的 7 维度评分 | 审稿报告 |
| **GEP 自进化协议** | 实验→实践(1-2项目)→原则(5+项目) | 系统进化 |
| **临时发明检测** | 区分合理/可疑/危险的临时发明 | 防幻觉 |

### 17. web-novel-master — 爆款网文创作方法论

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **爆款四法则** | 爽点驱动/情绪波动/金句记忆/名场面 | 写作指导 |
| **26 位作者文风库** | 天蚕土豆/辰东/猫腻/桐华等 | Voice Profile |
| **四种创作模式** | Fast/Professional/Industrial/Instant | AI 模式 |
| **10 维度自检清单** | 质量保证检查 | 审稿报告 |
| **黄金套路速查** | 退婚流/系统流/重生流/装逼流等 | 写作参考 |

### 18. Humanizer-zh — 中文 AI 痕迹检测

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **24 种 AI 痕迹** | 4 大类：内容/语法/风格/交流 | 去 AI 味 |
| **5 维度质量评分** | 直接性/节奏/信任度/真实性/精炼度 | 审稿报告 |
| **改写对比示例** | 每种模式的改写前/改写后对比 | Prompt 工程 |
| **5 条核心原则** | 删除填充/打破公式/变化节奏/信任读者/删除金句 | 写作指导 |

### 19. NovelForge-main — @DSL 上下文注入（借鉴价值极高）

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **@DSL 上下文注入语法** | `@previous` `@type:角色卡` `@KB{name=...}` | 上下文管理 |
| **Schema-first 设计** | 类型结构约束 AI 输出 | AI 输出格式 |
| **代码式工作流** | 从 DAG 重构为可执行代码 | 工作流引擎 |
| **卡片树状结构** | 树形导航 + 拖拽 + 搜索 | 大纲管理 |
| **字段粒度流式生成** | 非整段生成，逐字段填充 | AI 写作 |
| **知识图谱集成** | Neo4j/SQLite 双模存储 | 世界观管理 |

### 20. dog-Engine — 前端直调 AI 和书源解析

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **前端直调 AI** | API Key 存浏览器，隐私友好 | LLM 接入 |
| **VM2 沙箱** | 安全执行用户自定义 JS 代码 | 插件系统 |
| **多书源解析** | CSS/JS 混合规则的聚合方案 | 导入功能 |
| **上下文压缩** | 多章节 → 剧情清单的转换 | 上下文管理 |
| **角色/世界设定注入** | 基于关键词的自动上下文构建 | 设定管理 |

### 21. WenShape（文枢）— IDE-like 多智能体编排

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **IDE-like 布局** | 活动栏+面板+编辑区+AI 面板+状态栏 | 编辑器布局 |
| **多智能体编排** | Orchestrator + Writer + Editor + Archivist | 多 Agent 模式 |
| **BM25 事实检索** | 距离衰减+章节绑定+防幻觉 | 上下文管理 |
| **Diff 审查流程** | 编辑建议→差分对比→接受/拒绝决策 | AI 审稿 |
| **纯文本存储** | YAML/Markdown/JSONL 适合 Git 版本管理 | 数据存储 |

### 22. AI_NovelGenerator — 雪花写作法 Prompt 工程

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **雪花写作法 5 层展开** | 核心种子→角色动力学→世界观→三幕式情节 | Prompt 工程 |
| **悬念密度/伏笔操作/认知颠覆强度** | 细粒度叙事控制维度 | 大纲管理 |
| **三段式知识库处理** | LLM 生成关键词→向量检索→LLM 分级过滤 | RAG |
| **角色状态树** | 结构化记录物品/能力/关系/触发事件 | 设定管理 |

### 23. ai-novelist（青烛）— IDE 化创作工具

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **IDE 化创作** | 文件树+Monaco编辑器+终端+Git | 编辑器架构 |
| **Hashline 差异替换** | 两位哈希标识位置，节省 token | Token 优化 |
| **@路径引用** | 对话中 `@文件名` 自动同步到 Agent | 上下文管理 |
| **MCP + Skills 双扩展** | MCP 协议 + Skill 文件 | 插件系统 |
| **对话历史自动总结** | LangGraph summarize 节点 | 会话管理 |

### 24. auto_novel_writer — 三 Agent 写-审-记闭环

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **写-审-记闭环** | WriterAgent→ReviewerAgent→MemoryAgent | 多 Agent 模式 |
| **量化审稿评分** | 风格30%+逻辑40%+细节30%，阈值8.0 | 审稿报告 |
| **AIProvider 工厂模式** | OpenAI/Anthropic/Azure/Ollama/Custom | LLM 接入 |
| **RAG 记忆管理** | SQLite + 上下文窗口检索 | 上下文管理 |

### 25. LoreVista — 小说→漫画全流程

| 能借鉴什么 | 具体内容 | 对应我们的模块 |
|-----------|---------|--------------|
| **小说→漫画转换** | 分镜拆解 Prompt + JSON 结构 | 导出功能 |
| **角色外貌锁定** | Character Profile 保持形象一致 | 设定管理 |
| **字数控制 Prompt** | 精确约束 AI 输出 | Prompt 工程 |

---

## 二、按功能维度分类

### A. UI 布局模式

| 模式 | 最佳参考 | 实现要点 |
|------|---------|---------|
| 三栏布局 | novel-engine | 全挂载 + CSS hidden + 可调宽度 |
| Master-Detail | cherry-studio | 左列表 + 右详情，URL 参数联动 |
| 树形导航 | inkos | 书籍→会话折叠列表 |
| 卡片网格 | cc-switch / cherry-studio | 渐变背景 + 边框状态 + 悬停操作 |
| 监控仪表盘 | PlotPilot | Grid 布局 + 5 组件组合 |
| 双视图 | PlotPilot | 平铺分页 + 树形结构切换 |

### B. 功能按钮模式

| 模式 | 最佳参考 | 实现要点 |
|------|---------|---------|
| QuickActions | novel-engine | ⚡图标 → Built-in + Saved 标签页弹出 |
| Bubble Menu | Tiptap + Novel | 选中文本 → floating-ui 定位 → AI 子菜单 |
| Slash 命令 | inkos / claw-code | `/` 触发 → 三级渐进 → Tab 补全 |
| 右键菜单 | NovelForge | 卡片节点 → 新建/重命名/引用/删除 |
| SSE 流式推送 | PlotPilot / 蚁群 | 后端 thread + Queue → 前端 EventSource |

### C. 日志系统模式

| 模式 | 最佳参考 | 实现要点 |
|------|---------|---------|
| 发布订阅 | AstrBot LogBroker | deque 缓存 + Queue 订阅者 |
| 双进程日志 | cherry-studio | renderer console + main Winston |
| JSONL 持久化 | claw-code | 追加写入 + 轮转 |
| 断线重连 | AstrBot | 指数退避 + Last-Event-ID |
| 前端查看器 | AstrBot ConsoleDisplayer | ANSI→CSS + 级别过滤 + 自动滚动 |

### D. 错误处理模式

| 模式 | 最佳参考 | 实现要点 |
|------|---------|---------|
| 三层分类 | claw-code | API(12) + 安全(9) + CLI(12) |
| 恢复配方 | claw-code | 场景→步骤序列→升级策略 |
| 熔断器 | PlotPilot | CLOSED→OPEN→HALF_OPEN 三态 |
| Repair Layer | NovelForge | json_repair + 多层解析降级 |
| ErrorBoundary | novel-engine | 顶层 + 组件级双层防护 |

### E. 自动化模式

| 模式 | 最佳参考 | 实现要点 |
|------|---------|---------|
| 守护进程 | PlotPilot | 5 秒轮询 + 节拍级幂等 + 事务最小化 |
| Scheduler | inkos | cron + 质量门控 + 温度递增 + 每日上限 |
| 工作流引擎 | NovelForge | 代码式 DSL + 幂等键 + 断点续传 |
| 5 种工作流 | 蚁群 | Single/Router/Planner/Supervisor/Peer |

---

## 三、关键代码路径速查

### 需要深入研究时，直接读这些文件：

**UI 布局：**
- novel-engine AppLayout: `novel-engine-0.7.0/src/renderer/components/Layout/AppLayout.tsx`
- novel-engine Sidebar: `novel-engine-0.7.0/src/renderer/components/Layout/Sidebar.tsx`
- inkos Studio App: `inkos-master/packages/studio/src/App.tsx`
- inkos Sidebar: `inkos-master/packages/studio/src/components/Sidebar.tsx`
- cherry-studio Settings: `cherry-studio-main/src/renderer/src/pages/settings/SettingsPage.tsx`

**编辑器：**
- cherry-studio RichEditor: `cherry-studio-main/src/renderer/src/components/RichEditor/index.tsx`
- cherry-studio useRichEditor: `cherry-studio-main/src/renderer/src/components/RichEditor/useRichEditor.ts`
- Novel Editor: `novel-main/apps/web/components/tailwind/`

**聊天/AI：**
- novel-engine ChatView: `novel-engine-0.7.0/src/renderer/components/Chat/ChatView.tsx`
- novel-engine MessageBubble: `novel-engine-0.7.0/src/renderer/components/Chat/MessageBubble.tsx`
- novel-engine QuickActions: `novel-engine-0.7.0/src/renderer/components/Chat/QuickActions.tsx`
- inkos ChatPage: `inkos-master/packages/studio/src/pages/ChatPage.tsx`
- inkos 交互运行时: `inkos-master/packages/core/src/interaction/runtime.ts`
- inkos 意图定义: `inkos-master/packages/core/src/interaction/intents.ts`

**自动化：**
- PlotPilot 守护进程: `PlotPilot-1.0.4/application/engine/services/autopilot_daemon.py`
- PlotPilot 熔断器: `PlotPilot-1.0.4/application/engine/services/circuit_breaker.py`
- inkos Scheduler: `inkos-master/packages/core/src/pipeline/scheduler.ts`
- NovelForge 工作流: `NovelForge-0.9.4/backend/app/services/workflow/engine/run_manager.py`

**日志/错误：**
- AstrBot 日志: `AstrBot-master/astrbot/core/log.py`
- AstrBot 日志 API: `AstrBot-master/astrbot/dashboard/routes/log.py`
- AstrBot 前端日志: `AstrBot-master/dashboard/src/components/shared/ConsoleDisplayer.vue`
- claw-code 错误: `claw-code-main/rust/crates/api/src/error.rs`
- claw-code 恢复: `claw-code-main/rust/crates/runtime/src/recovery_recipes.rs`

**Provider 管理：**
- cherry-studio ProviderList: `cherry-studio-main/src/renderer/src/pages/settings/ProviderSettings/ProviderList.tsx`
- cherry-studio ProviderSetting: `cherry-studio-main/src/renderer/src/pages/settings/ProviderSettings/ProviderSetting.tsx`
- cc-switch ProviderCard: `cc-switch-main/src/components/providers/ProviderCard.tsx`
- inkos ServiceListPage: `inkos-master/packages/studio/src/pages/ServiceListPage.tsx`

**工作流可视化：**
- 蚁群 GraphViewer: `Multi-Agent-Playground-main/frontend/src/components/GraphViewer.vue`
- 蚁群 TraceViewer: `Multi-Agent-Playground-main/frontend/src/components/TraceViewer.vue`
- 蚁群 SSE 路由: `Multi-Agent-Playground-main/backend/app/routes.py`

**全链路自动导演：**
- AI-Novel-Writing-Assistant 自动导演: `AI-Novel-Writing-Assistant-main/` (搜索 AutoDirector / CreativeHub)
- AI-Novel-Writing-Assistant 写法引擎: `AI-Novel-Writing-Assistant-main/` (搜索 WritingFormula)

**合同驱动 + 防幻觉：**
- webnovel-writer 合同系统: `webnovel-writer-6.0.0/` (搜索 MASTER_SETTING / Contract)
- webnovel-writer 六维审查: `webnovel-writer-6.0.0/` (搜索 reviewer / six_dimension)

**知识状态追踪：**
- thriller-main 知识矩阵: `thriller-main/thriller-writing/` (搜索 knowledge_state / character_matrix)
- thriller-main 约束检查: `thriller-main/thriller-writing/` (搜索 constraint_saturation)

**@DSL 上下文注入：**
- NovelForge @DSL: `NovelForge-main/` (搜索 @DSL / context_injection)
- NovelForge Schema-first: `NovelForge-main/` (搜索 schema / card_type)

**写-审-记闭环：**
- auto_novel_writer: `auto_novel_writer-master/agents/` (WriterAgent / ReviewerAgent / MemoryAgent)

**Prompt 工程：**
- AI_NovelGenerator 雪花写作法: `AI_NovelGenerator-main/prompts/`
- Humanizer-zh 24种痕迹: `Humanizer-zh-main/SKILL.md`
- web-novel-master 爆款四法则: `web-novel-master-main/` (搜索 Plot/ 爆款法则)
