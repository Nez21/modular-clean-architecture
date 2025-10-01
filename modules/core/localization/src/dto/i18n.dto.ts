import { registerInputType, registerOutputType } from '@internal/building-blocks/graphql'
import { Dto } from '@internal/common'

import { z } from 'zod'

// Input DTOs
export const CreateI18nKeyInputSchema = z
  .object({
    key: z.string().min(1).max(255).describe('The i18n key identifier')
  })
  .meta({ graphql: { name: 'CreateI18nKeyInput' } })

export const UpdateI18nKeyInputSchema = z
  .object({
    id: z.string().uuid().describe('The i18n key ID'),
    key: z.string().min(1).max(255).describe('The updated i18n key identifier')
  })
  .meta({ graphql: { name: 'UpdateI18nKeyInput' } })

export const CreateI18nTranslationInputSchema = z
  .object({
    keyId: z.string().uuid().describe('The i18n key ID'),
    locale: z.string().min(2).max(10).describe('The locale code (e.g., en, es, fr)'),
    value: z.string().min(1).describe('The translation value')
  })
  .meta({ graphql: { name: 'CreateI18nTranslationInput' } })

export const UpdateI18nTranslationInputSchema = z
  .object({
    id: z.string().uuid().describe('The translation ID'),
    locale: z.string().min(2).max(10).optional().describe('The locale code'),
    value: z.string().min(1).optional().describe('The translation value')
  })
  .meta({ graphql: { name: 'UpdateI18nTranslationInput' } })

export const I18nKeysListInputSchema = z
  .object({
    page: z.number().int().positive().default(1).describe('Page number'),
    limit: z.number().int().positive().max(100).default(20).describe('Items per page'),
    search: z.string().optional().describe('Search term for filtering keys')
  })
  .meta({ graphql: { name: 'I18nKeysListInput' } })

export const DeleteI18nKeyInputSchema = z
  .object({
    id: z.string().uuid().describe('The i18n key ID to delete')
  })
  .meta({ graphql: { name: 'DeleteI18nKeyInput' } })

export const DeleteI18nTranslationInputSchema = z
  .object({
    id: z.string().uuid().describe('The translation ID to delete')
  })
  .meta({ graphql: { name: 'DeleteI18nTranslationInput' } })

// Output DTOs
export const I18nTranslationOutputSchema = z
  .object({
    id: z.string().uuid(),
    keyId: z.string().uuid(),
    locale: z.string(),
    value: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
  })
  .meta({ graphql: { name: 'I18nTranslation' } })

export const I18nKeyOutputSchema = z
  .object({
    id: z.string().uuid(),
    key: z.string(),
    translations: z.array(I18nTranslationOutputSchema).optional(),
    createdAt: z.date(),
    updatedAt: z.date()
  })
  .meta({ graphql: { name: 'I18nKey' } })

export const I18nKeysListOutputSchema = z
  .object({
    items: z.array(I18nKeyOutputSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative()
  })
  .meta({ graphql: { name: 'I18nKeysList' } })

export const I18nKeyResultSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    data: I18nKeyOutputSchema.optional()
  })
  .meta({ graphql: { name: 'I18nKeyResult' } })

export const I18nTranslationResultSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    data: I18nTranslationOutputSchema.optional()
  })
  .meta({ graphql: { name: 'I18nTranslationResult' } })

// DTO Classes
export class CreateI18nKeyInput extends Dto(CreateI18nKeyInputSchema) {}
export class UpdateI18nKeyInput extends Dto(UpdateI18nKeyInputSchema) {}
export class CreateI18nTranslationInput extends Dto(CreateI18nTranslationInputSchema) {}
export class UpdateI18nTranslationInput extends Dto(UpdateI18nTranslationInputSchema) {}
export class I18nKeysListInput extends Dto(I18nKeysListInputSchema) {}
export class DeleteI18nKeyInput extends Dto(DeleteI18nKeyInputSchema) {}
export class DeleteI18nTranslationInput extends Dto(DeleteI18nTranslationInputSchema) {}

export class I18nTranslation extends Dto(I18nTranslationOutputSchema) {}
export class I18nKey extends Dto(I18nKeyOutputSchema) {}
export class I18nKeysList extends Dto(I18nKeysListOutputSchema) {}
export class I18nKeyResult extends Dto(I18nKeyResultSchema) {}
export class I18nTranslationResult extends Dto(I18nTranslationResultSchema) {}

// Register GraphQL types
registerInputType(CreateI18nKeyInput)
registerInputType(UpdateI18nKeyInput)
registerInputType(CreateI18nTranslationInput)
registerInputType(UpdateI18nTranslationInput)
registerInputType(I18nKeysListInput)
registerInputType(DeleteI18nKeyInput)
registerInputType(DeleteI18nTranslationInput)

registerOutputType(I18nTranslation)
registerOutputType(I18nKey)
registerOutputType(I18nKeysList)
registerOutputType(I18nKeyResult)
registerOutputType(I18nTranslationResult)
