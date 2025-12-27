import { PostgresModule } from '@internal/building-blocks/postgres'

import type { DynamicModule } from '@nestjs/common'

import { ITicketRepository } from '#/domain/ticket'

import { Database } from './postgres-data.const'
import * as schema from './postgres-data.schema'
import { TicketRepository } from './repositories/ticket.repository.impl'

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
          Database,
          healthCheck: true,
          connectionString,
          config: { schema }
        })
      ],
      providers: [ITicketRepository({ useClass: TicketRepository })],
      exports: [ITicketRepository]
    }
  }
}
