import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus, Trash2, Eye, Loader2, CheckCircle2, XCircle,
  Palette, Bot, Settings as SettingsIcon, Download, Upload,
} from 'lucide-react'
import { useThemeStore } from './store'
import { useBookshelfStore } from '@/modules'
import { ProviderHealthBadge } from '@/shared/components/ProviderHealthBadge'
import {
  listProviders, createProvider, updateProvider, deleteProvider, testProvider, fetchModels,
  DIRECT_PROVIDERS, TOKENPLAN_PROVIDERS, getModelLabel, getPresetByType, type LlmProviderRow, type CreateProviderInput,
} from '@/core/ai-engine'
import { exportBookData, importBookData, listBooks, type BookRow } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'

const TABS = [
  { key: 'appearance', label: '外观', icon: Palette },
  { key: 'ai-model', label: 'AI 模型', icon: Bot },
  { key: 'advanced', label: '高级', icon: SettingsIcon },
] as const

const THEME_OPTIONS = [
  { value: 'minimal-white' as const, label: '极简白', colors: ['#ffffff', '#f1f5f9', '#1f2937'] },
  { value: 'dark' as const, label: '深色', colors: ['#0f172a', '#1e293b', '#e2e8f0'] },
  { value: 'warm' as const, label: '暖色', colors: ['#fffaf5', '#fef3e2', '#3d3229'] },
]

function safeParseModels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((m): m is string => typeof m === 'string')
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

