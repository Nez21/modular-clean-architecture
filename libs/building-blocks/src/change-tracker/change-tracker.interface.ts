import type { Diff, EntityType, IEntity, KeyOf } from '@internal/common'
import { Token } from '@internal/common'

export interface IChangeTracker {
  attach(entity: EntityType): boolean
  detach(entity: EntityType): boolean
  detach<T extends EntityType>(entityClass: AnyClass<T>, key: KeyOf<T>): boolean
  refresh(entity: EntityType): void
  isTracked(entity: EntityType): boolean
  isChanged(entity: EntityType): boolean
  diff(entity: IEntity, deep: boolean): Diff[] | undefined
  clear(): void
}

export const IChangeTracker = Token<IChangeTracker>('IChangeTracker')
