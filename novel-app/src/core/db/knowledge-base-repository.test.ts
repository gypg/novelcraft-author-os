import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetKnowledgeRepositoryForTests,
  attachKnowledgeTagToItem,
  createKnowledgeItem,
  createKnowledgeSource,
  createKnowledgeTag,
  deleteKnowledgeSource,
  listKnowledgeItemTags,
  listKnowledgeItems,
  listKnowledgeSources,
  updateKnowledgeItem,
  updateKnowledgeSource,
} from './knowledge-base-repository'

describe('knowledge base repository browser fallback', () => {
  beforeEach(() => __resetKnowledgeRepositoryForTests())

  it('creates and lists defensive copies of knowledge items', async () => {
    const source = await createKnowledgeSource({
      id: 'source-1',
      title: '摘抄来源',
      source_type: 'unknown',
    })

    const input = Object.freeze({
      id: 'item-1',
      source_id: source.id,
      book_id: null,
      library_type: 'external' as const,
      canonical_level: 'inspiration' as const,
      item_type: 'quote' as const,
      content: '雨夜里的旧城区',
      quote_policy: 'paraphrase_recommended' as const,
      status: 'confirmed' as const,
      metadata_json: '{}',
      notes: '',
    })

    const created = await createKnowledgeItem(input)
    const listed = await listKnowledgeItems({})
    listed[0].content = 'mutated outside repository'
    const listedAgain = await listKnowledgeItems({})

    expect(created.content).toBe('雨夜里的旧城区')
    expect(listedAgain[0].content).toBe('雨夜里的旧城区')
  })

  it('updates items immutably', async () => {
    await createKnowledgeItem({
      id: 'item-1',
      source_id: null,
      book_id: 'book-1',
      library_type: 'project',
      canonical_level: 'canonical',
      item_type: 'note',
      content: '旧内容',
      quote_policy: 'not_applicable',
      status: 'pending',
      metadata_json: '{}',
      notes: '',
    })

    const before = (await listKnowledgeItems({ includeArchived: true }))[0]
    const updated = await updateKnowledgeItem('item-1', { content: '新内容', status: 'confirmed' })

    expect(before.content).toBe('旧内容')
    expect(updated.content).toBe('新内容')
    expect(updated.status).toBe('confirmed')
  })

  it('creates, updates, and deletes sources without mutating returned source rows', async () => {
    const source = await createKnowledgeSource({ id: 'source-1', title: '来源', source_type: 'unknown' })
    const updated = await updateKnowledgeSource(source.id, { title: '新来源' })
    expect(source.title).toBe('来源')
    expect(updated.title).toBe('新来源')
    await deleteKnowledgeSource(source.id)
    expect(await listKnowledgeSources()).toEqual([])
  })

  it('creates tags and assigns them idempotently to items', async () => {
    await createKnowledgeItem({
      id: 'item-1', source_id: null, book_id: null, library_type: 'external', canonical_level: 'inspiration',
      item_type: 'quote', content: '雨夜素材', quote_policy: 'paraphrase_recommended', status: 'confirmed', metadata_json: '{}', notes: '',
    })
    const tag = await createKnowledgeTag({ id: 'tag-1', category: 'scene', name: '雨夜', color: '#3b82f6' })
    await attachKnowledgeTagToItem('item-1', tag.id)
    await attachKnowledgeTagToItem('item-1', tag.id)
    expect(await listKnowledgeItemTags('item-1')).toHaveLength(1)
  })

  it('filters browser fallback items by attached tag id and category', async () => {
    await createKnowledgeItem({
      id: 'item-1', source_id: null, book_id: null, library_type: 'external', canonical_level: 'inspiration',
      item_type: 'quote', content: '雨夜素材', quote_policy: 'paraphrase_recommended', status: 'confirmed', metadata_json: '{}', notes: '',
    })
    await createKnowledgeItem({
      id: 'item-2', source_id: null, book_id: null, library_type: 'external', canonical_level: 'inspiration',
      item_type: 'quote', content: '战斗素材', quote_policy: 'paraphrase_recommended', status: 'confirmed', metadata_json: '{}', notes: '',
    })
    const tag = await createKnowledgeTag({ id: 'tag-1', category: 'scene', name: '雨夜', color: '#3b82f6' })
    await attachKnowledgeTagToItem('item-1', tag.id)

    expect((await listKnowledgeItems({ tagId: 'tag-1' })).map((item) => item.id)).toEqual(['item-1'])
    expect((await listKnowledgeItems({ tagCategory: 'scene' })).map((item) => item.id)).toEqual(['item-1'])
  })
})
