import { bench } from 'vitest'
import { z } from 'zod'

import { createMapper } from './mapper.utils'

describe('Mapper Utils Benchmarks', () => {
  describe('simple mapper', () => {
    const sourceSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
      email: z.string()
    })

    const destSchema = z.object({
      fullName: z.string(),
      age: z.number(),
      email: z.string()
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.fullName,
        (s) => `${s.firstName} ${s.lastName}`
      )
      .build()

    const sourceData = {
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      email: 'john.doe@example.com'
    }

    bench('mapping', () => {
      mapper(sourceData)
    })

    bench('raw mapping', () => {
      const source = sourceSchema.parse(sourceData)

      const destData = {
        fullName: `${source.firstName} ${source.lastName}`,
        age: source.age,
        email: source.email
      }

      destSchema.parse(destData)
    })
  })

  describe('complex mapper', () => {
    const sourceSchema = z.object({
      user: z.object({
        firstName: z.string(),
        lastName: z.string(),
        contact: z.object({
          email: z.string(),
          phone: z.string()
        }),
        address: z.object({
          street: z.string(),
          city: z.string(),
          zip: z.string()
        }),
        preferences: z.array(z.string())
      }),
      metadata: z.record(z.string(), z.unknown())
    })

    const destSchema = z.object({
      name: z.string(),
      contactInfo: z.object({
        emailAddress: z.string(),
        phoneNumber: z.string(),
        location: z.object({
          fullAddress: z.string(),
          postalCode: z.string()
        })
      }),
      settings: z.array(z.string()),
      additionalData: z.record(z.string(), z.unknown())
    })

    const mapper = createMapper(sourceSchema, destSchema)
      .forMember(
        (d) => d.name,
        (s) => `${s.user.firstName} ${s.user.lastName}`
      )
      .forNestedMember(
        (d) => d.contactInfo,
        (s) => s.user,
        (m) =>
          m
            .forMember(
              (d) => d.emailAddress,
              (s) => s.contact.email
            )
            .forMember(
              (d) => d.phoneNumber,
              (s) => s.contact.phone
            )
            .forNestedMember(
              (d) => d.location,
              (s) => s.address,
              (m) =>
                m
                  .forMember(
                    (d) => d.fullAddress,
                    (s) => `${s.street}, ${s.city}`
                  )
                  .forMember(
                    (d) => d.postalCode,
                    (s) => s.zip
                  )
                  .build()
            )
            .build()
      )
      .forMember(
        (d) => d.settings,
        (s) => s.user.preferences
      )
      .forMember(
        (d) => d.additionalData,
        (s) => s.metadata
      )
      .build()

    const sourceData = {
      user: {
        firstName: 'John',
        lastName: 'Doe',
        contact: {
          email: 'john.doe@example.com',
          phone: '123-456-7890'
        },
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zip: '12345'
        },
        preferences: ['dark-mode', 'notifications-on', 'auto-save']
      },
      metadata: {
        createdAt: '2023-01-01',
        lastUpdated: '2023-06-15',
        version: '1.0.0'
      }
    }

    bench('mapping', () => {
      mapper(sourceData)
    })

    bench('raw mapping', () => {
      const source = sourceSchema.parse(sourceData)

      const destData = {
        name: `${source.user.firstName} ${source.user.lastName}`,
        contactInfo: {
          emailAddress: source.user.contact.email,
          phoneNumber: source.user.contact.phone,
          location: {
            fullAddress: `${source.user.address.street}, ${source.user.address.city}`,
            postalCode: source.user.address.zip
          }
        },
        settings: source.user.preferences,
        additionalData: source.metadata
      }

      destSchema.parse(destData)
    })
  })
})
