// import { Injectable } from '@nestjs/common'
// import type { TestingModule } from '@nestjs/testing'
// import { Test } from '@nestjs/testing'
// import { ValkeyContainer, type StartedValkeyContainer } from '@testcontainers/valkey'
// import { Duration } from 'luxon'

// import { CacheModule } from '../cache'

// import { UseIdempotent } from './idempotent.decorator'

// @Injectable()
// class TestClass {
//   handle = vi.fn()
//   @UseIdempotent()
//   async method(input: string) {
//     return this.handle(input) as unknown
//   }
// }

// describe('UseIdempotent', () => {
//   let container: StartedValkeyContainer
//   let testClass: TestClass
//   beforeAll(async () => {
//     container = await new ValkeyContainer().start()
//   }, 60 * 1000)

//   afterAll(async () => {
//     await container.stop()
//   })

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       imports: [CacheModule.forRoot({ connectionString: container.getConnectionUrl() })],
//       providers: [TestClass]
//     }).compile()

//     testClass = module.get<TestClass>(TestClass)
//   })

//   afterEach(async () => {
//     await container.exec(['valkey-cli', 'flushall'])
//     vi.clearAllMocks()
//   })

//   describe('Standard cases', () => {
//     it('should handle first request successfully', async () => {
//       testClass.handle.mockReturnValueOnce('test-result')
//       const result = await testClass.method('test-value')

//       expect(result).toBe('test-result')
//       expect(testClass.handle).toHaveBeenCalledWith('test-value')
//     })

//     it('should return cached result for duplicate request', async () => {
//       testClass.handle.mockReturnValueOnce('test-result')

//       const result = await testClass.method('test-value')

//       expect(result).toBe('test-result')
//       expect(testClass.handle).toHaveBeenCalledTimes(1)
//     })

//     it('should handle concurrent requests correctly', async () => {
//       testClass.handle.mockReturnValueOnce('test-result')

//       const results = await Promise.all(Array.from({ length: 50 }, () => testClass.method('test-value')))

//       expect(results.every((r) => r === 'test-result')).toBe(true)
//       expect(testClass.handle).toHaveBeenCalledTimes(1)
//     })

//     it('should respect custom timeout option', async () => {
//       const customCacheTTL = Duration.fromObject({ second: 1 })

//       @Injectable()
//       class CustomTestClass {
//         handle = vi.fn()
//         @UseIdempotent({ cacheTTL: customCacheTTL })
//         async method(input: string) {
//           return this.handle(input) as unknown
//         }
//       }

//       const customModule: TestingModule = await Test.createTestingModule({
//         imports: [CacheModule.forRoot({ connectionString: container.getConnectionUrl() })],
//         providers: [CustomTestClass]
//       }).compile()
//       const customtestClass = customModule.get<CustomTestClass>(CustomTestClass)
//       customtestClass.handle.mockReturnValueOnce('first-result').mockReturnValueOnce('second-result')

//       await customtestClass.method('test-value')
//       await new Promise((resolve) => setTimeout(resolve, 1200))
//       const result = await customtestClass.method('test-value')

//       expect(result).toBe('second-result')
//       expect(customtestClass.handle).toHaveBeenCalledTimes(2)
//     })
//   })
// })
