import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common/decorators'
import jwt from 'jsonwebtoken'
import ms from 'ms'

import { IJwtService, JwtPayload } from './jwt.service.interface'

export interface JwtServiceOptions {
  secret: string
  expiresIn: ms.StringValue
}

@Injectable()
export class JwtService implements IJwtService {
  logger = new Logger(JwtService.name)

  constructor(@Inject('JWT_OPTIONS') private readonly options: JwtServiceOptions) {}

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    this.logger.debug({
      message: '[SIGN] Signing JWT token',
      userId: payload.userId
    })

    return jwt.sign(payload, this.options.secret, {
      expiresIn: this.options.expiresIn
    })
  }

  verify(token: string): JwtPayload {
    this.logger.debug({
      message: '[VERIFY] Verifying JWT token'
    })

    try {
      const payload = jwt.verify(token, this.options.secret) as JwtPayload

      return payload
    } catch (error) {
      this.logger.warn({
        message: '[VERIFY] JWT token verification failed',
        error
      })

      throw error
    }
  }
}
