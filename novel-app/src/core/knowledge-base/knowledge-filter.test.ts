import { describe, expect, it } from 'vitest'
import type { KnowledgeItemRow, KnowledgeTagRow } from './types'
import { filterKnowledgeItems } from './knowledge-filter'

const baseItem: KnowledgeItemRow = {
  id: 'item-1',
  source_id: 'source-1',
  book_id: 'book-1',
  library_type: 'external',
  canonical_level: 'inspiration',
  item_type: 'quote',
  content: '雨夜里的旧城区',
  quote_policy: 'paraphrase_recommended',
  status: 'confirmed',
  metadata_json: '{}',
  notes: '氛围素材',
  created_at: 1,
  updated_at: 1,
}

describe('knowledge filtering', () => {
  it('filters by keyword, library type, item type, status, quote policy, and book', () => {
    const items: KnowledgeItemRow[] = [
      baseItem,
      { ...baseItem, id: 'item-2', content: '角色林默的秘密', library_type: 'project', canonical_level: 'canonical', item_type: 'character', quote_policy: 'not_applicable' },
      { ...baseItem, id: 'item-3', content: '作者常用短句', library_type: 'author', canonical_level: 'reference', item_type: 'analysis', quote_policy: 'not_applicable' },
      { ...baseItem, id: 'item-4', content: '归档素材', status: 'archived' },
    ]

    expect(filterKnowledgeItems(items, { keyword: '雨夜' }).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems(items, { libraryType: 'project' }).map((item) => item.id)).toEqual(['item-2'])
    expect(filterKnowledgeItems(items, { itemType: 'analysis' }).map((item) => item.id)).toEqual(['item-3'])
    expect(filterKnowledgeItems(items, { status: 'archived', includeArchived: true }).map((item) => item.id)).toEqual(['item-4'])
    expect(filterKnowledgeItems(items, { quotePolicy: 'paraphrase_recommended' }).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems(items, { bookId: 'book-1' }).map((item) => item.id)).toEqual(['item-1', 'item-2', 'item-3'])
  })

  it('filters by attached tag id and category without mutating tag maps', () => {
    const sceneTag: KnowledgeTagRow = { id: 'tag-1', category: 'scene', name: '雨夜', color: '#3b82f6', created_at: 1, updated_at: 1 }
    const emotionTag: KnowledgeTagRow = { id: 'tag-2', category: 'emotion', name: '孤独', color: '#64748b', created_at: 1, updated_at: 1 }
    const itemTags = new Map<string, KnowledgeTagRow[]>([
      ['item-1', [sceneTag, emotionTag]],
    ])

    expect(filterKnowledgeItems([baseItem], { tagId: 'tag-1' }, itemTags).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems([baseItem], { tagCategory: 'emotion' }, itemTags).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems([baseItem], { tagId: 'missing' }, itemTags)).toEqual([])
    expect(itemTags.get('item-1')).toHaveLength(2)
  })

  it('excludes archived items by default and does not mutate input arrays', () => {
    const items = [baseItem, { ...baseItem, id: 'item-4', status: 'archived' as const }]
    const result = filterKnowledgeItems(items, {})

    expect(result.map((item) => item.id)).toEqual(['item-1'])
    result.push({ ...baseItem, id: 'new' })
    expect(items).toHaveLength(2)
  })
})
