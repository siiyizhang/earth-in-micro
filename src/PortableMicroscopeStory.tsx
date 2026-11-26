import MicroscopeDevices from './MicroscopeDevices'

export default function PortableMicroscopeStory() {
  return <div className="ai-portable-story">
    <figure>
      <MicroscopeDevices />
      <figcaption><h3>see the result on any digital device</h3></figcaption>
    </figure>
    <figure className="ai-story-glacier">
      <img src="/images/step1/glacier.webp" width="1600" height="2133" loading="lazy"
        alt="Dr. Adrià Nogales Moral from the University of Basel examining snow algae in a sample on a glacier" />
      <figcaption>
        <h3>Even on the glacier</h3>
        <p>Dr. Adrià Nogales Moral from the University of Basel examining snow algae in a sample on the glacier.</p>
      </figcaption>
    </figure>
  </div>
}
