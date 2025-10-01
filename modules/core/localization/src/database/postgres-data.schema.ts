import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const i18nKeys = pgTable('i18n_keys', {
  id: uuid('id').notNull().primaryKey(),
  key: text('key').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow()
})

export const i18nTranslations = pgTable(
  'i18n_translations',
  {
    id: uuid('id').notNull().primaryKey(),
    keyId: uuid('key_id')
      .notNull()
      .references(() => i18nKeys.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    value: text('value').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow()
  },
  (table) => ({
    keyLocaleUnique: uniqueIndex('i18n_translations_key_locale_unique').on(table.keyId, table.locale)
  })
)

export const i18nKeysRelations = relations(i18nKeys, ({ many }) => ({
  translations: many(i18nTranslations)
}))

export type I18nKeyEntity = typeof i18nKeys.$inferSelect
export type I18nTranslationEntity = typeof i18nTranslations.$inferSelect
