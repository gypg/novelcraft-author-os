export interface KnowledgeState {
  characterId: string
  chapterNumber: number
  knownFacts: string[]
  speculatedFacts: string[]
  believedFalse: string[]
  unknownFacts: string[]
}

export interface ReaderKnowledgeLayer {
  confirmed: string[]
  speculated: string[]
  believedFalse: string[]
  unknown: string[]
}

const knowledgeStore = new Map<string, KnowledgeState[]>()

function getKey(bookId: string): string {
  return bookId
}

export function getKnowledgeStates(bookId: string): KnowledgeState[] {
  return knowledgeStore.get(getKey(bookId)) || []
}

export function getKnowledgeAtChapter(
  bookId: string,
  characterId: string,
  chapterNumber: number,
): KnowledgeState | null {
  const states = knowledgeStore.get(getKey(bookId)) || []
  const relevant = states
    .filter((s) => s.characterId === characterId && s.chapterNumber <= chapterNumber)
    .sort((a, b) => b.chapterNumber - a.chapterNumber)

  return relevant[0] || null
}

export function addKnowledgeState(bookId: string, state: KnowledgeState): void {
  const key = getKey(bookId)
  const existing = knowledgeStore.get(key) || []
  existing.push(state)
  knowledgeStore.set(key, existing)
}

export function updateKnowledgeState(
  bookId: string,
  characterId: string,
  chapterNumber: number,
  updates: Partial<Omit<KnowledgeState, 'characterId' | 'chapterNumber'>>,
): void {
  const key = getKey(bookId)
  const states = knowledgeStore.get(key) || []
  const idx = states.findIndex(
    (s) => s.characterId === characterId && s.chapterNumber === chapterNumber,
  )

  if (idx >= 0) {
    states[idx] = { ...states[idx], ...updates }
  } else {
    states.push({
      characterId,
      chapterNumber,
      knownFacts: [],
      speculatedFacts: [],
      believedFalse: [],
      unknownFacts: [],
      ...updates,
    })
  }

  knowledgeStore.set(key, states)
}

export function buildReaderKnowledgeLayer(
  bookId: string,
  chapterNumber: number,
): ReaderKnowledgeLayer {
  const allStates = getKnowledgeStates(bookId)
  const confirmed: string[] = []
  const speculated: string[] = []
  const believedFalse: string[] = []
  const unknown: string[] = []

  for (const state of allStates) {
    if (state.chapterNumber <= chapterNumber) {
      confirmed.push(...state.knownFacts)
      speculated.push(...state.speculatedFacts)
      believedFalse.push(...state.believedFalse)
      unknown.push(...state.unknownFacts)
    }
  }

  return {
    confirmed: [...new Set(confirmed)],
    speculated: [...new Set(speculated)],
    believedFalse: [...new Set(believedFalse)],
    unknown: [...new Set(unknown)],
  }
}

export function checkKnowledgeViolation(
  bookId: string,
  characterId: string,
  chapterNumber: number,
  claimedFacts: string[],
): string[] {
  const knowledge = getKnowledgeAtChapter(bookId, characterId, chapterNumber)
  if (!knowledge) return []

  const violations: string[] = []
  for (const fact of claimedFacts) {
    if (knowledge.unknownFacts.some((f) => fact.includes(f) || f.includes(fact))) {
      violations.push(`角色 ${characterId} 不应该知道"${fact}"`)
    }
    if (knowledge.believedFalse.some((f) => fact.includes(f) || f.includes(fact))) {
      violations.push(`角色 ${characterId} 误信"${fact}"但实际为假`)
    }
  }

  return violations
}
