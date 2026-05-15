export interface AuthorIntent {
  id: string
  bookId: string
  content: string
  updatedAt: number
}

export interface CurrentFocus {
  id: string
  bookId: string
  content: string
  updatedAt: number
}

const STORAGE_KEY_PREFIX = 'intent-doc'

export function getAuthorIntent(bookId: string): AuthorIntent {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:author:${bookId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { id: `author-${bookId}`, bookId, content: '', updatedAt: 0 }
}

export function saveAuthorIntent(bookId: string, content: string): void {
  const doc: AuthorIntent = {
    id: `author-${bookId}`,
    bookId,
    content,
    updatedAt: Date.now(),
  }
  localStorage.setItem(`${STORAGE_KEY_PREFIX}:author:${bookId}`, JSON.stringify(doc))
}

export function getCurrentFocus(bookId: string): CurrentFocus {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:focus:${bookId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { id: `focus-${bookId}`, bookId, content: '', updatedAt: 0 }
}

export function saveCurrentFocus(bookId: string, content: string): void {
  const doc: CurrentFocus = {
    id: `focus-${bookId}`,
    bookId,
    content,
    updatedAt: Date.now(),
  }
  localStorage.setItem(`${STORAGE_KEY_PREFIX}:focus:${bookId}`, JSON.stringify(doc))
}
