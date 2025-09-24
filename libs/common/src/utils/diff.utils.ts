export interface DiffCreate {
  type: 'add'
  path: (string | number)[]
  value: unknown
}

export interface DiffRemove {
  type: 'remove'
  path: (string | number)[]
  oldValue: unknown
}

export interface DiffChange {
  type: 'edit'
  path: (string | number)[]
  value: unknown
  oldValue: unknown
}

export type Diff = DiffCreate | DiffRemove | DiffChange

const richTypes = new Set<Function>([Date, String, Number])

export const diff = (
  obj: Record<string, unknown> | unknown[],
  newObj: Record<string, unknown> | unknown[],
  deep: boolean = true,
  visited: WeakSet<object> = new WeakSet()
): Diff[] => {
  const diffs: Diff[] = []
  const isObjArray = Array.isArray(obj)

  for (const key in obj) {
    const path = isObjArray ? +key : key
    const objValue = obj[path as keyof typeof obj]
    const newObjValue = newObj[path as keyof typeof newObj]

    if (!(key in newObj)) {
      diffs.push({
        type: 'remove',
        path: [path],
        oldValue: objValue
      })

      continue
    }

    const areCompatibleObjects =
      typeof objValue === 'object' &&
      typeof newObjValue === 'object' &&
      Array.isArray(objValue) === Array.isArray(newObjValue)

    if (
      objValue &&
      newObjValue &&
      areCompatibleObjects &&
      !richTypes.has(objValue.constructor) &&
      !visited.has(objValue)
    ) {
      visited.add(objValue)

      const nestedDiffs = diff(
        objValue as Record<string, unknown>,
        newObjValue as Record<string, unknown>,
        true,
        visited
      ).map((difference) => {
        difference.path.unshift(path)

        return difference
      })

      if (nestedDiffs.length === 0 || deep) {
        diffs.push(...nestedDiffs)
      } else {
        diffs.push({
          type: 'edit',
          path: [path],
          value: newObjValue,
          oldValue: objValue
        })
      }
    } else if (
      objValue !== newObjValue &&
      !(Number.isNaN(objValue) && Number.isNaN(newObjValue)) &&
      !(
        areCompatibleObjects &&
        // @ts-ignore
        // biome-ignore lint/style/useTemplate: Type hack
        (Number.isNaN(objValue) ? objValue + '' === newObjValue + '' : +objValue === +newObjValue)
      )
    ) {
      diffs.push({
        path: [path],
        type: 'edit',
        value: newObjValue,
        oldValue: objValue
      })
    }
  }

  const isNewObjArray = Array.isArray(newObj)

  for (const key in newObj) {
    if (!(key in obj)) {
      diffs.push({
        type: 'add',
        path: [isNewObjArray ? +key : key],
        value: newObj[key as keyof typeof newObj]
      })
    }
  }

  return diffs
}
