import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { IPasswordService } from '#/application/services/password.service.interface'
import { GenderEnum, IUserRepository, User, UserError, UserId } from '#/domain'

export class RegisterCommand extends Dto(
  z
    .object({
      name: z.string().min(2).max(64).describe('User name'),
      email: z.email().max(64).describe('User email'),
      password: z.string().min(8).max(128).describe('User password'),
      gender: GenderEnum.optional().describe('User gender')
    })
    .meta({ graphql: { name: 'RegisterInput' } }),
  BaseCommand<ResultAsync<UserId, UserError>>
) {}

registerInputType(RegisterCommand)

@Injectable()
export class RegisterHandler extends CommandHandler(RegisterCommand) {
  logger = new Logger(RegisterHandler.name)

  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IPasswordService) private readonly passwordService: IPasswordService
  ) {
    super()
  }

  async handle(command: RegisterCommand): Promise<ResultAsync<UserId, UserError>> {
    this.logger.debug({
      message: '[REGISTER] Registering user',
      email: command.email
    })

    const passwordHash = await this.passwordService.hash(command.password)

    const user = User.create({
      name: command.name,
      email: command.email,
      passwordHash,
      gender: command.gender
    })

    return this.userRepository.insert(user).map(() => user.id)
  }
}
