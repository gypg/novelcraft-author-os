import { TruthFileManager } from './manager'
import type { TruthFileName } from './schemas'

export interface TruthFileSnapshot {
  id: string
  bookId: string
  chapterNumber: number
  data: Record<TruthFileName, unknown>
  timestamp: number
}

const snapshots = new Map<string, TruthFileSnapshot[]>()

function getSnapshotKey(bookId: string): string {
  return bookId
}

export function createSnapshot(bookId: string, chapterNumber: number, manager: TruthFileManager): TruthFileSnapshot {
  const data: Record<string, unknown> = {}
  const names: TruthFileName[] = [
    'current_state', 'hooks', 'summaries', 'subplots',
    'emotional_arcs', 'character_matrix', 'particle_ledger',
  ]
  for (const name of names) {
    data[name] = manager.get(name)
  }

  const snapshot: TruthFileSnapshot = {
    id: `snap-${bookId}-${chapterNumber}-${Date.now()}`,
    bookId,
    chapterNumber,
    data: data as Record<TruthFileName, unknown>,
    timestamp: Date.now(),
  }

  const key = getSnapshotKey(bookId)
  const existing = snapshots.get(key) || []
  existing.push(snapshot)
  snapshots.set(key, existing)

  return snapshot
}

export function getSnapshots(bookId: string): TruthFileSnapshot[] {
  return snapshots.get(getSnapshotKey(bookId)) || []
}

export function getSnapshotByChapter(bookId: string, chapterNumber: number): TruthFileSnapshot | null {
  const snaps = snapshots.get(getSnapshotKey(bookId)) || []
  return snaps.find((s) => s.chapterNumber === chapterNumber) || null
}

export function rollbackToSnapshot(
  manager: TruthFileManager,
  snapshot: TruthFileSnapshot,
): void {
  for (const [name, data] of Object.entries(snapshot.data)) {
    manager.set(name as TruthFileName, data)
  }
}

export function getLatestSnapshot(bookId: string): TruthFileSnapshot | null {
  const snaps = snapshots.get(getSnapshotKey(bookId)) || []
  return snaps.length > 0 ? snaps[snaps.length - 1] : null
}
