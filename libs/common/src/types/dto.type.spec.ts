import { z } from 'zod'

import { Dto } from './dto.type'

describe('Dto Type', () => {
  const testDtoSchema = z.object({
    id: z.uuid(),
    name: z.string().min(2).max(64),
    age: z.number().int().min(0),
    active: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    createdAt: z.date().default(() => new Date())
  })

  class TestDto extends Dto(testDtoSchema) {}

  let validDtoData: z.input<typeof testDtoSchema>

  beforeEach(() => {
    validDtoData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Dto',
      age: 25,
      active: true,
      tags: ['test', 'dto'],
      createdAt: new Date()
    }
  })

  describe('Dto Creation', () => {
    it('should create a valid Dto', () => {
      const dto = TestDto.create(validDtoData)

      expect(dto).toBeInstanceOf(TestDto)
      expect(dto.id).toBe(validDtoData.id)
      expect(dto.name).toBe(validDtoData.name)
      expect(dto.age).toBe(validDtoData.age)
    })

    it('should apply default values when not provided', () => {
      const partialData = {
        id: validDtoData.id,
        name: validDtoData.name,
        age: validDtoData.age
      }

      const dto = TestDto.create(partialData)

      expect(dto.active).toBe(true)
      expect(dto.tags).toEqual([])
      expect(dto.createdAt).toBeInstanceOf(Date)
    })

    it('should throw error when creating with invalid data', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: 'T',
        age: -1,
        active: 'not-a-boolean',
        tags: [123],
        createdAt: 'not-a-date'
      }

      // @ts-expect-error
      expect(() => TestDto.create(invalidData)).toThrow()
    })
  })

  describe('Dto Validation', () => {
    it('should validate valid Dto', () => {
      const dto = TestDto.create(validDtoData)

      expect(dto.validate().isOk()).toBe(true)
    })

    it('should throw error when validating invalid Dto', () => {
      const dto = TestDto.create(validDtoData)
      dto.name = 'T'

      expect(dto.validate().isErr()).toBe(true)
    })
  })

  describe('Dto Static Properties', () => {
    it('should have a valid typeId', () => {
      expect(TestDto.$typeId).toBeDefined()
      expect(typeof TestDto.$typeId).toBe('string')
      expect(TestDto.$typeId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should expose the schema', () => {
      expect(TestDto.$schema).toBeDefined()
      expect(TestDto.$schema).toBe(testDtoSchema)
    })
  })

  describe('Dto Type Safety', () => {
    it('should maintain type safety with complex schemas', () => {
      const complexSchema = z.object({
        id: z.uuid(),
        nested: z.object({
          value: z.number(),
          array: z.array(
            z.object({
              name: z.string(),
              count: z.number()
            })
          )
        }),
        optional: z.string().optional()
      })

      class ComplexDto extends Dto(complexSchema) {}

      const complexData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nested: {
          value: 42,
          array: [{ name: 'test', count: 1 }]
        }
      }

      const dto = ComplexDto.create(complexData)

      expect(dto).toBeInstanceOf(ComplexDto)
      expect(dto.nested.value).toBe(42)
      expect(dto.nested.array[0].name).toBe('test')
    })
  })
})
