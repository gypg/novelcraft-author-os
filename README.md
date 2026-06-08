# Novelcraft Author OS

> AI-powered novel writing system with intelligent context management and knowledge base integration.

一个基于 AI 的智能小说创作系统，提供上下文管理、知识库集成、时间线追踪等专业写作辅助功能。

[![Tests](https://img.shields.io/badge/tests-214%20passing-brightgreen)](https://github.com/gypg/novelcraft-author-os)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-orange)](https://tauri.app/)

## ✨ Features

### 🤖 AI Writing Assistant
- **Smart Context Building** - Automatically assembles relevant context from multiple sources
- **Real-time Budget Management** - Monitor token usage across 6 context layers
- **Multi-agent Architecture** - Single-agent, multi-agent, and swarm modes

### 📚 Knowledge Base System
- **Project Knowledge** - Store and retrieve project-specific information
- **Author Memory** - Long-term memory of writing preferences and techniques
- **External References** - Integrate external sources with copyright protection
- **Content Redaction** - Automatic redaction for sensitive/copyrighted content

### 🎯 Context Diagnostics (Sprint D)
- **Context Budget Panel** - Real-time visualization of token usage by layer
- **Knowledge Retrieval Panel** - See which knowledge items AI retrieved
- **Score Breakdown** - Detailed scoring components (BM25, weights, recency)
- **Stale Detection** - Know when diagnostics data is outdated

### 📖 World Building Tools
- **Truth Files** - Maintain canonical world facts (characters, locations, magic systems)
- **Timeline Tracking** - Automatic extraction of temporal facts from chapters
- **Knowledge Graph** - Visualize relationships between entities
- **Character Profiles** - Detailed character information and tracking

### 🎨 Editor Features
- **Rich Text Editor** - Built on TipTap with custom extensions
- **Chapter Management** - Organize books and chapters
- **Outline Planning** - Chapter-level outline with title and description
- **Style Customization** - Configure writing style and preferences

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  UI Layer (React + Tauri)                   │
│  - Editor, Knowledge Base, Settings         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Modules Layer (Application Logic)          │
│  - AI Collab, Diagnostics, Menu Items       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Core Layer (Business Logic)                │
│  - AI Engine, Knowledge Base, Repository    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Data Layer (SQLite)                        │
│  - Books, Chapters, Knowledge, Facts        │
└─────────────────────────────────────────────┘
```

**Key Principles:**
- ✅ Unidirectional dependencies (modules → core → data)
- ✅ Type-safe with TypeScript
- ✅ Comprehensive test coverage (214 tests)
- ✅ Clean separation of concerns

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **Rust** 1.70+ (for Tauri)
- **pnpm** or **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/gypg/novelcraft-author-os.git
cd novelcraft-author-os

# Install dependencies
cd novel-app
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Project Structure

```
novelcraft-author-os/
├── novel-app/                 # Main application
│   ├── src/
│   │   ├── core/              # Business logic layer
│   │   │   ├── ai-engine/     # AI context building & agents
│   │   │   ├── knowledge-base/ # Knowledge retrieval & redaction
│   │   │   ├── db/            # Database repositories
│   │   │   └── pipeline/      # Observation pipeline
│   │   ├── modules/           # Application layer
│   │   │   ├── ai-collab/     # AI collaboration panels
│   │   │   ├── editor/        # Editor features
│   │   │   └── knowledge-base/ # Knowledge base UI
│   │   ├── pages/             # Page components
│   │   └── shared/            # Shared utilities
│   ├── src-tauri/             # Tauri (Rust) backend
│   └── tests/                 # Test files
├── task_plan.md               # Sprint planning
└── SPRINT_D_REPORT.md         # Sprint D completion report
```

## 📊 Test Coverage

- **214 tests** passing
- **Core layer:** 100% critical path coverage
- **Modules layer:** Component logic tests
- **Integration tests:** End-to-end workflows

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- context-builder

# Watch mode
npm run test -- --watch
```

## 🔧 Configuration

### AI Providers

Configure AI providers in Settings:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Custom providers

### Knowledge Base

Configure knowledge retrieval:
- BM25 scoring parameters
- Library type weights (project: 3x, author: 2x, external: 0.3x)
- Canonical level weights
- Quote policy enforcement

## 📚 Documentation

- **[Sprint D Report](./SPRINT_D_REPORT.md)** - Context diagnostics system
- **[Task Plan](./task_plan.md)** - Sprint planning and progress
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design (TODO)
- **[API Reference](./docs/API.md)** - Core APIs (TODO)

## 🎯 Roadmap

### Completed ✅
- [x] Core AI engine with multi-agent support
- [x] Knowledge base with retrieval and redaction
- [x] Truth files and temporal memory
- [x] Context diagnostics panels (Sprint D)

### In Progress 🚧
- [ ] UI integration for diagnostics panels
- [ ] Author memory UI (Phase 5)

### Planned 📋
- [ ] Diagnostics history tracking
- [ ] Advanced analytics dashboard
- [ ] Export/import functionality
- [ ] Plugin system
- [ ] Multi-language support

## 🤝 Contributing

This is a private project. For collaborators:

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass (`npm run test`)
4. Create a Pull Request
5. Wait for code review

### Commit Convention

```
feat: add new feature
fix: bug fix
docs: documentation changes
test: add or update tests
refactor: code refactoring
chore: maintenance tasks
```

## 📝 License

Copyright © 2025 gypg. All rights reserved.

This is proprietary software. Unauthorized copying, distribution, or use is prohibited.

## 🙏 Acknowledgments

- **Claude (Anthropic)** - For AI assistance and code generation
- **TipTap** - Rich text editor framework
- **Tauri** - Desktop app framework
- **React** - UI framework

---

**Version:** 0.1.0  
**Last Updated:** 2025-01-XX  
**Status:** Active Development
