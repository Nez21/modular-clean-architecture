import { EventHandler } from '@internal/building-blocks/mediator'

import { Injectable, Logger } from '@nestjs/common'

import { TicketAssignedDomainEvent } from '#/domain/ticket'

@Injectable()
export class TicketAssignedEventHandler extends EventHandler(TicketAssignedDomainEvent) {
  logger = new Logger(TicketAssignedEventHandler.name)

  async handle(event: TicketAssignedDomainEvent) {
    this.logger.debug({
      message: '[TICKET_ASSIGNED] Handling ticket assigned domain event',
      event
    })
  }
}
