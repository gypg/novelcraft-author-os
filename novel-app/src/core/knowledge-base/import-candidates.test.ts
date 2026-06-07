import { describe, expect, it } from 'vitest'
import {
  buildImportCandidates,
  confirmPendingImportCandidate,
  rejectImportCandidate,
  stageImportCandidate,
  toCreateKnowledgeItemInput,
} from './import-candidates'

describe('knowledge import candidates', () => {
  it('splits pasted text into trimmed non-empty proposal candidates', () => {
    const candidates = buildImportCandidates({
      text: '  雨声压低了街巷。\n\n\n  风从窗缝里钻进来。 ',
      sourceId: 'source-1',
      sourceType: 'unknown',
      bookId: 'book-1',
      idFactory: (index) => `candidate-${index + 1}`,
    })

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      content: '雨声压低了街巷。',
      source_id: 'source-1',
      book_id: 'book-1',
      status: 'proposal',
      quote_policy: 'paraphrase_recommended',
    })
    expect(candidates[1].content).toBe('风从窗缝里钻进来。')
  })

  it('stages then confirms a candidate without mutating earlier states', () => {
    const [candidate] = buildImportCandidates({
      text: '这是用户原创素材。',
      sourceId: 'source-2',
      sourceType: 'user_original',
      bookId: 'book-1',
      idFactory: () => 'candidate-original',
    })
    Object.freeze(candidate)

    const staged = stageImportCandidate(candidate)
    const confirmed = confirmPendingImportCandidate(staged)
    const createInput = toCreateKnowledgeItemInput(confirmed)

    expect(candidate.status).toBe('proposal')
    expect(staged.status).toBe('pending')
    expect(confirmed.status).toBe('confirmed')
    expect(createInput.book_id).toBe('book-1')
    expect(confirmed).not.toBe(candidate)
  })

  it('rejects a candidate immutably into archived status', () => {
    const [candidate] = buildImportCandidates({
      text: '这条不需要。',
      sourceId: null,
      sourceType: 'unknown',
      bookId: null,
      idFactory: () => 'candidate-rejected',
    })

    const rejected = rejectImportCandidate(candidate)

    expect(rejected.status).toBe('archived')
    expect(candidate.status).toBe('proposal')
  })

  it('uses stable ids by default so repeated imports are idempotent', () => {
    const first = buildImportCandidates({ text: '重复素材', sourceId: null, sourceType: 'unknown' })
    const second = buildImportCandidates({ text: '重复素材', sourceId: null, sourceType: 'unknown' })

    expect(first[0].id).toBe(second[0].id)
  })
})
