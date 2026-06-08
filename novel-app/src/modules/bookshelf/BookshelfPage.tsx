import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Clock, CheckCircle2, PauseCircle, Sparkles, BarChart2, Pencil } from 'lucide-react'
import { useBookshelfStore } from './store'
import { listBooks, createBook, updateBook, deleteBook, createChapter, generateId, type BookRow, type CreateBookInput, type UpdateBookInput } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'
import { PageLoading } from '@/shared/components/PageLoading'
import { EmptyState } from '@/shared/components/EmptyState'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ongoing: { label: '连载中', color: 'var(--color-success)', bg: 'var(--color-success-dim)' },
  completed: { label: '已完结', color: 'var(--color-info)', bg: 'var(--color-info-dim)' },
  paused: { label: '暂停', color: 'var(--color-warning)', bg: 'var(--color-warning-dim)' },
}

function BookCard({ book, onDelete, onEdit, onClick }: { book: BookRow; onDelete: (e: React.MouseEvent, id: string) => void; onEdit: (e: React.MouseEvent, book: BookRow) => void; onClick: () => void }) {
  const status = STATUS_CONFIG[book.status] || STATUS_CONFIG.ongoing

  return (
    <div
      onClick={onClick}
      className="book-card"
      style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        borderRadius: 'var(--app-radius-xl)',
        padding: '20px',
        boxShadow: 'var(--app-shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = 'var(--app-shadow-xl)'
        e.currentTarget.style.borderColor = 'var(--color-brand-border)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--app-shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--app-border)'
      }}
    >
      {/* Gradient top border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, var(--color-brand) 0%, var(--color-purple) 100%)`,
          opacity: 0,
          transition: 'opacity 0.2s ease',
        }}
        className="book-card-top-border"
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--app-text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            flex: 1,
            marginRight: '8px',
          }}
        >
          {book.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            console.log('[DEBUG] Edit button clicked')
            onEdit(e, book)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`编辑 ${book.title}`}
          className="book-card-edit-btn"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            color: 'var(--color-brand)',
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.15s ease, background 0.15s ease',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.background = 'var(--color-brand-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6'
            e.currentTarget.style.background = 'transparent'
          }}
          title="编辑书籍"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            console.log('[DEBUG] Delete button clicked')
            onDelete(e, book.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`删除 ${book.title}`}
          className="book-card-delete-btn"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.15s ease, background 0.15s ease',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.background = 'var(--color-danger-dim)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6'
            e.currentTarget.style.background = 'transparent'
          }}
          title="删除书籍"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Synopsis */}
      {book.synopsis && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--app-text-muted)',
            lineHeight: 1.6,
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.synopsis}
        </p>
      )}

      {/* Genre tag */}
      {book.genre && (
        <span
          style={{
            display: 'inline-block',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--app-radius-full)',
            background: 'var(--color-brand-light)',
            color: 'var(--color-brand)',
            marginBottom: '12px',
          }}
        >
          {book.genre}
        </span>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          borderTop: '1px solid var(--app-divider)',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--app-radius-full)',
              background: status.bg,
              color: status.color,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {book.status === 'ongoing' && <Clock size={9} />}
            {book.status === 'completed' && <CheckCircle2 size={9} />}
            {book.status === 'paused' && <PauseCircle size={9} />}
            {status.label}
          </span>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--app-text-muted)',
          }}
        >
          {book.word_count > 0 ? `${book.word_count.toLocaleString()} 字` : '空'}
        </span>
      </div>
    </div>
  )
}

const GENRE_PRESETS = [
  '玄幻', '仙侠', '都市', '科幻', '悬疑', '恐怖', '历史', '言情', '武侠',
  'LITRPG', '游戏', '军事', '奇幻', '同人', '现实',
]

function CreateDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: CreateBookInput) => void }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [genre, setGenre] = useState('')
  const [status, setStatus] = useState<'ongoing' | 'paused' | 'completed'>('ongoing')
  const [targetDailyWords, setTargetDailyWords] = useState('')
  const focusTrapRef = useFocusTrap(open)

  if (!open) return null

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreate({
      id: generateId(),
      title: title.trim(),
      author: author.trim() || undefined,
      synopsis: synopsis.trim() || undefined,
      genre: genre || undefined,
      status,
      target_daily_words: targetDailyWords ? parseInt(targetDailyWords) : undefined,
    })
    setTitle('')
    setAuthor('')
    setSynopsis('')
    setGenre('')
    setStatus('ongoing')
    setTargetDailyWords('')
  }

  return (
    <div
      className="dialog-overlay"
      onClick={onClose}
    >
      <div
        ref={focusTrapRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label="新建书籍"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="dialog-header">
          <h2 className="dialog-title" style={{ marginBottom: '6px' }}>新建书籍</h2>
          <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
            为你的创作开启新篇章
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              书名 <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && title.trim() && handleSubmit()}
              placeholder="例如：修仙世界的凡人崛起"
              autoFocus
              className="input"
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                作者
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="笔名"
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                题材
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input"
                style={{ appearance: 'auto' }}
              >
                <option value="">选择题材</option>
                {GENRE_PRESETS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              简介
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="用几句话描述你的故事..."
              rows={3}
              className="input"
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                状态
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ongoing' | 'paused' | 'completed')}
                className="input"
                style={{ appearance: 'auto' }}
              >
                <option value="ongoing">连载中</option>
                <option value="paused">暂停</option>
                <option value="completed">已完结</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                日更目标（字）
              </label>
              <input
                type="number"
                value={targetDailyWords}
                onChange={(e) => setTargetDailyWords(e.target.value)}
                placeholder="例如：2000"
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '10px 18px' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn-primary"
            style={{
              opacity: title.trim() ? 1 : 0.5,
              padding: '10px 20px',
            }}
          >
            <Sparkles size={14} />
            创建书籍
          </button>
        </div>
      </div>
    </div>
  )
}

function EditDialog({ book, open, onClose, onSave }: { book: BookRow; open: boolean; onClose: () => void; onSave: (id: string, data: UpdateBookInput) => void }) {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author || '')
  const [synopsis, setSynopsis] = useState(book.synopsis || '')
  const [genre, setGenre] = useState(book.genre || '')
  const [status, setStatus] = useState<'ongoing' | 'paused' | 'completed'>(book.status)
  const [targetDailyWords, setTargetDailyWords] = useState(String(book.target_daily_words || ''))
  const focusTrapRef = useFocusTrap(open)

  if (!open) return null

  const handleSubmit = () => {
    if (!title.trim()) return
    onSave(book.id, {
      title: title.trim(),
      author: author.trim() || undefined,
      synopsis: synopsis.trim() || undefined,
      genre: genre || undefined,
      status,
      target_daily_words: targetDailyWords ? parseInt(targetDailyWords) : undefined,
    })
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={focusTrapRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label="编辑书籍"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="dialog-header">
          <h2 className="dialog-title" style={{ marginBottom: '6px' }}>编辑书籍</h2>
          <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
            修改书籍信息
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              书名 <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && title.trim() && handleSubmit()}
              autoFocus
              className="input"
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                作者
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="笔名"
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                题材
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input"
                style={{ appearance: 'auto' }}
              >
                <option value="">选择题材</option>
                {GENRE_PRESETS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              简介
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="用几句话描述你的故事..."
              rows={3}
              className="input"
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                状态
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ongoing' | 'paused' | 'completed')}
                className="input"
                style={{ appearance: 'auto' }}
              >
                <option value="ongoing">连载中</option>
                <option value="paused">暂停</option>
                <option value="completed">已完结</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                日更目标（字）
              </label>
              <input
                type="number"
                value={targetDailyWords}
                onChange={(e) => setTargetDailyWords(e.target.value)}
                placeholder="例如：2000"
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '10px 18px' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn-primary"
            style={{
              opacity: title.trim() ? 1 : 0.5,
              padding: '10px 20px',
            }}
          >
            <Pencil size={14} />
            保存修改
          </button>
        </div>
      </div>
    </div>
  )
}

