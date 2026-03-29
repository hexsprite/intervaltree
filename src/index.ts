import type { IntervalCollection } from './IntervalCollection'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'
import { IntervalTuple } from './types'
import './polyfills' // Side-effect: shims Array.prototype.toSorted for pre-ES2023 runtimes

export { compareIntervals, Interval, IntervalTree, IntervalTuple }
export type { IntervalCollection }
