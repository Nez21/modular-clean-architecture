import { registerOutputType } from '@internal/building-blocks/graphql'
import { createMapper, Dto } from '@internal/common'

import { z } from 'zod'

import { GenderEnum, User, UserId } from '#/domain'

export class UserDto extends Dto(
  z
    .object({
      id: UserId,
      name: z.string(),
      email: z.email(),
      gender: GenderEnum.optional(),
      createdAt: z.date(),
      updatedAt: z.date()
    })
    .meta({ graphql: { name: 'UserDto' } })
) {}

export class AuthTokenDto extends Dto(
  z
    .object({
      token: z.string(),
      user: UserDto.$schema
    })
    .meta({ graphql: { name: 'AuthTokenDto' } })
) {}

registerOutputType(UserDto)
registerOutputType(AuthTokenDto)

export const mapUserToUserDto = createMapper(User.$schema, UserDto.$schema).build()
