import 'jest'
import { Interval } from './Interval'

describe('Interval', () => {
  it('isNull', () => {
    expect(new Interval(0, 0).isNull()).toBe(true)
    expect(new Interval(1, 0).isNull()).toBe(true)
  })

  //   it('compares', () => {
  //     const ivA = new Interval(0, 1)
  //     const ivB = new Interval(0, 1, 'hi')
  //     expect(ivA.compare(ivB)).toBe(-Infinity)
  //   })
})
