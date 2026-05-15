import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { runPlan } from '@/core/pipeline/plan'
import { runCompose } from '@/core/pipeline/compose'
import { runWrite } from '@/core/pipeline/write'
import { runObserve } from '@/core/pipeline/observe'
import { runAudit } from '@/core/pipeline/audit'
import { runRevise } from '@/core/pipeline/revise'
import type { AgentContext, ChapterPlan, CompiledContext, FactDelta } from './types'
import type { AuditReport } from './audit-types'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

export interface DirectorResult {
  success: boolean
  plan?: ChapterPlan
  compiledContext?: CompiledContext
  finalContent?: string
  factDelta?: FactDelta
  auditReport?: AuditReport
  iterations: number
  error?: string
}

interface DirectorOptions {
  maxAuditRetries?: number
  onDelta?: (delta: string) => void
}

export class DirectorAgent extends BaseAgent {
  readonly role = 'director' as const
  readonly name = '导演 Agent'

  buildSystemPrompt(): string {
    return ''
  }

  buildMessages(): ChatMessage[] {
    return []
  }

  async executeFullPipeline(
    context: AgentContext,
    options?: DirectorOptions,
  ): Promise<DirectorResult> {
    const maxRetries = options?.maxAuditRetries ?? 3

    logger.info('director', `Starting full pipeline for chapter ${context.chapterId}`)

    eventBus.emit('pipeline:stage:start', {
      stage: 'director',
      requestId: context.chapterId,
    })

    try {
      // Inject input governance (author intent + current focus)
      const { getAuthorIntent, getCurrentFocus } = await import('@/core/input-governance/intent-docs')
      const intentDoc = getAuthorIntent(context.bookId)
      const focusDoc = getCurrentFocus(context.bookId)

      const enrichedContext: AgentContext = {
        ...context,
        authorIntent: intentDoc.content || undefined,
        currentFocus: focusDoc.content || undefined,
      }

      // 1. PLAN STAGE
      logger.info('director', 'Stage 1: Plan')
      const { plan } = await runPlan(enrichedContext)

      // 2. COMPOSE STAGE
      logger.info('director', 'Stage 2: Compose')
      const { compiledContext } = await runCompose({
        ...enrichedContext,
        planData: plan,
      })

      // 3. WRITE STAGE
      logger.info('director', 'Stage 3: Write')
      const { content } = await runWrite(enrichedContext, { onDelta: options?.onDelta })

      if (!content) {
        return {
          success: false,
          plan,
          compiledContext,
          iterations: 0,
          error: 'Write stage produced no content',
        }
      }

      // 4. OBSERVE STAGE
      logger.info('director', 'Stage 4: Observe')
      const { factDelta } = await runObserve({
        ...context,
        chapterContent: content,
      })

      // 5. AUDIT + REVISE LOOP
      let currentContent = content
      let iteration = 0
      let lastReport: AuditReport | undefined

      while (iteration < maxRetries) {
        logger.info('director', `Stage 5: Audit (iteration ${iteration + 1})`)

        const auditResult = await runAudit({
          ...context,
          chapterContent: currentContent,
        }, { iteration })

        lastReport = auditResult.report

        eventBus.emit('pipeline:quality-gate:iteration', {
          iteration: iteration + 1,
          criticalCount: lastReport.criticalCount,
        })

        if (lastReport.criticalCount === 0) {
          logger.info('director', `Audit passed at iteration ${iteration + 1}`)
          break
        }

        if (iteration >= maxRetries - 1) {
          logger.warn('director', `Max retries (${maxRetries}) exceeded`)
          eventBus.emit('pipeline:quality-gate:exceeded', {
            maxRetries,
            finalCriticalCount: lastReport.criticalCount,
          })
          break
        }

        // REVISE STAGE
        logger.info('director', `Stage 6: Revise (iteration ${iteration + 1})`)
        const criticalIssues = this.extractCriticalIssues(lastReport)

        const { content: revisedContent } = await runRevise(
          { ...context, chapterContent: currentContent },
          criticalIssues,
          { onDelta: options?.onDelta },
        )

        if (revisedContent && revisedContent !== currentContent) {
          currentContent = revisedContent
        }

        iteration++
      }

      eventBus.emit('pipeline:stage:complete', {
        stage: 'director',
        requestId: context.chapterId,
      })

      return {
        success: true,
        plan,
        compiledContext,
        finalContent: currentContent,
        factDelta,
        auditReport: lastReport,
        iterations: iteration,
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : String(err)
      logger.error('director', `Pipeline failed: ${msg}`)
      return {
        success: false,
        iterations: 0,
        error: msg,
      }
    }
  }

  private extractCriticalIssues(report: AuditReport) {
    const issues = []
    for (const dim of report.dimensions) {
      for (const issue of dim.issues) {
        if (issue.severity === 'critical') {
          issues.push(issue)
        }
      }
    }
    return issues
  }
}
