import type { DynamicModule } from '@nestjs/common'

import { Handler, type RestateContext, RestateService } from '@internal/building-blocks/restate'

import type { PostgresDataModuleOptions } from './data/postgres'
import { PostgresDataModule } from './data/postgres'

export interface UserModuleOptions {
  postgres: PostgresDataModuleOptions
  nodeEnv: 'development' | 'production'
}

@RestateService('User')
export class UserService {
  @Handler
  helloWorld(ctx: RestateContext): string {
    ctx.console.log('hello world')

    return 'hello world'
  }
}

export class UserModule {
  static register(options: UserModuleOptions): DynamicModule {
    const { postgres } = options

    return {
      module: UserModule,
      imports: [
        PostgresDataModule.register(postgres)
        // GraphQLTransportModule.forEndpoint({
        //   endpoint: '/user',
        //   features: [],
        //   nodeEnv
        // })
      ],
      providers: [UserService]
    }
  }
}
