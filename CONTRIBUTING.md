# Contributing to Novelcraft Author OS

感谢你对 Novelcraft Author OS 的关注！

## 开发流程

### 1. 创建功能分支

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. 开发和测试

```bash
cd novel-app
npm install
npm run dev    # 启动开发服务器
npm run test   # 运行测试
npm run lint   # 检查代码规范
```

### 3. 提交代码

**提交信息规范：**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `test`: 测试相关
- `refactor`: 重构
- `chore`: 维护任务
- `style`: 代码格式（不影响功能）

**示例：**
```
feat(knowledge-base): add content redaction for direct-forbidden items

Implement buildSafeKnowledgePreview to redact sensitive content.
- Redact content for direct_forbidden quote policy
- Limit summary to 100 chars
- Limit keywords to 10 items
- Add comprehensive tests

Closes #123
```

### 4. 创建 Pull Request

- 确保所有测试通过
- 更新相关文档
- 填写 PR 模板
- 等待 code review

## 代码规范

### TypeScript

- 使用严格模式
- 为公共 API 添加 JSDoc 注释
- 避免使用 `any`，使用具体类型
- 优先使用接口而非类型别名（对外 API）

### React 组件

- 使用函数式组件和 hooks
- Props 接口命名：`ComponentNameProps`
- 使用 `useMemo` 和 `useCallback` 优化性能
- 组件文件名使用 PascalCase

### 测试

- 每个新功能必须有测试
- 测试文件与源文件同目录：`*.test.ts`
- 使用描述性的测试名称
- 覆盖正常流程和边界情况

### 架构

- 遵守分层架构：UI → Modules → Core → Data
- Core 层不依赖 Modules 层
- 使用 repository 模式访问数据库
- DTO 用于跨层数据传输

## 开发环境设置

### 必需工具

- Node.js 18+
- Rust 1.70+ (for Tauri)
- VS Code (推荐)

### VS Code 扩展

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Rust Analyzer

### 本地数据库

开发环境数据库位置：
```
Windows: C:\Users\<username>\AppData\Local\com.novelcraft.author-os\novel.db
macOS: ~/Library/Application Support/com.novelcraft.author-os/novel.db
Linux: ~/.local/share/com.novelcraft.author-os/novel.db
```

## 测试策略

### 单元测试

测试单个函数和类：

```typescript
describe('buildSafeKnowledgePreview', () => {
  it('should redact content for direct_forbidden items', () => {
    const item = createTestItem({ quote_policy: 'direct_forbidden' })
    const preview = buildSafeKnowledgePreview(item)
    expect(preview.contentRedacted).toBe(true)
  })
})
```

### 集成测试

测试多个模块协作：

```typescript
describe('context-builder integration', () => {
  it('should build context with redacted knowledge', async () => {
    const { messages, context } = await buildWritingContext({ ... })
    expect(context.retrievedKnowledge[0].redactionState).toBe('redacted-summary')
  })
})
```

### 运行测试

```bash
npm run test              # 运行所有测试
npm run test -- watch     # 监听模式
npm run test -- coverage  # 生成覆盖率报告
```

## 常见问题

### 如何调试 Tauri 后端？

```bash
cd novel-app
npm run tauri dev -- --verbose
```

### 如何重置数据库？

删除数据库文件后重启应用即可自动重建。

### 如何添加新的 AI provider？

1. 在 `src/core/ai-engine/providers/` 添加 provider 实现
2. 实现 `LlmProvider` 接口
3. 在 `src/core/ai-engine/index.ts` 注册
4. 添加设置 UI

## 获取帮助

- 查看 [SPRINT_D_REPORT.md](./SPRINT_D_REPORT.md) 了解最新功能
- 查看 [task_plan.md](./task_plan.md) 了解开发计划
- 提交 Issue 描述问题或建议

## License

Copyright © 2025 gypg. All rights reserved.
