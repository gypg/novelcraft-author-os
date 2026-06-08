import { describe, it, expect, beforeEach } from 'vitest'
import { useContextDiagnosticsStore } from './context-diagnostics-store'
import type { ContextBudgetReport } from '@/core/ai-engine/context-builder'
import type { RetrievalDiagnosticDTO } from './context-diagnostics-store'

describe('context-diagnostics-store', () => {
  beforeEach(() => {
    useContextDiagnosticsStore.getState().clearDiagnostics()
  })

  it('should initialize with null state', () => {
    const state = useContextDiagnosticsStore.getState()
    expect(state.budgetReport).toBeNull()
    expect(state.retrievalDiagnostics).toEqual([])
    expect(state.bookId).toBeNull()
    expect(state.chapterId).toBeNull()
    expect(state.timestamp).toBeNull()
  })

  it('should set diagnostics with budget, retrieval DTOs, and context', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    const retrievalDiagnostics: RetrievalDiagnosticDTO[] = [
      {
        id: 'k1',
        itemType: 'note',
        libraryType: 'project',
        canonicalLevel: 'canonical',
        quotePolicy: 'direct_allowed',
        redactionState: 'explicit',
        displayTitle: 'Project Note',
        displaySummary: 'A project note',
        displayKeywords: ['key1', 'key2'],
        score: 0.95,
        scoreBreakdown: {
          bm25: 0.9,
          libraryWeight: 3,
          canonicalWeight: 1.5,
          quotePolicyWeight: 1.0,
          recencyWeight: 1.0,
          final: 0.95,
        },
      },
    ]

    const before = Date.now()
    useContextDiagnosticsStore.getState().setDiagnostics(
      budgetReport,
      retrievalDiagnostics,
      'book1',
      'chapter1'
    )
    const after = Date.now()

    const state = useContextDiagnosticsStore.getState()
    expect(state.budgetReport).toEqual(budgetReport)
    expect(state.retrievalDiagnostics).toEqual(retrievalDiagnostics)
    expect(state.bookId).toBe('book1')
    expect(state.chapterId).toBe('chapter1')
    expect(state.timestamp).toBeGreaterThanOrEqual(before)
    expect(state.timestamp).toBeLessThanOrEqual(after)
  })

  it('should clear diagnostics to initial state', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')
    useContextDiagnosticsStore.getState().clearDiagnostics()

    const state = useContextDiagnosticsStore.getState()
    expect(state.budgetReport).toBeNull()
    expect(state.retrievalDiagnostics).toEqual([])
    expect(state.bookId).toBeNull()
    expect(state.chapterId).toBeNull()
    expect(state.timestamp).toBeNull()
  })

  it('should detect stale state when bookId differs', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')
    expect(useContextDiagnosticsStore.getState().isStale('book2', 'chapter1')).toBe(true)
  })

  it('should detect stale state when chapterId differs', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')
    expect(useContextDiagnosticsStore.getState().isStale('book1', 'chapter2')).toBe(true)
  })

  it('should detect not stale when bookId and chapterId match', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')
    expect(useContextDiagnosticsStore.getState().isStale('book1', 'chapter1')).toBe(false)
  })

  it('should detect stale when no diagnostics set (null bookId/chapterId)', () => {
    expect(useContextDiagnosticsStore.getState().isStale('book1', 'chapter1')).toBe(true)
  })

  it('should preserve redacted-summary state in retrieval diagnostics', () => {
    const budgetReport: ContextBudgetReport = {
      truthFilesTokens: 100,
      temporalFactsTokens: 50,
      authorMemoryTokens: 30,
      knowledgeTokens: 200,
      recentSummaryTokens: 20,
      currentTailTokens: 10,
    }

    const retrievalDiagnostics: RetrievalDiagnosticDTO[] = [
      {
        id: 'k1',
        itemType: 'note',
        libraryType: 'external',
        canonicalLevel: 'canonical',
        quotePolicy: 'direct_forbidden',
        redactionState: 'redacted-summary',
        displayTitle: 'Safe Title',
        displaySummary: 'Sanitized summary (max 100 chars)',
        displayKeywords: ['kw1', 'kw2'],
        score: 0.8,
        scoreBreakdown: {
          bm25: 0.7,
          libraryWeight: 0.3,
          canonicalWeight: 1.5,
          quotePolicyWeight: 0.5,
          recencyWeight: 1.0,
          final: 0.8,
        },
      },
    ]

    useContextDiagnosticsStore.getState().setDiagnostics(
      budgetReport,
      retrievalDiagnostics,
      'book1',
      'chapter1'
    )

    const state = useContextDiagnosticsStore.getState()
    expect(state.retrievalDiagnostics[0].redactionState).toBe('redacted-summary')
    expect(state.retrievalDiagnostics[0].displaySummary).toBe('Sanitized summary (max 100 chars)')
  })
})
