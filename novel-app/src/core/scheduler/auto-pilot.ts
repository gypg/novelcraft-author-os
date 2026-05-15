import { DirectorAgent } from '@/core/ai-engine/agents'
import type { AgentContext } from '@/core/ai-engine/agents'
import { eventBus } from '@/core/events'
import { notifyChapterComplete, notifyAutoPilotPaused, notifyError } from './notifications'
import { acquirePidLock, releasePidLock } from './pid-guard'
import { checkDiskSpace } from './disk-check'
import { detectStyleDrift, type VoiceProfile } from '@/core/style/voice-profile'
import { logger } from '@/shared/utils/logger'

export type AutoPilotState =
  | 'idle'
  | 'planning'
  | 'writing'
  | 'auditing'
  | 'revising'
  | 'paused'
  | 'completed'

export interface AutoPilotConfig {
  maxChaptersPerDay: number
  cooldownMs: number
  circuitBreakerThreshold: number
  circuitBreakerTimeoutMs: number
  autoApprove: boolean
  wordCountMin: number
  wordCountMax: number
}

export interface AutoPilotStatus {
  state: AutoPilotState
  bookId: string | null
  bookTitle: string
  currentChapter: number
  totalChapters: number
  todayChapters: number
  consecutiveFailures: number
  lastError?: string
  startedAt: number
}

export interface AutoPilotLog {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}

const DEFAULT_CONFIG: AutoPilotConfig = {
  maxChaptersPerDay: 5,
  cooldownMs: 5000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeoutMs: 120000,
  autoApprove: true,
  wordCountMin: 2000,
  wordCountMax: 5000,
}

// Circuit breaker states
type CircuitState = 'closed' | 'open' | 'half-open'

class AutoPilot {
  private state: AutoPilotState = 'idle'
  private config: AutoPilotConfig = DEFAULT_CONFIG
  private status: AutoPilotStatus = this.emptyStatus()
  private logs: AutoPilotLog[] = []
  private abortController: AbortController | null = null
  private circuitState: CircuitState = 'closed'
  private circuitOpenUntil: number = 0
  private todayChapters: number = 0
  private todayDate: string = ''
  private consecutiveFailures: number = 0
  private targetVoiceProfile: VoiceProfile | null = null

  getStatus(): AutoPilotStatus {
    return { ...this.status, state: this.state }
  }

  getLogs(): AutoPilotLog[] {
    return [...this.logs]
  }

  getConfig(): AutoPilotConfig {
    return { ...this.config }
  }

  setConfig(config: Partial<AutoPilotConfig>): void {
    this.config = { ...this.config, ...config }
  }

  setBookId(bookId: string | null, bookTitle: string = ''): void {
    this.status = { ...this.status, bookId, bookTitle }
  }

  setTargetVoiceProfile(profile: VoiceProfile | null): void {
    this.targetVoiceProfile = profile
  }

