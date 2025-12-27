import { createIdSchema, Entity, generateId } from '@internal/common'

import { z } from 'zod'

export const UserId = createIdSchema('UserId', 'user')
export type UserId = z.infer<typeof UserId>

export const GenderEnum = z.enum(['Male', 'Female', 'Other']).meta({ graphql: { name: 'Gender' } })
export type GenderEnum = z.infer<typeof GenderEnum>

export class User extends Entity(
  z.object({
    id: UserId,
    name: z.string().min(2).max(64),
    email: z.email().max(64),
    passwordHash: z.string().min(1),
    gender: GenderEnum.looseOptional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  ['id']
) {
  static create(input: { name: string; email: string; passwordHash: string; gender?: GenderEnum }): User {
    const now = new Date()

    return User.fromObject({
      id: generateId(UserId),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      gender: input.gender,
      createdAt: now,
      updatedAt: now
    })
  }
}

export interface IUser extends z.output<typeof User.$schema> {}
