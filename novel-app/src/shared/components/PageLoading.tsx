import { Loader2 } from 'lucide-react'

export function PageLoading({ message = '加载中...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
        background: 'var(--app-page-bg)',
      }}
    >
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
      <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', fontWeight: 500 }}>
        {message}
      </div>
    </div>
  )
}

export function InlineLoading({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
}
