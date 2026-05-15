import { ReviserAgent } from '@/core/ai-engine/agents'
import type { AgentContext } from '@/core/ai-engine/agents'
import type { AuditIssue } from '@/core/ai-engine/agents/audit-types'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const reviser = new ReviserAgent()

export async function runRevise(
  context: AgentContext,
  criticalIssues: AuditIssue[],
  options?: { onDelta?: (delta: string) => void },
): Promise<{ content: string; raw: string }> {
  logger.info('revise-pipeline', `Revising chapter ${context.chapterId} (${criticalIssues.length} issues)`)

  eventBus.emit('pipeline:stage:start', {
    stage: 'revise',
    requestId: context.chapterId,
  })

  const result = await reviser.executeWithIssues(context, criticalIssues, {
    maxTokens: 4000,
    onDelta: options?.onDelta,
  })

  if (result.success && result.output) {
    eventBus.emit('pipeline:stage:complete', {
      stage: 'revise',
      requestId: context.chapterId,
    })
    logger.info('revise-pipeline', `Revise complete: ${result.output.length} chars`)
    return { content: result.output, raw: result.output }
  }

  logger.error('revise-pipeline', `Revise failed: ${result.error}`)
  return { content: context.chapterContent, raw: '' }
}
