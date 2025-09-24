import superjson from 'superjson'

export const serialize = (value: unknown): string => {
  return superjson.stringify(value)
}

export const deserialize = <T>(value: string | null | undefined): T | undefined => {
  if (!value) return

  return superjson.parse(value)
}
