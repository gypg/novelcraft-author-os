import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Tags, Upload, X } from 'lucide-react'
import {
  attachKnowledgeTagToItem,
  createKnowledgeItem,
  createKnowledgeSource,
  createKnowledgeTag,
  detachKnowledgeTagFromItem,
  listKnowledgeItemTags,
  listKnowledgeItems,
  listKnowledgeSources,
  listKnowledgeTags,
  type CreateKnowledgeItemInput,
} from '@/core/db/knowledge-base-repository'
import {
  buildImportCandidates,
  confirmPendingImportCandidate,
  stageImportCandidate,
  toCreateKnowledgeItemInput,
} from '@/core/knowledge-base/import-candidates'
import { deriveQuotePolicyForSource, getAllowedSuggestionActions } from '@/core/knowledge-base/quote-policy'
import type { KnowledgeItemRow, KnowledgeSourceRow, KnowledgeSourceType, KnowledgeTagCategory, KnowledgeTagRow } from '@/core/knowledge-base/types'
import { useBookshelfStore } from '@/modules'
import { useKnowledgeBaseStore } from './store'

const SOURCE_TYPES: Array<{ value: KnowledgeSourceType; label: string }> = [
  { value: 'unknown', label: '未知来源' },
  { value: 'user_original', label: '用户原创' },
  { value: 'public_domain', label: '公共领域' },
  { value: 'copyrighted', label: '版权来源' },
]

function panelStyle(): React.CSSProperties {
  return {
    background: 'var(--app-surface)',
    border: '1px solid var(--app-border)',
    borderRadius: 'var(--app-radius-xl)',
    padding: '16px',
    boxShadow: 'var(--app-shadow-sm)',
  }
}

function buildCreateFilterInput(filters: ReturnType<typeof useKnowledgeBaseStore.getState>['filters'], selectedBookId: string | null) {
  const libraryType = filters.libraryType === 'all' ? undefined : filters.libraryType
  return {
    keyword: filters.keyword || undefined,
    bookId: libraryType === 'project' ? selectedBookId ?? undefined : undefined,
    sourceId: filters.sourceId === 'all' ? undefined : filters.sourceId,
    libraryType,
    itemType: filters.itemType === 'all' ? undefined : filters.itemType,
    status: filters.status === 'all' ? undefined : filters.status,
    quotePolicy: filters.quotePolicy === 'all' ? undefined : filters.quotePolicy,
    tagId: filters.tagId === 'all' ? undefined : filters.tagId,
    tagCategory: filters.tagCategory === 'all' ? undefined : filters.tagCategory,
    includeArchived: filters.status === 'archived' || filters.status === 'all',
  }
}

