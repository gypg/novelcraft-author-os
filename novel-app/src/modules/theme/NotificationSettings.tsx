import { useState } from 'react'

interface NotificationSettingsState {
  enabled: boolean
  onChapterComplete: boolean
  onError: boolean
  onPause: boolean
}

const STORAGE_KEY = 'notification-settings'

function getSettings(): NotificationSettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { enabled: true, onChapterComplete: true, onError: true, onPause: true }
  } catch {
    return { enabled: true, onChapterComplete: true, onError: true, onPause: true }
  }
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsState>(getSettings)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const update = (key: keyof NotificationSettingsState, value: boolean) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const requestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: 'var(--app-text-primary)' }}>启用通知</span>
        <button
          onClick={() => update('enabled', !settings.enabled)}
          style={{ width: '40px', height: '20px', borderRadius: '10px', transition: 'background-color 0.2s', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: settings.enabled ? 'oklch(0.65 0.17 145)' : 'var(--app-bg-secondary)' }}
        >
          <span
            style={{ position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', transition: 'transform 0.2s', left: settings.enabled ? '22px' : '2px' }}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--app-text-muted)' }}>章节完成</span>
            <button
              onClick={() => update('onChapterComplete', !settings.onChapterComplete)}
              style={{ width: '32px', height: '16px', borderRadius: '8px', transition: 'background-color 0.2s', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: settings.onChapterComplete ? 'oklch(0.65 0.17 145)' : 'var(--app-bg-secondary)' }}
            >
              <span
                style={{ position: 'absolute', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'white', transition: 'transform 0.2s', left: settings.onChapterComplete ? '18px' : '2px' }}
              />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--app-text-muted)' }}>错误通知</span>
            <button
              onClick={() => update('onError', !settings.onError)}
              style={{ width: '32px', height: '16px', borderRadius: '8px', transition: 'background-color 0.2s', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: settings.onError ? 'oklch(0.65 0.17 145)' : 'var(--app-bg-secondary)' }}
            >
              <span
                style={{ position: 'absolute', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'white', transition: 'transform 0.2s', left: settings.onError ? '18px' : '2px' }}
              />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--app-text-muted)' }}>暂停通知</span>
            <button
              onClick={() => update('onPause', !settings.onPause)}
              style={{ width: '32px', height: '16px', borderRadius: '8px', transition: 'background-color 0.2s', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, backgroundColor: settings.onPause ? 'oklch(0.65 0.17 145)' : 'var(--app-bg-secondary)' }}
            >
              <span
                style={{ position: 'absolute', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'white', transition: 'transform 0.2s', left: settings.onPause ? '18px' : '2px' }}
              />
            </button>
          </div>
        </>
      )}

      <div style={{ fontSize: '11px', paddingTop: '8px', color: 'var(--app-text-muted)' }}>
        当前权限状态：
        <span style={{ color: permission === 'granted' ? 'oklch(0.65 0.17 145)' : permission === 'denied' ? 'oklch(0.6 0.22 25)' : 'var(--app-text-muted)' }}>
          {permission === 'granted' ? '已授权' : permission === 'denied' ? '已拒绝' : '未请求'}
        </span>
        {permission !== 'granted' && (
          <button onClick={requestPermission} style={{ marginLeft: '8px', textDecoration: 'underline', color: 'var(--color-brand)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 'inherit', padding: 0 }}>
            请求权限
          </button>
        )}
      </div>
    </div>
  )
}
