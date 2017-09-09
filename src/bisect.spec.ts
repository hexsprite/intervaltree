import 'jest'
import { bisectLeft } from './bisect'

describe('bisectLeft', () => {
  it('bisectInterval', () => {
    expect(bisectLeft([0, 1, 2, 3, 4, 5], 5)).toBe(5)
    expect(bisectLeft([0, 1, 2, 3, 4, 5], 10)).toBe(6)
    expect(bisectLeft([0, 1, 2, 3, 4, 5], -1)).toBe(0)
  })
})
