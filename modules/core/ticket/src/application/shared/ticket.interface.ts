import { registerOutputType } from '@internal/building-blocks/graphql'
import { Dto } from '@internal/common'

import { z } from 'zod'

import { TicketId, TicketPriority, TicketStatus } from '#/domain/ticket'

export class TicketDto extends Dto(
  z
    .object({
      id: TicketId,
      subject: z.string(),
      description: z.string(),
      status: TicketStatus,
      priority: TicketPriority
    })
    .meta({ graphql: { name: 'TicketDto' } })
) {}

registerOutputType(TicketDto)
