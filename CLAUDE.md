# 自研小说软件 - 项目指令

## 项目概述

模块化小说写作平台，支持多 AI agent 协作创作、审稿、导出。

## 每次对话必读

1. **读取 [SKILLS_REFERENCE.md](SKILLS_REFERENCE.md)** — 当前可用的全部 skill、工具、参考框架清单
2. **读取 [PRD.md](PRD.md)** — 当前版本产品需求文档（v5.2）
3. **读取 [CODE_WIKI.md](CODE_WIKI.md)** — 代码地图（架构 / 模块 / 表 / 事件 / 依赖图）
4. **读取 [REFERENCE_ANALYSIS.md](REFERENCE_ANALYSIS.md)** — 参考框架深度分析（UI 布局/功能按钮/日志系统/AI 管线/自动化/架构模式）
5. **读取 [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** — 开发者参考指南（25 个项目的组件级 UI / 功能分布 / 系统流程 / 代码路径速查）
6. **读取 [progress.md](progress.md)** — 会话进度日志（Phase 0-7 完整记录）
7. **读取 [废弃2.0/PRD.md](废弃2.0/PRD.md)** — 前版本 PRD 作为历史参考（仅必要时）

## 项目原则

- **模块化优先** — 每个功能是独立可替换模块
- **UI Shell 先行** — 先搭完整 UI 骨架和交互框架，再逐模块填充真实逻辑
- **接口契约前置** — 为每个模块定义 TypeScript interface，mock 数据先行

## 技术栈约定

- **桌面壳体**：Tauri 2
- **前端**：React 18 + TypeScript + Vite
- **编辑器**：Tiptap 2
- **样式**：Tailwind CSS + shadcn/ui（Radix UI）
- **状态管理**：Zustand
- **数据库**：SQLite（Tauri plugin-sql）+ Drizzle ORM
- **AI SDK**：Vercel AI SDK（适配层，兼容 OpenAI & Anthropic 格式）
- **主题**：CSS Variables 驱动（极简白 / 深色专业 / 暖色护眼）

## 参考素材位置

- `可以借用的开源小说成熟框架/` — inkos、novel-engine 等
- `自研开源蚁群多智能agent源码/` — 多 agent 协作
- `开源框架/` — tiptap 编辑器等
- `rust重构Claudecode/` — Claw Code（Claude Code 的 Rust 重写，agent harness 架构参考）

## 规范

遵循 `~/.claude/rules/common/` 下所有规则文件（coding-style、testing、security 等）。
