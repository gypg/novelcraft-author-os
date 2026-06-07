import { deriveQuotePolicyForSource } from './quote-policy'
import type { CreateKnowledgeItemInput } from '@/core/db/knowledge-base-repository'
import type { KnowledgeItemRow, KnowledgeSourceType } from './types'

export type ImportCandidate = Pick<
  KnowledgeItemRow,
  'source_id' | 'book_id' | 'content' | 'quote_policy' | 'status' | 'library_type' | 'canonical_level' | 'item_type' | 'metadata_json' | 'notes'
> & {
  id: string
}

export interface BuildImportCandidatesInput {
  text: string
  sourceId: string | null
  sourceType: KnowledgeSourceType
  bookId?: string | null
  idFactory?: (index: number, content: string) => string
}

function stableHash(value: string): string {
  let h1 = 0xdeadbeef ^ value.length
  let h2 = 0x41c6ce57 ^ value.length
  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index)
    h1 = Math.imul(h1 ^ char, 2654435761)
    h2 = Math.imul(h2 ^ char, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function createCandidateId(
  index: number,
  content: string,
  input: BuildImportCandidatesInput,
): string {
  if (input.idFactory) return input.idFactory(index, content)
  const key = [input.sourceId ?? '', input.sourceType, input.bookId ?? '', index.toString(), content].join('::')
  return `candidate-${stableHash(key)}`
}

export function buildImportCandidates(input: BuildImportCandidatesInput): ImportCandidate[] {
  return input.text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((content, index) => ({
      id: createCandidateId(index, content, input),
      source_id: input.sourceId,
      book_id: input.bookId ?? null,
      library_type: 'external',
      canonical_level: 'inspiration',
      item_type: 'quote',
      content,
      quote_policy: deriveQuotePolicyForSource(input.sourceType),
      status: 'proposal',
      metadata_json: '{}',
      notes: '',
    }))
}

export function stageImportCandidate(candidate: ImportCandidate): ImportCandidate {
  return { ...candidate, status: 'pending' }
}

export function confirmPendingImportCandidate(candidate: ImportCandidate): ImportCandidate {
  if (candidate.status !== 'pending') {
    throw new Error('Only pending import candidates can be confirmed')
  }
  return { ...candidate, status: 'confirmed' }
}

export function rejectImportCandidate(candidate: ImportCandidate): ImportCandidate {
  return { ...candidate, status: 'archived' }
}

export function toCreateKnowledgeItemInput(candidate: ImportCandidate): CreateKnowledgeItemInput {
  return {
    id: candidate.id,
    source_id: candidate.source_id,
    book_id: candidate.book_id,
    library_type: candidate.library_type,
    canonical_level: candidate.canonical_level,
    item_type: candidate.item_type,
    content: candidate.content,
    quote_policy: candidate.quote_policy,
    status: candidate.status,
    metadata_json: candidate.metadata_json,
    notes: candidate.notes,
  }
}
