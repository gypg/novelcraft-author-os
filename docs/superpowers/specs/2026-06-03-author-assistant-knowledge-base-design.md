# NovelCraft 作者辅助创作与 Author OS 设计（v6.2 Architecture Freeze）

> 日期：2026-06-03
> 状态：Architecture Frozen（v6.2 工程契约冻结）
> 目标：将 NovelCraft 从“AI 小说工厂优先”重新收敛为“本地优先的作者辅助创作工具”，并冻结外部素材库 + 本书创作库 + 作者库的工程契约。
> 下一阶段：Writing Plans → Implementation。

## 1. 背景与决策

当前项目已经规划并实现了大量 AI 写作能力，包括编辑器、Provider、真相文件、时序记忆、多 Agent、自动驾驶、导出与知识图谱等。但原路线偏向“AI 小说工厂”，功能面过宽，默认路径不够聚焦。

新的产品方向是：

> NovelCraft 是本地优先的作者辅助创作工具。它把小说编辑器、创作设定、个人摘抄库、名言警句、灵感笔记和 AI 建议整合在一起，让作者在写作时随时调用自己的阅读积累与本书设定。自动工厂不是独立产品模式，而是 Lv4-Lv5 自动化工作流名称；默认主线仍是辅助创作。

已确认的关键选择：

- 采用“专业小说编辑器优先 + 个人作者/网文作者 + 半自动 AI + 保留现有代码稳定化 + 继续 Tauri”。
- 知识库采用“外部素材库 + 本书创作库 + 作者库”三层结构，数据和 UI 分层。
- 摘抄使用策略采用“原文引用 + 化用建议并存”。
- 分类采用多维标签，同一素材可同时属于用途、情绪、场景、题材、技法等多个维度。
- 辅助创作是默认底座，自动工厂升级为自动化等级体系中的最高等级，而不是独立产品。
- 检索优先级固定为：本书创作库 > 作者库 > 外部素材库 > 后续互联网资料。
- v6.2 总体新增能力必须覆盖作者库、检索优先级和拆书模式；执行顺序仍以 Sprint A-I 为准，拆书模式后置到 Sprint G。

## 2. 产品定位

### 2.1 默认模式：辅助创作

辅助创作模式是默认入口。作者手动写作，AI 作为副驾驶提供：

- 续写
- 润色
- 改写
- 去 AI 味
- 审稿
- 摘抄/名言/意象建议
- 本书设定提醒
- 伏笔与角色状态提醒

核心原则：AI 不默认接管正文，不自动污染设定。需要写入本书事实、真相文件或创作库的内容，应先由用户确认。

### 2.2 自动化等级体系

产品不再维护“辅助创作 / 自动工厂”两套模式，而是用同一套界面、数据和流程表达不同自动化等级：

```text
Lv0 纯写作：作者自己写，系统只保存和管理资料
Lv1 AI 建议：AI 提供素材、设定、伏笔和风格提醒
Lv2 AI 续写：AI 基于当前上下文续写片段
Lv3 AI 章节生成：AI 根据章纲生成单章草稿，用户确认后写入
Lv4 批量章节生成：AI 按多个章纲逐章生成，每章暂停确认
Lv5 自动工厂：AI 在质量门控和人工检查点下连续推进
```

默认等级是 Lv1。自动工厂是 Lv5，不是独立产品入口。任何等级都必须复用同一套：

- 本书设定
- 章节大纲
- 真相文件
- 时序记忆
- 外部素材库
- 本书创作库
- 作者库
- 审稿标准

第一阶段最高只需要稳定到 Lv2 或 Lv3；Lv4/Lv5 后置。

### 2.3 高级工作流：自动工厂

自动工厂保留为 Lv4-Lv5 自动化工作流名称，不是独立产品模式，也不提供“辅助创作 / 自动工厂”的模式切换。UI 只出现自动化等级切换；当等级进入 Lv4/Lv5 时，可展示“自动工厂”工作流入口。

自动工厂重接入的第一版应是“半自动批处理”：用户选择若干章纲，AI 逐章生成草稿，每章生成后暂停等待人工确认。确认前不得写入最终正文，也不得自动修改本书事实。该能力属于 Sprint I，不进入 Sprint A-F。

## 3. 三层知识库

知识库是新路线的中心能力，分为外部素材库、本书创作库和作者库。三层知识库共同构成 Author OS 的记忆底座：本书创作库保证设定不乱，作者库保证 AI 知道“你怎么写”，外部素材库提供灵感与表达资源。

### 3.1 外部素材库

外部素材库用于沉淀作者平时阅读、摘抄、拆书、收集的表达资源。

典型内容：

- 名著段落
- 用户摘抄的句子
- 名言警句
- 写景素材
- 人物描写
- 对话片段
- 情绪表达
- 文学技法样例
- 主题意象

素材条目字段：

- `id`：素材 ID
- `content`：原文内容
- `source_title`：来源标题
- `source_author`：作者
- `source_type`：`public_domain | user_original | copyrighted | unknown`；第一版存于 `knowledge_sources.source_type`，条目级版权/引用差异通过 `knowledge_items.quote_policy` 覆盖
- `usage_tags`：用途标签，如写景、人物、情绪、哲理、冲突、对话、氛围
- `scene_tags`：场景标签，如雨夜、战斗、离别、重逢、宴会、独处
- `emotion_tags`：情绪标签，如孤独、愤怒、温柔、压抑、高昂
- `genre_tags`：题材标签，如玄幻、都市、悬疑、言情、历史
- `technique_tags`：技法标签，如借景抒情、白描、对比、反讽、留白
- `position_tags`：适用位置，如开头、转折、高潮、结尾、章末钩子
- `quote_policy`：`direct_allowed | paraphrase_recommended | direct_forbidden`
- `notes`：用户备注
- `created_at` / `updated_at`

