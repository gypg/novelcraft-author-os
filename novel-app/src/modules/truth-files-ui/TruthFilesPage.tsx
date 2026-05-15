import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useBookshelfStore } from '@/modules'
import { TruthFileManager, TRUTH_FILE_LABELS, TRUTH_FILE_NAMES, type TruthFileName } from '@/core/truth-files'
import { logger } from '@/shared/utils/logger'

const manager = new TruthFileManager()

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

export function TruthFilesPage() {
  const location = useLocation()
  const state = location.state as { bookId?: string } | null
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const bookId = state?.bookId || selectedBookId

  const [activeTab, setActiveTab] = useState<TruthFileName>('current_state')
  const [jsonText, setJsonText] = useState('')
  const [editText, setEditText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; errors: { issues?: Array<{ message: string }> } | null }>({ valid: true, errors: null })
  const [saving, setSaving] = useState(false)

  function adaptValidation(v: { valid: boolean; errors: unknown }): { valid: boolean; errors: { issues?: Array<{ message: string }> } | null } {
    if (v.valid || !v.errors) return { valid: true, errors: null }
    const zodErr = v.errors as { errors?: Array<{ message: string }>; issues?: Array<{ message: string }> }
    return { valid: false, errors: { issues: zodErr.issues || zodErr.errors || [] } }
  }

  useEffect(() => {
    if (!bookId) return
    manager.loadFromDb(bookId).then(() => {
      const data = manager.get(activeTab)
      const json = manager.getJson(activeTab)
      setJsonText(json)
      setEditText(json)
      setValidation(manager.validate(activeTab, data))
    })
  }, [bookId, activeTab])

  const handleTabChange = (name: TruthFileName) => {
    setActiveTab(name)
    setIsEditing(false)
    const data = manager.get(name)
    const json = manager.getJson(name)
    setJsonText(json)
    setEditText(json)
    setValidation(manager.validate(name, data))
  }

  const handleSave = async () => {
    if (!bookId) return
    setSaving(true)
    try {
      const parsed = JSON.parse(editText)
      const result = manager.set(activeTab, parsed)
      if (result.valid) {
        await manager.saveToDb(bookId)
        setJsonText(editText)
        setIsEditing(false)
        logger.info('truth-files', `Saved ${activeTab}`)
      } else {
        setValidation(result)
      }
    } catch (err) {
      setValidation({ valid: false, errors: { issues: [{ message: `JSON 解析错误: ${err}` }] } })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setEditText(jsonText)
    setIsEditing(false)
    setValidation(adaptValidation(manager.validate(activeTab, manager.get(activeTab))))
  }

  const parsedContent = useMemo(() => {
    try {
      return JSON.parse(jsonText)
    } catch {
      return null
    }
  }, [jsonText])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--app-border)', flexShrink: 0, overflowX: 'auto' }}>
        {TRUTH_FILE_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => handleTabChange(name)}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              color: activeTab === name ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
              borderBottom: activeTab === name ? '2px solid var(--app-text-primary)' : '2px solid transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
            }}
          >
            {TRUTH_FILE_LABELS[name]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--app-border)', flexShrink: 0 }}>
        <div style={{ flex: 1 }} />

        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                borderRadius: 'var(--app-radius-sm)',
                fontWeight: 500,
                backgroundColor: 'var(--color-brand)',
                color: 'var(--app-text-inverse)',
                opacity: saving ? 0.4 : 1,
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleReset}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                borderRadius: 'var(--app-radius-sm)',
                color: 'var(--app-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              重置
            </button>
          </>
        ) : (
          <button
            onClick={() => { setIsEditing(true); setEditText(jsonText) }}
            style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: 'var(--app-radius-sm)',
              color: 'var(--app-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            编辑
          </button>
        )}
      </div>

      <div
        style={{
          padding: '6px 16px',
          fontSize: '11px',
          flexShrink: 0,
          backgroundColor: validation.valid ? 'var(--app-surface-subtle)' : 'var(--color-danger-dim)',
          color: validation.valid ? 'var(--app-text-muted)' : 'var(--color-danger)',
        }}
      >
        {validation.valid
          ? '✅ Schema 校验通过'
          : `❌ 校验失败：${validation.errors?.issues?.map((i) => i.message).join(', ') || '未知错误'}`}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value)
              try {
                const parsed = JSON.parse(e.target.value)
                setValidation(manager.validate(activeTab, parsed))
              } catch {
                setValidation({ valid: false, errors: { issues: [{ message: 'JSON 格式错误' }] } })
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.625,
              resize: 'none',
              outline: 'none',
              padding: 0,
              backgroundColor: 'transparent',
              color: 'var(--app-text-primary)',
              border: 'none',
            }}
            spellCheck={false}
          />
        ) : parsedContent ? (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text-primary)' }}>
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
