import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text: string): string {
  let result = escapeHtml(text)
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>')
  result = result.replace(/`(.*?)`/g, '<code style="background: var(--app-bg-secondary); padding: 1px 4px; border-radius: 3px; font-size: 0.85em;">$1</code>')
  result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: var(--color-brand); text-decoration: underline;">$1</a>')
  return result
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const htmlLines: string[] = []

  let inCodeBlock = false
  let codeContent = ''

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlLines.push(`<pre style="background: var(--app-bg-secondary); padding: 8px 12px; border-radius: var(--app-radius); font-size: 12px; overflow-x: auto;"><code>${escapeHtml(codeContent.trim())}</code></pre>`)
        codeContent = ''
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += line + '\n'
      continue
    }

    const trimmed = line.trim()

    if (trimmed.startsWith('### ')) {
      htmlLines.push(`<h3 style="font-size: 14px; font-weight: 600; margin: 8px 0 4px;">${renderInline(trimmed.slice(4))}</h3>`)
    } else if (trimmed.startsWith('## ')) {
      htmlLines.push(`<h2 style="font-size: 16px; font-weight: 600; margin: 10px 0 6px;">${renderInline(trimmed.slice(3))}</h2>`)
    } else if (trimmed.startsWith('# ')) {
      htmlLines.push(`<h1 style="font-size: 18px; font-weight: 700; margin: 12px 0 8px;">${renderInline(trimmed.slice(2))}</h1>`)
    }
    else if (trimmed === '---' || trimmed === '***') {
      htmlLines.push('<hr style="border: none; border-top: 1px solid var(--app-border); margin: 8px 0;" />')
    }
    else if (trimmed.startsWith('- ')) {
      htmlLines.push(`<li style="margin-left: 16px; margin-bottom: 2px;">${renderInline(trimmed.slice(2))}</li>`)
    }
    else if (trimmed.startsWith('> ')) {
      htmlLines.push(`<blockquote style="border-left: 3px solid var(--app-border); padding-left: 12px; color: var(--app-text-muted); margin: 4px 0;">${renderInline(trimmed.slice(2))}</blockquote>`)
    }
    else if (trimmed === '') {
      htmlLines.push('<br />')
    }
    else {
      htmlLines.push(`<p style="margin: 2px 0;">${renderInline(trimmed)}</p>`)
    }
  }

  return htmlLines.join('\n')
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => markdownToHtml(content), [content])

  return (
    <div
      style={{ fontSize: '14px', lineHeight: '1.625', color: 'var(--app-text-primary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
