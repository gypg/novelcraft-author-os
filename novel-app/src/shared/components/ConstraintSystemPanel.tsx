import { useState } from 'react'
import { getConstraints, buildConstraintPrompt } from '@/core/constraints/constraint-manager'
import { useBookshelfStore } from '@/modules'

export function ConstraintSystemPanel() {
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const [showPrompt, setShowPrompt] = useState(false)

  if (!selectedBookId) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--app-text-muted)' }}>
        请先选择一本书
      </div>
    )
  }

  const constraints = getConstraints(selectedBookId)
  const prompt = buildConstraintPrompt(constraints)
  const hasAny = prompt.length > 0

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>叙事约束系统</div>

      <div style={{ borderRadius: 'var(--app-radius)', padding: '8px', fontSize: '11px', backgroundColor: 'var(--app-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', backgroundColor: hasAny ? 'oklch(0.65 0.17 145)' : 'var(--app-text-muted)' }} />
          <span style={{ color: 'var(--app-text-primary)' }}>
            {hasAny ? '已配置约束' : '未配置约束'}
          </span>
        </div>
      </div>

      {[
        { name: '全局约束 (MASTER_SETTING)', items: constraints.masterSetting.worldRules.length + constraints.masterSetting.corePromises.length + constraints.masterSetting.forbiddenElements.length },
        { name: '卷级约束 (VOLUME)', items: Object.keys(constraints.volumeContracts).length },
        { name: '章级约束 (CHAPTER)', items: Object.keys(constraints.chapterContracts).length },
        { name: '审查标准 (REVIEW)', items: constraints.reviewContract.requiredDimensions.length + constraints.reviewContract.customRules.length },
      ].map((layer) => (
        <div key={layer.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '4px 8px', borderRadius: 'var(--app-radius)', backgroundColor: 'var(--app-bg-secondary)' }}>
          <span style={{ color: 'var(--app-text-primary)' }}>{layer.name}</span>
          <span style={{ color: layer.items > 0 ? 'oklch(0.65 0.17 145)' : 'var(--app-text-muted)' }}>
            {layer.items} 条
          </span>
        </div>
      ))}

      {hasAny && (
        <>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            style={{ fontSize: '10px', padding: '4px 8px', borderRadius: 'var(--app-radius)', color: 'var(--app-text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            {showPrompt ? '隐藏 Prompt' : '查看注入 Prompt'}
          </button>
          {showPrompt && (
            <pre style={{ fontSize: '10px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', padding: '8px', borderRadius: 'var(--app-radius)', maxHeight: '160px', overflowY: 'auto', backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-primary)', margin: 0 }}>
              {prompt}
            </pre>
          )}
        </>
      )}
    </div>
  )
}
