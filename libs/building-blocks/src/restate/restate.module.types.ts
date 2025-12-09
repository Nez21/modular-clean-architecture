import { Token } from '@internal/common'

export interface RestateModuleOptions {
  client: {
    url: string
    headers?: Record<string, string>
  }
  appPort: number
}

export const RestateModuleOptions = Token<RestateModuleOptions>('RestateModuleOptions')
