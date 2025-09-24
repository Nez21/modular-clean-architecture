import { Token } from '@internal/common'

import type { CommandResultOf, BaseCommand } from './command.interface'
import type { BaseEvent } from './event.interface'
import type { BaseQuery, QueryResultOf } from './query.interface'

export interface IMediator {
  send<TCommand extends BaseCommand>(command: TCommand): Promise<CommandResultOf<TCommand>>
  send<TQuery extends BaseQuery>(query: TQuery): Promise<QueryResultOf<TQuery>>
  send<TRequest extends BaseCommand | BaseQuery>(
    request: TRequest
  ): Promise<
    | CommandResultOf<TRequest extends BaseCommand ? TRequest : never>
    | QueryResultOf<TRequest extends BaseQuery ? TRequest : never>
  >
  publish<TEvent extends BaseEvent>(event: TEvent): Promise<void>
}

export const IMediator = Token<IMediator>('IMediator')
