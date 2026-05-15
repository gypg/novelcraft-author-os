import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useBookshelfStore } from '@/modules'
import { queryTemporalFactsAtChapter, type TemporalFactRow } from '@/core/db/temporal-memory-repository'
import { loadTruthFile } from '@/core/db/truth-file-repository'
import { KnowledgeGraphPanel } from './KnowledgeGraphPanel'
import { PageLoading } from '@/shared/components/PageLoading'
import { EmptyState } from '@/shared/components/EmptyState'

export function KnowledgeGraphPage() {
  const { selectedBookId } = useBookshelfStore()
  const [facts, setFacts] = useState<TemporalFactRow[]>([])
  const [matrixJson, setMatrixJson] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedBookId) return
    let cancelled = false
    Promise.all([
      queryTemporalFactsAtChapter(selectedBookId, 9999).catch(() => []),
      loadTruthFile(selectedBookId, 'character_matrix').catch(() => null),
    ]).then(([factsData, matrixData]) => {
      if (cancelled) return
      setFacts(factsData || [])
      setMatrixJson(matrixData?.content_json || '{}')
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedBookId])

  if (!selectedBookId) {
    return (
      <EmptyState
        icon={<Globe size={28} />}
        title="请先选择书籍"
        description="从书架选择一本书后，即可查看知识图谱"
      />
    )
  }

  if (loading) {
    return <PageLoading message="加载知识图谱..." />
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--app-page-bg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 28px 16px',
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--app-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--color-brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-brand)',
            fontSize: '18px',
          }}
        >
          🌐
        </div>
        <div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--app-text-primary)',
            }}
          >
            知识图谱
          </div>
          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
            {loading ? '加载中...' : `${facts.length} 条事实 · 角色/地点/物品/事件关系网络`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <KnowledgeGraphPanel facts={facts} characterMatrixJson={matrixJson} />
      </div>
    </div>
  )
}
