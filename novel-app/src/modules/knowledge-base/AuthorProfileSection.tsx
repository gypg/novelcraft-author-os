import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { logger } from '@/shared/utils/logger'
import {
  createAuthorProfile,
  getDefaultAuthorProfile,
  listAuthorProfiles,
  updateAuthorProfile,
} from '@/core/db/author-profile-repository'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'
import {
  authorProfileRowToDraft,
  createEmptyAuthorProfileDraft,
  draftToCreateAuthorProfileInput,
  draftToUpdateAuthorProfileInput,
  type AuthorProfileDraft,
} from './author-profile-view-model'

function panelStyle(): React.CSSProperties {
  return {
    background: 'var(--app-surface)',
    border: '1px solid var(--app-border)',
    borderRadius: 'var(--app-radius-xl)',
    padding: '16px',
    boxShadow: 'var(--app-shadow-sm)',
  }
}

function fieldStyle(): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap: '6px' }
}

function labelStyle(): React.CSSProperties {
  return { fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)' }
}

type AuthorProfileMessage = {
  type: 'success' | 'error'
  text: string
}

function newProfileId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`
}

export function AuthorProfileSection() {
  const [profiles, setProfiles] = useState<AuthorProfileRow[]>([])
  const [draft, setDraft] = useState<AuthorProfileDraft>(() => createEmptyAuthorProfileDraft())
  const [message, setMessage] = useState<AuthorProfileMessage | null>(null)

  const loadProfiles = useCallback(async () => {
    try {
      const [nextProfiles, defaultProfile] = await Promise.all([
        listAuthorProfiles(),
        getDefaultAuthorProfile(),
      ])
      setProfiles(nextProfiles)
      setDraft(defaultProfile ? authorProfileRowToDraft(defaultProfile) : createEmptyAuthorProfileDraft())
    } catch (error) {
      setMessage({ type: 'error', text: `加载作者档案失败：${error}` })
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadProfiles)
  }, [loadProfiles])

  const updateDraft = (updates: Partial<AuthorProfileDraft>) => {
    setDraft((current) => ({ ...current, ...updates }))
  }

  const handleSelectProfile = (profileId: string) => {
    const profile = profiles.find((candidate) => candidate.id === profileId)
    setDraft(profile ? authorProfileRowToDraft(profile) : createEmptyAuthorProfileDraft())
  }

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setMessage({ type: 'error', text: '请先填写笔名/档案名' })
      return
    }

    try {
      if (draft.id) {
        const updated = await updateAuthorProfile(draft.id, draftToUpdateAuthorProfileInput(draft))
        setMessage({ type: 'success', text: '作者档案已更新' })
        setDraft(authorProfileRowToDraft(updated))
      } else {
        const created = await createAuthorProfile(draftToCreateAuthorProfileInput(draft, newProfileId()))
        setMessage({ type: 'success', text: '作者档案已创建' })
        setDraft(authorProfileRowToDraft(created))
      }
      await loadProfiles()
    } catch (error) {
      logger.error('author-profile', `Save failed: ${error}`)
      setMessage({ type: 'error', text: `保存作者档案失败：${error instanceof Error ? error.message : String(error)}` })
    }
  }

  return (
    <section style={{ ...panelStyle(), display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--app-text-primary)' }}>作者档案</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--app-text-muted)' }}>
            显式记录你的写作偏好；最新更新的档案会作为默认 Author Profile 注入 Writer Agent。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={loadProfiles}><RefreshCw size={14} /> 刷新</button>
          <button className="btn-primary" onClick={handleSave}><Save size={14} /> 保存</button>
        </div>
      </header>

      {message && (
        <div style={{ color: message.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '12px' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px' }}>
        <aside style={{ ...panelStyle(), boxShadow: 'none' }}>
          <button className={draft.id === null ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', marginBottom: '8px' }} onClick={() => setDraft(createEmptyAuthorProfileDraft())}>
            新建作者档案
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                className={draft.id === profile.id ? 'btn-primary' : 'btn-secondary'}
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleSelectProfile(profile.id)}
              >
                {profile.name}{index === 0 ? ' · 默认' : ''}
              </button>
            ))}
          </div>
        </aside>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>笔名 / 档案名</span>
            <input className="input" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="例如：山海" />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>偏好题材（换行或逗号分隔）</span>
            <textarea className="input" value={draft.preferredGenresText} onChange={(event) => updateDraft({ preferredGenresText: event.target.value })} />
          </label>
          <label style={{ ...fieldStyle(), gridColumn: '1 / -1' }}>
            <span style={labelStyle()}>自述风格</span>
            <textarea className="input" value={draft.writingStyle} onChange={(event) => updateDraft({ writingStyle: event.target.value })} placeholder="例如：短句为主，少用解释性旁白。" />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>常用/高频句式（用于回避重复）</span>
            <textarea className="input" value={draft.commonPhrasesText} onChange={(event) => updateDraft({ commonPhrasesText: event.target.value })} />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>禁用词</span>
            <textarea className="input" value={draft.forbiddenWordsText} onChange={(event) => updateDraft({ forbiddenWordsText: event.target.value })} />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>偏好主题</span>
            <textarea className="input" value={draft.favoriteThemesText} onChange={(event) => updateDraft({ favoriteThemesText: event.target.value })} />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>视角偏好</span>
            <input className="input" value={draft.povPreference} onChange={(event) => updateDraft({ povPreference: event.target.value })} />
          </label>
          <label style={fieldStyle()}>
            <span style={labelStyle()}>节奏偏好</span>
            <input className="input" value={draft.pacePreference} onChange={(event) => updateDraft({ pacePreference: event.target.value })} />
          </label>
          <label style={{ ...fieldStyle(), gridColumn: '1 / -1' }}>
            <span style={labelStyle()}>备注</span>
            <textarea className="input" value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} />
          </label>
        </div>
      </div>
    </section>
  )
}
