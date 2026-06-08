import { create } from 'zustand'
import type { ContextBudgetReport } from '@/core/ai-engine/context-builder'
import type { KnowledgeLibraryType, KnowledgeQuotePolicy, KnowledgeItemType, CanonicalLevel } from '@/core/knowledge-base/types'
import type { KnowledgeScoreBreakdown } from '@/core/knowledge-base/knowledge-retrieval'

// Re-export for convenience
export type { ContextBudgetReport }

/**
 * Redaction state for knowledge items in diagnostics display
 */
export type RedactionState = 'explicit' | 'redacted-summary' | 'redacted-forbidden'

/**
 * Stable retrieval diagnostics DTO for UI display
 * Contains safe, display-ready metadata without raw content
 */
export interface RetrievalDiagnosticDTO {
  id: string
  itemType: KnowledgeItemType
  libraryType: KnowledgeLibraryType
  canonicalLevel: CanonicalLevel
  quotePolicy: KnowledgeQuotePolicy
  redactionState: RedactionState
  displayTitle: string
  displaySummary: string
  displayKeywords: string[]
  score: number
  scoreBreakdown: KnowledgeScoreBreakdown
}

/**
 * Context diagnostics state for AI collaboration panel
 */
export interface ContextDiagnosticsState {
  budgetReport: ContextBudgetReport | null
  retrievalDiagnostics: RetrievalDiagnosticDTO[]
  bookId: string | null
  chapterId: string | null
  timestamp: number | null
}

interface ContextDiagnosticsStore extends ContextDiagnosticsState {
  setDiagnostics: (
    budgetReport: ContextBudgetReport,
    retrievalDiagnostics: RetrievalDiagnosticDTO[],
    bookId: string,
    chapterId: string
  ) => void
  clearDiagnostics: () => void
  isStale: (currentBookId: string, currentChapterId: string) => boolean
}

const INITIAL_STATE: ContextDiagnosticsState = {
  budgetReport: null,
  retrievalDiagnostics: [],
  bookId: null,
  chapterId: null,
  timestamp: null,
}

/**
 * Store for context diagnostics published after buildWritingContext
 * Used by ContextBudgetPanel and future KnowledgeRetrievalPanel
 */
export const useContextDiagnosticsStore = create<ContextDiagnosticsStore>((set, get) => ({
  ...INITIAL_STATE,

  setDiagnostics: (budgetReport, retrievalDiagnostics, bookId, chapterId) => {
    set({
      budgetReport,
      retrievalDiagnostics,
      bookId,
      chapterId,
      timestamp: Date.now(),
    })
  },

  clearDiagnostics: () => {
    set(INITIAL_STATE)
  },

  isStale: (currentBookId, currentChapterId) => {
    const state = get()
    if (!state.bookId || !state.chapterId) {
      return true
    }
    return state.bookId !== currentBookId || state.chapterId !== currentChapterId
  },
}))
