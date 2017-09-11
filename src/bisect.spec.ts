import 'jest'
import { bisectLeft } from './bisect'

describe('bisectLeft', () => {
  it('inserts to left of existing value', () => {
    expect(bisectLeft([0, 1, 2, 3, 4, 5], 5)).toBe(5)
  })
  it('inserts right to value greater than existing', () => {
    expect(bisectLeft([0, 1, 2, 3, 4, 5], 10)).toBe(6)
  })
  it('inserts to left of value lower than existing values', () => {
    expect(bisectLeft([0, 1, 2, 3, 4, 5], -1)).toBe(0)
  })
})
