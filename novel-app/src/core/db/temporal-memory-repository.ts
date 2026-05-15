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

export interface TemporalFactRow {
  id: string
  book_id: string
  chapter_id: string
  subject: string
  predicate: string
  object: string
  valid_from_chapter: number
  valid_until_chapter: number | null
  created_at: number
  updated_at: number
}

export interface NewTemporalFact {
  subject: string
  predicate: string
  object: string
  valid_from_chapter: number
  valid_until_chapter?: number | null
}

export async function saveTemporalFacts(
  bookId: string,
  chapterId: string,
  facts: NewTemporalFact[],
): Promise<TemporalFactRow[]> {
  const inv = await getInvoke()
  if (!inv) return []
  return inv<TemporalFactRow[]>('save_temporal_facts', {
    bookId,
    chapterId,
    facts,
  })
}

export async function queryTemporalFactsAtChapter(
  bookId: string,
  chapterNumber: number,
): Promise<TemporalFactRow[]> {
  const inv = await getInvoke()
  if (!inv) return []
  return inv<TemporalFactRow[]>('query_temporal_facts', {
    bookId,
    chapterNumber,
  })
}

export async function invalidateTemporalFacts(
  bookId: string,
  chapterIds: string[],
): Promise<void> {
  const inv = await getInvoke()
  if (!inv) return
  return inv<void>('invalidate_temporal_facts', {
    bookId,
    chapterIds,
  })
}
