import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { UserId } from '#/domain/shared'
import { ITicketRepository, TicketError, TicketId } from '#/domain/ticket'

export class AssignTicketCommand extends Dto(
  z
    .object({
      ticketId: TicketId.describe('Ticket ID'),
      agentId: UserId.describe('Agent user ID')
    })
    .meta({ graphql: { name: 'AssignTicketInput' } }),
  BaseCommand<ResultAsync<void, TicketError>>
) {}

registerInputType(AssignTicketCommand)

@Injectable()
export class AssignTicketHandler extends CommandHandler(AssignTicketCommand) {
  logger = new Logger(AssignTicketHandler.name)

  constructor(@Inject(ITicketRepository) private readonly ticketRepository: ITicketRepository) {
    super()
  }

  handle(command: AssignTicketCommand): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: '[ASSIGN_TICKET] Assigning ticket',
      command
    })

    return this.ticketRepository
      .findById(command.ticketId)
      .map((ticket) => ticket.assignAgent(command.agentId))
      .andThen((ticket) => this.ticketRepository.update(ticket))
  }
}
