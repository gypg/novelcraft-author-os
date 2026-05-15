import { ComposerAgent } from '@/core/ai-engine/agents'
import type { AgentContext, CompiledContext } from '@/core/ai-engine/agents'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const composer = new ComposerAgent()

const EMPTY_CONTEXT: CompiledContext = {
  truthFilesSummary: '',
  activeFacts: [],
  planData: { goals: [], mustKeep: [], mustAvoid: [], tone: '', targetWordCount: 3000 },
  previousChaptersDigest: '',
}

export async function runCompose(
  context: AgentContext,
): Promise<{ compiledContext: CompiledContext; raw: string }> {
  logger.info('compose-pipeline', `Composing context for chapter ${context.chapterId}`)

  eventBus.emit('pipeline:stage:start', {
    stage: 'compose',
    requestId: context.chapterId,
  })

  const result = await composer.execute(context, { maxTokens: 2000 })

  if (result.success && result.output) {
    const compiledContext = composer.parseOutput!(result.output) as CompiledContext
    eventBus.emit('pipeline:stage:complete', {
      stage: 'compose',
      requestId: context.chapterId,
    })
    logger.info('compose-pipeline', 'Compose complete')
    return { compiledContext, raw: result.output }
  }

  logger.warn('compose-pipeline', `Compose failed, using empty context: ${result.error}`)
  return { compiledContext: EMPTY_CONTEXT, raw: '' }
}
