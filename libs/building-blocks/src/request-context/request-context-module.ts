import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'

import { RequestContextService } from './request-context.service'
import { CurrentRequestContext, IRequestContextService } from './request-context.service.interface'

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls) => {
          cls.set(CurrentRequestContext, {})
        }
      }
    })
  ],
  providers: [IRequestContextService({ useClass: RequestContextService })],
  exports: [IRequestContextService]
})
export class RequestContextModule {}
