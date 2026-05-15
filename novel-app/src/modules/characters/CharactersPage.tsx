import { useEffect, useState } from 'react'
import { useBookshelfStore } from '@/modules'
import { CharacterProfilePanel } from './CharacterProfilePanel'
import { loadTruthFile } from '@/core/db/truth-file-repository'

export function CharactersPage() {
  const { selectedBookId } = useBookshelfStore()
  const [matrixJson, setMatrixJson] = useState('')

  useEffect(() => {
    if (!selectedBookId) return
    loadTruthFile(selectedBookId, 'character_matrix')
      .then((row) => setMatrixJson(row?.content_json || ''))
      .catch(() => setMatrixJson(''))
  }, [selectedBookId])

  if (!selectedBookId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--app-text-muted)',
          fontSize: '13px',
        }}
      >
        请先从书架选择一本书
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--app-page-bg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 28px 16px',
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--app-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--color-brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-brand)',
            fontSize: '18px',
          }}
        >
          👤
        </div>
        <div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--app-text-primary)',
            }}
          >
            角色档案
          </div>
          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '2px' }}>
            从角色矩阵中提取的角色卡片，支持关系网络查看
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CharacterProfilePanel characterMatrixJson={matrixJson} />
      </div>
    </div>
  )
}
