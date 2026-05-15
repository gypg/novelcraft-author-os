import { logger } from '@/shared/utils/logger'

const WEBHOOK_KEY = 'webhook-url'

function getWebhookUrl(): string | null {
  return localStorage.getItem(WEBHOOK_KEY)
}

export function setWebhookUrl(url: string): void {
  localStorage.setItem(WEBHOOK_KEY, url)
}

async function sendWebhook(title: string, body: string): Promise<void> {
  const url = getWebhookUrl()
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, timestamp: Date.now() }),
    })
    logger.info('notifications', `Webhook sent: ${title}`)
  } catch (err) {
    logger.warn('notifications', `Webhook failed: ${err}`)
  }
}

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function notifyChapterComplete(
  bookTitle: string,
  chapterNumber: number,
): Promise<void> {
  const body = `${bookTitle} 第${chapterNumber}章已自动生成`

  if (await ensurePermission()) {
    try {
      new Notification('章节完成', { body, icon: '/favicon.ico' })
    } catch { /* ignore */ }
  }

  await sendWebhook('章节完成', body)
  logger.info('notifications', `Chapter complete: ${bookTitle} ch.${chapterNumber}`)
}

export async function notifyError(
  bookTitle: string,
  error: string,
): Promise<void> {
  const body = `${bookTitle}: ${error.slice(0, 100)}`

  if (await ensurePermission()) {
    try {
      new Notification('自动驾驶错误', { body, icon: '/favicon.ico' })
    } catch { /* ignore */ }
  }

  await sendWebhook('自动驾驶错误', body)
}

export async function notifyAutoPilotPaused(reason: string): Promise<void> {
  if (await ensurePermission()) {
    try {
      new Notification('自动驾驶暂停', { body: reason, icon: '/favicon.ico' })
    } catch { /* ignore */ }
  }

  await sendWebhook('自动驾驶暂停', reason)
}
