import { create } from 'zustand'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface EditorState {
  currentChapterId: string | null
  isDirty: boolean
  wordCount: number
  saveStatus: SaveStatus
  saveError: string | null
  rightPanelVisible: boolean
  rightPanelTab: 'outline' | 'character' | 'timeline' | 'knowledge' | 'versions' | 'audit' | 'context' | 'constraints'
  isFullscreen: boolean
  saveRequestCounter: number

  setCurrentChapter: (chapterId: string | null) => void
  setDirty: (dirty: boolean) => void
  setWordCount: (count: number) => void
  setSaveStatus: (status: SaveStatus, error?: string | null) => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: 'outline' | 'character' | 'timeline' | 'knowledge' | 'versions' | 'audit' | 'context' | 'constraints') => void
  toggleFullscreen: () => void
  requestSave: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  currentChapterId: null,
  isDirty: false,
  wordCount: 0,
  saveStatus: 'idle',
  saveError: null,
  rightPanelVisible: true,
  rightPanelTab: 'outline',
  isFullscreen: false,
  saveRequestCounter: 0,

  setCurrentChapter: (chapterId) => set({ currentChapterId: chapterId, isDirty: false, saveStatus: 'idle', saveError: null }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setWordCount: (count) => set({ wordCount: count }),
  setSaveStatus: (status, error = null) => set({ saveStatus: status, saveError: error }),
  toggleRightPanel: () => set((s) => ({ rightPanelVisible: !s.rightPanelVisible })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  requestSave: () => set((s) => ({ saveRequestCounter: s.saveRequestCounter + 1 })),
}))