  async start(
    bookId: string,
    bookTitle: string,
    chapters: Array<{ id: string; title: string; orderIndex: number }>,
    fromIndex: number = 0,
  ): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'completed') {
      logger.warn('auto-pilot', 'Auto-pilot already running')
      return
    }

    // PID anti-reentry (PRD 9.2c)
    const lockAcquired = await acquirePidLock()
    if (!lockAcquired) {
      this.log('error', '另一个自动驾驶实例正在运行')
      notifyAutoPilotPaused('另一个自动驾驶实例正在运行')
      return
    }

    // Reset daily counter if new day
    this.resetDailyIfNeeded()

    // Beat-level idempotency: resume from checkpoint if exists
    const checkpointIndex = this.loadCheckpoint(bookId)
    const startFrom = Math.max(fromIndex, checkpointIndex)

    this.abortController = new AbortController()
    this.consecutiveFailures = 0
    this.circuitState = 'closed'

    this.status = {
      state: 'idle',
      bookId,
      bookTitle,
      currentChapter: startFrom,
      totalChapters: chapters.length,
      todayChapters: this.todayChapters,
      consecutiveFailures: 0,
      startedAt: Date.now(),
    }

    this.log('info', `自动驾驶启动: ${bookTitle} (从第 ${startFrom + 1} 章)${checkpointIndex > 0 ? ' [从断点恢复]' : ''}`)

    eventBus.emit('auto-pilot:start', { bookId })

    try {
      for (let i = startFrom; i < chapters.length; i++) {
        if (this.abortController?.signal.aborted) {
          this.state = 'paused'
          this.log('warn', '自动驾驶被用户停止')
          break
        }

        // Check daily limit
        this.resetDailyIfNeeded()
        if (this.todayChapters >= this.config.maxChaptersPerDay) {
          this.state = 'paused'
          this.log('warn', `今日已达上限 (${this.config.maxChaptersPerDay} 章)`)
          notifyAutoPilotPaused('今日写作章数已达上限')
          break
        }

        // Check disk space (PRD 9.2d). disk === null 表示浏览器模式（无法检测），跳过检查
        const disk = await checkDiskSpace()
        if (disk && !disk.sufficient) {
          this.state = 'paused'
          this.log('warn', `磁盘空间不足 (${disk.available}MB < 100MB)`)
          notifyAutoPilotPaused('磁盘空间不足，自动驾驶已暂停')
          break
        }

        // Check circuit breaker
        const cbState = this.circuitState as CircuitState
        if (cbState === 'open') {
          if (Date.now() < this.circuitOpenUntil) {
            this.log('warn', `熔断器开启，等待 ${Math.ceil((this.circuitOpenUntil - Date.now()) / 1000)}s`)
            await this.sleep(this.circuitOpenUntil - Date.now())
          } else {
            this.circuitState = 'half-open'
            this.log('info', '熔断器进入半开状态，试探执行')
          }
        }

        // Process chapter
        const chapter = chapters[i]
        this.status.currentChapter = i + 1

        try {
          await this.processChapter(bookId, chapter)
          this.consecutiveFailures = 0
          this.status.consecutiveFailures = 0
          this.todayChapters++

          // Beat-level idempotency: checkpoint progress after each chapter
          this.saveCheckpoint(bookId, i + 1)

          // Reset circuit breaker on success
          if (this.circuitState !== 'closed') {
            this.circuitState = 'closed'
            this.log('info', '熔断器恢复关闭状态')
          }

          // Cooldown between chapters
          if (i < chapters.length - 1) {
            this.log('info', `章间冷却 ${this.config.cooldownMs / 1000}s...`)
            await this.sleep(this.config.cooldownMs)
          }
        } catch (err) {
          this.consecutiveFailures++
          this.status.consecutiveFailures = this.consecutiveFailures
          this.status.lastError = String(err)
          this.log('error', `章节 ${i + 1} 失败: ${err}`)

          // Circuit breaker logic
          if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
            this.circuitState = 'open'
            this.circuitOpenUntil = Date.now() + this.config.circuitBreakerTimeoutMs
            this.state = 'paused'
            this.log('error', `熔断器开启，暂停 ${this.config.circuitBreakerTimeoutMs / 1000}s`)
            notifyAutoPilotPaused(`连续失败 ${this.consecutiveFailures} 次，自动暂停`)
            break
          }
        }
      }

      if (this.state !== 'paused') {
        this.state = 'completed'
        this.log('info', '自动驾驶完成所有章节')
        this.clearCheckpoint(bookId)
        notifyChapterComplete(this.status.bookTitle, this.status.currentChapter)
      }
    } catch (err) {
      this.state = 'paused'
      this.log('error', `自动驾驶异常: ${err}`)
      notifyError(this.status.bookTitle, String(err))
    } finally {
      this.status.state = this.state
      eventBus.emit('auto-pilot:stop', { bookId })
      await releasePidLock()
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.state = 'paused'
    this.log('info', '自动驾驶已停止')
  }

  private async processChapter(
    bookId: string,
    chapter: { id: string; title: string; orderIndex: number },
  ): Promise<void> {
    this.log('info', `开始处理: ${chapter.title}`)

    // Create DirectorAgent and run full pipeline
    const director = new DirectorAgent()
    const context: AgentContext = {
      bookId,
      chapterId: chapter.id,
      chapterContent: '',
      chapterTitle: chapter.title,
      chapterNumber: chapter.orderIndex + 1,
    }

    this.state = 'writing'
    this.status.state = 'writing'

    const result = await director.executeFullPipeline(context, {
      maxAuditRetries: 3,
    })

    if (!result.success) {
      throw new Error(result.error || 'Pipeline failed')
    }

    // Check critical issues count (PRD Section 9.2b)
    if (result.auditReport && result.auditReport.criticalCount > 5) {
      this.log('warn', `章节 ${chapter.title} 审计 critical 问题超过 5 个 (${result.auditReport.criticalCount})，暂停`)
      this.state = 'paused'
      this.status.state = 'paused'
      notifyAutoPilotPaused(`章节"${chapter.title}"审计发现 ${result.auditReport.criticalCount} 个严重问题，需人工审查`)
      throw new Error(`Critical issues exceed threshold: ${result.auditReport.criticalCount}`)
    }

    this.log('info', `${chapter.title} 完成 (评分: ${result.auditReport?.overallScore ?? 'N/A'})`)

    // Style drift detection (if targetVoiceProfile is set)
    if (result.finalContent && this.targetVoiceProfile) {
      const drift = detectStyleDrift(this.targetVoiceProfile, result.finalContent)
      if (drift.drifted) {
        this.log('warn', `文风漂移检测: 相似度 ${drift.similarity.toFixed(2)} < 阈值 0.68`)
        eventBus.emit('style:drift-detected', {
          similarity: drift.similarity,
          threshold: 0.68,
        })
      }
    }

    eventBus.emit('auto-pilot:chapter-complete', {
      bookId,
      chapterId: chapter.id,
      score: result.auditReport?.overallScore ?? 0,
    })
  }

  private resetDailyIfNeeded(): void {
    const today = new Date().toDateString()
    if (this.todayDate !== today) {
      this.todayDate = today
      this.todayChapters = 0
    }
  }

  // Beat-level idempotency: save checkpoint after each chapter
  private saveCheckpoint(bookId: string, lastCompletedIndex: number): void {
    const checkpoint = {
      bookId,
      lastCompletedIndex,
      todayChapters: this.todayChapters,
      todayDate: this.todayDate,
      consecutiveFailures: this.consecutiveFailures,
      savedAt: Date.now(),
    }
    localStorage.setItem(`auto-pilot-checkpoint:${bookId}`, JSON.stringify(checkpoint))
  }

  loadCheckpoint(bookId: string): number {
    try {
      const raw = localStorage.getItem(`auto-pilot-checkpoint:${bookId}`)
      if (!raw) return 0
      const checkpoint = JSON.parse(raw)
      if (checkpoint.bookId === bookId) {
        this.todayChapters = checkpoint.todayChapters || 0
        this.todayDate = checkpoint.todayDate || ''
        this.consecutiveFailures = checkpoint.consecutiveFailures || 0
        return checkpoint.lastCompletedIndex || 0
      }
    } catch {
      // ignore
    }
    return 0
  }

  clearCheckpoint(bookId: string): void {
    localStorage.removeItem(`auto-pilot-checkpoint:${bookId}`)
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    const entry: AutoPilotLog = { timestamp: Date.now(), level, message }
    this.logs.push(entry)
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
    logger[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info']('auto-pilot', message)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private emptyStatus(): AutoPilotStatus {
    return {
      state: 'idle',
      bookId: null,
      bookTitle: '',
      currentChapter: 0,
      totalChapters: 0,
      todayChapters: 0,
      consecutiveFailures: 0,
      startedAt: 0,
    }
  }
}

export const autoPilot = new AutoPilot()
