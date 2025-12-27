import { BaseQuery, QueryHandler } from '@internal/building-blocks/mediator'
import { IRequestContextService } from '@internal/building-blocks/request-context'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { errAsync, ResultAsync } from 'neverthrow'

import { mapUserToUserDto, UserDto } from '#/application/shared/auth.interface'
import { IUserRepository, UserError, UserId } from '#/domain'

export class GetMeQuery extends BaseQuery<ResultAsync<UserDto, UserError>> {}

@Injectable()
export class GetMeHandler extends QueryHandler(GetMeQuery) {
  logger = new Logger(GetMeHandler.name)

  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IRequestContextService) private readonly requestContextService: IRequestContextService
  ) {
    super()
  }

  handle(): ResultAsync<UserDto, UserError> {
    const userId = this.requestContextService.current.userId

    if (!userId) {
      this.logger.warn({
        message: '[GET_ME] User ID not found in request context'
      })

      return errAsync(UserError.invalidCredentials())
    }

    this.logger.debug({
      message: '[GET_ME] Getting user',
      userId
    })

    return this.userRepository.findById(userId as UserId).map((user) => UserDto.create(mapUserToUserDto(user)))
  }
}
