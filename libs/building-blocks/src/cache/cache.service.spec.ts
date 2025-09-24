/* eslint-disable @typescript-eslint/require-await */
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ValkeyContainer, type StartedValkeyContainer } from '@testcontainers/valkey'
import { GlideClient } from '@valkey/valkey-glide'

import ms from 'ms'

import { CacheModuleOptions } from './cache.module.types'
import { CacheService } from './cache.service'
import { CacheKey, ICacheService, ValkeyClient } from './cache.service.interface'

interface TestObject {
  foo: string
  circular?: TestObject
}

interface ComplexObject {
  date: Date
  nested: {
    date: Date
    array: Date[]
  }
  dates: Date[]
}

interface User {
  id: string
  name: string
}

describe('CacheService', () => {
  let service: ICacheService
  let container: StartedValkeyContainer

  beforeAll(async () => {
    container = await new ValkeyContainer().start()
  }, 60 * 1000)

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValkeyClient({
          useFactory: () => {
            const url = new URL(container.getConnectionUrl())

            return GlideClient.createClient({
              addresses: [{ host: url.hostname, port: Number(url.port) }],
              credentials: {
                username: url.username,
                password: url.password
              }
            })
          }
        }),
        CacheModuleOptions({ useValue: { connectionString: container.getConnectionUrl() } }),
        ICacheService({ useClass: CacheService })
      ],
      exports: [ICacheService]
    }).compile()

    service = module.get<ICacheService>(ICacheService)
    vitest.spyOn(CacheService.logger, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await container.exec(['valkey-cli', 'flushall'])
  })

  describe('keyValue operations', () => {
    it('should set and get a value', async () => {
      const value = { foo: 'bar' }
      const key = CacheKey<typeof value>('test-key')

      await service.keyValueSet(key, value)
      const result = await service.keyValueGet(key)

      expect(result).toEqual(value)
    })

    it('should handle Date objects correctly', async () => {
      const date = new Date()
      const key = CacheKey<Date>('date-key')

      await service.keyValueSet(key, date)
      const result = await service.keyValueGet(key)

      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(date.getTime())
    })

    it('should handle complex objects with Date fields', async () => {
      const now = new Date()
      const complexObj: ComplexObject = {
        date: now,
        nested: {
          date: now,
          array: [now, new Date(now.getTime() + 1000)]
        },
        dates: [now, new Date(now.getTime() + 2000)]
      }
      const key = CacheKey<ComplexObject>('complex-date-key')

      await service.keyValueSet(key, complexObj)
      const result = await service.keyValueGet(key)

      expect(result).toBeDefined()
      expect(result?.date).toBeInstanceOf(Date)
      expect(result?.date.getTime()).toBe(now.getTime())
      expect(result?.nested.date).toBeInstanceOf(Date)
      expect(result?.nested.date.getTime()).toBe(now.getTime())
      expect(result?.nested.array[0]).toBeInstanceOf(Date)
      expect(result?.nested.array[1]).toBeInstanceOf(Date)
      expect(result?.dates[0]).toBeInstanceOf(Date)
      expect(result?.dates[1]).toBeInstanceOf(Date)
    })

    it('should return undefined for non-existent key', async () => {
      const key = CacheKey<string>('non-existent')
      const result = await service.keyValueGet(key)
      expect(result).toBeUndefined()
    })

    it('should handle complex objects with circular references', async () => {
      const obj: TestObject = { foo: 'bar' }
      obj.circular = obj
      const key = CacheKey<TestObject>('circular')

      await service.keyValueSet(key, obj)
      const result = await service.keyValueGet(key)

      expect(result).toEqual(obj)
    })

    it('should delete a key', async () => {
      const value = 'test-value'
      const key = CacheKey<string>('to-delete')

      await service.keyValueSet(key, value)
      await service.keyValueDelete(key)
      const result = await service.keyValueGet(key)

      expect(result).toBeUndefined()
    })
  })

  describe('set operations', () => {
    it('should add and check membership in a set', async () => {
      const key = 'test-set'
      const value = 'test-value'

      await service.setAdd(key, [value])
      const hasValue = await service.setHas(key, value)

      expect(hasValue).toBe(true)
    })

    it('should handle multiple values in a set', async () => {
      const key = 'multi-set'
      const values = ['value1', 'value2', 'value3']

      await service.setAdd(key, values)
      for (const value of values) {
        expect(await service.setHas(key, value)).toBe(true)
      }
    })

    it('should remove values from a set', async () => {
      const key = 'remove-set'
      const value = 'to-remove'

      await service.setAdd(key, [value])
      await service.setDelete(key, [value])
      const hasValue = await service.setHas(key, value)

      expect(hasValue).toBe(false)
    })
  })

  describe('expiration', () => {
    it('should set and check expiration', async () => {
      const value = 'test-value'
      const key = 'expiring-key'
      const ttl: ms.StringValue = '1 second'

      await service.keyValueSet(CacheKey<string>(key), value)
      await service.expire(key, ttl)

      const remainingTime = await service.remainingTimeInSeconds(key)

      if (remainingTime.type !== 'remaining') {
        expect(remainingTime.type).toBe('remaining')
        return
      }
      expect(remainingTime.duration).toBeLessThanOrEqual(ms(ttl) / 1000)
    })

    it('should handle expired keys', async () => {
      const value = 'test-value'
      const key = CacheKey<string>('expired-key')
      const ttl: ms.StringValue = '1 second'

      await service.keyValueSet(key, value)
      await service.expire(key, ttl)

      await new Promise((resolve) => setTimeout(resolve, 1100))

      const result = await service.keyValueGet(key)
      expect(result).toBeUndefined()
    })
  })

  describe('tag operations', () => {
    it('should assign and delete by tags', async () => {
      const value = 'test-value'
      const key1 = CacheKey<string>('key1')
      const key2 = CacheKey<string>('key2')
      const tags = ['tag1', 'tag2']

      await service.keyValueSet(key1, value)
      await service.keyValueSet(key2, value)
      await service.assignTags([key1, key2], tags)

      expect(await service.keyValueGet(key1)).toBe(value)
      expect(await service.keyValueGet(key2)).toBe(value)

      await service.deleteByTags('tag1')

      expect(await service.keyValueGet(key1)).toBeUndefined()
      expect(await service.keyValueGet(key2)).toBeUndefined()
    })

    it('should handle non-existent tags gracefully', async () => {
      await expect(service.deleteByTags('non-existent-tag')).resolves.not.toThrow()
    })
  })

  describe('batchCacheAside', () => {
    it('should handle cache hits and misses correctly', async () => {
      const users: User[] = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
        { id: '3', name: 'User 3' }
      ]

      await service.keyValueSet(CacheKey<User>(`user:${users[0].id}`), users[0])
      await service.keyValueSet(CacheKey<User>(`user:${users[1].id}`), users[1])

      const results = await service.batchCacheAside(
        users.map((user) => user.id),
        (id) => CacheKey<User>(`user:${id}`),
        async (ids) => {
          expect(ids).toEqual(['3'])
          return [users[2]]
        },
        { ttl: '1 minute' }
      )

      expect(results).toEqual(users)
    })

    it('should handle partial cache misses with undefined values', async () => {
      const users: (User | undefined)[] = [{ id: '1', name: 'User 1' }, undefined, { id: '3', name: 'User 3' }]

      await service.keyValueSet(CacheKey<User>(`user:${String(users[0]?.id)}`), users[0]!)

      const results = await service.batchCacheAside(
        ['1', '2', '3'],
        (id) => CacheKey<User>(`user:${id}`),
        async (ids) => {
          expect(ids).toEqual(['2', '3'])
          return [undefined, users[2]]
        },
        { ttl: '1 minute' }
      )

      expect(results).toEqual(users)
    })

    it('should handle tags correctly', async () => {
      const users: User[] = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ]

      const results = await service.batchCacheAside(
        users.map((user) => user.id),
        (id) => CacheKey<User>(`user:${id}`),
        async (ids) => users.filter((user) => ids.includes(user.id)),
        {
          ttl: '1 minute',
          tags: ['users']
        }
      )

      expect(results).toEqual(users)

      await service.deleteByTags('users')
      expect(await service.keyValueGet(CacheKey<User>(`user:${users[0].id}`))).toBeUndefined()
      expect(await service.keyValueGet(CacheKey<User>(`user:${users[1].id}`))).toBeUndefined()
    })

    it('should handle empty input array', async () => {
      const results = await service.batchCacheAside(
        [],
        () => CacheKey<User>('user:1'),
        async () => [],
        { ttl: '1 minute' }
      )

      expect(results).toEqual([])
    })

    it('should handle resolver errors gracefully', async () => {
      const error = new Error('Test error')

      await expect(
        service.batchCacheAside(
          ['1'],
          (id) => CacheKey<User>(`user:${id}`),
          async () => {
            throw error
          },
          { ttl: '1 minute' }
        )
      ).rejects.toThrow(error)
    })
  })
})
