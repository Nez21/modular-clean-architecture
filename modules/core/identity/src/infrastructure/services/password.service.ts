import { Injectable, Logger } from '@nestjs/common'
import bcrypt from 'bcrypt'

import { IPasswordService } from '#/application/services/password.service.interface'

@Injectable()
export class PasswordService implements IPasswordService {
  private readonly logger = new Logger(PasswordService.name)
  private readonly saltRounds = 12

  async hash(password: string): Promise<string> {
    this.logger.debug({
      message: '[HASH] Hashing password'
    })

    return await bcrypt.hash(password, this.saltRounds)
  }

  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    this.logger.debug({
      message: '[VERIFY] Verifying password'
    })

    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}
