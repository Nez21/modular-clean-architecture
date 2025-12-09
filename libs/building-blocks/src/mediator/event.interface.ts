import { SetTypedMetadata } from '@internal/common'

import { MetadataKeys } from './mediator.const'

export abstract class BaseEvent {}

export interface IEventHandler<TEvent extends BaseEvent = BaseEvent> {
  handle(request: TEvent): void | Promise<void>
}

export const EventHandler = <TEventTypes extends AnyClass<BaseEvent>[]>(...targets: TEventTypes) => {
  type TEventType = TEventTypes[number]
  type TEvent = TEventType extends TEventType
    ? TEventType extends AbstractClass<infer R extends BaseEvent>
      ? R
      : never
    : never

  @SetTypedMetadata(MetadataKeys.Events, targets)
  abstract class EventHandler implements IEventHandler<TEvent> {
    abstract handle(request: TEvent): void | Promise<void>
  }

  return EventHandler as AbstractClass<IEventHandler<TEvent>>
}
