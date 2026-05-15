import { useState, useCallback, useMemo, useRef } from 'react'
import { useExportStore } from './store'
import { exportContent, downloadBlob, copyToClipboard, getExportFilename, type ExportFormat } from '@/core/export/export-engine'
import { parseMarkdownChapters } from '@/core/export/import-engine'
import { PLATFORM_TEMPLATES } from '@/core/export/templates'
import { logger } from '@/shared/utils/logger'

interface ExportPanelProps {
  bookTitle: string
  author?: string
  chapters: Array<{ id: string; title: string; content: string }>
  selectedChapterIds?: string[]
  bookId?: string
  onImportComplete?: () => void
}

const FORMAT_OPTIONS: Array<{ format: ExportFormat; label: string; ext: string }> = [
  { format: 'txt', label: 'TXT', ext: '.txt' },
  { format: 'markdown', label: 'Markdown', ext: '.md' },
  { format: 'docx', label: 'DOCX', ext: '.docx' },
  { format: 'epub', label: 'EPUB', ext: '.epub' },
  { format: 'pdf', label: 'PDF', ext: '.pdf' },
]

type TabType = 'export' | 'import'

export function ExportPanel({ bookTitle, author, chapters, selectedChapterIds, bookId, onImportComplete }: ExportPanelProps) {
  const { isExporting, setExporting, setLastExport, setError } = useExportStore()
  const [activeTab, setActiveTab] = useState<TabType>('export')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [exportScope, setExportScope] = useState<'chapter' | 'book'>(
    selectedChapterIds && selectedChapterIds.length > 0 ? 'chapter' : 'book',
  )
  const [copied, setCopied] = useState(false)

  const [importPreview, setImportPreview] = useState<Array<{ title: string; content: string }>>([])
  const [importFileName, setImportFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const targetChapters = useMemo(() => {
    if (exportScope === 'chapter' && selectedChapterIds && selectedChapterIds.length > 0) {
      return chapters.filter((ch) => selectedChapterIds.includes(ch.id))
    }
    return chapters
  }, [chapters, selectedChapterIds, exportScope])

  const handleExport = useCallback(async () => {
    if (targetChapters.length === 0) return

    setExporting(true)
    setError(null)

    try {
      const blob = await exportContent({
        format: selectedFormat,
        scope: exportScope,
        chapters: targetChapters,
        bookTitle,
        author,
        templateId: selectedTemplate || undefined,
      })

      const filename = getExportFilename(bookTitle, selectedFormat, exportScope)
      downloadBlob(blob, filename)
      setLastExport(selectedFormat)
      logger.info('export', `Exported ${targetChapters.length} chapters as ${selectedFormat}`)
    } catch (err) {
      setError(String(err))
      logger.error('export', `Export failed: ${err}`)
    } finally {
      setExporting(false)
    }
  }, [targetChapters, selectedFormat, selectedTemplate, exportScope, bookTitle, author, setExporting, setLastExport, setError])

  const handleCopy = useCallback(async () => {
    if (targetChapters.length === 0) return

    const text = targetChapters
      .map((ch) => {
        const plain = ch.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        return `${ch.title}\n${plain}`
      })
      .join('\n\n')

    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [targetChapters])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    setImportError(null)

    try {
      const text = await file.text()
      const parsed = parseMarkdownChapters(text)
      setImportPreview(parsed)
      logger.info('import', `Previewed ${parsed.length} chapters from ${file.name}`)
    } catch (err) {
      setImportError(`文件解析失败: ${String(err)}`)
      setImportPreview([])
      logger.error('import', `Preview failed: ${err}`)
    }

    e.target.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (importPreview.length === 0 || !bookId) return

    setIsImporting(true)
    setImportError(null)

    try {
      const { createChapter, updateChapterContent, generateId, listChapters } = await import('@/core/db/repository')
      const existing = await listChapters(bookId)
      const startIndex = existing.length

      for (let i = 0; i < importPreview.length; i++) {
        const ch = importPreview[i]
        const chapter = await createChapter({
          id: generateId(),
          book_id: bookId,
          title: ch.title,
          order_index: startIndex + i,
        })
        await updateChapterContent(chapter.id, ch.content)
      }

      logger.info('import', `Imported ${importPreview.length} chapters from ${importFileName}`)
      setImportPreview([])
      setImportFileName('')
      onImportComplete?.()
    } catch (err) {
      setImportError(`导入失败: ${String(err)}`)
      logger.error('import', `Import failed: ${err}`)
    } finally {
      setIsImporting(false)
    }
  }, [importPreview, bookId, importFileName, onImportComplete])

  const handleClearPreview = useCallback(() => {
    setImportPreview([])
    setImportFileName('')
    setImportError(null)
  }, [])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
    borderBottom: active ? '2px solid var(--color-brand)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: active ? 'var(--color-brand)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid var(--app-border)' }}>
        <button style={tabStyle(activeTab === 'export')} onClick={() => setActiveTab('export')}>
          导出
        </button>
        <button style={tabStyle(activeTab === 'import')} onClick={() => setActiveTab('import')}>
          导入
        </button>
      </div>

      {activeTab === 'export' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--app-text-primary)' }}>
              导出格式
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => setSelectedFormat(opt.format)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--app-radius)',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: selectedFormat === opt.format ? 'var(--color-brand)' : 'var(--app-bg-secondary)',
                    color: selectedFormat === opt.format ? '#fff' : 'var(--app-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--app-text-primary)' }}>
              导出范围
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setExportScope('book')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--app-radius)',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: exportScope === 'book' ? 'var(--color-brand)' : 'var(--app-bg-secondary)',
                  color: exportScope === 'book' ? '#fff' : 'var(--app-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                全书 ({chapters.length} 章)
              </button>
              {selectedChapterIds && selectedChapterIds.length > 0 && (
                <button
                  onClick={() => setExportScope('chapter')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--app-radius)',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: exportScope === 'chapter' ? 'var(--color-brand)' : 'var(--app-bg-secondary)',
                    color: exportScope === 'chapter' ? '#fff' : 'var(--app-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  选中章节 ({selectedChapterIds.length} 章)
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--app-text-primary)' }}>
              排版模板
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                borderRadius: 'var(--app-radius)',
                fontSize: '12px',
                backgroundColor: 'var(--app-bg-secondary)',
                border: '1px solid var(--app-border)',
                color: 'var(--app-text-primary)',
                outline: 'none',
              }}
            >
              <option value="">默认排版</option>
              {PLATFORM_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExport}
              disabled={isExporting || targetChapters.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--app-radius)',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                cursor: isExporting || targetChapters.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isExporting || targetChapters.length === 0 ? 0.4 : 1,
              }}
            >
              {isExporting ? '导出中...' : '导出'}
            </button>

            <button
              onClick={handleCopy}
              disabled={targetChapters.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--app-radius)',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                border: '1px solid var(--app-border)',
                color: copied ? 'oklch(0.65 0.17 145)' : 'var(--app-text-muted)',
                cursor: targetChapters.length === 0 ? 'not-allowed' : 'pointer',
                opacity: targetChapters.length === 0 ? 0.4 : 1,
              }}
            >
              {copied ? '已复制' : '一键复制'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {!bookId && (
            <div style={{
              padding: '12px',
              borderRadius: 'var(--app-radius)',
              backgroundColor: 'oklch(0.65 0.17 145 / 0.1)',
              fontSize: '12px',
              color: 'var(--app-text-muted)',
            }}>
              请先选择一本书后再导入
            </div>
          )}

          <div
            onClick={bookId ? handleFileSelect : undefined}
            style={{
              padding: '24px',
              borderRadius: 'var(--app-radius-lg)',
              border: '2px dashed var(--app-border)',
              textAlign: 'center',
              cursor: bookId ? 'pointer' : 'not-allowed',
              opacity: bookId ? 1 : 0.5,
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)', marginBottom: '4px' }}>
              {importFileName || '点击选择文件'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
              支持 .md / .markdown / .txt 格式
            </div>
          </div>

          {importError && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 'var(--app-radius)',
              backgroundColor: 'oklch(0.65 0.2 25 / 0.1)',
              fontSize: '12px',
              color: 'oklch(0.65 0.2 25)',
            }}>
              {importError}
            </div>
          )}

          {importPreview.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>
                  预览 ({importPreview.length} 个章节)
                </span>
                <button
                  onClick={handleClearPreview}
                  style={{
                    fontSize: '11px',
                    color: 'var(--app-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  清除
                </button>
              </div>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                borderRadius: 'var(--app-radius)',
                border: '1px solid var(--app-border)',
              }}>
                {importPreview.map((ch, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderBottom: i < importPreview.length - 1 ? '1px solid var(--app-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--app-text-muted)',
                      minWidth: '20px',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--app-text-primary)' }}>
                      {ch.title}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--app-text-muted)',
                      marginLeft: 'auto',
                    }}>
                      {ch.content.replace(/<[^>]+>/g, '').length} 字
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleImport}
              disabled={isImporting || importPreview.length === 0 || !bookId}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--app-radius)',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                cursor: isImporting || importPreview.length === 0 || !bookId ? 'not-allowed' : 'pointer',
                opacity: isImporting || importPreview.length === 0 || !bookId ? 0.4 : 1,
              }}
            >
              {isImporting ? '导入中...' : `导入 ${importPreview.length} 个章节`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
