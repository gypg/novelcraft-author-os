import StarterKit from '@tiptap/starter-kit'
import type { Extensions } from '@tiptap/react'
import { SceneBreak } from './nodes/SceneBreak'
import { NoteNode } from './nodes/NoteNode'
import { DialogueHighlight } from './marks/DialogueHighlight'
import { CharacterMark } from './marks/CharacterMark'
import { SlashCommandExtension } from './slash-commands/suggestion'
import { SearchReplace } from './extensions/SearchReplace'

export const baseExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    horizontalRule: false,
  }),
  SceneBreak,
  NoteNode,
  DialogueHighlight,
  CharacterMark,
  SlashCommandExtension,
  SearchReplace,
]
