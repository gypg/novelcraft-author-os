import type { RetrievedKnowledgeItem } from '@/core/knowledge-base/knowledge-retrieval'
import { buildSafeKnowledgePreview } from '@/core/knowledge-base/knowledge-redaction'
import type { RetrievalDiagnosticDTO, RedactionState } from './context-diagnostics-store'

/**
 * Build retrieval diagnostic DTO from retrieved knowledge item
 * Maps core retrieval result to safe, display-ready diagnostic DTO
 */
export function buildRetrievalDiagnosticDTO(
  retrieved: RetrievedKnowledgeItem
): RetrievalDiagnosticDTO {
  const { item, score, scoreBreakdown } = retrieved
  const safePreview = buildSafeKnowledgePreview(item)

  // Use canonical level directly from item schema
  const canonicalLevel = item.canonical_level

  // Map safe preview redaction state to diagnostic redaction state
  const redactionState: RedactionState =
    safePreview.redactionState === 'redacted' ? 'redacted-summary' : 'explicit'

  // Extract display-safe summary and keywords
  const displaySummary = safePreview.summary || ''
  const displayKeywords = safePreview.keywords || []

  // Use content as title for non-redacted items, truncate for display
  const displayTitle = safePreview.content
    ? safePreview.content.slice(0, 100)
    : displaySummary.slice(0, 100) || `[${item.item_type}]`

  return {
    id: item.id,
    itemType: item.item_type,
    libraryType: item.library_type,
    canonicalLevel,
    quotePolicy: item.quote_policy,
    redactionState,
    displayTitle,
    displaySummary,
    displayKeywords,
    score,
    scoreBreakdown,
  }
}

/**
 * Build array of retrieval diagnostic DTOs from retrieved knowledge items
 */
export function buildRetrievalDiagnostics(
  retrievedItems: RetrievedKnowledgeItem[]
): RetrievalDiagnosticDTO[] {
  return retrievedItems.map(buildRetrievalDiagnosticDTO)
}
