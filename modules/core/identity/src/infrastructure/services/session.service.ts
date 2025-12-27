import { CacheKey, ICacheService } from '@internal/building-blocks/cache'

import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import ms from 'ms'

import { ISessionService } from '#/application/services/session.service.interface'

@Injectable()
export class SessionService implements ISessionService {
  private readonly logger = new Logger(SessionService.name)
  private readonly defaultTtl: ms.StringValue = '7d'

  constructor(@Inject(ICacheService) private readonly cacheService: ICacheService) {}

  async create(token: string, userId: string, ttl?: ms.StringValue): Promise<void> {
    this.logger.debug({
      message: '[CREATE] Creating session',
      userId
    })

    const sessionKey = this.getSessionKey(token)
    const ttlValue = ttl || this.defaultTtl

    await this.cacheService.keyValueSet(CacheKey<string>(sessionKey), userId, ttlValue)
  }

  async get(token: string): Promise<string | undefined> {
    this.logger.debug({
      message: '[GET] Getting session'
    })

    const sessionKey = this.getSessionKey(token)

    return await this.cacheService.keyValueGet(CacheKey<string>(sessionKey))
  }

  async delete(token: string): Promise<void> {
    this.logger.debug({
      message: '[DELETE] Deleting session'
    })

    const sessionKey = this.getSessionKey(token)

    await this.cacheService.keyValueDelete(sessionKey)
  }

  private getSessionKey(token: string): string {
    return `session:${token}`
  }
}
