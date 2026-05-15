import { useState, useEffect } from 'react'
import { useEditorStore } from '@/modules'
import { OutlinePanel } from '@/modules/editor/OutlinePanel'
import { VersionHistoryPanel } from '@/modules/editor/VersionHistoryPanel'
import { AuditReportPanel } from '@/modules/ai-collab/AuditReportPanel'
import { useAuditStore } from '@/modules/ai-collab/audit-store'
import { ContextPanel } from '@/shared/components/ContextPanel'
import { ConstraintStatusPanel } from '@/modules/ai-collab/ConstraintStatusPanel'
import { CharacterProfilePanel } from '@/modules/characters/CharacterProfilePanel'
import { TimelinePanel } from '@/modules/timeline/TimelinePanel'
import { KnowledgeGraphPanel } from '@/modules/knowledge-graph/KnowledgeGraphPanel'
import {
  queryTemporalFactsAtChapter,
  type TemporalFactRow,
} from '@/core/db/temporal-memory-repository'
import { loadTruthFile } from '@/core/db/truth-file-repository'
import { eventBus } from '@/core/events'
import {
  BookOpen,
  FileText,
  BarChart3,
  Users,
  Clock,
  Shield,
  Network,
  Layers,
} from 'lucide-react'

const TABS = [
  { key: 'outline' as const, label: '大纲', icon: Layers },
  { key: 'character' as const, label: '角色', icon: Users },
  { key: 'timeline' as const, label: '时间线', icon: Clock },
  { key: 'knowledge' as const, label: '图谱', icon: Network },
  { key: 'versions' as const, label: '版本', icon: FileText },
  { key: 'audit' as const, label: '审计', icon: BarChart3 },
  { key: 'context' as const, label: '上下文', icon: BookOpen },
  { key: 'constraints' as const, label: '约束', icon: Shield },
]

interface RightPanelProps {
  bookId?: string | null
}

export function RightPanel({ bookId }: RightPanelProps) {
  const { rightPanelVisible, rightPanelTab, setRightPanelTab, currentChapterId } = useEditorStore()

  const [facts, setFacts] = useState<TemporalFactRow[]>([])
  const [characterMatrixJson, setCharacterMatrixJson] = useState<string>('')

  useEffect(() => {
    if (!bookId) return
    const chapterNum = currentChapterId ? 9999 : 9999
    Promise.all([
      queryTemporalFactsAtChapter(bookId, chapterNum).catch(() => []),
      loadTruthFile(bookId, 'character_matrix').catch(() => null),
    ]).then(([factsData, matrixData]) => {
      setFacts(factsData || [])
      setCharacterMatrixJson(matrixData?.content_json || '{}')
    })
  }, [bookId, currentChapterId])

  // Wire pipeline events to audit store
  useEffect(() => {
    const offStatus = eventBus.on('pipeline:status', (data) => {
      useAuditStore.getState().setPipelineStatus(data.status)
      useAuditStore.getState().setCurrentIteration(data.iteration)
    })

    const offReport = eventBus.on('pipeline:report:ready', (data) => {
      useAuditStore.getState().setReport(data.report)
      if (data.meta) useAuditStore.getState().addReportMeta(data.meta)
      useAuditStore.getState().setPipelineStatus('completed')
    })

    return () => { offStatus(); offReport() }
  }, [])

  if (!rightPanelVisible || !bookId) return null

  return (
    <aside
      style={{
        width: 'var(--right-panel-width)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-surface)',
        borderLeft: '1px solid var(--app-border)',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--app-border)',
          background: 'var(--app-surface)',
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = rightPanelTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setRightPanelTab(tab.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '8px 0',
                minWidth: '52px',
                flex: '1',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: isActive
                  ? '2px solid var(--color-brand)'
                  : '2px solid transparent',
                transition: 'all 0.15s ease',
                color: isActive ? 'var(--color-brand)' : 'var(--app-text-muted)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--app-text-primary)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--app-text-muted)'
              }}
            >
              <Icon size={15} />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 700 : 600,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rightPanelTab === 'outline' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <OutlinePanel bookId={bookId} />
          </div>
        )}

        {/* Character Profiles */}
        {rightPanelTab === 'character' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CharacterProfilePanel characterMatrixJson={characterMatrixJson} />
          </div>
        )}

        {/* Timeline */}
        {rightPanelTab === 'timeline' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TimelinePanel facts={facts} />
          </div>
        )}

        {/* Knowledge Graph */}
        {rightPanelTab === 'knowledge' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <KnowledgeGraphPanel
              facts={facts}
              characterMatrixJson={characterMatrixJson}
            />
          </div>
        )}

        {/* Version History */}
        {rightPanelTab === 'versions' && currentChapterId && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <VersionHistoryPanel chapterId={currentChapterId} />
          </div>
        )}
        {rightPanelTab === 'versions' && !currentChapterId && (
          <EmptyState message="请先打开一个章节查看版本历史" />
        )}

        {/* Audit + Constraints */}
        {rightPanelTab === 'audit' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <AuditReportPanel />
            </div>
            <div style={{ borderTop: '1px solid var(--app-border)', flexShrink: 0, maxHeight: '40%', overflow: 'auto' }}>
              <ConstraintStatusPanel bookId={bookId} />
            </div>
          </div>
        )}

        {/* Context */}
        {rightPanelTab === 'context' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ContextPanel />
          </div>
        )}

        {/* Constraints (standalone) */}
        {rightPanelTab === 'constraints' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ConstraintStatusPanel bookId={bookId} />
          </div>
        )}
      </div>
    </aside>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '24px',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'var(--app-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--app-text-muted)',
          fontSize: '18px',
        }}
      >
        📋
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--app-text-muted)',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {message}
      </div>
    </div>
  )
}
