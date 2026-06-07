import type {
  KnowledgeItemRow,
  KnowledgeItemType,
  KnowledgeLibraryType,
  KnowledgeQuotePolicy,
  KnowledgeStatus,
  KnowledgeTagCategory,
  KnowledgeTagRow,
} from './types'

export interface KnowledgeFilterInput {
  keyword?: string
  bookId?: string
  sourceId?: string
  libraryType?: KnowledgeLibraryType
  itemType?: KnowledgeItemType
  status?: KnowledgeStatus
  quotePolicy?: KnowledgeQuotePolicy
  tagId?: string
  tagCategory?: KnowledgeTagCategory
  includeArchived?: boolean
}

function includesKeyword(item: KnowledgeItemRow, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true
  return [item.content, item.notes, item.metadata_json]
    .join('\n')
    .toLowerCase()
    .includes(normalizedKeyword)
}

export function filterKnowledgeItems(
  items: readonly KnowledgeItemRow[],
  filter: KnowledgeFilterInput,
  itemTags: ReadonlyMap<string, readonly KnowledgeTagRow[]> = new Map(),
): KnowledgeItemRow[] {
  return items.filter((item) => {
    if (!filter.includeArchived && item.status === 'archived') return false
    if (filter.keyword && !includesKeyword(item, filter.keyword)) return false
    if (filter.bookId && item.book_id !== filter.bookId) return false
    if (filter.sourceId && item.source_id !== filter.sourceId) return false
    if (filter.libraryType && item.library_type !== filter.libraryType) return false
    if (filter.itemType && item.item_type !== filter.itemType) return false
    if (filter.status && item.status !== filter.status) return false
    if (filter.quotePolicy && item.quote_policy !== filter.quotePolicy) return false
    if (filter.tagId || filter.tagCategory) {
      const tags = itemTags.get(item.id) ?? []
      if (filter.tagId && !tags.some((tag) => tag.id === filter.tagId)) return false
      if (filter.tagCategory && !tags.some((tag) => tag.category === filter.tagCategory)) return false
    }
    return true
  }).map((item) => ({ ...item }))
}
