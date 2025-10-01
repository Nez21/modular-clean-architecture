import { DynamicModule } from '@nestjs/common'

import { IDistributedLockService } from './distributed-lock.interface'
import { DistributedLockModuleOptions } from './distributed-lock.module.types'
import { DistributedLockService } from './distributed-lock.service'

export class DistributedLockModule {
  static forRoot(options?: DistributedLockModuleOptions): DynamicModule {
    return {
      module: DistributedLockModule,
      global: true,
      providers: [
        DistributedLockModuleOptions({ useValue: options ?? {} }),
        IDistributedLockService({ useClass: DistributedLockService })
      ],
      exports: [IDistributedLockService]
    }
  }
}
