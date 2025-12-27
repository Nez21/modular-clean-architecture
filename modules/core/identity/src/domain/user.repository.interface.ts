import { Token } from '@internal/common'

import { ResultAsync } from 'neverthrow'

import type { User, UserId } from './user.aggregate-root'
import { UserError } from './user.error'

export interface IUserRepository {
  findById(id: UserId): ResultAsync<User, UserError>
  findByEmail(email: string): ResultAsync<User, UserError>
  insert(user: User): ResultAsync<void, UserError>
  update(user: User): ResultAsync<void, UserError>
  delete(id: UserId): ResultAsync<void, UserError>
}

export const IUserRepository = Token<IUserRepository>('IUserRepository')
