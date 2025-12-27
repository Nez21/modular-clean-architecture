import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { UseIdempotent } from '@internal/building-blocks/resilience'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { UserId } from '#/domain/shared'
import { ITicketRepository, Ticket, TicketError, TicketId, TicketPriority, TicketType } from '#/domain/ticket'
import { TicketCategoryId } from '#/domain/ticket-category'

export class CreateTicketCommand extends Dto(
  z
    .object({
      subject: z.string().min(1).max(255).describe('Ticket subject'),
      description: z.string().min(1).max(5000).describe('Ticket description'),
      priority: TicketPriority.describe('Ticket priority'),
      type: TicketType.describe('Ticket type'),
      customerId: UserId.describe('Customer user ID'),
      categoryId: TicketCategoryId.looseOptional().describe('Category ID')
    })
    .meta({ graphql: { name: 'CreateTicketInput' } }),
  BaseCommand<ResultAsync<TicketId, TicketError>>
) {}

registerInputType(CreateTicketCommand)

@Injectable()
export class CreateTicketHandler extends CommandHandler(CreateTicketCommand) {
  logger = new Logger(CreateTicketHandler.name)

  constructor(@Inject(ITicketRepository) private readonly ticketRepository: ITicketRepository) {
    super()
  }

  @UseIdempotent()
  handle(command: CreateTicketCommand): ResultAsync<TicketId, TicketError> {
    this.logger.debug({
      message: '[CREATE_TICKET] Creating ticket',
      command
    })

    const ticket = Ticket.create({
      subject: command.subject,
      description: command.description,
      priority: command.priority,
      type: command.type,
      customerId: command.customerId,
      categoryId: command.categoryId
    })

    return this.ticketRepository.insert(ticket).map(() => ticket.id)
  }
}
