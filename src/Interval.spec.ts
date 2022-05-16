import 'jest'
import { Interval } from './Interval'

describe('Interval', () => {
  it('isNull', () => {
    expect(new Interval(0, 0).isNull()).toBe(true)
    expect(new Interval(1, 0).isNull()).toBe(true)
  })
})
