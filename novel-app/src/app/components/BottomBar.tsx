import { useBookshelfStore, useEditorStore } from '@/modules'
import { useNetworkStatus } from '@/shared/hooks/use-network-status'
import { useWritingStats } from '@/shared/hooks/use-writing-stats'
import { Save, Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export function BottomBar() {
  const { selectedBookId, books } = useBookshelfStore()
  const { wordCount, isDirty, saveStatus, saveError } = useEditorStore()
  const networkStatus = useNetworkStatus()
  const { todayWords, sessionDuration } = useWritingStats()
  const book = books.find((b) => b.id === selectedBookId)
  const targetWords = book?.target_daily_words || 0
  const progress = targetWords > 0 ? Math.min((todayWords / targetWords) * 100, 100) : 0

  const saveIndicator = (() => {
    switch (saveStatus) {
      case 'saving':
        return { icon: <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />, label: '保存中...', color: 'var(--color-brand)' }
      case 'saved':
        return { icon: <CheckCircle2 size={11} />, label: '已保存', color: 'var(--color-success)' }
      case 'error':
        return { icon: <AlertCircle size={11} />, label: saveError ? `保存失败: ${saveError.slice(0, 30)}` : '保存失败', color: 'var(--color-danger)' }
      default:
        return isDirty
          ? { icon: <Save size={11} />, label: '未保存', color: 'var(--color-warning)' }
          : { icon: <Save size={11} />, label: '已保存', color: 'var(--color-success)' }
    }
  })()

  return (
    <footer
      style={{
        height: 'var(--bottombar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--app-surface)',
        borderTop: '1px solid var(--app-border)',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--app-text-muted)',
        gap: '16px',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {saveIndicator.icon}
          <span style={{ color: saveIndicator.color }}>
            {saveIndicator.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{wordCount.toLocaleString()} 字</span>
        </div>

        {todayWords > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>今日 +{todayWords.toLocaleString()}</span>
          </div>
        )}

        {sessionDuration > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} />
            <span>{sessionDuration >= 60 ? `${Math.floor(sessionDuration / 60)}h${sessionDuration % 60}m` : `${sessionDuration}m`}</span>
          </div>
        )}

        {targetWords > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎯 {targetWords.toLocaleString()}</span>
            <div
              style={{
                width: '44px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--app-surface-subtle)',
                border: '1px solid var(--app-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '2px',
                  background:
                    progress >= 100
                      ? 'var(--color-success)'
                      : progress >= 60
                        ? 'var(--color-brand)'
                        : 'var(--color-warning)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span>{Math.round(progress)}%</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {book && (
          <span
            style={{
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--app-text-muted)',
            }}
          >
            {book.title}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {networkStatus.online ? <Wifi size={11} /> : <WifiOff size={11} />}
          <span style={{ color: networkStatus.online ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {networkStatus.online ? '在线' : '离线'}
          </span>
        </div>
      </div>
    </footer>
  )
}
