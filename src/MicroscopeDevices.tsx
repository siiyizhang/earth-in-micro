export default function MicroscopeDevices() {
  return <div className="ai-microscope-devices">
    <div className="ai-device-laptop" role="img" aria-label="A laptop displaying the original ten plankton microscope images in a five-column, two-row gallery">
      <div className="ai-laptop-lid"><div className="ai-device-camera"/><div className="ai-laptop-screen"><div className="ai-laptop-gallery">{Array.from({ length: 10 }, (_, i) => <img key={i} src={`/images/plankton/plankton-${String(i + 1).padStart(2, '0')}.png`} alt="" loading="lazy"/>)}</div></div></div>
      <div className="ai-laptop-base"/>
    </div>
    <div className="ai-device-tablet" role="img" aria-label="An iPad displaying Amphileptus microscopy">
      <div className="ai-device-camera"/>
      <div className="ai-tablet-screen"><img src="/images/step3/Amphileptus_poster.jpg" alt="" loading="lazy" /></div>
    </div>
    <div className="ai-device-phone" role="img" aria-label="The Eureka phone interface displaying Vorticella microscopy">
      <img className="ai-phone-sample" src="/images/step3/vorticella_poster.jpg" alt="" loading="lazy" />
      <img src="/video/phone video out.png" alt="" width="976" height="471" loading="lazy"/>
    </div>
  </div>
}