export function BookshelfPage() {
  const { books, setBooks, addBook } = useBookshelfStore()
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingBook, setEditingBook] = useState<BookRow | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    listBooks()
      .then((b) => {
        setBooks(b)
        logger.info('bookshelf', `Loaded ${b.length} books`)
      })
      .catch((err) => logger.error('bookshelf', `Load failed: ${err}`))
      .finally(() => setLoading(false))
  }, [setBooks])

  const handleCreate = async (input: CreateBookInput) => {
    try {
      const book = await createBook(input)
      await createChapter({ id: generateId(), book_id: book.id, title: '第一章', order_index: 0 })
      addBook(book)
      setShowDialog(false)
      logger.info('bookshelf', `Created book: ${book.title}`)
    } catch (err) {
      logger.error('bookshelf', `Create failed: ${err}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation()
    console.log('[DEBUG] Delete button clicked for book:', bookId)
    logger.info('bookshelf', `Delete button clicked for book: ${bookId}`)

    const confirmed = confirm('确定删除这本书？此操作不可撤销。')
    console.log('[DEBUG] User confirmed:', confirmed)

    if (!confirmed) return

    try {
      console.log('[DEBUG] Calling deleteBook...')
      await deleteBook(bookId)
      console.log('[DEBUG] Delete successful, updating UI...')
      setBooks(books.filter((b) => b.id !== bookId))
      logger.info('bookshelf', `Successfully deleted book: ${bookId}`)
    } catch (err) {
      console.error('[DEBUG] Delete failed:', err)
      logger.error('bookshelf', `Delete failed: ${err}`)
    }
  }

  const handleEdit = (e: React.MouseEvent, book: BookRow) => {
    e.stopPropagation()
    setEditingBook(book)
  }

  const handleEditSave = async (id: string, data: UpdateBookInput) => {
    try {
      const updated = await updateBook(id, data)
      setBooks(books.map((b) => b.id === id ? updated : b))
      setEditingBook(null)
      logger.info('bookshelf', `Updated book: ${id}`)
    } catch (err) {
      logger.error('bookshelf', `Update failed: ${err}`)
    }
  }

  const handleBookClick = (book: BookRow) => {
    navigate('/editor', { state: { bookId: book.id, bookTitle: book.title } })
  }

  const totalWords = books.reduce((sum, b) => sum + (b.word_count || 0), 0)
  const ongoingBooks = books.filter((b) => b.status === 'ongoing').length

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--app-page-bg)' }}>
      {/* Hero Section */}
      <div
        style={{
          padding: '36px 32px 28px',
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(37, 99, 235, 0.07) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 100% 100%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),' +
            'var(--app-surface)',
          borderBottom: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--app-text-primary)',
                marginBottom: '4px',
              }}
            >
              我的书架
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
              {books.length > 0
                ? `${books.length} 本书籍 · ${ongoingBooks} 本连载中 · 共 ${totalWords.toLocaleString()} 字`
                : '开始你的第一部作品'}
            </p>
          </div>

          <button
            onClick={() => setShowDialog(true)}
            className="btn-primary"
            style={{ padding: '11px 22px', fontSize: '14px' }}
          >
            <Plus size={16} />
            新建书籍
          </button>
        </div>

        {/* Stats Cards */}
        {books.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '24px',
              maxWidth: '480px',
            }}
          >
            {[
              { label: '书籍总数', value: books.length, icon: BookOpen },
              { label: '连载中', value: ongoingBooks, icon: Clock },
              { label: '累计字数', value: totalWords > 0 ? `${(totalWords / 1000).toFixed(1)}k` : '0', icon: BarChart2 },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  style={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 'var(--app-radius-lg)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'var(--color-brand-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-brand)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: 'var(--app-text-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--app-text-muted)',
                        fontWeight: 500,
                        marginTop: '2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <PageLoading message="加载书架..." />
        ) : books.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="还没有书籍"
            description="点击「新建书籍」开启你的创作之旅，AI 将助你完成写作目标"
            action={
              <button
                onClick={() => setShowDialog(true)}
                className="btn-primary"
                style={{ padding: '12px 24px' }}
              >
                <Sparkles size={15} />
                创建第一本书
              </button>
            }
          />
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--app-text-primary)',
                }}
              >
                全部书籍
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--app-text-muted)',
                  fontWeight: 600,
                }}
              >
                {books.length} 本
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onClick={() => handleBookClick(book)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Dialog */}
      <CreateDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreate={handleCreate}
      />

      {/* Edit Dialog */}
      {editingBook && (
        <EditDialog
          key={editingBook.id}
          book={editingBook}
          open={!!editingBook}
          onClose={() => setEditingBook(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
