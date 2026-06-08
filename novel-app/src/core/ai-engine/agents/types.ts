import type { ChatMessage } from '../providers'
import type { ModelRoute } from '../model-router'
import type { AuditReport } from './audit-types'
import type { TruthFileName } from '@/core/db/truth-file-repository'
import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'

export interface ChapterPlan {
  goals: string[]
  mustKeep: string[]
  mustAvoid: string[]
  tone: string
  targetWordCount: number
}

export interface CompiledContext {
  truthFilesSummary: string
  activeFacts: TemporalFactRow[]
  planData: ChapterPlan
  previousChaptersDigest: string
}

export interface FactDelta {
  upserts: Array<{
    subject: string
    predicate: string
    object: string
    valid_from_chapter: number
    valid_until_chapter?: number | null
  }>
  invalidations: Array<{
    subject: string
    predicate: string
    chapterId: string
  }>
}

export interface AgentContext {
  bookId: string
  chapterId: string
  chapterContent: string
  chapterTitle?: string
  outlineDescription?: string
  previousChapters?: Array<{ title: string; contentTail: string }>
  // Phase 4 additions
  chapterNumber?: number
  truthFilesJson?: Record<TruthFileName, string>
  planData?: ChapterPlan
  auditReport?: AuditReport
  activeFacts?: TemporalFactRow[]
  // Phase 4 input governance
  authorIntent?: string
  currentFocus?: string
  authorProfile?: AuthorProfileRow | null
}

export interface AgentExecutionOptions {
  modelRoute?: ModelRoute | null
  maxTokens?: number
  temperature?: number
  onDelta?: (delta: string) => void
}

export interface AgentResult {
  success: boolean
  output: string
  error?: string
}

export interface Agent {
  readonly role: string
  readonly name: string

  buildSystemPrompt(context: AgentContext): string
  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[]
  execute(
    context: AgentContext,
    options?: AgentExecutionOptions,
  ): Promise<AgentResult>
  parseOutput?(raw: string): unknown
}
