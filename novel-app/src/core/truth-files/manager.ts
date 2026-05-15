import { TruthFileSchemas, type TruthFileName } from './schemas'
import { loadAllTruthFiles, saveTruthFile } from '@/core/db/truth-file-repository'
import { logger } from '@/shared/utils/logger'
import type { ZodError } from 'zod'

export interface TruthFileValidation {
  valid: boolean
  errors: ZodError | null
}

/**
 * TruthFileManager handles reading/writing/validating the 7 truth files.
 * Supports both in-memory operations and DB persistence.
 */
export class TruthFileManager {
  private data: Record<TruthFileName, unknown>

  constructor() {
    this.data = {
      current_state: TruthFileSchemas.current_state.parse({}),
      hooks: TruthFileSchemas.hooks.parse({}),
      summaries: TruthFileSchemas.summaries.parse({}),
      subplots: TruthFileSchemas.subplots.parse({}),
      emotional_arcs: TruthFileSchemas.emotional_arcs.parse({}),
      character_matrix: TruthFileSchemas.character_matrix.parse({}),
      particle_ledger: TruthFileSchemas.particle_ledger.parse({}),
    }
  }

  get<T extends TruthFileName>(name: T): unknown {
    return this.data[name]
  }

  getJson<T extends TruthFileName>(name: T): string {
    return JSON.stringify(this.data[name], null, 2)
  }

  set<T extends TruthFileName>(name: T, value: unknown): TruthFileValidation {
    const schema = TruthFileSchemas[name]
    const result = schema.safeParse(value)
    if (result.success) {
      this.data[name] = result.data
      return { valid: true, errors: null }
    }
    return { valid: false, errors: result.error }
  }

  validate<T extends TruthFileName>(name: T, value: unknown): TruthFileValidation {
    const schema = TruthFileSchemas[name]
    const result = schema.safeParse(value)
    return { valid: result.success, errors: result.success ? null : result.error }
  }

  validateAll(): Record<TruthFileName, TruthFileValidation> {
    const results = {} as Record<TruthFileName, TruthFileValidation>
    for (const name of Object.keys(TruthFileSchemas) as TruthFileName[]) {
      results[name] = this.validate(name, this.data[name])
    }
    return results
  }

  reset(): void {
    for (const name of Object.keys(TruthFileSchemas) as TruthFileName[]) {
      this.data[name] = TruthFileSchemas[name].parse({})
    }
  }

  exportAll(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const name of Object.keys(TruthFileSchemas) as TruthFileName[]) {
      result[name] = this.getJson(name)
    }
    return result
  }

  // === DB Persistence (Phase 4) ===

  async loadFromDb(bookId: string): Promise<void> {
    try {
      const rows = await loadAllTruthFiles(bookId)
      for (const row of rows) {
        const name = row.file_type as TruthFileName
        if (name in TruthFileSchemas) {
          const parsed = TruthFileSchemas[name].safeParse(JSON.parse(row.content_json))
          if (parsed.success) {
            this.data[name] = parsed.data
          } else {
            logger.warn('truth-manager', `Invalid truth file ${name}: ${parsed.error.message}`)
          }
        }
      }
      logger.info('truth-manager', `Loaded ${rows.length} truth files from DB for book ${bookId}`)
    } catch (err) {
      logger.error('truth-manager', `Failed to load truth files from DB: ${err}`)
    }
  }

  async saveToDb(bookId: string): Promise<void> {
    try {
      for (const name of Object.keys(TruthFileSchemas) as TruthFileName[]) {
        await saveTruthFile(bookId, name, this.getJson(name))
      }
      logger.info('truth-manager', `Saved all truth files to DB for book ${bookId}`)
    } catch (err) {
      logger.error('truth-manager', `Failed to save truth files to DB: ${err}`)
    }
  }

  getAllJson(): Record<TruthFileName, string> {
    const result = {} as Record<TruthFileName, string>
    for (const name of Object.keys(TruthFileSchemas) as TruthFileName[]) {
      result[name] = this.getJson(name)
    }
    return result
  }
}

export const TRUTH_FILE_LABELS: Record<TruthFileName, string> = {
  current_state: '世界状态',
  hooks: '伏笔池',
  summaries: '章节摘要',
  subplots: '支线进度',
  emotional_arcs: '情感弧线',
  character_matrix: '角色矩阵',
  particle_ledger: '资源账本',
}

export const TRUTH_FILE_NAMES: TruthFileName[] = [
  'current_state',
  'hooks',
  'summaries',
  'subplots',
  'emotional_arcs',
  'character_matrix',
  'particle_ledger',
]
