import { logger } from '@/shared/utils/logger'

export function markdownToHtml(md: string): string {
  let html = md

  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  html = html.replace(/^---$/gm, '<hr>')

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  const lines = html.split('\n')
  const result: string[] = []
  let inParagraph = false

  for (const line of lines) {
    const trimmed = line.trim()
    const isBlockElement = /^<(h[1-6]|ul|ol|li|blockquote|hr|div|table|pre|code)/.test(trimmed)

    if (trimmed === '') {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      continue
    }

    if (isBlockElement) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      result.push(trimmed)
    } else {
      if (!inParagraph) {
        result.push('<p>')
        inParagraph = true
      }
      result.push(trimmed)
    }
  }

  if (inParagraph) {
    result.push('</p>')
  }

  return result.join('\n')
}

export function parseMarkdownChapters(md: string): Array<{ title: string; content: string }> {
  const lines = md.split('\n')
  const chapters: Array<{ title: string; content: string }> = []
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    const h1Match = line.match(/^# (.+)$/)

    if (h2Match) {
      if (currentTitle || currentLines.length > 0) {
        chapters.push({
          title: currentTitle || '未命名章节',
          content: markdownToHtml(currentLines.join('\n')),
        })
      }
      currentTitle = h2Match[1].trim()
      currentLines = []
    } else if (h1Match && chapters.length === 0 && !currentTitle) {
      currentTitle = ''
    } else {
      currentLines.push(line)
    }
  }

  if (currentTitle || currentLines.length > 0) {
    chapters.push({
      title: currentTitle || '未命名章节',
      content: markdownToHtml(currentLines.join('\n')),
    })
  }

  if (chapters.length === 0) {
    chapters.push({
      title: '未命名章节',
      content: markdownToHtml(md),
    })
  }

  logger.info('import', `Parsed ${chapters.length} chapter(s) from Markdown`)
  return chapters
}
