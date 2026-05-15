import type { AgentContext } from './agents/types'
import type { TruthFileName } from '@/core/db/truth-file-repository'

export interface HallucinationCheckResult {
  layer: string
  passed: boolean
  violations: string[]
}

export function checkL1OutlineConstraint(
  content: string,
  outlineDescription: string,
): HallucinationCheckResult {
  const violations: string[] = []

  if (!outlineDescription) {
    return { layer: 'L1-outline', passed: true, violations: [] }
  }

  // Simple check: key terms from outline should appear in content
  const outlineTerms = outlineDescription
    .replace(/[，。！？、""''（）]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 10)

  const contentLower = content.toLowerCase()
  const missingTerms = outlineTerms.filter((t) => !contentLower.includes(t.toLowerCase()))

  if (outlineTerms.length > 0 && missingTerms.length > outlineTerms.length * 0.5) {
    violations.push(`内容可能偏离大纲方向，缺少关键元素：${missingTerms.slice(0, 3).join('、')}`)
  }

  return { layer: 'L1-outline', passed: violations.length === 0, violations }
}

export function checkL2SettingConsistency(
  content: string,
  truthFilesJson: Record<TruthFileName, string>,
): HallucinationCheckResult {
  const violations: string[] = []

  // Check current_state for world rules
  try {
    const state = JSON.parse(truthFilesJson.current_state || '{}')
    if (state.conditions && typeof state.conditions === 'object') {
      for (const [rule, value] of Object.entries(state.conditions)) {
        if (typeof value === 'string' && value.length > 0) {
          // If a world rule is established and content contradicts it, flag
          // Simple heuristic: check for negation patterns
          const negations = ['没有', '不存在', '无法', '不可能']
          for (const neg of negations) {
            if (content.includes(`${rule}`) && content.includes(neg)) {
              violations.push(`内容可能与世界观规则"${rule}"矛盾`)
              break
            }
          }
        }
      }
    }
  } catch { /* ignore */ }

  return { layer: 'L2-setting', passed: violations.length === 0, violations }
}

export function checkL3InventionMarking(
  newEntities: string[],
  truthFilesJson: Record<TruthFileName, string>,
): HallucinationCheckResult {
  const violations: string[] = []
  const allKnownEntities = extractKnownEntities(truthFilesJson)

  for (const entity of newEntities) {
    if (!allKnownEntities.has(entity)) {
      violations.push(`新实体"${entity}"未在真相文件中记录，需审核`)
    }
  }

  return { layer: 'L3-invention', passed: violations.length === 0, violations }
}

export function checkL4ConstraintSaturation(
  hooksJson: string,
  currentChapter: number,
): HallucinationCheckResult {
  const violations: string[] = []

  try {
    const hooks = JSON.parse(hooksJson)
    if (!Array.isArray(hooks)) return { layer: 'L4-saturation', passed: true, violations: [] }

    const staleHooks = hooks.filter(
      (h: Record<string, unknown>) =>
        h.status === 'planted' &&
        currentChapter - (h.planted_chapter as number || 0) > 30,
    )

    if (staleHooks.length > 0) {
      violations.push(`${staleHooks.length} 个伏笔已超过 30 章未回收`)
    }

    const abandonedCount = hooks.filter((h: Record<string, unknown>) => h.status === 'abandoned').length
    if (abandonedCount > hooks.length * 0.3) {
      violations.push(`${abandonedCount}/${hooks.length} 个伏笔被废弃，建议回收`)
    }
  } catch {
    // ignore parse errors
  }

  return { layer: 'L4-saturation', passed: violations.length === 0, violations }
}

export function checkL5AdHocInvention(
  content: string,
  truthFilesJson: Record<TruthFileName, string>,
): HallucinationCheckResult {
  const violations: string[] = []
  const allKnownEntities = extractKnownEntities(truthFilesJson)

  // Extract potential new entities from content (simple: 2-4 char capitalized or quoted terms)
  const entityPatterns = /["「『](.{2,10})["」』]/g
  let match
  while ((match = entityPatterns.exec(content)) !== null) {
    const entity = match[1]
    if (!allKnownEntities.has(entity) && entity.length >= 2) {
      // Could be a legitimate new entity or dangerous fabrication
      violations.push(`可能的新发明"${entity}"需要审核`)
    }
  }

  return { layer: 'L5-adhoc', passed: violations.length === 0, violations }
}

function extractKnownEntities(truthFilesJson: Record<TruthFileName, string>): Set<string> {
  const entities = new Set<string>()

  // Extract from character_matrix
  try {
    const matrix = JSON.parse(truthFilesJson.character_matrix || '[]')
    if (Array.isArray(matrix)) {
      for (const rel of matrix) {
        if (rel.character_a) entities.add(rel.character_a)
        if (rel.character_b) entities.add(rel.character_b)
      }
    }
  } catch { /* ignore */ }

  // Extract from particle_ledger
  try {
    const ledger = JSON.parse(truthFilesJson.particle_ledger || '[]')
    if (Array.isArray(ledger)) {
      for (const item of ledger) {
        if (item.name) entities.add(item.name)
      }
    }
  } catch { /* ignore */ }

  // Extract from current_state conditions
  try {
    const state = JSON.parse(truthFilesJson.current_state || '{}')
    if (state.location) entities.add(state.location)
  } catch { /* ignore */ }

  return entities
}

export function runAllHallucinationChecks(
  content: string,
  context: AgentContext,
  truthFilesJson: Record<TruthFileName, string>,
): HallucinationCheckResult[] {
  const currentChapter = context.chapterNumber ?? 1

  return [
    checkL1OutlineConstraint(content, context.outlineDescription || ''),
    checkL2SettingConsistency(content, truthFilesJson),
    checkL3InventionMarking([], truthFilesJson),
    checkL4ConstraintSaturation(truthFilesJson.hooks || '[]', currentChapter),
    checkL5AdHocInvention(content, truthFilesJson),
  ]
}
