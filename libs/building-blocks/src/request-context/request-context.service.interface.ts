import { Token } from '@internal/common'

export interface IRequestContext {
  get tenantId(): string
}

export interface IRequestContextService {
  get current(): IRequestContext
}

export const IRequestContextService = Token<IRequestContextService>('IRequestContextService')
