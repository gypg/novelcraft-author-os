import { TruthFileManager } from './manager'

export function renameEntityInTruthFiles(
  manager: TruthFileManager,
  oldName: string,
  newName: string,
): number {
  let totalChanges = 0

  // Rename in character_matrix
  const matrix = manager.get('character_matrix') as Record<string, string>[]
  if (Array.isArray(matrix)) {
    for (const rel of matrix) {
      if (rel.character_a === oldName) { rel.character_a = newName; totalChanges++ }
      if (rel.character_b === oldName) { rel.character_b = newName; totalChanges++ }
    }
  }

  const arcs = manager.get('emotional_arcs') as Record<string, unknown>
  if (arcs && typeof arcs === 'object') {
    for (const key of Object.keys(arcs)) {
      if (key === oldName) {
        arcs[newName] = arcs[key]
        delete arcs[key]
        totalChanges++
      }
    }
  }

  const hooks = manager.get('hooks') as Record<string, unknown>[]
  if (Array.isArray(hooks)) {
    for (const hook of hooks) {
      if (hook.description && typeof hook.description === 'string' && hook.description.includes(oldName)) {
        hook.description = hook.description.replace(new RegExp(oldName, 'g'), newName)
        totalChanges++
      }
    }
  }

  const subplots = manager.get('subplots') as Record<string, unknown>[]
  if (Array.isArray(subplots)) {
    for (const sp of subplots) {
      const chars = sp.related_characters
      if (Array.isArray(chars)) {
        for (let i = 0; i < chars.length; i++) {
          if (chars[i] === oldName) {
            chars[i] = newName
            totalChanges++
          }
        }
      }
    }
  }

  const ledger = manager.get('particle_ledger') as Record<string, unknown>[]
  if (Array.isArray(ledger)) {
    for (const item of ledger) {
      if (item.owner === oldName) {
        item.owner = newName
        totalChanges++
      }
    }
  }

  return totalChanges
}
