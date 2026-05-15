import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface SearchReplaceOptions {
  searchResultClass: string
  searchResultCurrentClass: string
}

const searchKey = new PluginKey('searchReplace')

interface SearchStorage {
  query: string
  replaceText: string
  currentIndex: number
  results: number[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchQuery: (query: string) => ReturnType
      setReplaceText: (text: string) => ReturnType
      findNext: () => ReturnType
      findPrev: () => ReturnType
      replaceCurrent: () => ReturnType
      replaceAll: () => ReturnType
      clearSearch: () => ReturnType
    }
  }

  interface Storage {
    searchReplace: SearchStorage
  }
}

export const SearchReplace = Extension.create<SearchReplaceOptions, SearchStorage>({
  name: 'searchReplace',

  addOptions() {
    return {
      searchResultClass: 'search-result',
      searchResultCurrentClass: 'search-result-current',
    }
  },

  addStorage() {
    return {
      query: '',
      replaceText: '',
      currentIndex: 0,
      results: [] as number[],
    }
  },

  addCommands() {
    return {
      setSearchQuery:
        (query: string) =>
        ({ editor }) => {
          editor.storage.searchReplace.query = query
          editor.storage.searchReplace.currentIndex = 0
          editor.view.dispatch(editor.view.state.tr)
          return true
        },
      setReplaceText:
        (text: string) =>
        ({ editor }) => {
          editor.storage.searchReplace.replaceText = text
          return true
        },
      findNext:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchReplace as SearchStorage
          if (storage.results.length === 0) return true
          storage.currentIndex = (storage.currentIndex + 1) % storage.results.length
          editor.view.dispatch(editor.view.state.tr)
          return true
        },
      findPrev:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchReplace as SearchStorage
          if (storage.results.length === 0) return true
          storage.currentIndex = (storage.currentIndex - 1 + storage.results.length) % storage.results.length
          editor.view.dispatch(editor.view.state.tr)
          return true
        },
      replaceCurrent:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchReplace as SearchStorage
          if (storage.results.length === 0 || !storage.query) return true
          const pos = storage.results[storage.currentIndex]
          const from = pos
          const to = pos + storage.query.length
          editor.chain().focus().insertContentAt({ from, to }, storage.replaceText).run()
          return true
        },
      replaceAll:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchReplace as SearchStorage
          if (storage.results.length === 0 || !storage.query) return true
          const results = [...storage.results].reverse()
          for (const pos of results) {
            editor.chain().insertContentAt({ from: pos, to: pos + storage.query.length }, storage.replaceText).run()
          }
          storage.currentIndex = 0
          return true
        },
      clearSearch:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchReplace as SearchStorage
          storage.query = ''
          storage.replaceText = ''
          storage.currentIndex = 0
          editor.view.dispatch(editor.view.state.tr)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const options = this.options

    return [
      new Plugin({
        key: searchKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr) {
            const storage = editor.storage.searchReplace as SearchStorage
            const query: string = storage.query || ''

            if (!query) {
              storage.results = []
              return DecorationSet.empty
            }

            const doc = tr.doc
            const results: number[] = []
            const searchStr = query.toLowerCase()

            findTextInNode(doc, searchStr, results)
            storage.results = results

            if (storage.currentIndex >= results.length) {
              storage.currentIndex = 0
            }

            const decorations: Decoration[] = results.map((pos, idx) =>
              Decoration.inline(pos, pos + query.length, {
                class:
                  idx === storage.currentIndex
                    ? `${options.searchResultClass} ${options.searchResultCurrentClass}`
                    : options.searchResultClass,
              }),
            )

            return DecorationSet.create(doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state) || DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export function findTextInNode(
  node: ProseMirrorNode,
  query: string,
  results: number[],
  offset: number = 0,
) {
  if (!query) return

  if (node.isText && node.text) {
    const text = node.text.toLowerCase()
    let index = text.indexOf(query)
    while (index !== -1) {
      results.push(offset + index)
      index = text.indexOf(query, index + 1)
    }
  }

  if (node.content) {
    let childOffset = offset + 1
    for (let i = 0; i < node.content.childCount; i++) {
      const child = node.content.child(i)
      findTextInNode(child, query, results, childOffset)
      childOffset += child.nodeSize
    }
  }
}
