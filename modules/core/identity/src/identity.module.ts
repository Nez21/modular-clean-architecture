import { type DynamicModule } from '@nestjs/common'

import type { PostgresDataModuleOptions } from './data/postgres'
import { PostgresDataModule } from './data/postgres'

export interface IdentityModuleOptions {
  postgres: PostgresDataModuleOptions
  nodeEnv: NodeEnv
}

export class IdentityModule {
  static register(options: IdentityModuleOptions): DynamicModule {
    const { postgres } = options

    return {
      module: IdentityModule,
      imports: [PostgresDataModule.register(postgres)],
      providers: []
    }
  }
}
