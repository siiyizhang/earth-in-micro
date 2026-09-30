import { useEffect, useRef, useState } from 'react'

type Dot = { x: number; y: number; strength: number; phase: number; color: number }
type Scene = { hand: HTMLCanvasElement; surface: HTMLCanvasElement; mask: HTMLCanvasElement; dots: Dot[]; width: number; height: number }
const src = '/images/product/portable-microscope-cutout.png'
let cachedScene: Promise<Scene> | undefined

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')
  return { canvas, ctx }
}
function loadScene(): Promise<Scene> {
  if (cachedScene) return cachedScene
  cachedScene = new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const width = 660, height = Math.round(width * image.naturalHeight / image.naturalWidth)
        const photo = makeCanvas(width, height), surface = makeCanvas(width, height), mask = makeCanvas(width, height)
        photo.ctx.drawImage(image, 0, 0, width, height)
        const pixels = photo.ctx.getImageData(0, 0, width, height)
        const material = surface.ctx.createImageData(width, height), stencil = mask.ctx.createImageData(width, height)
        const dots: Dot[] = []
        let seed = 93019
        const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2], alpha = pixels.data[i + 3]
          if (!alpha) continue
          const luma = r * .299 + g * .587 + b * .114, chroma = Math.max(r, g, b) - Math.min(r, g, b)
          // Below the fingers, all opaque pixels belong to the microscope. Above them,
          // only the neutral dark handle is selected; skin remains photographic.
          const device = y / height > .405 || (y / height > .275 && r < g * 1.32 + 8 && (luma < 100 || (luma < 170 && chroma < 26)))
          if (!device) continue
          stencil.data[i] = stencil.data[i + 1] = stencil.data[i + 2] = 255; stencil.data[i + 3] = alpha
          material.data[i] = 5 + luma * .085
          material.data[i + 1] = 21 + luma * .19
          material.data[i + 2] = 25 + luma * .21
          material.data[i + 3] = alpha
          if (x % 2 === 0 && y % 2 === 0 && alpha > 210 && random() < .42) {
            dots.push({ x: x + random(), y: y + random(), strength: .28 + luma / 255 * .72, phase: random() * Math.PI * 2, color: random() > .87 ? 1 : 0 })
          }
        }
        surface.ctx.putImageData(material, 0, 0); mask.ctx.putImageData(stencil, 0, 0)
        const hand = makeCanvas(width, height)
        hand.ctx.drawImage(photo.canvas, 0, 0)
        hand.ctx.globalCompositeOperation = 'destination-out'; hand.ctx.drawImage(mask.canvas, 0, 0)
        resolve({ hand: hand.canvas, surface: surface.canvas, mask: mask.canvas, dots, width, height })
      } catch (error) { reject(error) }
    }
    image.onerror = () => reject(new Error('Microscope image unavailable'))
    image.src = src
  })
  void cachedScene.catch(() => { cachedScene = undefined })
  return cachedScene
}

export default function PortableMicroscopeParticles({ animate = true }: { animate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const elapsed = useRef(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let disposed = false, visible = false, frame = 0, last = 0, width = 1, height = 1
    let scene: Scene | undefined, particles: ReturnType<typeof makeCanvas> | undefined
    const mobile = window.matchMedia('(max-width: 700px)').matches
    const colors = ['10,191,188', '157,229,228']
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let moving = animate && !reducedMotion.matches
    function draw() {
      if (!ctx || !scene || !particles) return
      const { ctx: fx } = particles
      const t = elapsed.current
      fx.clearRect(0, 0, scene.width, scene.height)
      fx.globalCompositeOperation = 'source-over'
      const step = Math.max(1, Math.ceil(scene.dots.length / (mobile ? 4300 : 7200)))
      const position = (p: Dot, at: number) => ({
        x: p.x + Math.sin(at * 1.4 + p.phase) * 5.5 + Math.sin(at * .6 + p.y * .019) * 3,
        y: p.y + Math.cos(at * 1.15 + p.phase) * 5 + Math.sin(at * .9 + p.x * .012) * 3,
      })
      for (let i = 0; i < scene.dots.length; i += step) {
        const p = scene.dots[i], now = position(p, t), before = position(p, Math.max(0, t - .15))
        const pulse = (Math.sin(t * 1.6 + p.phase) + 1) / 2
        const alpha = (.35 + p.strength * .38 + pulse * .22)
        fx.strokeStyle = `rgba(${colors[p.color]},${alpha * .30})`; fx.lineWidth = .8
        fx.beginPath(); fx.moveTo(before.x, before.y); fx.lineTo(now.x, now.y); fx.stroke()
        fx.fillStyle = `rgba(${colors[p.color]},${alpha})`
        fx.beginPath(); fx.arc(now.x, now.y, .62 + p.strength * .55 + pulse * .14, 0, Math.PI * 2); fx.fill()
      }
      // Clip every moving dot to the real image alpha, including the handle and tabs.
      fx.globalCompositeOperation = 'destination-in'; fx.drawImage(scene.mask, 0, 0)
      fx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, width, height)
      const scale = Math.min(width / scene.width, height / scene.height)
      const w = scene.width * scale, h = scene.height * scale, x = (width - w) / 2, y = (height - h) / 2
      // All layers share one transform; the canvas is transparent outside the subject.
      ctx.drawImage(scene.hand, x, y, w, h)
      ctx.drawImage(scene.surface, x, y, w, h)
      ctx.drawImage(particles.canvas, x, y, w, h)
      ctx.globalAlpha = 1
      // Fade the cropped wrist into the page rather than showing a straight photo edge.
      ctx.globalCompositeOperation = 'destination-in'
      const fade = ctx.createLinearGradient(0, y, 0, y + h * .14)
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)')
      ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
    }
    function tick(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden || !moving) return
      if (now - last >= (mobile ? 40 : 30)) { elapsed.current += Math.min((now - last) / 1000, .08); last = now; draw() }
      frame = requestAnimationFrame(tick)
    }
    function resume() { if (!frame && visible && !disposed && !document.hidden && moving) { last = performance.now(); frame = requestAnimationFrame(tick) } }
    function resize() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw()
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const io = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) { draw(); resume() } else { cancelAnimationFrame(frame); frame = 0 } }); io.observe(canvas)
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else resume() }
    const motionChange = () => { moving = animate && !reducedMotion.matches; draw(); if (moving) resume(); else { cancelAnimationFrame(frame); frame = 0 } }
    reducedMotion.addEventListener('change', motionChange)
    document.addEventListener('visibilitychange', visibility)
    void loadScene().then(value => { if (!disposed) { scene = value; particles = makeCanvas(value.width, value.height); setFailed(false); resize(); resume() } }).catch(() => { if (!disposed) setFailed(true) })
    resize()
    return () => { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); reducedMotion.removeEventListener('change', motionChange) }
  }, [animate])
  return <div className="ai-portable-particle-visual"><canvas ref={ref} role="img" aria-label="A hand holding a portable microscope, its complete body rendered as gently flowing teal particles"/>{failed && <img src={src} alt="A hand holding the portable Eureka microscope"/>}</div>
}
