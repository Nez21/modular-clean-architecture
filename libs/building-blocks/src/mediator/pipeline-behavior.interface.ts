import { Injectable } from '@nestjs/common'
import type { Observable } from 'rxjs'

import type { TokenFn } from '@internal/common'
import { SetTypedMetadata } from '@internal/common'

import type { BaseCommand, ICommandHandler } from './command.interface'
import type { IEventHandler, BaseEvent } from './event.interface'
import { MetadataKeys } from './mediator.const'
import type { IQueryHandler, BaseQuery } from './query.interface'

export class PipelineBehaviorContext<THandler extends ICommandHandler | IQueryHandler | IEventHandler> {
  readonly class: Class<THandler>
  readonly instance: THandler
  readonly handler: THandler['handle']

  constructor(input: { class: Class<THandler>; instance: THandler; handler: THandler['handle'] }) {
    this.class = input.class
    this.instance = input.instance
    this.handler = input.handler
  }
}

export interface CallHandler<T = unknown> {
  handle(): Observable<T>
}

export type PipelineBehaviorInput =
  | { type: 'query'; data: BaseQuery & Record<string, unknown>; context: PipelineBehaviorContext<IQueryHandler> }
  | { type: 'command'; data: BaseCommand & Record<string, unknown>; context: PipelineBehaviorContext<ICommandHandler> }
  | { type: 'event'; data: BaseEvent & Record<string, unknown>; context: PipelineBehaviorContext<IEventHandler> }

@Injectable()
export abstract class BasePipelineBehavior {
  abstract handle(input: PipelineBehaviorInput, next: CallHandler): Promise<Observable<unknown>> | Observable<unknown>
}

export const UsePipelineBehaviors = (
  ...behaviors: (TokenFn<BasePipelineBehavior> | Class<BasePipelineBehavior> | BasePipelineBehavior)[]
) => SetTypedMetadata(MetadataKeys.UsePipelineBehaviors, behaviors, true) as ClassDecorator
