import { WriterAgent, ReviserAgent, DirectorAgent } from '../agents'
import type { AgentContext } from '../agents'
import type { AuditReport, AuditIssue } from '../agents/audit-types'
import type { ModelRoute } from '../model-router'
import { runAudit } from '@/core/pipeline/audit'
import { eventBus } from '@/core/events'
import { logger } from '@/shared/utils/logger'

type PipelineMode = 'write-audit' | 'audit-only' | 'revise-only' | 'full-pipeline'
type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface PipelineConfig {
  maxAuditRetries: number
}

export interface PipelineResult {
  success: boolean
  finalContent?: string
  lastAuditReport?: AuditReport
  iterations: number
  error?: string
  pausedReason?: 'max-retries-exceeded' | 'aborted' | 'error'
}

interface PipelineOptions {
  onDelta?: (delta: string) => void
  maxIterations?: number
  modelRoute?: ModelRoute
}

const DEFAULT_CONFIG: PipelineConfig = {
  maxAuditRetries: 3,
}

class WorkflowEngine {
  private status: PipelineStatus = 'idle'
  private abortController: AbortController | null = null
  private config: PipelineConfig = DEFAULT_CONFIG

  getStatus(): PipelineStatus {
    return this.status
  }

  async runWithMode(
    context: AgentContext,
    mode: PipelineMode,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    if (this.status === 'running') {
      return { success: false, iterations: 0, error: 'Pipeline already running' }
    }

    this.status = 'running'
    this.abortController = new AbortController()

    try {
      let result: PipelineResult

      switch (mode) {
        case 'write-audit':
          result = await this.runWriteAuditLoop(context, options)
          break
        case 'audit-only':
          result = await this.runAuditOnly(context)
          break
        case 'revise-only':
          result = await this.runReviseOnly(context, options)
          break
        case 'full-pipeline':
          result = await this.runFullPipeline(context, options)
          break
        default:
          result = { success: false, iterations: 0, error: `Unknown mode: ${mode}` }
      }

      this.status = result.success ? 'completed' : 'failed'
      return result
    } catch (err) {
      this.status = 'failed'
      return {
        success: false,
        iterations: 0,
        error: String(err),
      }
    } finally {
      this.abortController = null
    }
  }

  private async runWriteAuditLoop(
    context: AgentContext,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    const maxRetries = options?.maxIterations ?? DEFAULT_CONFIG.maxAuditRetries
    const writer = new WriterAgent()
    const reviser = new ReviserAgent()

    // WRITE STAGE
    logger.info('workflow', 'Starting WRITE stage')
    eventBus.emit('pipeline:stage:start', { stage: 'write', requestId: context.chapterId })

    const writeResult = await writer.execute(context, { onDelta: options?.onDelta, modelRoute: options?.modelRoute })

    eventBus.emit('pipeline:stage:complete', { stage: 'write', requestId: context.chapterId })

    if (!writeResult.success) {
      return { success: false, iterations: 0, error: `Write failed: ${writeResult.error}` }
    }

    let currentContent = writeResult.output

    // AUDIT-REVISE LOOP
    let iteration = 0
    let lastReport: AuditReport | undefined

    // Signal audit-revise loop start
    eventBus.emit('pipeline:status', { status: 'audit', iteration: 0 })

    while (iteration < maxRetries) {
      if (this.abortController?.signal.aborted) {
        return {
          success: false,
          finalContent: currentContent,
          iterations: iteration,
          pausedReason: 'aborted',
        }
      }

      logger.info('workflow', `Starting AUDIT stage (iteration ${iteration + 1})`)

      const auditContext: AgentContext = {
        ...context,
        chapterContent: currentContent,
      }

      const auditResult = await runAudit(auditContext, { iteration })
      lastReport = auditResult.report

      eventBus.emit('pipeline:quality-gate:iteration', {
        iteration: iteration + 1,
        criticalCount: lastReport.criticalCount,
      })

      // Emit full audit report for UI consumption
      eventBus.emit('pipeline:report:ready', {
        report: lastReport,
        meta: auditResult.meta,
      })

      if (lastReport.criticalCount === 0) {
        logger.info('workflow', `Audit passed at iteration ${iteration + 1}`)
        break
      }

      if (iteration >= maxRetries - 1) {
        logger.warn('workflow', `Max retries (${maxRetries}) exceeded`)
        eventBus.emit('pipeline:quality-gate:exceeded', {
          maxRetries,
          finalCriticalCount: lastReport.criticalCount,
        })
        break
      }

      // REVISE STAGE
      logger.info('workflow', `Starting REVISE stage (iteration ${iteration + 1})`)
      eventBus.emit('pipeline:stage:start', { stage: 'revise', requestId: context.chapterId })
      eventBus.emit('pipeline:status', { status: 'revise', iteration })

      const criticalIssues = this.extractCriticalIssues(lastReport)
      const reviseContext: AgentContext = {
        ...context,
        chapterContent: currentContent,
      }

      const reviseResult = await reviser.executeWithIssues(reviseContext, criticalIssues, {
        onDelta: options?.onDelta,
      })

      eventBus.emit('pipeline:stage:complete', { stage: 'revise', requestId: context.chapterId })

      if (reviseResult.success && reviseResult.output) {
        currentContent = reviseResult.output
      }

      iteration++
    }

    // Signal completion
    eventBus.emit('pipeline:status', { status: 'completed', iteration })

    return {
      success: true,
      finalContent: currentContent,
      lastAuditReport: lastReport,
      iterations: iteration,
    }
  }

  private async runAuditOnly(context: AgentContext): Promise<PipelineResult> {
    eventBus.emit('pipeline:status', { status: 'audit', iteration: 0 })

    const auditResult = await runAudit(context)

    eventBus.emit('pipeline:report:ready', {
      report: auditResult.report,
      meta: auditResult.meta,
    })
    eventBus.emit('pipeline:status', { status: 'completed', iteration: 1 })

    return {
      success: true,
      lastAuditReport: auditResult.report,
      iterations: 1,
    }
  }

  private async runReviseOnly(
    context: AgentContext,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    // First audit to find issues
    const auditResult = await runAudit(context)
    const criticalIssues = this.extractCriticalIssues(auditResult.report)

    if (criticalIssues.length === 0) {
      return {
        success: true,
        finalContent: context.chapterContent,
        lastAuditReport: auditResult.report,
        iterations: 0,
      }
    }

    // Revise
    const reviser = new ReviserAgent()
    const reviseResult = await reviser.executeWithIssues(context, criticalIssues, {
      onDelta: options?.onDelta,
    })

    return {
      success: reviseResult.success,
      finalContent: reviseResult.success ? reviseResult.output : context.chapterContent,
      lastAuditReport: auditResult.report,
      iterations: 1,
      error: reviseResult.error,
    }
  }

  private extractCriticalIssues(report: AuditReport): AuditIssue[] {
    const issues: AuditIssue[] = []
    for (const dim of report.dimensions) {
      for (const issue of dim.issues) {
        if (issue.severity === 'critical') {
          issues.push(issue)
        }
      }
    }
    return issues
  }

  private async runFullPipeline(
    context: AgentContext,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    const director = new DirectorAgent()
    const result = await director.executeFullPipeline(context, {
      maxAuditRetries: this.config.maxAuditRetries,
      onDelta: options?.onDelta,
    })

    return {
      success: result.success,
      finalContent: result.finalContent,
      lastAuditReport: result.auditReport,
      iterations: result.iterations,
      error: result.error,
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.status = 'paused'
    }
  }
}

export const workflowEngine = new WorkflowEngine()
