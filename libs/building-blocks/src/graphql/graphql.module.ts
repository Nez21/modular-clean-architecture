import path from 'node:path'

import type { ApolloServerPlugin } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import type { ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloDriver } from '@nestjs/apollo'
import { type DynamicModule, Logger } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import ms from 'ms'

import type { CacheKey } from '#/cache'
import { ICacheService } from '#/cache'

export interface GraphQLTransportModuleOptions {
  endpoint: string
  features: NonEmptyArray<Class>
  nodeEnv: NodeEnv
}

export class GraphQLTransportModule {
  public static readonly logger = new Logger(GraphQLTransportModule.name)

  static forEndpoint(options: GraphQLTransportModuleOptions): DynamicModule {
    const { endpoint, features, nodeEnv } = options

    return {
      module: GraphQLTransportModule,
      imports: [
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
          driver: ApolloDriver,
          useFactory: (cacheService: ICacheService) => ({
            include: features,
            autoSchemaFile: true,
            autoTransformHttpErrors: true,
            allowBatchedHttpRequests: true,
            path: path.posix.join(endpoint, 'graphql'),
            playground: false,
            useGlobalPrefix: true,
            disableHealthCheck: true,
            logger: {
              log: (message: unknown) => {
                GraphQLTransportModule.logger.log(message)
              },
              debug: (message: unknown) => {
                GraphQLTransportModule.logger.debug(message)
              },
              info: (message: unknown) => {
                GraphQLTransportModule.logger.log(message)
              },
              warn: (message: unknown) => {
                GraphQLTransportModule.logger.warn(message)
              },
              error: (message: unknown) => {
                GraphQLTransportModule.logger.error(message)
              }
            },
            persistedQueries: {
              ttl: ms('1 day'),
              cache: {
                get: async (key: string) => {
                  return await cacheService.keyValueGet(key as CacheKey<string>)
                },
                set: async (key: string, value: string) => {
                  await cacheService.keyValueSet(key as CacheKey<string>, value)
                },
                delete: async (key: string) => {
                  await cacheService.keyValueDelete(key as CacheKey<string>)
                }
              }
            },
            plugins: [nodeEnv === 'development' && ApolloServerPluginLandingPageLocalDefault({ embed: true })].filter(
              Boolean
            ) as ApolloServerPlugin[]
          }),
          inject: [ICacheService]
        }),
        ...features
      ]
    }
  }
}
