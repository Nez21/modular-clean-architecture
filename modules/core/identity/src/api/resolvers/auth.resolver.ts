import { AuthGuard } from '@internal/building-blocks/auth'
import { IMediator } from '@internal/building-blocks/mediator'

import { Inject, UseGuards } from '@nestjs/common'
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql'

import { AuthTokenDto, UserDto } from '#/application/shared/auth.interface'
import { GetMeQuery, LoginCommand, LogoutCommand, RegisterCommand } from '#/application/use-cases/auth'

@Resolver()
export class AuthResolver {
  constructor(@Inject(IMediator) private readonly mediator: IMediator) {}

  @Mutation(() => ID, { description: 'Register a new user' })
  async register(@Args('input') command: RegisterCommand): Promise<string> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  }

  @Mutation(() => AuthTokenDto, { description: 'Login with email and password' })
  async login(@Args('input') command: LoginCommand): Promise<AuthTokenDto> {
    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  }

  @Mutation(() => Boolean, { description: 'Logout and invalidate session' })
  @UseGuards(AuthGuard)
  async logout(@Context() context: { req: { headers: { authorization?: string } } }): Promise<boolean> {
    const authHeader = context.req.headers?.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing authorization token')
    }

    const token = authHeader.substring(7)
    const command = LogoutCommand.create({ token })

    const result = await this.mediator.send(command)

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  }

  @Query(() => UserDto, { description: 'Get current authenticated user' })
  @UseGuards(AuthGuard)
  async me(): Promise<UserDto> {
    const result = await this.mediator.send(new GetMeQuery())

    if (result.isErr()) {
      throw result.error
    }

    return result.value
  }
}
