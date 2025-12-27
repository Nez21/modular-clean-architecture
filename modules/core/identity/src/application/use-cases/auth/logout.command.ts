import { registerInputType } from '@internal/building-blocks/graphql'
import { BaseCommand, CommandHandler } from '@internal/building-blocks/mediator'
import { Dto } from '@internal/common'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { okAsync, ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { ISessionService } from '#/application/services/session.service.interface'
import { UserError } from '#/domain'

export class LogoutCommand extends Dto(
  z
    .object({
      token: z.string().describe('JWT token to invalidate')
    })
    .meta({ graphql: { name: 'LogoutInput' } }),
  BaseCommand<ResultAsync<boolean, UserError>>
) {}

registerInputType(LogoutCommand)

@Injectable()
export class LogoutHandler extends CommandHandler(LogoutCommand) {
  logger = new Logger(LogoutHandler.name)

  constructor(@Inject(ISessionService) private readonly sessionService: ISessionService) {
    super()
  }

  async handle(command: LogoutCommand): Promise<ResultAsync<boolean, UserError>> {
    this.logger.debug({
      message: '[LOGOUT] Logging out user'
    })

    await this.sessionService.delete(command.token)

    return okAsync(true)
  }
}
