import { listChapters } from '@/core/db/repository'
import { queryTemporalFactsAtChapter } from '@/core/db/temporal-memory-repository'
import { loadTruthFile, type TruthFileName } from '@/core/db/truth-file-repository'
import { getDefaultAuthorProfile } from '@/core/db/author-profile-repository'
import { buildAuthorAntiAiRules, buildAuthorProfilePromptSection } from '@/core/author-os/author-profile-prompt'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'
import type { ChatMessage } from './providers'
import { buildStyleGuardPrompt } from './style-guard'
import { logger } from '@/shared/utils/logger'

export interface WritingContext {
  outlineDescription: string | null
  recentSummaries: string[]
  currentContentTail: string
  systemPrompt: string
}

const TRUTH_FILES_TO_LOAD: TruthFileName[] = [
  'character_matrix',
  'current_state',
  'summaries',
  'emotional_arcs',
]

/**
 * Build context for AI writing operations.
 * Assembles context from chapters, truth files, and temporal memory.
 * Reused by single-agent, multi-agent, and swarm modes.
 */
export async function buildWritingContext(params: {
  bookId: string
  chapterId: string
  currentContent: string
  outlineTitle?: string | null
  outlineDescription?: string | null
}): Promise<{ messages: ChatMessage[]; context: WritingContext }> {
  const { bookId, chapterId, currentContent, outlineTitle, outlineDescription } = params

  // 1. Get recent chapters for context
  const chapters = await listChapters(bookId)
  const currentIdx = chapters.findIndex((c) => c.id === chapterId)
  const recentChapters = chapters.slice(Math.max(0, currentIdx - 2), currentIdx)
  const chapterNumber = currentIdx >= 0 ? currentIdx + 1 : 1

  const recentSummaries = recentChapters.map((ch) => {
    const text = stripHtml(ch.content)
    return `【${ch.title}】${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`
  })

  // 2. Load truth files for world-building context
  const truthFileEntries = await Promise.all(
    TRUTH_FILES_TO_LOAD.map(async (name) => {
      try {
        const row = await loadTruthFile(bookId, name)
        if (!row?.content_json) return null
        const parsed = JSON.parse(row.content_json)
        // Summarize truth file to avoid overwhelming token budget
        const summary = summarizeTruthFile(name, parsed)
        return summary ? `[${name}] ${summary}` : null
      } catch { return null }
    })
  )
  const truthFilesContext = truthFileEntries.filter(Boolean).join('\n')

  // 3. Load recent temporal facts (last 20 facts across recent chapters)
  let factsContext = ''
  try {
    const facts = await queryTemporalFactsAtChapter(bookId, chapterNumber)
    if (facts.length > 0) {
      const recentFacts = facts.slice(-20)
      factsContext = recentFacts.map(f => `${f.subject} ${f.predicate} ${f.object}`).join('\n')
    }
  } catch { /* non-fatal */ }

  // 4. Get content tail (last 2000 chars)
  const currentText = stripHtml(currentContent)
  const currentContentTail = currentText.slice(-2000)

  let authorProfile: AuthorProfileRow | null = null
  try {
    authorProfile = await getDefaultAuthorProfile()
  } catch (error) {
    logger.warn('context-builder', `Author profile unavailable: ${error}`)
  }

  // 5. Build system prompt
  const systemParts = [
    '你是一个专业的小说写作助手。请根据上下文自然地续写内容。',
    '',
    '## 核心要求',
    '- 保持与前文一致的风格和语气',
    '- 通过行为和细节传达情感，不要直接标注情绪（如"他感到愤怒"）',
    '- 句子长短交替，避免连续短句或连续长句',
    '- 对话要像真人说话，避免书面化',
    '',
    buildStyleGuardPrompt(buildAuthorAntiAiRules(authorProfile)),
  ]

  const authorProfilePrompt = buildAuthorProfilePromptSection(authorProfile)
  if (authorProfilePrompt) {
    systemParts.push('', authorProfilePrompt)
  }

  const systemPrompt = systemParts.join('\n')

  // 6. Build messages
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }]

  // Inject outline context
  if (outlineTitle || outlineDescription) {
    const outlineParts = []
    if (outlineTitle) outlineParts.push(`章节标题：${outlineTitle}`)
    if (outlineDescription) outlineParts.push(`内容要点：${outlineDescription}`)
    messages.push({
      role: 'user',
      content: `【本章大纲】\n${outlineParts.join('\n')}`,
    })
    messages.push({
      role: 'assistant',
      content: '已了解本章大纲规划，请按此方向续写。',
    })
  }

  // Inject truth files context (world consistency)
  if (truthFilesContext) {
    messages.push({
      role: 'user',
      content: `【世界观设定与角色关系】\n${truthFilesContext.slice(0, 3000)}`,
    })
    messages.push({
      role: 'assistant',
      content: '已了解世界观设定和角色关系，请保持一致性。',
    })
  }

  // Inject temporal facts (event history)
  if (factsContext) {
    messages.push({
      role: 'user',
      content: `【已确认的剧情事实】\n${factsContext.slice(0, 2000)}`,
    })
    messages.push({
      role: 'assistant',
      content: '已了解剧情事实，请确保续写与已发生事件保持一致。',
    })
  }

  if (recentSummaries.length > 0) {
    messages.push({
      role: 'user',
      content: `【前文回顾】\n${recentSummaries.join('\n\n')}`,
    })
    messages.push({
      role: 'assistant',
      content: '已了解前文内容，请给出需要续写的位置，我来继续。',
    })
  }

  if (currentContentTail.trim()) {
    messages.push({
      role: 'user',
      content: `【当前章节内容（末尾部分）】\n${currentContentTail}\n\n请从上文末尾自然续写。`,
    })
  } else {
    messages.push({
      role: 'user',
      content: '这是一个新章节，请写一个引人入胜的开头。',
    })
  }

  return {
    messages,
    context: {
      outlineDescription: outlineDescription ?? null,
      recentSummaries: recentSummaries.map((s) => s.slice(0, 200)),
      currentContentTail,
      systemPrompt,
    },
  }
}

