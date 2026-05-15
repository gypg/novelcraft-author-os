import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookRow, ChapterRow } from '@/core/db/repository'

interface BookshelfState {
  books: BookRow[]
  selectedBookId: string | null
  selectedBookTitle: string | null
  chapters: ChapterRow[]

  setBooks: (books: BookRow[]) => void
  selectBook: (bookId: string | null, bookTitle?: string | null) => void
  setChapters: (chapters: ChapterRow[]) => void
  addBook: (book: BookRow) => void
  removeBook: (bookId: string) => void
  updateBookInList: (bookId: string, updates: Partial<BookRow>) => void
}

export const useBookshelfStore = create<BookshelfState>()(
  persist(
    (set) => ({
      books: [],
      selectedBookId: null,
      selectedBookTitle: null,
      chapters: [],

      setBooks: (books) => set({ books }),
      selectBook: (bookId, bookTitle = null) => {
        set({ selectedBookId: bookId, selectedBookTitle: bookTitle ?? null })
      },
      setChapters: (chapters) => set({ chapters }),
      addBook: (book) => set((s) => ({ books: [book, ...s.books] })),
      removeBook: (bookId) => set((s) => ({
        books: s.books.filter((b) => b.id !== bookId),
        selectedBookId: s.selectedBookId === bookId ? null : s.selectedBookId,
        selectedBookTitle: s.selectedBookId === bookId ? null : s.selectedBookTitle,
      })),
      updateBookInList: (bookId, updates) => set((s) => ({
        books: s.books.map((b) => (b.id === bookId ? { ...b, ...updates } : b)),
      })),
    }),
    {
      name: 'novelcraft-bookshelf',
      partialize: (state) => ({
        selectedBookId: state.selectedBookId,
        selectedBookTitle: state.selectedBookTitle,
      }),
    },
  ),
)
