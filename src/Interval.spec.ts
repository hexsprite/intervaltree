import 'jest'
import { Interval } from './Interval'

describe('Interval', () => {
  it('isNull', () => {
    expect(new Interval(0, 0).isNull())
    .toBe(true)

    expect(new Interval(1, 0).isNull())
    .toBe(true)
  })

  // it('length', () => {
  //   expect(new Interval(0, 0).length())
  //   .toBe(0)
  //   expect(new Interval(0, 1).length())
  //   .toBe(1)
  // })
})
