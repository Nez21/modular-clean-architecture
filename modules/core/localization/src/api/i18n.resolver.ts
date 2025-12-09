import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import {
  CreateI18nKeyInput,
  CreateI18nTranslationInput,
  DeleteI18nKeyInput,
  DeleteI18nTranslationInput,
  I18nKeyResult,
  I18nKeysList,
  I18nKeysListInput,
  I18nTranslationResult,
  UpdateI18nKeyInput,
  UpdateI18nTranslationInput
} from '../dto/i18n.dto'
import { I18nService } from '../services/i18n.service'

@Resolver()
export class I18nResolver {
  constructor(private readonly i18nService: I18nService) {}

  @Mutation(() => I18nKeyResult, { description: 'Create a new i18n key' })
  async createI18nKey(@Args('input') input: CreateI18nKeyInput): Promise<I18nKeyResult> {
    return this.i18nService.createI18nKey(input)
  }

  @Mutation(() => I18nKeyResult, { description: 'Update an existing i18n key' })
  async updateI18nKey(@Args('input') input: UpdateI18nKeyInput): Promise<I18nKeyResult> {
    return this.i18nService.updateI18nKey(input)
  }

  @Query(() => I18nKeysList, { description: 'Get paginated list of i18n keys with optional translations' })
  async getI18nKeysList(@Args('input') input: I18nKeysListInput): Promise<I18nKeysList> {
    return this.i18nService.getI18nKeysList(input)
  }

  @Mutation(() => I18nKeyResult, { description: 'Delete an i18n key and all its translations' })
  async deleteI18nKey(@Args('input') input: DeleteI18nKeyInput): Promise<I18nKeyResult> {
    return this.i18nService.deleteI18nKey(input)
  }

  @Mutation(() => I18nTranslationResult, { description: 'Create a new i18n translation for a key' })
  async createI18nTranslation(@Args('input') input: CreateI18nTranslationInput): Promise<I18nTranslationResult> {
    return this.i18nService.createI18nTranslation(input)
  }

  @Mutation(() => I18nTranslationResult, { description: 'Update an existing i18n translation' })
  async updateI18nTranslation(@Args('input') input: UpdateI18nTranslationInput): Promise<I18nTranslationResult> {
    return this.i18nService.updateI18nTranslation(input)
  }

  @Mutation(() => I18nTranslationResult, { description: 'Delete an i18n translation' })
  async deleteI18nTranslation(@Args('input') input: DeleteI18nTranslationInput): Promise<I18nTranslationResult> {
    return this.i18nService.deleteI18nTranslation(input)
  }
}
