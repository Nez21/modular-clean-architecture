import { GraphQLTransportModule } from '@internal/building-blocks/graphql'

import { Module } from '@nestjs/common'

import { I18nResolver } from './api/i18n.resolver'
import { PostgresDataModule } from './database/postgres-data.module'
import { I18nService } from './services/i18n.service'

export interface LocalizationModuleOptions {
  postgres: {
    connectionString: string
  }
  nodeEnv: NodeEnv
}

@Module({
  providers: [I18nService, I18nResolver]
})
export class LocalizationFeaturesModule {}

@Module({})
export class LocalizationModule {
  static register(options: LocalizationModuleOptions) {
    const { postgres, nodeEnv } = options

    return {
      module: LocalizationModule,
      imports: [
        PostgresDataModule.register(postgres),

        GraphQLTransportModule.forEndpoint({
          endpoint: '/identity',
          features: [LocalizationFeaturesModule],
          nodeEnv
        })
      ]
    }
  }
}
