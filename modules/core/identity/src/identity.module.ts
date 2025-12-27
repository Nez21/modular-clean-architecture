import { GraphQLTransportModule } from '@internal/building-blocks/graphql'

import { type DynamicModule, Module } from '@nestjs/common'

import { AuthResolver } from './api/resolvers'
import { IPasswordService } from './application/services/password.service.interface'
import { ISessionService } from './application/services/session.service.interface'
import { GetMeHandler, LoginHandler, LogoutHandler, RegisterHandler } from './application/use-cases/auth'
import type { PostgresDataModuleOptions } from './data/postgres'
import { PostgresDataModule } from './data/postgres'
import { PasswordService } from './infrastructure/services/password.service'
import { SessionService } from './infrastructure/services/session.service'

export interface IdentityModuleOptions {
  postgres: PostgresDataModuleOptions
}

export class IdentityModule {
  static register(options: IdentityModuleOptions): DynamicModule {
    const { postgres } = options

    return {
      module: IdentityModule,
      imports: [PostgresDataModule.register(postgres)],
      providers: [
        // Resolvers
        AuthResolver,

        // Use Cases
        RegisterHandler,
        LoginHandler,
        LogoutHandler,
        GetMeHandler,

        // Services
        IPasswordService({ useClass: PasswordService }),
        ISessionService({ useClass: SessionService })
      ]
    }
  }
}
