import type { KnowledgeItemRow, KnowledgeItemType } from '@/core/knowledge-base/types'

export type AuthorMemoryType = 'preference' | 'style' | 'feedback' | 'constraint' | 'technique'
export type AuthorMemorySource = 'manual' | 'ai_observed' | 'user_feedback'

export interface AuthorMemoryMetadata {
  type: AuthorMemoryType
  source: AuthorMemorySource
  weight: number
  authorProfileId?: string | null
}

export interface AuthorMemoryRow extends KnowledgeItemRow {
  library_type: 'author'
  canonical_level: 'reference'
  status: 'confirmed'
}

export interface CreateAuthorMemoryInput {
  id: string
  content: string
  type: AuthorMemoryType
  source?: AuthorMemorySource
  weight?: number
  authorProfileId?: string | null
  itemType?: KnowledgeItemType
  notes?: string
}

export interface AuthorMemoryPromptItem {
  id: string
  content: string
  type: AuthorMemoryType
  source: AuthorMemorySource
  weight: number
}
