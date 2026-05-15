import { logger } from '@/shared/utils/logger'
import { isTauri } from '@/shared/utils/tauri-env'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export type ExportFormat = 'txt' | 'markdown' | 'docx' | 'epub' | 'pdf'
export type ExportScope = 'chapter' | 'selection' | 'book'

export interface ExportOptions {
  format: ExportFormat
  scope: ExportScope
  chapters: Array<{ title: string; content: string }>
  bookTitle?: string
  author?: string
  templateId?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildTxt(chapters: Array<{ title: string; content: string }>): string {
  return chapters
    .map((ch) => {
      const text = stripHtml(ch.content)
      return `${ch.title}\n${'='.repeat(ch.title.length * 2)}\n\n${text}`
    })
    .join('\n\n\n')
}

function buildMarkdown(
  chapters: Array<{ title: string; content: string }>,
  bookTitle?: string,
  author?: string,
): string {
  const parts: string[] = []
  if (bookTitle) parts.push(`# ${bookTitle}`)
  if (author) parts.push(`\n*作者：${author}*\n`)

  for (const ch of chapters) {
    parts.push(`## ${ch.title}\n`)
    parts.push(htmlToMarkdown(ch.content))
    parts.push('')
  }

  return parts.join('\n')
}

export async function exportContent(options: ExportOptions): Promise<Blob> {
  const { format, chapters } = options

  switch (format) {
    case 'txt': {
      const text = buildTxt(chapters)
      return new Blob([text], { type: 'text/plain;charset=utf-8' })
    }

    case 'markdown': {
      const md = buildMarkdown(chapters, options.bookTitle, options.author)
      return new Blob([md], { type: 'text/markdown;charset=utf-8' })
    }

    case 'docx':
    case 'epub':
    case 'pdf': {
      const inv = await getInvoke()
      if (inv) {
        try {
          const md = buildMarkdown(chapters, options.bookTitle, options.author)
          const result = await inv<string>('pandoc_convert', {
            input: md,
            format,
            templateId: options.templateId,
          })
          const bytes = Uint8Array.from(atob(result), (c) => c.charCodeAt(0))
          const mimeTypes: Record<string, string> = {
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            epub: 'application/epub+zip',
            pdf: 'application/pdf',
          }
          return new Blob([bytes], { type: mimeTypes[format] || 'application/octet-stream' })
        } catch {
          logger.warn('export', `Pandoc not available for ${format}, falling back to Markdown`)
        }
      }
      const md = buildMarkdown(chapters, options.bookTitle, options.author)
      return new Blob([md], { type: 'text/markdown;charset=utf-8' })
    }

    default: {
      const text = buildTxt(chapters)
      return new Blob([text], { type: 'text/plain;charset=utf-8' })
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    logger.error('export', 'Clipboard write failed')
    return false
  }
}

export function getExportFilename(
  bookTitle: string,
  format: ExportFormat,
  scope: ExportScope,
  chapterTitle?: string,
): string {
  const base = bookTitle.replace(/[<>:"/\\|?*]/g, '_')
  if (scope === 'chapter' && chapterTitle) {
    const chName = chapterTitle.replace(/[<>:"/\\|?*]/g, '_')
    return `${base}_${chName}.${format === 'markdown' ? 'md' : format}`
  }
  return `${base}.${format === 'markdown' ? 'md' : format}`
}
