import { Token } from '@internal/common'

import type { User } from '../entities'

export interface IUserRepository {
  findAll(): Promise<User[]>
}

export const IUserRepository = Token<IUserRepository>('IUserRepository')