引用策略：

- 用户原创、公版文本：可以原文引用，也可以化用。
- 受版权保护文本：默认只给化用建议和出处提醒，不直接一键插入原文。
- 来源未知文本：默认化用建议，除非用户手动改为可直接引用。

### 3.2 本书创作库

本书创作库用于组织当前小说自己的创作资料。它面向作者展示为笔记和卡片，不直接暴露底层 JSON。

典型内容：

- 角色卡
- 世界观
- 地点
- 物品
- 组织/势力
- 伏笔
- 时间线
- 章节摘要
- 作者临时笔记
- 灵感碎片

它与现有 Truth Files / temporal-memory 相关，但边界如下：

- 本书创作库是作者可编辑的知识层。
- Truth Files 是 AI 写作的一致性状态层。
- temporal-memory 是章节事实的时序检索层。
- AI 从正文提取的新事实进入”待确认”状态，用户确认后再同步到本书创作库和 Truth Files。

### 3.3 作者库（Author Profile + Author Memory）

作者库解决的核心问题：AI 知道名家怎么写，却不知道”你怎么写”。

作者库是跨书籍的、持久的，记录作者个人的写作风格、偏好和习惯。所有 AI 操作（续写、润色、审稿、工厂）都必须继承作者库中的风格约束。

`Author Memory` 是产品概念；规范持久化表是 `author_memory_versions` 与 `author_memory_snapshots`，不是单例 `author_memory` 表。

#### Author Profile（显式声明）

作者主动填写或确认的偏好：

```text
author_profiles
- id
- name：笔名
- preferred_genres：偏好题材（如升级流、慢热、群像）
- writing_style：自述风格（如”短句为主，不喜欢长描写”）
- common_phrases：标志性句式（如”直到这一刻”、”没人知道”）
- favorite_themes：偏好主题（如命运、救赎、成长）
- forbidden_words：禁用词汇（如不想用”竟然”、”不禁”）
- pov_preference：视角偏好（第一人称、第三人称限知、全知）
- pace_preference：节奏偏好（快节奏、慢热、波浪式）
- notes：其他备注
- created_at / updated_at
```

#### Author Memory（自动分析）

系统自动从作者已有作品中提取的统计指纹。Author Memory 不是普通配置，而是可版本化的风格模型。

```text
author_memory_versions
- id
- profile_id
- version_name
- status: active | archived | experimental
- analysis_scope：分析范围（如”最近 50 章”、”全部作品”、”某本书”）
- sample_word_count：样本总字数
- avg_sentence_length：平均句长
- sentence_length_variance：句长方差
- dialogue_ratio：对话比例
- top_words：高频词 TOP 50
- top_phrases：高频短语 TOP 30
- rhythm_pattern：节奏模式（short-dense / mixed / long-flowing）
- punctuation_density：标点密度
- paragraph_avg_length：段落平均长度
- scene_transition_style：场景切换风格
- chapter_opening_patterns：开篇模式
- chapter_ending_patterns：结尾模式
- fingerprint_json：完整风格指纹 JSON
- analyzed_at
```

Author Memory 版本应像 Git Branch 一样管理，而不是只保存“最新统计结果”。这使作者后续可以保留和切换：

- 轻小说风格
- 男频爽文风格
- 出版文学风格
- 某本旧书的历史风格
- 实验风格

#### Author Memory Snapshot Lifecycle

为防止全量重建覆盖旧风格，系统必须保留快照表：

```text
author_memory_snapshots
- id
- profile_id
- memory_version_id
- snapshot_type: auto_incremental | manual_full_rebuild | before_rebuild | user_named
- analysis_scope
- sample_word_count
- fingerprint_json
- notes
- created_at
```

生命周期规则：

1. 增量分析生成新的 `author_memory_versions` 记录，不覆盖旧版本。
2. 全量重建前自动创建 `before_rebuild` 快照。
3. 用户可以把某个版本命名保存，如“早期轻快风格”“后期成熟风格”。
4. Writer Agent 默认使用 `status = active` 的 Author Memory Version。
5. `experimental` 版本可用于单次写作或风格实验，但不得自动设为 active。
6. 旧版本只能 archived，不物理删除，除非用户明确执行删除。

Author Memory 的生成方式：

1. 手动触发：用户点击”分析我的写作风格”
2. 自动更新：每完成 N 章后自动刷新（可配置）
3. 默认仅增量分析最近新增章节，不重新扫描全部作品；仅在用户手动选择“全量重建”时重新分析完整样本
4. 分析维度可渐进扩展

Author Memory 的使用方式：

- Writer Agent 续写时注入作者风格指纹
- Auditor Agent 审稿时检测是否偏离作者风格
- 工厂模式必须符合 Author Profile 约束
- 去 AI 味时参照作者自身习惯，而非通用禁用词表

### 3.4 Canonical Data Protection Rules

