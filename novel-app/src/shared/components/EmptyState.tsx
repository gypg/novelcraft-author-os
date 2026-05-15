import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px 24px',
        background: 'var(--app-page-bg)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--app-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: 'var(--app-text-muted)',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--app-text-primary)',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--app-text-muted)',
            maxWidth: '320px',
            lineHeight: 1.6,
            marginBottom: action ? '20px' : 0,
          }}
        >
          {description}
        </div>
      )}
      {action}
    </div>
  )
}
