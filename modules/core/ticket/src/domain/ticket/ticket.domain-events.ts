import { BaseEvent } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { z } from 'zod'

import { TicketId, TicketPriority, TicketStatus, TicketType } from './ticket.aggregate-root'
import { UserId } from '../shared'

export class TicketCreatedDomainEvent extends Dto(
  z.object({
    ticketId: TicketId,
    customerId: UserId,
    priority: TicketPriority,
    type: TicketType,
    occurredAt: z.date().default(() => new Date())
  }),
  BaseEvent
) {}

export class TicketAssignedDomainEvent extends Dto(
  z.object({
    ticketId: TicketId,
    agentId: UserId,
    previousAgentId: UserId.looseOptional(),
    occurredAt: z.date().default(() => new Date())
  }),
  BaseEvent
) {}

export class TicketStatusChangedDomainEvent extends Dto(
  z.object({
    ticketId: TicketId,
    oldStatus: TicketStatus,
    newStatus: TicketStatus,
    occurredAt: z.date().default(() => new Date())
  }),
  BaseEvent
) {}

export class TicketPriorityChangedDomainEvent extends Dto(
  z.object({
    ticketId: TicketId,
    oldPriority: TicketPriority,
    newPriority: TicketPriority,
    occurredAt: z.date().default(() => new Date())
  }),
  BaseEvent
) {}

export type TicketDomainEvent =
  | TicketCreatedDomainEvent
  | TicketAssignedDomainEvent
  | TicketStatusChangedDomainEvent
  | TicketPriorityChangedDomainEvent
