import { DiscoveryModule } from '@golevelup/nestjs-discovery'
import type { DynamicModule } from '@nestjs/common'

import { Mediator } from './mediator'
import { IMediator } from './mediator.interface'
import { MediatorModuleOptions } from './mediator.module.interface'

export class MediatorModule {
  static forRoot(options?: MediatorModuleOptions): DynamicModule {
    return {
      module: MediatorModule,
      global: true,
      imports: [DiscoveryModule],
      providers: [MediatorModuleOptions({ useValue: options }), IMediator({ useClass: Mediator })],
      exports: [IMediator]
    }
  }
}
