import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const gender = pgEnum('Gender', ['Male', 'Female', 'Other'])

export const users = pgTable('User', {
  id: uuid('id').notNull().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('passwordHash').notNull(),
  gender: gender('gender'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow()
})
