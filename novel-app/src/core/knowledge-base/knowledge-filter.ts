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
  libraryTypes?: KnowledgeLibraryType[]
  itemType?: KnowledgeItemType
  status?: KnowledgeStatus
  quotePolicy?: KnowledgeQuotePolicy
  tagId?: string
  tagCategory?: KnowledgeTagCategory
  includeArchived?: boolean
  limit?: number
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
  const filteredItems = items.filter((item) => {
    if (!filter.includeArchived && item.status === 'archived') return false
    if (filter.keyword && !includesKeyword(item, filter.keyword)) return false
    if (filter.bookId && item.book_id !== filter.bookId && item.library_type === 'project') return false
    if (filter.sourceId && item.source_id !== filter.sourceId) return false
    if (filter.libraryType && item.library_type !== filter.libraryType) return false
    if (filter.libraryTypes && !filter.libraryTypes.includes(item.library_type)) return false
    if (filter.itemType && item.item_type !== filter.itemType) return false
    if (filter.status && item.status !== filter.status) return false
    if (filter.quotePolicy && item.quote_policy !== filter.quotePolicy) return false
    if (filter.tagId || filter.tagCategory) {
      const tags = itemTags.get(item.id) ?? []
      if (filter.tagId && !tags.some((tag) => tag.id === filter.tagId)) return false
      if (filter.tagCategory && !tags.some((tag) => tag.category === filter.tagCategory)) return false
    }
    return true
  })
  const limitedItems = typeof filter.limit === 'number' ? filteredItems.slice(0, Math.max(0, filter.limit)) : filteredItems
  return limitedItems.map((item) => ({ ...item }))
}
