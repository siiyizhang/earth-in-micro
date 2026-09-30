const assets = '/images/design-partners/'

const partners = [
  {
    id: 'eawag', name: 'Swiss Federal Institute of Aquatic Science and Technology', url: 'https://www.eawag.ch/en/',
    logos: [{ file: 'eawag.svg', alt: 'Eawag' }],
    people: [
      { name: 'Dr. Daniel Odermatt', image: '/images/testimonials/odermatt.jpg', url: 'https://www.eawag.ch/en/about-us/portrait/organisation/staff/profile/daniel-odermatt/show/' },
      { name: 'Dr. Francesco Pomati', image: assets + 'francesco-pomati.jpg', url: 'https://www.eawag.ch/en/about-us/portrait/organisation/staff/profile/francesco-pomati/show/' },
      { name: 'Marta Reyes', image: assets + 'marta-reyes.jpg', url: 'https://www.eawag.ch/en/about-us/portrait/organisation/staff/profile/marta-reyes/show/' },
    ],
  },
  {
    id: 'zhaw', name: 'Zurich University of Applied Sciences', url: 'https://www.zhaw.ch/en/',
    logos: [{ file: 'zhaw.svg', alt: 'ZHAW' }],
    people: [{ name: 'Dr. Dominik Refardt', image: assets + 'dominik-refardt.webp', url: 'https://www.zhaw.ch/en/about-us/person/refa' }],
  },
  {
    id: 'basel', name: 'Biozentrum, University of Basel', url: 'https://www.biozentrum.unibas.ch/',
    logos: [{ file: 'university-of-basel.svg', alt: 'University of Basel' }, { file: 'biozentrum.svg', alt: 'Biozentrum' }],
    people: [
      { name: 'Dr. Manon Demulder', image: '/images/testimonials/csm_Manon_Demulder_GL_v2_468fc0b100.jpg', url: 'https://www.cellarchlab.com/people.html' },
      { name: 'Dr. Adrià Nogales Moral', image: assets + 'adria-nogales-moral.jpg', url: 'https://www.cellarchlab.com/people.html' },
    ],
  },
  {
    id: 'bern', name: 'Construction and Transport Directorate, Canton of Bern', url: 'https://www.bvd.be.ch/de/start.html',
    logos: [{ file: 'canton-bern.svg', alt: 'Canton of Bern' }],
    people: [{ name: 'Stefanie Eyring', image: assets + 'stefanie-eyring.jpg', url: 'https://www.bvd.be.ch/de/start/dienstleistungen/newsletter-des-awa--awa-aktuell-/awa-aktuell-02-2025.html#textimage_954070488' }],
  },
  {
    id: 'uzh', name: 'University of Zurich', url: 'https://www.uzh.ch/en.html',
    logos: [{ file: 'university-of-zurich.svg', alt: 'University of Zurich' }],
    people: [{ name: 'Prof. Thomas Posch', image: assets + 'thomas-posch.jpeg', url: 'https://www.botinst.uzh.ch/en/research/posch/group_members/thomas_posch.html' }],
  },
]

export default function DesignPartners() {
  return <section className="ai-section ai-design-partners" aria-labelledby="design-partners-title">
    <h2 id="design-partners-title">Design partners</h2>
    <div className="ai-partner-grid">
      {partners.map(partner => <article className={`ai-partner ai-partner-${partner.id}`} key={partner.id}>
        <a className="ai-partner-institution" href={partner.url} target="_blank" rel="noreferrer">
          <div className="ai-partner-logos">{partner.logos.map(logo => <img key={logo.file} src={assets + logo.file} alt={logo.alt} loading="lazy" />)}</div>
          <h3>{partner.name}</h3>
        </a>
        <ul className="ai-partner-people">{partner.people.map(person => <li key={person.name}>
          <a href={person.url} target="_blank" rel="noreferrer">
            <span className="ai-partner-avatar"><img src={person.image} alt="" loading="lazy" width="38" height="38" /></span>
            <span>{person.name}</span>
          </a>
        </li>)}</ul>
      </article>)}
    </div>
  </section>
}
