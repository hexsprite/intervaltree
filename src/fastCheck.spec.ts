import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'
import { fc, test } from '@fast-check/jest'
import { Node } from './Node'
import { compareIntervals } from './IntervalSortedSet'

fc.configureGlobal({
  timeout: 1000,
  interruptAfterTimeLimit: 1000,
  markInterruptAsFailure: false,
  skipAllAfterTimeLimit: 1000,
  numRuns: 1000000,
  // verbose: 2,
})

const intervalArbitrary = fc.integer({ max: 2147483647 - 1 }).chain((start) =>
  fc.record({
    start: fc.constant(start),
    // ensure a minimum length of 1
    end: fc.integer({ min: start + 1 }),
  })
)

const intervalsArbitrary = fc.uniqueArray(intervalArbitrary, {
  // minLength: ,
  minLength: 100,
  maxLength: 200,
  selector: (iv) => `${iv.start},${iv.end}`,
})

test.prop([intervalsArbitrary], {})('should create trees', (intervals) => {
  const tree = new IntervalTree(
    intervals.map((iv) => new Interval(iv.start, iv.end))
  )
  tree.verify()
})

// test maxLength calculation of arbitrary trees
test.prop([intervalsArbitrary], {})(
  'should calculate maxLength',
  (intervals) => {
    const root = Node.fromIntervals(
      intervals.map((iv) => new Interval(iv.start, iv.end))
    )!
    const expectedMaxLength = intervals.reduce((acc, iv) => {
      const ivLength = iv.end - iv.start
      return ivLength > acc ? ivLength : acc
    }, 0)
    expect(root.maxLength).toEqual(expectedMaxLength)
  }
)

// test maxLength calculation of arbitrary trees
test.prop([intervalsArbitrary])('should calculate maxEnd', (intervals) => {
  const root = Node.fromIntervals(
    intervals.map((iv) => new Interval(iv.start, iv.end))
  )!
  if (!root.maxEnd) {
    root.printStructure()
  }
  const expectedMaxEnd = intervals.reduce((acc, iv) => {
    return iv.end > acc ? iv.end : acc
  }, 0)
  expect(root.maxEnd).toEqual(expectedMaxEnd)
})

// test maxLength calculation of arbitrary trees
test.prop([intervalsArbitrary])(
  'should calculate maxEnd with add',
  (intervals) => {
    const tree = new IntervalTree()
    intervals.forEach((iv) => {
      tree.add(new Interval(iv.start, iv.end))
    })

    const expectedMaxEnd = intervals.reduce((acc, iv) => {
      return iv.end > acc ? iv.end : acc
    }, 0)

    // @ts-expect-error - private property
    expect(tree.topNode.maxEnd).toEqual(expectedMaxEnd)
  }
)

test.prop([intervalsArbitrary, fc.integer({ min: 1 }), fc.integer({ min: 1 })])(
  'check findFirstIntervalByLengthStartingAt',
  (intervals, minLength, startingAt) => {
    // Construct the interval tree
    const tree = new IntervalTree()
    intervals.forEach((iv) => {
      tree.add(new Interval(iv.start, iv.end, 'data'))
    })

    // Test the method
    const foundInterval = tree.findFirstIntervalByLengthStartingAt(
      minLength,
      startingAt
    )

    // verify the result
    const expectedInterval = findExpectedInterval(
      intervals,
      minLength,
      startingAt
    )
    if (foundInterval && expectedInterval) {
      expect(foundInterval.start).toEqual(expectedInterval.start)
      expect(foundInterval.end).toEqual(expectedInterval.end)
    }
  }
)

// A helper function to find the expected interval
type IvData = { start: number; end: number; data?: string }

const findExpectedInterval = (
  intervals: IvData[],
  minLength: number,
  startingAt: number
): IvData | undefined => {
  let earliestInterval: IvData | undefined = undefined

  for (let interval of [...intervals].sort(compareIntervals)) {
    const intervalLength =
      interval.end - interval.start - Math.max(0, startingAt - interval.start)

    if (intervalLength >= minLength) {
      if (interval.start < startingAt && interval.end >= startingAt) {
        // Create a new interval that starts at startingAt
        interval = {
          start: startingAt,
          end: interval.end,
          data: interval.data,
        }
      }

      if (!earliestInterval || interval.start < earliestInterval.start) {
        earliestInterval = interval
      }
    }
  }

  return earliestInterval
}

// More complex Fastcheck test using model-based testing
// https://fast-check.dev/docs/advanced/model-based-testing/

// `class Model {
//   intervals: Interval[] = []
// }

// class AddCommand implements fc.Command<Model, IntervalTree> {
//   constructor(readonly value: number) {}
//   check = (m: Readonly<Model>) => true
//   run(m: Model, r: List): void {
//     r.push(this.value) // impact the system
//     m.intervals.push(iv)
//   }
//   toString = () => `push(${this.value})`
// }
