import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Editor } from '@tiptap/react'
import { listChapters, createChapter, deleteChapter, reorderChapters, updateChapterStatus, updateChapterContent, generateId, type ChapterRow } from '@/core/db/repository'
import { listProviders, type LlmProviderRow } from '@/core/ai-engine'
import { coordinator } from '@/core/ai-engine/coordinator'
import { handleAiContinue, stopGeneration } from './menu-items/ai-continue'
import { logger } from '@/shared/utils/logger'
import { useOutlineStore } from './outline-store'
import { useAICollabStore, useBookshelfStore } from '@/modules'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { NovelEditor } from './NovelEditor'
import { EditorContextMenu } from './EditorContextMenu'
import { SearchReplaceBar } from './SearchReplaceBar'
import { ChapterTree } from './ChapterTree'
import { useEditorStore } from './store'
import { useNetworkGuard } from '@/shared/hooks/use-network-status'
import { parseMarkdownChapters } from '@/core/export/import-engine'
import { useToast } from '@/shared/components/Toast'
import { RightPanel } from '@/app/components/RightPanel'
import { ExportPanel } from '@/modules/export/ExportPanel'
import {
  ChevronLeft,
  Plus,
  Maximize2,
  Minimize2,
  Download,
  Upload,
  Zap,
  Square,
  BookOpen,
  WifiOff,
  Search,
  PanelRightOpen,
  PanelRightClose,
  X,
} from 'lucide-react'

