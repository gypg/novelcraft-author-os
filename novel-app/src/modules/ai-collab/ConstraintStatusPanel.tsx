import { useMemo, useState, useCallback } from 'react'
import {
  getConstraints,
  saveConstraints,
  buildConstraintPrompt,
} from '@/core/constraints/constraint-manager'
import type {
  NarrativeConstraints,
  MasterSetting,
  VolumeContract,
  ChapterContract,
  ReviewContract,
} from '@/core/constraints/schemas'
import { useBookshelfStore } from '@/modules'

interface ConstraintStatusPanelProps {
  bookId?: string
}

type ConstraintLayer = 'master' | 'volume' | 'chapter' | 'review'

export function ConstraintStatusPanel({ bookId }: ConstraintStatusPanelProps) {
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const id = bookId || selectedBookId
  const [activeLayer, setActiveLayer] = useState<ConstraintLayer>('master')
  const [showPrompt, setShowPrompt] = useState(false)
  const [constraints, setConstraints] = useState<NarrativeConstraints | null>(() =>
    id ? getConstraints(id) : null
  )
  const [volumeId, setVolumeId] = useState('')
  const [chapterId, setChapterId] = useState('')

  const _refresh = useCallback(() => {
    if (!id) return
    setConstraints(getConstraints(id))
  }, [id])

  const save = useCallback(
    (updated: NarrativeConstraints) => {
      if (!id) return
      saveConstraints(id, updated)
      setConstraints(updated)
    },
    [id],
  )

  const saturation = useMemo(() => {
    if (!constraints) return { filled: 0, total: 0, percent: 0 }
    let filled = 0
    let total = 0

    const ms = constraints.masterSetting
    total += 4
    if (ms.worldRules.length > 0) filled++
    if (ms.corePromises.length > 0) filled++
    if (ms.forbiddenElements.length > 0) filled++
    if (ms.narrativeTone) filled++

    const vcKeys = Object.keys(constraints.volumeContracts)
    total += 1
    if (vcKeys.length > 0) filled++

    const ccKeys = Object.keys(constraints.chapterContracts)
    total += 1
    if (ccKeys.length > 0) filled++

    const rc = constraints.reviewContract
    total += 2
    if (rc.requiredDimensions.length > 0 || rc.customRules.length > 0) filled++
    if (rc.qualityThreshold !== 70) filled++

    return { filled, total, percent: Math.round((filled / total) * 100) }
  }, [constraints])

  if (!constraints) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--app-text-muted)' }}>
        请先选择一本书
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Saturation bar */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
            约束饱和度
          </span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: saturation.percent > 60 ? 'var(--color-success)' : saturation.percent > 30 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
            {saturation.filled}/{saturation.total} ({saturation.percent}%)
          </span>
        </div>
        <div
          style={{
            height: '4px',
            borderRadius: '2px',
            background: 'var(--app-surface-subtle)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${saturation.percent}%`,
              borderRadius: '2px',
              background: saturation.percent > 60
                ? 'var(--color-success)'
                : saturation.percent > 30
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Layer tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        {([
          { key: 'master' as const, label: '全局', color: 'var(--color-brand)' },
          { key: 'volume' as const, label: '卷级', color: 'var(--color-info)' },
          { key: 'chapter' as const, label: '章级', color: 'var(--color-warning)' },
          { key: 'review' as const, label: '审查', color: 'var(--color-danger)' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveLayer(tab.key)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: activeLayer === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              color: activeLayer === tab.key ? tab.color : 'var(--app-text-muted)',
              fontSize: '10px',
              fontWeight: activeLayer === tab.key ? 700 : 600,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layer content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {activeLayer === 'master' && (
          <MasterSettingEditor
            setting={constraints.masterSetting}
            onChange={(ms) => save({ ...constraints, masterSetting: ms })}
          />
        )}
        {activeLayer === 'volume' && (
          <VolumeContractEditor
            contracts={constraints.volumeContracts}
            activeVolumeId={volumeId}
            onSelectVolume={setVolumeId}
            onChange={(vc) => save({ ...constraints, volumeContracts: vc })}
          />
        )}
        {activeLayer === 'chapter' && (
          <ChapterContractEditor
            contracts={constraints.chapterContracts}
            activeChapterId={chapterId}
            onSelectChapter={setChapterId}
            onChange={(cc) => save({ ...constraints, chapterContracts: cc })}
          />
        )}
        {activeLayer === 'review' && (
          <ReviewContractEditor
            contract={constraints.reviewContract}
            onChange={(rc) => save({ ...constraints, reviewContract: rc })}
          />
        )}
      </div>

      {/* Prompt preview */}
      <div
        style={{
          borderTop: '1px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          style={{
            width: '100%',
            padding: '8px 14px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--app-text-muted)',
            textAlign: 'left',
          }}
        >
          {showPrompt ? '▼ 隐藏约束 Prompt' : '▶ 查看约束 Prompt'}
        </button>
        {showPrompt && (
          <pre
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              padding: '8px 14px 12px',
              margin: 0,
              maxHeight: '120px',
              overflowY: 'auto',
              color: 'var(--app-text-muted)',
              background: 'var(--app-surface-subtle)',
            }}
          >
            {buildConstraintPrompt(constraints) || '暂无约束配置'}
          </pre>
        )}
      </div>
    </div>
  )
}

function TagListInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
    setInput('')
  }

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: 'var(--app-radius-full)',
              background: 'var(--color-brand-light)',
              color: 'var(--color-brand)',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {v}
            <button
              onClick={() => remove(i)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--color-brand)',
                fontSize: '12px',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder || '输入后回车添加...'}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--app-radius-md)',
            border: 'none',
            background: input.trim() ? 'var(--color-brand)' : 'var(--app-surface-subtle)',
            color: input.trim() ? 'var(--app-text-inverse)' : 'var(--app-text-muted)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

