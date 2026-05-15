import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AIMode = 'single' | 'multi' | 'swarm'
type SwarmSubMode = 'router' | 'supervisor' | 'peer' | 'planner-executor' | 'emergent'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    stage?: string
    tokenUsage?: number
    cost?: number
  }
}

interface AICollabState {
  mode: AIMode
  swarmSubMode: SwarmSubMode
  selectedProviderId: string | null
  selectedModel: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  currentStage: string | null
  isPipelineRunning: boolean
  pipelineIterations: number

  setMode: (mode: AIMode) => void
  setSwarmSubMode: (subMode: SwarmSubMode) => void
  setSelectedProvider: (id: string | null, model?: string | null) => void
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  setStreaming: (streaming: boolean) => void
  setCurrentStage: (stage: string | null) => void
  setPipelineRunning: (running: boolean) => void
  setPipelineIterations: (n: number) => void
}

export const useAICollabStore = create<AICollabState>()(
  persist(
    (set) => ({
      mode: 'single',
      swarmSubMode: 'router',
      selectedProviderId: null,
      selectedModel: null,
      messages: [],
      isStreaming: false,
      currentStage: null,
      isPipelineRunning: false,
      pipelineIterations: 0,

      setMode: (mode) => set({ mode }),
      setSwarmSubMode: (subMode) => set({ swarmSubMode: subMode }),
      setSelectedProvider: (id, model) => set({ selectedProviderId: id, selectedModel: model ?? null }),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      clearMessages: () => set({ messages: [] }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setCurrentStage: (stage) => set({ currentStage: stage }),
      setPipelineRunning: (running) => set({ isPipelineRunning: running }),
      setPipelineIterations: (n) => set({ pipelineIterations: n }),
    }),
    {
      name: 'novelcraft-ai-collab',
      partialize: (state) => ({
        mode: state.mode,
        swarmSubMode: state.swarmSubMode,
        selectedProviderId: state.selectedProviderId,
        selectedModel: state.selectedModel,
      }),
    },
  ),
)
