import { Token } from '@internal/common'

export interface JwtPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export interface IJwtService {
  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string
  verify(token: string): JwtPayload
}

export const IJwtService = Token<IJwtService>('IJwtService')
