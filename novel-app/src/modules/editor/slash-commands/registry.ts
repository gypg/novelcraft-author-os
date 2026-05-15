import type { Editor } from '@tiptap/react'

export interface SlashCommand {
  name: string
  label: string
  description: string
  icon: string
  aliases?: string[]
  action: (editor: Editor) => void
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'scene',
    label: '场景分隔符',
    description: '插入场景分隔线',
    icon: '—',
    aliases: ['hr', 'divider'],
    action: (editor) => {
      editor.chain().focus().insertSceneBreak().run()
    },
  },
  {
    name: 'dialogue',
    label: '对话高亮',
    description: '高亮当前段落',
    icon: '💬',
    aliases: ['dialog', 'speech'],
    action: (editor) => {
      editor.chain().focus().toggleDialogueHighlight().run()
    },
  },
  {
    name: 'h1',
    label: '一级标题',
    description: '切换为 H1 标题',
    icon: 'H1',
    action: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
  },
  {
    name: 'h2',
    label: '二级标题',
    description: '切换为 H2 标题',
    icon: 'H2',
    action: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
  },
  {
    name: 'h3',
    label: '三级标题',
    description: '切换为 H3 标题',
    icon: 'H3',
    action: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
  },
  {
    name: 'bullet',
    label: '无序列表',
    description: '切换无序列表',
    icon: '•',
    aliases: ['ul', 'list'],
    action: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    name: 'ordered',
    label: '有序列表',
    description: '切换有序列表',
    icon: '1.',
    aliases: ['ol'],
    action: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    name: 'quote',
    label: '引用',
    description: '切换引用块',
    icon: '"',
    aliases: ['blockquote'],
    action: (editor) => {
      editor.chain().focus().toggleBlockquote().run()
    },
  },
  {
    name: 'code',
    label: '代码块',
    description: '切换代码块',
    icon: '<>',
    aliases: ['codeblock'],
    action: (editor) => {
      editor.chain().focus().toggleCodeBlock().run()
    },
  },
  {
    name: 'continue',
    label: 'AI 续写',
    description: '让 AI 继续写作',
    icon: '✨',
    aliases: ['ai', 'write'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:ai-continue'))
    },
  },
  {
    name: 'audit',
    label: 'AI 审计',
    description: '审计当前章节质量',
    icon: '📋',
    aliases: ['review', 'check'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:coordinator', { detail: '/audit' }))
    },
  },
  {
    name: 'revise',
    label: 'AI 修订',
    description: '根据审计结果修订',
    icon: '✏️',
    aliases: ['fix', 'polish'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:coordinator', { detail: '/revise' }))
    },
  },
  {
    name: 'plan',
    label: 'AI 规划',
    description: '规划本章写作目标',
    icon: '📐',
    aliases: ['outline'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:coordinator', { detail: '/plan' }))
    },
  },
  {
    name: 'run',
    label: 'AI 全流程',
    description: '规划→写作→审计→修订',
    icon: '🚀',
    aliases: ['full', 'pipeline'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:coordinator', { detail: '/run' }))
    },
  },
  {
    name: 'polish',
    label: 'AI 润色',
    description: '润色选中文本，提升文采',
    icon: '✨',
    aliases: ['refine', 'improve'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:bubble-operation', { detail: 'polish' }))
    },
  },
  {
    name: 'rewrite',
    label: 'AI 改写',
    description: '改写选中文本，换种表达',
    icon: '🔄',
    aliases: ['rephrase'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:bubble-operation', { detail: 'rewrite' }))
    },
  },
  {
    name: 'deai',
    label: '去 AI 味',
    description: '消除选中文本的 AI 痕迹',
    icon: '🎭',
    aliases: ['humanize', 'natural'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:bubble-operation', { detail: 'deai' }))
    },
  },
  {
    name: 'expand',
    label: 'AI 扩写',
    description: '扩展选中文本，丰富细节',
    icon: '📝',
    aliases: ['elaborate', 'detail'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:bubble-operation', { detail: 'expand' }))
    },
  },
  {
    name: 'condense',
    label: 'AI 缩写',
    description: '精简选中文本，去除冗余',
    icon: '✂️',
    aliases: ['shorten', 'compress'],
    action: (_editor) => {
      window.dispatchEvent(new CustomEvent('slash-command:bubble-operation', { detail: 'condense' }))
    },
  },
]

export function filterCommands(query: string): SlashCommand[] {
  const lower = query.toLowerCase()
  return SLASH_COMMANDS.filter((cmd) => {
    if (cmd.name.includes(lower)) return true
    if (cmd.label.includes(query)) return true
    if (cmd.aliases?.some((a) => a.includes(lower))) return true
    return false
  })
}
