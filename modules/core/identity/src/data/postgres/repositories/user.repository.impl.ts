import { IChangeTracker } from '@internal/building-blocks/change-tracker'
import { isPostgresError, PostgresErrorCode } from '@internal/building-blocks/postgres'
import { decodeId, encodeId, isEmptyObject } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { eq } from 'drizzle-orm'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'

import { IUserRepository, User, UserId } from '#/domain'
import { UserError } from '#/domain/user.error'

import { Database } from '../postgres-data.const'
import * as schema from '../postgres-data.schema'
import { users } from '../postgres-data.schema'

@Injectable()
export class UserRepository implements IUserRepository {
  logger = new Logger(UserRepository.name)

  constructor(
    @Inject(Database) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(IChangeTracker) private readonly changeTracker: IChangeTracker
  ) {}

  toEntity(user: typeof users.$inferSelect): User {
    return User.fromObject({
      id: encodeId(UserId, user.id),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      gender: user.gender,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
  }

  fromEntity(user: User): typeof users.$inferInsert {
    const obj = user.toObject()

    return {
      id: decodeId(UserId, obj.id),
      name: obj.name,
      email: obj.email,
      passwordHash: obj.passwordHash,
      gender: obj.gender,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt
    }
  }

  findById(id: UserId): ResultAsync<User, UserError> {
    this.logger.debug({
      message: `[FIND] User #${id}`
    })

    const decodedId = decodeId(UserId, id)

    return ResultAsync.fromPromise(this.db.query.users.findFirst({ where: eq(users.id, decodedId) }), (error) => {
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
    this.logger.debug({
      message: `[INSERT] User #${user.id}`,
      user
    })

    return ResultAsync.fromPromise(this.db.insert(users).values(this.fromEntity(user)), (error) => {
      if (isPostgresError(error) && error.code === PostgresErrorCode.UniqueViolation) {
        // Check if it's an email violation
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
    })
      .andTee(() => this.changeTracker.attach(user))
      .map(() => void 0)
  }

  update(user: User): ResultAsync<void, UserError> {
    const patch = this.changeTracker.toPatch(user)

    this.logger.debug({
      message: `[UPDATE] User #${user.id}`,
      patch
    })

    if (isEmptyObject(patch)) {
      return okAsync()
    }

    const decodedId = decodeId(UserId, user.id)

    return ResultAsync.fromPromise(this.db.update(users).set(patch).where(eq(users.id, decodedId)), (error) => {
      this.logger.error({
        message: `[UPDATE] User #${user.id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(UserError.notFound())))
      .andTee(() => this.changeTracker.refresh(user))
  }

  delete(id: UserId): ResultAsync<void, UserError> {
    this.logger.debug({
      message: `[DELETE] User #${id}`
    })

    const decodedId = decodeId(UserId, id)

    return ResultAsync.fromPromise(this.db.delete(users).where(eq(users.id, decodedId)), (error) => {
      this.logger.error({
        message: `[DELETE] User #${id} failed with database error`,
        error
      })

      throw error
    })
      .andThen((result) => (result.rowCount ? okAsync() : errAsync(UserError.notFound())))
      .andTee(() => this.changeTracker.detach(User, { id }))
  }
}
