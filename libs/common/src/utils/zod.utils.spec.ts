import z from 'zod'

import { traversalSchema } from './zod.utils'

describe('traversalSchema', () => {
  it('should handle simple object schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    })

    const results: Array<{
      path: string[]
      object: boolean
      array: boolean
      nullable: boolean
      arrayNullable: boolean
    }> = []
    const handler = (
      _: any,
      path: string[],
      attributes: { object: boolean; array: boolean; nullable: boolean; arrayNullable: boolean }
    ) => {
      results.push({ path, ...attributes })
    }

    traversalSchema(schema, handler)
    expect(results).toEqual([
      { path: ['name'], object: false, array: false, nullable: false, arrayNullable: false },
      { path: ['age'], object: false, array: false, nullable: false, arrayNullable: false }
    ])
  })

  it('should handle complex nested schema with arrays and nullable fields', () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string().nullable(),
          addresses: z
            .array(
              z.object({
                street: z.string()
              })
            )
            .nullable()
        })
      )
    })

    const results: Array<{
      path: string[]
      object: boolean
      array: boolean
      nullable: boolean
      arrayNullable: boolean
    }> = []
    const handler = (
      _: any,
      path: string[],
      attributes: { object: boolean; array: boolean; nullable: boolean; arrayNullable: boolean }
    ) => {
      results.push({ path, ...attributes })
    }

    traversalSchema(schema, handler)

    expect(results).toEqual([
      { path: ['users'], object: true, array: true, nullable: false, arrayNullable: false },
      { path: ['users', 'name'], object: false, array: false, nullable: true, arrayNullable: false },
      { path: ['users', 'addresses'], object: true, array: true, nullable: false, arrayNullable: true },
      { path: ['users', 'addresses', 'street'], object: false, array: false, nullable: false, arrayNullable: false }
    ])
  })
})
