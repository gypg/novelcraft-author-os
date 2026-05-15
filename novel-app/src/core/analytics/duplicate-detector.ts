import { stripHtml } from '@/core/ai-engine/context-builder'

export interface DuplicateResult {
  type: 'paragraph' | 'title' | 'opening' | 'closing' | 'structure'
  chapterAId: string
  chapterATitle: string
  chapterBId: string
  chapterBTitle: string
  similarity: number
  textA: string
  textB: string
}

interface ChapterInput {
  id: string
  title: string
  content: string
}

function getParagraphs(html: string): string[] {
  const text = stripHtml(html)
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
}

function getFirstParagraph(html: string): string {
  const text = stripHtml(html)
  const first = text.split(/\n\s*\n/)[0]
  return first?.trim() || ''
}

function getLastParagraph(html: string): string {
  const text = stripHtml(html)
  const paragraphs = text.split(/\n\s*\n/)
  const last = paragraphs[paragraphs.length - 1]
  return last?.trim() || ''
}

function getSentenceLengths(html: string): number[] {
  const text = stripHtml(html)
  return text
    .split(/[。！？.!?\n]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim().length)
}

function cosineSimilarity(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length)
  const va = [...a, ...new Array(maxLen - a.length).fill(0)]
  const vb = [...b, ...new Array(maxLen - b.length).fill(0)]

  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < maxLen; i++) {
    dot += va[i] * vb[i]
    normA += va[i] * va[i]
    normB += vb[i] * vb[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set([...setA].filter((c) => setB.has(c)))
  const union = new Set([...setA, ...setB])
  return union.size > 0 ? intersection.size / union.size : 0
}

export function detectDuplicateParagraphs(
  chapters: ChapterInput[],
  threshold: number = 0.8,
): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (let i = 0; i < chapters.length; i++) {
    const parasA = getParagraphs(chapters[i].content)
    for (let j = i + 1; j < chapters.length; j++) {
      const parasB = getParagraphs(chapters[j].content)
      for (const pA of parasA) {
        for (const pB of parasB) {
          if (Math.abs(pA.length - pB.length) / Math.max(pA.length, pB.length) > 0.3) continue
          const sim = jaccardSimilarity(pA, pB)
          if (sim >= threshold) {
            results.push({
              type: 'paragraph',
              chapterAId: chapters[i].id,
              chapterATitle: chapters[i].title,
              chapterBId: chapters[j].id,
              chapterBTitle: chapters[j].title,
              similarity: Math.round(sim * 100) / 100,
              textA: pA.slice(0, 100),
              textB: pB.slice(0, 100),
            })
          }
        }
      }
    }
  }

  return results
}

export function detectTitleClustering(chapters: ChapterInput[]): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (let i = 0; i < chapters.length; i++) {
    for (let j = i + 1; j < chapters.length; j++) {
      const sim = jaccardSimilarity(chapters[i].title, chapters[j].title)
      if (sim >= 0.7) {
        results.push({
          type: 'title',
          chapterAId: chapters[i].id,
          chapterATitle: chapters[i].title,
          chapterBId: chapters[j].id,
          chapterBTitle: chapters[j].title,
          similarity: Math.round(sim * 100) / 100,
          textA: chapters[i].title,
          textB: chapters[j].title,
        })
      }
    }
  }

  return results
}

export function detectOpeningPattern(chapters: ChapterInput[]): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (let i = 0; i < chapters.length; i++) {
    const openingA = getFirstParagraph(chapters[i].content)
    if (!openingA) continue

    for (let j = i + 1; j < chapters.length; j++) {
      const openingB = getFirstParagraph(chapters[j].content)
      if (!openingB) continue

      const sim = jaccardSimilarity(openingA, openingB)
      if (sim >= 0.6) {
        results.push({
          type: 'opening',
          chapterAId: chapters[i].id,
          chapterATitle: chapters[i].title,
          chapterBId: chapters[j].id,
          chapterBTitle: chapters[j].title,
          similarity: Math.round(sim * 100) / 100,
          textA: openingA.slice(0, 100),
          textB: openingB.slice(0, 100),
        })
      }
    }
  }

  return results
}

export function detectClosingPattern(chapters: ChapterInput[]): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (let i = 0; i < chapters.length; i++) {
    const closingA = getLastParagraph(chapters[i].content)
    if (!closingA) continue

    for (let j = i + 1; j < chapters.length; j++) {
      const closingB = getLastParagraph(chapters[j].content)
      if (!closingB) continue

      const sim = jaccardSimilarity(closingA, closingB)
      if (sim >= 0.6) {
        results.push({
          type: 'closing',
          chapterAId: chapters[i].id,
          chapterATitle: chapters[i].title,
          chapterBId: chapters[j].id,
          chapterBTitle: chapters[j].title,
          similarity: Math.round(sim * 100) / 100,
          textA: closingA.slice(0, 100),
          textB: closingB.slice(0, 100),
        })
      }
    }
  }

  return results
}

export function detectStructureDuplicate(chapters: ChapterInput[]): DuplicateResult[] {
  const results: DuplicateResult[] = []

  for (let i = 0; i < chapters.length; i++) {
    const lengthsA = getSentenceLengths(chapters[i].content)
    if (lengthsA.length < 3) continue

    for (let j = i + 1; j < chapters.length; j++) {
      const lengthsB = getSentenceLengths(chapters[j].content)
      if (lengthsB.length < 3) continue

      const sim = cosineSimilarity(lengthsA, lengthsB)
      if (sim >= 0.85) {
        results.push({
          type: 'structure',
          chapterAId: chapters[i].id,
          chapterATitle: chapters[i].title,
          chapterBId: chapters[j].id,
          chapterBTitle: chapters[j].title,
          similarity: Math.round(sim * 100) / 100,
          textA: `句长序列相似度: ${Math.round(sim * 100)}%`,
          textB: `${lengthsA.length} 句 vs ${lengthsB.length} 句`,
        })
      }
    }
  }

  return results
}

export function runAllDetections(chapters: ChapterInput[]): DuplicateResult[] {
  return [
    ...detectDuplicateParagraphs(chapters),
    ...detectTitleClustering(chapters),
    ...detectOpeningPattern(chapters),
    ...detectClosingPattern(chapters),
    ...detectStructureDuplicate(chapters),
  ].sort((a, b) => b.similarity - a.similarity)
}
