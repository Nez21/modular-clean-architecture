import { type DynamicModule } from '@nestjs/common'
import ms from 'ms'

import { AuthGuard } from './guards'
import { IJwtService, JwtService, JwtServiceOptions } from './jwt'

export interface AuthModuleOptions {
  jwtSecret: string
  jwtExpiresIn: ms.StringValue
}

export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const jwtOptions: JwtServiceOptions = {
      secret: options.jwtSecret,
      expiresIn: options.jwtExpiresIn
    }

    return {
      module: AuthModule,
      global: true,
      providers: [
        {
          provide: 'JWT_OPTIONS',
          useValue: jwtOptions
        },
        IJwtService({ useClass: JwtService }),
        AuthGuard
      ],
      exports: [IJwtService, AuthGuard]
    }
  }
}