function ProviderCard({ p, onEdit, onDelete }: { p: LlmProviderRow; onEdit: () => void; onDelete: () => void }) {
  const models = useMemo(() => safeParseModels(p.models), [p.models])
  const preset = getPresetByType(p.provider_type)
  const typeColor = preset?.color || 'var(--app-text-muted)'
  const typeIcon = preset?.icon || '🔧'

  const healthProvider = useMemo(() => ({
    name: p.name, provider_type: p.provider_type, base_url: p.base_url, api_key: p.api_key, models,
  }), [p.name, p.provider_type, p.base_url, p.api_key, models])

  return (
    <div
      style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        borderRadius: 'var(--app-radius-xl)',
        padding: '16px 18px',
        boxShadow: 'var(--app-shadow-sm)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--app-shadow-lg)'
        e.currentTarget.style.borderColor = 'var(--color-brand-border)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--app-shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--app-border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          background: `linear-gradient(180deg, ${typeColor} 0%, transparent 100%)`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '4px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${typeColor}15`,
            border: `1px solid ${typeColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {typeIcon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              {p.name || '未命名'}
            </span>
            <ProviderHealthBadge provider={healthProvider} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {models.length > 0
              ? `${models.slice(0, 3).map((m) => getModelLabel(m, p.provider_type)).join(', ')}${models.length > 3 ? ` +${models.length - 3}` : ''}`
              : '未配置模型'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={onEdit}
            className="btn-icon"
            style={{ width: '30px', height: '30px', color: 'var(--app-text-muted)' }}
            title="编辑"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onDelete}
            className="btn-icon"
            style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function DataBackupSection() {
  const [books, setBooks] = useState<BookRow[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listBooks().then((list) => {
      setBooks(list)
      if (list.length > 0) setSelectedBookId(list[0].id)
    }).catch(() => {})
  }, [])

  const handleExport = async () => {
    if (!selectedBookId) return
    setExporting(true)
    setMessage(null)
    try {
      const json = await exportBookData(selectedBookId)
      const book = books.find((b) => b.id === selectedBookId)
      const filename = `${(book?.title || 'novelcraft').replace(/[<>:"/\\|?*]/g, '_')}_backup.json`
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: '导出成功' })
    } catch (err) {
      setMessage({ type: 'error', text: `导出失败：${err}` })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    setMessage(null)
    try {
      const json = await file.text()
      const bookId = await importBookData(json, false)
      const list = await listBooks()
      setBooks(list)
      setSelectedBookId(bookId)
      setMessage({ type: 'success', text: '导入成功' })
    } catch (err) {
      const msg = String(err)
      if (msg.includes('already exists')) {
        try {
          const json = await file.text()
          await importBookData(json, true)
          const list = await listBooks()
          setBooks(list)
          setMessage({ type: 'success', text: '导入成功（已覆盖）' })
        } catch (err2) {
          setMessage({ type: 'error', text: `导入失败：${err2}` })
        }
      } else {
        setMessage({ type: 'error', text: `导入失败：${err}` })
      }
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        <select
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface-subtle)',
            color: 'var(--app-text-primary)',
            fontSize: '12px',
            outline: 'none',
          }}
        >
          {books.length === 0 && <option value="">暂无书籍</option>}
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          disabled={exporting || !selectedBookId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--app-radius-md)',
            border: 'none',
            background: 'var(--color-brand)',
            color: 'var(--app-text-inverse)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: exporting || !selectedBookId ? 'not-allowed' : 'pointer',
            opacity: exporting || !selectedBookId ? 0.5 : 1,
          }}
        >
          {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          导出
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface-subtle)',
            color: 'var(--app-text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: importing ? 'not-allowed' : 'pointer',
            opacity: importing ? 0.5 : 1,
          }}
        >
          {importing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
          导入备份
        </button>

        {message && (
          <span style={{
            fontSize: '11px',
            color: message.type === 'success' ? 'var(--color-status-success-icon)' : 'var(--color-status-error-icon)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {message.type === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
function ProviderForm({ onSave, testResult, testing, onTest, onChange, form, modelsInput, onModelsChange, fetchingModels, onFetchModels }: {
  onSave: () => void
  testResult: { ok: boolean; msg: string } | null
  testing: boolean
  onTest: () => void
  onChange: (f: CreateProviderInput) => void
  form: CreateProviderInput
  modelsInput: string
  onModelsChange: (v: string) => void
  fetchingModels: boolean
  onFetchModels: () => void
}) {
  const allPresets = [...DIRECT_PROVIDERS, ...TOKENPLAN_PROVIDERS]
  const [presetQuery, setPresetQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const normalizedQuery = presetQuery.trim().toLowerCase()

  const handleSelectPreset = (preset: typeof allPresets[number]) => {
    const updated = { ...form, provider_type: preset.type }
    if (preset.baseUrl) {
      updated.base_url = preset.baseUrl
    }
    if (preset.models.length > 0) {
      updated.models = preset.models.map((m) => m.id)
      onModelsChange(preset.models.map((m) => m.id).join(', '))
    }
    if (!form.name) {
      updated.name = preset.label
    }
    onChange(updated)
  }

  const matchPreset = (preset: typeof allPresets[number]) => {
    if (!normalizedQuery) return true
    return (
      preset.label.toLowerCase().includes(normalizedQuery) ||
      preset.type.toLowerCase().includes(normalizedQuery) ||
      (preset.apiFormat ?? '').toLowerCase().includes(normalizedQuery)
    )
  }

  const renderPresetGroup = (label: string, presets: typeof allPresets) => {
    const filtered = presets.filter(matchPreset)
    if (filtered.length === 0) return null
    const isCollapsed = collapsedGroups[label] && !normalizedQuery // 搜索时强制展开
    return (
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={() => setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)',
            marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
          aria-expanded={!isCollapsed}
        >
          <span style={{ display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▾</span>
          <span>{label}</span>
          <span style={{ color: 'var(--app-text-muted)', opacity: 0.6 }}>
            ({filtered.length}{normalizedQuery ? `/${presets.length}` : ''})
          </span>
        </button>
        {!isCollapsed && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {filtered.map((preset) => (
              <button
                key={preset.type}
                onClick={() => handleSelectPreset(preset)}
                title={`${preset.label}（${preset.apiFormat ?? 'openai'}）`}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--app-radius)',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: form.provider_type === preset.type ? `${preset.color}20` : 'var(--app-bg-secondary)',
                  color: form.provider_type === preset.type ? preset.color : 'var(--app-text-muted)',
                  border: form.provider_type === preset.type ? `1px solid ${preset.color}40` : '1px solid var(--app-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{preset.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const currentPreset = allPresets.find((pr) => pr.type === form.provider_type)
  const presetModels = currentPreset?.models || []
  const totalFiltered = allPresets.filter(matchPreset).length

  return (
    <div
      style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        borderRadius: 'var(--app-radius-xl)',
        padding: '20px',
        boxShadow: 'var(--app-shadow-md)',
        marginTop: '12px',
      }}
    >
      {/* 搜索 + 当前选中状态 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ position: 'relative', marginBottom: '6px' }}>
          <input
            type="text"
            value={presetQuery}
            onChange={(e) => setPresetQuery(e.target.value)}
            placeholder={`搜索 ${allPresets.length} 个 Provider（名称/类型/协议格式）...`}
            style={{
              width: '100%',
              padding: '7px 28px 7px 10px',
              fontSize: '12px',
              backgroundColor: 'var(--app-bg-secondary)',
              border: '1px solid var(--app-border)',
              borderRadius: 'var(--app-radius)',
              color: 'var(--app-text)',
              outline: 'none',
            }}
          />
          {presetQuery && (
            <button
              onClick={() => setPresetQuery('')}
              style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', color: 'var(--app-text-muted)', padding: '0 4px',
              }}
              aria-label="清除搜索"
            >×</button>
          )}
        </div>
        {currentPreset && (
          <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
            当前选中：<span style={{ color: currentPreset.color, fontWeight: 600 }}>
              {currentPreset.icon} {currentPreset.label}
            </span>
            <span style={{ marginLeft: '6px', opacity: 0.6 }}>({currentPreset.apiFormat ?? 'openai'} 协议)</span>
          </div>
        )}
        {normalizedQuery && totalFiltered === 0 && (
          <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontStyle: 'italic' }}>
            未找到匹配的 Provider，请尝试其他关键字
          </div>
        )}
      </div>

      {renderPresetGroup('普通提供商（直连 API）', DIRECT_PROVIDERS)}
      {renderPresetGroup('Token 计划（聚合网关）', TOKENPLAN_PROVIDERS)}

      {[
        { label: '名称', key: 'name', placeholder: '如：我的 DeepSeek', type: 'text' },
        { label: 'Base URL', key: 'base_url', placeholder: 'https://api.deepseek.com/v1', type: 'text' },
        { label: 'API Key', key: 'api_key', placeholder: 'sk-...', type: 'password' },
      ].map(({ label, key, placeholder, type }) => (
        <div key={key} style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label} *
          </label>
          <input
            type={type}
            placeholder={placeholder}
            value={((form as unknown as Record<string, unknown>)[key] as string) || ''}
            onChange={(e) => onChange({ ...form, [key]: e.target.value })}
            className="input"
            autoComplete="off"
          />
        </div>
      ))}

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          模型
        </label>
        {presetModels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {presetModels.map((m) => {
              const isSelected = form.models.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    const newModels = isSelected
                      ? form.models.filter((id) => id !== m.id)
                      : [...form.models, m.id]
                    onChange({ ...form, models: newModels })
                    onModelsChange(newModels.join(', '))
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--app-radius)',
                    fontSize: '11px',
                    backgroundColor: isSelected ? 'var(--color-brand)' : 'var(--app-bg-secondary)',
                    color: isSelected ? '#fff' : 'var(--app-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="自定义模型（逗号分隔）"
            value={modelsInput}
            onChange={(e) => onModelsChange(e.target.value)}
            className="input"
            style={{ flex: 1 }}
            autoComplete="off"
          />
          <button
            onClick={onFetchModels}
            disabled={fetchingModels || !form.base_url || !form.api_key}
            className="btn-ghost"
            style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '11px', opacity: fetchingModels || !form.base_url || !form.api_key ? 0.5 : 1 }}
            title="从 API 自动获取可用模型列表"
          >
            {fetchingModels ? <Loader2 size={12} className="spin" /> : '获取'}
          </button>
        </div>
      </div>

      {testResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: 'var(--app-radius-md)',
            background: testResult.ok ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            color: testResult.ok ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '12px',
            marginBottom: '14px',
          }}
        >
          {testResult.ok ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '1px' }} /> : <XCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />}
          <span style={{ wordBreak: 'break-all' }}>{testResult.msg}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={onTest} disabled={testing || !form.base_url || !form.api_key} className="btn-ghost" style={{ padding: '9px 16px' }}>
          {testing ? <Loader2 size={13} className="animate-spin" /> : null}
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button onClick={onSave} disabled={!form.name || !form.base_url || !form.api_key} className="btn-primary" style={{ opacity: form.name && form.base_url && form.api_key ? 1 : 0.5 }}>
          保存
        </button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const [providers, setProviders] = useState<LlmProviderRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [modelsInput, setModelsInput] = useState('')
  const [form, setForm] = useState<CreateProviderInput>({
    name: '', provider_type: 'openai', base_url: '', api_key: '', models: [],
  })
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('appearance')
  const [fetchingModels, setFetchingModels] = useState(false)

  useEffect(() => {
    listProviders().then(setProviders).catch((err) => { logger.error('settings', `Load providers failed: ${err}`) })
  }, [])

  const handleSave = async () => {
    const models = modelsInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (!form.name || !form.base_url || !form.api_key) return
    try {
      if (editingId) {
        const updated = await updateProvider(editingId, { ...form, models })
        setProviders((prev) => prev.map((p) => p.id === editingId ? updated : p))
      } else {
        const p = await createProvider({ ...form, models })
        setProviders((prev) => [p, ...prev])
      }
      setForm({ name: '', provider_type: 'openai', base_url: '', api_key: '', models: [] })
      setModelsInput('')
      setShowForm(false)
      setEditingId(null)
      setTestResult(null)
    } catch (err) { logger.error('settings', `Save provider failed: ${err}`) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testProvider({ ...form, models: [form.models?.[0] || 'test'].filter(Boolean) as string[] })
      if (typeof result === 'string') {
        setTestResult({ ok: true, msg: result })
      } else {
        setTestResult({ ok: false, msg: result.msg })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleFetchModels = async () => {
    if (!form.base_url || !form.api_key) return
    setFetchingModels(true)
    try {
      const models = await fetchModels(form.base_url, form.api_key, form.provider_type)
      if (models.length > 0) {
        const modelIds = models.map((m) => m.id)
        setForm((prev) => ({ ...prev, models: modelIds }))
        setModelsInput(modelIds.join(', '))
      } else {
        setTestResult({ ok: false, msg: '未获取到模型列表，请手动输入' })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: `获取模型失败: ${String(err)}` })
    } finally {
      setFetchingModels(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Provider？')) return
    await deleteProvider(id)
    setProviders((prev) => prev.filter((p) => p.id !== id))
  }

  const handleEdit = (p: LlmProviderRow) => {
    const models = safeParseModels(p.models)
    setForm({ name: p.name, provider_type: p.provider_type as CreateProviderInput['provider_type'], base_url: p.base_url, api_key: p.api_key, models })
    setModelsInput(models.join(', '))
    setEditingId(p.id)
    setShowForm(true)
    setTestResult(null)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--app-page-bg)', padding: '0' }}>
      {/* Header */}
      <div
        style={{
          padding: '28px 32px 20px',
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--app-border)',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--app-text-primary)', marginBottom: '4px' }}>
          设置
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
          配置外观、AI 模型和高级选项
        </p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Tab bar */}
        <div className="tabs" style={{ marginBottom: '24px' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                主题
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '480px' }}>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--app-radius-xl)',
                      border: `2px solid ${theme === opt.value ? 'var(--color-brand)' : 'var(--app-border)'}`,
                      background: theme === opt.value ? 'var(--color-brand-light)' : 'var(--app-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (theme !== opt.value) e.currentTarget.style.borderColor = 'var(--color-brand-border)'
                    }}
                    onMouseLeave={(e) => {
                      if (theme !== opt.value) e.currentTarget.style.borderColor = 'var(--app-border)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      {opt.colors.map((c, i) => (
                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                      {opt.label}
                    </div>
                    {theme === opt.value && (
                      <div style={{ marginTop: '6px' }}>
                        <CheckCircle2 size={14} style={{ color: 'var(--color-brand)' }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Model Tab */}
        {activeTab === 'ai-model' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)' }}>AI 模型</div>
                <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
                  {providers.length > 0 ? `已配置 ${providers.length} 个 Provider` : '添加 Provider 以启用 AI 功能'}
                </div>
              </div>
              <button
                onClick={() => { setShowForm(!showForm); setTestResult(null); setEditingId(null); setForm({ name: '', provider_type: 'openai', base_url: '', api_key: '', models: [] }); setModelsInput('') }}
                className="btn-primary"
                style={{ padding: '9px 18px' }}
              >
                <Plus size={14} />
                {showForm ? '取消' : '添加 Provider'}
              </button>
            </div>

            {/* Provider list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {providers.map((p) => (
                <ProviderCard key={p.id} p={p} onEdit={() => handleEdit(p)} onDelete={() => handleDelete(p.id)} />
              ))}
            </div>

            {providers.length === 0 && !showForm && (
              <div
                style={{
                  padding: '40px 24px',
                  borderRadius: 'var(--app-radius-xl)',
                  border: '1px dashed var(--app-border)',
                  background: 'var(--app-surface)',
                  textAlign: 'center',
                }}
              >
                <Bot size={32} style={{ color: 'var(--app-text-muted)', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '4px' }}>
                  还没有配置 AI 模型
                </div>
                <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '16px' }}>
                  添加 Provider 后即可使用 AI 续写功能
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '9px 18px' }}>
                  <Plus size={14} />
                  添加第一个 Provider
                </button>
              </div>
            )}

            {showForm && (
              <ProviderForm
                onSave={handleSave}
                testResult={testResult}
                testing={testing}
                onTest={handleTest}
                onChange={setForm}
                form={form}
                modelsInput={modelsInput}
                onModelsChange={setModelsInput}
                fetchingModels={fetchingModels}
                onFetchModels={handleFetchModels}
              />
            )}
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '16px' }}>
              高级设置
            </div>

            <div
              style={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-xl)',
                padding: '20px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
                数据备份与恢复
              </div>
              <DataBackupSection />
            </div>

            <div
              style={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-xl)',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: 1.8 }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--app-text-primary)' }}>数据库路径：</strong>
                  app_data_dir/novelcraft.db
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--app-text-primary)' }}>日志路径：</strong>
                  app_data_dir/novelcraft.log
                </div>
                <div>
                  <strong style={{ color: 'var(--app-text-primary)' }}>当前书籍：</strong>
                  {selectedBookId ? '已选中' : '未选中'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
