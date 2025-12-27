import { IChangeTracker } from '@internal/building-blocks/change-tracker'
import { isPostgresError, PostgresErrorCode } from '@internal/building-blocks/postgres'
import { createMapper, isEmptyObject } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { eq } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { errAsync, okAsync, Result, ResultAsync } from 'neverthrow'

import { IUserRepository, User, UserId } from '#/domain'
import { UserError } from '#/domain/user.error'

import { Database } from '../postgres-data.const'
import * as schema from '../postgres-data.schema'
import { users } from '../postgres-data.schema'

const mapUserModelToEntity = createMapper(createSelectSchema(users), User.$schema).build()
const mapEntityToUserModel = createMapper(User.$schema, createInsertSchema(users)).build()

@Injectable()
export class UserRepository implements IUserRepository {
  logger = new Logger(UserRepository.name)

  constructor(
    @Inject(Database) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(IChangeTracker) private readonly changeTracker: IChangeTracker
  ) {}

  toEntity(user: typeof users.$inferSelect): User {
    return User.fromObject(mapUserModelToEntity(user))
  }

  fromEntity(user: User): typeof users.$inferInsert {
    return mapEntityToUserModel(user.toObject())
  }

  findById(id: UserId): ResultAsync<User, UserError> {
    this.logger.debug({
      message: `[FIND] User #${id}`
    })

    const encodedId = UserId.encode(id)

    return ResultAsync.fromPromise(this.db.query.users.findFirst({ where: eq(users.id, encodedId) }), (error) => {
      this.logger.error({
        message: `[FIND] User #${id} failed with database error`,
        error
      })

      throw error
    }).andThen((user) => (user ? okAsync(this.toEntity(user)) : errAsync(UserError.notFound())))
  }

  findByEmail(email: string): ResultAsync<User, UserError> {
    this.logger.debug({
      message: `[FIND_BY_EMAIL] User with email ${email}`
    })

    return ResultAsync.fromPromise(this.db.query.users.findFirst({ where: eq(users.email, email) }), (error) => {
      this.logger.error({
        message: `[FIND_BY_EMAIL] User with email ${email} failed with database error`,
        error
      })

      throw error
    }).andThen((user) => (user ? okAsync(this.toEntity(user)) : errAsync(UserError.notFound())))
  }

  insert(user: User): ResultAsync<void, UserError> {
    return this.validate(user).asyncAndThen((): ResultAsync<void, UserError> => {
      return ResultAsync.fromPromise(this.db.insert(users).values(this.fromEntity(user)), (error) => {
        if (isPostgresError(error) && error.code === PostgresErrorCode.UniqueViolation) {
          if (error.constraint?.includes('email')) {
            return UserError.emailAlreadyExists()
          }

          return UserError.alreadyExists()
        }

        this.logger.error({
          message: `[INSERT] User #${user.id} failed with database error`,
          error
        })

        throw error
      }).andThen(() => okAsync(void this.changeTracker.attach(user)))
    })
  }

  update(user: User): ResultAsync<void, UserError> {
    return this.validate(user).asyncAndThen((): ResultAsync<void, UserError> => {
      const patch = this.changeTracker.toPatch(user)

      if (isEmptyObject(patch)) {
        return okAsync()
      }

      const encodedId = UserId.encode(user.id)

      return ResultAsync.fromPromise(this.db.update(users).set(patch).where(eq(users.id, encodedId)), (error) => {
        this.logger.error({
          message: `[UPDATE] User #${user.id} failed with database error`,
          error
        })
        throw error
      })
        .andThen((result) => (result.rowCount ? okAsync() : errAsync(UserError.notFound())))
        .andTee(() => this.changeTracker.refresh(user))
    })
  }

  delete(id: UserId): ResultAsync<void, UserError> {
    this.logger.debug({
      message: `[DELETE] User #${id}`
    })

    const encodedId = UserId.encode(id)

    return ResultAsync.fromPromise(this.db.delete(users).where(eq(users.id, encodedId)), (error) => {
      this.logger.error({
        message: `[DELETE] User #${id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(UserError.notFound())))
      .andTee(() => this.changeTracker.detach(User, { id }))
  }

  private validate(user: User): Result<void, UserError> {
    return user.validate().mapErr((error) => {
      this.logger.error({
        message: `[VALIDATE] User #${user.id} is invalid`,
        user,
        error
      })

      return UserError.invalid()
    })
  }
}
