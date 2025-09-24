import { z } from 'zod'

import { ValueObject, ValueObjectUtils } from './value-object.type'
import type { DeepReadonly } from '../utils'

describe('ValueObject', () => {
  const AddressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string()
  })

  const PersonSchema = z.object({
    name: z.string(),
    age: z.number(),
    addresses: z.array(AddressSchema),
    metadata: z.record(z.string(), z.unknown())
  })

  class Address extends ValueObject(AddressSchema) {
    getFormattedAddress(): string {
      return `${this.street}, ${this.city}, ${this.zipCode}, ${this.country}`
    }
  }

  class Person extends ValueObject(PersonSchema) {
    getPrimaryAddress(): DeepReadonly<Address> | undefined {
      return this.addresses[0] as DeepReadonly<Address> | undefined
    }
  }

  describe('Basic functionality', () => {
    it('should create a value object with valid data', () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(address.street).toBe('123 Main St')
      expect(address.city).toBe('City')
      expect(address.zipCode).toBe('12345')
      expect(address.country).toBe('Country')
    })

    it('should create a value object using ValueObjectUtils', () => {
      const address = ValueObjectUtils.create(Address, {
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(address.street).toBe('123 Main St')
      expect(address.getFormattedAddress()).toBe('123 Main St, City, 12345, Country')
    })

    it('should validate a value object', () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(() => {
        address.validate()
      }).not.toThrow()
    })

    it('should validate a value object asynchronously', async () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      await expect(address.validateAsync()).resolves.not.toThrow()
    })
  })

  describe('Immutability tests', () => {
    it('should be frozen (immutable) after creation', () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(Object.isFrozen(address)).toBe(true)

      expect(() => {
        // @ts-ignore
        address.street = 'New Street'
      }).toThrow()
    })

    it('should deeply freeze nested objects', () => {
      const person = Person.create({
        name: 'John Doe',
        age: 30,
        addresses: [
          {
            street: '123 Main St',
            city: 'City',
            zipCode: '12345',
            country: 'Country'
          }
        ],
        metadata: {
          tags: ['tag1', 'tag2'],
          notes: { important: true }
        }
      })

      expect(Object.isFrozen(person.addresses)).toBe(true)
      expect(Object.isFrozen(person.addresses[0])).toBe(true)
      expect(Object.isFrozen(person.metadata)).toBe(true)

      expect(() => {
        // @ts-ignore
        person.addresses[0].street = 'New Street'
      }).toThrow()

      expect(() => {
        // @ts-ignore
        person.metadata.notes = {}
      }).toThrow()
    })
  })

  describe('Equality tests', () => {
    it('should consider same object instances equal', () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(address.equals(address)).toBe(true)
    })

    it('should consider different objects with same values equal', () => {
      const address1 = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      const address2 = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(address1.equals(address2)).toBe(true)
    })

    it('should consider objects with different values not equal', () => {
      const address1 = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      const address2 = Address.create({
        street: '456 Other St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      expect(address1.equals(address2)).toBe(false)
    })
  })

  describe('Negative tests', () => {
    it('should throw error when creating with invalid data', () => {
      expect(() => {
        // @ts-ignore
        Address.create({})
      }).toThrow()

      expect(() => {
        Address.create({
          // @ts-ignore
          street: 123,
          city: 'City',
          zipCode: '12345',
          country: 'Country'
        })
      }).toThrow()
    })

    it('should throw error when validating invalid object', () => {
      const address = Address.create({
        street: '123 Main St',
        city: 'City',
        zipCode: '12345',
        country: 'Country'
      })

      const corruptedAddress = { ...address, _street: 123 }

      expect(() => {
        ValueObjectUtils.assert(corruptedAddress)
      }).toThrow()
    })
  })
})
