import { create } from 'zustand'
import {
  listChapterVersions,
  revertChapterToVersion,
  type ChapterVersionRow,
} from '@/core/db/version-repository'

interface VersionState {
  versions: ChapterVersionRow[]
  chapterId: string | null
  loading: boolean
  selectedVersionId: string | null

  loadVersions: (chapterId: string) => Promise<void>
  selectVersion: (versionId: string | null) => void
  revertToVersion: (versionId: string) => Promise<string | null>
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  chapterId: null,
  loading: false,
  selectedVersionId: null,

  loadVersions: async (chapterId: string) => {
    set({ loading: true, chapterId, selectedVersionId: null })
    try {
      const versions = await listChapterVersions(chapterId)
      set({ versions, loading: false })
    } catch {
      set({ versions: [], loading: false })
    }
  },

  selectVersion: (versionId: string | null) => {
    set({ selectedVersionId: versionId })
  },

  revertToVersion: async (versionId: string) => {
    const { chapterId } = get()
    if (!chapterId) return null
    try {
      const result = await revertChapterToVersion(chapterId, versionId)
      // Reload versions after revert
      const versions = await listChapterVersions(chapterId)
      set({ versions, selectedVersionId: null })
      return result.content
    } catch {
      return null
    }
  },
}))
