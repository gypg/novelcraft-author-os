import { Extension, type Editor } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import { Suggestion, type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { filterCommands, type SlashCommand } from './registry'
import { SlashCommandList } from './SlashCommandList'

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      Suggestion({
        editor,
        char: '/',

        items: ({ query }: { query: string }): SlashCommand[] => {
          return filterCommands(query)
        },

        render: () => {
          let component: ReactRenderer | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) return

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },

            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props)

              if (!props.clientRect) return

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }

              return (
                (component?.ref as { onKeyDown?: (props: SuggestionKeyDownProps) => boolean })
                  ?.onKeyDown?.(props) ?? false
              )
            },

            onExit: () => {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },

        command: (props: { editor: Editor; props: SlashCommand }) => {
          props.props.action(props.editor)
        },
      }),
    ]
  },
})
