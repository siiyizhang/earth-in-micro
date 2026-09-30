// Authored motion study of the rolling/swimming transition at 1:07–1:09:
// https://www.youtube.com/watch?v=A4TRXFGV8Bg&t=67s
// Normalized well coordinates; yaw 0 is lateral, PI/2 is frontal.
export type DaphniaPose = { x: number; y: number; yaw: number; pitch: number; roll: number; depth: number; stroke: number; time: number }
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t) }
const frames = [
  [0, -.13, .07, 1.48, .14, .3, .1],
  [.65, -.07, -.09, 1.3, .25, .05, .65],
  [1.35, .07, -.14, .6, -.18, -.4, 1],
  [2.1, .15, -.02, .08, .18, -.8, .95],
  [2.85, .07, .12, 1.3, .3, -1.3, .25],
  [3.5, -.08, .08, 1.56, -.15, -1.9, -.7],
  [4.2, -.14, -.04, .78, -.17, -1.1, -.6],
  [5, -.035, -.025, 0, 0, -.28, 0],
  [5.6, -.025, -.035, 0, 0, -.28, 0],
]
export function daphniaPose(time: number): DaphniaPose {
  const t = Math.min(5.6, Math.max(0, time))
  let i = 0
  while (i < frames.length - 2 && t > frames[i + 1][0]) i++
  const a = frames[i], b = frames[i + 1], mix = smooth((t - a[0]) / (b[0] - a[0]))
  const values = a.map((value, index) => value + (b[index] - value) * mix)
  const beat = (t / .68) % 1
  const stroke = beat < .24 ? smooth(beat / .24) : 1 - smooth((beat - .24) / .76)
  // A quick propulsive stroke, then slower recovery/glide. Fade to a stable
  // capture interval, without pulling the animal back to the well centre.
  const kick = (smooth(beat / .24) - beat) * .026 * (1 - smooth((t - 4.6) / .8))
  return { x: values[1] + Math.sin(values[5]) * kick, y: values[2] - Math.cos(values[5]) * kick,
    yaw: values[3], pitch: values[4], roll: values[5], depth: values[6], stroke, time: t }
}
export function focusBlur(depth: number) { return Math.max(0, Math.abs(depth) - .06) * 3.2 }
export function measurablePose(pose: DaphniaPose) { return Math.abs(pose.yaw) < .12 && Math.abs(pose.pitch) < .06 && focusBlur(pose.depth) < .3 }
