import { Token } from '@internal/common'

export const CurrentRequestContext = Symbol('CurrentRequestContext')

export interface IRequestContext {
  tenantId: string
  idempotencyKey: string | undefined
  userId: string | undefined
  email: string | undefined
}

export interface IRequestContextService {
  get current(): IRequestContext
  register(requestContext: IRequestContext): void
}

export const IRequestContextService = Token<IRequestContextService>('IRequestContextService')
