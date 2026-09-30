import { useEffect, useRef, useState } from 'react'
import { MEASUREMENT_CYCLE_SECONDS, daphniaWells, ease, measurementState, wellScanOrder } from './daphniaMeasurementModel'
import { focusBlur } from './daphniaMotion'
import { makeDaphniaRenderer } from './daphniaRenderer'

// Anatomy and eye-to-tail-spine-base endpoints informed by Agatz et al., Fig. 1:
// https://doi.org/10.1007/s10646-015-1490-0. Original procedural illustration.
// The paper uses a Petri dish and a scanner; the 4×4 plate and feedback workflow
// here are a product concept, with illustrative (not experimentally measured) data.
export default function DaphniaMeasurement({ animate = true, compact = false, onCycleComplete }: { animate?: boolean; compact?: boolean; onCycleComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elapsed = useRef(0)
  const [readout, setReadout] = useState({ completed: 0, phase: 'Finding a side view' })
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let moving = animate && !media.matches
    let frame = 0, last = 0, visible = false, disposed = false, width = 1, height = 1, previous = ''
    const renderAnimal = makeDaphniaRenderer()
    function draw() {
      if (!ctx) return
      const s = measurementState(elapsed.current, moving)
      const key = `${s.completed}:${s.phase}`
      if (key !== previous) { previous = key; setReadout({ completed: s.completed, phase: s.phase }) }
      ctx.clearRect(0, 0, width, height)
      const top = compact ? 24 : 126, bottom = width < 400 ? 270 : 210
      const available = Math.max(110, height - top - bottom)
      const cx = width / 2, cy = top + available / 2
      const large = Math.min(width * .69, available * .76)
      const pitch = Math.min(width / 8.1, available / 8.1)
      const diameter = large * (1 - s.zoom) + pitch * .77 * s.zoom
      const spacing = pitch * s.zoom + large * 1.3 * (1 - s.zoom)
      const active = new Set(wellScanOrder.slice(0, s.completed))
      ctx.save(); ctx.beginPath(); ctx.rect(12, top - 10, width - 24, available + 20); ctx.clip(); ctx.globalAlpha = s.opacity
      // World coordinates translate beneath a stationary central objective.
      const ox = cx - s.col * spacing, oy = cy - s.row * spacing
      if (s.zoom > 0) {
        ctx.save(); ctx.globalAlpha *= s.zoom
        ctx.fillStyle = '#10302f26'; ctx.strokeStyle = '#5bbdbb4d'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(ox - spacing * .61, oy - spacing * .61, spacing * 4.22, spacing * 4.22, spacing * .2); ctx.fill(); ctx.stroke()
        ctx.restore()
      }
      daphniaWells.forEach((well, i) => {
        if (i !== 0 && s.zoom < .02) return
        const x = ox + well.col * spacing, y = oy + well.row * spacing, r = diameter / 2
        const deadDetected = well.dead && active.has(i)
        ctx.save(); if (i !== 0) ctx.globalAlpha *= s.zoom
        // The close-up is an unobstructed rectangular camera view. Well
        // circles appear only as the animal becomes a dot in the plate overview.
        ctx.save(); ctx.globalAlpha *= ease((s.zoom - .35) / .55)
        ctx.fillStyle = deadDetected ? '#672e3028' : active.has(i) ? '#0abfbc0c' : '#0a272733'
        ctx.strokeStyle = deadDetected ? '#91494ab0' : active.has(i) ? '#63e7e599' : '#65b9b868'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#6ccecc24'; ctx.beginPath(); ctx.arc(x, y, r * .93, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
        if (i === 0 && s.zoom < 1) {
          ctx.save(); ctx.beginPath()
          ctx.rect(cx - diameter * .56, cy - diameter * .56, diameter * 1.12, diameter * 1.12); ctx.clip()
          const pose = s.pose
          // Freeze the actual good frame in place; never snap the animal to centre.
          ctx.translate(x + pose.x * large * (1 - s.zoom), y + pose.y * large * (1 - s.zoom))
          ctx.rotate(pose.roll)
          const animalScale = large / 195 * (1 - s.zoom) * (1 + pose.depth * .04)
          ctx.globalAlpha *= 1 - ease((s.zoom - .4) / .5)
          const layer = renderAnimal(pose)
          ctx.save()
          // Gaussian defocus is applied once to the composited animal only.
          // Well edges, viewport and measurement UI stay on the focal plane.
          ctx.filter = `blur(${(focusBlur(pose.depth) * Math.max(.7, animalScale)).toFixed(2)}px)`
          ctx.globalAlpha *= 1 - Math.min(.22, Math.abs(pose.depth) * .18)
          ctx.drawImage(layer, -96 * animalScale, -96 * animalScale, 192 * animalScale, 192 * animalScale)
          ctx.restore()
          if (s.measure > 0) {
            ctx.save(); ctx.scale(animalScale, animalScale); ctx.globalAlpha *= s.measure
            ctx.strokeStyle = '#ddfffe'; ctx.lineWidth = 1
            // Eye anterior (-9,-46) to tail-spine base (8,43), excluding spine.
            ctx.beginPath(); ctx.moveTo(-9, -46); ctx.lineTo(37, -55); ctx.moveTo(8, 43); ctx.lineTo(54, 34)
            ctx.moveTo(32, -54); ctx.lineTo(49, 35)
            ctx.moveTo(28, -53); ctx.lineTo(36, -55); ctx.moveTo(45, 36); ctx.lineTo(53, 34); ctx.stroke()
            ctx.fillStyle = '#e3ffff'; ctx.font = '14px "DM Sans", sans-serif'; ctx.fillText('2.84 mm', 40, -12)
            for (const [px, py] of [[-9, -46], [8, 43]]) { ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill() }
            ctx.restore()
          }
          ctx.restore()
        }
        if (s.zoom > .35 || i !== 0) {
          ctx.save(); ctx.globalAlpha *= i === 0 ? ease((s.zoom - .35) / .5) : 1
          const pulse = active.has(i) ? 1 : .55
          // Independent, bounded movement inside each well. The plate still
          // translates as one sample; B2 has no local motion or pulsing glow.
          const localTime = elapsed.current, phase = i * 2.39996
          const amplitude = moving && !well.dead ? Math.min(3.2, r * .24) * s.zoom : 0
          const dx = amplitude * (.72 * Math.sin(localTime * (.95 + i * .023) + phase) + .28 * Math.sin(localTime * 1.83 + phase))
          const dy = amplitude * (.7 * Math.cos(localTime * (.78 + i * .019) + phase) + .3 * Math.sin(localTime * 1.41 + phase))
          ctx.shadowColor = well.dead ? 'transparent' : '#39e5e2'; ctx.shadowBlur = !well.dead && active.has(i) ? 7 : 0
          ctx.fillStyle = deadDetected ? '#934343' : `rgba(116,249,247,${pulse})`
          ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore()

        }
        if (s.zoom > .9 && !compact) {
          ctx.fillStyle = deadDetected ? '#d7948e' : '#88bdbc'; ctx.font = '14px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(well.id, x, y - r - 3)
        }
        ctx.restore()
      })
      // The viewport scales with the overview transition, then remains fixed
      // in the exact same position throughout the 16-well stage movement.
      const side = diameter * 1.12, half = side / 2, corner = Math.min(12, side * .22)
      // Camera exposure stays inside the objective frame. A single mint-white
      // flash marks capture before the measurement overlay is revealed.
      if (s.shutter > 0) {
        ctx.save()
        ctx.globalAlpha *= s.shutter
        ctx.fillStyle = '#d9fffe54'
        ctx.fillRect(cx - half, cy - half, side, side)
        ctx.strokeStyle = '#defffe'
        ctx.lineWidth = 2
        ctx.shadowColor = '#91fffd'
        ctx.shadowBlur = 12
        ctx.strokeRect(cx - half, cy - half, side, side)
        ctx.restore()
      }
      ctx.strokeStyle = '#72e9e73d'; ctx.lineWidth = 1; ctx.strokeRect(cx - half, cy - half, side, side)
      ctx.strokeStyle = '#b5fffe'; ctx.lineWidth = 1.5
      for (const a of [-1, 1]) for (const b of [-1, 1]) {
        const x = cx + a * half, y = cy + b * half
        ctx.beginPath(); ctx.moveTo(x - a * corner, y); ctx.lineTo(x, y); ctx.lineTo(x, y - b * corner); ctx.stroke()
      }
      ctx.restore()
    }
    function tick(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden || !moving) return
      if (now - last >= 30) { elapsed.current += Math.min((now - last) / 1000, .1); last = now; if (onCycleComplete && elapsed.current >= MEASUREMENT_CYCLE_SECONDS) { onCycleComplete(); return } draw() }
      frame = requestAnimationFrame(tick)
    }
    function resume() { if (!frame && visible && !document.hidden && moving && !disposed) { last = performance.now(); frame = requestAnimationFrame(tick) } }
    function resize() {
      const bounds = canvas!.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(width * dpr); canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); draw()
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const io = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) resume(); else { cancelAnimationFrame(frame); frame = 0 } }); io.observe(canvas)
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; resume() }
    const motionChange = () => { moving = animate && !media.matches; cancelAnimationFrame(frame); frame = 0; draw(); resume() }
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', motionChange); resize()
    return () => { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motionChange) }
  }, [animate, compact, onCycleComplete])
  const acquired = new Set(wellScanOrder.slice(0, readout.completed))
  return <div className={`ai-paper-visual ai-daphnia-visual${compact ? ' ai-paper-compact' : ''}`} data-phase={readout.phase}>
    <canvas ref={canvasRef} role="img" aria-label="Illustrative Daphnia body-length workflow: a three-dimensional particle animal swims with antenna strokes, turns between frontal, oblique and lateral views, and moves in and out of focus before a clear side view is captured, measured from eye to tail-spine base, then the sample moves beneath a fixed field of view to measure a 4 by 4 plate of 16 wells. Living individuals move gently inside their wells. B2 remains still and initially teal; after it is scanned, it turns dark red and its result below is labelled dead. There is no dead label on the plate. All values and states are simulated." />
    <div className="ai-daphnia-readout" aria-label="Simulated body length results in millimetres">
      <div className="ai-daphnia-status"><span>{readout.phase}</span><strong>{readout.completed.toString().padStart(2, '0')} / 16</strong></div>
      <div className="ai-daphnia-values">{daphniaWells.map((well, i) => <div key={well.id} className={acquired.has(i) ? `is-measured${well.dead ? ' is-dead' : ''}` : ''}><span>{well.id}</span><strong>{acquired.has(i) ? well.dead ? 'dead' : well.length.toFixed(2) : '—'}</strong></div>)}</div>
      <div className="ai-daphnia-unit">Body length · mm <span>Demo</span></div>
    </div>
  </div>
}
