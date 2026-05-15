import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { stripHtml } from '../context-builder'
import type { AgentContext, ChapterPlan } from './types'

export class PlannerAgent extends BaseAgent {
  readonly role = 'planner' as const
  readonly name = '规划 Agent'

  buildSystemPrompt(_context: AgentContext): string {
    return [
      '你是一个专业的小说章节规划师。请根据大纲和前文内容，为即将写作的章节生成结构化规划。',
      '',
      '## 输出要求',
      '请严格按照以下 JSON 格式输出，不要添加任何其他文字：',
      '',
      '```json',
      '{',
      '  "goals": ["本章必须达成的目标1", "目标2"],',
      '  "mustKeep": ["必须保持的连续性元素1", "元素2"],',
      '  "mustAvoid": ["本章必须避免的问题1", "问题2"],',
      '  "tone": "本章的情感基调",',
      '  "targetWordCount": 3000',
      '}',
      '```',
      '',
      '## 规划原则',
      '- goals: 明确本章要推进的情节、要揭示的信息、要解决的冲突',
      '- mustKeep: 保持角色性格一致、时间线连贯、伏笔回收计划',
      '- mustAvoid: 避免节奏拖沓、避免信息过载、避免角色行为矛盾',
      '- tone: 描述情感基调（如"紧张压抑"、"轻松诙谐"、"悲伤沉重"）',
      '- targetWordCount: 建议字数（2000-5000）',
    ].join('\n')
  }

  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[] {
    const parts: string[] = []

    // Input governance: author intent + current focus
    if (context.authorIntent) {
      parts.push('## 作者长期意图')
      parts.push(context.authorIntent)
      parts.push('')
    }

    if (context.currentFocus) {
      parts.push('## 近期关注')
      parts.push(context.currentFocus)
      parts.push('')
    }

    if (context.outlineDescription) {
      parts.push('## 本章大纲')
      parts.push(context.outlineDescription)
      parts.push('')
    }

    if (context.previousChapters && context.previousChapters.length > 0) {
      parts.push('## 前文摘要')
      for (const ch of context.previousChapters.slice(-3)) {
        parts.push(`【${ch.title}】${ch.contentTail.slice(0, 300)}`)
      }
      parts.push('')
    }

    if (context.chapterContent) {
      const text = stripHtml(context.chapterContent)
      if (text.trim()) {
        parts.push('## 当前已有内容')
        parts.push(text.slice(0, 1000))
      }
    }

    parts.push('请为本章生成写作规划。')

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ]
  }

  parseOutput(raw: string): ChapterPlan {
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
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        mustKeep: Array.isArray(parsed.mustKeep) ? parsed.mustKeep : [],
        mustAvoid: Array.isArray(parsed.mustAvoid) ? parsed.mustAvoid : [],
        tone: typeof parsed.tone === 'string' ? parsed.tone : '',
        targetWordCount: typeof parsed.targetWordCount === 'number' ? parsed.targetWordCount : 3000,
      }
    } catch {
      return {
        goals: [],
        mustKeep: [],
        mustAvoid: [],
        tone: '',
        targetWordCount: 3000,
      }
    }
  }
}
