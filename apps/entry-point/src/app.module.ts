import { AuthModule } from '@internal/building-blocks/auth'
import { CacheModule } from '@internal/building-blocks/cache'
import { DistributedLockModule } from '@internal/building-blocks/distributed-lock'
import { GraphQLTransportModule } from '@internal/building-blocks/graphql'
import { HealthModule } from '@internal/building-blocks/health'
import { MediatorModule } from '@internal/building-blocks/mediator'
import { RequestContextModule } from '@internal/building-blocks/request-context'
import { RestateModule } from '@internal/building-blocks/restate'
import { IdentityModule } from '@internal/identity-module'
import { TicketModule } from '@internal/ticket-module'

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
    MediatorModule.forRoot(),
    CacheModule.forRoot({
      connectionString: cfg.valkeyUrl
    }),
    DistributedLockModule.forRoot(),
    RequestContextModule,
    RestateModule.forRoot({
      client: {
        url: cfg.restateUrl
      },
      appPort: cfg.restateAppPort
    }),
    AuthModule.forRoot({
      jwtSecret: cfg.jwtSecret,
      jwtExpiresIn: cfg.jwtExpiresIn
    }),

    // Feature Modules
    IdentityModule.register({
      postgres: {
        connectionString: cfg.identityPostgresUrl
      }
    }),
    TicketModule.register({
      postgres: {
        connectionString: cfg.ticketPostgresUrl
      }
    }),

    // GraphQL Endpoint Registrations
    GraphQLTransportModule.forEndpoint({
      endpoint: '/identity',
      features: [IdentityModule],
      nodeEnv: cfg.nodeEnv
    }),
    GraphQLTransportModule.forEndpoint({
      endpoint: '/ticket',
      features: [TicketModule],
      nodeEnv: cfg.nodeEnv
    })
  ]
})
export class AppModule {}
