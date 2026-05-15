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

export interface ChatMessageRow {
  id: string
  book_id: string
  chapter_id: string | null
  role: string
  content: string
  metadata: string | null
  created_at: number
}

export async function saveChatMessage(
  bookId: string,
  chapterId: string | null,
  role: string,
  content: string,
  metadata?: string,
): Promise<ChatMessageRow> {
  const inv = await getInvoke()
  if (!inv) return { id: '', book_id: bookId, chapter_id: chapterId, role, content, metadata: metadata || null, created_at: 0 }
  return inv<ChatMessageRow>('save_chat_message', {
    bookId,
    chapterId,
    role,
    content,
    metadata: metadata || null,
  })
}

export async function listChatMessages(
  bookId: string,
  chapterId?: string,
  limit?: number,
): Promise<ChatMessageRow[]> {
  const inv = await getInvoke()
  if (!inv) return []
  return inv<ChatMessageRow[]>('list_chat_messages', {
    bookId,
    chapterId: chapterId || null,
    limit: limit || 100,
  })
}

export async function clearChatMessages(bookId: string): Promise<void> {
  const inv = await getInvoke()
  if (!inv) return
  return inv<void>('clear_chat_messages', { bookId })
}
