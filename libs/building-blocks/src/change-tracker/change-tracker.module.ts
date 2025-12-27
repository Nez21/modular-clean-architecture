import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'

import { ChangeTracker } from './change-tracker'
import { SnapshotStorage } from './change-tracker.const'
import { IChangeTracker } from './change-tracker.interface'

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls) => {
          cls.set(SnapshotStorage, new Map<string, unknown>())
        }
      }
    })
  ],
  providers: [IChangeTracker({ useClass: ChangeTracker })],
  exports: [IChangeTracker]
})
export class ChangeTrackerModule {}
