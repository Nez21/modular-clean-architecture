import { assertIsNotNil, Diff, diff, EntityType, EntityUtils } from '@internal/common'

import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

import { SnapshotStorage } from './change-tracker.const'
import { IChangeTracker } from './change-tracker.interface'

@Injectable()
export class ChangeTracker implements IChangeTracker {
  constructor(private readonly cls: ClsService) {}

  private getEntityIdFromClass(cls: AnyClass<EntityType>, key: Record<string, unknown>): string {
    const typeId = EntityUtils.getTypeId(cls)
    const keyAttributes = EntityUtils.getKeyAttributes(cls)
    const keyValues = keyAttributes.map((attribute) => JSON.stringify(key[attribute]))

    return [typeId, ...keyValues].join(':')
  }

  private getEntityId(entity: Instance<EntityType>): string {
    return this.getEntityIdFromClass(entity.constructor, entity as unknown as Record<string, unknown>)
  }

  private getSnapshotStorage(): Map<string, AnyObject> {
    return this.cls.get(SnapshotStorage)
  }

  attach(entity: EntityType): boolean {
    EntityUtils.assert(entity)

    const entityId = this.getEntityId(entity)

    if (!this.getSnapshotStorage().has(entityId)) {
      this.getSnapshotStorage().set(entityId, structuredClone(entity['data']))

      return true
    }

    return false
  }

  detach(entityOrClass: AnyClass<EntityType> | EntityType, key?: Record<string, unknown>): boolean {
    if (typeof entityOrClass === 'function') {
      assertIsNotNil(key)

      return this.getSnapshotStorage().delete(this.getEntityIdFromClass(entityOrClass, key))
    }

    EntityUtils.assert(entityOrClass)

    return this.getSnapshotStorage().delete(this.getEntityId(entityOrClass))
  }

  refresh(entity: EntityType): void {
    EntityUtils.assert(entity)

    this.getSnapshotStorage().set(this.getEntityId(entity), structuredClone(entity['data']))
  }

  isTracked(entity: EntityType): boolean {
    EntityUtils.assert(entity)

    return this.getSnapshotStorage().has(this.getEntityId(entity))
  }

  isChanged(entity: EntityType): boolean {
    return !!this.diff(entity, true)?.length
  }

  diff(entity: EntityType, deep: boolean): Diff[] | undefined {
    EntityUtils.assert(entity)

    const snapshot = this.getSnapshotStorage().get(this.getEntityId(entity))

    if (!snapshot) return

    return diff(snapshot, entity['data'] as AnyObject, deep)
  }

  clear(): void {
    this.getSnapshotStorage().clear()
  }
}
