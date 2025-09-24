import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'

export const gender = pgEnum('Gender', ['Male', 'Female', 'Other'])

export const users = pgTable('User', {
  id: uuid('id').notNull().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  gender: gender('gender')
})
