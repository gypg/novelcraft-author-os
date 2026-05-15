import { useMemo, useState, useRef, useCallback } from 'react'
import { buildGraphFromFacts } from '@/core/knowledge-graph/graph-engine'
import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

interface KnowledgeGraphPanelProps {
  facts: TemporalFactRow[]
  characterMatrixJson?: string
}

const NODE_COLORS: Record<string, string> = {
  character: 'oklch(0.65 0.17 145)',
  location: 'oklch(0.6 0.12 250)',
  item: 'oklch(0.7 0.15 80)',
  event: 'oklch(0.6 0.18 30)',
}

export function KnowledgeGraphPanel({ facts, characterMatrixJson }: KnowledgeGraphPanelProps) {
  const { nodes, edges } = useMemo(
    () => buildGraphFromFacts(facts, characterMatrixJson),
    [facts, characterMatrixJson],
  )

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [offset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => Math.max(0.3, Math.min(3, s + (e.deltaY > 0 ? -0.1 : 0.1))))
  }, [])

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
        暂无图谱数据
      </div>
    )
  }

  // Find connected edges for selected node
  const connectedEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode || e.target === selectedNode)
    : []

  return (
    <div className="flex flex-col h-full">
      {/* Graph canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab"
        onWheel={handleWheel}
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find((n) => n.id === edge.source)
            const target = nodes.find((n) => n.id === edge.target)
            if (!source || !target) return null

            const isHighlighted =
              selectedNode && (edge.source === selectedNode || edge.target === selectedNode)

            return (
              <line
                key={i}
                x1={source.x + 200}
                y1={source.y + 150}
                x2={target.x + 200}
                y2={target.y + 150}
                stroke={isHighlighted ? 'oklch(0.65 0.17 145)' : 'var(--border)'}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={selectedNode ? (isHighlighted ? 1 : 0.2) : 0.5}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNode
            const isConnected = connectedEdges.some(
              (e) => e.source === node.id || e.target === node.id,
            )
            const opacity = selectedNode ? (isSelected || isConnected ? 1 : 0.3) : 1

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{ cursor: 'pointer', opacity }}
              >
                <circle
                  cx={node.x + 200}
                  cy={node.y + 150}
                  r={isSelected ? 12 : 8}
                  fill={NODE_COLORS[node.type] || 'var(--muted-foreground)'}
                  stroke={isSelected ? 'var(--foreground)' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                />
                <text
                  x={node.x + 200}
                  y={node.y + 150 + 18}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize="10"
                >
                  {node.label.length > 8 ? node.label.slice(0, 8) + '...' : node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected node details */}
      {selectedNode && (
        <div className="p-3 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
          <div className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>{selectedNode}</div>
          {connectedEdges.length > 0 && (
            <div className="space-y-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {connectedEdges.map((e, i) => {
                const other = e.source === selectedNode ? e.target : e.source
                return <div key={i}>— {e.relation} → {other}</div>
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-3 py-1.5 border-t flex gap-3 text-[9px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type}>
            <span style={{ color }}>●</span> {type === 'character' ? '角色' : type === 'location' ? '地点' : type === 'item' ? '物品' : '事件'}
          </span>
        ))}
        <span className="ml-auto">{nodes.length} 节点 · {edges.length} 关系</span>
      </div>
    </div>
  )
}
