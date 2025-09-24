export interface IRequestContextService {
  get tenantId(): string
  get userId(): string
  get sessionId(): string
  get correlationId(): string
  get idempotentKey(): string
}

export const IRequestContextService = Symbol('IRequestContextService')
