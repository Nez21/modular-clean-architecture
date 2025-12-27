import { v7 } from 'uuid'
import type { core as zodCore } from 'zod'
import z from 'zod'

type IdSchemaMetadata = {
  brand: string
  prefix: string
}

declare module 'zod' {
  interface GlobalMeta {
    idSchema?: IdSchemaMetadata
  }
}

type IdSchema<TBrand extends string, TPrefix extends string> = z.ZodCodec<
  z.ZodUUID,
  PropertyKey extends TBrand
    ? z.ZodCustom<`${TPrefix}_${string}`>
    : zodCore.$ZodBranded<z.ZodCustom<`${TPrefix}_${string}`>, TBrand>
>

export const createIdSchema = <TBrand extends string, TPrefix extends string>(brand: TBrand, prefix: TPrefix) =>
  z.codec(
    z.uuid(),
    z
      .custom<`${TPrefix}_${string}`>((data) => {
        if (typeof data !== 'string') return false
        const [rawPrefix, rawUuid] = data.split('_')
        return rawPrefix === prefix && z.uuid().safeParse(rawUuid).success
      })
      .meta({ idSchema: { brand, prefix } })
      .brand<TBrand>(),
    {
      encode: (id) => id.split('_')[1],
      decode: (id) => `${prefix}_${id}` as any
    }
  )

export const generateId = <TSchema extends IdSchema<string, string>>(schema: TSchema) =>
  schema.decode(v7() as z.input<TSchema>)

export const generateRawId = () => v7()
