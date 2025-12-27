import { createIdSchema, Entity } from '@internal/common'

import { z } from 'zod'

export const TicketCategoryId = createIdSchema('TicketCategoryId', 'tk_cat')
export type TicketCategoryId = z.infer<typeof TicketCategoryId>

export class TicketCategory extends Entity(
  z.object({
    id: TicketCategoryId,
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  ['id']
) {}

export interface ITicketCategory extends z.output<typeof TicketCategory.$schema> {}
