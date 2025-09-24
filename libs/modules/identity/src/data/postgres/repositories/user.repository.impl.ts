import { Injectable } from '@nestjs/common'

import { IUserRepository, User } from '#/domain'

import { users } from '../postgres-data.schema'

@Injectable()
export class UserRepository implements IUserRepository {
  static toEntity(user: typeof users.$inferSelect): User {
    return User.create({
      id: user.id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
  }

  static fromEntity(user: User): typeof users.$inferInsert {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      createdAt: new Date(user.createdAt.getTime()),
      updatedAt: new Date(user.updatedAt.getTime())
    }
  }

  async findAll(): Promise<User[]> {
    return []
  }
}