/**
 * Summarize a truth file's content to a short string for context injection.
 * Keeps the most important fields to avoid token overflow.
 */
function summarizeTruthFile(name: string, data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>

  switch (name) {
    case 'character_matrix': {
      const arr = Array.isArray(obj) ? obj : Object.values(obj)
      if (!Array.isArray(arr) || arr.length === 0) return ''
      return arr.slice(0, 10).map((r: Record<string, string>) =>
        `${r.character_a || r.source || '?'} → ${r.relation || r.type || '?'} → ${r.character_b || r.target || '?'}`
      ).join('\n')
    }
    case 'current_state': {
      const entries = Object.entries(obj).slice(0, 8)
      return entries.map(([k, v]) => `${k}: ${String(v).slice(0, 100)}`).join('\n')
    }
    case 'summaries': {
      const arr = Array.isArray(obj) ? obj : []
      return arr.slice(-5).map((s: unknown) => String(s).slice(0, 150)).join('\n')
    }
    case 'emotional_arcs': {
      const arr = Array.isArray(obj) ? obj : []
      return arr.slice(-5).map((e: Record<string, unknown>) =>
        `${e.character || '?'}: ${e.emotion || '?'} (强度 ${e.intensity ?? '?'})`
      ).join('\n')
    }
    default:
      return ''
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Banned phrases for anti-AI writing (Chinese)
export const DEFAULT_BANNED_PHRASES = [
  '值得一提的是',
  '在这个充满',
  '让我们一起',
  '总的来说',
  '不仅如此',
  '可以说',
  '毋庸置疑',
  '众所周知',
  '不得不说',
  '在这个世界上',
  '不禁让人',
  '引人深思',
  '发人深省',
  '令人印象深刻',
  '总而言之',
  '综上所述',
  '从某种意义上说',
  '需要指出的是',
  '值得注意的是',
  '不难发现',
  '显而易见',
  '事实上',
  '实际上',
  '毫无疑问',
  '确实如此',
]
