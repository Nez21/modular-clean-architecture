import type { Diff } from './diff.utils'
import { diff } from './diff.utils'

function containsDiff(diffs: Diff[], expected: Diff) {
  return diffs.some(
    (d) =>
      d.type === expected.type &&
      JSON.stringify(d.path) === JSON.stringify(expected.path) &&
      JSON.stringify(d['value'] ?? null) === JSON.stringify(expected['value'] ?? null) &&
      JSON.stringify(d['oldValue'] ?? null) === JSON.stringify(expected['oldValue'] ?? null)
  )
}

describe('diff function', () => {
  it('should return a remove diff for missing properties in newObj', () => {
    const obj = { a: 1, b: 2 }
    const newObj = { a: 1 }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'remove', path: ['b'], oldValue: 2 })).toBe(true)
  })

  it('should return an add diff for new properties in newObj', () => {
    const obj = { a: 1 }
    const newObj = { a: 1, b: 2 }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'add', path: ['b'], value: 2 })).toBe(true)
  })

  it('should return an edit diff when a property value changes', () => {
    const obj = { a: 1 }
    const newObj = { a: 2 }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'edit', path: ['a'], value: 2, oldValue: 1 })).toBe(true)
  })

  it('should treat null and undefined as different values', () => {
    const obj = { a: null }
    const newObj = { a: undefined }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'edit', path: ['a'], value: undefined, oldValue: null })).toBe(true)
  })

  it('should perform deep diffing on nested objects', () => {
    const obj = { a: { b: 1, c: 2 } }
    const newObj = { a: { b: 1, c: 3 } }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'edit', path: ['a', 'c'], value: 3, oldValue: 2 })).toBe(true)
  })

  it('should create a shallow diff when deep is false', () => {
    const obj = { a: { b: 1, c: 2 } }
    const newObj = { a: { b: 1, c: 3 } }

    const result = diff(obj, newObj, false)

    expect(result).toHaveLength(1)
    expect(containsDiff(result, { type: 'edit', path: ['a'], value: newObj.a, oldValue: obj.a })).toBe(true)
  })

  it('should compare arrays in order and generate appropriate diffs', () => {
    const obj = [1, 2, 3]
    const newObj = [1, 4, 3, 5]

    const result = diff(obj, newObj)

    expect(result).toHaveLength(2)
    expect(containsDiff(result, { type: 'edit', path: [1], value: 4, oldValue: 2 })).toBe(true)
    expect(containsDiff(result, { type: 'add', path: [3], value: 5 })).toBe(true)
  })

  it('should not produce a diff for properties with NaN values in both objects', () => {
    const obj = { a: Number.NaN }
    const newObj = { a: Number.NaN }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(0)
  })

  it('should handle multiple types of diffs in one comparison', () => {
    const obj = { a: 1, b: { c: 2, d: 4 } }
    const newObj = { a: 2, b: { c: 2, e: 5 }, f: 6 }

    const result = diff(obj, newObj)

    expect(result).toHaveLength(4)
    expect(containsDiff(result, { type: 'edit', path: ['a'], value: 2, oldValue: 1 })).toBe(true)
    expect(containsDiff(result, { type: 'remove', path: ['b', 'd'], oldValue: 4 })).toBe(true)
    expect(containsDiff(result, { type: 'add', path: ['b', 'e'], value: 5 })).toBe(true)
    expect(containsDiff(result, { type: 'add', path: ['f'], value: 6 })).toBe(true)
  })
})
