import { Injectable } from '@nestjs/common'

import { User } from '#/domain/entities'
import { IUserRepository } from '#/domain/repositories'

@Injectable()
export class UserRepository implements IUserRepository {
  async findAll(): Promise<User[]> {
    return []
  }
}
