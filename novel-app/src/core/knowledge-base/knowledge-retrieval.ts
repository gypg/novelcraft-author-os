import type { KnowledgeItemRow, KnowledgeLibraryType, KnowledgeQuotePolicy } from './types'

export interface KnowledgeRetrievalQuery {
  bookId: string
  query: string
  maxResults?: number
  maxCandidates?: number
}

export interface KnowledgeScoreBreakdown {
  bm25: number
  libraryWeight: number
  canonicalWeight: number
  quotePolicyWeight: number
  recencyWeight: number
  final: number
}

export interface RetrievedKnowledgeItem {
  item: KnowledgeItemRow
  score: number
  scoreBreakdown: KnowledgeScoreBreakdown
}

const K1 = 1.5
const B = 0.75

const LIBRARY_WEIGHTS: Record<KnowledgeLibraryType, number> = {
  project: 3,
  author: 2,
  external: 1,
}

const CANONICAL_WEIGHTS = {
  canonical: 3,
  reference: 2,
  inspiration: 1,
} as const

const QUOTE_POLICY_WEIGHTS: Record<KnowledgeQuotePolicy, number> = {
  not_applicable: 1,
  direct_allowed: 0.9,
  paraphrase_recommended: 0.7,
  direct_forbidden: 0.35,
}

function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const ch of text) {
    if (ch >= '一' && ch <= '鿿') {
      tokens.push(ch)
    } else if (/\w/.test(ch)) {
      tokens.push(ch.toLowerCase())
    }
  }
  return tokens
}

function computeIDF(documents: string[][]): Map<string, number> {
  const docFreq = new Map<string, number>()
  const totalDocuments = documents.length

  for (const doc of documents) {
    for (const token of new Set(doc)) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((totalDocuments - freq + 0.5) / (freq + 0.5) + 1))
  }
  return idf
}

function bm25(queryTokens: string[], docTokens: string[], avgDocLength: number, idf: Map<string, number>): number {
  const termFreq = new Map<string, number>()
  for (const token of docTokens) {
    termFreq.set(token, (termFreq.get(token) ?? 0) + 1)
  }

  return queryTokens.reduce((score, token) => {
    const tf = termFreq.get(token) ?? 0
    if (tf === 0) return score
    const numerator = tf * (K1 + 1)
    const denominator = tf + K1 * (1 - B + B * (docTokens.length / avgDocLength))
    return score + ((idf.get(token) ?? 0) * numerator) / denominator
  }, 0)
}

function canUseForBook(item: KnowledgeItemRow, bookId: string): boolean {
  if (item.status !== 'confirmed') return false
  if (item.library_type === 'project') return item.book_id === bookId
  return true
}

function recencyWeight(item: KnowledgeItemRow, newestUpdatedAt: number): number {
  if (newestUpdatedAt <= 0) return 1
  const ageRatio = Math.max(0, newestUpdatedAt - item.updated_at) / newestUpdatedAt
  return Math.max(0.7, 1 - ageRatio)
}

function candidatePriority(item: KnowledgeItemRow): number {
  return LIBRARY_WEIGHTS[item.library_type] * CANONICAL_WEIGHTS[item.canonical_level]
}

function limitCandidates(candidates: KnowledgeItemRow[], maxCandidates: number): KnowledgeItemRow[] {
  if (maxCandidates <= 0) return []
  return [...candidates]
    .sort((a, b) => candidatePriority(b) - candidatePriority(a) || b.updated_at - a.updated_at || b.id.localeCompare(a.id))
    .slice(0, maxCandidates)
}

function parseMetadata(metadataJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(metadataJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function directForbiddenRetrievalText(item: KnowledgeItemRow): string {
  const metadata = parseMetadata(item.metadata_json)
  const summary = typeof metadata.summary === 'string' ? metadata.summary : ''
  const keywords = Array.isArray(metadata.keywords) ? metadata.keywords.filter((keyword) => typeof keyword === 'string').join('\n') : ''
  return [summary, keywords].filter(Boolean).join('\n')
}

function retrievalText(item: KnowledgeItemRow): string {
  if (item.library_type === 'external' && item.quote_policy === 'direct_forbidden') return directForbiddenRetrievalText(item)
  return [item.content, item.notes, item.metadata_json].join('\n')
}

export function retrieveKnowledgeItems(
  items: readonly KnowledgeItemRow[],
  query: KnowledgeRetrievalQuery,
): RetrievedKnowledgeItem[] {
  const maxResults = query.maxResults ?? 8
  const maxCandidates = query.maxCandidates ?? Math.max(maxResults * 15, maxResults)
  const queryTokens = tokenize(query.query)
  if (queryTokens.length === 0 || maxResults <= 0) return []

  const candidates = limitCandidates(items.filter((item) => canUseForBook(item, query.bookId)), maxCandidates)
  if (candidates.length === 0) return []

  const documents = candidates.map((item) => tokenize(retrievalText(item)))
  const avgDocLength = documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length || 1
  const idf = computeIDF(documents)
  const newestUpdatedAt = Math.max(...candidates.map((item) => item.updated_at), 0)

  return candidates
    .map((item, index) => {
      const bm25Score = bm25(queryTokens, documents[index], avgDocLength, idf)
      const libraryWeight = LIBRARY_WEIGHTS[item.library_type]
      const canonicalWeight = CANONICAL_WEIGHTS[item.canonical_level]
      const quotePolicyWeight = QUOTE_POLICY_WEIGHTS[item.quote_policy]
      const itemRecencyWeight = recencyWeight(item, newestUpdatedAt)
      const final = bm25Score * libraryWeight * canonicalWeight * quotePolicyWeight * itemRecencyWeight
      return {
        item,
        score: final,
        scoreBreakdown: {
          bm25: bm25Score,
          libraryWeight,
          canonicalWeight,
          quotePolicyWeight,
          recencyWeight: itemRecencyWeight,
          final,
        },
      }
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.item.updated_at - a.item.updated_at || b.item.id.localeCompare(a.item.id))
    .slice(0, maxResults)
}
