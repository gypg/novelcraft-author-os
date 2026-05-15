# 项目可用 Skill / 工具参考手册

> 每次新对话时 Claude 会读取此文件，快速判断可用工具，避免重复探索。
> 更新时间：2026-05-07

---

## 一、小说创作核心 Skill（直接可用）

| Skill | 用途 | 触发方式 |
|-------|------|----------|
| `webnovel-init` | 深度初始化网文项目，生成项目骨架与约束文件 | `/webnovel-init` |
| `webnovel-plan` | 基于总纲生成卷纲、时间线、章纲 | `/webnovel-plan` |
| `webnovel-write` | 产出可发布章节：上下文→起草→审查→润色→提交 | `/webnovel-write` |
| `webnovel-review` | 审查 agent 评估章节质量，输出问题清单 | `/webnovel-review` |
| `webnovel-query` | 查询项目设定、角色、势力、伏笔等 | `/webnovel-query` |
| `webnovel-dashboard` | 只读小说管理面板，查看状态与图谱 | `/webnovel-dashboard` |
| `webnovel-learn` | 从历史章节学习风格与模式 | `/webnovel-learn` |
| `khazix-writer` | 公众号长文写作（非小说，备用） | `/khazix-writer` |

---

## 二、UI / 前端开发相关 Skill

| Skill | 用途 |
|-------|------|
| `ui-styling` | shadcn/ui + Tailwind CSS 组件样式 |
| `ui-ux-pro-max` | UI/UX 设计智能：50+ 风格、161 调色板、161 产品类型 |
| `frontend-patterns` | React / Next.js 前端模式 |
| `react-localstorage-keyboard-nav` | React localStorage 键盘导航 |
| `virtual-list` | 虚拟列表（长章节滚动优化） |
| `css-append-selector-verify` | 安全追加 CSS |
| `enhance-typescript-ui-components` | TypeScript 组件增强（缩略图、徽章、动态样式） |
| `push-based-widget-module-pattern` | 侧边栏/小部件 UI 组件模式 |

---

## 三、后端 / 数据层相关 Skill

| Skill | 用途 |
|-------|------|
| `backend-patterns` | Node.js / Express / Next.js API 模式 |
| `postgres-patterns` | PostgreSQL 查询优化与安全 |
| `database-migrations` | 数据库迁移最佳实践 |
| `data-service` | 带熔断器的数据获取服务 |
| `data-service-circuit-breaker-aware` | 带熔断器的数据服务（含跳过规则） |
| `content-hash-cache-pattern` | 文件内容哈希缓存 |
| `clickhouse-io` | ClickHouse 分析型数据库（如需统计） |

---

## 四、架构 / 规划 Skill

| Skill | 用途 |
|-------|------|
| `blueprint` | 多会话多 agent 工程构建计划 |
| `planning` | Manus 式文件规划（task_plan.md / findings.md） |
| `planning-with-files` | 同上，支持会话恢复 |
| `brainstorming` | 创意工作前的需求探索（必用） |
| `subagent-driven-development` | 独立任务并行执行 |
| `dispatching-parallel-agents` | 2+ 独立任务分发 |
| `continuous-agent-loop` | 自主循环 agent 模式 |
| `agentic-engineering` | eval-first 执行 + 分解 + 模型路由 |
| `executing-plans` | 按计划执行 + review checkpoint |
| `writing-plans` | 多步骤任务的实施计划 |

---

## 五、代码质量 / 测试 / 安全 Skill

| Skill | 用途 |
|-------|------|
| `code-review` | 代码审查 |
| `security-review` | 安全审查 |
| `python-review` | Python 代码审查 |
| `tdd-workflow` / `test-driven-development` | TDD 开发流程 |
| `verification-loop` | 验证循环 |
| `systematic-debugging` | 系统性调试 |
| `build-graph` | 代码审查知识图谱 |
| `review-pr` | PR 审查 |
| `review-delta` | 仅审查变更差量 |
| `plankton-code-quality` | 写入时自动格式化/lint |

---

## 六、部署 / DevOps Skill

| Skill | 用途 |
|-------|------|
| `deployment-patterns` | CI/CD、Docker、健康检查、回滚 |
| `docker-patterns` | Docker Compose 开发环境 |
| `api-proxy-endpoint` | Vercel 无服务器 API 代理 |

---

## 七、研究 / 调研 Skill

| Skill | 用途 |
|-------|------|
| `search-first` | 写代码前先搜索现有方案 |
| `agent-reach` | 17 平台数据抓取（小红书/抖音/微博/推特/B站/Reddit 等） |
| `hv-analysis` | 横纵分析法深度研究（竞品分析） |
| `graphify` | 任意输入→知识图谱→HTML + JSON |

---

## 八、文档 / 清理 Skill

| Skill | 用途 |
|-------|------|
| `update-codemaps` | 更新代码地图 |
| `update-docs` | 更新文档 |
| `neat-freak` | 会话结束时文档同步审查 |
| `codebase-pattern-analyzer` | 分析代码库提取可复用模式 |
| `create-skill-from-source-code` | 从源码生成 skill 文档 |

---

## 九、参考开源框架（位于 `可以借用的开源小说成熟框架/`）

| 框架 | 技术栈 | 可借鉴点 |
|------|--------|----------|
| **inkos** | TypeScript / npm CLI + Studio Web UI | 自主写作 agent、多风格、审核门控、TUI |
| **novel-engine** | Electron + React + TS + Claude Code CLI | 7 专业 agent 编辑团队、Pandoc 导出 |
| **NovelForge** | 未知 | 小说写作工具 |
| **web-novel-master** | 未知 | Web 小说系统 |
| **AI_NovelGenerator** | 未知 | AI 小说生成 |
| **Humanizer-zh** | 中文 | 中文人性化处理 |

---

## 十、Agent 源码（位于 `自研开源蚁群多智能agent源码/`）

| 项目 | 说明 |
|------|------|
| `Multi-Agent-Playground-main` | 多 agent 协作沙盒 |

---

## 十一、Rust 重构 Claude Code 源码（位于 `rust重构Claudecode/`）

| 项目 | 说明 |
|------|------|
| **claw-code** (`rust重构Claudecode/claw-code-main/`) | Claude Code CLI 的 Rust 公开实现，UltraWorkers 社区维护 |

**关键文件：**
- `rust/` — Rust 工作空间，核心实现
- `PARITY.md` — Rust 移植进度对照表
- `ROADMAP.md` — 路线图
- `USAGE.md` — 构建、认证、CLI、会话工作流
- `PHILOSOPHY.md` — 设计哲学
- `prd.json` — PRD 结构化定义
- `src/` — 原始 TypeScript 源码

**可借鉴：**
- Agent harness 架构设计（action space、tool definition、observation 格式化）
- 会话管理和状态持久化方案
- CLI 交互模式设计
- 模块化插件系统思路

---

## 十一、全局开发规则（`~/.claude/rules/`）

所有会话自动加载：
- `common/agents.md` — Agent 编排规范
- `common/coding-style.md` — 不可变数据、小文件、错误处理
- `common/development-workflow.md` — 规划→TDD→审查→提交
- `common/git-workflow.md` — 提交格式、PR 流程
- `common/testing.md` — 80% 覆盖率、TDD
- `common/security.md` — 安全检查清单
- `common/performance.md` — 模型选择、上下文管理
- `common/patterns.md` — Repository 模式、API 响应格式
- `common/hooks.md` — PreToolUse / PostToolUse / Stop
