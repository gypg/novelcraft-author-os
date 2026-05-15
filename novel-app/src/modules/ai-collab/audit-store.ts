import { create } from 'zustand'
import type { AuditReport, AuditReportMeta } from '@/core/ai-engine/agents'

interface AuditState {
  currentReport: AuditReport | null
  reportHistory: AuditReportMeta[]
  pipelineStatus: 'idle' | 'running' | 'audit' | 'revise' | 'completed' | 'paused'
  currentIteration: number
  maxRetries: number

  setReport: (report: AuditReport) => void
  setPipelineStatus: (status: AuditState['pipelineStatus']) => void
  setCurrentIteration: (iteration: number) => void
  clearReport: () => void
  addReportMeta: (meta: AuditReportMeta) => void
}

export const useAuditStore = create<AuditState>((set) => ({
  currentReport: null,
  reportHistory: [],
  pipelineStatus: 'idle',
  currentIteration: 0,
  maxRetries: 3,

  setReport: (report) => set({ currentReport: report }),
  setPipelineStatus: (status) => set({ pipelineStatus: status }),
  setCurrentIteration: (iteration) => set({ currentIteration: iteration }),
  clearReport: () => set({ currentReport: null, pipelineStatus: 'idle', currentIteration: 0 }),
  addReportMeta: (meta) =>
    set((s) => ({ reportHistory: [meta, ...s.reportHistory].slice(0, 50) })),
}))
