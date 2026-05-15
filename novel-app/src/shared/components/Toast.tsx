import { useState, useCallback, createContext, useContext } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type'], duration?: number, action?: Toast['action']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info', duration: number = 4000, action?: Toast['action']) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, type, duration, action }])
      setTimeout(() => removeToast(id), duration)
    },
    [removeToast],
  )

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
    warning: <AlertTriangle size={16} />,
  }

  const typeStyles: Record<string, { bg: string; border: string; iconColor: string }> = {
    success: { bg: 'var(--color-status-success-bg)', border: 'var(--color-status-success-border)', iconColor: 'var(--color-status-success-icon)' },
    error: { bg: 'var(--color-status-error-bg)', border: 'var(--color-status-error-border)', iconColor: 'var(--color-status-error-icon)' },
    info: { bg: 'var(--color-status-info-bg)', border: 'var(--color-status-info-border)', iconColor: 'var(--color-status-info-icon)' },
    warning: { bg: 'var(--color-status-warning-bg)', border: 'var(--color-status-warning-border)', iconColor: 'var(--color-status-warning-icon)' },
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const style = typeStyles[toast.type] || typeStyles.info
          return (
            <div
              key={toast.id}
              className="toast-enter"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--app-radius-lg)',
                background: style.bg,
                border: `1px solid ${style.border}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--app-text-primary)',
                animation: 'toast-slide-in 0.25s ease-out',
              }}
            >
              <div style={{ flexShrink: 0, color: style.iconColor, marginTop: '1px' }}>
                {icons[toast.type] || icons.info}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{toast.message}</div>
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    style={{
                      marginTop: '6px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: style.iconColor,
                      background: 'transparent',
                      border: `1px solid ${style.border}`,
                      borderRadius: 'var(--app-radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="关闭通知"
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--app-text-muted)',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
