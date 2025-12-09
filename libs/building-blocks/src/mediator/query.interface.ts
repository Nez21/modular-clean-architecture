import { SetTypedMetadata } from '@internal/common'

import { MetadataKeys } from './mediator.const'

const Result = Symbol()

export abstract class BaseQuery<TResult = unknown> {
  [Result]?: TResult
}

export type QueryResultOf<TRequest extends BaseQuery> = NonNullable<TRequest[typeof Result]>

export interface IQueryHandler<TQuery extends BaseQuery = BaseQuery> {
  handle(request: TQuery): QueryResultOf<TQuery> | Promise<QueryResultOf<TQuery>>
}

export const QueryHandler = <TQueryType extends AnyClass<BaseQuery>>(target: TQueryType) => {
  type TQuery = TQueryType['prototype']

  @SetTypedMetadata(MetadataKeys.Query, target)
  abstract class QueryHandler implements IQueryHandler<TQuery> {
    abstract handle(request: TQuery): QueryResultOf<TQuery> | Promise<QueryResultOf<TQuery>>
  }

  return QueryHandler
}
