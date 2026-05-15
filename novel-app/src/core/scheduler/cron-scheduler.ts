import { logger } from '@/shared/utils/logger'

export interface CronJob {
  id: string
  name: string
  cronExpression: string
  bookId: string
  enabled: boolean
  lastRun?: number
  nextRun?: number
}

const STORAGE_KEY = 'cron-scheduler-jobs'
let checkInterval: ReturnType<typeof setInterval> | null = null

function parseCronExpression(expr: string): {
  minute: number | '*'
  hour: number | '*'
  dayOfMonth: number | '*'
  month: number | '*'
  dayOfWeek: number | '*'
} | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const parse = (s: string): number | '*' => {
    if (s === '*') return '*'
    const n = parseInt(s, 10)
    return isNaN(n) ? '*' : n
  }

  return {
    minute: parse(parts[0]),
    hour: parse(parts[1]),
    dayOfMonth: parse(parts[2]),
    month: parse(parts[3]),
    dayOfWeek: parse(parts[4]),
  }
}

function shouldRun(cron: ReturnType<typeof parseCronExpression>, date: Date): boolean {
  if (!cron) return false

  if (cron.minute !== '*' && cron.minute !== date.getMinutes()) return false
  if (cron.hour !== '*' && cron.hour !== date.getHours()) return false
  if (cron.dayOfMonth !== '*' && cron.dayOfMonth !== date.getDate()) return false
  if (cron.month !== '*' && cron.month !== (date.getMonth() + 1)) return false
  if (cron.dayOfWeek !== '*' && cron.dayOfWeek !== date.getDay()) return false

  return true
}

export function getAllJobs(): CronJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveJobs(jobs: CronJob[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
}

export function addJob(job: Omit<CronJob, 'id'>): CronJob {
  const jobs = getAllJobs()
  const newJob: CronJob = {
    ...job,
    id: crypto.randomUUID(),
  }
  jobs.push(newJob)
  saveJobs(jobs)
  logger.info('cron-scheduler', `Added job: ${newJob.name} (${newJob.cronExpression})`)
  return newJob
}

export function removeJob(id: string): void {
  const jobs = getAllJobs().filter((j) => j.id !== id)
  saveJobs(jobs)
  logger.info('cron-scheduler', `Removed job: ${id}`)
}

export function toggleJob(id: string, enabled: boolean): void {
  const jobs = getAllJobs().map((j) =>
    j.id === id ? { ...j, enabled } : j,
  )
  saveJobs(jobs)
}

export function startScheduler(onTrigger: (job: CronJob) => void): void {
  if (checkInterval) return

  checkInterval = setInterval(() => {
    const now = new Date()
    const jobs = getAllJobs()

    for (const job of jobs) {
      if (!job.enabled) continue

      const cron = parseCronExpression(job.cronExpression)
      if (!shouldRun(cron, now)) continue

      // Prevent double-fire within the same minute
      if (job.lastRun) {
        const lastRunDate = new Date(job.lastRun)
        if (
          lastRunDate.getMinutes() === now.getMinutes() &&
          lastRunDate.getHours() === now.getHours()
        ) {
          continue
        }
      }

      logger.info('cron-scheduler', `Triggering job: ${job.name}`)
      job.lastRun = Date.now()
      saveJobs(jobs)

      onTrigger(job)
    }
  }, 60_000) // Check every minute

  logger.info('cron-scheduler', 'Scheduler started')
}

export function stopScheduler(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
    logger.info('cron-scheduler', 'Scheduler stopped')
  }
}
