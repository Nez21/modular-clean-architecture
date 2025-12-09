import { DtoUtils } from '@internal/common'

import { type Observable } from 'rxjs'

import type { CallHandler, PipelineBehaviorInput } from '../pipeline-behavior.interface'
import { BasePipelineBehavior } from '../pipeline-behavior.interface'

export class ValidationBehavior extends BasePipelineBehavior {
  async handle(input: PipelineBehaviorInput, next: CallHandler): Promise<Observable<unknown>> {
    if (DtoUtils.isDto(input.data)) {
      await input.data.validateAsync()
    }

    return next.handle()
  }
}
