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

export interface ChapterVersionRow {
  id: string
  chapter_id: string
  content_hash: string
  content: string
  created_at: number
}

export async function saveChapterVersion(
  chapterId: string,
  content: string,
): Promise<ChapterVersionRow> {
  const inv = await getInvoke()
  if (!inv) return { id: '', chapter_id: chapterId, content_hash: '', content, created_at: 0 }
  return inv<ChapterVersionRow>('save_chapter_version', {
    chapterId,
    content,
  })
}

export async function listChapterVersions(
  chapterId: string,
): Promise<ChapterVersionRow[]> {
  const inv = await getInvoke()
  if (!inv) return []
  const rows = await inv<ChapterVersionRow[]>('list_chapter_versions', {
    chapterId,
  })

  // Corruption recovery: keep valid versions, skip corrupted ones (PRD 9.3c)
  return rows.filter((row) => {
    // Verify content is not empty and hash is valid hex
    if (!row.content || !row.content_hash) return false
    if (!/^[0-9a-f]{64}$/i.test(row.content_hash)) return false
    return true
  })
}

export async function revertChapterToVersion(
  chapterId: string,
  versionId: string,
): Promise<{ id: string; content: string }> {
  const inv = await getInvoke()
  if (!inv) return { id: '', content: '' }
  return inv<{ id: string; content: string }>('revert_chapter_to_version', {
    chapterId,
    versionId,
  })
}
