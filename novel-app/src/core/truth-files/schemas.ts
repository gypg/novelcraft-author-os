import { z } from 'zod'

// 1. current_state.json — 世界状态
export const CurrentStateSchema = z.object({
  location: z.string().default(''),
  time: z.string().default(''),
  weather: z.string().default(''),
  conditions: z.record(z.string(), z.unknown()).default({}),
})

// 2. hooks.json — 伏笔池
export const HookSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['foreshadowing', 'mystery', 'promise', 'tension']),
  planted_chapter: z.number().int(),
  status: z.enum(['planted', 'developing', 'payoff', 'abandoned']),
  payoff_chapter: z.number().int().nullable().optional(),
  description: z.string().default(''),
})

export const HooksSchema = z.object({
  hooks: z.array(HookSchema).default([]),
})

// 3. summaries.json — 章节摘要
export const ChapterSummarySchema = z.object({
  chapter: z.number().int(),
  summary: z.string(),
  key_events: z.array(z.string()).default([]),
})

export const SummariesSchema = z.object({
  chapters: z.array(ChapterSummarySchema).default([]),
})

// 4. subplots.json — 支线进度
export const SubplotSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['planned', 'active', 'resolved', 'abandoned']),
  start_chapter: z.number().int().nullable().optional(),
  end_chapter: z.number().int().nullable().optional(),
  related_chapters: z.array(z.number().int()).default([]),
  description: z.string().default(''),
})

export const SubplotsSchema = z.object({
  subplots: z.array(SubplotSchema).default([]),
})

// 5. emotional_arcs.json — 情感弧线
export const EmotionPointSchema = z.object({
  chapter: z.number().int(),
  emotion: z.string(),
  intensity: z.number().min(0).max(10),
})

export const CharacterArcSchema = z.object({
  character: z.string(),
  emotions: z.array(EmotionPointSchema).default([]),
})

export const EmotionalArcsSchema = z.object({
  arcs: z.array(CharacterArcSchema).default([]),
})

// 6. character_matrix.json — 角色交互矩阵
export const RelationshipSchema = z.object({
  char_a: z.string(),
  char_b: z.string(),
  type: z.enum(['ally', 'enemy', 'neutral', 'romantic', 'family', 'mentor']),
  status: z.string().default(''),
  changed_chapter: z.number().int().nullable().optional(),
  description: z.string().default(''),
})

export const CharacterMatrixSchema = z.object({
  relationships: z.array(RelationshipSchema).default([]),
})

// 7. particle_ledger.json — 资源账本
export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string().default(''),
  quantity: z.number().default(1),
  chapter_updated: z.number().int().nullable().optional(),
  description: z.string().default(''),
})

export const ParticleLedgerSchema = z.object({
  items: z.array(ItemSchema).default([]),
})

// All schemas map
export const TruthFileSchemas = {
  current_state: CurrentStateSchema,
  hooks: HooksSchema,
  summaries: SummariesSchema,
  subplots: SubplotsSchema,
  emotional_arcs: EmotionalArcsSchema,
  character_matrix: CharacterMatrixSchema,
  particle_ledger: ParticleLedgerSchema,
} as const

export type TruthFileName = keyof typeof TruthFileSchemas
export type CurrentState = z.infer<typeof CurrentStateSchema>
export type Hooks = z.infer<typeof HooksSchema>
export type Summaries = z.infer<typeof SummariesSchema>
export type Subplots = z.infer<typeof SubplotsSchema>
export type EmotionalArcs = z.infer<typeof EmotionalArcsSchema>
export type CharacterMatrix = z.infer<typeof CharacterMatrixSchema>
export type ParticleLedger = z.infer<typeof ParticleLedgerSchema>
