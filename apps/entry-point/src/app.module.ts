import { CacheModule } from '@internal/building-blocks/cache'
import { HealthModule } from '@internal/building-blocks/health'
import { MediatorModule } from '@internal/building-blocks/mediator'
import { RestateModule } from '@internal/building-blocks/restate'
import { UserModule } from '@internal/user-module'

import { Module, RequestMethod } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import { cfg } from './config'

@Module({
  imports: [
    // Common Modules
    LoggerModule.forRoot({
      pinoHttp: {
        level: cfg.appLogLevel,
        transport:
          cfg.nodeEnv === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true
                }
              }
            : undefined
      },
      exclude: [{ method: RequestMethod.ALL, path: 'health' }]
    }),
    HealthModule,
    MediatorModule,
    CacheModule.forRoot({
      connectionString: cfg.valkeyUrl
    }),
    RestateModule.forRoot({
      client: {
        url: cfg.restateUrl
      },
      appPort: cfg.restateAppPort
    }),

    // Feature Modules
    UserModule.register({
      postgres: {
        connectionString: cfg.userPostgresUrl
      },
      nodeEnv: cfg.nodeEnv
    })
  ]
})
export class AppModule {}
