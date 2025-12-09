import { z } from 'zod'

import { createMapper } from './mapper.utils'

describe('Mapper Utils', () => {
  it('should map basic properties between schemas', () => {
    const personSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number()
    })

    const userSchema = z.object({
      name: z.string(),
      age: z.number()
    })

    const mapper = createMapper(personSchema, userSchema)
      .forMember(
        (d) => d.name,
        (s) => `${s.firstName} ${s.lastName}`
      )
      .build()

    const result = mapper({
      firstName: 'John',
      lastName: 'Doe',
      age: 30
    })

    expect(result).toEqual({
      name: 'John Doe',
      age: 30
    })
  })

  it('should automatically map using naming conventions', () => {
    const sourceSchema = z.object({
      first_name: z.string(),
      last_name: z.string(),
      user_age: z.number()
    })

    const destSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      userAge: z.number()
    })

    const mapper = createMapper(sourceSchema, destSchema, 'camelCase').build()

    const result = mapper({
      first_name: 'John',
      last_name: 'Doe',
      user_age: 30
    })

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      userAge: 30
    })
  })

  it('should handle nested properties with custom mapping', () => {
    const sourceSchema = z.object({
      user: z.object({
        firstName: z.string(),
        lastName: z.string()
      }),
      details: z.object({
        yearOfBirth: z.number()
      })
    })

    const destSchema = z.object({
      fullName: z.string(),
      age: z.number().optional()
    })

    const currentYear = new Date().getFullYear()

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.fullName,
        (s) => `${s.user.firstName} ${s.user.lastName}`
      )
      .forMember(
        (d) => d.age,
        (s) => currentYear - s.details.yearOfBirth
      )
      .build()

    const result = mapper({
      user: {
        firstName: 'John',
        lastName: 'Doe'
      },
      details: {
        yearOfBirth: 1990
      }
    })

    expect(result).toEqual({
      fullName: 'John Doe',
      age: currentYear - 1990
    })
  })

  it('should handle null and undefined values', () => {
    const sourceSchema = z.object({
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      age: z.number().optional(),
      bio: z.string().optional().nullable()
    })

    const destSchema = z.object({
      name: z.string().nullable(),
      age: z.number().optional(),
      bio: z.string().optional().nullable()
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.name,
        (s) => (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName || s.lastName || null)
      )
      .forMember(
        (d) => d.bio,
        (s) => (s.bio === undefined ? null : s.bio)
      )
      .build()

    const result1 = mapper({
      firstName: null,
      lastName: 'Doe',
      age: 30,
      bio: null
    })

    expect(result1).toEqual({
      name: 'Doe',
      age: 30,
      bio: null
    })

    const result2 = mapper({
      firstName: 'John',
      lastName: null,
      bio: undefined
    })

    expect(result2).toEqual({
      name: 'John',
      bio: null
    })

    const result3 = mapper({
      firstName: null,
      lastName: null,
      age: undefined,
      bio: null
    })

    expect(result3).toEqual({
      name: null,
      bio: null
    })
  })

  it('should handle type transformations', () => {
    const sourceSchema = z.object({
      age: z.string(),
      isActive: z.string(),
      createdAt: z.string()
    })

    const destSchema = z.object({
      age: z.number(),
      isActive: z.boolean(),
      createdAt: z.date()
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.age,
        (s) => Number.parseInt(s.age, 10)
      )
      .forMember(
        (d) => d.isActive,
        (s) => s.isActive === 'true'
      )
      .forMember(
        (d) => d.createdAt,
        (s) => new Date(s.createdAt)
      )
      .build()

    const result = mapper({
      age: '30',
      isActive: 'true',
      createdAt: '2023-01-01T00:00:00Z'
    })

    expect(result.age).toBe(30)
    expect(result.isActive).toBe(true)
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.createdAt.toISOString()).toBe('2023-01-01T00:00:00.000Z')
  })

  it('should handle arrays and complex objects', () => {
    const sourceSchema = z.object({
      items: z.array(
        z.object({
          id: z.string(),
          value: z.number()
        })
      ),
      meta: z.object({
        createdBy: z.string(),
        tags: z.array(z.string())
      })
    })

    const destSchema = z.object({
      items: z.array(
        z.object({
          itemId: z.string(),
          itemValue: z.number()
        })
      ),
      metadata: z.object({
        author: z.string(),
        categories: z.array(z.string())
      })
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forNestedMember(
        (d) => d.items,
        (s) => s.items,
        (m) =>
          m
            .forMember(
              (d) => d.itemValue,
              (s) => s.value
            )
            .forMember(
              (d) => d.itemId,
              (s) => s.id
            )
            .build()
      )
      .forNestedMember(
        (d) => d.metadata,
        (s) => s.meta,
        (m) =>
          m
            .forMember(
              (d) => d.author,
              (s) => s.createdBy
            )
            .forMember(
              (d) => d.categories,
              (s) => s.tags
            )
            .build()
      )
      .build()

    const result = mapper({
      items: [
        { id: '1', value: 100 },
        { id: '2', value: 200 }
      ],
      meta: {
        createdBy: 'John',
        tags: ['important', 'urgent']
      }
    })

    expect(result).toEqual({
      items: [
        { itemId: '1', itemValue: 100 },
        { itemId: '2', itemValue: 200 }
      ],
      metadata: {
        author: 'John',
        categories: ['important', 'urgent']
      }
    })
  })

  it('should throw validation errors for invalid data', () => {
    const sourceSchema = z.object({
      id: z.string(),
      count: z.number()
    })

    const destSchema = z.object({
      id: z.string().min(3),
      count: z.number().positive()
    })

    const mapper = createMapper(sourceSchema, destSchema).build()

    expect(() =>
      mapper({
        id: 'ab',
        count: 5
      })
    ).toThrow()

    expect(() =>
      mapper({
        id: 'valid-id',
        count: -5
      })
    ).toThrow()
  })

  it('should correctly apply multiple name conventions', () => {
    const pascalCaseSchema = z.object({
      FirstName: z.string(),
      LastName: z.string(),
      BirthDate: z.string()
    })

    const camelCaseSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      birthDate: z.string()
    })

    const mapper1 = createMapper(pascalCaseSchema, camelCaseSchema, 'camelCase').build()

    const result1 = mapper1({
      FirstName: 'John',
      LastName: 'Doe',
      BirthDate: '1990-01-01'
    })

    expect(result1).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01'
    })

    const snakeCaseSchema = z.object({
      user_id: z.string(),
      first_name: z.string(),
      last_name: z.string()
    })

    const titleCaseSchema = z.object({
      'User Id': z.string(),
      'First Name': z.string(),
      'Last Name': z.string()
    })

    const mapper2 = createMapper(snakeCaseSchema, titleCaseSchema, 'titleCase').build()

    const result2 = mapper2({
      user_id: '123',
      first_name: 'John',
      last_name: 'Doe'
    })

    expect(result2).toEqual({
      'User Id': '123',
      'First Name': 'John',
      'Last Name': 'Doe'
    })
  })

  it('should handle custom transformation edge cases', () => {
    const sourceSchema = z.object({
      data: z.string().nullable()
    })

    const destSchema = z.object({
      processedData: z.string().nullable(),
      hasData: z.boolean()
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.processedData,
        (s) => {
          if (s.data === '') return ''
          return s.data ? s.data.toUpperCase() : null
        }
      )
      .forMember(
        (d) => d.hasData,
        (s) => s.data !== null && s.data !== ''
      )
      .build()

    const result1 = mapper({ data: 'some data' })
    expect(result1).toEqual({
      processedData: 'SOME DATA',
      hasData: true
    })

    const result2 = mapper({ data: '' })
    expect(result2).toEqual({
      processedData: '',
      hasData: false
    })

    const result3 = mapper({ data: null })
    expect(result3).toEqual({
      processedData: null,
      hasData: false
    })
  })

  it('should preserve unmapped optional fields with defaults', () => {
    const sourceSchema = z.object({
      name: z.string(),
      age: z.number().optional().default(18),
      isActive: z.boolean().optional().default(true)
    })

    const destSchema = z.object({
      name: z.string(),
      age: z.number().optional().default(21),
      isActive: z.boolean().optional().default(false),
      role: z.string().optional().default('user')
    })

    const mapper = createMapper(sourceSchema, destSchema).build()

    const result1 = mapper({
      name: 'John',
      age: 25,
      isActive: false
    })

    expect(result1).toEqual({
      name: 'John',
      age: 25,
      isActive: false,
      role: 'user'
    })

    const result2 = mapper({
      name: 'Jane'
    })

    expect(result2).toEqual({
      name: 'Jane',
      age: 18,
      isActive: true,
      role: 'user'
    })
  })
})
