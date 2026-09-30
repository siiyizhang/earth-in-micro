import { useEffect, useRef } from 'react'

export default function MicroscopeDevices({ animate }: { animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const videos = [...root.querySelectorAll('video')]
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const update = () => {
      for (const video of videos) {
        if (animate && visible && !document.hidden && !preference.matches) void video.play().catch(() => {})
        else video.pause()
      }
    }
    videos.forEach(video => {
      video.muted = true
      video.addEventListener('loadeddata', update)
      video.addEventListener('canplay', update)
    })
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; update() })
    observer.observe(root)
    document.addEventListener('visibilitychange', update)
    preference.addEventListener('change', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); preference.removeEventListener('change', update); videos.forEach(video => { video.removeEventListener('loadeddata', update); video.removeEventListener('canplay', update); video.pause() }) }
  }, [animate])
  return <div ref={ref} className="ai-microscope-devices has-computer">
    <div className="ai-device-laptop" role="img" aria-label="A laptop displaying the original ten plankton microscope images in a five-column, two-row gallery">
      <div className="ai-laptop-lid"><div className="ai-device-camera"/><div className="ai-laptop-screen"><div className="ai-laptop-gallery">{Array.from({ length: 10 }, (_, i) => <img key={i} src={`/images/plankton/plankton-${String(i + 1).padStart(2, '0')}.png`} alt="" loading="lazy"/>)}</div></div></div>
      <div className="ai-laptop-base"/>
    </div>
    <div className="ai-device-tablet" role="img" aria-label="An iPad displaying live Amphileptus microscopy">
      <div className="ai-device-camera"/>
      <div className="ai-tablet-screen"><video src="/images/step3/Amphileptus_web.mp4#t=0.1" poster="/images/step3/Amphileptus_poster.jpg" muted loop playsInline preload="auto"/></div>
    </div>
    <div className="ai-device-phone" role="img" aria-label="The Eureka phone interface displaying live Vorticella microscopy">
      <video src="/images/step3/vorticella_web.mp4#t=0.1" poster="/images/step3/vorticella_poster.jpg" muted loop playsInline preload="auto"/>
      <img src="/video/phone video out.png" alt="" width="976" height="471" loading="lazy"/>
    </div>
  </div>
}
