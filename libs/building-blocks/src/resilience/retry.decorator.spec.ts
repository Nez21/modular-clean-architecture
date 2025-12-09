import { UseRetry } from './retry.decorator'

function createTestClass(options: Parameters<typeof UseRetry>[0], impl: (...args: unknown[]) => unknown) {
  class TestClass {
    @UseRetry(options)
    async method(...args: unknown[]): Promise<unknown> {
      return await impl.apply(this, args)
    }
  }
  return TestClass
}

describe('UseRetry', () => {
  it('should not retry if method succeeds on first attempt', async () => {
    const TestClass = createTestClass({ count: 3, baseDelay: '100 milliseconds' }, vi.fn().mockResolvedValue('success'))
    const instance = new TestClass()
    const spy = vi.spyOn(instance, 'method')

    await expect(instance.method()).resolves.toBe('success')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should retry the specified number of times on failure and then throw', async () => {
    const error = new Error('fail')
    const impl = vi.fn().mockRejectedValue(error)
    const TestClass = createTestClass({ count: 3, baseDelay: '100 milliseconds' }, impl)
    const instance = new TestClass()

    await expect(instance.method()).rejects.toThrow('fail')
    expect(impl).toHaveBeenCalledTimes(4) // initial + 3 retries
  })

  it('should succeed if a retry attempt resolves', async () => {
    const impl = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok')
    const TestClass = createTestClass({ count: 3, baseDelay: '100 milliseconds' }, impl)
    const instance = new TestClass()

    await expect(instance.method()).resolves.toBe('ok')
    expect(impl).toHaveBeenCalledTimes(3)
  })

  it('should respect custom retry count', async () => {
    const impl = vi.fn().mockRejectedValue(new Error('fail'))
    const TestClass = createTestClass({ count: 1, baseDelay: '100 milliseconds' }, impl)
    const instance = new TestClass()

    await expect(instance.method()).rejects.toThrow('fail')
    expect(impl).toHaveBeenCalledTimes(2)
  })

  it('should not retry if count is 0', async () => {
    const impl = vi.fn().mockRejectedValue(new Error('fail'))
    const TestClass = createTestClass({ count: 0, baseDelay: '100 milliseconds' }, impl)
    const instance = new TestClass()

    await expect(instance.method()).rejects.toThrow('fail')
    expect(impl).toHaveBeenCalledTimes(1)
  })
})
