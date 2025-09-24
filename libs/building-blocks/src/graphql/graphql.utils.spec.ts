import { NestFactory } from '@nestjs/core'
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory, Query } from '@nestjs/graphql'
import { printSchema } from 'graphql'
import z from 'zod'

import { Dto } from '@internal/common'

import { registerInputType, registerOutputType } from './graphql.utils'

describe('GraphQL Transport Utils', () => {
  describe('Type Registration', () => {
    const OrderStatusEnum = z
      .enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .meta({ graphql: { name: 'OrderStatus' } })

    const AddressInputSchema = z
      .object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string()
      })
      .meta({ graphql: { name: 'AddressInput' } })

    const OrderItemInputSchema = z
      .object({
        productId: z.uuid(),
        productName: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        totalPrice: z.number().nonnegative()
      })
      .meta({ graphql: { name: 'OrderItemInput' } })

    const CreateOrderInputSchema = z
      .object({
        customerId: z.uuid(),
        items: z.array(OrderItemInputSchema).min(1),
        shippingAddress: AddressInputSchema,
        notes: z.string().optional(),
        priority: z.number().int().positive().default(1),
        metadata: z
          .array(z.object({ key: z.string(), value: z.string() }).meta({ graphql: { name: 'OrderMetadataInput' } }))
          .optional()
      })
      .meta({ graphql: { name: 'CreateOrderInput' } })

    const AddressOutputSchema = z
      .object({
        id: z.uuid(),
        street: z.string(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
      .meta({ graphql: { name: 'Address' } })

    const OrderItemOutputSchema = z
      .object({
        id: z.uuid(),
        productId: z.uuid(),
        productName: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        totalPrice: z.number().nonnegative(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
      .meta({ graphql: { name: 'OrderItem' } })

    const OrderOutputSchema = z
      .object({
        id: z.uuid(),
        customerId: z.uuid(),
        status: OrderStatusEnum,
        items: z.array(OrderItemOutputSchema).min(1),
        shippingAddress: AddressOutputSchema,
        notes: z.string().nullable(),
        priority: z.number().int().positive(),
        metadata: z.array(
          z.object({ key: z.string(), value: z.string() }).meta({ graphql: { name: 'OrderMetadata' } })
        ),
        createdAt: z.date(),
        updatedAt: z.date()
      })
      .meta({ graphql: { name: 'Order' } })

    class CreateOrderInput extends Dto(CreateOrderInputSchema) {}
    class Order extends Dto(OrderOutputSchema) {}

    it('should generate correct GraphQL schema with all types', async () => {
      registerInputType(CreateOrderInput)
      registerOutputType(Order)

      class MockResolver {
        @Query(() => Order)
        getOrder() {
          return null
        }
      }

      const app = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule)
      const gqlSchemaFactory = app.get(GraphQLSchemaFactory)
      const schema = await gqlSchemaFactory.create([MockResolver], {
        orphanedTypes: [CreateOrderInput]
      })

      const schemaString = printSchema(schema)

      expect(schemaString).toContain('enum OrderStatus')

      expect(schemaString).toContain('input CreateOrderInput')
      expect(schemaString).toContain('input OrderItemInput')
      expect(schemaString).toContain('input AddressInput')

      expect(schemaString).toContain('type Order')
      expect(schemaString).toContain('type OrderItem')
      expect(schemaString).toContain('type Address')

      expect(schemaString).toContain('scalar UUID')
      expect(schemaString).toContain('scalar DateTime')

      expect(schemaString).toContain('customerId: UUID!')
      expect(schemaString).toContain('items: [OrderItemInput!]!')
      expect(schemaString).toContain('shippingAddress: AddressInput!')
      expect(schemaString).toContain('notes: String')
      expect(schemaString).toContain('priority: Int! = 1')
      expect(schemaString).toContain('metadata: [OrderMetadataInput!]')

      expect(schemaString).toContain('id: UUID!')
      expect(schemaString).toContain('status: OrderStatus!')
      expect(schemaString).toContain('items: [OrderItem!]!')
      expect(schemaString).toContain('shippingAddress: Address!')
      expect(schemaString).toContain('notes: String')
      expect(schemaString).toContain('priority: Int!')
      expect(schemaString).toContain('metadata: [OrderMetadata!]!')
      expect(schemaString).toContain('createdAt: DateTime!')
      expect(schemaString).toContain('updatedAt: DateTime!')

      expect(schemaString).toContain('street: String!')
      expect(schemaString).toContain('city: String!')
      expect(schemaString).toContain('state: String!')
      expect(schemaString).toContain('postalCode: String!')
      expect(schemaString).toContain('country: String!')
      expect(schemaString).toContain('productId: UUID!')
      expect(schemaString).toContain('productName: String!')
      expect(schemaString).toContain('quantity: Int!')
      expect(schemaString).toContain('unitPrice: Float!')
      expect(schemaString).toContain('totalPrice: Float!')

      expect(schemaString).toMatchInlineSnapshot(`
        "type Order {
          id: UUID!
          customerId: UUID!
          status: OrderStatus!
          items: [OrderItem!]!
          shippingAddress: Address!
          notes: String
          priority: Int!
          metadata: [OrderMetadata!]!
          createdAt: DateTime!
          updatedAt: DateTime!
        }

        """
        A field whose value is a generic Universally Unique Identifier: https://en.wikipedia.org/wiki/Universally_unique_identifier.
        """
        scalar UUID

        enum OrderStatus {
          PENDING
          CONFIRMED
          SHIPPED
          DELIVERED
          CANCELLED
        }

        """
        A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
        """
        scalar DateTime

        type OrderItem {
          id: UUID!
          productId: UUID!
          productName: String!
          quantity: Int!
          unitPrice: Float!
          totalPrice: Float!
          createdAt: DateTime!
          updatedAt: DateTime!
        }

        type Address {
          id: UUID!
          street: String!
          city: String!
          state: String!
          postalCode: String!
          country: String!
          createdAt: DateTime!
          updatedAt: DateTime!
        }

        type OrderMetadata {
          key: String!
          value: String!
        }

        input CreateOrderInput {
          customerId: UUID!
          items: [OrderItemInput!]!
          shippingAddress: AddressInput!
          notes: String
          priority: Int! = 1
          metadata: [OrderMetadataInput!]
        }

        input OrderItemInput {
          productId: UUID!
          productName: String!
          quantity: Int!
          unitPrice: Float!
          totalPrice: Float!
        }

        input AddressInput {
          street: String!
          city: String!
          state: String!
          postalCode: String!
          country: String!
        }

        input OrderMetadataInput {
          key: String!
          value: String!
        }

        type Query {
          getOrder: Order!
        }"
      `)
    })
  })
})