function MasterSettingEditor({
  setting,
  onChange,
}: {
  setting: MasterSetting
  onChange: (s: MasterSetting) => void
}) {
  return (
    <div>
      <TagListInput
        label="世界观规则"
        values={setting.worldRules}
        onChange={(v) => onChange({ ...setting, worldRules: v })}
        placeholder="例：修仙体系分九境..."
      />
      <TagListInput
        label="核心承诺（不可违背）"
        values={setting.corePromises}
        onChange={(v) => onChange({ ...setting, corePromises: v })}
        placeholder="例：主角不会背叛朋友..."
      />
      <TagListInput
        label="禁区清单（绝不出现）"
        values={setting.forbiddenElements}
        onChange={(v) => onChange({ ...setting, forbiddenElements: v })}
        placeholder="例：不出现真实政治人物..."
      />
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
          叙事基调
        </div>
        <input
          value={setting.narrativeTone}
          onChange={(e) => onChange({ ...setting, narrativeTone: e.target.value })}
          placeholder="例：轻松幽默 / 沉郁悲壮 / 冷峻克制"
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
            fontSize: '11px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

function VolumeContractEditor({
  contracts,
  activeVolumeId,
  onSelectVolume,
  onChange,
}: {
  contracts: Record<string, VolumeContract>
  activeVolumeId: string
  onSelectVolume: (id: string) => void
  onChange: (vc: Record<string, VolumeContract>) => void
}) {
  const [newId, setNewId] = useState('')
  const keys = Object.keys(contracts)
  const active = activeVolumeId && contracts[activeVolumeId] ? contracts[activeVolumeId] : null

  const addVolume = () => {
    const trimmed = newId.trim()
    if (!trimmed || contracts[trimmed]) return
    onChange({
      ...contracts,
      [trimmed]: { mandatoryNodes: [], forbiddenReveals: [], newCharacters: [], emotionalArc: '' },
    })
    onSelectVolume(trimmed)
    setNewId('')
  }

  const removeVolume = (id: string) => {
    const next = { ...contracts }
    delete next[id]
    onChange(next)
    if (activeVolumeId === id) onSelectVolume('')
  }

  const updateActive = (vc: VolumeContract) => {
    if (!activeVolumeId) return
    onChange({ ...contracts, [activeVolumeId]: vc })
  }

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '8px' }}>
        卷级约束
      </div>

      {keys.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {keys.map((k) => (
            <span
              key={k}
              onClick={() => onSelectVolume(k)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: 'var(--app-radius-full)',
                background: activeVolumeId === k ? 'var(--color-info-dim)' : 'var(--app-surface-subtle)',
                color: activeVolumeId === k ? 'var(--color-info)' : 'var(--app-text-muted)',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {k}
              <button
                onClick={(e) => { e.stopPropagation(); removeVolume(k) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontSize: '12px', padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addVolume()}
          placeholder="输入卷名后回车添加..."
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          onClick={addVolume}
          disabled={!newId.trim()}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--app-radius-md)',
            border: 'none',
            background: newId.trim() ? 'var(--color-info)' : 'var(--app-surface-subtle)',
            color: newId.trim() ? 'white' : 'var(--app-text-muted)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: newId.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          + 添加卷
        </button>
      </div>

      {active && (
        <div
          style={{
            padding: '10px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface-subtle)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-info)', marginBottom: '8px' }}>
            {activeVolumeId}
          </div>
          <TagListInput
            label="必经节点"
            values={active.mandatoryNodes}
            onChange={(v) => updateActive({ ...active, mandatoryNodes: v })}
            placeholder="例：主角突破金丹..."
          />
          <TagListInput
            label="禁止揭露"
            values={active.forbiddenReveals}
            onChange={(v) => updateActive({ ...active, forbiddenReveals: v })}
            placeholder="例：不能揭露师父身份..."
          />
          <TagListInput
            label="新角色"
            values={active.newCharacters}
            onChange={(v) => updateActive({ ...active, newCharacters: v })}
            placeholder="例：神秘老者..."
          />
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
            情感弧线
          </div>
          <input
            value={active.emotionalArc}
            onChange={(e) => updateActive({ ...active, emotionalArc: e.target.value })}
            placeholder="例：低谷→觉醒→逆袭"
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 'var(--app-radius-md)',
              border: '1px solid var(--app-border)',
              background: 'var(--app-input-bg)',
              color: 'var(--app-text-primary)',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  )
}

function ChapterContractEditor({
  contracts,
  activeChapterId,
  onSelectChapter,
  onChange,
}: {
  contracts: Record<string, ChapterContract>
  activeChapterId: string
  onSelectChapter: (id: string) => void
  onChange: (cc: Record<string, ChapterContract>) => void
}) {
  const [newId, setNewId] = useState('')
  const keys = Object.keys(contracts)
  const active = activeChapterId && contracts[activeChapterId] ? contracts[activeChapterId] : null

  const addChapter = () => {
    const trimmed = newId.trim()
    if (!trimmed || contracts[trimmed]) return
    onChange({
      ...contracts,
      [trimmed]: { requiredScenes: [], forbiddenActions: [], foreshadowingToAddress: [], targetWordRange: { min: 2000, max: 5000 } },
    })
    onSelectChapter(trimmed)
    setNewId('')
  }

  const removeChapter = (id: string) => {
    const next = { ...contracts }
    delete next[id]
    onChange(next)
    if (activeChapterId === id) onSelectChapter('')
  }

  const updateActive = (cc: ChapterContract) => {
    if (!activeChapterId) return
    onChange({ ...contracts, [activeChapterId]: cc })
  }

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '8px' }}>
        章级约束
      </div>

      {keys.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {keys.map((k) => (
            <span
              key={k}
              onClick={() => onSelectChapter(k)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: 'var(--app-radius-full)',
                background: activeChapterId === k ? 'var(--color-warning-light)' : 'var(--app-surface-subtle)',
                color: activeChapterId === k ? 'var(--color-warning)' : 'var(--app-text-muted)',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {k}
              <button
                onClick={(e) => { e.stopPropagation(); removeChapter(k) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontSize: '12px', padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addChapter()}
          placeholder="输入章节名后回车添加..."
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          onClick={addChapter}
          disabled={!newId.trim()}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--app-radius-md)',
            border: 'none',
            background: newId.trim() ? 'var(--color-warning)' : 'var(--app-surface-subtle)',
            color: newId.trim() ? 'white' : 'var(--app-text-muted)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: newId.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          + 添加章
        </button>
      </div>

      {active && (
        <div
          style={{
            padding: '10px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface-subtle)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '8px' }}>
            {activeChapterId}
          </div>
          <TagListInput
            label="必要场景"
            values={active.requiredScenes}
            onChange={(v) => updateActive({ ...active, requiredScenes: v })}
            placeholder="例：主角与反派初遇..."
          />
          <TagListInput
            label="禁止行为"
            values={active.forbiddenActions}
            onChange={(v) => updateActive({ ...active, forbiddenActions: v })}
            placeholder="例：不能使用禁术..."
          />
          <TagListInput
            label="待回收伏笔"
            values={active.foreshadowingToAddress}
            onChange={(v) => updateActive({ ...active, foreshadowingToAddress: v })}
            placeholder="例：第一章的神秘信件..."
          />
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
            目标字数范围
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              value={active.targetWordRange.min}
              onChange={(e) => updateActive({ ...active, targetWordRange: { ...active.targetWordRange, min: Number(e.target.value) } })}
              style={{
                width: '80px',
                padding: '4px 8px',
                borderRadius: 'var(--app-radius-md)',
                border: '1px solid var(--app-border)',
                background: 'var(--app-input-bg)',
                color: 'var(--app-text-primary)',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>~</span>
            <input
              type="number"
              value={active.targetWordRange.max}
              onChange={(e) => updateActive({ ...active, targetWordRange: { ...active.targetWordRange, max: Number(e.target.value) } })}
              style={{
                width: '80px',
                padding: '4px 8px',
                borderRadius: 'var(--app-radius-md)',
                border: '1px solid var(--app-border)',
                background: 'var(--app-input-bg)',
                color: 'var(--app-text-primary)',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>字</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewContractEditor({
  contract,
  onChange,
}: {
  contract: ReviewContract
  onChange: (rc: ReviewContract) => void
}) {
  return (
    <div>
      <TagListInput
        label="审查维度"
        values={contract.requiredDimensions}
        onChange={(v) => onChange({ ...contract, requiredDimensions: v })}
        placeholder="例：逻辑一致性 / 角色行为合理性..."
      />
      <TagListInput
        label="自定义规则"
        values={contract.customRules}
        onChange={(v) => onChange({ ...contract, customRules: v })}
        placeholder="例：每章至少一次对话..."
      />
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
          质量阈值
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={contract.qualityThreshold}
            onChange={(e) => onChange({ ...contract, qualityThreshold: Number(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: contract.qualityThreshold >= 80
                ? 'var(--color-success)'
                : contract.qualityThreshold >= 50
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
              minWidth: '32px',
              textAlign: 'right',
            }}
          >
            {contract.qualityThreshold}
          </span>
        </div>
      </div>
    </div>
  )
}
