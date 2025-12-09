import { generateRawId } from '@internal/common'

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { and, desc, eq, like } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { Connection } from '#/database/postgres-data.const'

import * as schema from '../database/postgres-data.schema'
import { i18nKeys, i18nTranslations } from '../database/postgres-data.schema'
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

@Injectable()
export class I18nService {
  constructor(
    @Inject(Connection)
    private readonly db: NodePgDatabase<typeof schema>
  ) {}

  async createI18nKey(input: CreateI18nKeyInput): Promise<I18nKeyResult> {
    try {
      const [newKey] = await this.db
        .insert(i18nKeys)
        .values({
          id: generateRawId(),
          key: input.key
        })
        .returning()

      return I18nKeyResult.create({
        success: true,
        message: 'I18n key created successfully',
        data: {
          id: newKey.id,
          key: newKey.key,
          createdAt: newKey.createdAt,
          updatedAt: newKey.updatedAt
        }
      })
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error
      }

      throw new Error(`Failed to create i18n key: ${error}`)
    }
  }

  async updateI18nKey(input: UpdateI18nKeyInput): Promise<I18nKeyResult> {
    try {
      const [updatedKey] = await this.db
        .update(i18nKeys)
        .set({
          key: input.key,
          updatedAt: new Date()
        })
        .where(eq(i18nKeys.id, input.id))
        .returning()

      if (!updatedKey) {
        throw new NotFoundException(`I18n key with ID '${input.id}' not found`)
      }

      return I18nKeyResult.create({
        success: true,
        message: 'I18n key updated successfully',
        data: {
          id: updatedKey.id,
          key: updatedKey.key,
          createdAt: updatedKey.createdAt,
          updatedAt: updatedKey.updatedAt
        }
      })
    } catch (error) {
      throw new Error(`Failed to update i18n key: ${error}`)
    }
  }

  async getI18nKeysList(input: I18nKeysListInput): Promise<I18nKeysList> {
    try {
      const offset = (input.page - 1) * input.limit

      const total = await this.db.$count(i18nKeys, input.search ? like(i18nKeys.key, `%${input.search}%`) : undefined)
      const keys = await this.db.query.i18nKeys.findMany({
        with: {
          translations: true
        },
        where: input.search ? like(i18nKeys.key, `%${input.search}%`) : undefined,
        orderBy: desc(i18nKeys.createdAt),
        limit: input.limit,
        offset: offset
      })

      return I18nKeysList.create({
        items: keys.map((key) => ({
          id: key.id,
          key: key.key,
          translations: key.translations,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt
        })),
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit)
      })
    } catch (error) {
      throw new Error(`Failed to get i18n keys list: ${error}`)
    }
  }

  async deleteI18nKey(input: DeleteI18nKeyInput): Promise<I18nKeyResult> {
    try {
      await this.db.delete(i18nKeys).where(eq(i18nKeys.id, input.id))

      return {
        success: true,
        message: 'I18n key and all its translations deleted successfully',
        data: {
          id: existingKey[0].id,
          key: existingKey[0].key,
          createdAt: existingKey[0].createdAt,
          updatedAt: existingKey[0].updatedAt
        }
      }
    } catch (error) {
      throw new Error(`Failed to delete i18n key: ${error}`)
    }
  }

  async createI18nTranslation(input: CreateI18nTranslationInput): Promise<I18nTranslationResult> {
    try {
      const existingKey = await this.db.select().from(i18nKeys).where(eq(i18nKeys.id, input.keyId)).limit(1)

      if (existingKey.length === 0) {
        throw new NotFoundException(`I18n key with ID '${input.keyId}' not found`)
      }

      const existingTranslation = await this.db
        .select()
        .from(i18nTranslations)
        .where(and(eq(i18nTranslations.keyId, input.keyId), eq(i18nTranslations.locale, input.locale)))
        .limit(1)

      if (existingTranslation.length > 0) {
        throw new ConflictException(
          `Translation for key '${existingKey[0].key}' and locale '${input.locale}' already exists`
        )
      }

      const [newTranslation] = await this.db
        .insert(i18nTranslations)
        .values({
          keyId: input.keyId,
          locale: input.locale,
          value: input.value
        })
        .returning()

      return {
        success: true,
        message: 'I18n translation created successfully',
        data: {
          id: newTranslation.id,
          keyId: newTranslation.keyId,
          locale: newTranslation.locale,
          value: newTranslation.value,
          createdAt: newTranslation.createdAt,
          updatedAt: newTranslation.updatedAt
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error
      }
      throw new Error(`Failed to create i18n translation: ${error}`)
    }
  }

  async updateI18nTranslation(input: UpdateI18nTranslationInput): Promise<I18nTranslationResult> {
    try {
      const existingTranslation = await this.db
        .select()
        .from(i18nTranslations)
        .where(eq(i18nTranslations.id, input.id))
        .limit(1)

      if (existingTranslation.length === 0) {
        throw new NotFoundException(`I18n translation with ID '${input.id}' not found`)
      }

      if (input.locale && input.locale !== existingTranslation[0].locale) {
        const conflictingTranslation = await this.db
          .select()
          .from(i18nTranslations)
          .where(
            and(eq(i18nTranslations.keyId, existingTranslation[0].keyId), eq(i18nTranslations.locale, input.locale))
          )
          .limit(1)

        if (conflictingTranslation.length > 0) {
          throw new ConflictException(`Translation for this key and locale '${input.locale}' already exists`)
        }
      }

      const updateData: Partial<typeof i18nTranslations.$inferInsert> = {
        updatedAt: new Date()
      }

      if (input.locale !== undefined) {
        updateData.locale = input.locale
      }
      if (input.value !== undefined) {
        updateData.value = input.value
      }

      const [updatedTranslation] = await this.db
        .update(i18nTranslations)
        .set(updateData)
        .where(eq(i18nTranslations.id, input.id))
        .returning()

      return {
        success: true,
        message: 'I18n translation updated successfully',
        data: {
          id: updatedTranslation.id,
          keyId: updatedTranslation.keyId,
          locale: updatedTranslation.locale,
          value: updatedTranslation.value,
          createdAt: updatedTranslation.createdAt,
          updatedAt: updatedTranslation.updatedAt
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error
      }
      throw new Error(`Failed to update i18n translation: ${error}`)
    }
  }

  async deleteI18nTranslation(input: DeleteI18nTranslationInput): Promise<I18nTranslationResult> {
    try {
      const existingTranslation = await this.db
        .select()
        .from(i18nTranslations)
        .where(eq(i18nTranslations.id, input.id))
        .limit(1)

      if (existingTranslation.length === 0) {
        throw new NotFoundException(`I18n translation with ID '${input.id}' not found`)
      }

      await this.db.delete(i18nTranslations).where(eq(i18nTranslations.id, input.id))

      return {
        success: true,
        message: 'I18n translation deleted successfully',
        data: {
          id: existingTranslation[0].id,
          keyId: existingTranslation[0].keyId,
          locale: existingTranslation[0].locale,
          value: existingTranslation[0].value,
          createdAt: existingTranslation[0].createdAt,
          updatedAt: existingTranslation[0].updatedAt
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new Error(`Failed to delete i18n translation: ${error}`)
    }
  }
}
