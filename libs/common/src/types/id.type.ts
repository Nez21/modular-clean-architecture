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

type IdSchema<TBrand extends string, TPrefix extends string> = zodCore.$ZodBranded<
  z.ZodLiteral<`${TPrefix}_${string}`>,
  Branded<`${TPrefix}_${string}`, TBrand>
>

export const createIdSchema = <TBrand extends string, TPrefix extends string>(brand: TBrand, prefix: TPrefix) =>
  z.literal(`${prefix}_${z.uuid()}`).meta({ idSchema: { brand, prefix } }).brand<TBrand>()

export const encodeId = <TSchema extends IdSchema<string, string>>(schema: TSchema, id: string) =>
  `${schema.meta()!.idSchema!.prefix}_${id}` as z.infer<TSchema>

export const decodeId = <TSchema extends IdSchema<string, string>>(schema: TSchema, id: z.infer<TSchema>) =>
  schema.parse(id).split('_')[1]

export const generateId = <TSchema extends IdSchema<string, string>>(schema: TSchema) => encodeId(schema, v7())

export const generateRawId = () => v7()
