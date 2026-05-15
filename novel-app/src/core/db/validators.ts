import { z } from 'zod'

export const BookStatusEnum = z.enum(['ongoing', 'completed', 'paused'])
export const ChapterStatusEnum = z.enum(['draft', 'reviewed', 'final', 'ai-generated'])

export const CreateBookSchema = z.object({
  title: z.string().min(1, '书名不能为空').max(200),
  author: z.string().max(100).default(''),
  synopsis: z.string().max(5000).default(''),
  cover: z.string().optional(),
  status: BookStatusEnum.default('ongoing'),
  targetDailyWords: z.number().int().min(0).optional(),
})

export const UpdateBookSchema = CreateBookSchema.partial()

export const CreateChapterSchema = z.object({
  bookId: z.string().uuid(),
  volumeId: z.string().uuid().optional(),
  title: z.string().min(1, '章节标题不能为空').max(200),
  orderIndex: z.number().int().default(0),
  content: z.string().default(''),
})

export const UpdateChapterSchema = CreateChapterSchema.omit({ bookId: true }).partial()

export type CreateBookInput = z.infer<typeof CreateBookSchema>
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>
export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>
