import { PlannerAgent } from '@/core/ai-engine/agents'
import type { AgentContext, ChapterPlan } from '@/core/ai-engine/agents'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const planner = new PlannerAgent()

const EMPTY_PLAN: ChapterPlan = {
  goals: [],
  mustKeep: [],
  mustAvoid: [],
  tone: '',
  targetWordCount: 3000,
}

export async function runPlan(
  context: AgentContext,
): Promise<{ plan: ChapterPlan; raw: string }> {
  logger.info('plan-pipeline', `Planning chapter ${context.chapterId}`)

  eventBus.emit('pipeline:stage:start', {
    stage: 'plan',
    requestId: context.chapterId,
  })

  const result = await planner.execute(context, { maxTokens: 1500 })

  if (result.success && result.output) {
    const plan = planner.parseOutput!(result.output) as ChapterPlan
    eventBus.emit('pipeline:stage:complete', {
      stage: 'plan',
      requestId: context.chapterId,
    })
    eventBus.emit('pipeline:plan:complete', {
      bookId: context.bookId,
      chapterId: context.chapterId,
      goalsCount: plan.goals.length,
    })
    logger.info('plan-pipeline', `Plan complete: ${plan.goals.length} goals`)
    return { plan, raw: result.output }
  }

  logger.warn('plan-pipeline', `Plan failed, using empty plan: ${result.error}`)
  return { plan: EMPTY_PLAN, raw: '' }
}
