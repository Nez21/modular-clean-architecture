import { PostgresModule } from '@internal/building-blocks/postgres'

import { DynamicModule } from '@nestjs/common'

import { Connection } from './postgres-data.const'
import * as schema from './postgres-data.schema'

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
      ]
    }
  }
}
