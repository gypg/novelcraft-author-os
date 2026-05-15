import { isTauri } from '@/shared/utils/tauri-env'
import { generateId } from './repository'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export interface OutlineNode {
  id: string
  book_id: string
  parent_id: string | null
  title: string
  description: string
  chapter_id: string | null
  order_index: number
  created_at: number
  updated_at: number
}

export interface OutlineTreeNode extends OutlineNode {
  children: OutlineTreeNode[]
}

export interface CreateOutlineInput {
  book_id: string
  parent_id?: string | null
  title: string
  description?: string
  chapter_id?: string | null
  order_index?: number
}

export interface UpdateOutlineInput {
  title?: string
  description?: string
  chapter_id?: string | null
  order_index?: number
}

export async function createOutlineNode(input: CreateOutlineInput): Promise<OutlineNode> {
  const inv = await getInvoke()
  if (!inv) return { id: '', book_id: input.book_id, parent_id: input.parent_id || null, title: input.title, description: input.description || '', chapter_id: input.chapter_id || null, order_index: input.order_index || 0, created_at: 0, updated_at: 0 }
  return inv<OutlineNode>('create_outline_node', {
    input: { id: generateId(), ...input },
  })
}

export async function listOutlines(bookId: string): Promise<OutlineNode[]> {
  const inv = await getInvoke()
  if (!inv) return []
  return inv<OutlineNode[]>('list_outlines', { bookId })
}

export async function updateOutlineNode(id: string, input: UpdateOutlineInput): Promise<OutlineNode> {
  const inv = await getInvoke()
  if (!inv) return { id, book_id: '', parent_id: null, title: input.title || '', description: input.description || '', chapter_id: input.chapter_id || null, order_index: input.order_index || 0, created_at: 0, updated_at: 0 }
  return inv<OutlineNode>('update_outline_node', { id, input })
}

export async function deleteOutlineNode(id: string): Promise<void> {
  const inv = await getInvoke()
  if (!inv) return
  return inv<void>('delete_outline_node', { id })
}

/**
 * Build a tree structure from flat outline nodes.
 */
export function buildOutlineTree(nodes: OutlineNode[]): OutlineTreeNode[] {
  const map = new Map<string, OutlineTreeNode>()
  const roots: OutlineTreeNode[] = []

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] })
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(treeNode)
    } else {
      roots.push(treeNode)
    }
  }

  // Sort by order_index
  const sortChildren = (nodes: OutlineTreeNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index)
    nodes.forEach((n) => sortChildren(n.children))
  }
  sortChildren(roots)

  return roots
}
