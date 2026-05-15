import type { NarrativeConstraints } from './schemas'
import { checkKnowledgeViolation } from './knowledge-state'

export interface ConstraintViolation {
  layer: 'master' | 'volume' | 'chapter' | 'knowledge' | 'saturation'
  severity: 'critical' | 'warning'
  description: string
  suggestion?: string
}

export function validateConstraints(
  chapterContent: string,
  chapterId: string,
  chapterNumber: number,
  bookId: string,
  constraints: NarrativeConstraints,
  characterIds: string[] = [],
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  // L1: Master Setting check
  for (const forbidden of constraints.masterSetting.forbiddenElements) {
    if (chapterContent.includes(forbidden)) {
      violations.push({
        layer: 'master',
        severity: 'critical',
        description: `章节包含禁区元素：${forbidden}`,
        suggestion: `移除或替换"${forbidden}"相关内容`,
      })
    }
  }

  // Volume contract check
  const volumeContracts = Object.values(constraints.volumeContracts)
  for (const vc of volumeContracts) {
    for (const reveal of vc.forbiddenReveals) {
      if (chapterContent.includes(reveal)) {
        violations.push({
          layer: 'volume',
          severity: 'critical',
          description: `提前揭示了禁止信息：${reveal}`,
        })
      }
    }
  }

  // Chapter contract check
  const cc = constraints.chapterContracts[chapterId]
  if (cc) {
    for (const action of cc.forbiddenActions) {
      if (chapterContent.includes(action)) {
        violations.push({
          layer: 'chapter',
          severity: 'critical',
          description: `本章禁止行为：${action}`,
        })
      }
    }
  }

  // Knowledge state check
  for (const charId of characterIds) {
    const kviolations = checkKnowledgeViolation(bookId, charId, chapterNumber, [
      chapterContent.slice(0, 500),
    ])
    for (const v of kviolations) {
      violations.push({
        layer: 'knowledge',
        severity: 'warning',
        description: v,
        suggestion: '检查角色知识状态，确保角色不会知道不该知道的事',
      })
    }
  }

  return violations
}
