import { createKnowledgeItem, listKnowledgeItems } from '@/core/db/knowledge-base-repository'
import type { KnowledgeItemRow } from '@/core/knowledge-base/types'
import type { AuthorMemoryMetadata, AuthorMemoryRow, CreateAuthorMemoryInput } from './author-memory-types'

const DEFAULT_MEMORY_WEIGHT = 1
const AUTHOR_MEMORY_TYPES = new Set<AuthorMemoryMetadata['type']>(['preference', 'style', 'feedback', 'constraint', 'technique'])
const AUTHOR_MEMORY_SOURCES = new Set<AuthorMemoryMetadata['source']>(['manual', 'ai_observed', 'user_feedback'])

function clampWeight(weight: number | undefined): number {
  if (weight === undefined || !Number.isFinite(weight)) return DEFAULT_MEMORY_WEIGHT
  return Math.min(3, Math.max(0.1, weight))
}

function normalizeMemoryType(type: unknown): AuthorMemoryMetadata['type'] {
  return typeof type === 'string' && AUTHOR_MEMORY_TYPES.has(type as AuthorMemoryMetadata['type']) ? type as AuthorMemoryMetadata['type'] : 'preference'
}

function normalizeMemorySource(source: unknown): AuthorMemoryMetadata['source'] {
  return typeof source === 'string' && AUTHOR_MEMORY_SOURCES.has(source as AuthorMemoryMetadata['source']) ? source as AuthorMemoryMetadata['source'] : 'manual'
}

function buildMetadata(input: CreateAuthorMemoryInput): AuthorMemoryMetadata {
  return {
    type: input.type,
    source: input.source ?? 'manual',
    weight: clampWeight(input.weight),
    authorProfileId: input.authorProfileId ?? null,
  }
}

function isAuthorMemory(item: KnowledgeItemRow): item is AuthorMemoryRow {
  return item.library_type === 'author' && item.canonical_level === 'reference' && item.status === 'confirmed'
}

export async function createAuthorMemory(input: CreateAuthorMemoryInput): Promise<AuthorMemoryRow> {
  const created = await createKnowledgeItem({
    id: input.id,
    source_id: null,
    book_id: null,
    library_type: 'author',
    canonical_level: 'reference',
    item_type: input.itemType ?? 'note',
    content: input.content,
    quote_policy: 'not_applicable',
    status: 'confirmed',
    metadata_json: JSON.stringify(buildMetadata(input)),
    notes: input.notes ?? '',
  })

  if (!isAuthorMemory(created)) throw new Error('Created item is not an author memory')
  return created
}

export async function listAuthorMemories(): Promise<AuthorMemoryRow[]> {
  const items = await listKnowledgeItems({ libraryType: 'author', status: 'confirmed', includeArchived: false })
  return items.filter(isAuthorMemory)
}

export function parseAuthorMemoryMetadata(item: KnowledgeItemRow): AuthorMemoryMetadata {
  try {
    const parsed = JSON.parse(item.metadata_json) as Partial<AuthorMemoryMetadata>
    return {
      type: normalizeMemoryType(parsed.type),
      source: normalizeMemorySource(parsed.source),
      weight: clampWeight(typeof parsed.weight === 'number' ? parsed.weight : undefined),
      authorProfileId: parsed.authorProfileId ?? null,
    }
  } catch {
    return { type: 'preference', source: 'manual', weight: DEFAULT_MEMORY_WEIGHT, authorProfileId: null }
  }
}
