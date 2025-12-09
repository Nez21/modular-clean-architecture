import { describe, expect, it } from 'vitest'

import { deepFreeze } from './object.utils'

describe('Object Utils', () => {
  describe('deepFreeze', () => {
    it('should freeze simple objects', () => {
      const obj = { a: 1, b: 2 }
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
      expect(() => {
        ;(frozen as any).a = 3
      }).toThrow()
    })

    it('should freeze nested objects recursively', () => {
      const obj = { nested: { a: 1, b: 2 } }
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
      expect(Object.isFrozen(frozen.nested)).toBe(true)
      expect(() => {
        ;(frozen.nested as any).a = 3
      }).toThrow()
    })

    it('should freeze arrays', () => {
      const obj = { items: [1, 2, 3] }
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
      expect(Object.isFrozen(frozen.items)).toBe(true)
      expect(() => {
        ;(frozen.items as any).push(4)
      }).toThrow()
    })

    it('should handle already frozen objects', () => {
      const obj = { a: 1 }
      Object.freeze(obj)
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
    })

    it('should handle null and undefined values', () => {
      const obj = { a: null, b: undefined }
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
      expect(frozen.a).toBe(null)
      expect(frozen.b).toBe(undefined)
    })

    it('should handle primitive values', () => {
      const obj = { a: 1, b: 'string', c: true }
      const frozen = deepFreeze(obj)

      expect(Object.isFrozen(frozen)).toBe(true)
      expect(frozen.a).toBe(1)
      expect(frozen.b).toBe('string')
      expect(frozen.c).toBe(true)
    })
  })
})
