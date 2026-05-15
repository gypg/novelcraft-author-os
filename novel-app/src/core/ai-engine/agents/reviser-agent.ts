import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { stripHtml } from '../context-builder'
import { resolveProviderAndModel } from '../model-router'
import { compressContext } from '../context-budget'
import { resilientCallLlm } from '../resilience'
import { eventBus } from '@/core/events'
import type { AgentContext, AgentExecutionOptions, AgentResult } from './types'
import type { AuditIssue } from './audit-types'

export class ReviserAgent extends BaseAgent {
  readonly role = 'reviser' as const
  readonly name = '修订 Agent'

  buildSystemPrompt(_context: AgentContext): string {
    return [
      '你是一个专业的小说修订助手。请根据给出的审计问题，对章节内容进行精准修订。',
      '',
      '## 修订原则',
      '- 只修复标记为 critical 的问题',
      '- 保持原文的整体风格、语气和节奏',
      '- 不要重写整个章节，只修改有问题的部分',
      '- 修订后直接输出完整的章节正文，不要添加注释或解释',
      '- 确保修订后的文本自然流畅，不要引入新的问题',
    ].join('\n')
  }

  buildMessages(
    context: AgentContext,
    systemPrompt: string,
    criticalIssues?: AuditIssue[],
  ): ChatMessage[] {
    const currentText = stripHtml(context.chapterContent)
    const parts: string[] = []

    parts.push('## 待修订的章节内容')
    parts.push(currentText)

    if (criticalIssues && criticalIssues.length > 0) {
      parts.push('')
      parts.push('## 需要修复的 critical 问题')
      for (let i = 0; i < criticalIssues.length; i++) {
        const issue = criticalIssues[i]
        parts.push(`${i + 1}. [${issue.location.chapter}章${issue.location.paragraph ? ` 第${issue.location.paragraph}段` : ''}] ${issue.description}`)
        if (issue.suggestion) {
          parts.push(`   建议：${issue.suggestion}`)
        }
      }
    }

    parts.push('')
    parts.push('请输出修订后的完整章节正文。')

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ]
  }

  async executeWithIssues(
    context: AgentContext,
    criticalIssues: AuditIssue[],
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessages(context, systemPrompt, criticalIssues)

    const route = options?.modelRoute ?? await resolveProviderAndModel(this.role)
    if (!route.providerId) {
      return { success: false, output: '', error: 'No provider configured' }
    }

    const compressed = compressContext(messages, 8000)

    eventBus.emit('pipeline:stage:start', {
      stage: this.role,
      requestId: context.chapterId,
    })

    try {
      const result = await resilientCallLlm({
        providerId: route.providerId,
        model: route.model,
        messages: compressed,
        maxTokens: options?.maxTokens ?? 4000,
        temperature: options?.temperature ?? 0.6,
        onDelta: options?.onDelta,
      })

      eventBus.emit('pipeline:stage:complete', {
        stage: this.role,
        requestId: context.chapterId,
      })

      return { success: true, output: result }
    } catch (err) {
      const msg = typeof err === 'string' ? err : String(err)
      return { success: false, output: '', error: msg }
    }
  }
}
