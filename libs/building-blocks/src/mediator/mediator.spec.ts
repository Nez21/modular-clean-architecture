import type { CallHandler } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Observable } from 'rxjs'
import { throwError } from 'rxjs'

import { BaseCommand, CommandHandler } from './command.interface'
import { BaseEvent, EventHandler } from './event.interface'
import { Mediator } from './mediator'
import { IMediator } from './mediator.interface'
import { MediatorModule } from './mediator.module'
import type { PipelineBehaviorInput } from './pipeline-behavior.interface'
import { BasePipelineBehavior } from './pipeline-behavior.interface'
import { BaseQuery, QueryHandler } from './query.interface'

class TestCommand extends BaseCommand {
  constructor(public readonly value: string) {
    super()
  }
}

class AnotherTestCommand extends BaseCommand {
  constructor(public readonly value: number) {
    super()
  }
}

class UnregisteredCommand extends BaseCommand {}

class TestCommandHandler extends CommandHandler(TestCommand) {
  handle(command: TestCommand): Promise<string> {
    return Promise.resolve(`Command executed with value: ${command.value}`)
  }
}

class AnotherTestCommandHandler extends CommandHandler(AnotherTestCommand) {
  handle(command: AnotherTestCommand): Promise<number> {
    return Promise.resolve(command.value * 2)
  }
}

class ErrorCommandHandler extends CommandHandler(TestCommand) {
  handle(): Promise<string> {
    throw new Error('Command handler error')
  }
}

class TestQuery extends BaseQuery {
  constructor(public readonly id: number) {
    super()
  }
}

class AnotherTestQuery extends BaseQuery {
  constructor(public readonly name: string) {
    super()
  }
}

class UnregisteredQuery extends BaseQuery {}

class TestQueryHandler extends QueryHandler(TestQuery) {
  handle(query: TestQuery): Promise<{ id: number; data: string }> {
    return Promise.resolve({
      id: query.id,
      data: `Query result for ID: ${String(query.id)}`
    })
  }
}

class AnotherTestQueryHandler extends QueryHandler(AnotherTestQuery) {
  handle(query: AnotherTestQuery): Promise<string[]> {
    return Promise.resolve([`Result for ${query.name}`, 'Additional data'])
  }
}

class RejectionQueryHandler extends QueryHandler(TestQuery) {
  handle(): Promise<{ id: number; data: string }> {
    return Promise.reject(new Error('Async rejection'))
  }
}

class TestEvent extends BaseEvent {
  constructor(public readonly message: string) {
    super()
  }
}

class AnotherTestEvent extends BaseEvent {
  constructor(public readonly value: number) {
    super()
  }
}

class TestEventHandler extends EventHandler(TestEvent) {
  override handle = vi.fn().mockResolvedValue(undefined)
}

class AnotherTestEventHandler extends EventHandler(TestEvent) {
  override handle = vi.fn().mockResolvedValue(undefined)
}

class TestAnotherEventHandler extends EventHandler(AnotherTestEvent) {
  override handle = vi.fn().mockResolvedValue(undefined)
}

class ErrorEventHandler extends EventHandler(TestEvent) {
  override handle(): Promise<void> {
    throw new Error('Event handler error')
  }
}

class LoggingPipelineBehavior extends BasePipelineBehavior {
  constructor(public readonly logger = vi.fn()) {
    super()
  }

  handle(input: PipelineBehaviorInput, next: CallHandler): Promise<Observable<unknown>> | Observable<unknown> {
    this.logger(`Processing ${input.type}: ${input.data.constructor.name}`, input.data)

    return next.handle()
  }
}

class ValidationPipelineBehavior extends BasePipelineBehavior {
  constructor(public readonly validator = vi.fn()) {
    super()
  }

  handle(input: PipelineBehaviorInput, next: CallHandler): Promise<Observable<unknown>> | Observable<unknown> {
    const validationResult = this.validator(input.data) as boolean

    if (validationResult) {
      return next.handle()
    }

    return throwError(() => new Error('Validation failed'))
  }
}

