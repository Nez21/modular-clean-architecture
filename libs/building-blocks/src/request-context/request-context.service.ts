import { throwError } from '@internal/common'

import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

import { CurrentRequestContext, IRequestContext, IRequestContextService } from './request-context.service.interface'

@Injectable()
export class RequestContextService implements IRequestContextService {
  constructor(private readonly clsService: ClsService) {}

  get current(): IRequestContext {
    return this.clsService.get(CurrentRequestContext) ?? throwError(new Error('Request context not found'))
  }

  register(requestContext: IRequestContext): void {
    this.clsService.set(CurrentRequestContext, requestContext)
  }
}
