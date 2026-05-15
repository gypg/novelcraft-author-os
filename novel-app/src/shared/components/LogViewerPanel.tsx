import { useState, useEffect, useRef, useCallback } from 'react'
import { readLogs } from '@/shared/utils/logger'
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  timestamp: string
  raw: string
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'var(--app-text-muted)',
  INFO: 'var(--color-brand)',
  WARN: 'var(--color-warning)',
  ERROR: 'var(--color-danger)',
  CRITICAL: 'var(--color-danger)',
}

const LEVEL_BG: Record<LogLevel, string> = {
  DEBUG: 'transparent',
  INFO: 'transparent',
  WARN: 'var(--color-warning-light)',
  ERROR: 'var(--color-danger-light)',
  CRITICAL: 'var(--color-danger-light)',
}

function parseLogLevel(raw: string): LogLevel {
  const upper = raw.toUpperCase()
  if (upper in LEVEL_COLORS) return upper as LogLevel
  return 'INFO'
}

function parseLogLine(line: string): LogEntry | null {
  if (!line.trim()) return null

  const match = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\]?\s*\[?(\w+)\]?\s*\[?([^\]]*)\]?:?\s*(.*)$/)
  if (match) {
    return {
      timestamp: match[1],
      level: parseLogLevel(match[2]),
      module: match[3].trim(),
      message: match[4].trim(),
      raw: line,
    }
  }

  const levelMatch = line.match(/\b(DEBUG|INFO|WARN|ERROR|CRITICAL)\b/i)
  if (levelMatch) {
    return {
      timestamp: '',
      level: parseLogLevel(levelMatch[1]),
      module: '',
      message: line.trim(),
      raw: line,
    }
  }

  return {
    timestamp: '',
    level: 'INFO',
    module: '',
    message: line.trim(),
    raw: line,
  }
}

const LEVEL_FILTERS: { key: LogLevel; label: string }[] = [
  { key: 'DEBUG', label: 'Debug' },
  { key: 'INFO', label: 'Info' },
  { key: 'WARN', label: 'Warn' },
  { key: 'ERROR', label: 'Error' },
  { key: 'CRITICAL', label: 'Critical' },
]

export function LogViewerPanel() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(['INFO', 'WARN', 'ERROR', 'CRITICAL']))
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await readLogs(500)
      const lines = raw.split('\n').filter(Boolean)
      const parsed = lines.map(parseLogLine).filter((e): e is LogEntry => e !== null)
      setEntries(parsed)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const raw = await readLogs(500)
        if (cancelled) return
        const lines = raw.split('\n').filter(Boolean)
        const parsed = lines.map(parseLogLine).filter((e): e is LogEntry => e !== null)
        setEntries(parsed)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    if (autoRefresh) {
      timerRef.current = setInterval(load, 5000)
    }
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, autoRefresh])

  const toggleLevel = (level: LogLevel) => {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const filtered = entries.filter((e) => {
    if (!levelFilter.has(e.level)) return false
    if (search) {
      const lower = search.toLowerCase()
      return (
        e.message.toLowerCase().includes(lower) ||
        e.module.toLowerCase().includes(lower) ||
        e.raw.toLowerCase().includes(lower)
      )
    }
    return true
  })

  const errorCount = entries.filter((e) => e.level === 'ERROR' || e.level === 'CRITICAL').length
  const warnCount = entries.filter((e) => e.level === 'WARN').length

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--bottombar-height)',
        left: 0,
        right: 0,
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--app-surface)',
        borderTop: '1px solid var(--app-border)',
        boxShadow: open ? '0 -4px 16px rgba(0, 0, 0, 0.1)' : 'none',
        height: open ? '300px' : 'auto',
        transition: 'height 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Toggle bar */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 14px',
          cursor: 'pointer',
          flexShrink: 0,
          background: 'var(--app-surface-subtle)',
          borderBottom: open ? '1px solid var(--app-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)' }}>
          <span>日志</span>
          {errorCount > 0 && (
            <span style={{ padding: '1px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontSize: '9px' }}>
              {errorCount} 错误
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ padding: '1px 6px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-warning-light)', color: 'var(--color-warning)', fontSize: '9px' }}>
              {warnCount} 警告
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {open && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); fetchLogs() }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: '2px' }}
                title="刷新"
              >
                <RefreshCw size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAutoRefresh(!autoRefresh) }}
                style={{
                  border: 'none',
                  background: autoRefresh ? 'var(--color-brand-light)' : 'transparent',
                  cursor: 'pointer',
                  color: autoRefresh ? 'var(--color-brand)' : 'var(--app-text-muted)',
                  padding: '1px 6px',
                  borderRadius: 'var(--app-radius-full)',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {autoRefresh ? '自动' : '手动'}
              </button>
            </>
          )}
          {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </div>
      </div>

      {/* Log content */}
      {open && (
        <>
          {/* Filter bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderBottom: '1px solid var(--app-border)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: '3px' }}>
              {LEVEL_FILTERS.map((lf) => (
                <button
                  key={lf.key}
                  onClick={() => toggleLevel(lf.key)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 'var(--app-radius-full)',
                    border: 'none',
                    background: levelFilter.has(lf.key) ? LEVEL_BG[lf.key] || 'var(--app-surface-subtle)' : 'transparent',
                    color: levelFilter.has(lf.key) ? LEVEL_COLORS[lf.key] : 'var(--app-text-muted)',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: levelFilter.has(lf.key) ? 1 : 0.4,
                  }}
                >
                  {lf.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索日志..."
              style={{
                flex: 1,
                padding: '3px 8px',
                borderRadius: 'var(--app-radius-md)',
                border: '1px solid var(--app-border)',
                background: 'var(--app-input-bg)',
                color: 'var(--app-text-primary)',
                fontSize: '10px',
                outline: 'none',
                minWidth: 0,
              }}
            />
            <span style={{ fontSize: '9px', color: 'var(--app-text-muted)', flexShrink: 0 }}>
              {filtered.length}/{entries.length}
            </span>
          </div>

          {/* Log lines */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px 0',
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
              fontSize: '10px',
              lineHeight: 1.6,
            }}
          >
            {loading && entries.length === 0 && (
              <div style={{ padding: '12px 14px', color: 'var(--app-text-muted)' }}>加载中...</div>
            )}
            {filtered.length === 0 && !loading && (
              <div style={{ padding: '12px 14px', color: 'var(--app-text-muted)' }}>无匹配日志</div>
            )}
            {filtered.map((entry, i) => (
              <div
                key={i}
                style={{
                  padding: '1px 14px',
                  background: LEVEL_BG[entry.level],
                  borderLeft: `2px solid ${LEVEL_COLORS[entry.level]}`,
                  color: 'var(--app-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={entry.raw}
              >
                {entry.timestamp && (
                  <span style={{ color: 'var(--app-text-muted)', marginRight: '8px' }}>
                    {entry.timestamp.replace(/^\d{4}-/, '').replace('T', ' ').replace('Z', '')}
                  </span>
                )}
                <span style={{ color: LEVEL_COLORS[entry.level], fontWeight: 700, marginRight: '6px' }}>
                  [{entry.level}]
                </span>
                {entry.module && (
                  <span style={{ color: 'var(--color-info)', marginRight: '6px' }}>
                    [{entry.module}]
                  </span>
                )}
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
