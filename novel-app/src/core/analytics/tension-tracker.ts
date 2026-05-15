import type { AuditReport } from '@/core/ai-engine/agents/audit-types'

export interface TensionScore {
  chapterNumber: number
  score: number
  factors: string[]
}

function computeTensionFromAudit(report: AuditReport): { score: number; factors: string[] } {
  const factors: string[] = []
  let score = 5 // baseline

  for (const dim of report.dimensions) {
    if (dim.id === 'pacing' && dim.severity !== 'pass') {
      if (dim.severity === 'critical') { score -= 2; factors.push('节奏问题严重') }
      else if (dim.severity === 'warning') { score -= 1; factors.push('节奏需改进') }
      else { score += 0.5; factors.push('节奏良好') }
    }
    if (dim.id === 'tension-suspense' && dim.severity !== 'pass') {
      if (dim.severity === 'critical') { score -= 2; factors.push('张力不足') }
      else if (dim.severity === 'warning') { score -= 1; factors.push('张力偏低') }
      else { score += 1; factors.push('张力充沛') }
    }
    if (dim.id === 'conflict-density' || dim.id === 'plot-advancement') {
      if (dim.severity === 'pass') { score += 0.5; factors.push('情节推进有力') }
      else if (dim.severity === 'critical') { score -= 1 }
    }
    if (dim.id === 'chapter-closing' && dim.severity === 'pass') {
      score += 0.5; factors.push('章末钩子有效')
    }
    if (dim.id === 'emotional-arc' && dim.severity === 'pass') {
      score += 0.5; factors.push('情感弧线完整')
    }
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    factors,
  }
}

export function computeTensionScores(
  chapters: Array<{ chapterNumber: number; auditReport?: AuditReport }>,
): TensionScore[] {
  return chapters
    .filter((ch) => ch.auditReport)
    .map((ch) => {
      const { score, factors } = computeTensionFromAudit(ch.auditReport!)
      return {
        chapterNumber: ch.chapterNumber,
        score,
        factors,
      }
    })
}

export function detectTensionAnomalies(scores: TensionScore[]): string[] {
  const anomalies: string[] = []

  if (scores.length < 3) return anomalies

  // Check for consecutive low scores
  let consecutiveLow = 0
  for (const s of scores) {
    if (s.score <= 3) {
      consecutiveLow++
      if (consecutiveLow >= 3) {
        anomalies.push(`连续 ${consecutiveLow} 章张力偏低（≤3分），建议增加冲突或悬念`)
        break
      }
    } else {
      consecutiveLow = 0
    }
  }

  // Check for consecutive high scores (tension fatigue)
  let consecutiveHigh = 0
  for (const s of scores) {
    if (s.score >= 9) {
      consecutiveHigh++
      if (consecutiveHigh >= 4) {
        anomalies.push(`连续 ${consecutiveHigh} 章张力过高（≥9分），建议插入舒缓章节`)
        break
      }
    } else {
      consecutiveHigh = 0
    }
  }

  // Check for dramatic drops
  for (let i = 1; i < scores.length; i++) {
    const drop = scores[i - 1].score - scores[i].score
    if (drop >= 4) {
      anomalies.push(`第 ${scores[i - 1].chapterNumber} → ${scores[i].chapterNumber} 章张力骤降 ${drop.toFixed(1)} 分`)
    }
  }

  return anomalies
}
