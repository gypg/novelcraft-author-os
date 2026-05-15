import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { buildStyleGuardPrompt } from '../style-guard'
import { stripHtml } from '../context-builder'
import type { AgentContext, ChapterPlan } from './types'

export class WriterAgent extends BaseAgent {
  readonly role = 'writer' as const
  readonly name = '写作 Agent'

  buildSystemPrompt(context: AgentContext): string {
    const parts = [
      '你是一个专业的小说写作助手。请根据上下文自然地续写内容。',
      '',
      '## 核心要求',
      '- 保持与前文一致的风格和语气',
      '- 通过行为和细节传达情感，不要直接标注情绪',
      '- 句子长短交替，避免连续短句或连续长句',
      '- 对话要像真人说话，避免书面化',
      '- 不要添加任何标题、注释或解释，直接输出正文',
      '',
      buildStyleGuardPrompt(),
    ]

    // Inject voice profile if available
    if (context.planData && 'fingerprint' in context.planData) {
      const vp = context.planData as ChapterPlan & { fingerprint?: Record<string, unknown> }
      parts.push('', '## 目标文风')
      parts.push(`- 平均句长：${vp.fingerprint?.avgSentenceLength ?? '未知'} 字`)
      parts.push(`- 对话比例：${Math.round(((vp.fingerprint?.dialogueRatio as number) ?? 0) * 100)}%`)
      parts.push(`- 节奏模式：${vp.fingerprint?.rhythmPattern ?? 'mixed'}`)
    }

    if (context.planData && 'formula' in context.planData) {
      const formula = (context.planData as ChapterPlan & { formula?: { techniques?: Record<string, string[]>; antiPatterns?: string[] } }).formula
      if (formula?.techniques) {
        parts.push('', '## 写法配方')
        for (const [category, techniques] of Object.entries(formula.techniques as Record<string, string[]>)) {
          if (techniques.length > 0) {
            const labels: Record<string, string> = {
              syntax: '句法', narrative: '叙事', emotion: '情感',
              structure: '结构', dialogue: '对话',
            }
            parts.push(`- ${labels[category] || category}：${techniques.join('、')}`)
          }
        }
        if (formula.antiPatterns && formula.antiPatterns.length > 0) {
          parts.push(`- 避免：${formula.antiPatterns.join('、')}`)
        }
      }
    }

    // Knowledge state injection (PRD 3.4.2)
    if (context.activeFacts && context.activeFacts.length > 0) {
      parts.push('', '## 当前事实状态')
      for (const fact of context.activeFacts.slice(0, 30)) {
        parts.push(`- ${fact.subject} ${fact.predicate} ${fact.object}`)
      }
    }

    if (context.outlineDescription) {
      parts.push('', '## 本章大纲', context.outlineDescription)
    }

    return parts.join('\n')
  }

  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add previous chapter summaries
    if (context.previousChapters && context.previousChapters.length > 0) {
      const summaryParts = context.previousChapters.map(
        (ch) => `【${ch.title}】${ch.contentTail.slice(0, 500)}`,
      )
      messages.push({
        role: 'user',
        content: `以下是前文内容：\n\n${summaryParts.join('\n\n')}`,
      })
      messages.push({
        role: 'assistant',
        content: '我已阅读前文内容。',
      })
    }

    // Add current content or new chapter instruction
    const currentText = stripHtml(context.chapterContent)
    if (currentText.trim()) {
      messages.push({
        role: 'user',
        content: `当前章节已有内容：\n\n${currentText.slice(-2000)}\n\n请直接续写，不要重复已有内容。`,
      })
    } else {
      messages.push({
        role: 'user',
        content: '这是一个新章节，请开始写作。',
      })
    }

    return messages
  }
}
