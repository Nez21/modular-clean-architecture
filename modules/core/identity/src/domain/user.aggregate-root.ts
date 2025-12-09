import { createIdSchema, Entity } from '@internal/common'

import { z } from 'zod'

export const UserId = createIdSchema('UserId', 'user')
export type UserId = z.infer<typeof UserId>

export class User extends Entity(
  z.object({
    id: UserId,
    name: z.string().min(2).max(64),
    email: z.email().max(64),
    gender: z.enum(['Male', 'Female', 'Other']).looseOptional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  ['id']
) {}

export interface IUser extends z.output<typeof User.schema> {}
