import { create } from 'zustand'
import type { ImportCandidate } from '@/core/knowledge-base/import-candidates'
import type {
  KnowledgeItemType,
  KnowledgeLibraryType,
  KnowledgeQuotePolicy,
  KnowledgeStatus,
  KnowledgeTagCategory,
} from '@/core/knowledge-base/types'

export interface KnowledgeBaseFilters {
  keyword: string
  libraryType: KnowledgeLibraryType | 'all'
  itemType: KnowledgeItemType | 'all'
  status: KnowledgeStatus | 'all'
  quotePolicy: KnowledgeQuotePolicy | 'all'
  sourceId: string | 'all'
  tagId: string | 'all'
  tagCategory: KnowledgeTagCategory | 'all'
}

interface KnowledgeBaseState {
  activeSection: 'items' | 'sources' | 'tags' | 'import' | 'author-profile'
  filters: KnowledgeBaseFilters
  draftCandidates: ImportCandidate[]
  setActiveSection: (section: KnowledgeBaseState['activeSection']) => void
  setFilters: (filters: Partial<KnowledgeBaseFilters>) => void
  setDraftCandidates: (candidates: ImportCandidate[]) => void
  clearDraftCandidates: () => void
}

const DEFAULT_FILTERS: KnowledgeBaseFilters = {
  keyword: '',
  libraryType: 'all',
  itemType: 'all',
  status: 'confirmed',
  quotePolicy: 'all',
  sourceId: 'all',
  tagId: 'all',
  tagCategory: 'all',
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  activeSection: 'items',
  filters: DEFAULT_FILTERS,
  draftCandidates: [],
  setActiveSection: (section) => set({ activeSection: section }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setDraftCandidates: (candidates) => set({ draftCandidates: candidates.map((candidate) => ({ ...candidate })) }),
  clearDraftCandidates: () => set({ draftCandidates: [] }),
}))
