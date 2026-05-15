import { WriterAgent } from '@/core/ai-engine/agents'
import type { AgentContext } from '@/core/ai-engine/agents'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const writer = new WriterAgent()

export async function runWrite(
  context: AgentContext,
  options?: { onDelta?: (delta: string) => void },
): Promise<{ content: string; raw: string }> {
  logger.info('write-pipeline', `Writing chapter ${context.chapterId}`)

  eventBus.emit('pipeline:stage:start', {
    stage: 'write',
    requestId: context.chapterId,
  })

  const result = await writer.execute(context, {
    maxTokens: 4000,
    onDelta: options?.onDelta,
  })

  if (result.success && result.output) {
    eventBus.emit('pipeline:stage:complete', {
      stage: 'write',
      requestId: context.chapterId,
    })
    logger.info('write-pipeline', `Write complete: ${result.output.length} chars`)
    return { content: result.output, raw: result.output }
  }

  logger.error('write-pipeline', `Write failed: ${result.error}`)
  return { content: '', raw: '' }
}
