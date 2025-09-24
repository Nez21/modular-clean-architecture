import { EJSON } from 'bson'

import { removeCircular } from './object.utils'

export const serialize = (value: unknown): string => {
  return EJSON.stringify(removeCircular(value))
}

export const deserialize = <T>(value: string | null | undefined): T | undefined => {
  if (!value) return

  return EJSON.parse(value) as T
}
