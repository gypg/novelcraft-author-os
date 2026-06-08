import { describe, expect, it, beforeEach } from 'vitest'
import { __resetKnowledgeRepositoryForTests, listKnowledgeItems } from '@/core/db/knowledge-base-repository'
import { createAuthorMemory, listAuthorMemories, parseAuthorMemoryMetadata } from './author-memory-repository'

describe('author memory repository', () => {
  beforeEach(() => __resetKnowledgeRepositoryForTests())

  it('stores author memories as confirmed author knowledge items', async () => {
    const memory = await createAuthorMemory({
      id: 'memory-1',
      content: '偏好雨夜开场，但避免直接解释人物情绪。',
      type: 'style',
      source: 'user_feedback',
      weight: 2,
      authorProfileId: 'profile-1',
    })

    expect(memory.library_type).toBe('author')
    expect(memory.canonical_level).toBe('reference')
    expect(memory.status).toBe('confirmed')
    expect(memory.quote_policy).toBe('not_applicable')
    expect(parseAuthorMemoryMetadata(memory)).toEqual({
      type: 'style',
      source: 'user_feedback',
      weight: 2,
      authorProfileId: 'profile-1',
    })
  })

  it('lists only confirmed author memory rows', async () => {
    await createAuthorMemory({ id: 'memory-1', content: '作者偏好短句。', type: 'preference' })
    await listKnowledgeItems({ includeArchived: true })

    const memories = await listAuthorMemories()

    expect(memories.map((memory) => memory.id)).toEqual(['memory-1'])
  })

  it('clamps out-of-range memory weight', async () => {
    const memory = await createAuthorMemory({ id: 'memory-1', content: '高权重记忆。', type: 'constraint', weight: 99 })
    expect(parseAuthorMemoryMetadata(memory).weight).toBe(3)
  })

  it('defaults malformed metadata to allowlisted values', () => {
    const metadata = parseAuthorMemoryMetadata({
      id: 'bad-memory',
      source_id: null,
      book_id: null,
      library_type: 'author',
      canonical_level: 'reference',
      item_type: 'note',
      content: 'bad metadata',
      quote_policy: 'not_applicable',
      status: 'confirmed',
      metadata_json: '{"type":"ignore_prior_rules","source":"system","weight":"999"}',
      notes: '',
      created_at: 1,
      updated_at: 1,
    })

    expect(metadata).toEqual({ type: 'preference', source: 'manual', weight: 1, authorProfileId: null })
  })
})
