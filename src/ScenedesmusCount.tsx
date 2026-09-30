import { useEffect, useRef, useState } from 'react'

import { COUNT_CYCLE_SECONDS, colonies, countScanState } from './scenedesmusModel'

const W = 1000, FIELD = 600, OFFSET = 400

export default function ScenedesmusCount({ animate = true, compact = false, onCycleComplete }: { animate?: boolean; compact?: boolean; onCycleComplete?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const elapsed = useRef(0)
  const [counts, setCounts] = useState({ cells: 0, clusters: 0 })
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let moving = animate && !reducedMotion.matches
    let frame = 0, last = 0, visible = false, disposed = false, width = 1, height = 1
    let previousCells = -1, previousClusters = -1
    function draw() {
      if (!ctx) return
      const time = elapsed.current, state = countScanState(time, moving)
      ctx.clearRect(0, 0, width, height)
      const insetTop = compact ? 12 : 125, bottom = compact ? 70 : 82
      const available = Math.max(40, height - insetTop - bottom)
      // Leave room above and below the stationary objective for stage travel.
      const scale = Math.min(width * .86 / W, available / (FIELD + 2 * OFFSET))
      const fw = W * scale, fh = FIELD * scale
      const left = (width - fw) / 2
      const fy = insetTop + (available - fh) / 2
      const sampleTop = fy - state.travel * OFFSET * scale
      const line = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      }
      ctx.save()
      ctx.beginPath(); ctx.rect(left, insetTop, fw, available); ctx.clip()
      ctx.globalAlpha = state.opacity
      // A single mosaic: the lower acquisition starts at y=400, sharing the
      // upper field's y=400..600 strip. Only its new y=600..1000 strip is added.
      for (const region of [
        { start: 0, end: FIELD, alpha: state.upper },
        { start: FIELD, end: OFFSET + FIELD, alpha: state.lower },
      ]) {
        if (region.alpha <= 0) continue
        const y0 = sampleTop + region.start * scale
        const rh = (region.end - region.start) * scale
        ctx.save(); ctx.beginPath(); ctx.rect(left, y0, fw, rh); ctx.clip()
        ctx.globalAlpha = region.alpha * state.opacity
        ctx.lineWidth = .65
        // Grid lines and algae belong to the acquired image and move together.
        for (let gx = 0; gx <= W; gx += 50) {
          ctx.strokeStyle = 'rgba(90,189,187,.21)'
          line(left + gx * scale, y0, left + gx * scale, y0 + rh)
          if (gx % 200 === 0) for (const d of [-3, 3]) {
            ctx.strokeStyle = 'rgba(122,213,211,.23)'
            line(left + (gx + d) * scale, y0, left + (gx + d) * scale, y0 + rh)
          }
        }
        for (let gy = 0; gy <= OFFSET + FIELD; gy += 50) {
          const yy = sampleTop + gy * scale
          ctx.strokeStyle = 'rgba(90,189,187,.21)'; line(left, yy, left + fw, yy)
          if (gy % 200 === 0) for (const d of [-3, 3]) {
            ctx.strokeStyle = 'rgba(122,213,211,.23)'; line(left, yy + d * scale, left + fw, yy + d * scale)
          }
        }
        for (const c of colonies) {
          if (c.y + c.radius < region.start || c.y - c.radius > region.end) continue
          const flagged = c.y + c.radius <= state.scannedY && c.review
          const color = flagged ? '172,238,164' : '10,191,188'
          for (const p of c.points) {
            const motion = moving ? .23 : 0
            const px = left + (c.x + p.x) * scale + Math.sin(time * 1.6 + p.phase) * motion
            const py = sampleTop + (c.y + p.y) * scale + Math.cos(time * 1.3 + p.phase) * motion
            const shimmer = moving ? .91 + .09 * Math.sin(time * 2 + p.phase) : 1
            ctx.fillStyle = `rgba(${color},${(.32 + p.light * .6) * shimmer})`
            ctx.beginPath(); ctx.arc(px, py, Math.max(.28, scale * (.65 + p.light * .45)), 0, Math.PI * 2); ctx.fill()
          }
          if (flagged) {
            const px = left + c.x * scale, py = sampleTop + c.y * scale, r = c.radius * scale + 3
            ctx.strokeStyle = `rgba(182,244,170,${moving ? .55 + .2 * Math.sin(time * 2) : .7})`
            ctx.lineWidth = .9
            for (const a of [-1, 1]) for (const b of [-1, 1]) {
              ctx.beginPath(); ctx.moveTo(px + a * (r - 5), py + b * r); ctx.lineTo(px + a * r, py + b * r); ctx.lineTo(px + a * r, py + b * (r - 5)); ctx.stroke()
            }
          }
        }
        ctx.restore()
      }
      ctx.restore()
      // This rectangle never moves: the sample translates beneath the objective.
      ctx.strokeStyle = '#76fffd8c'; ctx.lineWidth = 1
      ctx.strokeRect(left - 4, fy - 4, fw + 8, fh + 8)
      ctx.lineWidth = 2; ctx.strokeStyle = '#b4fffe'
      for (const a of [0, 1]) for (const b of [0, 1]) {
        const px = left - 4 + a * (fw + 8), py = fy - 4 + b * (fh + 8), dx = a ? -1 : 1, dy = b ? -1 : 1
        ctx.beginPath(); ctx.moveTo(px + dx * 12, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * 12); ctx.stroke()
      }
      if (state.cells !== previousCells || state.clusters !== previousClusters) {
        previousCells = state.cells; previousClusters = state.clusters
        setCounts({ cells: state.cells, clusters: state.clusters })
      }
    }
    function tick(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden || !moving) return
      if (now - last >= 33) { elapsed.current += Math.min((now - last) / 1000, .1) * 2; last = now; if (onCycleComplete && elapsed.current >= COUNT_CYCLE_SECONDS) { onCycleComplete(); return } draw() }
      frame = requestAnimationFrame(tick)
    }
    function resume() { if (!frame && visible && !document.hidden && moving && !disposed) { last = performance.now(); frame = requestAnimationFrame(tick) } }
    function resize() {
      const rect = canvas!.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(width * dpr); canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); draw()
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const io = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) resume(); else { cancelAnimationFrame(frame); frame = 0 } }); io.observe(canvas)
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; resume() }
    const motionChange = () => { moving = animate && !reducedMotion.matches; cancelAnimationFrame(frame); frame = 0; draw(); resume() }
    document.addEventListener('visibilitychange', visibility)
    reducedMotion.addEventListener('change', motionChange)
    resize()
    return () => { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); reducedMotion.removeEventListener('change', motionChange) }
  }, [animate, compact, onCycleComplete])
  return <div className={`ai-paper-visual ai-count-visual${compact ? ' ai-paper-compact' : ''}`}>
    <canvas ref={ref} role="img" aria-label="Illustrative Scenedesmus scan: a fixed central field of view with the sample moving upward between two overlapping acquisitions. The acquired images form a continuous mosaic, with no advance grid or scanning beam. Teal particles show cells; mint brackets mark unresolved clusters. Overlapping fields are counted once." />
    <div className="ai-count-readout" aria-label="Illustrative scan counts">
      <div><strong>{counts.cells.toString().padStart(3, '0')}</strong><span>Cells counted</span></div>
      <div className="ai-count-review"><strong>{counts.clusters.toString().padStart(2, '0')}</strong><span>Clusters to review</span></div>
    </div>
  </div>
}
