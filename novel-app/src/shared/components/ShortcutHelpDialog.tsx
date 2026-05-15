import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { DEFAULT_SHORTCUTS_INFO } from '@/shared/hooks/use-keyboard-shortcuts'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap'

export function ShortcutHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const focusTrapRef = useFocusTrap(open)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={focusTrapRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label="键盘快捷键"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-brand)',
              }}
            >
              <Keyboard size={18} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                键盘快捷键
              </div>
              <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
                提升效率的快捷操作
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭快捷键面板"
            className="btn-icon"
            style={{ width: '30px', height: '30px', color: 'var(--app-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {DEFAULT_SHORTCUTS_INFO.map((shortcut) => (
            <div
              key={shortcut.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--app-radius-md)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--app-surface-subtle)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--app-text-primary)' }}>
                {shortcut.description}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {shortcut.key.split('+').map((part) => (
                  <kbd
                    key={part}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px',
                      padding: '0 6px',
                      borderRadius: '6px',
                      background: 'var(--app-surface)',
                      border: '1px solid var(--app-border)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: 'var(--app-text-secondary)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    {part}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--app-border)',
            fontSize: '11px',
            color: 'var(--app-text-muted)',
            textAlign: 'center',
          }}
        >
          按 <kbd style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 5px',
            borderRadius: '4px',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
          }}>Esc</kbd> 关闭此面板
        </div>
      </div>
    </div>
  )
}
