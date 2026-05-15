export interface CharacterProfile {
  id: string
  name: string
  aliases: string[]
  description: string
  appearance: string
  personality: string[]
  abilities: string[]
  relationships: Array<{ targetId: string; targetName: string; relation: string }>
  firstAppearance: number
  status: 'alive' | 'dead' | 'unknown'
}

export function extractProfilesFromMatrix(matrixJson: string): CharacterProfile[] {
  try {
    const data = JSON.parse(matrixJson)
    if (!Array.isArray(data)) return []

    const characterMap = new Map<string, CharacterProfile>()

    for (const rel of data) {
      const charA = rel.character_a || rel.source || ''
      const charB = rel.character_b || rel.target || ''

      if (charA && !characterMap.has(charA)) {
        characterMap.set(charA, {
          id: charA,
          name: charA,
          aliases: [],
          description: '',
          appearance: '',
          personality: [],
          abilities: [],
          relationships: [],
          firstAppearance: rel.chapter || 0,
          status: 'unknown',
        })
      }

      if (charB && !characterMap.has(charB)) {
        characterMap.set(charB, {
          id: charB,
          name: charB,
          aliases: [],
          description: '',
          appearance: '',
          personality: [],
          abilities: [],
          relationships: [],
          firstAppearance: rel.chapter || 0,
          status: 'unknown',
        })
      }

      if (charA && charB && characterMap.has(charA)) {
        characterMap.get(charA)!.relationships.push({
          targetId: charB,
          targetName: charB,
          relation: rel.relation || rel.type || 'ally',
        })
      }
    }

    return Array.from(characterMap.values())
  } catch {
    return []
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'alive': return 'oklch(0.65 0.17 145)'
    case 'dead': return 'oklch(0.6 0.22 25)'
    default: return 'var(--muted-foreground)'
  }
}
