import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { type StartedValkeyContainer, ValkeyContainer } from '@testcontainers/valkey'

import { IDistributedLockService } from './distributed-lock.interface'
import { DistributedLockModule } from './distributed-lock.module'
import { UseMutex } from './mutex.decorator'
import { CacheModule } from '../cache'

describe('UseMutex Decorator', () => {
  let distributedLockService: IDistributedLockService
  let container: StartedValkeyContainer

  beforeAll(async () => {
    container = await new ValkeyContainer().start()
  }, 60 * 1000)

  afterAll(async () => {
    await container.stop()
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.forRoot({ connectionString: container.getConnectionUrl() }),
        DistributedLockModule.forRoot()
      ]
    }).compile()

    distributedLockService = module.get<IDistributedLockService>(IDistributedLockService)
  })

  afterEach(async () => {
    await container.exec(['valkey-cli', 'flushall'])
  })

  describe('Successful lock acquisition and method execution', () => {
    it('should acquire lock and execute method successfully', async () => {
      class TestService {
        constructor(public distributedLockService: IDistributedLockService) {}

        @UseMutex((id: string) => `user-${id}`)
        async updateUser(id: string, data: { name: string }): Promise<string> {
          return `Updated user ${id} with ${data.name}`
        }
      }

      const service = new TestService(distributedLockService)
      const result = await service.updateUser('123', { name: 'John Doe' })

      expect(result).toBe('Updated user 123 with John Doe')
    })

    it('should handle methods with multiple parameters', async () => {
      class TestService {
        constructor(public distributedLockService: IDistributedLockService) {}

        @UseMutex((userId: string, resourceId: string) => `user-${userId}-resource-${resourceId}`)
        async updateResource(userId: string, resourceId: string, _data: any): Promise<string> {
          return `Updated resource ${resourceId} for user ${userId}`
        }
      }

      const service = new TestService(distributedLockService)
      const result = await service.updateResource('123', '456', { value: 'test' })

      expect(result).toBe('Updated resource 456 for user 123')
    })

    it('should handle methods with no additional parameters', async () => {
      class TestService {
        constructor(public distributedLockService: IDistributedLockService) {}

        @UseMutex(() => 'global-operation')
        async performGlobalOperation(): Promise<string> {
          return 'Global operation completed'
        }
      }

      const service = new TestService(distributedLockService)
      const result = await service.performGlobalOperation()

      expect(result).toBe('Global operation completed')
    })
  })
})
