import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

const K1 = 1.5
const B = 0.75

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

  for (const doc of documents) {
    const uniqueTokens = new Set(doc)
    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((docFreq.size - freq + 0.5) / (freq + 0.5) + 1))
  }

  return idf
}

function computeBM25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLength: number,
  idf: Map<string, number>,
): number {
  let score = 0
  const docLength = docTokens.length

  const termFreq = new Map<string, number>()
  for (const token of docTokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1)
  }

  for (const qt of queryTokens) {
    const tf = termFreq.get(qt) || 0
    const idfVal = idf.get(qt) || 0
    const numerator = tf * (K1 + 1)
    const denominator = tf + K1 * (1 - B + B * (docLength / avgDocLength))
    score += idfVal * (numerator / denominator)
  }

  return score
}

export function searchFacts(
  facts: TemporalFactRow[],
  query: string,
  maxResults: number = 10,
  chapterNumber?: number,
): Array<{ fact: TemporalFactRow; score: number }> {
  if (!query.trim() || facts.length === 0) return []

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  // Build documents from facts
  const documents = facts.map((f) => tokenize(`${f.subject} ${f.predicate} ${f.object}`))
  const avgDocLength = documents.reduce((sum, d) => sum + d.length, 0) / documents.length || 1
  const idf = computeIDF(documents)

  // Score each fact
  const scored = facts.map((fact, i) => {
    let score = computeBM25Score(queryTokens, documents[i], avgDocLength, idf)

    // Distance decay: prefer facts from closer chapters
    if (chapterNumber !== undefined && fact.valid_from_chapter <= chapterNumber) {
      const distance = chapterNumber - fact.valid_from_chapter
      const decay = Math.exp(-distance * 0.05) // exponential decay
      score *= decay
    }

    // Boost valid facts (not invalidated)
    if (fact.valid_until_chapter === null || fact.valid_until_chapter === undefined) {
      score *= 1.2
    }

    return { fact, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}
