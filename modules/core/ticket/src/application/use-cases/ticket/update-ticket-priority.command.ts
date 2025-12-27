import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { ITicketRepository, TicketError, TicketId, TicketPriority } from '#/domain/ticket'

export class UpdateTicketPriorityCommand extends Dto(
  z
    .object({
      ticketId: TicketId.describe('Ticket ID'),
      priority: TicketPriority.describe('New priority')
    })
    .meta({ graphql: { name: 'UpdateTicketPriorityInput' } }),
  BaseCommand<ResultAsync<void, TicketError>>
) {}

registerInputType(UpdateTicketPriorityCommand)

@Injectable()
export class UpdateTicketPriorityHandler extends CommandHandler(UpdateTicketPriorityCommand) {
  logger = new Logger(UpdateTicketPriorityHandler.name)

  constructor(@Inject(ITicketRepository) private readonly ticketRepository: ITicketRepository) {
    super()
  }

  handle(command: UpdateTicketPriorityCommand): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: '[UPDATE_TICKET_PRIORITY] Updating ticket priority',
      command
    })

    return this.ticketRepository
      .findById(command.ticketId)
      .map((ticket) => ticket.setPriority(command.priority))
      .andThen((ticket) => this.ticketRepository.update(ticket))
  }
}
