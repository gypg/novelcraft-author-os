import type { NarrativeConstraints, MasterSetting, VolumeContract, ChapterContract, ReviewContract } from './schemas'

const STORAGE_KEY = 'narrative-constraints'

export function getConstraints(bookId: string): NarrativeConstraints {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${bookId}`)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }

  return {
    masterSetting: { worldRules: [], corePromises: [], forbiddenElements: [], narrativeTone: '' },
    volumeContracts: {},
    chapterContracts: {},
    reviewContract: { requiredDimensions: [], customRules: [], qualityThreshold: 70 },
  }
}

export function saveConstraints(bookId: string, constraints: NarrativeConstraints): void {
  localStorage.setItem(`${STORAGE_KEY}:${bookId}`, JSON.stringify(constraints))
}

export function setMasterSetting(bookId: string, setting: MasterSetting): void {
  const c = getConstraints(bookId)
  c.masterSetting = setting
  saveConstraints(bookId, c)
}

export function setVolumeContract(bookId: string, volumeId: string, contract: VolumeContract): void {
  const c = getConstraints(bookId)
  c.volumeContracts[volumeId] = contract
  saveConstraints(bookId, c)
}

export function setChapterContract(bookId: string, chapterId: string, contract: ChapterContract): void {
  const c = getConstraints(bookId)
  c.chapterContracts[chapterId] = contract
  saveConstraints(bookId, c)
}

export function setReviewContract(bookId: string, contract: ReviewContract): void {
  const c = getConstraints(bookId)
  c.reviewContract = contract
  saveConstraints(bookId, c)
}

export function buildConstraintPrompt(constraints: NarrativeConstraints): string {
  const parts: string[] = []

  if (constraints.masterSetting.worldRules.length > 0) {
    parts.push('## 世界观规则')
    parts.push(constraints.masterSetting.worldRules.map((r) => `- ${r}`).join('\n'))
  }

  if (constraints.masterSetting.corePromises.length > 0) {
    parts.push('## 核心承诺（不可违背）')
    parts.push(constraints.masterSetting.corePromises.map((p) => `- ${p}`).join('\n'))
  }

  if (constraints.masterSetting.forbiddenElements.length > 0) {
    parts.push('## 禁区（绝不出现）')
    parts.push(constraints.masterSetting.forbiddenElements.map((f) => `- ${f}`).join('\n'))
  }

  if (constraints.masterSetting.narrativeTone) {
    parts.push(`## 叙事基调：${constraints.masterSetting.narrativeTone}`)
  }

  if (parts.length > 0) {
    return ['## 叙事约束', '', ...parts].join('\n')
  }

  return ''
}
