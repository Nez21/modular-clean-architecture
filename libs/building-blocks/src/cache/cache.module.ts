import { type DynamicModule } from '@nestjs/common'
import { GlideClient } from '@valkey/valkey-glide'

import { HealthModule, HealthService } from '#/health'

import { CacheModuleOptions } from './cache.module.types'
import { CacheService } from './cache.service'
import { ICacheService, ValkeyClient } from './cache.service.interface'

export class CacheModule {
  static forRoot(options: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      global: true,
      imports: [HealthModule],
      providers: [
        CacheModuleOptions({ useValue: options }),
        ValkeyClient({
          useFactory: async (healthService: HealthService) => {
            const url = new URL(options.connectionString)
            const valkey = await GlideClient.createClient({
              addresses: [{ host: url.hostname, port: Number(url.port) }],
              credentials: {
                username: url.username,
                password: url.password
              }
            })

            healthService.indicators.push(async () => ({
              [`cache`]: {
                status: (await valkey
                  .ping()
                  .then(() => 'up')
                  .catch(() => 'down')) as 'up' | 'down'
              }
            }))

            return valkey
          },
          inject: [HealthService]
        }),
        ICacheService({ useClass: CacheService })
      ],
      exports: [ValkeyClient, ICacheService]
    }
  }
}
