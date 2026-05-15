import { Node, mergeAttributes } from '@tiptap/core'
import { InputRule } from '@tiptap/core'

export interface SceneBreakOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBreak: {
      insertSceneBreak: (options?: { separator?: string }) => ReturnType
    }
  }
}

export const SceneBreak = Node.create<SceneBreakOptions>({
  name: 'sceneBreak',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      separator: {
        default: '* * *',
        parseHTML: (element) => element.getAttribute('data-separator') || '* * *',
        renderHTML: (attributes) => ({
          'data-separator': attributes.separator,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="scene-break"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const separator = HTMLAttributes.separator || '* * *'
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'scene-break',
        class: 'scene-break',
      }),
      separator,
    ]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^---\s$/,
        handler: ({ state, range, commands }) => {
          const { from } = range
          const { tr } = state

          // Delete the "---" text
          tr.delete(from - 3, from)

          commands.insertSceneBreak()
        },
      }),
    ]
  },

  addCommands() {
    return {
      insertSceneBreak:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { separator: options?.separator },
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.insertSceneBreak(),
    }
  },
})