export function EditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { bookId?: string; bookTitle?: string; chapterId?: string } | null

  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [currentChapter, setCurrentChapter] = useState<ChapterRow | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<LlmProviderRow[]>([])
  const [generating, setGenerating] = useState(false)
  const [searchBarVisible, setSearchBarVisible] = useState(false)
  const [exportDialogVisible, setExportDialogVisible] = useState(false)
  const [aiStage, setAiStage] = useState<string | null>(null)
  const { isDirty, wordCount, isFullscreen, toggleFullscreen, rightPanelVisible, toggleRightPanel } = useEditorStore()
  const { selectedProviderId, selectedModel, setSelectedProvider } = useAICollabStore()
  const selectBook = useBookshelfStore((s) => s.selectBook)
  const loadOutline = useOutlineStore((s) => s.load)
  const { online, guardedFetch } = useNetworkGuard()
  const { addToast } = useToast()

  const bookId = state?.bookId
  const bookTitle = state?.bookTitle || '未命名'

  useEffect(() => {
    editorRef.current = null
  }, [currentChapter?.id])

  useEffect(() => {
    if (bookId) selectBook(bookId, bookTitle)
  }, [bookId, bookTitle, selectBook])

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    listChapters(bookId)
      .then((chaps) => {
        if (cancelled) return
        logger.info('editor', `Loaded ${chaps.length} chapters`)
        setChapters(chaps)
        const target = state?.chapterId ? chaps.find((c) => c.id === state.chapterId) : null
        setCurrentChapter(target || chaps[0] || null)
      })
      .catch((err) => { logger.error('editor', `Load chapters failed: ${err}`) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bookId, state?.chapterId])

  useEffect(() => {
    if (bookId) loadOutline(bookId).catch((err) => { logger.error('editor', `Load outline failed: ${err}`) })
  }, [bookId, loadOutline])

  useEffect(() => {
    listProviders().then((ps) => {
      setProviders(ps)
      const currentSelected = useAICollabStore.getState().selectedProviderId
      if (!currentSelected && ps.length > 0) {
        try {
          const models = JSON.parse(ps[0].models) as string[]
          useAICollabStore.getState().setSelectedProvider(ps[0].id, models[0] || null)
        } catch { useAICollabStore.getState().setSelectedProvider(ps[0].id, null) }
      }
    }).catch((err) => { logger.error('editor', `Load providers failed: ${err}`) })
  }, [])

  const handleAiContinueClick = useCallback(async () => {
    if (!editorRef.current || !bookId || !currentChapter || !selectedProviderId) return
    logger.info('ai', `Continue: book=${bookId} chapter=${currentChapter.id}`)
    const outlineNode = useOutlineStore.getState().getNodeForChapter(currentChapter.id)
    const result = await guardedFetch(() => handleAiContinue({
      editor: editorRef.current!, bookId, chapterId: currentChapter.id,
      providerId: selectedProviderId, model: selectedModel ?? undefined,
      outlineTitle: outlineNode?.title ?? null, outlineDescription: outlineNode?.description ?? null,
      onStageChange: setAiStage,
      onStart: () => setGenerating(true),
      onComplete: () => { setGenerating(false); setAiStage(null) },
      onError: (err) => { setGenerating(false); setAiStage(null); logger.error('ai', `Continue failed: ${err}`) },
    }))
    if (result === null) {
      setGenerating(false)
      setAiStage(null)
    }
  }, [bookId, currentChapter, selectedProviderId, selectedModel, guardedFetch])

  const handleCoordinatorCommand = useCallback(async (input: string) => {
    if (!editorRef.current || !bookId || !currentChapter) {
      logger.warn('editor', 'Coordinator command blocked: missing editor/book/chapter')
      return
    }
    setGenerating(true)
    setAiStage('处理中...')
    const result = await guardedFetch(async () => {
      const content = editorRef.current!.getHTML()
      return coordinator.handleInput(input, {
        bookId,
        chapterId: currentChapter.id,
        chapterContent: content,
        onDelta: (delta) => {
          if (editorRef.current) {
            editorRef.current.chain().focus().command(({ tr }) => {
              const pos = tr.doc.content.size
              tr.insertText(delta, pos)
              return true
            }).run()
          }
        },
      })
    })
    if (result === null) {
      setGenerating(false)
      setAiStage(null)
      return
    }
    try {
      if (result.type === 'text') {
        logger.info('coordinator', `Response: ${result.content.slice(0, 100)}`)
      } else if (result.type === 'pipeline-started') {
        logger.info('coordinator', `Pipeline started: ${result.content}`)
      }
    } finally {
      setGenerating(false)
      setAiStage(null)
    }
  }, [bookId, currentChapter, guardedFetch])

  useEffect(() => {
    const onCoordinator = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) handleCoordinatorCommand(detail)
    }
    window.addEventListener('slash-command:coordinator', onCoordinator)
    window.addEventListener('slash-command:ai-continue', handleAiContinueClick)
    window.addEventListener('editor:toggle-search', () => setSearchBarVisible((v) => !v))
    return () => {
      window.removeEventListener('slash-command:coordinator', onCoordinator)
      window.removeEventListener('slash-command:ai-continue', handleAiContinueClick)
      window.removeEventListener('editor:toggle-search', () => {})
    }
  }, [handleCoordinatorCommand, handleAiContinueClick])

  const handleAddChapter = async () => {
    if (!bookId) return
    const chapter = await createChapter({ id: generateId(), book_id: bookId, title: `第${chapters.length + 1}章`, order_index: chapters.length })
    setChapters((p) => [...p, chapter])
    setCurrentChapter(chapter)
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('确定删除此章节？')) return
    await deleteChapter(chapterId)
    setChapters((p) => p.filter((c) => c.id !== chapterId))
    if (currentChapter?.id === chapterId) {
      const remaining = chapters.filter((c) => c.id !== chapterId)
      setCurrentChapter(remaining[0] || null)
    }
  }

  const handleChapterReorder = useCallback(async (sourceId: string, targetIdx: number) => {
    const reordered = [...chapters]
    const sourceIdx = reordered.findIndex((c) => c.id === sourceId)
    if (sourceIdx === -1 || sourceIdx === targetIdx) return
    const [moved] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    setChapters(reordered)
    await reorderChapters(reordered.map((c) => c.id)).catch((err) => {
      logger.error('editor', `Reorder failed: ${err}`)
    })
  }, [chapters])

  const handleChapterRename = useCallback(async (chapterId: string, newTitle: string) => {
    setChapters((prev) => prev.map((c) => c.id === chapterId ? { ...c, title: newTitle } : c))
    if (currentChapter?.id === chapterId) {
      setCurrentChapter({ ...currentChapter, title: newTitle })
    }
    await updateChapterContent(chapterId, { title: newTitle }).catch((err) => {
      logger.error('editor', `Rename failed: ${err}`)
    })
  }, [currentChapter])

  const _handleStatusChange = useCallback(async (chapterId: string, currentStatus: string) => {
    const statusCycle = ['draft', 'reviewed', 'final', 'ai-generated'] as const
    const currentIdx = statusCycle.indexOf(currentStatus as typeof statusCycle[number])
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length]
    try {
      const updated = await updateChapterStatus(chapterId, nextStatus)
      setChapters((prev) => prev.map((c) => c.id === chapterId ? updated : c))
    } catch (err) {
      logger.error('editor', `Status change failed: ${err}`)
    }
  }, [])

  const handleImportMarkdown = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !bookId) return
      try {
        const text = await file.text()
        const parsed = parseMarkdownChapters(text)
        for (let i = 0; i < parsed.length; i++) {
          const ch = parsed[i]
          const chapter = await createChapter({ id: generateId(), book_id: bookId, title: ch.title, order_index: chapters.length + i })
          await updateChapterContent(chapter.id, ch.content)
        }
        const updated = await listChapters(bookId)
        setChapters(updated)
        if (updated.length > 0 && !currentChapter) {
          setCurrentChapter(updated[0])
        }
        addToast(`成功导入 ${parsed.length} 个章节`, 'success')
        logger.info('editor', `Imported ${parsed.length} chapters from ${file.name}`)
      } catch (err) {
        addToast(`导入失败: ${String(err)}`, 'error')
        logger.error('editor', `Import failed: ${err}`)
      }
    }
    input.click()
  }, [bookId, currentChapter, addToast, chapters.length])

  if (!bookId) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--color-brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BookOpen size={28} style={{ color: 'var(--color-brand)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
            欢迎使用 NovelCraft
          </p>
          <p style={{ fontSize: '13px', color: 'var(--app-text-muted)', lineHeight: 1.6 }}>
            开始你的 AI 辅助写作之旅
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface-subtle)', fontSize: '12px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>1</span>
            <span style={{ color: 'var(--app-text-primary)' }}>在书架创建一本书</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface-subtle)', fontSize: '12px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>2</span>
            <span style={{ color: 'var(--app-text-primary)' }}>在设置中配置 AI 模型</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--app-radius-md)', background: 'var(--app-surface-subtle)', fontSize: '12px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>3</span>
            <span style={{ color: 'var(--app-text-primary)' }}>开始写作，AI 为你辅助</span>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ fontSize: '12px', padding: '10px 24px', marginTop: '8px' }}>
          前往书架
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Chapter Sidebar */}
      {!isFullscreen && (
        <div
          style={{
            width: '200px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--app-border)',
            overflow: 'hidden',
          }}
        >
          {/* Book header */}
          <div
            style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid var(--app-divider)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={() => navigate('/')}
              className="btn-icon"
              style={{ width: '26px', height: '26px', color: 'var(--app-text-muted)' }}
              title="返回书架"
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--app-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {bookTitle}
            </span>
          </div>

          {/* Chapter list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            <ChapterTree
              chapters={chapters}
              currentChapterId={currentChapter?.id || null}
              onSelect={(ch) => setCurrentChapter(ch)}
              onDelete={handleDeleteChapter}
              onReorder={handleChapterReorder}
              onRename={handleChapterRename}
            />
          </div>

          {/* Add chapter */}
          <div style={{ padding: '8px', borderTop: '1px solid var(--app-divider)' }}>
            <button
              onClick={handleAddChapter}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--app-radius-md)',
                background: 'transparent',
                border: '1px dashed var(--app-border)',
                color: 'var(--color-brand)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-brand-light)'
                e.currentTarget.style.borderStyle = 'solid'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderStyle = 'dashed'
              }}
            >
              <Plus size={13} />
              新章节
            </button>
          </div>

          {/* Provider status */}
          {selectedProviderId && (
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--app-divider)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--color-success)',
                  boxShadow: '0 0 0 3px var(--color-success-dim)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-success)' }}>
                AI 已就绪
              </span>
            </div>
          )}
        </div>
      )}

      {/* Editor Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentChapter ? (
          <>
            {/* Editor Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px',
                borderBottom: '1px solid var(--app-border)',
                background: 'var(--app-surface)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--app-text-primary)',
                  }}
                >
                  {currentChapter.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
                  {wordCount.toLocaleString()} 字
                  {isDirty && (
                    <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>●</span>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Offline indicator */}
                {!online && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: 'var(--app-radius-full)', background: 'var(--color-danger-light)', fontSize: '11px', fontWeight: 600, color: 'var(--color-danger)' }}>
                    <WifiOff size={11} />
                    离线
                  </div>
                )}
                {/* AI Continue */}
                {selectedProviderId && (
                  <button
                    onClick={generating
                      ? () => { stopGeneration(); setGenerating(false); setAiStage(null) }
                      : handleAiContinueClick}
                    disabled={!editorReady}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: 'var(--app-radius-full)',
                      background: generating ? 'var(--color-danger)' : 'var(--color-brand)',
                      color: 'var(--app-text-inverse)',
                      border: 'none',
                      cursor: editorReady ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                      opacity: editorReady ? 1 : 0.4,
                      boxShadow: 'var(--app-shadow-brand)',
                    }}
                    onMouseEnter={(e) => {
                      if (editorReady && !generating) {
                        e.currentTarget.style.background = 'var(--color-brand-hover)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!generating) {
                        e.currentTarget.style.background = 'var(--color-brand)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }
                    }}
                  >
                    {generating ? <Square size={11} /> : <Zap size={12} />}
                    {generating
                      ? `停止${aiStage ? ` (${aiStage})` : ''}`
                      : 'AI 续写'}
                  </button>
                )}

                {/* Search */}
                <button
                  onClick={() => setSearchBarVisible((v) => !v)}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', color: searchBarVisible ? 'var(--color-brand)' : undefined }}
                  title="查找替换 (Ctrl+F)"
                >
                  <Search size={14} />
                </button>

                {/* Import */}
                <button
                  onClick={handleImportMarkdown}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px' }}
                  title="导入 Markdown"
                >
                  <Upload size={14} />
                </button>

                <button
                  onClick={() => setExportDialogVisible(true)}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px' }}
                  title="导出"
                >
                  <Download size={14} />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px' }}
                  title={isFullscreen ? '退出全屏' : '全屏编辑'}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                <button
                  onClick={toggleRightPanel}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', color: rightPanelVisible ? 'var(--color-brand)' : undefined }}
                  title={rightPanelVisible ? '隐藏侧面板' : '显示侧面板'}
                >
                  {rightPanelVisible ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                </button>

                {/* Provider selector */}
                {providers.length > 0 && (
                  <select
                    value={selectedProviderId || ''}
                    onChange={(e) => {
                      const p = providers.find((p) => p.id === e.target.value)
                      if (p) {
                        const models = JSON.parse(p.models) as string[]
                        setSelectedProvider(p.id, p.default_model || models[0] || null)
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--app-radius-md)',
                      border: '1px solid var(--app-border)',
                      background: 'var(--app-input-bg)',
                      color: 'var(--app-text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Editor Body */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
              {searchBarVisible && (
                <SearchReplaceBar
                  editor={editorInstance}
                  onClose={() => setSearchBarVisible(false)}
                />
              )}
              <ErrorBoundary
                fallback={
                  <div style={{ padding: '20px', color: 'var(--color-danger)', fontSize: '13px' }}>
                    编辑器加载出错，请刷新重试
                  </div>
                }
              >
                <NovelEditor
                  key={currentChapter.id}
                  chapterId={currentChapter.id}
                  initialContent={currentChapter.content}
                  providerId={selectedProviderId}
                  model={selectedModel}
                  onEditorReady={(ed) => { editorRef.current = ed; setEditorReady(true); setEditorInstance(ed) }}
                  onEditorDestroy={() => {}}
                />
              </ErrorBoundary>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--app-text-muted)',
              fontSize: '13px',
            }}
          >
            {loading ? '加载中...' : '点击左侧章节开始编辑，或创建新章节'}
          </div>
        )}
      </div>

      {/* Right Panel */}
      {rightPanelVisible && !isFullscreen && bookId && (
        <RightPanel bookId={bookId} />
      )}

      {/* Context Menu */}
      {editorReady && bookId && currentChapter && editorInstance && (
        <EditorContextMenu
          editor={editorInstance}
          bookId={bookId}
          chapterId={currentChapter.id}
          providerId={selectedProviderId}
          model={selectedModel ?? undefined}
        />
      )}

      {/* Export Dialog */}
      {exportDialogVisible && currentChapter && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setExportDialogVisible(false) }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '520px',
              background: 'var(--app-surface)',
              borderRadius: 'var(--app-radius-lg)',
              border: '1px solid var(--app-border)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--app-border)',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                导入 / 导出
              </span>
              <button
                onClick={() => setExportDialogVisible(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <ExportPanel
                bookTitle={bookTitle}
                chapters={chapters.map((ch) => ({ id: ch.id, title: ch.title, content: ch.content }))}
                selectedChapterIds={currentChapter ? [currentChapter.id] : []}
                bookId={bookId || undefined}
                onImportComplete={() => {
                  if (bookId) {
                    listChapters(bookId).then(setChapters)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
