import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useBookshelfStore } from '@/modules'
import { queryTemporalFactsAtChapter, type TemporalFactRow } from '@/core/db/temporal-memory-repository'
import { TimelinePanel } from './TimelinePanel'
import { PageLoading } from '@/shared/components/PageLoading'
import { EmptyState } from '@/shared/components/EmptyState'

export function TimelinePage() {
  const { selectedBookId } = useBookshelfStore()
  const [facts, setFacts] = useState<TemporalFactRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedBookId) return
    let cancelled = false
    queryTemporalFactsAtChapter(selectedBookId, 9999)
      .then((data) => { if (!cancelled) setFacts(data || []) })
      .catch(() => { if (!cancelled) setFacts([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedBookId])

  if (!selectedBookId) {
    return (
      <EmptyState
        icon={<Clock size={28} />}
        title="请先选择书籍"
        description="从书架选择一本书后，即可查看时间线"
      />
    )
  }

  if (loading) {
    return <PageLoading message="加载时间线..." />
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
          ⏱
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
            时间线
          </div>
          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
            {loading ? '加载中...' : `基于时序记忆的事件时间线 · 矛盾检测`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TimelinePanel facts={facts} />
      </div>
    </div>
  )
}
