import { useEffect, useRef, useState } from 'react'
import ScenedesmusCount from './ScenedesmusCount'
import DaphniaMeasurement from './DaphniaMeasurement'
import ParasiteClassification from './ParasiteClassification'

type Crop = [number, number, number, number]
type Point = { x: number; y: number; intensity: number; phase: number; cluster?: boolean }
type Specimen = { crop: Crop; name: string; group: number; points: Point[] }
type Scene = { image: HTMLImageElement; specimens: Specimen[] }
const paperSources = [
  { image: '/images/ai-research/chlorella-count.png', title: 'Low-Cost Microalgae Cell Concentration Estimation in Hydrochemistry Applications Using Computer Vision', author: 'Borisova et al.', journal: 'Sensors', year: '2025', figure: 'Figure 9 · automatic marking, sample No. 10', url: 'https://www.mdpi.com/1424-8220/25/15/4651', license: 'https://creativecommons.org/licenses/by/4.0/', detail: 'The published cell-detection marks become teal particles, retaining their positions in the upper-right image. The figure reports 170 cells for this sample. The animated scan is a visual interpretation, not a live detection result.' },
  { image: '/images/ai-research/plankton-morphology.webp', title: 'PlanktoScope: Affordable Modular Quantitative Imaging Platform for Citizen Oceanography', author: 'Pollina et al.', journal: 'Frontiers in Marine Science', year: '2022', figure: 'Figure 3C · six representative plankton morphologies', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.949428/full', license: 'https://creativecommons.org/licenses/by/4.0/', detail: 'Six color PlanktoScope vignettes are cropped from Figure 3C and rearranged to show horned, lobed, triangular, circular, chain-forming and radiating forms. Names follow the paper’s caption. Particle colors and grouping are adapted; the figure is not an AI classification output. Specimens are resized for comparison, not shown at a common scale.' },
  { image: '/images/ai-research/plankton-measurement.webp', title: 'PlanktoScope: Affordable Modular Quantitative Imaging Platform for Citizen Oceanography', author: 'Pollina et al.', journal: 'Frontiers in Marine Science', year: '2022', figure: 'Figure 5C · all six specimens', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.949428/full', license: 'https://creativecommons.org/licenses/by/4.0/', detail: 'All six Figure 5C specimens are rearranged into two columns without changing their proportions. Crosses show approximate horizontal length and vertical width of the visible silhouettes. Values are rounded estimates from the published raster and its 50 μm scale bar (approximately 122 image pixels), not the authors’ raw measurements or a reanalysis of the original microscopy data. The ≈ symbol denotes this uncertainty. A real workflow requires calibrated source images and a defined measurement method.' },
]
// Coordinates refer to the original published figures, excluding panel borders and text.
const specimenDefinitions: { crop: Crop; name: string; group: number }[][] = [
  [{ crop: [1605, 197, 1110, 790], name: 'Chlorella vulgaris', group: 0 }],
  [
    { crop: [9, 570, 163, 147], name: 'Ceratium', group: 0 },
    { crop: [213, 575, 106, 140], name: 'Dinophysis', group: 0 },
    { crop: [329, 997, 169, 136], name: 'Licmophora', group: 1 },
    { crop: [704, 994, 156, 160], name: 'Centric diatom', group: 1 },
    { crop: [890, 995, 141, 157], name: 'Chaetoceros', group: 1 },
    { crop: [1063, 995, 127, 158], name: 'Acantharea', group: 2 },
  ],
  [
    { crop: [86, 1591, 134, 108], name: '1', group: 0 },
    { crop: [297, 1616, 139, 61], name: '2', group: 0 },
    { crop: [514, 1626, 136, 39], name: '3', group: 0 },
    { crop: [729, 1626, 132, 32], name: '4', group: 0 },
    { crop: [948, 1631, 105, 24], name: '5', group: 0 },
    { crop: [1134, 1632, 123, 19], name: '6', group: 0 },
  ],
]
const cache = new Map<number, Promise<Scene>>()
function loadScene(mode: number): Promise<Scene> {
  const existing = cache.get(mode)
  if (existing) return existing
  const promise = new Promise<Scene>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const specimens = specimenDefinitions[mode].map(definition => {
          const w = mode === 0 ? 700 : 230, h = Math.round(w * definition.crop[3] / definition.crop[2])
          const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) throw new Error('Canvas unavailable')
          ctx.drawImage(image, ...definition.crop, 0, 0, w, h)
          const pixels = ctx.getImageData(0, 0, w, h).data, points: Point[] = []
          let seed = 39017
          const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
          const detectedPixels: number[] = []
          for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
            const luminance = (r + g + b) / 3, chroma = Math.max(r, g, b) - Math.min(r, g, b)
            const isDetectionMark = mode === 0 && r > 140 && r - g > 48 && r - b > 40
            const intensity = mode === 0
              ? (isDetectionMark ? Math.min(1, (r - g) / 115) : 0)
              : Math.max(0, Math.min(1, (mode === 2 ? (246 - luminance) / 130 : (224 - luminance) / 150) + (chroma > 28 ? chroma / 240 : 0)))
            if (mode === 0 && isDetectionMark) detectedPixels.push(y * w + x)
            if (intensity > (mode === 0 ? .1 : mode === 2 ? .035 : .09) && random() < (mode === 0 ? .85 : .28)) {
              points.push({ x: (x + random() * .7) / w, y: (y + random() * .7) / h, intensity, phase: random() * Math.PI * 2 })
            }
          }
          if (mode === 0) {
            // Group each red detection ring into a center, then flag close neighbors for review.
            const visited = new Uint8Array(w * h), centers: { x: number; y: number }[] = []
            for (const start of detectedPixels) {
              if (visited[start]) continue
              visited[start] = 1
              const queue = [start]; let sx = 0, sy = 0, count = 0
              for (let head = 0; head < queue.length; head++) {
                const at = queue[head], x = at % w, y = Math.floor(at / w); sx += x; sy += y; count++
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                  if (!dx && !dy) continue
                  const nx = x + dx, ny = y + dy, next = ny * w + nx
                  if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && !visited[next]) {
                    const j = next * 4, rr = pixels[j], gg = pixels[j + 1], bb = pixels[j + 2]
                    if (rr > 140 && rr - gg > 48 && rr - bb > 40) { visited[next] = 1; queue.push(next) }
                  }
                }
              }
              if (count >= 3 && count <= 120) centers.push({ x: sx / count, y: sy / count })
            }
            const nearby = centers.map((center, i) => centers.reduce((total, other, j) => total + (i !== j && Math.hypot(center.x - other.x, center.y - other.y) < 20 ? 1 : 0), 0) >= 1)
            for (const point of points) if (nearby.some((isCluster, i) => isCluster && Math.hypot(point.x * w - centers[i].x, point.y * h - centers[i].y) < 7)) point.cluster = true
          }
          return { ...definition, points }
        })
        resolve({ image, specimens })
      } catch (error) { reject(error) }
    }
    image.onerror = () => reject(new Error('Paper image could not be loaded'))
    image.src = paperSources[mode].image
  })
  cache.set(mode, promise)
  void promise.catch(() => cache.delete(mode))
  return promise
}

