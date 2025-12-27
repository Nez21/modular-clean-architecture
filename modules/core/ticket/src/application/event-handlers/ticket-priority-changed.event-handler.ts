import { EventHandler } from '@internal/building-blocks/mediator'

import { Injectable, Logger } from '@nestjs/common'

import { TicketPriorityChangedDomainEvent } from '#/domain/ticket'

@Injectable()
export class TicketPriorityChangedEventHandler extends EventHandler(TicketPriorityChangedDomainEvent) {
  logger = new Logger(TicketPriorityChangedEventHandler.name)

  async handle(event: TicketPriorityChangedDomainEvent) {
    this.logger.debug({
      message: '[TICKET_PRIORITY_CHANGED] Handling ticket priority changed domain event',
      event
    })
  }
}
