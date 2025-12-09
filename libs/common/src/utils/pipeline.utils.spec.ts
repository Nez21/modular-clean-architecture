import { type Observable, of, throwError } from 'rxjs'

import { PipelineFunction, pipelineMetadataKey, wrapPipeline } from './pipeline.utils'

describe('wrapPipeline', () => {
  it('should wrap a method and execute a single pipeline function before it', async () => {
    const pipelineFn = vi.fn<PipelineFunction>((args, next): Observable<unknown> => {
      expect(args).toEqual(['testArg'])
      return next.handle()
    })
    const originalMethod = vi.fn(async (arg: string): Promise<string> => {
      expect(arg).toBe('testArg')
      return `original-${arg}`
    })

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(arg: string): Promise<string> {
        return await originalMethod(arg)
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethod('testArg')

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledTimes(1)
    expect(result).toBe('original-testArg')
  })

  it('should wrap a method and execute multiple pipeline functions in LIFO order', async () => {
    const order: string[] = []
    const pipelineFn1 = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => {
      order.push('pipe1')
      return next.handle()
    })
    const pipelineFn2 = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => {
      order.push('pipe2')
      return next.handle()
    })
    const originalMethod = vi.fn(async (): Promise<string> => {
      order.push('original')
      return 'originalResult'
    })

    class TestClass {
      @wrapPipeline(pipelineFn2)
      @wrapPipeline(pipelineFn1)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethod()

    expect(pipelineFn1).toHaveBeenCalledTimes(1)
    expect(pipelineFn2).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['pipe2', 'pipe1', 'original'])
    expect(result).toBe('originalResult')
  })

  it('should pass arguments correctly through the pipeline', async () => {
    const pipelineFn = vi.fn<PipelineFunction>((args, next): Observable<unknown> => {
      expect(args).toEqual([1, 'two', true])
      return next.handle()
    })
    const originalMethod = vi.fn(async (a: number, b: string, c: boolean): Promise<string> => {
      expect(a).toBe(1)
      expect(b).toBe('two')
      expect(c).toBe(true)
      return `original-${String(a)}-${b}-${String(c)}`
    })

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(a: number, b: string, c: boolean): Promise<string> {
        return await originalMethod(a, b, c)
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethod(1, 'two', true)

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledWith(1, 'two', true)
    expect(result).toBe('original-1-two-true')
  })

  it('should handle pipeline function returning an observable (short-circuiting)', async () => {
    const pipelineFn = vi.fn<PipelineFunction>((): Observable<unknown> => of('pipeValue'))
    const originalMethod = vi.fn(async (): Promise<string> => 'originalResult')

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethod()

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).not.toHaveBeenCalled()
    expect(result).toBe('pipeValue')
  })

  it('should handle pipeline function throwing an error synchronously', async () => {
    const pipelineError = new Error('Pipeline error')
    const pipelineFn = vi.fn<PipelineFunction>((): Observable<unknown> => {
      throw pipelineError
    })
    const originalMethod = vi.fn(async (): Promise<string> => 'originalResult')

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    await expect(instance.testMethod()).rejects.toThrow(pipelineError)

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).not.toHaveBeenCalled()
  })

  it('should handle pipeline function returning an error observable', async () => {
    const pipelineError = new Error('Pipeline observable error')
    const pipelineFn = vi.fn<PipelineFunction>((): Observable<unknown> => throwError(() => pipelineError))
    const originalMethod = vi.fn(async (): Promise<string> => 'originalResult')

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    await expect(instance.testMethod()).rejects.toThrow(pipelineError)

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).not.toHaveBeenCalled()
  })

  it('should handle original method throwing an error', async () => {
    const originalError = new Error('Original method error')
    const pipelineFn = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => next.handle())
    const originalMethod = vi.fn(async (): Promise<never> => {
      throw originalError
    })

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    await expect(instance.testMethod()).rejects.toThrow(originalError)

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledTimes(1)
  })

  it('should correctly store metadata when multiple decorators are applied', () => {
    const pipeFn1 = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => next.handle())
    const pipeFn2 = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => next.handle())

    class TestClassMultiApply {
      @wrapPipeline(pipeFn2)
      @wrapPipeline(pipeFn1)
      async testMethod(arg: string): Promise<string> {
        return `original-${arg}`
      }
    }

    const metadata = Reflect.getMetadata(
      pipelineMetadataKey,
      TestClassMultiApply.prototype,
      'testMethod'
    ) as PipelineFunction[]
    expect(metadata).toBeInstanceOf(Array)
    expect(metadata).toHaveLength(2)
    expect(metadata[0]).toBe(pipeFn1)
    expect(metadata[1]).toBe(pipeFn2)
  })

  it('should handle methods with no arguments', async () => {
    const pipelineFn = vi.fn<PipelineFunction>((args, next): Observable<unknown> => {
      expect(args).toEqual([])
      return next.handle()
    })
    const originalMethod = vi.fn(async (): Promise<string> => 'noArgsResult')

    class TestClass {
      @wrapPipeline(pipelineFn)
      async testMethod(): Promise<string> {
        return await originalMethod()
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethod()

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(originalMethod).toHaveBeenCalledTimes(1)
    expect(result).toBe('noArgsResult')
  })

  it('should maintain the correct "this" context', async () => {
    const pipelineFn = vi.fn<PipelineFunction>((_args, next): Observable<unknown> => next.handle())

    class TestClass {
      internalValue = 'internalContextValue'

      @wrapPipeline(pipelineFn)
      async testMethodDirect(arg: string): Promise<string> {
        expect(this).toBeInstanceOf(TestClass)
        expect(this.internalValue).toBe('internalContextValue')
        return `original-${arg}-${this.internalValue}`
      }
    }

    const instance = new TestClass()
    const result = await instance.testMethodDirect('contextTest')

    expect(pipelineFn).toHaveBeenCalledTimes(1)
    expect(result).toBe('original-contextTest-internalContextValue')
  })
})