/** Particle interpretations of selected research figures, not instrument outputs. */
function ResearchParticles({ mode, animate = true, original = false, compact = false }: { mode: number; animate?: boolean; original?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const clock = useRef(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let disposed = false, frame = 0, visible = true, last = 0, scene: Scene | undefined
    let width = 1, height = 1, pointerX = -999, pointerY = -999
    const mobile = window.matchMedia('(max-width: 700px)').matches
    const palette = ['10,191,188', '183,244,207', '107,188,222']
    function draw() {
      if (!ctx || !scene) return
      ctx.clearRect(0, 0, width, height)
      const time = clock.current, reveal = animate ? Math.min(1, time / 0.575) : 1
      const left = width * .055, top = compact ? 10 : height * .29
      const bw = width * .89, bh = compact ? height - 20 : height * .50
      const scan = animate ? (time * .14) % 1 : 1
      const halo = ctx.createRadialGradient(width / 2, top + bh / 2, 0, width / 2, top + bh / 2, bw * .65)
      halo.addColorStop(0, '#168b892b'); halo.addColorStop(1, '#09292800')
      ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height)

      function text(value: string, x: number, y: number, color: string, size = 11, align: CanvasTextAlign = 'left') {
        if (!ctx) return
        ctx.font = `500 ${size}px "DM Sans", sans-serif`; ctx.textAlign = align
        ctx.fillStyle = color; ctx.fillText(value, x, y)
      }
      function plot(specimen: Specimen, x: number, y: number, w: number, h: number, index: number) {
        if (!ctx || !scene) return
        if (original) { ctx.drawImage(scene.image, ...specimen.crop, x, y, w, h); return }
        const color = palette[specimen.group]
        const skip = Math.max(1, Math.ceil(specimen.points.length / (mode === 0 ? 6000 : 1700)))
        for (let i = 0; i < specimen.points.length; i += skip) {
          const p = specimen.points[i], spread = (1 - reveal) * 22
          let px = x + p.x * w + Math.cos(p.phase) * spread, py = y + p.y * h + Math.sin(p.phase) * spread
          const distance = Math.hypot(px - pointerX, py - pointerY)
          if (mode !== 2 && animate && distance < 60 && distance > 0) { const force = (1 - distance / 60) * 2; px += (px - pointerX) / distance * force; py += (py - pointerY) / distance * force }
          const wave = Math.exp(-Math.pow(((px - left) / bw - scan) * 12, 2))
          const alpha = Math.min(1, .30 + p.intensity * .55 + (animate ? wave * .25 : 0)) * (.25 + reveal * .75)
          ctx.fillStyle = `rgba(${color},${alpha})`
          ctx.beginPath(); ctx.arc(px, py, (mode === 0 ? .55 : .48) + p.intensity * (compact ? .35 : .5), 0, Math.PI * 2); ctx.fill()
          if (i % 29 === 0 && animate && wave > .25) { ctx.fillStyle = `rgba(${color},.10)`; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill() }
        }
        if (mode === 1) {
          const alpha = animate ? .25 + .3 * (Math.sin(time * .7 + index) + 1) / 2 : .4
          ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = .7
          const a = 7, pad = 5
          ctx.beginPath(); ctx.moveTo(x - pad, y + a); ctx.lineTo(x - pad, y - pad); ctx.lineTo(x + a, y - pad)
          ctx.moveTo(x + w - a, y + h + pad); ctx.lineTo(x + w + pad, y + h + pad); ctx.lineTo(x + w + pad, y + h - a); ctx.stroke()
        }
      }
      if (mode === 0) {
        const specimen = scene.specimens[0]
        const imageScale = Math.min(bw / specimen.crop[2], bh / specimen.crop[3])
        const imageW = specimen.crop[2] * imageScale, imageH = specimen.crop[3] * imageScale
        const x = left + (bw - imageW) / 2, y = top + (bh - imageH) / 2
        const scanTime = time % 9, step = Math.min(8, Math.floor(scanTime / 0.86)), finished = scanTime >= 7.74
        const completed = finished ? 9 : step
        // Reveal only scanned fields; clustered detections use mint while individual marks use teal.
        if (!original) {
          scene.specimens[0].points.forEach(p => {
            const col = Math.min(2, Math.floor(p.x * 3)), row = Math.min(2, Math.floor(p.y * 3)), tile = row * 3 + col
            const isCurrent = !finished && tile === step
            if (tile >= completed && !isCurrent) return
            const px = x + p.x * imageW, py = y + p.y * imageH
            const wave = Math.exp(-Math.pow(((tile / 9) - (scanTime / 9)) * 10, 2))
            const color = p.cluster ? palette[1] : palette[0]
            const alpha = Math.min(1, .48 + p.intensity * .45 + (isCurrent ? wave * .25 : 0))
            ctx.fillStyle = `rgba(${color},${alpha})`; ctx.beginPath(); ctx.arc(px, py, .75 + p.intensity * .65, 0, Math.PI * 2); ctx.fill()
          })
        } else plot(specimen, x, y, imageW, imageH, 0)
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const tile = row * 3 + col, isDone = tile < completed, isCurrent = !finished && tile === step
          const bx = x + col * imageW / 3, by = y + row * imageH / 3, tw = imageW / 3, th = imageH / 3
          if (!original && (isDone || isCurrent)) {
            ctx.fillStyle = isCurrent ? '#45d3d111' : '#45d3d108'; ctx.fillRect(bx, by, tw, th)
          }
          ctx.strokeStyle = original ? '#0c39388c' : isCurrent ? '#5cf4f1' : isDone ? '#45d3d1df' : '#8ccbca3d'
          ctx.lineWidth = isCurrent ? 1.7 : 1; ctx.strokeRect(bx + .5, by + .5, tw - 1, th - 1)
          if (!original && isDone) {
            ctx.fillStyle = '#45d3d1'; ctx.font = '600 12px "DM Sans", sans-serif'; ctx.textAlign = 'right'; ctx.fillText('✓', bx + tw - 7, by + 16)
          }
        }
        if (!original) {
          if (finished) {
            text('170 cells', x + imageW - 2, y + imageH + 20, '#b7f4f3', compact ? 12 : 15, 'right')
            text('Nearby detections · review', x + 2, y + imageH + 20, `rgb(${palette[1]})`, compact ? 10 : 12)
          } else {
            text(`Scanning field ${step + 1} of 9`, x + imageW / 2, y + imageH + 20, '#b7f4f3', compact ? 11 : 14, 'center')
          }
        }
      } else if (mode === 1) {
        const cw = bw / 3, ch = bh / 2
        scene.specimens.forEach((specimen, i) => {
          const boxX = left + (i % 3) * cw, boxY = top + Math.floor(i / 3) * ch
          const scale = Math.min((cw - 24) / specimen.crop[2], (ch - 33) / specimen.crop[3])
          const w = specimen.crop[2] * scale, h = specimen.crop[3] * scale
          plot(specimen, boxX + (cw - w) / 2, boxY + (ch - 29 - h) / 2, w, h, i)
          text(specimen.name, boxX + cw / 2, boxY + ch - 7, `rgb(${palette[specimen.group]})`, Math.min(12, Math.max(10.5, cw / 9.7)), 'center')
        })
      } else {
        const cw = bw / 2, ch = bh / 3
        // One common display scale preserves the six silhouettes' relative dimensions.
        const scale = Math.min((cw * .53 - 10) / 139, (ch - 20) / 108)
        scene.specimens.forEach((specimen, i) => {
          const boxX = left + (i % 2) * cw, boxY = top + Math.floor(i / 2) * ch
          const w = specimen.crop[2] * scale, h = specimen.crop[3] * scale
          const cx = boxX + cw * .265, cy = boxY + ch / 2
          const x = cx - w / 2, y = cy - h / 2
          plot(specimen, x, y, w, h, i)
          if (original) return
          ctx.strokeStyle = '#d2fffeb0'; ctx.lineWidth = .8
          ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h)
          const tick = compact ? 2.5 : 3.5
          ctx.moveTo(x, cy - tick); ctx.lineTo(x, cy + tick); ctx.moveTo(x + w, cy - tick); ctx.lineTo(x + w, cy + tick)
          ctx.moveTo(cx - tick, y); ctx.lineTo(cx + tick, y); ctx.moveTo(cx - tick, y + h); ctx.lineTo(cx + tick, y + h); ctx.stroke()
          const tx = boxX + cw * .57, font = Math.min(12, Math.max(11, cw / 14.4))
          // Approximate figure-pixel extents / the publication's 122 px, 50 μm scale bar.
          const length = Math.round(specimen.crop[2] * 50 / 122), widthValue = Math.round(specimen.crop[3] * 50 / 122)
          text(`L ≈ ${length} μm`, tx, cy - 3, '#d2fffe', font)
          text(`W ≈ ${widthValue} μm`, tx, cy + font + 2, '#82cbca', font)
        })
      }
      if (animate && !original && !compact) {
        const beam = ctx.createLinearGradient(0, top, 0, top + bh)
        beam.addColorStop(0, '#68dfdd00'); beam.addColorStop(.5, '#68dfdd4a'); beam.addColorStop(1, '#68dfdd00')
        ctx.strokeStyle = beam; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(left + scan * bw, top); ctx.lineTo(left + scan * bw, top + bh); ctx.stroke()
      }
    }
    function tick(now: number) {
      frame = 0
      if (disposed || !visible || document.hidden || !animate || original) return
      if (now - last >= (mobile ? 40 : 30)) { clock.current += Math.min((now - last) / 1000, .08); last = now; draw() }
      frame = requestAnimationFrame(tick)
    }
    function resume() { if (!frame && !disposed && visible && !document.hidden && animate && !original) { last = performance.now(); frame = requestAnimationFrame(tick) } }
    function resize() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw()
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const io = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) resume(); else { cancelAnimationFrame(frame); frame = 0 } }); io.observe(canvas)
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else resume() }
    const pointer = (event: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointerX = event.clientX - r.left; pointerY = event.clientY - r.top }
    const leave = () => { pointerX = -999; pointerY = -999 }
    canvas.parentElement?.addEventListener('pointermove', pointer)
    canvas.parentElement?.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', visibility)
    void loadScene(mode).then(value => { if (!disposed) { scene = value; setFailed(false); resize(); resume() } }).catch(() => { if (!disposed) setFailed(true) })
    resize()
    return () => { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', visibility); canvas.parentElement?.removeEventListener('pointermove', pointer); canvas.parentElement?.removeEventListener('pointerleave', leave) }
  }, [mode, animate, original, compact])
  return <div className={`ai-paper-visual${compact ? ' ai-paper-compact' : ''}`}><canvas ref={ref} role="img" aria-label={`${original ? 'Published image crops' : 'Particle interpretation'}: ${paperSources[mode].figure}. ${paperSources[mode].detail}`} />{failed && <p className="ai-paper-error">Image unavailable. <a href={paperSources[mode].url}>View the paper</a></p>}</div>
}

type PaperParticlesProps = { mode: number; animate?: boolean; original?: boolean; compact?: boolean; onCycleComplete?: () => void }
export default function PaperParticles(props: PaperParticlesProps) {
  return props.mode === 0
    ? <ScenedesmusCount animate={props.animate} compact={props.compact} onCycleComplete={props.onCycleComplete} />
    : props.mode === 2
      ? <DaphniaMeasurement animate={props.animate} compact={props.compact} onCycleComplete={props.onCycleComplete} />
      : props.mode === 1 ? <ParasiteClassification animate={props.animate} compact={props.compact} onCycleComplete={props.onCycleComplete} /> : <ResearchParticles {...props} />
}

export function PaperCredit({ mode }: { mode: number }) {
  if (mode === 0 || mode === 1 || mode === 2) return null
  const source = paperSources[mode]
  return <a className="ai-paper-credit" href={source.url} target="_blank" rel="noreferrer">
    {source.author} · {source.journal} ({source.year}) · CC BY 4.0 <span aria-hidden="true">↗</span>
  </a>
}