class ErrorPipelineBehavior extends BasePipelineBehavior {
  handle(): Promise<Observable<unknown>> | Observable<unknown> {
    return throwError(() => new Error('Pipeline error'))
  }
}

describe('Mediator', () => {
  describe('Standard cases', () => {
    let module: TestingModule
    let mediator: IMediator

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MediatorModule.forRoot({
            defaultBehaviors: [LoggingPipelineBehavior, ValidationPipelineBehavior]
          })
        ],
        providers: [
          TestCommandHandler,
          AnotherTestCommandHandler,
          TestQueryHandler,
          AnotherTestQueryHandler,
          TestEventHandler,
          AnotherTestEventHandler,
          TestAnotherEventHandler,
          LoggingPipelineBehavior,
          ValidationPipelineBehavior
        ]
      }).compile()

      mediator = module.get<IMediator>(IMediator)
      vi.spyOn((mediator as Mediator).logger, 'log').mockImplementation(() => {})

      await (mediator as Mediator).onApplicationBootstrap()

      const validationBehavior = module.get<ValidationPipelineBehavior>(ValidationPipelineBehavior)
      validationBehavior.validator.mockResolvedValue(true)
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    describe('test', () => {
      it('should be defined', () => {
        expect(mediator).toBeDefined()
      })
    })

    describe('Command handling', () => {
      it('should execute a command and return the result', async () => {
        const result = await mediator.send(new TestCommand('test-value'))

        expect(result).toBe('Command executed with value: test-value')
      })

      it('should handle multiple different commands', async () => {
        const result1 = await mediator.send(new TestCommand('test-value'))
        const result2 = await mediator.send(new AnotherTestCommand(5))

        expect(result1).toBe('Command executed with value: test-value')
        expect(result2).toBe(10)
      })

      it('should throw an error for an unregistered command', async () => {
        await expect(mediator.send(new UnregisteredCommand())).rejects.toThrow(
          'No handler registered for request type: UnregisteredCommand'
        )
      })
    })

    describe('Query handling', () => {
      it('should execute a query and return the result', async () => {
        const result = await mediator.send(new TestQuery(123))

        expect(result).toEqual({ id: 123, data: 'Query result for ID: 123' })
      })

      it('should handle multiple different queries', async () => {
        const result1 = await mediator.send(new TestQuery(123))
        const result2 = await mediator.send(new AnotherTestQuery('test-name'))

        expect(result1).toEqual({ id: 123, data: 'Query result for ID: 123' })
        expect(result2).toEqual(['Result for test-name', 'Additional data'])
      })

      it('should throw an error for an unregistered query', async () => {
        await expect(mediator.send(new UnregisteredQuery())).rejects.toThrow(
          'No handler registered for request type: UnregisteredQuery'
        )
      })
    })

    describe('Event publishing', () => {
      it('should publish an event to all registered handlers', async () => {
        const testEventHandler1 = module.get(TestEventHandler)
        const testEventHandler2 = module.get(AnotherTestEventHandler)

        const event = new TestEvent('test-event')
        await mediator.publish(event)

        expect(testEventHandler1.handle).toHaveBeenCalledWith(event)
        expect(testEventHandler2.handle).toHaveBeenCalledWith(event)
      })

      it('should not throw an error if no handlers are registered for an event', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        await expect(mediator.publish(new AnotherTestEvent(999))).resolves.not.toThrow()

        consoleWarnSpy.mockRestore()
      })

      it('should publish events to the correct handlers based on event type', async () => {
        const testEventHandler = module.get(TestEventHandler)
        const anotherEventHandler = module.get(TestAnotherEventHandler)

        const event1 = new TestEvent('test-event')
        const event2 = new AnotherTestEvent(42)

        await mediator.publish(event1)
        await mediator.publish(event2)

        expect(testEventHandler.handle).toHaveBeenCalledWith(event1)
        expect(testEventHandler.handle).not.toHaveBeenCalledWith(event2)

        expect(anotherEventHandler.handle).toHaveBeenCalledWith(event2)
        expect(anotherEventHandler.handle).not.toHaveBeenCalledWith(event1)
      })
    })

    describe('Pipeline Behaviors', () => {
      it('should execute pipeline behaviors in order for commands', async () => {
        const loggingBehavior = module.get(LoggingPipelineBehavior)
        const validationBehavior = module.get(ValidationPipelineBehavior)

        validationBehavior.validator.mockReturnValue(true)

        const command = new TestCommand('test-pipeline')
        const result = await mediator.send(command)

        expect(result).toBe('Command executed with value: test-pipeline')

        expect(loggingBehavior.logger).toHaveBeenCalled()
        expect(validationBehavior.validator).toHaveBeenCalled()
      })

      it('should execute pipeline behaviors for queries', async () => {
        const loggingBehavior = module.get(LoggingPipelineBehavior)
        const validationBehavior = module.get(ValidationPipelineBehavior)

        validationBehavior.validator.mockReturnValue(true)

        const query = new TestQuery(123)
        const result = await mediator.send(query)

        expect(result).toEqual({ id: 123, data: 'Query result for ID: 123' })

        expect(loggingBehavior.logger).toHaveBeenCalled()
        expect(validationBehavior.validator).toHaveBeenCalled()
      })

      it('should stop execution when validation behavior fails', async () => {
        const validationBehavior = module.get(ValidationPipelineBehavior)

        validationBehavior.validator.mockReturnValue(false)

        await expect(mediator.send(new TestCommand('validation-test'))).rejects.toThrow('Validation failed')
      })
    })

    describe('Concurrent requests', () => {
      it('should handle multiple concurrent requests without interference', async () => {
        const results = await Promise.all([
          mediator.send(new TestCommand('concurrent-1')),
          mediator.send(new AnotherTestCommand(10)),
          mediator.send(new TestQuery(42)),
          mediator.send(new AnotherTestQuery('concurrent-query'))
        ])

        expect(results[0]).toBe('Command executed with value: concurrent-1')
        expect(results[1]).toBe(20)
        expect(results[2]).toEqual({ id: 42, data: 'Query result for ID: 42' })
        expect(results[3]).toEqual(['Result for concurrent-query', 'Additional data'])
      })
    })
  })

  describe('Error Handling Cases', () => {
    it('should propagate errors from command handlers', async () => {
      const errorModule = await Test.createTestingModule({
        imports: [MediatorModule.forRoot()],
        providers: [ErrorCommandHandler]
      }).compile()

      const errorMediator = errorModule.get<IMediator>(IMediator)
      await (errorMediator as Mediator).onApplicationBootstrap()

      await expect(errorMediator.send(new TestCommand('error-test'))).rejects.toThrow('Command handler error')
    })

    it('should propagate errors from event handlers', async () => {
      const errorModule = await Test.createTestingModule({
        imports: [MediatorModule.forRoot()],
        providers: [ErrorEventHandler]
      }).compile()

      const errorMediator = errorModule.get<IMediator>(IMediator)
      await (errorMediator as Mediator).onApplicationBootstrap()

      await expect(errorMediator.publish(new TestEvent('error-test'))).rejects.toThrow(
        new AggregateError([new Error('Event handler error')], 'Failed to publish event')
      )
    })

    it('should handle rejection in asynchronous handlers', async () => {
      const errorModule = await Test.createTestingModule({
        imports: [MediatorModule.forRoot()],
        providers: [RejectionQueryHandler]
      }).compile()

      const errorMediator = errorModule.get<IMediator>(IMediator)
      await (errorMediator as Mediator).onApplicationBootstrap()

      await expect(errorMediator.send(new TestQuery(999))).rejects.toThrow('Async rejection')
    })

    it('should handle errors from pipeline behaviors', async () => {
      const errorModule = await Test.createTestingModule({
        imports: [
          MediatorModule.forRoot({
            defaultBehaviors: [ErrorPipelineBehavior]
          })
        ],
        providers: [TestQueryHandler, ErrorPipelineBehavior]
      }).compile()

      const errorMediator = errorModule.get<IMediator>(IMediator)
      await (errorMediator as Mediator).onApplicationBootstrap()

      await expect(errorMediator.send(new TestQuery(999))).rejects.toThrow('Pipeline error')
    })
  })
})