本节是 v6.2 的核心工程冻结项，定义所有 Agent 对规范数据（canonical data）的读写边界。它适用于 Writer Agent、Planner Agent、Auditor Agent、Observer Agent、Director Agent、Factory Agent 以及后续新增 Agent。

核心原则：

```text
AI can generate
≠
AI can persist

AI can suggest
≠
AI can mutate canonical data
```

也就是说，AI 可以生成草稿、建议、分析结果、事实候选和标签候选，但不等于它可以直接写入最终正文、本书设定、Truth Files 或作者档案。

#### 3.4.1 AI Write Permission Matrix

| 数据对象 | AI 可读取 | AI 可生成 | AI 可直接写入 | 默认策略 |
|---|---:|---:|---:|---|
| 正文草稿 | 是 | 是 | 有条件 | Lv2 可插入片段；Lv3+ 生成章节草稿；最终正文需用户确认 |
| 当前章节草稿区 | 是 | 是 | 是 | 可作为临时草稿写入，必须保留人工确认入口 |
| 最终正文 | 是 | 是 | 否 | 必须用户接受后写入 |
| 本书创作库 | 是 | 是 | 否 | AI 提取的新设定进入 pending，用户确认后变为 confirmed |
| Truth Files | 是 | 是 | 否 | 默认只读；AI 只能提交 delta proposal，经确认或严格规则校验后写入 |
| temporal-memory | 是 | 是 | 有条件 | 可写 observed facts，但必须记录来源、章节、置信度和可回滚状态 |
| Author Profile | 是 | 否 | 否 | 用户显式偏好，只允许用户手动编辑 |
| Author Memory | 是 | 是 | 有条件 | 系统分析生成新版本，不覆盖旧版本；用户选择 active 版本 |
| 外部素材库 | 是 | 是 | 否 | AI 可生成候选素材、标签和化用建议，用户确认后入库 |
| 标签系统 | 是 | 是 | 有条件 | AI 可建议标签，用户可批量确认；不得静默创建污染性标签 |
| 拆书报告 | 是 | 是 | 有条件 | `book_analysis_reports` 可作为分析产物直接写入；由报告提取出的 `knowledge_items` 必须进入 pending，用户确认后才成为外部素材 |
| Provider / API Key | 否 | 否 | 否 | AI 永远不可读取、生成、修改或暴露明文凭据 |

#### 3.4.2 Proposal → Pending → Confirmed

所有会影响长期知识状态的数据写入，必须采用三段式流程：

```text
proposal
  → pending
  → confirmed
```

- `proposal`：AI 生成的候选内容，只存在于当前操作结果或临时任务产物中。
- `pending`：用户尚未确认，但系统需要暂存以便批量审核的候选内容。
- `confirmed`：用户显式接受后，才允许写入本书创作库、Truth Files，或创建新的 Author Memory Version / 将某个 Author Memory Version 设为 active；不得原地覆盖 active version。

#### 3.4.3 防知识污染规则

1. 外部素材不得自动写入本书创作库。
2. 拆书分析不得自动成为本书设定。
3. AI 从正文提取的新事实不得自动覆盖 Truth Files。
4. Author Profile 永远是用户声明，不允许 AI 自动改写。
5. Author Memory 允许系统分析生成，但必须版本化，且不得覆盖历史版本。
6. 所有自动写入 temporal-memory 的事实必须可追溯到章节和原文片段。
7. 拆书报告本身可写入 `book_analysis_reports`；但从报告提取出的素材卡片、技法标签和结构模板，必须按 pending → confirmed 流程进入外部素材库。
8. 任意 Agent 如果无法判断写入权限，默认降级为 proposal。

这套规则的目的，是避免形成以下反馈回路：

```text
AI 自己生成设定
  → 自动写入规范数据
  → 下次检索又引用自己生成的设定
  → 设定污染被放大
```

因此，NovelCraft 的默认安全姿态是：AI 可以帮作者思考，但不能替作者篡改事实。

## 4. 一键导入与分类

### 4.1 支持来源

第一版支持：

- 粘贴文本
- `.txt`
- `.md`

后续扩展：

- `.docx`
- `.epub`
- 网页剪藏
- PDF

第一版不做复杂 PDF/网页解析，避免偏离核心写作链路。

### 4.2 导入流程

```text
导入文本或文件
  → 文本清洗
  → 自动切分为段落/句子/摘抄候选
  → 规则生成基础素材卡片草稿
  → 用户批量确认/删除/修改标签
  → AI 多维分类（Sprint E 之后增强，不阻塞 Sprint A）
  → 写入外部素材库
```

### 4.3 分类维度

一键分类不是单选，而是多维标签提取。每条素材可以同时拥有：

- 来源类型
- 文学用途
- 场景
- 情绪
- 题材
- 技法
- 适用位置
- 引用策略
- 关键词

示例：

```text
内容：雨声压低了街巷的喧哗，像有人把整座城按进掌心。
用途：写景、氛围
场景：雨夜、城市
情绪：压抑、孤独
技法：借景抒情、拟人
适用位置：章节开头、转折前
引用策略：建议化用
```

## 5. 写作时智能建议

### 5.1 UI 入口

