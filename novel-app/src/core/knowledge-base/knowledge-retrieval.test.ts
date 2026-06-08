import { describe, expect, it } from 'vitest'
import type { KnowledgeItemRow } from './types'
import { retrieveKnowledgeItems } from './knowledge-retrieval'

function item(overrides: Partial<KnowledgeItemRow>): KnowledgeItemRow {
  return {
    id: 'item',
    source_id: null,
    book_id: null,
    library_type: 'external',
    canonical_level: 'inspiration',
    item_type: 'note',
    content: '',
    quote_policy: 'not_applicable',
    status: 'confirmed',
    metadata_json: '{}',
    notes: '',
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

describe('knowledge retrieval', () => {
  it('prioritizes project canonical knowledge over author and external matches', () => {
    const results = retrieveKnowledgeItems([
      item({ id: 'external', content: '雨夜 工厂 秘密', updated_at: 10 }),
      item({ id: 'author', library_type: 'author', canonical_level: 'reference', content: '雨夜 工厂 秘密', updated_at: 9 }),
      item({ id: 'project', library_type: 'project', canonical_level: 'canonical', book_id: 'book-1', content: '雨夜 工厂 秘密', updated_at: 8 }),
    ], { bookId: 'book-1', query: '雨夜工厂' })

    expect(results.map((result) => result.item.id)).toEqual(['project', 'author', 'external'])
    expect(results[0].scoreBreakdown.libraryWeight).toBe(3)
  })

  it('does not leak another book project canonical knowledge', () => {
    const results = retrieveKnowledgeItems([
      item({ id: 'other-book', library_type: 'project', canonical_level: 'canonical', book_id: 'book-2', content: '雨夜 工厂' }),
      item({ id: 'global-author', library_type: 'author', canonical_level: 'reference', content: '雨夜 工厂' }),
    ], { bookId: 'book-1', query: '雨夜工厂' })

    expect(results.map((result) => result.item.id)).toEqual(['global-author'])
  })

  it('downranks direct forbidden external content', () => {
    const results = retrieveKnowledgeItems([
      item({ id: 'safe', content: '雨夜 工厂', quote_policy: 'not_applicable' }),
      item({ id: 'forbidden', content: '雨夜 工厂', quote_policy: 'direct_forbidden', metadata_json: '{"summary":"雨夜 工厂"}' }),
    ], { bookId: 'book-1', query: '雨夜工厂' })

    expect(results.map((result) => result.item.id)).toEqual(['safe', 'forbidden'])
    expect(results[1].scoreBreakdown.quotePolicyWeight).toBeLessThan(results[0].scoreBreakdown.quotePolicyWeight)
  })

  it('does not score direct-forbidden external items from raw content', () => {
    const results = retrieveKnowledgeItems([
      item({
        id: 'forbidden',
        content: '月光像刀一样落在废弃工厂',
        notes: '月光像刀一样落在废弃工厂',
        quote_policy: 'direct_forbidden',
        metadata_json: '{}',
      }),
      item({
        id: 'safe-summary',
        content: 'unrelated raw text',
        quote_policy: 'direct_forbidden',
        metadata_json: '{"summary":"冷硬月光与废弃工厂氛围","keywords":["工厂"]}',
      }),
    ], { bookId: 'book-1', query: '月光工厂' })

    expect(results.map((result) => result.item.id)).toEqual(['safe-summary'])
  })

  it('limits candidate processing while preserving project and author priority', () => {
    const results = retrieveKnowledgeItems([
      item({ id: 'external-new', content: '雨夜 工厂 秘密', updated_at: 100 }),
      item({ id: 'external-old', content: '雨夜 工厂 秘密', updated_at: 99 }),
      item({ id: 'author', library_type: 'author', canonical_level: 'reference', content: '雨夜 工厂 秘密', updated_at: 1 }),
      item({ id: 'project', library_type: 'project', canonical_level: 'canonical', book_id: 'book-1', content: '雨夜 工厂 秘密', updated_at: 1 }),
    ], { bookId: 'book-1', query: '雨夜工厂', maxResults: 4, maxCandidates: 2 })

    expect(results.map((result) => result.item.id)).toEqual(['project', 'author'])
  })
})
