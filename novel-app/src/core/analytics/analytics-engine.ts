import type { ChapterRow } from '@/core/db/repository'

export interface WordCountTrend {
  date: string
  count: number
}

export interface AuditTrend {
  date: string
  score: number
}

export interface TopIssue {
  dimension: string
  count: number
}

export interface AnalyticsSummary {
  totalWords: number
  totalChapters: number
  avgWordsPerChapter: number
  wordCountTrend: WordCountTrend[]
  auditTrend: AuditTrend[]
  topIssues: TopIssue[]
  modelUsage: Record<string, number>
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function computeWordCountTrend(chapters: ChapterRow[]): WordCountTrend[] {
  const byDate = new Map<string, number>()

  for (const ch of chapters) {
    const date = formatDate(ch.updated_at)
    byDate.set(date, (byDate.get(date) || 0) + ch.word_count)
  }

  return Array.from(byDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeAuditTrend(chapters: ChapterRow[]): AuditTrend[] {
  return chapters
    .filter((ch) => ch.ai_audit_score !== null && ch.ai_audit_score !== undefined)
    .map((ch) => ({
      date: formatDate(ch.updated_at),
      score: ch.ai_audit_score as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeSummary(chapters: ChapterRow[]): Omit<AnalyticsSummary, 'topIssues' | 'modelUsage'> {
  const totalWords = chapters.reduce((sum, ch) => sum + ch.word_count, 0)
  const totalChapters = chapters.length

  return {
    totalWords,
    totalChapters,
    avgWordsPerChapter: totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0,
    wordCountTrend: computeWordCountTrend(chapters),
    auditTrend: computeAuditTrend(chapters),
  }
}

export function computeModelUsage(): Record<string, number> {
  try {
    const raw = localStorage.getItem('model-usage-stats')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function recordModelUsage(model: string): void {
  try {
    const stats = computeModelUsage()
    stats[model] = (stats[model] || 0) + 1
    localStorage.setItem('model-usage-stats', JSON.stringify(stats))
  } catch {
    // ignore
  }
}

// Token usage tracking
const TOKEN_STORAGE_KEY = 'token-usage-stats'

export interface TokenUsageEntry {
  model: string
  inputTokens: number
  outputTokens: number
  timestamp: number
}

export function recordTokenUsage(model: string, inputTokens: number, outputTokens: number): void {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    const entries: TokenUsageEntry[] = raw ? JSON.parse(raw) : []
    entries.push({ model, inputTokens, outputTokens, timestamp: Date.now() })
    // Keep last 1000 entries
    if (entries.length > 1000) entries.splice(0, entries.length - 1000)
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

export function computeTokenUsage(): { totalInput: number; totalOutput: number; byModel: Record<string, { input: number; output: number }> } {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    const entries: TokenUsageEntry[] = raw ? JSON.parse(raw) : []

    let totalInput = 0
    let totalOutput = 0
    const byModel: Record<string, { input: number; output: number }> = {}

    for (const entry of entries) {
      totalInput += entry.inputTokens
      totalOutput += entry.outputTokens
      if (!byModel[entry.model]) byModel[entry.model] = { input: 0, output: 0 }
      byModel[entry.model].input += entry.inputTokens
      byModel[entry.model].output += entry.outputTokens
    }

    return { totalInput, totalOutput, byModel }
  } catch {
    return { totalInput: 0, totalOutput: 0, byModel: {} }
  }
}
