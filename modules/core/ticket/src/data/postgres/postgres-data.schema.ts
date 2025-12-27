import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const ticketStatus = pgEnum('ticket_status', [
  'Open',
  'Assigned',
  'InProgress',
  'Resolved',
  'Closed',
  'Cancelled'
])
export const ticketPriority = pgEnum('ticket_priority', ['Low', 'Medium', 'High', 'Critical'])
export const ticketType = pgEnum('ticket_type', ['Bug', 'FeatureRequest', 'Question', 'Incident'])

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').notNull().primaryKey(),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    status: ticketStatus('status').notNull(),
    priority: ticketPriority('priority').notNull(),
    type: ticketType('type').notNull(),
    customerId: uuid('customerId').notNull(),
    assignedAgentId: uuid('assigned_agent_id'),
    categoryId: uuid('category_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at')
  },
  (table) => [
    index('ticket_status_idx').on(table.status),
    index('ticket_assigned_agent_idx').on(table.assignedAgentId),
    index('ticket_customer_idx').on(table.customerId)
  ]
)

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').notNull().primaryKey(),
  ticketId: uuid('ticket_id').notNull(),
  authorId: uuid('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const ticketCategories = pgTable('ticket_categories', {
  id: uuid('id').notNull().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  color: text('color').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
