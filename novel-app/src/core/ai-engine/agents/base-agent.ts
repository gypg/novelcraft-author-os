import type { ChatMessage } from '../providers'
import type { Agent, AgentContext, AgentExecutionOptions, AgentResult } from './types'
import { resolveProviderAndModel, type AgentRole } from '../model-router'
import { resilientCallLlm } from '../resilience'
import { compressContext } from '../context-budget'
import { logger } from '@/shared/utils/logger'
import { eventBus } from '@/core/events'

export abstract class BaseAgent implements Agent {
  abstract readonly role: AgentRole
  abstract readonly name: string

  abstract buildSystemPrompt(context: AgentContext): string
  abstract buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[]

  async execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult> {
    const route = options?.modelRoute ?? await resolveProviderAndModel(this.role)
    if (!route.providerId) {
      return { success: false, output: '', error: 'No provider configured' }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessages(context, systemPrompt)
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
        temperature: options?.temperature ?? this.getDefaultTemperature(),
        onDelta: options?.onDelta,
      })

      eventBus.emit('pipeline:stage:complete', {
        stage: this.role,
        requestId: context.chapterId,
      })

      return { success: true, output: result }
    } catch (err) {
      const msg = typeof err === 'string' ? err : String(err)

      // Token limit exceeded: compress more aggressively and retry once
      if (msg.includes('context') && (msg.includes('exceed') || msg.includes('limit') || msg.includes('length'))) {
        logger.warn(this.role, 'Token limit hit, retrying with aggressive compression')
        const aggressiveCompressed = compressContext(messages, 4000)

        try {
          const retryResult = await resilientCallLlm({
            providerId: route.providerId,
            model: route.model,
            messages: aggressiveCompressed,
            maxTokens: options?.maxTokens ?? 4000,
            temperature: options?.temperature ?? this.getDefaultTemperature(),
            onDelta: options?.onDelta,
            retryConfig: { maxRetries: 0 }, // No further retries
          })

          eventBus.emit('pipeline:stage:complete', {
            stage: this.role,
            requestId: context.chapterId,
          })

          return { success: true, output: retryResult }
        } catch (retryErr) {
          return { success: false, output: '', error: String(retryErr) }
        }
      }

      return { success: false, output: '', error: msg }
    }
  }

  protected getDefaultTemperature(): number {
    switch (this.role) {
      case 'writer': return 0.8
      case 'auditor': return 0.2
      case 'reviser': return 0.6
      case 'planner': return 0.3
      case 'composer': return 0.2
      case 'observer': return 0.3
      case 'director': return 0.4
      default: return 0.7
    }
  }
}
