import { create } from 'zustand'
import type { AnalyticsSummary } from '@/core/analytics/analytics-engine'
import { computeSummary, computeModelUsage } from '@/core/analytics/analytics-engine'
import type { ChapterRow } from '@/core/db/repository'

interface AnalyticsState {
  summary: Omit<AnalyticsSummary, 'topIssues' | 'modelUsage'> | null
  modelUsage: Record<string, number>
  loading: boolean

  computeFromChapters: (chapters: ChapterRow[]) => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  summary: null,
  modelUsage: {},
  loading: false,

  computeFromChapters: (chapters) => {
    set({ loading: true })
    try {
      const summary = computeSummary(chapters)
      const modelUsage = computeModelUsage()
      set({ summary, modelUsage, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
