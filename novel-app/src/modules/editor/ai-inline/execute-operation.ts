import { callLlm, type ChatMessage } from '@/core/ai-engine/providers'
import { buildStyleGuardPrompt } from '@/core/ai-engine/style-guard'
import { buildAuthorAntiAiRules, buildAuthorProfilePromptSection } from '@/core/author-os/author-profile-prompt'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'
import { getDefaultAuthorProfile } from '@/core/db/author-profile-repository'
import { logger } from '@/shared/utils/logger'

interface ExecuteOperationOptions {
  editor: import('@tiptap/react').Editor
  providerId: string
  model?: string
  prompt: string
  selectedText: string
  onError?: (error: string) => void
}

async function loadDefaultAuthorProfile(): Promise<AuthorProfileRow | null> {
  try {
    return await getDefaultAuthorProfile()
  } catch (error) {
    logger.warn('ai-inline', `Author profile unavailable: ${error}`)
    return null
  }
}

export function buildInlineSystemPrompt(prompt: string, authorProfile: AuthorProfileRow | null): string {
  const sections = [
    buildStyleGuardPrompt(buildAuthorAntiAiRules(authorProfile)),
  ]

  const authorProfilePrompt = buildAuthorProfilePromptSection(authorProfile)
  if (authorProfilePrompt) {
    sections.push(authorProfilePrompt)
  }

  sections.push(prompt)
  return sections.join('\n\n')
}

export async function executeAiOperation({
  editor,
  providerId,
  model,
  prompt,
  selectedText,
  onError,
}: ExecuteOperationOptions): Promise<void> {
  const { from, to } = editor.state.selection
  const originalFrom = from

  editor.chain().focus().deleteRange({ from, to }).run()

  const authorProfile = await loadDefaultAuthorProfile()
  const systemPrompt = buildInlineSystemPrompt(prompt, authorProfile)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: selectedText },
  ]

  let currentPosition = originalFrom

  try {
    await callLlm({
      providerId,
      model,
      messages,
      maxTokens: 2000,
      temperature: 0.7,
      onDelta: (delta) => {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.insertText(delta, currentPosition)
            currentPosition += delta.length
            return true
          })
          .run()
      },
      onError: (err) => {
        logger.error('ai-inline', `Operation failed: ${err}`)
        onError?.(err)
      },
    })
  } catch (err) {
    logger.error('ai-inline', `Operation exception: ${err}`)
    onError?.(String(err))
  }
}

interface GenerateTextOptions {
  providerId: string
  model?: string
  prompt: string
  selectedText: string
  onDelta?: (delta: string) => void
  onError?: (error: string) => void
}

export async function generateAiText({
  providerId,
  model,
  prompt,
  selectedText,
  onDelta,
  onError,
}: GenerateTextOptions): Promise<string> {
  const authorProfile = await loadDefaultAuthorProfile()
  const systemPrompt = buildInlineSystemPrompt(prompt, authorProfile)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: selectedText },
  ]

  try {
    const fullText = await callLlm({
      providerId,
      model,
      messages,
      maxTokens: 2000,
      temperature: 0.7,
      onDelta,
      onError: (err) => {
        logger.error('ai-inline', `Generate failed: ${err}`)
        onError?.(err)
      },
    })
    return fullText
  } catch (err) {
    logger.error('ai-inline', `Generate exception: ${err}`)
    onError?.(String(err))
    throw err
  }
}
