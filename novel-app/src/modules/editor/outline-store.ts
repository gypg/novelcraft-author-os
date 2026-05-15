import { create } from 'zustand'
import {
  listOutlines,
  createOutlineNode,
  updateOutlineNode,
  deleteOutlineNode,
  buildOutlineTree,
  type OutlineNode,
  type OutlineTreeNode,
} from '@/core/db/outline-repository'

interface OutlineState {
  flatNodes: OutlineNode[]
  tree: OutlineTreeNode[]
  bookId: string | null

  load: (bookId: string) => Promise<void>
  addNode: (parentId: string | null, title: string, description?: string) => Promise<OutlineNode>
  updateNode: (id: string, data: { title?: string; description?: string; chapter_id?: string | null }) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  getNodeForChapter: (chapterId: string) => OutlineNode | undefined
}

export const useOutlineStore = create<OutlineState>((set, get) => ({
  flatNodes: [],
  tree: [],
  bookId: null,

  load: async (bookId) => {
    const nodes = await listOutlines(bookId)
    set({ flatNodes: nodes, tree: buildOutlineTree(nodes), bookId })
  },

  addNode: async (parentId, title, description = '') => {
    const bookId = get().bookId
    if (!bookId) throw new Error('No book selected')

    const siblings = get().flatNodes.filter((n) => n.parent_id === parentId)
    const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order_index), -1)

    const node = await createOutlineNode({
      book_id: bookId,
      parent_id: parentId,
      title,
      description,
      order_index: maxOrder + 1,
    })

    set((s) => {
      const nodes = [...s.flatNodes, node]
      return { flatNodes: nodes, tree: buildOutlineTree(nodes) }
    })
    return node
  },

  updateNode: async (id, data) => {
    const updated = await updateOutlineNode(id, data)
    set((s) => {
      const nodes = s.flatNodes.map((n) => (n.id === id ? updated : n))
      return { flatNodes: nodes, tree: buildOutlineTree(nodes) }
    })
  },

  deleteNode: async (id) => {
    await deleteOutlineNode(id)
    set((s) => {
      // Remove node and all descendants
      const idsToRemove = new Set<string>()
      const collect = (nodeId: string) => {
        idsToRemove.add(nodeId)
        s.flatNodes.filter((n) => n.parent_id === nodeId).forEach((n) => collect(n.id))
      }
      collect(id)
      const nodes = s.flatNodes.filter((n) => !idsToRemove.has(n.id))
      return { flatNodes: nodes, tree: buildOutlineTree(nodes) }
    })
  },

  getNodeForChapter: (chapterId) => {
    return get().flatNodes.find((n) => n.chapter_id === chapterId)
  },
}))
