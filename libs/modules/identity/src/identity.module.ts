import { Handler, type RestateContext, RestateService } from '@internal/building-blocks/restate'

import type { DynamicModule } from '@nestjs/common'

import type { PostgresDataModuleOptions } from './data/postgres'
import { PostgresDataModule } from './data/postgres'

export interface IdentityModuleOptions {
  postgres: PostgresDataModuleOptions
  nodeEnv: NodeEnv
}

@RestateService('User')
export class UserService {
  @Handler
  helloWorld(ctx: RestateContext): string {
    ctx.console.log('hello world')

    return 'hello world'
  }
}

export class IdentityModule {
  static register(options: IdentityModuleOptions): DynamicModule {
    const { postgres } = options

    return {
      module: IdentityModule,
      imports: [
        PostgresDataModule.register(postgres)
        // GraphQLTransportModule.forEndpoint({
        //   endpoint: '/identity',
        //   features: [],
        //   nodeEnv
        // })
      ],
      providers: [UserService]
    }
  }
}
