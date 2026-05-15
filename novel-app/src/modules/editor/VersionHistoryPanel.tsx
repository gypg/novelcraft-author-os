import { useEffect, useMemo, useState } from 'react'
import { diffChars } from 'diff'
import { useVersionStore } from './version-store'

interface VersionHistoryPanelProps {
  chapterId: string
  onRevert?: (content: string) => void
}

export function VersionHistoryPanel({ chapterId, onRevert }: VersionHistoryPanelProps) {
  const { versions, loading, selectedVersionId, loadVersions, selectVersion, revertToVersion } =
    useVersionStore()

  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null)

  useEffect(() => {
    loadVersions(chapterId)
  }, [chapterId, loadVersions])

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? null,
    [versions, selectedVersionId],
  )

  const previousVersion = useMemo(() => {
    if (!selectedVersionId) return null
    const idx = versions.findIndex((v) => v.id === selectedVersionId)
    return idx < versions.length - 1 ? versions[idx + 1] : null
  }, [versions, selectedVersionId])

  const diffSegments = useMemo(() => {
    if (!selectedVersion || !previousVersion) return null
    return diffChars(previousVersion.content, selectedVersion.content)
  }, [selectedVersion, previousVersion])

  const handleRevert = async (versionId: string) => {
    const content = await revertToVersion(versionId)
    if (content && onRevert) {
      onRevert(content)
    }
    setConfirmRevertId(null)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
        加载中...
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <div
          style={{
            borderRadius: 'var(--app-radius)',
            padding: '24px',
            textAlign: 'center',
            fontSize: '12px',
            backgroundColor: 'var(--app-bg-secondary)',
            color: 'var(--app-text-muted)',
          }}
        >
          暂无版本历史
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {versions.map((v) => {
          const isSelected = v.id === selectedVersionId
          const isConfirming = v.id === confirmRevertId

          return (
            <div
              key={v.id}
              style={{
                borderRadius: 'var(--app-radius)',
                padding: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                backgroundColor: isSelected ? 'var(--app-bg-secondary)' : 'transparent',
              }}
              onClick={() => selectVersion(isSelected ? null : v.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--app-text-primary)' }}>{formatTime(v.created_at)}</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: 'var(--app-text-muted)',
                  }}
                >
                  {v.content_hash.slice(0, 8)}
                </span>
              </div>

              {isSelected && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isConfirming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-danger)' }}>确认回滚？</span>
                      <button
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--app-radius)',
                          fontSize: '11px',
                          backgroundColor: 'var(--color-danger)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRevert(v.id)
                        }}
                      >
                        确认
                      </button>
                      <button
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--app-radius)',
                          fontSize: '11px',
                          backgroundColor: 'var(--app-bg-secondary)',
                          color: 'var(--app-text-primary)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmRevertId(null)
                        }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--app-radius)',
                        fontSize: '11px',
                        backgroundColor: 'var(--app-bg-secondary)',
                        color: 'var(--app-text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmRevertId(v.id)
                      }}
                    >
                      回滚到此版本
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {diffSegments && (
        <div
          style={{
            borderTop: '1px solid var(--app-border)',
            padding: '12px',
            overflowY: 'auto',
            maxHeight: '40vh',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 500, marginBottom: '8px', color: 'var(--app-text-muted)' }}>
            变更对比
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {diffSegments.map((seg, i) => {
              if (seg.added) {
                return (
                  <span key={i} style={{ backgroundColor: 'oklch(0.7 0.15 145 / 0.3)', color: 'var(--app-text-primary)' }}>
                    {seg.value}
                  </span>
                )
              }
              if (seg.removed) {
                return (
                  <span key={i} style={{ backgroundColor: 'oklch(0.7 0.2 25 / 0.3)', color: 'var(--app-text-primary)', textDecoration: 'line-through' }}>
                    {seg.value}
                  </span>
                )
              }
              return <span key={i}>{seg.value}</span>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
