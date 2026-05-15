import { useState, useEffect, useRef } from 'react'
import { readLogs } from '@/shared/utils/logger'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'oklch(0.6 0.12 250)',
  INFO: 'oklch(0.6 0.15 180)',
  WARN: 'oklch(0.75 0.15 80)',
  ERROR: 'oklch(0.6 0.22 25)',
}

const ALL_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
}

function parseLogLine(line: string): LogEntry | null {
  const match = line.match(/\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]\s\[(\w+)\]\s\[(\w+)\]\s(.*)/)
  if (!match) return null

  return {
    timestamp: match[1],
    level: match[2] as LogLevel,
    module: match[3],
    message: match[4],
  }
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<Set<LogLevel>>(new Set(ALL_LEVELS))
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadLogs = async () => {
    try {
      const raw = await readLogs(200)
      const parsed = raw
        .split('\n')
        .map(parseLogLine)
        .filter((l): l is LogEntry => l !== null)
      setLogs(parsed)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const raw = await readLogs(200)
        const parsed = raw
          .split('\n')
          .map(parseLogLine)
          .filter((l): l is LogEntry => l !== null)
        setLogs(parsed)
      } catch {
        // ignore
      }
    }
    loadInitial()
    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const toggleLevel = (level: LogLevel) => {
    setFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  const filtered = logs.filter((log) => {
    if (!filter.has(log.level)) return false
    if (search && !log.message.toLowerCase().includes(search.toLowerCase()) && !log.module.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  const handleExport = () => {
    const text = filtered
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.module}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `novelcraft-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderColor: 'var(--app-border)' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {ALL_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: 'var(--app-radius)',
                fontWeight: 500,
                transition: 'color 0.15s',
                backgroundColor: filter.has(level) ? `${LEVEL_COLORS[level]}20` : 'var(--app-bg-secondary)',
                color: filter.has(level) ? LEVEL_COLORS[level] : 'var(--app-text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {level}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日志..."
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 'var(--app-radius)',
              fontSize: '11px',
              borderWidth: '1px',
              borderStyle: 'solid',
              outline: 'none',
              backgroundColor: 'var(--app-input-bg)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-primary)',
            }}
          />
          <button
            onClick={handleExport}
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: 'var(--app-radius)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-muted)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            导出
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', cursor: 'pointer', color: 'var(--app-text-muted)' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          自动滚动
        </label>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--app-text-muted)' }}>
            暂无日志
          </div>
        ) : (
          filtered.map((log, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                padding: '2px 12px',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderColor: 'var(--app-border)',
              }}
            >
              <span style={{ flexShrink: 0, width: '140px', color: 'var(--app-text-muted)' }}>
                {log.timestamp}
              </span>
              <span
                style={{ flexShrink: 0, width: '50px', fontWeight: 500, color: LEVEL_COLORS[log.level] }}
              >
                {log.level}
              </span>
              <span style={{ flexShrink: 0, width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--app-text-muted)' }}>
                [{log.module}]
              </span>
              <span style={{ flex: 1, color: 'var(--app-text-primary)' }}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '6px 12px', borderTopWidth: '1px', borderTopStyle: 'solid', borderColor: 'var(--app-border)', fontSize: '10px', display: 'flex', justifyContent: 'space-between', color: 'var(--app-text-muted)' }}>
        <span>{filtered.length} / {logs.length} 条</span>
        <button onClick={loadLogs} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', font: 'inherit' }}>刷新</button>
      </div>
    </div>
  )
}
