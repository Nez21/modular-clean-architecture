import type { Diff, EntityType, KeyOf } from '@internal/common'
import { Token } from '@internal/common'

export type Patch<T extends EntityType> = Partial<{
  [K in keyof T['$value']]: IfEquals<NonNullable<T['$value'][K]>, T['$value'][K], T['$value'][K], T['$value'][K] | null>
}>

export interface IChangeTracker {
  attach(entity: EntityType): boolean
  detach(entity: EntityType): boolean
  detach<T extends EntityType>(entityClass: AnyClass<T>, key: KeyOf<T>): boolean
  refresh(entity: EntityType): void
  isTracked(entity: EntityType): boolean
  isChanged(entity: EntityType): boolean
  diff(entity: EntityType, deep: boolean): Diff[] | undefined
  toPatch<T extends EntityType>(entity: T): Patch<T>
  clear(): void
}

export const IChangeTracker = Token<IChangeTracker>('IChangeTracker')
