import { ObserverAgent } from '@/core/ai-engine/agents'
import type { AgentContext, FactDelta } from '@/core/ai-engine/agents'
import { saveTemporalFacts, invalidateTemporalFacts } from '@/core/db/temporal-memory-repository'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const observer = new ObserverAgent()

const EMPTY_DELTA: FactDelta = { upserts: [], invalidations: [] }

export async function runObserve(
  context: AgentContext,
): Promise<{ factDelta: FactDelta; raw: string }> {
  logger.info('observe-pipeline', `Observing chapter ${context.chapterId}`)

  eventBus.emit('pipeline:stage:start', {
    stage: 'observe',
    requestId: context.chapterId,
  })

  const result = await observer.execute(context, { maxTokens: 2000 })

  if (result.success && result.output) {
    const factDelta = observer.parseOutput!(result.output) as FactDelta

    // Persist facts to DB
    if (factDelta.upserts.length > 0) {
      try {
        await saveTemporalFacts(context.bookId, context.chapterId, factDelta.upserts)
        logger.info('observe-pipeline', `Saved ${factDelta.upserts.length} facts`)
      } catch (err) {
        logger.error('observe-pipeline', `Failed to save facts: ${err}`)
      }
    }

    if (factDelta.invalidations.length > 0) {
      try {
        const chapterIds = factDelta.invalidations.map((i) => i.chapterId).filter(Boolean)
        if (chapterIds.length > 0) {
          await invalidateTemporalFacts(context.bookId, chapterIds)
          logger.info('observe-pipeline', `Invalidated facts for ${chapterIds.length} chapters`)
        }
      } catch (err) {
        logger.error('observe-pipeline', `Failed to invalidate facts: ${err}`)
      }
    }

    eventBus.emit('pipeline:stage:complete', {
      stage: 'observe',
      requestId: context.chapterId,
    })
    eventBus.emit('pipeline:observe:complete', {
      bookId: context.bookId,
      chapterId: context.chapterId,
      factsExtracted: factDelta.upserts.length,
    })

    return { factDelta, raw: result.output }
  }

  logger.warn('observe-pipeline', `Observe failed: ${result.error}`)
  return { factDelta: EMPTY_DELTA, raw: '' }
}
