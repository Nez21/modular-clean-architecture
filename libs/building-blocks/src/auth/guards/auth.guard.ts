import { IRequestContext, IRequestContextService } from '@internal/building-blocks/request-context'

import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import { GqlExecutionContext } from '@nestjs/graphql'

import { IJwtService } from '../jwt'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(
    @Inject(IJwtService) private readonly jwtService: IJwtService,
    @Inject(IRequestContextService) private readonly requestContextService: IRequestContextService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context)
    const { req } = ctx.getContext()

    const authHeader = req.headers?.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn({
        message: '[AUTH_GUARD] Missing or invalid authorization header'
      })

      throw new UnauthorizedException('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)

    try {
      const payload = this.jwtService.verify(token)

      const currentContext = this.requestContextService.current
      currentContext.userId = payload.userId
      currentContext.email = payload.email

      this.logger.debug({
        message: '[AUTH_GUARD] User authenticated',
        userId: payload.userId,
        email: payload.email
      })

      return true
    } catch (error) {
      this.logger.warn({
        message: '[AUTH_GUARD] Token verification failed',
        error
      })

      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