编辑器右侧新增“灵感建议”面板，和大纲、审稿、版本等面板并列。v6.2 最终右侧面板顺序以 [9.5 与右侧面板的关系](#95-与右侧面板的关系) 为准；“设定提醒”不再作为独立 Tab，而是折入“驾驶舱”和“灵感建议”。

### 5.2 检索优先级与权重

知识库检索必须有明确优先级，否则外部素材会污染本书设定。

#### 检索层级

```text
Level 1：本书创作库（本书设定、角色、伏笔、时间线）
Level 2：作者库（作者风格、偏好、禁用词）
Level 3：外部素材库（摘抄、名言、技法样例）
Level 4：互联网资料（后期，暂不实现）
```

#### Knowledge Retrieval Contract

为避免 Tag Search、BM25 Search、Conflict Filter、Author Filter、LLM Rerank 和 UI Suggestion Panel 各自定义 DTO，v6.2 冻结统一返回契约：

```typescript
interface KnowledgeCandidate {
  id: string
  libraryType: 'project' | 'author' | 'external'
  canonicalLevel: 'canonical' | 'reference' | 'inspiration'
  itemType:
    | 'quote'
    | 'note'
    | 'character'
    | 'location'
    | 'object'
    | 'hook'
    | 'summary'
    | 'idea'
    | 'technique'
    | 'analysis'

  content: string
  sourceId?: string
  sourceTitle?: string
  sourceAuthor?: string

  score: number
  scoreBreakdown: {
    projectRelevance: number
    authorStyleFit: number
    externalInspiration: number
    recency?: number
    tagMatch?: number
    bm25?: number
    rerank?: number
  }

  reason: string
  conflictFlags: string[]

  quotePolicy:
    | 'direct_allowed'
    | 'paraphrase_recommended'
    | 'direct_forbidden'
    | 'not_applicable'

  suggestedAction:
    | 'insert_direct'
    | 'paraphrase'
    | 'show_reminder'
    | 'open_detail'
    | 'block'

  metadata?: Record<string, unknown>

  trace?: {
    retrievalSource:
      | 'tag'
      | 'bm25'
      | 'author_memory'
      | 'rerank'
    retrievalVersion: string
  }
}
```

契约原则：

1. Retriever 不直接决定 UI 行为。
2. Retriever 只返回候选、分数、原因、冲突、引用策略、建议动作和 trace。
3. UI 根据 `quotePolicy` 与 `suggestedAction` 决定展示“插入原文 / 化用生成 / 查看来源 / 阻止插入”等按钮。
4. `canonicalLevel` 用于区分候选的规范强度：本书已确认事实 / Truth Files 为 `canonical`，Author Profile / Author Memory 为 `reference`，外部摘抄 / 拆书分析为 `inspiration`。
5. `metadata` 用于承载 item_type 专属字段，避免第一版过早拆表；作者库候选可用 `itemType: 'analysis'` 并在 `metadata.profileId` / `metadata.authorMemoryVersionId` 中承载来源。
6. `trace` 用于调试推荐原因，回答“为什么推荐了这句”。
7. 所有检索阶段都必须尽量保留 scoreBreakdown，不允许只返回最终分数。
8. `quotePolicy = not_applicable` 用于角色、地点、伏笔、摘要、Author Memory 等非引用型候选。
9. Level 4 互联网资料暂不属于 v6.2 契约；未来接入时可通过扩展 `libraryType` 增加 `web`。

示例调试信息：

```text
为什么推荐了这句？

retrievalSource: bm25
score: 0.83
bm25: +0.71
rerank: +0.12
authorStyleFit: -0.08
reason: 当前段落包含“雨夜”“离别”，与素材 scene_tags 和 emotion_tags 匹配。
```

#### 权重分配

```text
本书设定：60%
作者风格：25%
外部素材：15%
```

第一版实现为硬性层级优先 + 层内相关性排序：先按 `libraryType` 保证 Project > Author > External，再在同层内用标签 / BM25 / 风格匹配分数排序。`60/25/15` 表示解释性 scoreBreakdown 的基准占比，不允许外部素材因局部文本相似度反转本书设定优先级。

#### 设计原因

用户最不能接受的是设定被污染，而不是少推荐一句金句。所以：

- 本书设定永远优先级最高，任何推荐不得与本书事实矛盾。
- 作者风格次之，推荐的素材如果不符合作者风格（如作者偏好短句，推荐的素材全是长排比），应降权。
- 外部素材只作为灵感补充，不能覆盖前两层。

#### 冲突处理

- 外部素材建议与本书设定矛盾 → 自动过滤，不展示。
- 外部素材建议与作者风格不符 → 降权但可展示，标注"风格差异"。
- 本书设定之间矛盾 → 高亮为"设定冲突"，提醒作者修正。

### 5.3 推荐输入

推荐系统根据以下上下文检索和生成建议：

- 当前段落
- 光标附近上下文
- 当前章节标题
- 当前章纲
- 当前场景标签
- 当前出场角色
- 本书设定
- 近期章节摘要
- 伏笔状态
- 外部素材标签

### 5.4 推荐输出

灵感建议面板展示：

- 可直接引用的句子
- 可化用的表达
- 相关意象
- 相似场景素材
- 本书设定提醒
- 角色知识状态提醒
- 伏笔提醒

示例：

```text
当前语境：雨夜离别

1. 原文引用
「……」
来源：《某公版作品》
适合：章节开头 / 借景抒情
操作：插入 / 收藏到本章 / 查看来源

2. 化用建议
可以借鉴“雨声压低人物情绪”的写法，不直接引用原句。
操作：生成化用句 / 忽略 / 不再推荐

3. 本书提醒
角色 A 此时还不知道 B 的真实身份，避免写出越界信息。
操作：查看角色知识状态
```

### 5.5 交互动作

每条建议提供：

- 插入原文
- 化用生成
- 收藏到本章
- 忽略
- 标记不再推荐
- 查看来源
- 修改标签

系统不得在未确认的情况下自动把外部素材写入正文。

## 6. MiroFish 与 Obsidian 的借鉴边界

### 6.1 Obsidian 借鉴点

适合直接借鉴产品形态：

- 笔记
- 双链
- 反向链接
- 标签
- 文件夹/库
- Markdown 组织方式
- 图谱视图
- 搜索与快速跳转

第一版不做完整 Obsidian 插件生态，不把 NovelCraft 做成泛知识管理工具。知识库必须服务小说创作。

### 6.2 MiroFish 借鉴点

MiroFish 对本项目有参考价值，但第一版不直接集成其 Zep Cloud 方案。

可借鉴：

- 文本分块
- 本体/实体类型设计
- 图谱构建流程
- 从大文本中提取实体关系
- 基于图谱生成报告
- 大文本导入后的任务进度管理

暂不采用：

- Zep Cloud 作为必需依赖
- 群体智能仿真作为 MVP 主路径
- 复杂平行世界模拟
- 后端 Python 服务并入 Tauri 主流程

第一版采用本地轻量实现：SQLite + 标签 + 链接 + 可选后续 embedding。

## 7. 拆书模式（作品分析任务）

拆书模式是知识库导入的高级形态。当用户导入的不是碎片摘抄，而是一整本小说时，系统不仅做分类摘抄，还应该对作品进行结构分析，生成可复用的"作品分析报告"。

### 7.1 为什么需要

用户一定会导入名著：《斗破苍穹》《诡秘之主》《庆余年》《道诡异仙》等。

只做摘抄分类（写景、情绪、冲突）太浅。真正有价值的是理解一部作品的叙事结构，供作者学习和参考。

### 7.2 拆书分析维度

导入一本小说后，系统生成：

```text
人物结构
- 主角
- 配角
- 反派
- 导师
- 功能性角色

冲突结构
- 第一卷核心冲突
- 第二卷核心冲突
- …
- 全书总冲突

爽点结构
- 打脸
- 升级
- 反转
- 装逼
- 情感爆发

节奏结构
- N 章一个小高潮
- M 章一个大高潮
- 卷首/卷末模式

技法提取
- 开篇钩子类型
- 章末悬念类型
- 时间跳跃方式
- 视角切换频率
- 对话/叙述/描写比例
```

### 7.3 拆书流程

```text
导入整本小说文本
  → 文本清洗
  → 按章节切分
  → AI 逐维度分析（可分批、可后台）
  → 生成作品分析报告
  → 用户查看/编辑/确认
  → 分析结论写入外部素材库（如技法样例）
  → 结构模板可在新书大纲规划时参考
```

### 7.4 产出物

- 作品分析报告（结构化 JSON + Markdown 展示）
- 摘抄素材卡片（自动提取的精彩段落）
- 技法标签（从该作品中提取的写作手法）
- 节奏模板（可应用到新书规划）

### 7.5 与知识库的关系

拆书分析产出归属于外部素材库，不新增第四类库。结构模板、技法样例、摘抄卡片统一写入 `library_type = external`；通过 `item_type = analysis | technique | quote` 区分具体用途，必要时用 `source_type` 记录来源版权属性。

分析报告本身作为独立文档存储，不和碎片素材混在一起。

### 7.6 第一版限制

- 第一版支持 `.txt` / `.md` 格式
- 文本最大长度可配置（如 200 万字）
- 分析可能需要多次 LLM 调用，用后台任务 + 进度条
- 不需要一次全部分析到位，可以按维度逐步扩展

## 8. 数据模型建议

### 8.1 第一版新增本地表

```text
author_profiles
- id
- name
- preferred_genres
- writing_style
- common_phrases
- favorite_themes
- forbidden_words
- pov_preference
- pace_preference
- notes
- created_at
- updated_at

author_memory_versions
- id
- profile_id
- version_name
- status: active | archived | experimental
- analysis_scope
- sample_word_count
- avg_sentence_length
- sentence_length_variance
- dialogue_ratio
- top_words (JSON)
- top_phrases (JSON)
- rhythm_pattern
- punctuation_density
- paragraph_avg_length
- scene_transition_style
- chapter_opening_patterns (JSON)
- chapter_ending_patterns (JSON)
- fingerprint_json (JSON)
- analyzed_at

author_memory_snapshots
- id
- profile_id
- memory_version_id
- snapshot_type: auto_incremental | manual_full_rebuild | before_rebuild | user_named
- analysis_scope
- sample_word_count
- fingerprint_json (JSON)
- notes
- created_at

knowledge_sources
- id
- title
- author
- source_type
- publication_year
- notes
- created_at
- updated_at

knowledge_items
- id
- source_id
- book_id nullable
- library_type: external | project | author
- canonical_level: canonical | reference | inspiration
- item_type: quote | note | character | location | object | hook | summary | idea | technique | analysis
- content
- quote_policy
- status: proposal | pending | confirmed | archived
- metadata_json
- notes
- created_at
- updated_at

knowledge_tags
- id
- category: usage | scene | emotion | genre | technique | position | custom
- name
- color

knowledge_item_tags
- item_id
- tag_id

knowledge_links
- id
- from_item_id
- to_item_id
- relation_type: references | inspires | contradicts | supports | same_scene | same_character
- notes

knowledge_suggestions
- id
- book_id
- chapter_id
- item_id
- suggestion_type: direct_quote | paraphrase | reminder | style_hint
- reason
- priority_level: 1-3 (1=本书设定, 2=作者风格, 3=外部素材)
- status: shown | inserted | dismissed | blocked
- created_at

book_analysis_reports
- id
- source_id
- title
- character_structure (JSON)
- conflict_structure (JSON)
- highlight_structure (JSON)
- rhythm_structure (JSON)
- technique_extraction (JSON)
- status: processing | completed | failed
- created_at
- updated_at
```

### 8.2 数据库拆分路线

第一版 `knowledge_items` 承担多种 item_type 是合理的短期决策。但长期来看，随着图谱、双链、时间线等高级功能的引入，应预留拆分路线：

```text
第一版（当前）
- knowledge_items（统一表，item_type 区分）

第二版（Phase 12 后考虑）
- knowledge_quotes（摘抄专用）
- knowledge_notes（笔记专用）
- knowledge_characters（角色专用）
- knowledge_locations（地点专用）
- knowledge_hooks（伏笔专用）
- knowledge_items 保留为通用兜底
```

拆分标准：当某个 item_type 的专属字段超过 3 个，或查询模式显著不同时，独立建表。

当前不拆，但命名和查询接口应设计为可替换，不在 UI 层硬编码 `WHERE item_type = 'character'` 之类的逻辑。

### 8.3 后续可扩展

```text
knowledge_embeddings
- item_id
- model
- vector
- created_at
```

如果暂不引入本地向量库，第一版可以用标签匹配 + BM25 + LLM rerank。

## 9. 创作驾驶舱

创作驾驶舱是编辑器右侧的实时上下文面板，比"灵感建议"更进一步，它让作者在写作时始终知道当前章节的关键状态。

### 9.1 为什么需要

写作时作者经常需要回头翻看设定、检查伏笔、确认角色位置。来回切页面打断心流。驾驶舱把最关键的信息聚合在一个面板，一眼可见。

### 9.2 驾驶舱内容

```text
创作驾驶舱

当前章节：第 23 章「旧城区的雨」

出场角色：
  林默（主视角）
  苏晚（对话中提及）

当前地点：
  旧城区 - 废弃工厂

当前时间：
  降临日前 3 天

活跃伏笔：
  ⚠ 黑色药片（第 5 章埋设，未回收）
  ⚠ 苏晚的真实身份（第 12 章暗示）
  ✓ 老张的遗言（第 20 章已回收）

未回收伏笔总数：7 个

本章字数：2,860
本章目标：3,000 - 4,000
全书字数：68,400

推荐素材：5 条可用
设定冲突：0 个

自动化等级：Lv1 建议模式
```

### 9.3 数据来源

驾驶舱的数据完全从已有系统聚合，不新建独立数据源：

- 出场角色：从当前章节正文 + 角色状态服务推断
- 地点/时间：从当前世界状态服务读取
- 伏笔：从伏笔状态服务读取
- 字数：从编辑器实时统计
- 推荐素材：从知识库检索结果计数
- 设定冲突：从约束校验器结果

### 9.4 交互

- 点击角色名 → 跳转角色卡
- 点击伏笔 → 跳转伏笔详情
- 点击地点 → 查看地点设定
- 点击推荐素材数 → 展开灵感建议面板
- 驾驶舱默认折叠为紧凑模式，可展开查看完整信息

### 9.5 与右侧面板的关系

右侧面板 Tab 更新为：

1. 驾驶舱（紧凑实时状态）
2. 大纲
3. 灵感建议
4. 审稿
5. 版本

驾驶舱是默认首屏 Tab。

## 10. UI 调整

主导航收敛为：

```text
书库
编辑器
知识库
AI 助手
导出
设置
```

知识库页面分区：

```text
外部素材
本书设定
作者档案
摘抄箱
标签管理
导入任务
拆书分析
关系图谱（后续）
```

顶部自动化等级指示器：

```text
当前等级：[Lv1 AI 建议 ▾]

Lv0 纯写作
Lv1 AI 建议
Lv2 AI 续写
Lv3 AI 章节生成
Lv4 批量章节生成
Lv5 自动工厂（高级）
```

自动工厂工作流入口保留，但文案明确为 Lv4-Lv5 高级流程：

> 自动工厂会基于章纲、设定和知识库批量生成草稿。每章完成后需要你确认，确认前不会写入最终正文。

## 11. 阶段路线图

v6.2 冻结后的开发顺序不再机械沿用原 Phase 编号，而是按工程依赖拓扑排序：

```text
A  Knowledge Base Foundation
B  Author Profile
C  Inspiration Panel v1

D  Author Memory
E  Retrieval Ranking
F  Writing Cockpit

G  Book Analysis
H  Chapter Generator
I  Auto Factory
```

依赖关系：

```text
C 依赖 A+B
E 依赖 A+B+D
F 依赖 A+C+E
G/H/I 不被主链依赖，可后置
```

原 Phase 编号仍保留作需求归档，但 Writing Plans 和 Implementation 应按 Sprint A-I 执行。

### Sprint A：Knowledge Base Foundation

对应原 Phase 9。目标：用户可以手动建立摘抄、本书笔记、来源和标签，先把知识数据可靠存下来。

任务：

- 新增知识库数据模型（Rust 表 + 前端 Repository）
- 来源管理（CRUD）
- 标签系统（多维标签、颜色）
- 手动新增摘抄
- 粘贴导入
- 知识库列表、搜索、筛选
- 引用策略标记

### Sprint B：Author Profile

对应原 Phase 10 前半。目标：先做显式作者档案，不急着自动分析。

任务：

- Author Profile 编辑页面
- `author_profiles` 表与 Repository
- Writer Agent 注入显式风格约束
- 去 AI 味使用 forbidden_words / common_phrases

### Sprint C：Inspiration Panel v1

对应原 Phase 12 前半。目标：先打通“编辑器上下文 → 检索 → 右侧展示”链路，不接复杂 AI。

任务：

- 右侧“灵感建议”面板
- 基于关键词 / 标签 / item_type 检索
- 本书 > 作者 > 外部优先级雏形
- 插入 / 收藏 / 忽略 / 查看来源
- quote_policy 控制按钮展示

### Sprint D：Author Memory

对应原 Phase 10 后半。目标：AI 知道“你怎么写”，且风格模型可版本化。

任务：

- `author_memory_versions`
- `author_memory_snapshots`
- 从已有章节提取风格指纹
- 分析结果展示
- active / archived / experimental 状态切换
- Writer Agent 注入 active Author Memory
- Auditor Agent 检测风格偏离

### Sprint E：Retrieval Ranking

对应原 Phase 12 后半。目标：实现 v6.2 冻结的 Knowledge Retrieval Contract 和 60/25/15 权重。

任务：

- KnowledgeRetriever 契约
- 检索权重实现：本书 60 / 作者 25 / 外部 15
- BM25 + 标签匹配
- 冲突过滤
- 风格差异降权
- LLM rerank 与化用建议
- trace / scoreBreakdown 调试展示

### Sprint F：Writing Cockpit

对应原 Phase 13。目标：作者写作时一眼看到当前章关键状态。

任务：

- 驾驶舱面板（右侧默认 Tab）
- 出场角色自动识别
- 当前地点/时间展示
- 活跃伏笔列表
- 字数/目标进度
- 推荐素材计数
- 设定冲突提示
- 紧凑/展开两种模式

### Sprint G：Book Analysis

对应原 Phase 11。目标：导入整本名著后得到结构分析报告。

任务：

- 整本导入流程（txt/md）
- 文本分章
- AI 逐维度分析（后台任务 + 进度条）
- 作品分析报告展示
- 精彩段落自动提取为素材卡片
- 技法标签提取
- 节奏模板可应用到新书规划

### Sprint H：Chapter Generator

目标：在知识库、作者库和检索排序稳定后，再接入 Lv3 章节生成。

任务：

- 基于章纲生成单章草稿
- 草稿区与最终正文分离
- 用户确认后写入最终正文
- 遵守 AI Write Permission Matrix
- 审稿与设定检查

### Sprint I：Auto Factory

对应原 Phase 14。目标：自动工厂（Lv4-Lv5）复用知识库和作者库。

任务：

- 知识库增强生成
- 作者风格强制继承
- 批量章纲生成草稿
- 每章人工确认
- 审稿与设定检查
- 失败暂停与恢复
- 自动化等级 UI 完善

### 历史 Phase 映射（非执行顺序）

以下表格仅保留原 Phase 编号与 Sprint 的归档映射。v6.2 之后的 Writing Plans 和 Implementation 以 Sprint A-I 为准。

| 原 Phase | v6.2 Sprint | 说明 |
|---|---|---|
| Phase 8：稳定化与 UI 收敛 | Sprint A 前置稳定化 | 更新 PRD 到 v6.2、主导航收敛、自动化等级替换旧模式切换、隐藏半成品入口、验证核心链路 |
| Phase 9：知识库基础 | Sprint A | 知识库表、来源、标签、摘抄、粘贴导入、搜索筛选 |
| Phase 10：作者库 | Sprint B + Sprint D | Author Profile 先行；Author Memory 版本化后置 |
| Phase 11：拆书系统 | Sprint G | 整本导入、分章、分析报告、素材提取、节奏模板 |
| Phase 12：写作时建议 | Sprint C + Sprint E | 灵感面板 v1 先行；检索排序和 rerank 后置 |
| Phase 13：创作驾驶舱 | Sprint F | 右侧默认驾驶舱、角色/地点/伏笔/字数/冲突聚合 |
| Phase 14：自动工厂重接入 | Sprint I | Lv4-Lv5 批量生成、人工确认、质量门控、失败恢复 |

## 12. 风险与处理

### 12.1 版权风险

风险：用户导入受版权保护作品，系统直接建议原文插入。

处理：

- 每个来源有 source_type。
- 默认 unknown / copyrighted 为 paraphrase_recommended。
- 插入受限文本前提示来源风险。
- 化用建议优先于原文搬运。

### 12.2 知识污染风险

风险：外部素材被误写成本书事实。

处理：

- 外部素材库和本书创作库分层。
- 外部素材只作为灵感，不自动进入 Truth Files。
- AI 提取的新事实必须用户确认后才写入本书创作库。

### 12.3 功能膨胀风险

风险：做成泛 Obsidian 或复杂图谱产品，偏离小说写作。

处理：

- 第一版只保留服务写作链路的知识功能。
- 图谱视图、embedding、MiroFish 推理报告后置。
- 自动工厂后置。

### 12.4 推荐质量风险

风险：推荐素材不贴合当前段落，打断作者。

处理：

- 推荐默认在侧栏展示，不弹窗打扰。
- 支持忽略和“不再推荐”。
- 先用标签 + BM25，后续再加 embedding。
- LLM 只做 rerank 和化用，不负责无边界生成。

### 12.5 作者风格漂移风险

风险：Author Memory 基于历史数据，但作者风格可能随时间变化。

处理：

- Author Memory 定期刷新（可配置：每 N 章 / 手动触发）。
- 提供"忽略历史风格"选项供实验性写作使用。
- 不强制风格一致，只做提醒。

## 13. 验收标准

第一阶段验收（Sprint A-C 完成后）：

- 用户可以手动新增外部摘抄。
- 用户可以给摘抄打多维标签。
- 用户可以导入一段文本并生成候选素材。
- 用户可以批量确认候选素材。
- Author Profile 可编辑、保存。
- AI 续写时继承 Author Profile 中的显式风格约束。
- 编辑器右侧能基于当前段落推荐 3-5 条基础相关素材。
- 受版权保护/未知来源素材默认不提供直接插入按钮。
- 本书设定提醒和外部素材建议在 UI 上明确区分。
- 自动化等级指示器可切换。
- 自动工厂入口存在但标记为高级。

第二阶段验收（Sprint D-F 完成后）：

- Author Memory 可自动分析已有章节。
- Author Memory 以 version/snapshot 方式保存，重新分析不会覆盖旧风格。
- AI 续写时继承 active Author Memory。
- 检索优先级正确：本书设定 > 作者风格 > 外部素材。
- KnowledgeCandidate 返回 scoreBreakdown 与 trace，可解释推荐来源。
- 创作驾驶舱能显示当前章关键状态。

第三阶段验收（Sprint G-I 完成后）：

- 拆书模式可导入整本小说并生成分析报告。
- 拆书报告可提取候选素材，但入库前需要用户确认。
- Lv3 章节生成写入草稿区，不直接覆盖最终正文。
- Lv4/Lv5 自动工厂每章完成人工确认后才写入最终正文。
- 自动工厂遵守 AI Write Permission Matrix。

## 14. Freeze Patch（v6.2 进入 Writing Plans 前最后补丁）

### FP-01：统一知识状态机

`knowledge_items.status` 统一为：

```text
proposal    — AI 生成候选
pending     — 等待人工审核
confirmed   — 正式入库
archived    — 历史废弃
```

所有长期知识写入流程统一：`proposal → pending → confirmed`。

禁止再出现旧的并行命名（例如草稿态、用户确认态等）。原 Permission Matrix 中的旧确认态统一映射为 `confirmed`。

### FP-02：Author Memory Active 唯一约束

每个 `author_profile` 最多只能有一个 `active` 版本。

数据库约束：

```sql
CREATE UNIQUE INDEX uq_author_memory_active
  ON author_memory_versions(profile_id)
  WHERE status = 'active';
```

切换 active 时：旧 active → archived，新版本 → active。

Retriever、Writer Agent、Auditor Agent 默认只读取 active version。

### FP-03：KnowledgeCandidate 增加 Canonical Level

新增字段：

```typescript
canonicalLevel: 'canonical' | 'reference' | 'inspiration'
```

含义：

| Level | 含义 | 示例 |
|---|---|---|
| canonical | 规范事实 | Truth Files、Confirmed Character |
| reference | 参考约束 | Author Profile、Author Memory |
| inspiration | 灵感素材 | External Quote、Book Analysis |

Retrieval Ranking 可直接利用该字段排序。

### FP-04：Knowledge Ownership Rules

定义数据生命周期归属（用于未来删除/导出/迁移/归档时决定数据是否跟随书籍、作者或来源移动），并单独区分系统管理者：

| 归属 | 内容 | managedBy |
|---|---|---|
| Book Owned | 本书角色、地点、伏笔、时间线、book-scoped Truth Files、book-scoped temporal-memory | Author / System |
| Author Owned | Author Profile、Author Memory | Author / System |
| System Owned | 审稿结果、运行日志、系统派生缓存 | System |
| Source Owned | 外部素材、拆书素材、名言摘抄、book_analysis_reports | Author / System |

规则：

1. `Truth Files` 与 `temporal-memory` 是系统管理的本书数据：生命周期跟随书籍，写入仍受 AI Write Permission Matrix 约束。
2. `book_analysis_reports` 归属外部来源：报告可由系统写入，但从报告提取出的素材卡片必须 pending → confirmed 后才进入外部素材库。
3. 第一版无需新增 `owner_type` 字段；由 `library_type`、`book_id`、`source_id`、`profile_id` 推导生命周期。

此项不阻塞 Sprint A 开发，仅作归档约定。

---

## 15. 非目标

本设计第一阶段不做：

- 完整 Obsidian 插件生态
- Zep Cloud 强依赖
- MiroFish 群体仿真接入
- PDF/网页复杂解析
- 本地向量数据库
- 多用户协作
- 云同步增强
- 全自动无人值守写书
- Embedding 索引
- 图数据库
- 多 Agent 蚁群模式增强
