import { create } from 'zustand'
import { autoPilot, type AutoPilotConfig, type AutoPilotStatus, type AutoPilotLog } from '@/core/scheduler/auto-pilot'

interface AutoPilotState {
  status: AutoPilotStatus
  config: AutoPilotConfig
  logs: AutoPilotLog[]

  refreshStatus: () => void
  refreshLogs: () => void
  updateConfig: (config: Partial<AutoPilotConfig>) => void
}

export const useAutoPilotStore = create<AutoPilotState>((set) => ({
  status: autoPilot.getStatus(),
  config: autoPilot.getConfig(),
  logs: [],

  refreshStatus: () => set({ status: autoPilot.getStatus() }),
  refreshLogs: () => set({ logs: autoPilot.getLogs() }),
  updateConfig: (config) => {
    autoPilot.setConfig(config)
    set({ config: autoPilot.getConfig() })
  },
}))
