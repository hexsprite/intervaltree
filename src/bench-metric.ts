/**
 * Benchmark for autoresearch: models Focuster's FreelistController workload.
 *
 * The scheduler:
 * 1. Creates a tree with a single big interval (2 weeks of time)
 * 2. Chops out ~100 busy events (calendar events, pinned actions)
 * 3. Chops out non-work-hours (~28 chop operations for 2 weeks of work hours)
 * 4. For each of ~100 actions: searchByLengthStartingAt + chop the scheduled slot
 * 5. mergeOverlaps before searching
 *
 * Uses fixed seed PRNG for deterministic results.
 */
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

// Time constants (milliseconds)
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const TWO_WEEKS = 140 * DAY // scaled up period to match more work days

// Simulation parameters — scaled-up Focuster workload for stable benchmarking
const NUM_EVENTS = 1000 // calendar events to chop
const NUM_ACTIONS = 1500 // actions to schedule
const NUM_WORK_DAYS = 100 // extended period for more intervals
const WORK_START_HOUR = 9
const WORK_END_HOUR = 17

const now = Date.now()
const periodStart = now
const periodEnd = now + TWO_WEEKS

// Generate deterministic busy events (30min–2hr each, scattered over 2 weeks)
const busyEvents: [number, number][] = []
for (let i = 0; i < NUM_EVENTS; i++) {
  const start = periodStart + Math.floor(rand() * TWO_WEEKS)
  const duration = (Math.floor(rand() * 4) + 1) * 30 * MINUTE // 30min to 2hr
  busyEvents.push([start, start + duration])
}

// Generate work hour intervals (9am–5pm for each work day)
const workHourIntervals: [number, number][] = []
for (let d = 0; d < NUM_WORK_DAYS; d++) {
  const dayStart = periodStart + d * DAY
  const workStart = dayStart + WORK_START_HOUR * HOUR
  const workEnd = dayStart + WORK_END_HOUR * HOUR
  workHourIntervals.push([workStart, workEnd])
}

// Invert work hours to get non-work times to chop
function invertIntervals(intervals: [number, number][], start: number, end: number): [number, number][] {
  const flat: number[] = []
  for (const [s, e] of intervals) {
    flat.push(s, e)
  }
  const values = [start, ...flat, end]
  const result: [number, number][] = []
  for (let i = 0; i < values.length; i += 2) {
    if (values[i] < values[i + 1]) {
      result.push([values[i], values[i + 1]])
    }
  }
  return result
}

const nonWorkHours = invertIntervals(workHourIntervals, periodStart, periodEnd)

// Generate action durations (15min–2hr)
const actionDurations: number[] = []
for (let i = 0; i < NUM_ACTIONS; i++) {
  actionDurations.push((Math.floor(rand() * 8) + 1) * 15 * MINUTE)
}

// ===== BENCHMARK =====

const initStart = performance.now()

// Phase 1: Build freelist (single interval covering 2 weeks)
let tree = new IntervalTree<string>()
tree.addInterval(periodStart, periodEnd)

// Phase 2: Chop busy events
for (const [start, end] of busyEvents) {
  tree.chop(start, end)
}

// Phase 3: Chop non-work hours
for (const [start, end] of nonWorkHours) {
  tree.chop(start, end)
}

const initEnd = performance.now()

// Phase 4: Schedule actions (search + chop loop)
const scheduleStart = performance.now()
let earliest = periodStart
for (const duration of actionDurations) {
  tree.mergeOverlaps()
  const slots = tree.searchByLengthStartingAt(duration, earliest)
  if (slots.length > 0) {
    const slot = slots[0]
    const actionStart = Math.max(slot.start, earliest)
    const actionEnd = actionStart + duration
    tree.chop(actionStart, actionEnd)
    // Move earliest forward slightly to simulate time progression
    earliest = actionStart
  }
}
const scheduleEnd = performance.now()

const initMs = (initEnd - initStart).toFixed(2)
const scheduleMs = (scheduleEnd - scheduleStart).toFixed(2)
const totalMs = (Number(initMs) + Number(scheduleMs)).toFixed(2)

process.stdout.write(`INIT_MS=${initMs}\n`)
process.stdout.write(`SCHEDULE_MS=${scheduleMs}\n`)
process.stdout.write(`TOTAL_MS=${totalMs}\n`)
