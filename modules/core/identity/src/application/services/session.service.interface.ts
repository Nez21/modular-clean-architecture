import { Token } from '@internal/common'

export interface ISessionService {
  create(token: string, userId: string, ttl?: string): Promise<void>
  get(token: string): Promise<string | undefined>
  delete(token: string): Promise<void>
}

export const ISessionService = Token<ISessionService>('ISessionService')
