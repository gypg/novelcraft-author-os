import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Copy, CheckCircle2 } from 'lucide-react'
import { logger } from '@/shared/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
  level?: 'app' | 'page'
}

interface State {
  hasError: boolean
  error: Error | null
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, copied: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false }
  }

  componentDidCatch(error: Error) {
    logger.error('ErrorBoundary', String(error))
    this.props.onError?.(error)
  }

  handleCopy = () => {
    const text = this.state.error?.stack || this.state.error?.message || ''
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, copied: false })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const isPage = this.props.level === 'page'
      const errorMsg = this.state.error?.message || '未知错误'
      const errorStack = this.state.error?.stack || ''

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isPage ? '40px 24px' : '60px 40px',
            height: '100%',
            background: 'var(--app-page-bg)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: isPage ? '48px' : '64px',
              height: isPage ? '48px' : '64px',
              borderRadius: '50%',
              background: 'var(--color-status-error-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={isPage ? 24 : 32} style={{ color: 'var(--color-status-error-icon)' }} />
          </div>

          <div
            style={{
              fontSize: isPage ? '16px' : '20px',
              fontWeight: 700,
              color: 'var(--app-text-primary)',
              marginBottom: '8px',
            }}
          >
            {isPage ? '页面渲染出错' : '应用出错了'}
          </div>

          <div
            style={{
              fontSize: '13px',
              color: 'var(--app-text-muted)',
              marginBottom: '16px',
              maxWidth: '400px',
              lineHeight: 1.6,
            }}
          >
            {isPage ? '此页面遇到了问题，其他功能不受影响' : '请关闭应用重新打开，或查看控制台获取错误详情'}
          </div>

          <div
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: 'var(--app-radius-lg)',
              padding: '12px 16px',
              maxWidth: '500px',
              width: '100%',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-status-error-icon)',
              maxHeight: '120px',
              overflowY: 'auto',
              wordBreak: 'break-all',
            }}
          >
            {errorMsg}
          </div>

          {errorStack && (
            <details
              style={{
                maxWidth: '500px',
                width: '100%',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              <summary
                style={{
                  fontSize: '12px',
                  color: 'var(--app-text-muted)',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                错误堆栈详情
              </summary>
              <pre
                style={{
                  background: 'var(--app-surface)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 'var(--app-radius-md)',
                  padding: '12px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--app-text-muted)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {errorStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-md)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--app-surface)',
                color: 'var(--app-text-primary)',
              }}
            >
              <RotateCcw size={14} />
              重试
            </button>
            <button
              onClick={this.handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                border: '1px solid var(--app-border)',
                borderRadius: 'var(--app-radius-md)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--app-surface)',
                color: 'var(--app-text-muted)',
              }}
            >
              {this.state.copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {this.state.copied ? '已复制' : '复制错误'}
            </button>
            {!isPage && (
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 'var(--app-radius-md)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'var(--color-brand)',
                  color: 'var(--app-text-inverse)',
                }}
              >
                刷新页面
              </button>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary level="page">{children}</ErrorBoundary>
}
