import type { TokenFn } from '@internal/common'

import type { DynamicModule } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import type { DrizzleConfig } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { kebabCase } from 'string-ts'

import { ChangeTrackerModule } from '#/change-tracker'
import { HealthService } from '#/health'

export interface PostgresModuleBaseOptions {
  Database: TokenFn<NodePgDatabase<any>>
  healthCheck?: boolean
}

export interface PostgresConnectionOption {
  connectionString: string
  config: Omit<DrizzleConfig<any>, 'logger'>
}

export interface PostgresModuleOptions extends PostgresModuleBaseOptions, PostgresConnectionOption {}

export class PostgresModule {
  static readonly logger = new Logger(PostgresModule.name)

  static createDrizzle(
    moduleOptions: PostgresModuleBaseOptions,
    connectionOptions: PostgresConnectionOption,
    healthService: HealthService
  ) {
    const { Database, healthCheck } = moduleOptions
    const { connectionString, config } = connectionOptions
    const pool = new Pool({ connectionString: connectionString })

    if (healthCheck) {
      healthService.indicators.push(async () => ({
        [`postgres:${kebabCase(Database.name)}`]: {
          status: (await pool
            .query('SELECT 1')
            .then(() => 'up')
            .catch(() => 'down')) as 'up' | 'down'
        }
      }))
    }

    return drizzle(pool, {
      ...config,
      logger: {
        logQuery(query, params) {
          PostgresModule.logger.log(query, params)
        }
      }
    })
  }

  static forFeature(options: PostgresModuleOptions): DynamicModule {
    const { Database, healthCheck, ...connectionOptions } = options

    return {
      module: PostgresModule,
      imports: [ChangeTrackerModule],
      providers: [
        Database({
          useFactory: (healthService) =>
            PostgresModule.createDrizzle({ Database, healthCheck }, connectionOptions, healthService),
          inject: [HealthService]
        })
      ],
      exports: [Database]
    }
  }
}
