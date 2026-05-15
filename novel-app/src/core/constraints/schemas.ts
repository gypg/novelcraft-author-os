import { z } from 'zod'

// Master Setting — 全局约束
export const MasterSettingSchema = z.object({
  worldRules: z.array(z.string()).default([]),
  corePromises: z.array(z.string()).default([]),
  forbiddenElements: z.array(z.string()).default([]),
  narrativeTone: z.string().default(''),
})

// Volume Contract — 卷级约束
export const VolumeContractSchema = z.object({
  mandatoryNodes: z.array(z.string()).default([]),
  forbiddenReveals: z.array(z.string()).default([]),
  newCharacters: z.array(z.string()).default([]),
  emotionalArc: z.string().default(''),
})

// Chapter Contract — 章级约束
export const ChapterContractSchema = z.object({
  requiredScenes: z.array(z.string()).default([]),
  forbiddenActions: z.array(z.string()).default([]),
  foreshadowingToAddress: z.array(z.string()).default([]),
  targetWordRange: z.object({ min: z.number(), max: z.number() }).default({ min: 2000, max: 5000 }),
})

// Review Contract — 审查标准
export const ReviewContractSchema = z.object({
  requiredDimensions: z.array(z.string()).default([]),
  customRules: z.array(z.string()).default([]),
  qualityThreshold: z.number().default(70),
})

export type MasterSetting = z.infer<typeof MasterSettingSchema>
export type VolumeContract = z.infer<typeof VolumeContractSchema>
export type ChapterContract = z.infer<typeof ChapterContractSchema>
export type ReviewContract = z.infer<typeof ReviewContractSchema>

export interface NarrativeConstraints {
  masterSetting: MasterSetting
  volumeContracts: Record<string, VolumeContract>
  chapterContracts: Record<string, ChapterContract>
  reviewContract: ReviewContract
}
