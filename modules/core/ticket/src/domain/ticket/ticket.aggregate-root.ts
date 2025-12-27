import { createIdSchema, Entity, EntityUtils, generateId, WithDomainEventsMixin } from '@internal/common'

import { z } from 'zod'

import {
  TicketAssignedDomainEvent,
  TicketCreatedDomainEvent,
  TicketDomainEvent,
  TicketPriorityChangedDomainEvent,
  TicketStatusChangedDomainEvent
} from './ticket.domain-events'
import { TicketError } from './ticket.error'
import { UserId } from '../shared'
import { TicketCategoryId } from '../ticket-category'

export const TicketId = createIdSchema('TicketId', 'tk')
export type TicketId = z.infer<typeof TicketId>

export const TicketStatus = z
  .enum(['Open', 'Assigned', 'InProgress', 'Resolved', 'Closed', 'Cancelled'])
  .meta({ graphql: { name: 'TicketStatus' } })
export type TicketStatus = z.infer<typeof TicketStatus>

export const TicketPriority = z
  .enum(['Low', 'Medium', 'High', 'Critical'])
  .meta({ graphql: { name: 'TicketPriority' } })
export type TicketPriority = z.infer<typeof TicketPriority>

export const TicketType = z
  .enum(['Bug', 'FeatureRequest', 'Question', 'Incident'])
  .meta({ graphql: { name: 'TicketType' } })
export type TicketType = z.infer<typeof TicketType>

const validStatusTransitions: Record<TicketStatus, TicketStatus[]> = {
  Open: ['Assigned', 'Cancelled'],
  Assigned: ['InProgress', 'Open', 'Cancelled'],
  InProgress: ['Resolved', 'Assigned', 'Cancelled'],
  Resolved: ['Closed', 'InProgress'],
  Closed: [],
  Cancelled: []
}

export class Ticket extends Entity(
  z.object({
    id: TicketId,
    subject: z.string().min(1).max(255),
    description: z.string().min(1).max(5000),
    status: TicketStatus,
    priority: TicketPriority,
    type: TicketType,
    customerId: UserId,
    assignedAgentId: UserId.looseOptional(),
    categoryId: TicketCategoryId.looseOptional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    resolvedAt: z.date().looseOptional(),
    closedAt: z.date().looseOptional()
  }),
  ['id'],
  [WithDomainEventsMixin<TicketDomainEvent>]
) {
  static create(input: {
    subject: string
    description: string
    priority: TicketPriority
    type: TicketType
    customerId: UserId
    categoryId?: TicketCategoryId
  }): Ticket {
    const now = new Date()

    const ticket = EntityUtils.create(Ticket, {
      id: generateId(TicketId),
      subject: input.subject,
      description: input.description,
      status: 'Open',
      priority: input.priority,
      type: input.type,
      customerId: input.customerId,
      categoryId: input.categoryId,
      createdAt: now,
      updatedAt: now
    })

    ticket.addDomainEvent(
      TicketCreatedDomainEvent.create({
        ticketId: ticket.id,
        customerId: ticket.customerId,
        priority: ticket.priority,
        type: ticket.type
      })
    )

    return ticket
  }

  assignAgent(agentId: UserId): Ticket {
    const previousAgentId = this.$value.assignedAgentId

    if (this.assignedAgentId === agentId) {
      throw TicketError.alreadyAssigned()
    }

    this.$value.assignedAgentId = agentId
    this.$value.updatedAt = new Date()

    if (this.status === 'Open') {
      this.$value.status = 'Assigned'
    }

    this.addDomainEvent(
      TicketAssignedDomainEvent.create({
        ticketId: this.id,
        agentId,
        previousAgentId
      })
    )

    return this
  }

  setPriority(priority: TicketPriority): Ticket {
    const oldPriority = this.priority

    if (oldPriority === priority) {
      return this
    }

    this.$value.priority = priority
    this.$value.updatedAt = new Date()

    this.addDomainEvent(
      TicketPriorityChangedDomainEvent.create({
        ticketId: this.id,
        oldPriority,
        newPriority: priority
      })
    )

    return this
  }

  setStatus(status: TicketStatus): Ticket {
    const oldStatus = this.status
    const isValidTransition = validStatusTransitions[oldStatus]?.includes(status)

    if (!isValidTransition) {
      throw TicketError.invalidStatusTransition()
    }

    if (oldStatus === status) {
      return this
    }

    this.$value.status = status
    this.$value.updatedAt = new Date()

    if (status === 'Resolved' && !this.resolvedAt) {
      this.$value.resolvedAt = new Date()
    }

    if (status === 'Closed' && !this.closedAt) {
      this.$value.closedAt = new Date()
    }

    this.addDomainEvent(
      TicketStatusChangedDomainEvent.create({
        ticketId: this.id,
        oldStatus,
        newStatus: status
      })
    )

    return this
  }
}

export interface ITicket extends z.output<typeof Ticket.$schema> {}
