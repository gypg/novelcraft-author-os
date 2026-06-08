import type { KnowledgeItemRow } from './types'

export const KNOWLEDGE_SUMMARY_MAX_LENGTH = 240
export const KNOWLEDGE_KEYWORD_MAX_COUNT = 5
export const KNOWLEDGE_KEYWORD_MAX_LENGTH = 40

export type KnowledgeRedactionState = 'not_redacted' | 'redacted'

export interface SafeKnowledgePreview {
  id: string
  libraryType: KnowledgeItemRow['library_type']
  canonicalLevel: KnowledgeItemRow['canonical_level']
  itemType: KnowledgeItemRow['item_type']
  quotePolicy: KnowledgeItemRow['quote_policy']
  redactionState: KnowledgeRedactionState
  content?: string
  contentRedacted?: true
  use?: string
  summary?: string
  keywords?: string[]
}

const DIRECT_FORBIDDEN_USE = '仅可作为抽象灵感，不得复述、仿写或直接引用原文。'
const SUMMARY_UNAVAILABLE = 'summary unavailable'

function parseKnowledgeMetadata(metadataJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(metadataJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
    .trim()
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

export function sanitizeKnowledgeSummary(summary: unknown): string {
  if (typeof summary !== 'string') return ''
  return truncate(stripControlCharacters(summary), KNOWLEDGE_SUMMARY_MAX_LENGTH)
}

export function sanitizeKnowledgeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) return []
  return keywords
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => truncate(stripControlCharacters(keyword), KNOWLEDGE_KEYWORD_MAX_LENGTH))
    .filter((keyword) => keyword.length > 0)
    .slice(0, KNOWLEDGE_KEYWORD_MAX_COUNT)
}

function isDirectForbiddenExternal(item: KnowledgeItemRow): boolean {
  return item.library_type === 'external' && item.quote_policy === 'direct_forbidden'
}

function safeDerivedMetadata(item: KnowledgeItemRow): { summary: string; keywords: string[] } {
  const metadata = parseKnowledgeMetadata(item.metadata_json)
  return {
    summary: sanitizeKnowledgeSummary(metadata.summary),
    keywords: sanitizeKnowledgeKeywords(metadata.keywords),
  }
}

export function buildKnowledgeRetrievalText(item: KnowledgeItemRow): string {
  if (!isDirectForbiddenExternal(item)) return [item.content, item.notes, item.metadata_json].join('\n')
  const { summary, keywords } = safeDerivedMetadata(item)
  return [summary, ...keywords].filter(Boolean).join('\n')
}

export function buildSafeKnowledgePreview(item: KnowledgeItemRow): SafeKnowledgePreview {
  const base = {
    id: item.id,
    libraryType: item.library_type,
    canonicalLevel: item.canonical_level,
    itemType: item.item_type,
    quotePolicy: item.quote_policy,
  }

  if (!isDirectForbiddenExternal(item)) {
    return {
      ...base,
      redactionState: 'not_redacted',
      content: item.content,
    }
  }

  const { summary, keywords } = safeDerivedMetadata(item)
  return {
    ...base,
    redactionState: 'redacted',
    contentRedacted: true,
    use: DIRECT_FORBIDDEN_USE,
    summary: summary || SUMMARY_UNAVAILABLE,
    keywords,
  }
}
