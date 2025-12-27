import { Token } from '@internal/common'

export interface IPasswordService {
  hash(password: string): Promise<string>
  verify(plainPassword: string, hashedPassword: string): Promise<boolean>
}

export const IPasswordService = Token<IPasswordService>('IPasswordService')
