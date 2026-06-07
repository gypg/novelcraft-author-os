export type KnowledgeSourceType = 'public_domain' | 'user_original' | 'copyrighted' | 'unknown'
export type KnowledgeLibraryType = 'external' | 'project' | 'author'
export type CanonicalLevel = 'canonical' | 'reference' | 'inspiration'

export type KnowledgeItemType =
  | 'quote'
  | 'note'
  | 'character'
  | 'location'
  | 'object'
  | 'hook'
  | 'summary'
  | 'idea'
  | 'technique'
  | 'analysis'

export type KnowledgeQuotePolicy =
  | 'direct_allowed'
  | 'paraphrase_recommended'
  | 'direct_forbidden'
  | 'not_applicable'

export type KnowledgeStatus = 'proposal' | 'pending' | 'confirmed' | 'archived'
export type KnowledgeTagCategory = 'usage' | 'scene' | 'emotion' | 'genre' | 'technique' | 'position' | 'custom'
export type KnowledgeRelationType = 'references' | 'inspires' | 'contradicts' | 'supports' | 'same_scene' | 'same_character'
export type KnowledgeSuggestionType = 'direct_quote' | 'paraphrase' | 'reminder' | 'style_hint'
export type KnowledgeSuggestionStatus = 'shown' | 'inserted' | 'dismissed' | 'blocked'
export type KnowledgeSuggestedAction = 'insert_direct' | 'paraphrase' | 'show_reminder' | 'open_detail' | 'block'

export interface KnowledgeSourceRow {
  id: string
  title: string
  author: string
  source_type: KnowledgeSourceType
  publication_year: number | null
  notes: string
  created_at: number
  updated_at: number
}

export interface KnowledgeItemRow {
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
  created_at: number
  updated_at: number
}

export interface KnowledgeTagRow {
  id: string
  category: KnowledgeTagCategory
  name: string
  color: string
  created_at: number
  updated_at: number
}

export interface KnowledgeLinkRow {
  id: string
  from_item_id: string
  to_item_id: string
  relation_type: KnowledgeRelationType
  notes: string
  created_at: number
  updated_at: number
}

export interface KnowledgeSuggestionRow {
  id: string
  book_id: string
  chapter_id: string | null
  item_id: string | null
  suggestion_type: KnowledgeSuggestionType
  reason: string
  priority_level: 1 | 2 | 3
  status: KnowledgeSuggestionStatus
  quote_policy: KnowledgeQuotePolicy
  suggested_action: KnowledgeSuggestedAction
  score: number
  score_breakdown_json: string
  conflict_flags_json: string
  trace_json: string
  created_at: number
}
