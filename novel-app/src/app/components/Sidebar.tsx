import { NavLink, useNavigate } from 'react-router-dom'
import { useBookshelfStore } from '@/modules'
import { useEffect } from 'react'
import { listBooks } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'
import {
  BookOpen,
  PenLine,
  Bot,
  FileText,
  BarChart3,
  Settings,
  BookMarked,
  Zap,
  Users,
  GitBranch,
  Clock,
  Package,
} from 'lucide-react'

const WRITING_NAV_ITEMS = [
  { path: '/', label: '书架', icon: BookOpen },
  { path: '/editor', label: '编辑器', icon: PenLine },
  { path: '/knowledge-base', label: '知识库', icon: BookMarked },
  { path: '/ai', label: 'AI 助手', icon: Bot },
] as const

const WORLD_NAV_ITEMS = [
  { path: '/truth-files', label: '真相文件', icon: FileText },
  { path: '/world-bible', label: '设定集', icon: BookMarked },
  { path: '/characters', label: '角色档案', icon: Users },
  { path: '/analytics', label: '数据分析', icon: BarChart3 },
  { path: '/timeline', label: '时间线', icon: Clock },
  { path: '/knowledge-graph', label: '知识图谱', icon: GitBranch },
] as const

const ADVANCED_NAV_ITEMS = [
  { path: '/autopilot', label: '自动驾驶', icon: Zap },
  { path: '/style', label: '写作风格', icon: Package },
  { path: '/plugins', label: '插件', icon: Package },
  { path: '/settings', label: '设置', icon: Settings },
] as const

const STATUS_DOT: Record<string, string> = {
  ongoing: '#22c55e',
  completed: '#3b82f6',
  paused: '#f59e0b',
}

export function Sidebar() {
  const { books, setBooks, selectedBookId, selectBook } = useBookshelfStore()
  const navigate = useNavigate()

  useEffect(() => {
    listBooks().then(setBooks).catch((err) => { logger.error('sidebar', `Load books failed: ${err}`) })
  }, [setBooks])

  const handleBookClick = (bookId: string, bookTitle: string) => {
    selectBook(bookId, bookTitle)
    navigate('/editor', { state: { bookId, bookTitle } })
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100%',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--app-border)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Book list */}
      <div
        style={{
          padding: '14px 12px 10px',
          borderBottom: '1px solid var(--app-divider)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--app-text-muted)',
            }}
          >
            我的书籍
          </span>
          {books.length > 0 && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--app-radius-full)',
                background: 'var(--app-surface-subtle)',
                color: 'var(--app-text-muted)',
                border: '1px solid var(--app-border)',
              }}
            >
              {books.length}
            </span>
          )}
        </div>

        {books.length === 0 ? (
          <div
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--app-radius-lg)',
              background: 'var(--app-surface-subtle)',
              border: '1px solid var(--app-border)',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--app-text-muted)',
            }}
          >
            暂无书籍
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {books.map((book) => {
              const active = selectedBookId === book.id
              return (
                <button
                  key={book.id}
                  onClick={() => handleBookClick(book.id, book.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    width: '100%',
                    padding: '7px 8px',
                    borderRadius: 'var(--app-radius-md)',
                    background: active ? 'var(--color-brand-light)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    color: active ? 'var(--color-brand)' : 'var(--app-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--app-surface-subtle)'
                      e.currentTarget.style.color = 'var(--app-text-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--app-text-muted)'
                    }
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: STATUS_DOT[book.status || 'ongoing'] || STATUS_DOT.ongoing,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      fontWeight: active ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.title}
                  </span>
                  {book.word_count > 0 && (
                    <span style={{ fontSize: '9px', opacity: 0.6, flexShrink: 0 }}>
                      {book.word_count >= 1000
                        ? `${(book.word_count / 1000).toFixed(1)}k`
                        : book.word_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          overflowY: 'auto',
        }}
      >
        {/* Writing section */}
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--app-text-muted)',
            padding: '4px 6px 6px',
          }}
        >
          写作
        </div>

        {WRITING_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: 'var(--app-radius-md)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--color-brand-light)' : 'transparent',
                color: isActive ? 'var(--color-brand)' : 'var(--app-text-muted)',
                transition: 'all 0.15s ease',
                border: 'none',
                cursor: 'pointer',
              })}
              onMouseEnter={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--app-surface-subtle)'
                  e.currentTarget.style.color = 'var(--app-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--app-text-muted)'
                }
              }}
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          )
        })}

        <div
          style={{
            height: '1px',
            background: 'var(--app-divider)',
            margin: '8px 6px',
          }}
        />

        {/* World section */}
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--app-text-muted)',
            padding: '4px 6px 6px',
          }}
        >
          世界观
        </div>

        {WORLD_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: 'var(--app-radius-md)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--color-brand-light)' : 'transparent',
                color: isActive ? 'var(--color-brand)' : 'var(--app-text-muted)',
                transition: 'all 0.15s ease',
                border: 'none',
                cursor: 'pointer',
              })}
              onMouseEnter={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--app-surface-subtle)'
                  e.currentTarget.style.color = 'var(--app-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--app-text-muted)'
                }
              }}
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          )
        })}

        <div
          style={{
            height: '1px',
            background: 'var(--app-divider)',
            margin: '8px 6px',
          }}
        />

        {/* Advanced section */}
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--app-text-muted)',
            padding: '4px 6px 6px',
          }}
        >
          高级
        </div>

        {ADVANCED_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                borderRadius: 'var(--app-radius-md)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--color-brand-light)' : 'transparent',
                color: isActive ? 'var(--color-brand)' : 'var(--app-text-muted)',
                transition: 'all 0.15s ease',
                border: 'none',
                cursor: 'pointer',
              })}
              onMouseEnter={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--app-surface-subtle)'
                  e.currentTarget.style.color = 'var(--app-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                const isActive = (e.currentTarget as HTMLElement).style.background.includes('brand')
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--app-text-muted)'
                }
              }}
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--app-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: 'var(--app-text-muted)',
            fontWeight: 500,
          }}
        >
          NovelCraft v0.1.0
        </span>
      </div>
    </aside>
  )
}
