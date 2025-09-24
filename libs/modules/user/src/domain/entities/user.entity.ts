import { Entity } from '@internal/common'

import { z } from 'zod'

export type UserId = Branded<string, 'UserId'>

export class User extends Entity(
  z.object({
    id: z.uuid().brand<UserId>(),
    name: z.string().min(2).max(64),
    email: z.string().email().max(64),
    gender: z
      .enum(['Male', 'Female', 'Other'])
      .nullish()
      .transform((v) => v ?? undefined),
    metadata: z.object({
      createdAt: z.date(),
      updatedAt: z.date()
    })
  }),
  ['id']
) {}

export interface IUser extends z.output<typeof User.schema> {}
