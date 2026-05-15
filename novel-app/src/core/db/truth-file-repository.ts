import { isTauri } from '@/shared/utils/tauri-env'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export type TruthFileName =
  | 'current_state'
  | 'hooks'
  | 'summaries'
  | 'subplots'
  | 'emotional_arcs'
  | 'character_matrix'
  | 'particle_ledger'

export interface TruthFileRow {
  id: string
  book_id: string
  file_type: string
  content_json: string
  updated_at: number
}

export async function saveTruthFile(
  bookId: string,
  fileType: TruthFileName,
  contentJson: string,
): Promise<TruthFileRow> {
  const inv = await getInvoke()
  if (!inv) return { id: '', book_id: bookId, file_type: fileType, content_json: contentJson, updated_at: 0 }
  return inv<TruthFileRow>('save_truth_file', {
    bookId,
    fileType,
    contentJson,
  })
}

export async function loadTruthFile(
  bookId: string,
  fileType: TruthFileName,
): Promise<TruthFileRow | null> {
  const inv = await getInvoke()
  if (!inv) return null
  return inv<TruthFileRow | null>('load_truth_file', {
    bookId,
    fileType,
  })
}

export async function loadAllTruthFiles(
  bookId: string,
): Promise<TruthFileRow[]> {
  const inv = await getInvoke()
  if (!inv) return []
  return inv<TruthFileRow[]>('load_all_truth_files', {
    bookId,
  })
}

export async function deleteTruthFile(
  bookId: string,
  fileType: TruthFileName,
): Promise<void> {
  const inv = await getInvoke()
  if (!inv) return
  return inv<void>('delete_truth_file', {
    bookId,
    fileType,
  })
}
