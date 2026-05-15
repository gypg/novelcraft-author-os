import { create } from 'zustand'
import type { ExportFormat } from '@/core/export/export-engine'

interface ExportState {
  isExporting: boolean
  lastExportFormat: ExportFormat | null
  lastExportTime: number | null
  error: string | null

  setExporting: (exporting: boolean) => void
  setLastExport: (format: ExportFormat) => void
  setError: (error: string | null) => void
}

export const useExportStore = create<ExportState>((set) => ({
  isExporting: false,
  lastExportFormat: null,
  lastExportTime: null,
  error: null,

  setExporting: (exporting) => set({ isExporting: exporting }),
  setLastExport: (format) => set({ lastExportFormat: format, lastExportTime: Date.now() }),
  setError: (error) => set({ error }),
}))
