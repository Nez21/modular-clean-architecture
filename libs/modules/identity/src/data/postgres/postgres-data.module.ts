import { PostgresModule } from '@internal/building-blocks/postgres'

import type { DynamicModule } from '@nestjs/common'

import { IUserRepository } from '#/domain'

import { Connection } from './postgres-data.const'
import * as schema from './postgres-data.schema'
import { UserRepository } from './repositories/user.repository.impl'

export interface PostgresDataModuleOptions {
  connectionString: string
}

export class PostgresDataModule {
  static register(options: PostgresDataModuleOptions): DynamicModule {
    const { connectionString } = options

    return {
      module: PostgresDataModule,
      imports: [
        PostgresModule.forFeature({
          Connection,
          healthCheck: true,
          connectionString,
          config: { schema }
        })
      ],
      providers: [IUserRepository({ useClass: UserRepository })]
    }
  }
}
