import { EventHandler } from '@internal/building-blocks/mediator'

import { Injectable, Logger } from '@nestjs/common'

import { TicketStatusChangedDomainEvent } from '#/domain/ticket'

@Injectable()
export class TicketStatusChangedEventHandler extends EventHandler(TicketStatusChangedDomainEvent) {
  logger = new Logger(TicketStatusChangedEventHandler.name)

  async handle(event: TicketStatusChangedDomainEvent) {
    this.logger.debug({
      message: '[TICKET_STATUS_CHANGED] Handling ticket status changed domain event',
      event
    })
  }
}
