import { Mark, mergeAttributes } from '@tiptap/core'

export interface DialogueHighlightOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dialogueHighlight: {
      toggleDialogueHighlight: () => ReturnType
    }
  }
}

export const DialogueHighlight = Mark.create<DialogueHighlightOptions>({
  name: 'dialogueHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="dialogue-highlight"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'dialogue-highlight',
        class: 'dialogue-highlight',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      toggleDialogueHighlight:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.toggleDialogueHighlight(),
    }
  },
})
