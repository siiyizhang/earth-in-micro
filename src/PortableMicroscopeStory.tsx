import { useEffect, useRef } from 'react'
import PortableMicroscopeParticles from './PortableMicroscopeParticles'
import MicroscopeDevices from './MicroscopeDevices'

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

export default function PortableMicroscopeStory({ animate }: { animate: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const track = trackRef.current, stage = stageRef.current
    if (!track || !stage) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, last = 0, displayedShift = 0
    function update(now: number) {
      frame = 0
      if (!track || !stage || document.hidden) return
      const dt = last ? Math.min(now - last, 80) : 0
      last = now
      const moving = animate && !preference.matches
      const top = track.getBoundingClientRect().top, vh = window.innerHeight
      // Begin before the raised laptop reaches the navigation, rather than
      // waiting until the scene has already passed behind the sticky header.
      const headerBottom = track.closest('.ai-page')?.querySelector('.ai-header')?.getBoundingClientRect().bottom ?? 84
      const laptopOverhang = window.innerWidth > 800 ? Math.max(0, stage.clientHeight - 90) * .14 : 0
      const transitionStart = headerBottom + laptopOverhang + vh * .22
      const desiredShift = !moving ? 1 :
        smooth((transitionStart - top) / Math.max(1, (transitionStart - headerBottom) * .5))
      displayedShift = moving ? displayedShift + (desiredShift - displayedShift) * Math.min(1, dt / 50) : 1
      if (Math.abs(desiredShift - displayedShift) < .001) displayedShift = desiredShift
      const reveal = smooth((displayedShift - .12) / .88)
      stage.style.setProperty('--portability-progress', `${displayedShift}`)
      stage.style.setProperty('--glacier-opacity', `${reveal}`)
      stage.style.setProperty('--glacier-offset', `${(1 - reveal) * 45}px`)
      stage.style.setProperty('--glacier-scale', `${.95 + reveal * .05}`)
      track.dataset.static = String(!moving)
      if (displayedShift !== desiredShift) schedule()
    }
    function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(update) }
    const visibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else schedule() }
    const ro = new ResizeObserver(schedule)
    ro.observe(stage)
    document.addEventListener('scroll', schedule, { passive: true, capture: true })
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('resize', schedule)
    preference.addEventListener('change', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      document.removeEventListener('scroll', schedule, true)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('resize', schedule)
      preference.removeEventListener('change', schedule)
    }
  }, [animate])
  return <div ref={trackRef} className="ai-portable-story">
    <div ref={stageRef} className="ai-portable-story-stage">
      <figure className="ai-story-microscope">
        <PortableMicroscopeParticles animate={animate}/>
        <div className="ai-story-device-group"><MicroscopeDevices animate={animate}/></div>
        <figcaption><h3>A microscope you can take on the go</h3></figcaption>
      </figure>
      <figure className="ai-story-glacier">
        <img src="/images/step1/glacier.webp" width="1600" height="2133" loading="lazy" alt="Dr. Adrià Nogales Moral from the University of Basel examining snow algae in a sample on a glacier"/>
        <figcaption><p className="ai-glacier-context">Dr. Adrià Nogales Moral from the University of Basel examining snow algae in a sample on the glacier.</p><h3>Even on the glacier</h3></figcaption>
      </figure>
    </div>
  </div>
}
