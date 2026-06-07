import { isTauri } from '@/shared/utils/tauri-env'
import { filterKnowledgeItems, type KnowledgeFilterInput } from '@/core/knowledge-base/knowledge-filter'
import type {
  CanonicalLevel,
  KnowledgeItemRow,
  KnowledgeItemType,
  KnowledgeLibraryType,
  KnowledgeQuotePolicy,
  KnowledgeSourceRow,
  KnowledgeSourceType,
  KnowledgeStatus,
  KnowledgeTagCategory,
  KnowledgeTagRow,
} from '@/core/knowledge-base/types'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export interface CreateKnowledgeSourceInput {
  id: string
  title: string
  author?: string
  source_type: KnowledgeSourceType
  publication_year?: number | null
  notes?: string
}

export interface UpdateKnowledgeSourceInput {
  title?: string
  author?: string
  source_type?: KnowledgeSourceType
  publication_year?: number | null
  notes?: string
}

export interface CreateKnowledgeItemInput {
  id: string
  source_id: string | null
  book_id: string | null
  library_type: KnowledgeLibraryType
  canonical_level: CanonicalLevel
  item_type: KnowledgeItemType
  content: string
  quote_policy: KnowledgeQuotePolicy
  status: KnowledgeStatus
  metadata_json: string
  notes: string
}

export interface UpdateKnowledgeItemInput {
  source_id?: string | null
  book_id?: string | null
  library_type?: KnowledgeLibraryType
  canonical_level?: CanonicalLevel
  item_type?: KnowledgeItemType
  content?: string
  quote_policy?: KnowledgeQuotePolicy
  status?: KnowledgeStatus
  metadata_json?: string
  notes?: string
}

export interface CreateKnowledgeTagInput {
  id: string
  category: KnowledgeTagCategory
  name: string
  color?: string
}

export interface UpdateKnowledgeTagInput {
  category?: KnowledgeTagCategory
  name?: string
  color?: string
}

export interface KnowledgeTagFilterInput {
  category?: KnowledgeTagCategory
  keyword?: string
}

let mockSources: KnowledgeSourceRow[] = []
let mockItems: KnowledgeItemRow[] = []
let mockTags: KnowledgeTagRow[] = []
let mockItemTags: Array<{ itemId: string; tagId: string }> = []

function now(): number {
  return Date.now()
}

function cloneSource(source: KnowledgeSourceRow): KnowledgeSourceRow {
  return { ...source }
}

function cloneItem(item: KnowledgeItemRow): KnowledgeItemRow {
  return { ...item }
}

function cloneTag(tag: KnowledgeTagRow): KnowledgeTagRow {
  return { ...tag }
}

function definedEntries<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>
}

function toSourceUpdateInvokeInput(input: UpdateKnowledgeSourceInput) {
  return {
    title: input.title,
    author: input.author,
    sourceType: input.source_type,
    publicationYear: input.publication_year,
    notes: input.notes,
  }
}

function toItemUpdateInvokeInput(input: UpdateKnowledgeItemInput) {
  return {
    sourceId: input.source_id,
    bookId: input.book_id,
    libraryType: input.library_type,
    canonicalLevel: input.canonical_level,
    itemType: input.item_type,
    content: input.content,
    quotePolicy: input.quote_policy,
    status: input.status,
    metadataJson: input.metadata_json,
    notes: input.notes,
  }
}

function buildItemTagMap(): Map<string, KnowledgeTagRow[]> {
  return mockItemTags.reduce((map, link) => {
    const tag = mockTags.find((candidate) => candidate.id === link.tagId)
    if (!tag) return map
    const tags = map.get(link.itemId) ?? []
    return new Map(map).set(link.itemId, [...tags, tag])
  }, new Map<string, KnowledgeTagRow[]>())
}

export function __resetKnowledgeRepositoryForTests(): void {
  mockSources = []
  mockItems = []
  mockTags = []
  mockItemTags = []
}

export async function createKnowledgeSource(input: CreateKnowledgeSourceInput): Promise<KnowledgeSourceRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeSourceRow>('create_knowledge_source', { input })

  const timestamp = now()
  const source: KnowledgeSourceRow = {
    id: input.id,
    title: input.title,
    author: input.author ?? '',
    source_type: input.source_type,
    publication_year: input.publication_year ?? null,
    notes: input.notes ?? '',
    created_at: timestamp,
    updated_at: timestamp,
  }
  mockSources = [...mockSources, source]
  return cloneSource(source)
}

export async function listKnowledgeSources(): Promise<KnowledgeSourceRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeSourceRow[]>('list_knowledge_sources')
  return mockSources.map(cloneSource)
}

