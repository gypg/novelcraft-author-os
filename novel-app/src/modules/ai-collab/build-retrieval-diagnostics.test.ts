import { describe, it, expect } from 'vitest'
import { buildRetrievalDiagnosticDTO, buildRetrievalDiagnostics } from './build-retrieval-diagnostics'
import type { RetrievedKnowledgeItem } from '@/core/knowledge-base/knowledge-retrieval'
import type { KnowledgeItemRow } from '@/core/knowledge-base/types'

describe('build-retrieval-diagnostics', () => {
  it('should build diagnostic DTO from explicit knowledge item', () => {
    const item: KnowledgeItemRow = {
      id: 'k1',
      source_id: null,
      book_id: 'book1',
      item_type: 'note',
      library_type: 'project',
      canonical_level: 'canonical',
      quote_policy: 'direct_allowed',
      content: 'Full content here',
      metadata_json: '{}',
      notes: '',
      status: 'confirmed',
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    const retrieved: RetrievedKnowledgeItem = {
      item,
      score: 0.95,
      scoreBreakdown: {
        bm25: 0.9,
        libraryWeight: 3,
        canonicalWeight: 1.5,
        quotePolicyWeight: 1.0,
        recencyWeight: 1.0,
        final: 0.95,
      },
    }

    const dto = buildRetrievalDiagnosticDTO(retrieved)

    expect(dto.id).toBe('k1')
    expect(dto.itemType).toBe('note')
    expect(dto.libraryType).toBe('project')
    expect(dto.canonicalLevel).toBe('canonical')
    expect(dto.quotePolicy).toBe('direct_allowed')
    expect(dto.redactionState).toBe('explicit')
    expect(dto.displayTitle).toBe('Full content here')
    expect(dto.displaySummary).toBe('')
    expect(dto.displayKeywords).toEqual([])
    expect(dto.score).toBe(0.95)
    expect(dto.scoreBreakdown).toEqual(retrieved.scoreBreakdown)
  })

  it('should build diagnostic DTO with supplemental canonical level', () => {
    const item: KnowledgeItemRow = {
      id: 'k2',
      source_id: null,
      book_id: 'book1',
      item_type: 'note',
      library_type: 'project',
      canonical_level: 'reference',
      quote_policy: 'paraphrase_recommended',
      content: 'Reference content',
      metadata_json: '{}',
      notes: '',
      status: 'confirmed',
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    const retrieved: RetrievedKnowledgeItem = {
      item,
      score: 0.7,
      scoreBreakdown: {
        bm25: 0.6,
        libraryWeight: 1,
        canonicalWeight: 1.0,
        quotePolicyWeight: 0.8,
        recencyWeight: 1.0,
        final: 0.7,
      },
    }

    const dto = buildRetrievalDiagnosticDTO(retrieved)

    expect(dto.canonicalLevel).toBe('reference')
  })

  it('should build diagnostic DTO with redacted-summary state for direct-forbidden', () => {
    const item: KnowledgeItemRow = {
      id: 'k3',
      source_id: 'src1',
      book_id: 'book1',
      item_type: 'quote',
      library_type: 'external',
      canonical_level: 'canonical',
      quote_policy: 'direct_forbidden',
      content: 'Raw copyrighted content not safe',
      metadata_json: '{"summary":"Safe summary","keywords":["kw1","kw2"]}',
      notes: '',
      status: 'confirmed',
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    const retrieved: RetrievedKnowledgeItem = {
      item,
      score: 0.8,
      scoreBreakdown: {
        bm25: 0.7,
        libraryWeight: 0.3,
        canonicalWeight: 1.5,
        quotePolicyWeight: 0.5,
        recencyWeight: 1.0,
        final: 0.8,
      },
    }

    const dto = buildRetrievalDiagnosticDTO(retrieved)

    expect(dto.redactionState).toBe('redacted-summary')
    expect(dto.displaySummary).toBe('Safe summary')
    expect(dto.displayKeywords).toEqual(['kw1', 'kw2'])
    expect(dto.displayTitle).toBe('Safe summary')
  })

  it('should build array of diagnostic DTOs from multiple retrieved items', () => {
    const items: RetrievedKnowledgeItem[] = [
      {
        item: {
          id: 'k1',
          source_id: null,
          book_id: 'book1',
          item_type: 'note',
          library_type: 'project',
          canonical_level: 'canonical',
          quote_policy: 'direct_allowed',
          content: 'Content 1',
          metadata_json: '{}',
          notes: '',
          status: 'confirmed',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        score: 0.9,
        scoreBreakdown: {
          bm25: 0.85,
          libraryWeight: 3,
          canonicalWeight: 1.5,
          quotePolicyWeight: 1.0,
          recencyWeight: 1.0,
          final: 0.9,
        },
      },
      {
        item: {
          id: 'k2',
          source_id: null,
          book_id: 'book1',
          item_type: 'note',
          library_type: 'project',
          canonical_level: 'reference',
          quote_policy: 'paraphrase_recommended',
          content: 'Content 2',
          metadata_json: '{}',
          notes: '',
          status: 'confirmed',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        score: 0.75,
        scoreBreakdown: {
          bm25: 0.7,
          libraryWeight: 1,
          canonicalWeight: 1.0,
          quotePolicyWeight: 0.8,
          recencyWeight: 1.0,
          final: 0.75,
        },
      },
    ]

    const dtos = buildRetrievalDiagnostics(items)

    expect(dtos).toHaveLength(2)
    expect(dtos[0].id).toBe('k1')
    expect(dtos[0].score).toBe(0.9)
    expect(dtos[1].id).toBe('k2')
    expect(dtos[1].score).toBe(0.75)
  })

  it('should handle missing metadata canonical field as supplemental', () => {
    const item: KnowledgeItemRow = {
      id: 'k4',
      source_id: null,
      book_id: 'book1',
      item_type: 'note',
      library_type: 'project',
      canonical_level: 'inspiration',
      quote_policy: 'direct_allowed',
      content: 'Note without explicit canonical metadata',
      metadata_json: '{}',
      notes: '',
      status: 'confirmed',
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    const retrieved: RetrievedKnowledgeItem = {
      item,
      score: 0.6,
      scoreBreakdown: {
        bm25: 0.5,
        libraryWeight: 3,
        canonicalWeight: 1.0,
        quotePolicyWeight: 1.0,
        recencyWeight: 1.0,
        final: 0.6,
      },
    }

    const dto = buildRetrievalDiagnosticDTO(retrieved)

    expect(dto.canonicalLevel).toBe('inspiration')
  })
})
