import { createIdSchema, Entity } from '@internal/common'

import { z } from 'zod'

import { UserId } from '../shared'
import { TicketId } from '../ticket'

export const TicketCommentId = createIdSchema('TicketCommentId', 'tk_cmt')
export type TicketCommentId = z.infer<typeof TicketCommentId>

export class TicketComment extends Entity(
  z.object({
    id: TicketCommentId,
    ticketId: TicketId,
    authorId: UserId,
    content: z.string().min(1).max(5000),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  ['id']
) {}

export interface ITicketComment extends z.output<typeof TicketComment.$schema> {}
