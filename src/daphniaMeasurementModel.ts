export const MEASUREMENT_CYCLE_SECONDS = 18.8
import { daphniaPose, focusBlur, measurablePose } from './daphniaMotion'
// Original illustrative data, not measurements extracted from the publication.
export const daphniaWells = [2.84, 3.12, 2.67, 3.06, 2.91, 3.24, 2.76, 3.18, 2.58, 2.95, 3.09, 2.83, 3.21, 2.72, 3.04, 2.88].map((length, i) => ({
  id: `${'ABCD'[Math.floor(i / 4)]}${i % 4 + 1}`, row: Math.floor(i / 4), col: i % 4, length, dead: i === 5,
}))
export const wellScanOrder = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12]
export const ease = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t) }
export function measurementState(seconds: number, moving = true) {
  const t = moving ? Math.max(0, seconds) % MEASUREMENT_CYCLE_SECONDS : 16
  const zoom = ease((t - 7.3) / 1.2)
  const scan = Math.max(0, Math.min(15, (t - 8.5) / .4))
  const step = Math.floor(scan)
  const previous = daphniaWells[wellScanOrder[step]]
  const next = daphniaWells[wellScanOrder[Math.min(15, step + 1)]]
  const travel = ease((scan - step) / .7)
  // Capture only after travel has settled. Each well is acquired exactly once.
  const completed = t < 6.15 ? 0 : t < 8.5 ? 1 : Math.min(16, 1 + step + (travel === 1 ? 1 : 0))
  const pose = daphniaPose(t)
  // One local exposure pulse at the same instant the good frame freezes.
  // Static / reduced-motion previews use t=16 and therefore never flash.
  const exposure = t - 5.6
  const shutter = moving && exposure >= 0 && exposure < .28
    ? ease(exposure / .035) * (1 - ease((exposure - .035) / .245)) : 0
  return {
    t, zoom, completed, pose, shutter,
    col: previous.col + (next.col - previous.col) * travel,
    row: previous.row + (next.row - previous.row) * travel,
    freeze: t >= 5.6 ? 1 : 0,
    measure: ease((t - 5.84) / .3) * (1 - zoom),
    phase: t < 5.6 ? (focusBlur(pose.depth) > .7 ? 'Out of focus · waiting' : measurablePose(pose) ? 'Clear side view · checking' : 'Finding a side view') : t < 7.3 ? 'Frame captured' : t < 8.5 ? 'Moving to plate view' : completed < 16 ? 'Scanning wells' : '16 wells checked',
    opacity: t > 18.3 ? 1 - ease((t - 18.3) / .5) : ease(t / .3),
  }
}
