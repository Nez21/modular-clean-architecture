import { z } from 'zod'

import { Entity, EntityUtils } from './entity.type'
import { deserialize } from '../utils'

describe('Entity Type', () => {
  const testEntitySchema = z.object({
    id: z.uuid(),
    name: z.string().min(2).max(64),
    age: z.number().int().min(0),
    active: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    createdAt: z.date().default(() => new Date())
  })

  class TestEntity extends Entity(testEntitySchema, ['id']) {
    setAge(age: number) {
      this.$value.age = age
    }
  }

  let validEntityData: z.input<typeof testEntitySchema>

  beforeEach(() => {
    validEntityData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Entity',
      age: 25,
      active: true,
      tags: ['test', 'entity'],
      createdAt: new Date()
    }
  })

  describe('Entity Creation', () => {
    it('should create a valid entity', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)

      expect(entity).toBeInstanceOf(TestEntity)
      expect(entity.id).toBe(validEntityData.id)
      expect(entity.name).toBe(validEntityData.name)
      expect(entity.age).toBe(validEntityData.age)
    })

    it('should apply default values when not provided', () => {
      const partialData = {
        id: validEntityData.id,
        name: validEntityData.name,
        age: validEntityData.age,
        active: true,
        tags: [],
        createdAt: new Date()
      }

      const entity = EntityUtils.create(TestEntity, partialData)

      expect(entity.active).toBe(true)
      expect(Array.isArray(entity.tags)).toBe(true)
      expect(entity.createdAt).toBeInstanceOf(Date)
    })

    it('should throw error when creating entity with invalid data', () => {
      const invalidData = {
        ...validEntityData,
        name: 'A'
      }

      expect(() => EntityUtils.create(TestEntity, invalidData)).toThrow()
    })
  })

  describe('Entity Validation', () => {
    it('should validate a valid entity', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)
      expect(entity.validate().isOk()).toBe(true)
    })

    it('should throw error when validating an invalid entity', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)

      entity.setAge(-1)

      expect(entity.validate().isErr()).toBe(true)
    })
  })

  describe('Entity Equality', () => {
    it('should consider entities with same key attributes equal', () => {
      const entity1 = EntityUtils.create(TestEntity, validEntityData)
      const entity2 = EntityUtils.create(TestEntity, {
        ...validEntityData,
        name: 'Different Name',
        age: 30
      })

      expect(entity1.equals(entity2)).toBe(true)
    })

    it('should consider entities with different key attributes not equal', () => {
      const entity1 = EntityUtils.create(TestEntity, validEntityData)
      const entity2 = EntityUtils.create(TestEntity, {
        ...validEntityData,
        id: '123e4567-e89b-12d3-a456-426614174001'
      })

      expect(entity1.equals(entity2)).toBe(false)
    })
  })

  describe('Entity Serialization', () => {
    it('should serialize entity to JSON', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)
      const json = entity.toJSON()

      expect(deserialize(json)).toEqual(validEntityData)
    })
  })

  describe('EntityUtils', () => {
    it('should get schema from entity class', () => {
      const schema = EntityUtils.getSchema(TestEntity)
      expect(schema).toBeDefined()
    })

    it('should get key attributes from entity class', () => {
      const keyAttributes = EntityUtils.getKeyAttributes(TestEntity)
      expect(keyAttributes).toEqual(['id'])
    })

    it('should get type ID from entity class', () => {
      const typeId = EntityUtils.getTypeId(TestEntity)
      expect(typeof typeId).toBe('string')
      expect(typeId.length).toBeGreaterThan(0)
    })

    it('should assert valid entity instance', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)
      expect(() => {
        EntityUtils.assert(entity)
      }).not.toThrow()
    })

    it('should throw when asserting on a plain object', () => {
      expect(() => {
        EntityUtils.assert(validEntityData)
      }).toThrow('Instance is not constructed with Entity')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty key attributes array', () => {
      expect(() => {
        // @ts-expect-error
        Entity(testEntitySchema, [])
      }).toThrowError()
    })

    it('should handle very complex schema', () => {
      const complexSchema = z.object({
        id: z.uuid(),
        metadata: z.object({
          created: z.date(),
          nested: z.object({
            value: z.number(),
            items: z.array(z.string())
          })
        }),
        status: z.enum(['active', 'inactive', 'pending']),
        flags: z.record(z.string(), z.boolean())
      })

      type ComplexType = z.output<typeof complexSchema>

      class TestComplexEntity extends Entity(complexSchema, ['id']) {}

      const complexData: ComplexType = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          created: new Date(),
          nested: {
            value: 42,
            items: ['complex', 'test']
          }
        },
        status: 'active',
        flags: {
          isTest: true,
          isComplex: true
        }
      }

      const entity = EntityUtils.create(TestComplexEntity, complexData)
      expect(entity).toBeInstanceOf(TestComplexEntity)
      expect(entity.validate().isOk()).toBe(true)
    })
  })

  describe('Negative Tests', () => {
    it('should fail when creating entity with missing required properties', () => {
      const incompleteData = { age: 25 }
      // @ts-expect-error
      expect(() => EntityUtils.create(TestEntity, incompleteData)).toThrow()
    })

    it('should fail when validating after corrupting the entity', () => {
      const entity = EntityUtils.create(TestEntity, validEntityData)

      Object.defineProperty(entity, 'age', {
        value: 'not a number'
      })

      expect(entity.validate().isErr()).toBe(true)
    })

    it('should fail when using EntityUtils.assert with non-entity objects', () => {
      const regularObject = { ...validEntityData }
      expect(() => {
        EntityUtils.assert(regularObject)
      }).toThrow()

      const objectWithMethods = {
        ...validEntityData,
        validate: () => {},
        validateAsync: async () => {},
        equals: () => true
      }
      expect(() => {
        EntityUtils.assert(objectWithMethods)
      }).toThrow()
    })

    it('should reject entity with invalid schema data types', () => {
      const invalidTypeData = {
        ...validEntityData,
        age: 'twenty five'
      }

      // @ts-expect-error
      expect(() => EntityUtils.create(TestEntity, invalidTypeData)).toThrow()
    })
  })
})
