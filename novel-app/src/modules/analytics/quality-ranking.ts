import type { ChapterRow } from '@/core/db/repository'
import type { AuditReport } from '@/core/ai-engine/agents/audit-types'

export interface ChapterQuality {
  chapterId: string
  chapterTitle: string
  score: number
  criticalCount: number
  warningCount: number
  topDimension: string
}

export function computeChapterRanking(
  chapters: ChapterRow[],
  auditReports: Map<string, AuditReport>,
): ChapterQuality[] {
  const results: ChapterQuality[] = []

  for (const ch of chapters) {
    const report = auditReports.get(ch.id)
    if (!report) continue

    // Find dimension with most issues
    let topDimension = ''
    let maxIssues = 0
    for (const dim of report.dimensions) {
      if (dim.issues.length > maxIssues) {
        maxIssues = dim.issues.length
        topDimension = dim.name
      }
    }

    results.push({
      chapterId: ch.id,
      chapterTitle: ch.title,
      score: report.overallScore,
      criticalCount: report.criticalCount,
      warningCount: report.warningCount,
      topDimension,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

export function computeTopIssues(
  auditReports: Map<string, AuditReport>,
): Array<{ dimension: string; count: number; category: string }> {
  const issueCounts = new Map<string, { count: number; category: string }>()

  for (const report of auditReports.values()) {
    for (const dim of report.dimensions) {
      if (dim.issues.length > 0) {
        const existing = issueCounts.get(dim.id)
        if (existing) {
          existing.count += dim.issues.length
        } else {
          issueCounts.set(dim.id, { count: dim.issues.length, category: dim.category })
        }
      }
    }
  }

  return Array.from(issueCounts.entries())
    .map(([dimension, { count, category }]) => ({ dimension, count, category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}
