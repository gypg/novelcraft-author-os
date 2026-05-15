import { listChapters } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'

export interface SearchResult {
  chapterId: string
  chapterTitle: string
  matchText: string
  position: number
  contextBefore: string
  contextAfter: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractContext(text: string, position: number, matchLength: number, contextLen: number = 40): {
  before: string
  after: string
} {
  const start = Math.max(0, position - contextLen)
  const end = Math.min(text.length, position + matchLength + contextLen)

  return {
    before: start > 0 ? '...' + text.slice(start, position) : text.slice(0, position),
    after:
      end < text.length
        ? text.slice(position + matchLength, end) + '...'
        : text.slice(position + matchLength),
  }
}

export async function searchBook(
  bookId: string,
  query: string,
): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const results: SearchResult[] = []
  const lowerQuery = query.toLowerCase()

  try {
    const chapters = await listChapters(bookId)

    for (const chapter of chapters) {
      const text = stripHtml(chapter.content)
      const lowerText = text.toLowerCase()
      let searchFrom = 0

      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom)
        if (idx === -1) break

        const matchText = text.slice(idx, idx + query.length)
        const { before, after } = extractContext(text, idx, query.length)

        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          matchText,
          position: idx,
          contextBefore: before,
          contextAfter: after,
        })

        searchFrom = idx + 1

        // Limit results per chapter
        if (results.filter((r) => r.chapterId === chapter.id).length >= 20) break
      }
    }
  } catch (err) {
    logger.error('search', `Search failed: ${err}`)
  }

  return results
}

export function highlightQuery(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<mark style="background: oklch(0.85 0.15 80 / 0.4); border-radius: 2px;">$1</mark>')
}
