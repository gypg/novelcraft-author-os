import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBookshelfStore } from '@/modules'
import { loadAllTruthFiles } from '@/core/db/truth-file-repository'
import type { TruthFileName } from '@/core/truth-files/schemas'

const TRUTH_FILE_LABELS: Record<TruthFileName, string> = {
  current_state: '世界状态',
  hooks: '伏笔池',
  summaries: '章节摘要',
  subplots: '支线进度',
  emotional_arcs: '情感弧线',
  character_matrix: '角色矩阵',
  particle_ledger: '资源账本',
}

const TRUTH_FILE_NAMES: TruthFileName[] = [
  'current_state', 'hooks', 'summaries', 'subplots',
  'emotional_arcs', 'character_matrix', 'particle_ledger',
]

const TAB_CONFIG: Array<{ key: TruthFileName; label: string; icon: string }> = [
  { key: 'current_state', label: '世界状态', icon: '🌍' },
  { key: 'character_matrix', label: '角色', icon: '👤' },
  { key: 'hooks', label: '伏笔', icon: '🪝' },
  { key: 'subplots', label: '支线', icon: '🔀' },
  { key: 'summaries', label: '章节摘要', icon: '📄' },
  { key: 'emotional_arcs', label: '情感弧线', icon: '💫' },
  { key: 'particle_ledger', label: '资源账本', icon: '📦' },
]

function renderStructuredValue(value: unknown, depth: number = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>空</span>
  }
  if (typeof value === 'boolean') {
    return <span style={{ color: 'var(--color-brand)' }}>{value ? '是' : '否'}</span>
  }
  if (typeof value === 'number') {
    return <span style={{ color: 'var(--color-brand)' }}>{value}</span>
  }
  if (typeof value === 'string') {
    if (value.length === 0) {
      return <span style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>空</span>
    }
    return <span>{value}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>无数据</span>
    }
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {value.map((item, i) => (
            <span
              key={i}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--app-radius)',
                fontSize: '11px',
                backgroundColor: 'var(--app-bg-secondary)',
                color: 'var(--app-text-primary)',
              }}
            >
              {String(item)}
            </span>
          ))}
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {value.map((item, i) => (
          <div
            key={i}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--app-radius)',
              backgroundColor: 'var(--app-bg-secondary)',
              borderLeft: '3px solid var(--color-brand)',
            }}
          >
            {renderStructuredValue(item, depth + 1)}
          </div>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return <span style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>空</span>
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: depth === 0 ? '12px' : '6px' }}>
        {entries.map(([key, val]) => (
          <div key={key}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {key}
            </div>
            <div style={{ paddingLeft: depth < 2 ? '8px' : '0' }}>
              {renderStructuredValue(val, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return <span>{String(value)}</span>
}

export function WorldBiblePage() {
  const location = useLocation()
  const state = location.state as { bookId?: string } | null
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const bookId = state?.bookId || selectedBookId

  const [activeTab, setActiveTab] = useState<TruthFileName>('current_state')
  const [searchQuery, setSearchQuery] = useState('')
  const [truthFiles, setTruthFiles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!bookId) return
    loadAllTruthFiles(bookId).then((rows) => {
      const files: Record<string, string> = {}
      for (const row of rows) {
        files[row.file_type] = row.content_json
      }
      setTruthFiles(files)
    }).catch(() => {})
  }, [bookId])

  const activeContent = truthFiles[activeTab] || '{}'

  const parsedContent = useMemo(() => {
    try {
      return JSON.parse(activeContent)
    } catch {
      return null
    }
  }, [activeContent])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !truthFiles) return []
    const results: Array<{ file: string; content: string }> = []
    const lower = searchQuery.toLowerCase()

    for (const name of TRUTH_FILE_NAMES) {
      const content = truthFiles[name] || ''
      if (content.toLowerCase().includes(lower)) {
        results.push({ file: TRUTH_FILE_LABELS[name], content: content.slice(0, 200) })
      }
    }
    return results
  }, [searchQuery, truthFiles])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div
        style={{
          width: '160px',
          flexShrink: 0,
          borderRight: '1px solid var(--app-border)',
          overflowY: 'auto',
          backgroundColor: 'var(--app-surface)',
        }}
      >
        <div style={{ padding: '8px', borderBottom: '1px solid var(--app-border)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索设定..."
            style={{
              width: '100%',
              padding: '4px 8px',
              borderRadius: 'var(--app-radius)',
              fontSize: '11px',
              border: '1px solid var(--app-border)',
              background: 'var(--app-input-bg)',
              color: 'var(--app-text-primary)',
              outline: 'none',
            }}
          />
        </div>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchQuery('') }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: activeTab === tab.key ? 'var(--app-bg-secondary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {searchQuery ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>
              搜索结果：{searchQuery} ({searchResults.length})
            </div>
            {searchResults.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--app-radius)',
                  fontSize: '12px',
                  backgroundColor: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--app-text-primary)' }}>{r.file}</div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--app-text-muted)' }}>
                  {r.content}
                </div>
              </div>
            ))}
            {searchResults.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>无匹配结果</div>
            )}
          </div>
        ) : parsedContent ? (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text-primary)' }}>
              {TAB_CONFIG.find((t) => t.key === activeTab)?.icon}{' '}
              {TRUTH_FILE_LABELS[activeTab]}
            </div>
            {renderStructuredValue(parsedContent)}
          </div>
        ) : (
          <div style={{ fontSize: '12px', padding: '24px', textAlign: 'center', color: 'var(--app-text-muted)' }}>
            此设定文件暂无数据
          </div>
        )}
      </div>
    </div>
  )
}
