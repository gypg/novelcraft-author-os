export interface VoiceProfileFingerprint {
  avgSentenceLength: number
  sentenceLengthVariance: number
  dialogueRatio: number
  topWords: Record<string, number>
  rhythmPattern: 'short-dense' | 'mixed' | 'long-flowing'
  punctuationDensity: number
}

export interface VoiceProfile {
  id: string
  name: string
  sourceText: string
  fingerprint: VoiceProfileFingerprint
  createdAt: number
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function countChars(text: string): number {
  let count = 0
  for (const ch of text) {
    if (ch >= '一' && ch <= '鿿') count++
    else if (/\w/.test(ch)) count++
  }
  return count
}

function calcDialogueRatio(text: string): number {
  const lines = text.split('\n')
  let dialogueLines = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.startsWith('"') ||
      trimmed.startsWith('"') ||
      trimmed.startsWith('「') ||
      trimmed.startsWith('"')
    ) {
      dialogueLines++
    }
  }
  return lines.length > 0 ? dialogueLines / lines.length : 0
}

function calcTopWords(text: string, topN: number = 20): Record<string, number> {
  const freq: Record<string, number> = {}
  // Simple character bigram + single char counting for Chinese
  for (const ch of text) {
    if (ch >= '一' && ch <= '鿿') {
      freq[ch] = (freq[ch] || 0) + 1
    }
  }
  // Also count common 2-char words
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text.slice(i, i + 2)
    if (
      bigram[0] >= '一' && bigram[0] <= '鿿' &&
      bigram[1] >= '一' && bigram[1] <= '鿿'
    ) {
      freq[bigram] = (freq[bigram] || 0) + 1
    }
  }

  // Sort by frequency, take top N
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN)
  const result: Record<string, number> = {}
  for (const [word, count] of sorted) {
    result[word] = count
  }
  return result
}

function calcRhythmPattern(avgLen: number): 'short-dense' | 'mixed' | 'long-flowing' {
  if (avgLen < 15) return 'short-dense'
  if (avgLen > 40) return 'long-flowing'
  return 'mixed'
}

function calcPunctuationDensity(text: string): number {
  const punctuationCount = (text.match(/[，。！？；：、""''（）[\]【】…—]/g) || []).length
  const totalChars = countChars(text)
  return totalChars > 0 ? punctuationCount / totalChars : 0
}

export function extractVoiceProfile(text: string, name: string): VoiceProfile {
  const sentences = splitSentences(text)
  const lengths = sentences.map((s) => countChars(s))
  const avgLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1)
  const variance = lengths.reduce((sum, l) => sum + (l - avgLen) ** 2, 0) / (lengths.length || 1)

  return {
    id: crypto.randomUUID(),
    name,
    sourceText: text.slice(0, 500),
    fingerprint: {
      avgSentenceLength: Math.round(avgLen * 10) / 10,
      sentenceLengthVariance: Math.round(variance * 10) / 10,
      dialogueRatio: Math.round(calcDialogueRatio(text) * 100) / 100,
      topWords: calcTopWords(text),
      rhythmPattern: calcRhythmPattern(avgLen),
      punctuationDensity: Math.round(calcPunctuationDensity(text) * 1000) / 1000,
    },
    createdAt: Date.now(),
  }
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (const key of allKeys) {
    const va = a[key] || 0
    const vb = b[key] || 0
    dotProduct += va * vb
    normA += va * va
    normB += vb * vb
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator > 0 ? dotProduct / denominator : 0
}

export function compareProfiles(a: VoiceProfile, b: VoiceProfile): number {
  // Weighted similarity across multiple dimensions
  const wordSim = cosineSimilarity(a.fingerprint.topWords, b.fingerprint.topWords)

  const lenSim = 1 - Math.min(1,
    Math.abs(a.fingerprint.avgSentenceLength - b.fingerprint.avgSentenceLength) / 50,
  )

  const dialogueSim = 1 - Math.abs(a.fingerprint.dialogueRatio - b.fingerprint.dialogueRatio)

  const rhythmSim = a.fingerprint.rhythmPattern === b.fingerprint.rhythmPattern ? 1 : 0.5

  return Math.round((wordSim * 0.4 + lenSim * 0.25 + dialogueSim * 0.2 + rhythmSim * 0.15) * 100) / 100
}

export function detectStyleDrift(
  target: VoiceProfile,
  actualText: string,
  threshold: number = 0.68,
): { drifted: boolean; similarity: number } {
  const actualProfile = extractVoiceProfile(actualText, 'actual')
  const similarity = compareProfiles(target, actualProfile)
  return {
    drifted: similarity < threshold,
    similarity,
  }
}

export function buildVoiceProfilePrompt(profile: VoiceProfile): string {
  const fp = profile.fingerprint
  return [
    '## 目标文风指纹',
    `- 平均句长：${fp.avgSentenceLength} 字`,
    `- 句长方差：${fp.sentenceLengthVariance}`,
    `- 对话比例：${Math.round(fp.dialogueRatio * 100)}%`,
    `- 节奏模式：${fp.rhythmPattern === 'short-dense' ? '短句密集' : fp.rhythmPattern === 'long-flowing' ? '长句舒缓' : '混合节奏'}`,
    `- 标点密度：${fp.punctuationDensity}`,
    `- 高频词：${Object.keys(fp.topWords).slice(0, 10).join('、')}`,
    '',
    '请严格模仿以上文风特征写作。',
  ].join('\n')
}
