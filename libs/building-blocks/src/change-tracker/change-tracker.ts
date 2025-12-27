import { assertIsNotNil, Diff, diff, EntityType, EntityUtils } from '@internal/common'

import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

import { SnapshotStorage } from './change-tracker.const'
import { IChangeTracker, Patch } from './change-tracker.interface'

@Injectable()
export class ChangeTracker implements IChangeTracker {
  constructor(private readonly cls: ClsService) {}

  get snapshotStorage(): Map<string, AnyObject> {
    return this.cls.get(SnapshotStorage)
  }

  attach(entity: EntityType): boolean {
    EntityUtils.assert(entity)

    const entityId = this.getEntityId(entity)

    if (!this.snapshotStorage.has(entityId)) {
      this.snapshotStorage.set(entityId, structuredClone(entity['$value']))

      return true
    }

    return false
  }

  detach(entityOrClass: AnyClass<EntityType> | EntityType, key?: Record<string, unknown>): boolean {
    if (typeof entityOrClass === 'function') {
      assertIsNotNil(key)

      return this.snapshotStorage.delete(this.getEntityIdFromClass(entityOrClass, key))
    }

    EntityUtils.assert(entityOrClass)

    return this.snapshotStorage.delete(this.getEntityId(entityOrClass))
  }

  refresh(entity: EntityType): void {
    EntityUtils.assert(entity)

    this.snapshotStorage.set(this.getEntityId(entity), structuredClone(entity['$value']))
  }

  isTracked(entity: EntityType): boolean {
    EntityUtils.assert(entity)

    return this.snapshotStorage.has(this.getEntityId(entity))
  }

  isChanged(entity: EntityType): boolean {
    return !!this.diff(entity, true)?.length
  }

  diff(entity: EntityType, deep: boolean): Diff[] | undefined {
    EntityUtils.assert(entity)

    const snapshot = this.snapshotStorage.get(this.getEntityId(entity))

    if (!snapshot) return

    return diff(snapshot, entity['$value'], deep)
  }

  toPatch<T extends EntityType>(entity: T): Patch<T> {
    EntityUtils.assert(entity)

    const snapshot = this.snapshotStorage.get(this.getEntityId(entity))

    if (!snapshot) return entity['$value'] as Patch<T>

    const diffs = diff(snapshot, entity['$value'], false)

    const patch = diffs.reduce((patch, diff) => {
      // Override undefined values with null for ORM compatibility
      patch[diff.path[0]] = diff.type === 'remove' ? null : (diff.value ?? null)
      return patch
    }, {})

    return patch as Patch<T>
  }

  clear(): void {
    this.snapshotStorage.clear()
  }

  private getEntityId(entity: Instance<EntityType>): string {
    return this.getEntityIdFromClass(entity.constructor, entity as unknown as Record<string, unknown>)
  }

  private getEntityIdFromClass(cls: AnyClass<EntityType>, key: Record<string, unknown>): string {
    const typeId = EntityUtils.getTypeId(cls)
    const keyAttributes = EntityUtils.getKeyAttributes(cls)
    const keyValues = keyAttributes.map((attribute) => JSON.stringify(key[attribute]))

    return [typeId, ...keyValues].join(':')
  }
}
