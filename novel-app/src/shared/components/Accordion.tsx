import { useState } from 'react'

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ border: '1px solid var(--app-border)', borderRadius: 'var(--app-radius)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--app-text-primary)', cursor: 'pointer', background: 'none', border: 'none' }}
      >
        <span>{title}</span>
        <span
          style={{ transition: 'transform 0.2s', fontSize: '12px', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--app-border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
