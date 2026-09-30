export const COUNT_CYCLE_SECONDS = 14
// Original procedural illustration, informed by Scenedesmus morphology and
// Neubauer chamber geometry. No pixels or organism positions from the paper.
type Particle = { x: number; y: number; phase: number; light: number }
type Colony = { x: number; y: number; cells: number; review: boolean; points: Particle[]; radius: number }
const W = 1000, FIELD = 600, OFFSET = 400
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t) }

function makeColonies(): Colony[] {
  let seed = 161207379
  const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
  const colonies: Colony[] = []
  for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
    if (random() < .14) continue
    const x = 50 + col * 100 + (random() - .5) * 50
    const y = 45 + row * 100 + (random() - .5) * 45
    const review = (row * 10 + col) % 13 === 3
    const cells = [1, 2, 4, 4, 4, 8][Math.floor(random() * 6)]
    const points: Particle[] = []
    const rotation = random() * Math.PI * 2
    const size = .85 + random() * .32
    const add = (px: number, py: number, angle: number, ox = 0, oy = 0, light = .6) => {
      points.push({ x: ox + Math.cos(angle) * px - Math.sin(angle) * py,
        y: oy + Math.sin(angle) * px + Math.cos(angle) * py,
        phase: random() * Math.PI * 2, light })
    }
    const body = (n: number, angle: number, ox = 0, oy = 0) => {
      for (let c = 0; c < n; c++) {
        const cx = (c - (n - 1) / 2) * 8.2 * size
        const cy = (c % 2 ? 1.3 : -1.3) * size
        // Packed elongated cells, with distinct cell walls and granular interiors.
        for (let p = 0; p < 45; p++) {
          const a = p / 45 * Math.PI * 2
          add(cx + Math.cos(a) * 3.4 * size, cy + Math.sin(a) * 10.5 * size, angle, ox, oy, .78 + random() * .22)
        }
        for (let p = 0; p < 35; p++) {
          const a = random() * Math.PI * 2, r = Math.sqrt(random())
          add(cx + Math.cos(a) * r * 2.8 * size, cy + Math.sin(a) * r * 9 * size, angle, ox, oy, .25 + random() * .5)
        }
        if ((c === 0 || c === n - 1) && n > 1) for (const side of [-1, 1]) {
          for (let p = 0; p < 11; p++) {
            const t = p / 10
            add(cx + (c === 0 ? -1 : 1) * t * t * 5 * size, cy + side * (9 + t * 9) * size, angle, ox, oy, .55)
          }
        }
      }
    }
    body(cells, rotation)
    if (review) body(4, rotation + 1.2, 8, 8)
    const radius = Math.max(25, cells * 4.7) * size + (review ? 12 : 0)
    colonies.push({ x: Math.max(radius + 3, Math.min(W - radius - 3, x)),
      y: Math.max(radius + 3, Math.min(1000 - radius - 3, y)), cells, review, points, radius })
  }
  return colonies
}
export const colonies = makeColonies()
export const countTotals = {
  cells: colonies.reduce((sum, c) => sum + (c.review ? 0 : c.cells), 0),
  clusters: colonies.filter(c => c.review).length,
}

// Both acquisitions share sample coordinates; their 200-unit overlap is never
// rendered or counted twice. Acquisition fades a whole field, not a scan line.
export function countScanState(time: number, moving: boolean) {
  const t = moving ? time % COUNT_CYCLE_SECONDS : 10
  const upper = ease((t - .3) / .8)
  const travel = ease((t - 3.2) / 2.4)
  const lower = ease((t - 5.8) / .8)
  const upperReady = t >= 1.15
  const lowerReady = t >= 6.65
  const scannedY = lowerReady ? OFFSET + FIELD : upperReady ? FIELD : 0
  const seen = colonies.filter(c => c.y + c.radius <= scannedY)
  const opacity = 1 - ease((t - 12.7) / .8)
  return { upper, lower, travel, scannedY, opacity,
    cells: seen.reduce((sum, c) => sum + (c.review ? 0 : c.cells), 0),
    clusters: seen.filter(c => c.review).length,
    complete: lowerReady,
  }
}
