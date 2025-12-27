import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { ITicketRepository, TicketError, TicketId, TicketStatus } from '#/domain/ticket'

export class UpdateTicketStatusCommand extends Dto(
  z
    .object({
      ticketId: TicketId.describe('Ticket ID'),
      status: TicketStatus.describe('New status')
    })
    .meta({ graphql: { name: 'UpdateTicketStatusInput' } }),
  BaseCommand<ResultAsync<void, TicketError>>
) {}

registerInputType(UpdateTicketStatusCommand)

@Injectable()
export class UpdateTicketStatusHandler extends CommandHandler(UpdateTicketStatusCommand) {
  logger = new Logger(UpdateTicketStatusHandler.name)

  constructor(@Inject(ITicketRepository) private readonly ticketRepository: ITicketRepository) {
    super()
  }

  handle(command: UpdateTicketStatusCommand): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: '[UPDATE_TICKET_STATUS] Updating ticket status',
      command
    })

    return this.ticketRepository
      .findById(command.ticketId)
      .map((ticket) => ticket.setStatus(command.status))
      .andThen((ticket) => this.ticketRepository.update(ticket))
  }
}
