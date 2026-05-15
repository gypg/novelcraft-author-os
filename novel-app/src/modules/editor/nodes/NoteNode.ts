import { Node, mergeAttributes } from '@tiptap/core'

export interface NoteNodeOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteNode: {
      insertNoteNode: (content?: string) => ReturnType
    }
  }
}

export const NoteNode = Node.create<NoteNodeOptions>({
  name: 'noteNode',

  group: 'block',

  content: 'inline*',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({
          'data-collapsed': attributes.collapsed ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="note-node"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'note-node',
        class: 'note-node',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      insertNoteNode:
        (content) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: content ? [{ type: 'text', text: content }] : undefined,
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-n': () => this.editor.commands.insertNoteNode(),
    }
  },
})
