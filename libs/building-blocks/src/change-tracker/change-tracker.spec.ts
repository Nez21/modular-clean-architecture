import { randomUUID } from 'node:crypto'

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClsModule, ClsService } from 'nestjs-cls'
import z from 'zod'

import { Entity } from '@internal/common'

import { ChangeTracker } from './change-tracker'

class TestEntity extends Entity(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    status: z.enum(['active', 'inactive', 'pending']),
    metadata: z
      .object({
        version: z.number().int().positive(),
        tags: z.array(z.string()).optional()
      })
      .optional()
  }),
  ['id']
) {
  setName(name: string) {
    this.data.name = name
  }

  setStatus(status: 'active' | 'inactive' | 'pending') {
    this.data.status = status
  }

  setMetadata(metadata: { version: number; tags: string[] } | undefined) {
    this.data.metadata = metadata
  }
}

describe('ChangeTracker', () => {
  let changeTracker: ChangeTracker
  let entity: TestEntity

  beforeEach(async () => {
    const snapshotStorage = new Map<string, unknown>()
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ClsModule],
      providers: [ChangeTracker]
    })
      .overrideProvider(ClsService)
      .useValue({ get: () => snapshotStorage })
      .compile()

    changeTracker = moduleRef.get(ChangeTracker)

    entity = TestEntity.create({
      id: randomUUID(),
      name: 'Initial Name',
      status: 'active',
      metadata: { version: 1, tags: ['tag1', 'tag2'] }
    })
  })

  it('should be defined', () => {
    expect(changeTracker).toBeDefined()
  })

  describe('attach', () => {
    it('should attach a new entity and return true', () => {
      const result = changeTracker.attach(entity)

      expect(result).toBe(true)
      expect(changeTracker.isTracked(entity)).toBe(true)
    })

    it('should return false when attaching an already tracked entity', () => {
      changeTracker.attach(entity)

      const result = changeTracker.attach(entity)

      expect(result).toBe(false)
    })

    it('should throw an exception if a null or undefined entity is provided', () => {
      expect(() => changeTracker.attach(null as any)).toThrow()
      expect(() => changeTracker.attach(undefined as any)).toThrow()
    })
  })

  describe('detach', () => {
    it('should detach an entity and mark it as new', () => {
      changeTracker.attach(entity)
      entity.setName('Updated Name')

      const result = changeTracker.detach(entity)

      expect(result).toBe(true)
      expect(changeTracker.isTracked(entity)).toBe(false)

      const diffs = changeTracker.diff(entity, true)
      expect(diffs).toBeUndefined()
    })

    it('should return false if the entity is not tracked', () => {
      const result = changeTracker.detach(entity)

      expect(result).toBe(false)
    })
  })

  describe('detach by entity class and primary key', () => {
    it('should detach the entity using the class and primary key', () => {
      changeTracker.attach(entity)

      const result = changeTracker.detach(TestEntity, { id: entity.id })

      expect(result).toBe(true)
      expect(changeTracker.isTracked(entity)).toBe(false)
    })

    it('should return false if the entity is not found', () => {
      const result = changeTracker.detach(TestEntity, { id: 'non-existent-id' })

      expect(result).toBe(false)
    })
  })

  describe('refresh', () => {
    it('should reset changes and re-sync state', () => {
      changeTracker.attach(entity)
      entity.setStatus('inactive')

      changeTracker.refresh(entity)

      expect(changeTracker.isChanged(entity)).toBe(false)
      expect(changeTracker.diff(entity, true)).toEqual([])
    })
  })

  describe('isTracked & isChanged', () => {
    it('should recognize tracked entities', () => {
      const beforeTracking = changeTracker.isTracked(entity)
      changeTracker.attach(entity)
      const afterTracking = changeTracker.isTracked(entity)

      expect(beforeTracking).toBe(false)
      expect(afterTracking).toBe(true)
    })

    it('should recognize when an entity has changed', () => {
      changeTracker.attach(entity)

      entity.setName('New Name')

      expect(changeTracker.isChanged(entity)).toBe(true)
    })
  })

  describe('diff', () => {
    it('should detect no diffs initially', () => {
      changeTracker.attach(entity)

      const diffs = changeTracker.diff(entity, true)

      expect(diffs).toEqual([])
    })

    it('should detect a single property change', () => {
      changeTracker.attach(entity)

      entity.setName('Updated Name')
      const diffs = changeTracker.diff(entity, true)

      expect(diffs).toBeDefined()
      expect(diffs!.length).toBe(1)
      expect(diffs).toMatchInlineSnapshot(`
        [
          {
            "oldValue": "Initial Name",
            "path": [
              "name",
            ],
            "type": "edit",
            "value": "Updated Name",
          },
        ]
      `)
    })

    it('should detect changes inside nested objects', () => {
      changeTracker.attach(entity)

      entity.setMetadata({ version: 2, tags: ['newTag'] })
      const diffs = changeTracker.diff(entity, true)

      expect(diffs).toMatchInlineSnapshot(`
        [
          {
            "oldValue": 1,
            "path": [
              "metadata",
              "version",
            ],
            "type": "edit",
            "value": 2,
          },
          {
            "oldValue": "tag1",
            "path": [
              "metadata",
              "tags",
              0,
            ],
            "type": "edit",
            "value": "newTag",
          },
          {
            "oldValue": "tag2",
            "path": [
              "metadata",
              "tags",
              1,
            ],
            "type": "remove",
          },
        ]
      `)
    })

    it('should detect an added nested object', () => {
      changeTracker.attach(entity)

      entity.setMetadata({ version: 2, tags: ['newTag'] })
      const diffs = changeTracker.diff(entity, true)

      expect(diffs).toMatchInlineSnapshot(`
        [
          {
            "oldValue": 1,
            "path": [
              "metadata",
              "version",
            ],
            "type": "edit",
            "value": 2,
          },
          {
            "oldValue": "tag1",
            "path": [
              "metadata",
              "tags",
              0,
            ],
            "type": "edit",
            "value": "newTag",
          },
          {
            "oldValue": "tag2",
            "path": [
              "metadata",
              "tags",
              1,
            ],
            "type": "remove",
          },
        ]
      `)
    })

    it('should detect removal of a property', () => {
      changeTracker.attach(entity)
      const oldMetadata = entity.metadata

      entity.setMetadata(undefined)
      const diffs = changeTracker.diff(entity, true)

      expect(diffs).toEqual([
        {
          type: 'edit',
          path: ['metadata'],
          oldValue: oldMetadata,
          value: undefined
        }
      ])
    })
  })

  describe('clear', () => {
    it('should clear all tracked entities', () => {
      changeTracker.attach(entity)

      changeTracker.clear()

      expect(changeTracker.isTracked(entity)).toBe(false)

      const diffs = changeTracker.diff(entity, true)
      expect(diffs).toBeUndefined()
    })
  })
})
