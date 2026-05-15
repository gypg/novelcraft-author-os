import { Mark, mergeAttributes } from '@tiptap/core'

export interface CharacterMarkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    characterMark: {
      setCharacterMark: (name?: string) => ReturnType
      unsetCharacterMark: () => ReturnType
    }
  }
}

export const CharacterMark = Mark.create<CharacterMarkOptions>({
  name: 'characterMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="character-mark"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'character-mark',
        class: 'character-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCharacterMark:
        (name) =>
        ({ commands }) => {
          return commands.setMark(this.name, { characterName: name })
        },
      unsetCharacterMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addInputRules() {
    const mark = this.type
    const rule = {
      find: /「([^」]+)」$/,
      handler: ({ state, range, match }: { state: { tr: { delete: (a: number, b: number) => void; insertText: (t: string, p: number) => void; addMark: (a: number, b: number, m: unknown) => void } }; range: { from: number; to: number }; match: RegExpMatchArray }) => {
        const { tr } = state
        const start = range.from
        const end = range.to
        const content = match[1]
        tr.delete(start, end)
        tr.insertText(content, start)
        tr.addMark(start, start + content.length, mark.create({ characterName: content }))
      },
    }
    return [rule] as unknown as ReturnType<NonNullable<typeof this.parent>>
  },
})
