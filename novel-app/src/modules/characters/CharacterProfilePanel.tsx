import { useState, useMemo } from 'react'
import { extractProfilesFromMatrix, getStatusColor } from '@/core/characters/character-profile'

interface CharacterProfilePanelProps {
  characterMatrixJson?: string
}

export function CharacterProfilePanel({ characterMatrixJson }: CharacterProfilePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const profiles = useMemo(() => {
    if (!characterMatrixJson) return []
    return extractProfilesFromMatrix(characterMatrixJson)
  }, [characterMatrixJson])

  const filtered = useMemo(() => {
    if (!filter) return profiles
    const lower = filter.toLowerCase()
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower),
    )
  }, [profiles, filter])

  if (profiles.length === 0) {
    return (
      <div className="p-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
        暂无角色数据
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索角色..."
          className="w-full px-2 py-1 rounded text-xs border outline-none"
          style={{
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((char) => (
          <div
            key={char.id}
            className="rounded-md overflow-hidden transition-colors"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs"
              onClick={() => setExpandedId(expandedId === char.id ? null : char.id)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getStatusColor(char.status) }}
              />
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                {char.name}
              </span>
              {char.relationships.length > 0 && (
                <span className="text-[9px] ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                  {char.relationships.length} 关系
                </span>
              )}
            </button>

            {/* Expanded details */}
            {expandedId === char.id && (
              <div className="px-3 pb-2 text-[11px] space-y-1.5" style={{ color: 'var(--muted-foreground)' }}>
                {char.description && <div>{char.description}</div>}
                {char.appearance && <div>外貌：{char.appearance}</div>}
                {char.personality.length > 0 && (
                  <div>性格：{char.personality.join('、')}</div>
                )}
                {char.abilities.length > 0 && (
                  <div>能力：{char.abilities.join('、')}</div>
                )}
                {char.relationships.length > 0 && (
                  <div>
                    <div className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>关系网络</div>
                    {char.relationships.map((rel, i) => (
                      <div key={i}>
                        → {rel.targetName}（{rel.relation}）
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 border-t text-[10px] flex gap-3" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
        <span>{profiles.length} 个角色</span>
        <span>{profiles.filter((p) => p.status === 'alive').length} 在世</span>
        <span>{profiles.filter((p) => p.status === 'dead').length} 已故</span>
      </div>
    </div>
  )
}