export function KnowledgeBasePage() {
  const { selectedBookId } = useBookshelfStore()
  const { activeSection, filters, draftCandidates, setActiveSection, setFilters, setDraftCandidates, clearDraftCandidates } = useKnowledgeBaseStore()
  const [items, setItems] = useState<KnowledgeItemRow[]>([])
  const [sources, setSources] = useState<KnowledgeSourceRow[]>([])
  const [tags, setTags] = useState<KnowledgeTagRow[]>([])
  const [itemTags, setItemTags] = useState<Record<string, KnowledgeTagRow[]>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [sourceDraft, setSourceDraft] = useState({ title: '', sourceType: 'unknown' as KnowledgeSourceType })
  const [tagDraft, setTagDraft] = useState({ category: 'scene' as const, name: '', color: '#3b82f6' })
  const [itemDraft, setItemDraft] = useState({ content: '', notes: '' })
  const [pasteText, setPasteText] = useState('')
  const [pasteSourceId, setPasteSourceId] = useState<string>('')
  const [pasteSourceType, setPasteSourceType] = useState<KnowledgeSourceType>('unknown')

  const loadAll = useCallback(async () => {
    try {
      const [nextSources, nextTags, nextItems] = await Promise.all([
        listKnowledgeSources(),
        listKnowledgeTags({}),
        listKnowledgeItems(buildCreateFilterInput(filters, selectedBookId)),
      ])
      const scopedItems = nextItems.filter((item) => item.library_type !== 'project' || item.book_id === selectedBookId)
      const nextItemTags = await Promise.all(
        scopedItems.map(async (item) => [item.id, await listKnowledgeItemTags(item.id)] as const),
      )
      setSources(nextSources)
      setTags(nextTags)
      setItems(scopedItems)
      setItemTags(Object.fromEntries(nextItemTags))
    } catch (error) {
      setMessage(`加载失败：${error}`)
    }
  }, [filters, selectedBookId])

  useEffect(() => {
    void Promise.resolve().then(loadAll)
  }, [loadAll])

  const sourceOptions = useMemo(() => sources.map((source) => ({ value: source.id, label: source.title })), [sources])

  const selectedPasteSource = useMemo(
    () => sources.find((source) => source.id === pasteSourceId) ?? null,
    [pasteSourceId, sources],
  )

  const handleCreateSource = async () => {
    if (!sourceDraft.title.trim()) return
    await createKnowledgeSource({
      id: crypto.randomUUID(),
      title: sourceDraft.title.trim(),
      source_type: sourceDraft.sourceType,
    })
    setSourceDraft({ title: '', sourceType: 'unknown' })
    setMessage('来源已创建')
    await loadAll()
  }

  const handleCreateTag = async () => {
    if (!tagDraft.name.trim()) return
    await createKnowledgeTag({ id: crypto.randomUUID(), category: tagDraft.category, name: tagDraft.name.trim(), color: tagDraft.color })
    setTagDraft({ category: 'scene', name: '', color: '#3b82f6' })
    setMessage('标签已创建')
    await loadAll()
  }

  const handleCreateItem = async () => {
    if (!itemDraft.content.trim()) return
    const input: CreateKnowledgeItemInput = {
      id: crypto.randomUUID(),
      source_id: null,
      book_id: selectedBookId,
      library_type: selectedBookId ? 'project' : 'external',
      canonical_level: selectedBookId ? 'canonical' : 'inspiration',
      item_type: 'note',
      content: itemDraft.content.trim(),
      quote_policy: 'not_applicable',
      status: 'confirmed',
      metadata_json: '{}',
      notes: itemDraft.notes.trim(),
    }
    await createKnowledgeItem(input)
    setItemDraft({ content: '', notes: '' })
    setMessage('知识条目已创建')
    await loadAll()
  }

  const handleBuildCandidates = () => {
    const sourceType = selectedPasteSource?.source_type ?? pasteSourceType
    const candidates = buildImportCandidates({
      text: pasteText,
      sourceId: selectedPasteSource?.id ?? null,
      sourceType,
      bookId: null,
    })
    setPasteSourceType(sourceType)
    setDraftCandidates(candidates)
  }

  const handleConfirmCandidates = async () => {
    const confirmedInputs = draftCandidates.map((candidate) => toCreateKnowledgeItemInput(confirmPendingImportCandidate(stageImportCandidate(candidate))))
    for (const input of confirmedInputs) {
      await createKnowledgeItem(input)
    }
    clearDraftCandidates()
    setPasteText('')
    setMessage(`已确认 ${confirmedInputs.length} 条候选素材`)
    await loadAll()
  }

  const handleToggleItemTag = async (itemId: string, tagId: string) => {
    const existingTags = itemTags[itemId] ?? []
    const alreadyAttached = existingTags.some((tag) => tag.id === tagId)
    if (alreadyAttached) {
      await detachKnowledgeTagFromItem(itemId, tagId)
    } else {
      await attachKnowledgeTagToItem(itemId, tagId)
    }
    await loadAll()
  }

  const updateFilter = (updates: Partial<typeof filters>) => {
    const tagReset = updates.tagCategory && updates.tagCategory !== filters.tagCategory ? { tagId: 'all' as const } : {}
    setFilters({ ...tagReset, ...updates })
  }

  const visibleFilterTags = useMemo(() => {
    if (filters.tagCategory === 'all') return tags
    return tags.filter((tag) => tag.category === filters.tagCategory)
  }, [filters.tagCategory, tags])

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--app-text-primary)' }}>知识库</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--app-text-muted)', fontSize: '13px' }}>管理来源、素材、标签与导入候选；AI 只能建议，不能静默改写 canonical 数据。</p>
        </div>
        <button className="btn-secondary" onClick={() => loadAll()}><RefreshCw size={15} /> 刷新</button>
      </header>

      {message && (
        <div style={{ ...panelStyle(), display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-success)' }}>
          {message}
          <button className="btn-icon" onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          ['items', '素材条目'],
          ['sources', '来源'],
          ['tags', '标签'],
          ['import', '粘贴导入'],
        ].map(([key, label]) => (
          <button key={key} className={activeSection === key ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveSection(key as typeof activeSection)}>{label}</button>
        ))}
      </div>

      {activeSection === 'items' && (
        <section style={panelStyle()}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '10px', marginBottom: '10px' }}>
            <input className="input" placeholder="搜索内容/备注" value={filters.keyword} onChange={(event) => updateFilter({ keyword: event.target.value })} />
            <select className="input" value={filters.libraryType} onChange={(event) => updateFilter({ libraryType: event.target.value as never })}>
              <option value="all">全部库</option><option value="project">项目</option><option value="author">作者</option><option value="external">外部</option>
            </select>
            <select className="input" value={filters.itemType} onChange={(event) => updateFilter({ itemType: event.target.value as never })}>
              <option value="all">全部类型</option><option value="quote">摘抄</option><option value="note">笔记</option><option value="character">角色</option><option value="location">地点</option><option value="hook">伏笔</option><option value="technique">技法</option><option value="analysis">分析</option>
            </select>
            <select className="input" value={filters.status} onChange={(event) => updateFilter({ status: event.target.value as never })}>
              <option value="confirmed">已确认</option><option value="pending">待确认</option><option value="proposal">提案</option><option value="archived">归档</option><option value="all">全部状态</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 150px', gap: '10px', marginBottom: '14px' }}>
            <select className="input" value={filters.sourceId} onChange={(event) => updateFilter({ sourceId: event.target.value })}>
              <option value="all">全部来源</option>
              {sourceOptions.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
            </select>
            <select className="input" value={filters.quotePolicy} onChange={(event) => updateFilter({ quotePolicy: event.target.value as never })}>
              <option value="all">全部引用策略</option><option value="direct_allowed">允许直引</option><option value="paraphrase_recommended">建议改写</option><option value="direct_forbidden">禁止直引</option><option value="not_applicable">不适用</option>
            </select>
            <select className="input" value={filters.tagCategory} onChange={(event) => updateFilter({ tagCategory: event.target.value as KnowledgeTagCategory | 'all' })}>
              <option value="all">全部标签维度</option><option value="scene">场景</option><option value="emotion">情绪</option><option value="genre">题材</option><option value="technique">技法</option><option value="usage">用途</option><option value="position">位置</option><option value="custom">自定义</option>
            </select>
            <select className="input" value={filters.tagId} onChange={(event) => updateFilter({ tagId: event.target.value })}>
              <option value="all">全部标签</option>
              {visibleFilterTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: '10px', marginBottom: '16px' }}>
            <textarea className="input" placeholder="新增知识条目" value={itemDraft.content} onChange={(event) => setItemDraft({ ...itemDraft, content: event.target.value })} />
            <input className="input" placeholder="备注" value={itemDraft.notes} onChange={(event) => setItemDraft({ ...itemDraft, notes: event.target.value })} />
            <button className="btn-primary" onClick={handleCreateItem}><Plus size={15} /> 新增</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => (
              <article key={item.id} style={{ padding: '12px', borderRadius: 'var(--app-radius-lg)', border: '1px solid var(--app-border)', background: 'var(--app-surface-subtle)' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '11px', color: 'var(--app-text-muted)' }}>
                  <span>{item.library_type}</span><span>{item.canonical_level}</span><span>{item.item_type}</span><span>{item.status}</span><span>{item.quote_policy}</span>
                </div>
                <div style={{ color: 'var(--app-text-primary)', lineHeight: 1.7 }}>{item.content}</div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--app-text-muted)' }}>允许操作：{getAllowedSuggestionActions(item.quote_policy).join(' / ')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {tags.map((tag) => {
                    const active = (itemTags[item.id] ?? []).some((attached) => attached.id === tag.id)
                    return (
                      <button
                        key={tag.id}
                        className={active ? 'btn-primary' : 'btn-secondary'}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() => handleToggleItemTag(item.id, tag.id)}
                      >
                        {active ? '✓ ' : ''}{tag.name}
                      </button>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === 'sources' && (
        <section style={panelStyle()}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: '10px', marginBottom: '16px' }}>
            <input className="input" placeholder="来源标题" value={sourceDraft.title} onChange={(event) => setSourceDraft({ ...sourceDraft, title: event.target.value })} />
            <select className="input" value={sourceDraft.sourceType} onChange={(event) => setSourceDraft({ ...sourceDraft, sourceType: event.target.value as KnowledgeSourceType })}>
              {SOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <button className="btn-primary" onClick={handleCreateSource}><Plus size={15} /> 新建来源</button>
          </div>
          {sources.map((source) => <div key={source.id} style={{ padding: '10px 0', borderTop: '1px solid var(--app-divider)' }}>{source.title} · {source.source_type}</div>)}
        </section>
      )}

      {activeSection === 'tags' && (
        <section style={panelStyle()}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px auto', gap: '10px', marginBottom: '16px' }}>
            <select className="input" value={tagDraft.category} onChange={(event) => setTagDraft({ ...tagDraft, category: event.target.value as never })}>
              <option value="scene">场景</option><option value="emotion">情绪</option><option value="genre">题材</option><option value="technique">技法</option><option value="usage">用途</option><option value="position">位置</option><option value="custom">自定义</option>
            </select>
            <input className="input" placeholder="标签名" value={tagDraft.name} onChange={(event) => setTagDraft({ ...tagDraft, name: event.target.value })} />
            <input className="input" value={tagDraft.color} onChange={(event) => setTagDraft({ ...tagDraft, color: event.target.value })} />
            <button className="btn-primary" onClick={handleCreateTag}><Tags size={15} /> 新建标签</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((tag) => <span key={tag.id} style={{ border: `1px solid ${tag.color || 'var(--app-border)'}`, borderRadius: '999px', padding: '4px 10px' }}>{tag.category} · {tag.name}</span>)}
          </div>
        </section>
      )}

      {activeSection === 'import' && (
        <section style={panelStyle()}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px auto', gap: '10px', marginBottom: '12px' }}>
            <textarea className="input" placeholder="粘贴素材；空行会拆分为多个候选" value={pasteText} onChange={(event) => setPasteText(event.target.value)} />
            <select
              className="input"
              value={pasteSourceId}
              onChange={(event) => {
                const nextSourceId = event.target.value
                const nextSource = sources.find((source) => source.id === nextSourceId) ?? null
                setPasteSourceId(nextSourceId)
                setPasteSourceType(nextSource?.source_type ?? 'unknown')
              }}
            >
              <option value="">无来源 / 手动选择类型</option>
              {sourceOptions.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
            </select>
            <select className="input" value={pasteSourceType} disabled={Boolean(selectedPasteSource)} onChange={(event) => setPasteSourceType(event.target.value as KnowledgeSourceType)}>
              {SOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <button className="btn-primary" onClick={handleBuildCandidates}><Upload size={15} /> 生成候选</button>
          </div>
          {draftCandidates.length > 0 && <button className="btn-primary" onClick={handleConfirmCandidates}>确认全部候选</button>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {draftCandidates.map((candidate) => <div key={candidate.id} style={{ padding: '10px', border: '1px solid var(--app-border)', borderRadius: 'var(--app-radius-md)' }}>{candidate.content} · {candidate.status} · {candidate.quote_policy} · {deriveQuotePolicyForSource(pasteSourceType) === candidate.quote_policy ? '策略已匹配来源' : '策略已覆盖'}</div>)}
          </div>
        </section>
      )}
    </div>
  )
}
