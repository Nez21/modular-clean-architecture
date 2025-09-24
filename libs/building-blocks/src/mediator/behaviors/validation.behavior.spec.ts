/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import z from 'zod'

import { Dto } from '@internal/common'

import { BaseCommand, CommandHandler } from '../command.interface'
import type { Mediator } from '../mediator'
import { IMediator } from '../mediator.interface'
import { MediatorModule } from '../mediator.module'

import { ValidationBehavior } from './validation.behavior'

class TestCommandDto extends Dto(
  z.object({
    name: z.string().min(3).max(50),
    age: z.number().int().min(0).max(120),
    email: z.email(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).min(1).max(5)
  }),
  BaseCommand
) {}

class TestHandler extends CommandHandler(TestCommandDto) {
  handle = vi.fn().mockResolvedValue('test-result')
}

describe('ValidationBehavior', () => {
  let mediator: IMediator
  let handler: TestHandler

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [MediatorModule.forRoot({ defaultBehaviors: [ValidationBehavior] })],
      providers: [TestHandler, ValidationBehavior]
    }).compile()

    mediator = module.get<IMediator>(IMediator)
    handler = module.get<TestHandler>(TestHandler)
    await (mediator as Mediator).onApplicationBootstrap()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Standard cases', () => {
    it('should handle valid DTO', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1', 'tag2']
      })

      const result = await mediator.send(command)

      expect(result).toBe('test-result')
      expect(handler.handle).toHaveBeenCalledTimes(1)
    })

    it('should handle valid DTO with optional fields', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        tags: ['tag1']
      })

      const result = await mediator.send(command)

      expect(result).toBe('test-result')
      expect(handler.handle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error handling', () => {
    it('should throw validation error for invalid name', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1']
      })
      command.name = 'Jo' // Too short

      await expect(mediator.send(command)).rejects.toThrow(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['name'],
              code: 'too_small',
              minimum: 3,
              inclusive: true
            })
          ])
        })
      )
      expect(handler.handle).not.toHaveBeenCalled()
    })

    it('should throw validation error for invalid age', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1']
      })
      command.age = -1 // Invalid age

      await expect(mediator.send(command)).rejects.toThrow(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['age'],
              code: 'too_small',
              minimum: 0,
              inclusive: true
            })
          ])
        })
      )
      expect(handler.handle).not.toHaveBeenCalled()
    })

    it('should throw validation error for invalid email', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1']
      })
      command.email = 'invalid-email' // Invalid email

      await expect(mediator.send(command)).rejects.toThrow(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['email'],
              code: 'invalid_format',
              format: 'email'
            })
          ])
        })
      )
      expect(handler.handle).not.toHaveBeenCalled()
    })

    it('should throw validation error for too many tags', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1']
      })
      command.tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] // Too many tags

      await expect(mediator.send(command)).rejects.toThrow(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['tags'],
              code: 'too_big',
              maximum: 5,
              inclusive: true
            })
          ])
        })
      )
      expect(handler.handle).not.toHaveBeenCalled()
    })

    it('should throw validation error for empty tags', async () => {
      const command = TestCommandDto.create({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['tag1']
      })
      command.tags = [] // Empty tags

      await expect(mediator.send(command)).rejects.toThrow(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['tags'],
              code: 'too_small',
              minimum: 1,
              inclusive: true
            })
          ])
        })
      )
      expect(handler.handle).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle non-DTO commands', async () => {
      class NonDtoCommand extends BaseCommand {
        constructor(public readonly value: string) {
          super()
        }
      }

      class NonDtoHandler extends CommandHandler(NonDtoCommand) {
        handle = vi.fn().mockResolvedValue('test-result')
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [MediatorModule.forRoot({ defaultBehaviors: [ValidationBehavior] })],
        providers: [NonDtoHandler, ValidationBehavior]
      }).compile()

      const customMediator = module.get<IMediator>(IMediator)
      const customHandler = module.get<NonDtoHandler>(NonDtoHandler)
      await (customMediator as Mediator).onApplicationBootstrap()

      const command = new NonDtoCommand('test-value')

      const result = await customMediator.send(command)

      expect(result).toBe('test-result')
      expect(customHandler.handle).toHaveBeenCalledTimes(1)
    })

    it('should handle DTO with all optional fields', async () => {
      class OptionalDto extends Dto(
        z.object({
          name: z.string().optional(),
          age: z.number().optional(),
          email: z.email().optional()
        }),
        BaseCommand
      ) {}

      class OptionalHandler extends CommandHandler(OptionalDto) {
        handle = vi.fn().mockResolvedValue('test-result')
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [MediatorModule.forRoot({ defaultBehaviors: [ValidationBehavior] })],
        providers: [OptionalHandler, ValidationBehavior]
      }).compile()

      const customMediator = module.get<IMediator>(IMediator)
      const customHandler = module.get<OptionalHandler>(OptionalHandler)
      await (customMediator as Mediator).onApplicationBootstrap()

      const command = OptionalDto.create({})

      const result = await customMediator.send(command)

      expect(result).toBe('test-result')
      expect(customHandler.handle).toHaveBeenCalledTimes(1)
    })
  })
})
