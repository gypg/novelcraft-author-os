import { AuditorAgent } from '@/core/ai-engine/agents'
import type { AgentContext } from '@/core/ai-engine/agents'
import type { AuditReport, AuditReportMeta, AuditResult } from '@/core/ai-engine/agents/audit-types'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

const auditor = new AuditorAgent()

export async function runAudit(
  context: AgentContext,
  options?: { iteration?: number; model?: string },
): Promise<AuditResult> {
  const iteration = options?.iteration ?? 0

  logger.info('audit-pipeline', `Starting audit (iteration ${iteration}) for chapter ${context.chapterId}`)

  const result = await auditor.execute(context)

  let report: AuditReport
  if (result.success && result.output) {
    report = auditor.parseOutput!(result.output)
  } else {
    logger.error('audit-pipeline', `Audit failed: ${result.error}`)
    report = emptyReport()
  }

  const meta: AuditReportMeta = {
    bookId: context.bookId,
    chapterId: context.chapterId,
    timestamp: Date.now(),
    agentModel: options?.model ?? 'unknown',
    iteration,
  }

  eventBus.emit('pipeline:audit:complete', {
    bookId: context.bookId,
    chapterId: context.chapterId,
    score: report.overallScore,
  })

  logger.info(
    'audit-pipeline',
    `Audit complete: score=${report.overallScore} critical=${report.criticalCount} warning=${report.warningCount} info=${report.infoCount}`,
  )

  return { report, meta }
}

function emptyReport(): AuditReport {
  return {
    overallScore: 50,
    dimensions: [],
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
  }
}
