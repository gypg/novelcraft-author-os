import { useThemeStore, useAICollabStore, useBookshelfStore } from '@/modules'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BookOpen,
  PenLine,
  Bot,
  FileText,
  BarChart3,
  Settings,
  BrainCircuit,
  Zap,
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '书架', icon: BookOpen },
  { path: '/editor', label: '编辑器', icon: PenLine },
  { path: '/ai', label: 'AI 协作', icon: Bot },
  { path: '/truth-files', label: '真相文件', icon: FileText },
  { path: '/analytics', label: '分析', icon: BarChart3 },
]

const THEME_ICONS: Record<string, string> = {
  'minimal-white': '☀️',
  'dark': '🌙',
  'warm': '🔥',
}

const THEME_LABELS: Record<string, string> = {
  'minimal-white': '极简白',
  'dark': '深色',
  'warm': '暖色',
}

export function TopBar() {
  const { cycleTheme, theme } = useThemeStore()
  const { mode } = useAICollabStore()
  const { selectedBookId } = useBookshelfStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header
      className="topbar"
      style={{
        height: 'var(--topbar-height)',
        padding: '0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          padding: '0 24px',
          gap: '24px',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--topbar-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.22)',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={20} />
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--app-text-primary)',
                lineHeight: 1.2,
              }}
            >
              NovelCraft
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--app-text-muted)',
                fontWeight: 500,
                marginTop: '1px',
              }}
            >
              AI 小说创作平台
            </div>
          </div>
        </div>

        {/* Navigation — Capsule Pills */}
        <nav
          className="topnav"
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px',
            border: '1px solid var(--app-border)',
            borderRadius: 'var(--app-radius-full)',
            background: 'var(--app-surface-subtle)',
            maxWidth: '560px',
            justifyContent: 'center',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="topnav-pill"
                style={{
                  minWidth: '72px',
                  padding: '8px 14px',
                  borderRadius: 'var(--app-radius-full)',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  background: active ? 'var(--topbar-gradient)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--app-text-muted)',
                  boxShadow: active ? '0 6px 20px rgba(15, 23, 42, 0.22)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* AI Mode Chip */}
          {mode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--app-radius-full)',
                background: 'var(--color-brand-light)',
                color: 'var(--color-brand)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                border: '1px solid var(--color-brand-border)',
              }}
            >
              <Zap size={12} />
              {mode === 'single' ? '单Agent' : mode === 'multi' ? '多Agent' : '蚁群'}
            </div>
          )}

          {/* Status Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: 'var(--app-radius-full)',
              background: 'var(--app-surface-subtle)',
              border: '1px solid var(--app-border)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--app-text-muted)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: selectedBookId ? 'var(--color-success)' : 'var(--app-text-muted)',
                flexShrink: 0,
              }}
            />
            {selectedBookId ? '已就绪' : '待机'}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            title={`主题: ${THEME_LABELS[theme]} (点击切换)`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--app-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              transition: 'all 0.15s ease',
              fontSize: '15px',
              color: 'var(--app-text-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--app-surface-subtle)'
              e.currentTarget.style.borderColor = 'var(--app-border-strong)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--app-surface)'
              e.currentTarget.style.borderColor = 'var(--app-border)'
            }}
          >
            {THEME_ICONS[theme]}
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            title="设置"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--app-radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              transition: 'all 0.15s ease',
              color: 'var(--app-text-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--app-surface-subtle)'
              e.currentTarget.style.borderColor = 'var(--app-border-strong)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--app-surface)'
              e.currentTarget.style.borderColor = 'var(--app-border)'
            }}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
