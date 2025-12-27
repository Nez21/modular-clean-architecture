import { IChangeTracker } from '@internal/building-blocks/change-tracker'
import { IMediator } from '@internal/building-blocks/mediator'
import { isPostgresError, PostgresErrorCode } from '@internal/building-blocks/postgres'
import { decodeId, encodeId, isEmptyObject } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { eq } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { errAsync, ok, okAsync, ResultAsync } from 'neverthrow'

import { UserId } from '#/domain/shared'
import { ITicketRepository, Ticket, TicketError, TicketId, TicketStatus } from '#/domain/ticket'
import { TicketCategoryId } from '#/domain/ticket-category'

import { Database } from '../postgres-data.const'
import * as schema from '../postgres-data.schema'
import { tickets } from '../postgres-data.schema'

@Injectable()
export class TicketRepository implements ITicketRepository {
  logger = new Logger(TicketRepository.name)

  constructor(
    @Inject(Database) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(IChangeTracker) private readonly changeTracker: IChangeTracker,
    @Inject(IMediator) private readonly mediator: IMediator
  ) {}

  toEntity(ticket: typeof tickets.$inferSelect): Ticket {
    return Ticket.fromObject({
      id: encodeId(TicketId, ticket.id),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status as TicketStatus,
      priority: ticket.priority,
      type: ticket.type,
      customerId: encodeId(UserId, ticket.customerId),
      assignedAgentId: ticket.assignedAgentId ? encodeId(UserId, ticket.assignedAgentId) : null,
      categoryId: ticket.categoryId ? encodeId(TicketCategoryId, ticket.categoryId) : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt
    })
  }

  fromEntity(ticket: Ticket): typeof tickets.$inferInsert {
    const obj = ticket.toObject()

    return {
      id: decodeId(TicketId, obj.id),
      subject: obj.subject,
      description: obj.description,
      status: obj.status,
      priority: obj.priority,
      type: obj.type,
      customerId: decodeId(UserId, obj.customerId),
      assignedAgentId: obj.assignedAgentId ? decodeId(UserId, obj.assignedAgentId) : null,
      categoryId: obj.categoryId ? decodeId(TicketCategoryId, obj.categoryId) : null,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      resolvedAt: obj.resolvedAt,
      closedAt: obj.closedAt
    }
  }

  findById(id: TicketId): ResultAsync<Ticket, TicketError> {
    this.logger.debug({
      message: `[FIND] Ticket #${id}`
    })

    const decodedId = decodeId(TicketId, id)

    return ResultAsync.fromPromise(this.db.query.tickets.findFirst({ where: eq(tickets.id, decodedId) }), (error) => {
      this.logger.error({
        message: `[FIND] Ticket #${id} failed with database error`,
        error
      })

      throw error
    }).andThen((ticket) => (ticket ? okAsync(this.toEntity(ticket)) : errAsync(TicketError.notFound())))
  }

  insert(ticket: Ticket): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: `[INSERT] Ticket #${ticket.id}`,
      ticket
    })

    return ResultAsync.fromPromise(this.db.insert(tickets).values(this.fromEntity(ticket)), (error) => {
      if (isPostgresError(error) && error.code === PostgresErrorCode.UniqueViolation) {
        return TicketError.alreadyExists()
      }

      this.logger.error({
        message: `[INSERT] Ticket #${ticket.id} failed with database error`,
        error
      })

      throw error
    })
      .andThen(() => ok(this.changeTracker.attach(ticket)))
      .andThen(() => this.publishDomainEvents(ticket))
  }

  update(ticket: Ticket): ResultAsync<void, TicketError> {
    const patch = this.changeTracker.toPatch(ticket)

    this.logger.debug({
      message: `[UPDATE] Ticket #${ticket.id}`,
      patch
    })

    if (isEmptyObject(patch)) {
      return this.publishDomainEvents(ticket)
    }

    const decodedId = decodeId(TicketId, ticket.id)

    return ResultAsync.fromPromise(this.db.update(tickets).set(patch).where(eq(tickets.id, decodedId)), (error) => {
      this.logger.error({
        message: `[UPDATE] Ticket #${ticket.id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(TicketError.notFound())))
      .andThen(() => ok(this.changeTracker.refresh(ticket)))
      .andThen(() => this.publishDomainEvents(ticket))
  }

  delete(id: TicketId): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: `[DELETE] Ticket #${id}`
    })

    const decodedId = decodeId(TicketId, id)

    return ResultAsync.fromPromise(this.db.delete(tickets).where(eq(tickets.id, decodedId)), (error) => {
      this.logger.error({
        message: `[DELETE] Ticket #${id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(TicketError.notFound())))
      .andThen(() => ok(void this.changeTracker.detach(Ticket, { id })))
  }

  private publishDomainEvents(ticket: Ticket): ResultAsync<void, TicketError> {
    const domainEvents = [...ticket.$domainEvents]

    if (domainEvents.length === 0) return okAsync()

    const publishPromises = domainEvents.map((event) => this.mediator.publish(event))

    return ResultAsync.fromPromise(Promise.all(publishPromises), (error) => {
      this.logger.error({
        message: '[PUBLISH] Failed to publish domain events',
        error
      })

      throw error
    }).andThen(() => ok(ticket.clearDomainEvents()))
  }
}
