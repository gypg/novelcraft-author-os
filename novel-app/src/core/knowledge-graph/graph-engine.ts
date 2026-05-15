import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

export interface GraphNode {
  id: string
  type: 'character' | 'location' | 'item' | 'event'
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
}

export function buildGraphFromFacts(
  facts: TemporalFactRow[],
  characterMatrixJson?: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  // Extract characters from facts
  for (const fact of facts) {
    if (!nodeMap.has(fact.subject)) {
      nodeMap.set(fact.subject, {
        id: fact.subject,
        type: 'character',
        label: fact.subject,
        x: 0, y: 0,
      })
    }
    if (!nodeMap.has(fact.object) && fact.object.length < 20) {
      nodeMap.set(fact.object, {
        id: fact.object,
        type: classifyEntity(fact.object),
        label: fact.object,
        x: 0, y: 0,
      })
    }
    if (fact.subject !== fact.object) {
      edges.push({
        source: fact.subject,
        target: fact.object,
        relation: fact.predicate,
      })
    }
  }

  // Extract from character matrix
  if (characterMatrixJson) {
    try {
      const matrix = JSON.parse(characterMatrixJson)
      if (Array.isArray(matrix)) {
        for (const rel of matrix) {
          const a = rel.character_a || rel.source || ''
          const b = rel.character_b || rel.target || ''
          if (a && !nodeMap.has(a)) {
            nodeMap.set(a, { id: a, type: 'character', label: a, x: 0, y: 0 })
          }
          if (b && !nodeMap.has(b)) {
            nodeMap.set(b, { id: b, type: 'character', label: b, x: 0, y: 0 })
          }
          if (a && b) {
            edges.push({ source: a, target: b, relation: rel.relation || rel.type || '' })
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Simple circular layout
  const nodes = Array.from(nodeMap.values())
  const count = nodes.length
  const radius = Math.max(100, count * 20)

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    node.x = Math.round(radius * Math.cos(angle))
    node.y = Math.round(radius * Math.sin(angle))
  })

  return { nodes, edges }
}

function classifyEntity(text: string): 'character' | 'location' | 'item' | 'event' {
  const locationKeywords = ['城', '镇', '村', '山', '河', '湖', '宫', '殿', '府', '塔']
  const itemKeywords = ['剑', '刀', '书', '玉', '珠', '丹', '药', '器']

  for (const kw of locationKeywords) {
    if (text.includes(kw)) return 'location'
  }
  for (const kw of itemKeywords) {
    if (text.includes(kw)) return 'item'
  }
  return 'character'
}
