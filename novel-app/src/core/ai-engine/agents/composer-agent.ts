import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { stripHtml } from '../context-builder'
import type { AgentContext, CompiledContext } from './types'

export class ComposerAgent extends BaseAgent {
  readonly role = 'composer' as const
  readonly name = '编排 Agent'

  buildSystemPrompt(_context: AgentContext): string {
    return [
      '你是一个专业的小说上下文编排师。请将真相文件、时序记忆和章节规划压缩为精简的写作上下文。',
      '',
      '## 输出要求',
      '请严格按照以下 JSON 格式输出，不要添加任何其他文字：',
      '',
      '```json',
      '{',
      '  "truthFilesSummary": "对所有真相文件的精简摘要（不超过500字）",',
      '  "previousChaptersDigest": "前文核心信息摘要（不超过300字）",',
      '  "planData": { ... 原样返回传入的 planData ... }',
      '}',
      '```',
      '',
      '## 编排原则',
      '- truthFilesSummary: 提取与当前章节最相关的设定信息，忽略无关细节',
      '- previousChaptersDigest: 只保留与当前章节有直接关联的前文信息',
      '- 保持信息准确，不要编造不存在的设定',
      '- 输出控制在 2000 token 以内',
    ].join('\n')
  }

  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[] {
    const parts: string[] = []

    // Truth files
    if (context.truthFilesJson) {
      parts.push('## 真相文件数据')
      for (const [name, json] of Object.entries(context.truthFilesJson)) {
        parts.push(`### ${name}`)
        // Truncate each truth file to keep total manageable
        parts.push(json.slice(0, 2000))
        parts.push('')
      }
    }

    // Active facts
    if (context.activeFacts && context.activeFacts.length > 0) {
      parts.push('## 当前有效的时序记忆')
      for (const fact of context.activeFacts.slice(0, 30)) {
        parts.push(`- ${fact.subject} ${fact.predicate} ${fact.object} (from ch.${fact.valid_from_chapter})`)
      }
      parts.push('')
    }

    // Plan data
    if (context.planData) {
      parts.push('## 章节规划')
      parts.push(JSON.stringify(context.planData, null, 2))
      parts.push('')
    }

    // Previous chapters
    if (context.previousChapters && context.previousChapters.length > 0) {
      parts.push('## 前文摘要')
      for (const ch of context.previousChapters.slice(-3)) {
        parts.push(`【${ch.title}】${ch.contentTail.slice(0, 300)}`)
      }
      parts.push('')
    }

    // Current content
    if (context.chapterContent) {
      const text = stripHtml(context.chapterContent)
      if (text.trim()) {
        parts.push('## 当前内容（开头部分）')
        parts.push(text.slice(0, 500))
      }
    }

    parts.push('请编排精简的写作上下文。')

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ]
  }

  parseOutput(raw: string): CompiledContext {
    let jsonStr = raw

    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    }

    const jsonStart = jsonStr.indexOf('{')
    const jsonEnd = jsonStr.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
    }

    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        truthFilesSummary: typeof parsed.truthFilesSummary === 'string' ? parsed.truthFilesSummary : '',
        activeFacts: Array.isArray(parsed.activeFacts) ? parsed.activeFacts : [],
        planData: parsed.planData ?? { goals: [], mustKeep: [], mustAvoid: [], tone: '', targetWordCount: 3000 },
        previousChaptersDigest: typeof parsed.previousChaptersDigest === 'string' ? parsed.previousChaptersDigest : '',
      }
    } catch {
      return {
        truthFilesSummary: '',
        activeFacts: [],
        planData: { goals: [], mustKeep: [], mustAvoid: [], tone: '', targetWordCount: 3000 },
        previousChaptersDigest: '',
      }
    }
  }
}
