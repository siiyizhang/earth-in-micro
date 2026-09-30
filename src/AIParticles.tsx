import { useEffect, useRef } from 'react'

type Variant = 'ambient' | 'organism' | 'stream'

/** Decorative, deterministic point clouds. No microscopy data is represented. */
export default function AIParticles({ variant = 'organism', mode = 0, animate = true }: { variant?: Variant; mode?: number; animate?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)
  const drawRef = useRef<(() => void) | null>(null)

  useEffect(() => { modeRef.current = mode; drawRef.current?.() }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    const host = canvas.parentElement
    if (!host) return
    let width = 1, height = 1, frame = 0, last = 0, time = 0, visible = true, disposed = false
    let pointerX = -1000, pointerY = -1000
    let seed = 7813
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const mobile = window.matchMedia('(max-width: 700px)').matches
    const count = variant === 'ambient' ? (mobile ? 95 : 210) : variant === 'stream' ? (mobile ? 430 : 1050) : (mobile ? 1500 : 3400)
    const particles = Array.from({ length: count }, (_, index) => ({
      u: random(), v: random(), w: random(), phase: random() * Math.PI * 2,
      size: .45 + random() * 1.15, x: 0, y: 0, initialized: false, cluster: index % 10,
    }))
    const palette = ['10, 191, 188', '108, 217, 215', '64, 205, 202']
    const glow = document.createElement('canvas'); glow.width = 32; glow.height = 32
    const glowContext = glow.getContext('2d')
    if (glowContext) {
      const gradient = glowContext.createRadialGradient(16, 16, 0, 16, 16, 16)
      gradient.addColorStop(0, 'rgba(154,240,239,.55)'); gradient.addColorStop(.2, 'rgba(40,199,196,.18)'); gradient.addColorStop(1, 'rgba(40,199,196,0)')
      glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 32, 32)
    }

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)
      const currentMode = modeRef.current
      const scale = Math.min(width, height)
      if (variant === 'organism') {
        const halo = ctx.createRadialGradient(width * .51, height * .53, 0, width * .51, height * .53, scale * .49)
        halo.addColorStop(0, `rgba(${palette[currentMode]},.055)`); halo.addColorStop(1, `rgba(${palette[currentMode]},0)`)
        ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height)
      }
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        let tx: number, ty: number, depth = .5
        if (variant === 'ambient') {
          tx = ((p.u * width + Math.sin(time * .06 + p.phase) * 22) + width) % width
          ty = ((p.v * height - time * (2 + p.w * 5)) % height + height) % height
          depth = p.w
        } else if (variant === 'stream') {
          const travel = (p.u + time * .024) % 1
          tx = travel * width
          ty = height * (.5 + Math.sin(travel * 7 + time * .15 + p.v * 1.5) * .2) + (p.w - .5) * height * .23
          depth = p.v
        } else {
          const phi = Math.acos(2 * p.v - 1)
          const theta = p.u * Math.PI * 2 + time * .085
          const wobble = 1 + .07 * Math.sin(theta * 5 + phi * 3 + time * .35)
          let x = Math.sin(phi) * Math.cos(theta), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta)
          if (currentMode === 0) {
            const nucleus = p.cluster === 0 || p.cluster === 1
            const radius = nucleus ? .092 : p.cluster === 8 ? .106 : p.cluster === 9 ? .076 : .285
            const centerX = p.cluster === 8 ? .16 : p.cluster === 9 ? .82 : .52
            const centerY = p.cluster === 8 ? .39 : p.cluster === 9 ? .69 : .54
            x *= radius * scale * wobble; y *= radius * scale * .89 * wobble; z *= radius * scale
            tx = width * centerX + x + z * .16
            ty = height * centerY + y + Math.sin(time * .18 + p.cluster) * 5
          } else if (currentMode === 1) {
            const strand = p.cluster % 3
            const travel = (p.u + time * .019) % 1
            tx = width * (.1 + travel * .8)
            ty = height * (.37 + strand * .12 + Math.sin(travel * 7.5 + strand * .9 + time * .2) * .13) + Math.cos(p.v * Math.PI * 2) * scale * .034
            z = Math.sin(p.v * Math.PI * 2)
          } else {
            const angle = p.u * Math.PI * 2
            const radius = Math.sqrt(p.v) * scale * .32
            tx = width * .5 + Math.cos(angle) * radius
            ty = height * .52 + Math.sin(angle) * radius * .63 + Math.sin(p.u * 18 + time * .35) * 13 + (p.w - .5) * 35
            z = Math.sin(angle) * .5
          }
          depth = currentMode === 0 ? (z / scale + .3) / .6 : (z + 1) / 2
        }
        const dx = tx - pointerX, dy = ty - pointerY, distance = Math.hypot(dx, dy)
        if (animate && distance > 0 && distance < 105 && variant !== 'stream') {
          const force = (1 - distance / 105) * (variant === 'ambient' ? 25 : 21)
          tx += dx / distance * force; ty += dy / distance * force
        }
        if (!p.initialized || !animate) { p.x = tx; p.y = ty; p.initialized = true }
        else { p.x += (tx - p.x) * .07; p.y += (ty - p.y) * .07 }
        const alpha = variant === 'ambient' ? .16 + p.w * .34 : .22 + Math.max(0, Math.min(1, depth)) * .64
        const radius = p.size * (variant === 'ambient' ? .72 : .7 + depth * .5)
        ctx.fillStyle = `rgba(${variant === 'ambient' ? '114, 193, 192' : palette[currentMode]},${alpha})`
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.3, radius), 0, Math.PI * 2); ctx.fill()
        if (variant !== 'ambient' && i % 23 === 0) {
          ctx.globalAlpha = alpha * .5; ctx.drawImage(glow, p.x - 11, p.y - 11, 22, 22); ctx.globalAlpha = 1
        }
      }
      if (variant === 'organism') {
        // A moving light plane expresses acquisition without inventing image measurements.
        const sweep = height * (.22 + ((time * .045) % .56))
        const beam = ctx.createLinearGradient(width * .1, 0, width * .9, 0)
        beam.addColorStop(0, 'rgba(95,222,220,0)'); beam.addColorStop(.5, 'rgba(95,222,220,.22)'); beam.addColorStop(1, 'rgba(95,222,220,0)')
        ctx.strokeStyle = beam; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(width * .1, sweep); ctx.lineTo(width * .9, sweep); ctx.stroke()
      }
    }

    drawRef.current = draw

    function tick(now: number) {
      frame = 0
      if (disposed || !animate || !visible || document.hidden) return
      if (now - last >= (mobile ? 32 : 20)) { time += Math.min((now - last) / 1000, .05); last = now; draw() }
      frame = requestAnimationFrame(tick)
    }
    function resume() { if (!frame && animate && visible && !document.hidden && !disposed) { last = performance.now(); frame = requestAnimationFrame(tick) } }
    function resize() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      particles.forEach(p => { p.initialized = false }); draw(); resume()
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas)
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) resume(); else { cancelAnimationFrame(frame); frame = 0 } }, { rootMargin: '60px' }); intersection.observe(canvas)
    const onPointer = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); pointerX = event.clientX - rect.left; pointerY = event.clientY - rect.top }
    const onLeave = () => { pointerX = -1000; pointerY = -1000 }
    const pointerHost = variant === 'ambient' ? canvas.closest('.ai-page') : host
    if (animate) { pointerHost?.addEventListener('pointermove', onPointer as EventListener, { passive: true }); pointerHost?.addEventListener('pointerleave', onLeave) }
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else resume() }
    document.addEventListener('visibilitychange', onVisibility)
    resize()
    return () => { drawRef.current = null; disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); pointerHost?.removeEventListener('pointermove', onPointer as EventListener); pointerHost?.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', onVisibility) }
  }, [animate, variant])

  return <canvas ref={canvasRef} className={`ai-particles ai-particles-${variant}`} aria-hidden="true" />
}