export async function updateKnowledgeSource(id: string, input: UpdateKnowledgeSourceInput): Promise<KnowledgeSourceRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeSourceRow>('update_knowledge_source', { id, input: toSourceUpdateInvokeInput(input) })

  const index = mockSources.findIndex((source) => source.id === id)
  if (index === -1) throw new Error('Knowledge source not found')
  const updated = {
    ...mockSources[index],
    ...definedEntries(input),
    updated_at: now(),
  }
  mockSources = mockSources.map((source) => source.id === id ? updated : source)
  return cloneSource(updated)
}

export async function deleteKnowledgeSource(id: string): Promise<void> {
  const inv = await getInvoke()
  if (inv) return inv<void>('delete_knowledge_source', { id })

  mockSources = mockSources.filter((source) => source.id !== id)
  mockItems = mockItems.map((item) => item.source_id === id ? { ...item, source_id: null, updated_at: now() } : item)
}

export async function createKnowledgeItem(input: CreateKnowledgeItemInput): Promise<KnowledgeItemRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow>('create_knowledge_item', { input })

  const timestamp = now()
  const existing = mockItems.find((item) => item.id === input.id)
  if (existing) {
    if (existing.content !== input.content) throw new Error('Knowledge item id already exists with different content')
    return cloneItem(existing)
  }
  const item: KnowledgeItemRow = {
    ...input,
    created_at: timestamp,
    updated_at: timestamp,
  }
  mockItems = [...mockItems, item]
  return cloneItem(item)
}

export async function listKnowledgeItems(filter: KnowledgeFilterInput = {}): Promise<KnowledgeItemRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow[]>('list_knowledge_items', { filter })
  return filterKnowledgeItems(mockItems, filter, buildItemTagMap())
}

export async function updateKnowledgeItem(id: string, input: UpdateKnowledgeItemInput): Promise<KnowledgeItemRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow>('update_knowledge_item', { id, input: toItemUpdateInvokeInput(input) })

  const index = mockItems.findIndex((item) => item.id === id)
  if (index === -1) throw new Error('Knowledge item not found')
  const updated = {
    ...mockItems[index],
    ...definedEntries(input),
    updated_at: now(),
  }
  mockItems = mockItems.map((item) => item.id === id ? updated : item)
  return cloneItem(updated)
}

export async function createKnowledgeTag(input: CreateKnowledgeTagInput): Promise<KnowledgeTagRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeTagRow>('create_knowledge_tag', { input })

  const timestamp = now()
  const tag: KnowledgeTagRow = {
    id: input.id,
    category: input.category,
    name: input.name,
    color: input.color ?? '',
    created_at: timestamp,
    updated_at: timestamp,
  }
  mockTags = [...mockTags, tag]
  return cloneTag(tag)
}

export async function listKnowledgeTags(filter: KnowledgeTagFilterInput = {}): Promise<KnowledgeTagRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeTagRow[]>('list_knowledge_tags', { filter })

  const keyword = filter.keyword?.trim().toLowerCase()
  return mockTags
    .filter((tag) => !filter.category || tag.category === filter.category)
    .filter((tag) => !keyword || tag.name.toLowerCase().includes(keyword))
    .map(cloneTag)
}

export async function updateKnowledgeTag(id: string, input: UpdateKnowledgeTagInput): Promise<KnowledgeTagRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeTagRow>('update_knowledge_tag', { id, input })

  const index = mockTags.findIndex((tag) => tag.id === id)
  if (index === -1) throw new Error('Knowledge tag not found')
  const updated = {
    ...mockTags[index],
    ...definedEntries(input),
    updated_at: now(),
  }
  mockTags = mockTags.map((tag) => tag.id === id ? updated : tag)
  return cloneTag(updated)
}

export async function deleteKnowledgeTag(id: string): Promise<void> {
  const inv = await getInvoke()
  if (inv) return inv<void>('delete_knowledge_tag', { id })

  mockTags = mockTags.filter((tag) => tag.id !== id)
  mockItemTags = mockItemTags.filter((link) => link.tagId !== id)
}

export async function attachKnowledgeTagToItem(itemId: string, tagId: string): Promise<void> {
  const inv = await getInvoke()
  if (inv) return inv<void>('attach_knowledge_tag_to_item', { itemId, tagId })

  const exists = mockItemTags.some((link) => link.itemId === itemId && link.tagId === tagId)
  if (!exists) mockItemTags = [...mockItemTags, { itemId, tagId }]
}

export async function detachKnowledgeTagFromItem(itemId: string, tagId: string): Promise<void> {
  const inv = await getInvoke()
  if (inv) return inv<void>('detach_knowledge_tag_from_item', { itemId, tagId })

  mockItemTags = mockItemTags.filter((link) => link.itemId !== itemId || link.tagId !== tagId)
}

export async function listKnowledgeItemTags(itemId: string): Promise<KnowledgeTagRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeTagRow[]>('list_knowledge_item_tags', { itemId })

  const tagIds = new Set(mockItemTags.filter((link) => link.itemId === itemId).map((link) => link.tagId))
  return mockTags.filter((tag) => tagIds.has(tag.id)).map(cloneTag)
}
