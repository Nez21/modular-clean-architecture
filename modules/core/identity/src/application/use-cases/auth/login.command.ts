import { IJwtService } from '@internal/building-blocks/auth'
import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { errAsync, ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { IPasswordService } from '#/application/services/password.service.interface'
import { ISessionService } from '#/application/services/session.service.interface'
import { AuthTokenDto } from '#/application/shared/auth.interface'
import { IUserRepository, UserError } from '#/domain'

export class LoginCommand extends Dto(
  z
    .object({
      email: z.string().email().describe('User email'),
      password: z.string().min(1).describe('User password')
    })
    .meta({ graphql: { name: 'LoginInput' } }),
  BaseCommand<ResultAsync<AuthTokenDto, UserError>>
) {}

registerInputType(LoginCommand)

@Injectable()
export class LoginHandler extends CommandHandler(LoginCommand) {
  logger = new Logger(LoginHandler.name)

  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IPasswordService) private readonly passwordService: IPasswordService,
    @Inject(IJwtService) private readonly jwtService: IJwtService,
    @Inject(ISessionService) private readonly sessionService: ISessionService
  ) {
    super()
  }

  async handle(command: LoginCommand): Promise<ResultAsync<AuthTokenDto, UserError>> {
    this.logger.debug({
      message: '[LOGIN] Attempting login',
      email: command.email
    })

    return this.userRepository
      .findByEmail(command.email)
      .map((user) => user.toObject())
      .andThen((user) => {
        return ResultAsync.fromPromise(this.passwordService.verify(command.password, user.passwordHash), () =>
          UserError.invalidCredentials()
        ).andThen((isValid) => {
          if (!isValid) {
            return errAsync(UserError.invalidCredentials())
          }

          const token = this.jwtService.sign({
            userId: user.id,
            email: user.email
          })

          return ResultAsync.fromPromise(this.sessionService.create(token, user.id), () =>
            UserError.invalidCredentials()
          ).map(() => {
            return AuthTokenDto.create({
              token,
              user
            })
          })
        })
      })
      .orElse((error) => {
        if (error.code === 'UserNotFound') {
          return errAsync(UserError.invalidCredentials())
        }

        return errAsync(error)
      })
  }
}
