import { IChangeTracker } from '@internal/building-blocks/change-tracker'
import { IMediator } from '@internal/building-blocks/mediator'
import { isPostgresError, PostgresErrorCode } from '@internal/building-blocks/postgres'
import { createMapper, EntityUtils, isEmptyObject } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { eq } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow'

import { ITicketRepository, Ticket, TicketError, TicketId } from '#/domain/ticket'

import { Database } from '../postgres-data.const'
import * as schema from '../postgres-data.schema'
import { tickets } from '../postgres-data.schema'

const mapTicketModelToEntity = createMapper(createSelectSchema(tickets), Ticket.$schema).build()
const mapEntityToTicketModel = createMapper(Ticket.$schema, createInsertSchema(tickets)).build()

@Injectable()
export class TicketRepository implements ITicketRepository {
  logger = new Logger(TicketRepository.name)

  constructor(
    @Inject(Database) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(IChangeTracker) private readonly changeTracker: IChangeTracker,
    @Inject(IMediator) private readonly mediator: IMediator
  ) {}

  toEntity(ticket: typeof tickets.$inferSelect): Ticket {
    return EntityUtils.create(Ticket, mapTicketModelToEntity(ticket))
  }

  fromEntity(ticket: Ticket): typeof tickets.$inferInsert {
    return mapEntityToTicketModel(ticket.toObject())
  }

  findById(id: TicketId): ResultAsync<Ticket, TicketError> {
    this.logger.debug({
      message: `[FIND] Ticket #${id}`
    })

    const encodedId = TicketId.encode(id)

    return ResultAsync.fromPromise(this.db.query.tickets.findFirst({ where: eq(tickets.id, encodedId) }), (error) => {
      this.logger.error({
        message: `[FIND] Ticket #${id} failed with database error`,
        error
      })

      throw error
    }).andThen((ticket) => (ticket ? okAsync(this.toEntity(ticket)) : errAsync(TicketError.notFound())))
  }

  insert(ticket: Ticket): ResultAsync<void, TicketError> {
    return this.validate(ticket).asyncAndThen((): ResultAsync<void, TicketError> => {
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
        .andThen(() => ResultAsync.fromSafePromise(this.mediator.publishDomainEvents(ticket)))
    })
  }

  update(ticket: Ticket): ResultAsync<void, TicketError> {
    return this.validate(ticket).asyncAndThen((): ResultAsync<void, TicketError> => {
      const patch = this.changeTracker.toPatch(ticket)

      if (isEmptyObject(patch)) {
        return ResultAsync.fromSafePromise(this.mediator.publishDomainEvents(ticket))
      }

      const encodedId = TicketId.encode(ticket.id)

      return ResultAsync.fromPromise(this.db.update(tickets).set(patch).where(eq(tickets.id, encodedId)), (error) => {
        this.logger.error({
          message: `[UPDATE] Ticket #${ticket.id} failed with database error`,
          error
        })

        throw error
      })
        .andThen((result) => (result.rowCount ? okAsync() : errAsync(TicketError.notFound())))
        .andThen(() => ok(this.changeTracker.refresh(ticket)))
        .andThen(() => ResultAsync.fromSafePromise(this.mediator.publishDomainEvents(ticket)))
    })
  }

  delete(id: TicketId): ResultAsync<void, TicketError> {
    this.logger.debug({
      message: `[DELETE] Ticket #${id}`
    })

    const encodedId = TicketId.encode(id)

    return ResultAsync.fromPromise(this.db.delete(tickets).where(eq(tickets.id, encodedId)), (error) => {
      this.logger.error({
        message: `[DELETE] Ticket #${id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(TicketError.notFound())))
      .andThen(() => ok(void this.changeTracker.detach(Ticket, { id })))
  }

  private validate(ticket: Ticket): Result<void, TicketError> {
    return ticket.validate().mapErr((error) => {
      this.logger.error({
        message: `[VALIDATE] Ticket #${ticket.id} is invalid`,
        ticket,
        error
      })

      return TicketError.invalid()
    })
  }
}
