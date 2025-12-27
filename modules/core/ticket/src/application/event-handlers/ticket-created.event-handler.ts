import { EventHandler } from '@internal/building-blocks/mediator'

import { Injectable, Logger } from '@nestjs/common'

import { TicketCreatedDomainEvent } from '#/domain/ticket'

@Injectable()
export class TicketCreatedEventHandler extends EventHandler(TicketCreatedDomainEvent) {
  logger = new Logger(TicketCreatedEventHandler.name)

  async handle(event: TicketCreatedDomainEvent) {
    this.logger.debug({
      message: '[TICKET_CREATED] Handling ticket created domain event',
      event
    })
  }
}
