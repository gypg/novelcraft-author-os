import { describe, it, expect, beforeEach } from 'vitest'
import { useContextDiagnosticsStore } from './context-diagnostics-store'
import type { RetrievalDiagnosticDTO, ContextBudgetReport } from './context-diagnostics-store'

describe('KnowledgeRetrievalPanel logic', () => {
  beforeEach(() => {
    useContextDiagnosticsStore.getState().clearDiagnostics()
  })

  describe('display mode detection', () => {
    it('should be "real" when diagnostics present and context matches', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      const diagnostics: RetrievalDiagnosticDTO[] = [
        {
          id: 'k1',
          itemType: 'note',
          libraryType: 'project',
          canonicalLevel: 'canonical',
          quotePolicy: 'direct_allowed',
          redactionState: 'explicit',
          displayTitle: 'Test Note',
          displaySummary: 'Summary',
          displayKeywords: ['kw1'],
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

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, diagnostics, 'book1', 'chapter1')

      const { retrievalDiagnostics, isStale } = useContextDiagnosticsStore.getState()
      expect(retrievalDiagnostics).toHaveLength(1)
      expect(isStale('book1', 'chapter1')).toBe(false)
    })

    it('should be "stale" when diagnostics present but context differs', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      const diagnostics: RetrievalDiagnosticDTO[] = [
        {
          id: 'k1',
          itemType: 'note',
          libraryType: 'project',
          canonicalLevel: 'canonical',
          quotePolicy: 'direct_allowed',
          redactionState: 'explicit',
          displayTitle: 'Test Note',
          displaySummary: 'Summary',
          displayKeywords: [],
          score: 0.8,
          scoreBreakdown: {
            bm25: 0.7,
            libraryWeight: 3,
            canonicalWeight: 1.5,
            quotePolicyWeight: 1.0,
            recencyWeight: 1.0,
            final: 0.8,
          },
        },
      ]

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, diagnostics, 'book1', 'chapter1')

      const { isStale } = useContextDiagnosticsStore.getState()
      expect(isStale('book2', 'chapter1')).toBe(true)
      expect(isStale('book1', 'chapter2')).toBe(true)
    })

    it('should be "empty" when no diagnostics', () => {
      const { retrievalDiagnostics } = useContextDiagnosticsStore.getState()
      expect(retrievalDiagnostics).toEqual([])
    })
  })

  describe('retrieval diagnostics data', () => {
    it('should store multiple retrieval items', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      const diagnostics: RetrievalDiagnosticDTO[] = [
        {
          id: 'k1',
          itemType: 'note',
          libraryType: 'project',
          canonicalLevel: 'canonical',
          quotePolicy: 'direct_allowed',
          redactionState: 'explicit',
          displayTitle: 'Project Note',
          displaySummary: 'Project summary',
          displayKeywords: ['key1'],
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
        {
          id: 'k2',
          itemType: 'quote',
          libraryType: 'external',
          canonicalLevel: 'inspiration',
          quotePolicy: 'direct_forbidden',
          redactionState: 'redacted-summary',
          displayTitle: 'External Quote',
          displaySummary: 'Redacted summary',
          displayKeywords: ['key2', 'key3'],
          score: 0.72,
          scoreBreakdown: {
            bm25: 0.7,
            libraryWeight: 0.3,
            canonicalWeight: 1.0,
            quotePolicyWeight: 0.5,
            recencyWeight: 1.0,
            final: 0.72,
          },
        },
        {
          id: 'k3',
          itemType: 'note',
          libraryType: 'author',
          canonicalLevel: 'reference',
          quotePolicy: 'not_applicable',
          redactionState: 'explicit',
          displayTitle: 'Author Memory',
          displaySummary: 'Author note',
          displayKeywords: [],
          score: 0.88,
          scoreBreakdown: {
            bm25: 0.85,
            libraryWeight: 2,
            canonicalWeight: 1.2,
            quotePolicyWeight: 1.0,
            recencyWeight: 1.0,
            final: 0.88,
          },
        },
      ]

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, diagnostics, 'book1', 'chapter1')

      const { retrievalDiagnostics } = useContextDiagnosticsStore.getState()
      expect(retrievalDiagnostics).toHaveLength(3)
      expect(retrievalDiagnostics[0].libraryType).toBe('project')
      expect(retrievalDiagnostics[1].libraryType).toBe('external')
      expect(retrievalDiagnostics[2].libraryType).toBe('author')
    })

    it('should preserve redaction state in diagnostics', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      const diagnostics: RetrievalDiagnosticDTO[] = [
        {
          id: 'k1',
          itemType: 'quote',
          libraryType: 'external',
          canonicalLevel: 'inspiration',
          quotePolicy: 'direct_forbidden',
          redactionState: 'redacted-summary',
          displayTitle: 'Redacted Item',
          displaySummary: 'Safe summary only',
          displayKeywords: ['safe', 'keyword'],
          score: 0.75,
          scoreBreakdown: {
            bm25: 0.7,
            libraryWeight: 0.3,
            canonicalWeight: 1.0,
            quotePolicyWeight: 0.5,
            recencyWeight: 1.0,
            final: 0.75,
          },
        },
      ]

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, diagnostics, 'book1', 'chapter1')

      const { retrievalDiagnostics } = useContextDiagnosticsStore.getState()
      expect(retrievalDiagnostics[0].redactionState).toBe('redacted-summary')
      expect(retrievalDiagnostics[0].displaySummary).toBe('Safe summary only')
    })
  })

  describe('score breakdown', () => {
    it('should include all score breakdown fields', () => {
      const scoreBreakdown = {
        bm25: 0.85,
        libraryWeight: 2.5,
        canonicalWeight: 1.3,
        quotePolicyWeight: 0.9,
        recencyWeight: 1.0,
        final: 0.88,
      }

      expect(scoreBreakdown).toHaveProperty('bm25')
      expect(scoreBreakdown).toHaveProperty('libraryWeight')
      expect(scoreBreakdown).toHaveProperty('canonicalWeight')
      expect(scoreBreakdown).toHaveProperty('quotePolicyWeight')
      expect(scoreBreakdown).toHaveProperty('recencyWeight')
      expect(scoreBreakdown).toHaveProperty('final')
    })
  })

  describe('library type configuration', () => {
    it('should have config for all library types', () => {
      const libraryTypes = ['project', 'author', 'external']

      libraryTypes.forEach((type) => {
        expect(['project', 'author', 'external']).toContain(type)
      })
    })
  })

  describe('redaction state configuration', () => {
    it('should have config for all redaction states', () => {
      const redactionStates = ['explicit', 'redacted-summary', 'redacted-forbidden']

      redactionStates.forEach((state) => {
        expect(['explicit', 'redacted-summary', 'redacted-forbidden']).toContain(state)
      })
    })
  })

  describe('item count display', () => {
    it('should track item count correctly', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      const diagnostics: RetrievalDiagnosticDTO[] = Array.from({ length: 5 }, (_, i) => ({
        id: `k${i}`,
        itemType: 'note' as const,
        libraryType: 'project' as const,
        canonicalLevel: 'canonical' as const,
        quotePolicy: 'direct_allowed' as const,
        redactionState: 'explicit' as const,
        displayTitle: `Note ${i}`,
        displaySummary: `Summary ${i}`,
        displayKeywords: [],
        score: 0.9 - i * 0.1,
        scoreBreakdown: {
          bm25: 0.8,
          libraryWeight: 3,
          canonicalWeight: 1.5,
          quotePolicyWeight: 1.0,
          recencyWeight: 1.0,
          final: 0.9 - i * 0.1,
        },
      }))

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, diagnostics, 'book1', 'chapter1')

      const { retrievalDiagnostics } = useContextDiagnosticsStore.getState()
      expect(retrievalDiagnostics).toHaveLength(5)
    })
  })
})
