import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { type StartedValkeyContainer, ValkeyContainer } from '@testcontainers/valkey'
import { GlideClient, TimeUnit } from '@valkey/valkey-glide'

import { AcquireOptions, IDistributedLockService } from './distributed-lock.interface'
import { DistributedLockModuleOptions } from './distributed-lock.module.types'
import { DistributedLockService } from './distributed-lock.service'
import { ValkeyClient } from '../cache/cache.service.interface'

describe('DistributedLockService', () => {
  let service: IDistributedLockService
  let container: StartedValkeyContainer
  let valkeyClient: ValkeyClient

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
        DistributedLockModuleOptions({
          useValue: {
            ttl: '30 seconds',
            retry: {
              count: 3,
              delay: '100ms',
              jitter: '50ms'
            },
            prefix: 'test-locks'
          }
        }),
        {
          provide: IDistributedLockService,
          useClass: DistributedLockService
        }
      ],
      exports: [IDistributedLockService]
    }).compile()

    service = module.get<IDistributedLockService>(IDistributedLockService)
    valkeyClient = module.get<ValkeyClient>(ValkeyClient)
  })

  afterEach(async () => {
    await container.exec(['valkey-cli', 'flushall'])
  })

  describe('acquire', () => {
    it('should successfully acquire a lock and execute action', async () => {
      const keys = ['test-key']
      const action = vitest.fn().mockResolvedValue('test-result')

      const result = await service.acquire(keys, action)

      expect(result).toBe('test-result')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should acquire multiple locks and execute action', async () => {
      const keys = ['key1', 'key2', 'key3']
      const action = vitest.fn().mockResolvedValue('multi-lock-result')

      const result = await service.acquire(keys, action)

      expect(result).toBe('multi-lock-result')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should release locks after action completion', async () => {
      const keys = ['test-key']
      const action = vitest.fn().mockResolvedValue('test-result')

      await service.acquire(keys, action)

      const secondResult = await service.tryAcquire(keys)
      expect(secondResult).toBe(true)
    })

    it('should release locks even if action throws an error', async () => {
      const keys = ['test-key']
      const error = new Error('Action failed')
      const action = vitest.fn().mockRejectedValue(error)

      await expect(service.acquire(keys, action)).rejects.toThrow(error)

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })

    it('should use custom options when provided', async () => {
      const keys = ['test-key']
      const action = vitest.fn().mockResolvedValue('test-result')
      const customOptions: DeepPartial<AcquireOptions> = {
        ttl: '1 second',
        retry: {
          count: 1,
          delay: '50ms',
          jitter: '10ms'
        }
      }

      const result = await service.acquire(keys, action, customOptions)

      expect(result).toBe('test-result')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent lock acquisition attempts', async () => {
      const keys = ['concurrent-key']
      const action1 = vitest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return 'result1'
      })
      const action2 = vitest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'result2'
      })

      const [result1, result2] = await Promise.allSettled([
        service.acquire(keys, action1),
        service.acquire(keys, action2)
      ])

      const results = [result1, result2]
      const successful = results.filter((r) => r.status === 'fulfilled')
      const failed = results.filter((r) => r.status === 'rejected')

      expect(successful.length + failed.length).toBe(2)
      expect(successful.length).toBeGreaterThanOrEqual(1)
    })

    it('should retry lock acquisition when initially failing', async () => {
      const keys = ['retry-key']
      const action = vitest.fn().mockResolvedValue('retry-result')

      const lockKey = 'test-locks:lock:retry-key'
      await valkeyClient.set(lockKey, 'existing-lock', { expiry: { type: TimeUnit.Seconds, count: 1 } })

      await new Promise((resolve) => setTimeout(resolve, 1100))

      const result = await service.acquire(keys, action, {
        retry: {
          count: 5,
          delay: '200ms',
          jitter: '50ms'
        }
      })

      expect(result).toBe('retry-result')
      expect(action).toHaveBeenCalledTimes(1)
    })
  })

  describe('tryAcquire', () => {
    it('should return true when lock is successfully acquired', async () => {
      const keys = ['test-key']

      const result = await service.tryAcquire(keys)

      expect(result).toBe(true)
    })

    it('should return true for multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3']

      const result = await service.tryAcquire(keys)

      expect(result).toBe(true)
    })

    it('should return false when lock already exists', async () => {
      const keys = ['test-key']

      await service.tryAcquire(keys)

      const result = await service.tryAcquire(keys)

      expect(result).toBe(false)
    })

    it('should return false when any of the multiple keys is already locked', async () => {
      const keys1 = ['key1', 'key2']
      const keys2 = ['key2', 'key3']

      await service.tryAcquire(keys1)

      const result = await service.tryAcquire(keys2)

      expect(result).toBe(false)
    })

    it('should use custom options when provided', async () => {
      const keys = ['test-key']
      const customOptions: DeepPartial<AcquireOptions> = {
        ttl: '1 second',
        retry: {
          count: 2,
          delay: '50ms',
          jitter: '10ms'
        }
      }

      const result = await service.tryAcquire(keys, customOptions)

      expect(result).toBe(true)
    })

    it('should not release locks after successful tryAcquire', async () => {
      const keys = ['test-key']

      const result = await service.tryAcquire(keys)

      expect(result).toBe(true)

      const secondResult = await service.tryAcquire(keys)
      expect(secondResult).toBe(false)
    })
  })

  describe('release', () => {
    it('should release a single lock', async () => {
      const keys = ['test-key']

      await service.tryAcquire(keys)

      await service.release(keys)

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })

    it('should release multiple locks', async () => {
      const keys = ['key1', 'key2', 'key3']

      await service.tryAcquire(keys)

      await service.release(keys)

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })

    it('should handle releasing empty array of keys', async () => {
      const keys: string[] = []

      await expect(service.release(keys)).resolves.not.toThrow()
    })

    it('should throw error when lock values do not match', async () => {
      const keys = ['test-key']
      const lockKey = 'test-locks:lock:test-key'

      await valkeyClient.set(lockKey, 'different-value')

      await expect(service.release(keys)).rejects.toThrow('Lock values do not match')
    })
  })

  describe('lock expiration', () => {
    it('should respect TTL for locks', async () => {
      const keys = ['ttl-key']
      const shortTtl: DeepPartial<AcquireOptions> = {
        ttl: '1 second'
      }

      await service.tryAcquire(keys, shortTtl)

      await new Promise((resolve) => setTimeout(resolve, 1100))

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })

    it('should use custom TTL when provided', async () => {
      const keys = ['custom-ttl-key']
      const customTtl: DeepPartial<AcquireOptions> = {
        ttl: '500ms'
      }

      await service.tryAcquire(keys, customTtl)

      await new Promise((resolve) => setTimeout(resolve, 600))

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle Valkey connection errors gracefully', async () => {
      const keys = ['test-key']
      const action = vitest.fn().mockResolvedValue('test-result')

      const originalSet = valkeyClient.set
      const originalMget = valkeyClient.mget
      vitest.spyOn(valkeyClient, 'set').mockRejectedValue(new Error('Connection failed'))
      vitest.spyOn(valkeyClient, 'mget').mockResolvedValue([])

      await expect(service.acquire(keys, action)).rejects.toThrow('Connection failed')

      valkeyClient.set = originalSet
      valkeyClient.mget = originalMget
    })

    it('should handle partial lock acquisition failures', async () => {
      const keys = ['key1', 'key2', 'key3']
      const action = vitest.fn().mockResolvedValue('test-result')

      const lockKey = 'test-locks:lock:key2'
      await valkeyClient.set(lockKey, 'existing-lock', { expiry: { type: TimeUnit.Seconds, count: 10 } })

      await expect(service.acquire(keys, action)).rejects.toThrow()

      const key1Result = await service.tryAcquire(['key1'])
      const key3Result = await service.tryAcquire(['key3'])
      expect(key1Result).toBe(true)
      expect(key3Result).toBe(true)
    })

    it('should handle action execution errors', async () => {
      const keys = ['test-key']
      const error = new Error('Action execution failed')
      const action = vitest.fn().mockRejectedValue(error)

      await expect(service.acquire(keys, action)).rejects.toThrow(error)

      const result = await service.tryAcquire(keys)
      expect(result).toBe(true)
    })
  })

  describe('concurrent scenarios', () => {
    it('should handle multiple concurrent acquire operations on different keys', async () => {
      const operations = [
        service.acquire(['key1'], vitest.fn().mockResolvedValue('result1')),
        service.acquire(['key2'], vitest.fn().mockResolvedValue('result2')),
        service.acquire(['key3'], vitest.fn().mockResolvedValue('result3'))
      ]

      const results = await Promise.all(operations)

      expect(results).toEqual(['result1', 'result2', 'result3'])
    })

    it('should handle mixed tryAcquire and acquire operations', async () => {
      const keys = ['mixed-key']

      const tryResult = await service.tryAcquire(keys)
      expect(tryResult).toBe(true)

      const acquirePromise = service.acquire(keys, vitest.fn().mockResolvedValue('acquire-result'))

      setTimeout(async () => {
        await service.release(keys)
      }, 100)

      const result = await acquirePromise
      expect(result).toBe('acquire-result')
    })

    it('should handle rapid acquire-release cycles', async () => {
      const keys = ['rapid-key']
      const iterations = 10

      for (let i = 0; i < iterations; i++) {
        const result = await service.acquire(keys, vitest.fn().mockResolvedValue(`result-${i}`))
        expect(result).toBe(`result-${i}`)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty keys array', async () => {
      const keys: string[] = []
      const action = vitest.fn().mockResolvedValue('empty-result')

      const result = await service.acquire(keys, action)

      expect(result).toBe('empty-result')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should handle duplicate keys in array', async () => {
      const keys = ['duplicate-key', 'duplicate-key', 'duplicate-key']
      const action = vitest.fn().mockResolvedValue('duplicate-result')

      await expect(service.acquire(keys, action)).resolves.toBe('duplicate-result')
    })

    it('should handle special characters in keys', async () => {
      const keys = ['key:with:colons', 'key-with-dashes', 'key_with_underscores', 'key.with.dots']
      const action = vitest.fn().mockResolvedValue('special-chars-result')

      const result = await service.acquire(keys, action)

      expect(result).toBe('special-chars-result')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000)
      const keys = [longKey]
      const action = vitest.fn().mockResolvedValue('long-key-result')

      const result = await service.acquire(keys, action)

      expect(result).toBe('long-key-result')
      expect(action).toHaveBeenCalledTimes(1)
    })
  })
})
