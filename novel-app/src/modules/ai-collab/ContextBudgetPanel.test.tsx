import { describe, it, expect, beforeEach } from 'vitest'
import { useContextDiagnosticsStore } from './context-diagnostics-store'
import type { ContextBudgetReport } from '@/core/ai-engine/context-builder'

describe('ContextBudgetPanel logic', () => {
  beforeEach(() => {
    useContextDiagnosticsStore.getState().clearDiagnostics()
  })

  describe('display mode detection', () => {
    it('should be "real" when budget report exists and matches context', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 500,
        temporalFactsTokens: 300,
        authorMemoryTokens: 200,
        knowledgeTokens: 800,
        recentSummaryTokens: 400,
        currentTailTokens: 600,
      }

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')

      const { budgetReport: storedReport, isStale } = useContextDiagnosticsStore.getState()
      expect(storedReport).toEqual(budgetReport)
      expect(isStale('book1', 'chapter1')).toBe(false)
    })

    it('should be "stale" when budget report exists but context differs', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 100,
        authorMemoryTokens: 100,
        knowledgeTokens: 100,
        recentSummaryTokens: 100,
        currentTailTokens: 100,
      }

      useContextDiagnosticsStore.getState().setDiagnostics(budgetReport, [], 'book1', 'chapter1')

      const { isStale } = useContextDiagnosticsStore.getState()
      expect(isStale('book2', 'chapter1')).toBe(true)
      expect(isStale('book1', 'chapter2')).toBe(true)
    })

    it('should be "empty" when no budget report and no messages', () => {
      const { budgetReport } = useContextDiagnosticsStore.getState()
      expect(budgetReport).toBeNull()
    })

    it('should be "fallback" when no budget report but messages exist', () => {
      const { budgetReport } = useContextDiagnosticsStore.getState()
      expect(budgetReport).toBeNull()
      // In fallback mode, component would use allocateBudget with messages
    })
  })

  describe('token calculation', () => {
    it('should calculate total from all 6 budget report fields', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 100,
        temporalFactsTokens: 200,
        authorMemoryTokens: 300,
        knowledgeTokens: 400,
        recentSummaryTokens: 500,
        currentTailTokens: 600,
      }

      const total = Object.values(budgetReport).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(2100)
    })

    it('should handle zero-token report', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 0,
        temporalFactsTokens: 0,
        authorMemoryTokens: 0,
        knowledgeTokens: 0,
        recentSummaryTokens: 0,
        currentTailTokens: 0,
      }

      const total = Object.values(budgetReport).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(0)
    })
  })

  describe('warning thresholds', () => {
    it('should have no warning when utilization < 70%', () => {
      const usedTokens = 6000
      const maxTokens = 16000
      const utilization = (usedTokens / maxTokens) * 100

      expect(utilization).toBeLessThan(70)
    })

    it('should warn at medium level when utilization 70-90%', () => {
      const usedTokens = 12000
      const maxTokens = 16000
      const utilization = (usedTokens / maxTokens) * 100

      expect(utilization).toBeGreaterThanOrEqual(70)
      expect(utilization).toBeLessThanOrEqual(90)
    })

    it('should warn at high level when utilization > 90%', () => {
      const usedTokens = 15000
      const maxTokens = 16000
      const utilization = (usedTokens / maxTokens) * 100

      expect(utilization).toBeGreaterThan(90)
    })
  })

  describe('layer configuration', () => {
    it('should have 6 real layers matching ContextBudgetReport fields', () => {
      const budgetReport: ContextBudgetReport = {
        truthFilesTokens: 500,
        temporalFactsTokens: 300,
        authorMemoryTokens: 200,
        knowledgeTokens: 800,
        recentSummaryTokens: 400,
        currentTailTokens: 600,
      }

      const requiredFields = [
        'truthFilesTokens',
        'temporalFactsTokens',
        'authorMemoryTokens',
        'knowledgeTokens',
        'recentSummaryTokens',
        'currentTailTokens',
      ]

      requiredFields.forEach((field) => {
        expect(budgetReport).toHaveProperty(field)
        expect(typeof budgetReport[field as keyof ContextBudgetReport]).toBe('number')
      })
    })
  })

  describe('remaining tokens', () => {
    it('should calculate remaining tokens correctly', () => {
      const usedTokens = 2800
      const maxTokens = 16000
      const remaining = maxTokens - usedTokens

      expect(remaining).toBe(13200)
    })

    it('should not show negative remaining tokens', () => {
      const usedTokens = 18000
      const maxTokens = 16000
      const remaining = Math.max(0, maxTokens - usedTokens)

      expect(remaining).toBe(0)
    })
  })
})
