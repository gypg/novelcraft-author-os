import { useState, useMemo } from 'react'
import { getAuthorIntent, saveAuthorIntent, getCurrentFocus, saveCurrentFocus } from '@/core/input-governance/intent-docs'

export function IntentDocsPanel({ bookId }: { bookId: string }) {
  const [authorIntent, setAuthorIntent] = useState('')
  const [currentFocus, setCurrentFocus] = useState('')
  const [saved, setSaved] = useState(false)

  const initialIntent = useMemo(() => bookId ? getAuthorIntent(bookId).content : '', [bookId])
  const initialFocus = useMemo(() => bookId ? getCurrentFocus(bookId).content : '', [bookId])

  if (authorIntent === '' && initialIntent) setAuthorIntent(initialIntent)
  if (currentFocus === '' && initialFocus) setCurrentFocus(initialFocus)

  const handleSave = () => {
    saveAuthorIntent(bookId, authorIntent)
    saveCurrentFocus(bookId, currentFocus)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>输入治理文档</div>

      <div>
        <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--app-text-muted)' }}>
          长期意图（author_intent）— 你想要什么样的故事
        </label>
        <textarea
          value={authorIntent}
          onChange={(e) => setAuthorIntent(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--app-radius)',
            fontSize: '12px',
            border: '1px solid var(--app-border)',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
          }}
          placeholder="描述你的故事意图、核心主题、目标读者..."
        />
      </div>

      <div>
        <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--app-text-muted)' }}>
          近期关注（current_focus）— 这几章的重点
        </label>
        <textarea
          value={currentFocus}
          onChange={(e) => setCurrentFocus(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--app-radius)',
            fontSize: '12px',
            border: '1px solid var(--app-border)',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
          }}
          placeholder="描述最近几章的重点方向、需要推进的情节..."
        />
      </div>

      <button
        onClick={handleSave}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--app-radius)',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          backgroundColor: saved ? 'oklch(0.65 0.17 145)' : 'var(--color-brand)',
          color: 'white',
        }}
      >
        {saved ? '已保存' : '保存'}
      </button>
    </div>
  )
}
