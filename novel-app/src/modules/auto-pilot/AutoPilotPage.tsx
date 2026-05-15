import { useEffect, useCallback } from 'react'
import { useAutoPilotStore } from './store'
import { autoPilot } from '@/core/scheduler/auto-pilot'
import { listChapters } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'
import { useBookshelfStore } from '@/modules'
import { Play, Square, Settings, ScrollText, BookOpen, AlertTriangle } from 'lucide-react'

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    idle: { bg: 'var(--muted)', text: 'var(--muted-foreground)', label: '空闲' },
    planning: { bg: 'oklch(0.7 0.12 250 / 0.2)', text: 'oklch(0.5 0.12 250)', label: '规划中' },
    writing: { bg: 'oklch(0.7 0.12 145 / 0.2)', text: 'oklch(0.5 0.12 145)', label: '写作中' },
    auditing: { bg: 'oklch(0.7 0.15 80 / 0.2)', text: 'oklch(0.5 0.15 80)', label: '审计中' },
    revising: { bg: 'oklch(0.7 0.18 30 / 0.2)', text: 'oklch(0.5 0.18 30)', label: '修订中' },
    paused: { bg: 'oklch(0.7 0.15 80 / 0.2)', text: 'oklch(0.5 0.15 80)', label: '已暂停' },
    completed: { bg: 'oklch(0.7 0.17 145 / 0.2)', text: 'oklch(0.5 0.17 145)', label: '已完成' },
  }
  const c = colors[state] || colors.idle

  return (
    <span
      style={{
        fontSize: '11px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {c.label}
    </span>
  )
}

export function AutoPilotPage() {
  const { status, config, logs, refreshStatus, refreshLogs, updateConfig } = useAutoPilotStore()
  const { selectedBookId, selectedBookTitle } = useBookshelfStore()

  useEffect(() => {
    autoPilot.setBookId(selectedBookId, selectedBookTitle ?? undefined)
    refreshStatus()
  }, [selectedBookId, selectedBookTitle, refreshStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      if (status.state !== 'idle' && status.state !== 'completed') {
        refreshStatus()
        refreshLogs()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [status.state, refreshStatus, refreshLogs])

  const handleStart = useCallback(async () => {
    if (!status.bookId) {
      logger.warn('auto-pilot', 'No book selected')
      return
    }

    try {
      const chapters = await listChapters(status.bookId)
      if (chapters.length === 0) {
        logger.warn('auto-pilot', 'No chapters found')
        return
      }

      autoPilot.setConfig(config)
      autoPilot.start(
        status.bookId,
        status.bookTitle || '未命名',
        chapters.map((c) => ({ id: c.id, title: c.title, orderIndex: c.order_index })),
        status.currentChapter,
      )

      const poll = setInterval(() => {
        refreshStatus()
        refreshLogs()
        const s = autoPilot.getStatus()
        if (s.state === 'idle' || s.state === 'completed' || s.state === 'paused') {
          clearInterval(poll)
        }
      }, 2000)
    } catch (err) {
      logger.error('auto-pilot', `Start failed: ${err}`)
    }
  }, [status.bookId, status.bookTitle, status.currentChapter, config, refreshStatus, refreshLogs])

  const handleStop = useCallback(() => {
    autoPilot.stop()
    refreshStatus()
    refreshLogs()
  }, [refreshStatus, refreshLogs])

  const isRunning = status.state !== 'idle' && status.state !== 'completed'
  const progress = status.totalChapters > 0 ? (status.currentChapter / status.totalChapters) * 100 : 0

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--app-page-bg)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--app-text-primary)', letterSpacing: '-0.02em' }}>
              自动驾驶
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
              AI 自主完成章节写作、审计与修订
            </p>
          </div>
          <StateBadge state={status.state} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: 'var(--app-radius-xl)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'oklch(0.7 0.12 145 / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={15} style={{ color: 'oklch(0.5 0.12 145)' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>写作进度</span>
            </div>

            {status.bookTitle && (
              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>
                {status.bookTitle}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--app-text-primary)', lineHeight: 1 }}>
                  {status.currentChapter}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--app-text-muted)' }}> / {status.totalChapters}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>章节</div>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--app-text-primary)', lineHeight: 1 }}>
                  {status.todayChapters}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--app-text-muted)' }}> / {config.maxChaptersPerDay}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>今日</div>
              </div>
            </div>

            <div style={{ height: '6px', borderRadius: '9999px', background: 'var(--app-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.5s ease',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, oklch(0.65 0.17 145), oklch(0.6 0.15 180))',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: 'var(--app-radius-xl)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'oklch(0.7 0.12 250 / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={15} style={{ color: 'oklch(0.5 0.12 250)' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>运行配置</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
              {[
                { label: '每日上限', key: 'maxChaptersPerDay' as const, value: config.maxChaptersPerDay, fallback: 5 },
                { label: '章间冷却(ms)', key: 'cooldownMs' as const, value: config.cooldownMs, fallback: 5000 },
                { label: '最小字数', key: 'wordCountMin' as const, value: config.wordCountMin, fallback: 2000 },
                { label: '最大字数', key: 'wordCountMax' as const, value: config.wordCountMax, fallback: 5000 },
              ].map((item) => (
                <label key={item.key} style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
                  {item.label}
                  <input
                    type="number"
                    value={item.value}
                    onChange={(e) => updateConfig({ [item.key]: parseInt(e.target.value) || item.fallback })}
                    style={{
                      display: 'block',
                      marginTop: '4px',
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: '1px solid var(--app-border)',
                      background: 'var(--app-input-bg, var(--app-surface))',
                      color: 'var(--app-text-primary)',
                      outline: 'none',
                    }}
                  />
                </label>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--app-text-muted)', marginTop: '12px' }}>
              <input
                type="checkbox"
                checked={config.autoApprove}
                onChange={(e) => updateConfig({ autoApprove: e.target.checked })}
              />
              自动通过审计（跳过人工审查）
            </label>
          </div>
        </div>

        {status.consecutiveFailures > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--app-radius-lg)',
              background: 'oklch(0.7 0.15 80 / 0.1)',
              border: '1px solid oklch(0.7 0.15 80 / 0.2)',
              marginBottom: '20px',
              fontSize: '12px',
              color: 'oklch(0.5 0.15 80)',
            }}
          >
            <AlertTriangle size={14} />
            连续失败 {status.consecutiveFailures} 次
            {status.lastError && (
              <span style={{ marginLeft: '8px', opacity: 0.8 }}>: {status.lastError.slice(0, 60)}</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={isRunning ? handleStop : handleStart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: 'var(--app-radius-lg)',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isRunning ? 'var(--color-danger)' : 'oklch(0.65 0.17 145)',
              color: 'white',
            }}
          >
            {isRunning ? <Square size={14} /> : <Play size={14} />}
            {isRunning ? '停止' : '启动自动驾驶'}
          </button>
        </div>

        <div
          style={{
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: 'var(--app-radius-xl)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderBottom: '1px solid var(--app-border)',
            }}
          >
            <ScrollText size={14} style={{ color: 'var(--app-text-muted)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>实时日志</span>
            {logs.length > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginLeft: 'auto' }}>
                {logs.length} 条
              </span>
            )}
          </div>
          <div
            style={{
              padding: '12px 16px',
              maxHeight: '280px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: 1.7,
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
                暂无日志，启动后将显示实时输出
              </div>
            ) : (
              logs.slice(-50).map((log, i) => (
                <div
                  key={i}
                  style={{
                    color: log.level === 'error' ? 'var(--color-danger)' : log.level === 'warn' ? 'oklch(0.6 0.15 80)' : 'var(--app-text-muted)',
                  }}
                >
                  <span style={{ opacity: 0.6 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
