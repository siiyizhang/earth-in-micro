import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import EurekaLogo from './components/EurekaLogo'
import AIParticles from './AIParticles'
import PaperParticles from './PaperParticles'
import PortableMicroscopeStory from './PortableMicroscopeStory'
import DesignPartners from './DesignPartners'
import './ai.css'

type WorkflowKind = 'count' | 'classify' | 'measurement'

const templates = [
  {
    kind: 'count' as WorkflowKind, visualMode: 0, label: 'Counting', name: 'My cell counting workflow',
    prompt: 'Scan my algae sample. Find each cell, count it once, and flag clusters for review.',
    action: 'Detect and count cells', capture: 'Still images', output: 'Cell counts + marked images',
    rule: 'Unresolved cluster → review', target: 'Algal cell', use: 'Cell abundance',
    question: '“How many are there?”',
    description: 'Define which cells to count, choose a sampling plan, and keep every count linked to its image.',
  },
  {
    kind: 'measurement' as WorkflowKind, visualMode: 2, label: 'Measurement', name: 'My Daphnia measurement workflow',
    prompt: 'Measure my Daphnia across 16 wells. Capture a side view, then measure body length.',
    action: 'Measure Daphnia body length', capture: 'Pose-selected, calibrated images', output: 'Body lengths + annotated images',
    rule: 'Unsuitable pose → retry', target: 'Daphnia body', use: 'Size & morphology',
    question: '“How much have they grown?”',
    description: 'Capture the right pose, measure body length, and repeat across your plate. Keep each result linked to its well and image.',
  },  {
    kind: 'classify' as WorkflowKind, visualMode: 1, label: 'Classification', name: 'My fish parasite screening workflow',
    prompt: 'Scan this skin-mucus wet mount. Find suspected parasites, classify and count them. Save representative photos or videos, and flag uncertain objects for my review.',
    action: 'Classify and count suspected parasites', capture: 'Representative photos and videos', output: 'Counts + captures + review queue',
    rule: 'Uncertain object → review', target: 'Suspected parasite', use: 'Skin-mucus screening',
    question: '“What am I looking at?”',
    description: 'Scan a skin-mucus wet mount, count suspected parasites by type, and keep representative captures for review.',
  },
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function HeroCanvas({ selected, onSelect, animate, onCycleComplete }: { selected: number; onSelect: (index: number) => void; animate: boolean; onCycleComplete: () => void }) {
  const current = templates[selected]
  return <div className="ai-canvas-wrap">
    <div className={`ai-particle-stage ai-particle-mode-${current.visualMode}`}>
      <PaperParticles key={current.kind} mode={current.visualMode} animate={animate} onCycleComplete={onCycleComplete}/>

      <div className="ai-floating-prompt"><p>“{current.prompt}”</p></div>



    </div>
    <div className="ai-canvas-presets" aria-label="Choose a workflow concept">{templates.map((template, index) => <button type="button" key={template.kind} aria-pressed={selected === index} onClick={() => onSelect(index)}>{template.label}<Arrow diagonal/></button>)}</div>
  </div>
}

const imageLibraries = [
  { id: 'freshwater-algae', name: 'Freshwater Algae Atlas', description: 'Scenedesmus, Chlorella & diatoms', icon: 'algae' },
  { id: 'snow-algae', name: 'Snow Algae Collection', description: 'Snow algae & pigment variations', icon: 'algae' },
  { id: 'zooplankton', name: 'Zooplankton Reference', description: 'Daphnia, copepods & rotifers', icon: 'animal' },
  { id: 'fish-parasites', name: 'Aquatic Parasite Library', description: 'Fish parasites & look-alike debris', icon: 'animal' },
]
const modelOptions = [
  { id: 'gpt', name: 'GPT · OpenAI' },
  { id: 'claude', name: 'Claude · Anthropic' },
  { id: 'gemini', name: 'Gemini · Google' },
  { id: 'custom', name: 'Your own model · Custom API' },
]
const workflowPrompts = [
  'Scan my algae sample and focus each field before capturing an image. Use the attached reference images to identify Scenedesmus and Chlorella. Count each cell once, including across overlapping fields. Flag unresolved clusters for my review and save the counts with their source images.',
  'Scan a 4 × 4 plate containing Daphnia. In each well, wait for a clear side view, then capture an image and measure body length from the eye to the base of the tail spine. Flag unclear poses and individuals showing no movement for my review. Save one result per well with its image.',
  'Scan this fish skin-mucus wet mount. Use the attached reference images to find suspected parasites, classify and count them. Save representative photos or videos. Flag uncertain objects and look-alike debris for me to confirm.',
]

function WorkflowBuilder({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const [intent, setIntent] = useState(workflowPrompts[selected])
  const [libraries, setLibraries] = useState<string[]>([selected === 0 ? 'freshwater-algae' : selected === 1 ? 'zooplankton' : 'fish-parasites'])
  const [model, setModel] = useState('gpt')
  const [saved, setSaved] = useState(false)
  const attached = imageLibraries.filter(library => libraries.includes(library.id))
  const modelName = modelOptions.find(option => option.id === model)!.name
  const shareHref = `mailto:eureka@eurekamicroscope.com?subject=${encodeURIComponent('My microscopy workflow')}&body=${encodeURIComponent(`Hello Eureka team,\n\nHere is the workflow I would like to build:\n\n${intent.trim()}\n\nExample image libraries: ${attached.map(library => library.name).join(', ') || 'None selected'}\nPreferred model: ${modelName}\n\nBest,\n`)}`

  function toggleLibrary(id: string) {
    setLibraries(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
    setSaved(false)
  }
  function saveWorkflow() {
    const workflow = { prompt: intent.trim(), imageLibraries: attached.map(({ id, name }) => ({ id, name, example: true })), model: { id: model, name: modelName }, status: 'Draft only; example libraries and model choices are not connected.', version: 'draft-2' }
    const url = URL.createObjectURL(new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'my-microscopy-workflow.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setSaved(true)
  }

  return <section id="builder" className="ai-section ai-builder-section">
    <div className="ai-section-intro"><div><h2>What would <em>your</em><br />workflow look like?</h2></div><p>Share your workflow, and help us build a better product</p></div>
    <div className="ai-builder ai-prompt-workspace">
      <div className="ai-builder-header"><span><span className="ai-workspace-icon">↳</span> Workflow studio</span><span className="ai-studio-badge">Demo</span></div>
      <div className="ai-prompt-editor">
        <div className="ai-prompt-heading"><label htmlFor="ai-intent">What should your microscope do?</label><span>01 / Instructions</span></div>
        <textarea id="ai-intent" aria-label="Your microscopy prompt" maxLength={4000} rows={5} value={intent} onChange={e => { setIntent(e.target.value); setSaved(false) }} placeholder="Describe your sample, what to look for, and what should happen next…"/>
        <div className="ai-prompt-examples"><span>Try a prompt</span>{templates.map((template, index) => <button type="button" key={template.kind} aria-pressed={selected === index} onClick={() => onSelect(index)}>{template.label}<Arrow diagonal/></button>)}</div>
      </div>
      <div className="ai-studio-connections">
        <fieldset className="ai-library-picker"><legend>02 / Image databases</legend><p>Attach reference images to guide your workflow.</p><div className="ai-library-grid">{imageLibraries.map(library => <label key={library.id} className={libraries.includes(library.id) ? 'is-attached' : ''}>
          <input type="checkbox" checked={libraries.includes(library.id)} onChange={() => toggleLibrary(library.id)}/>
          <svg className="ai-library-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">{library.icon === 'algae' ? <><ellipse cx="9" cy="14" rx="4" ry="8" transform="rotate(25 9 14)"/><ellipse cx="19" cy="14" rx="4" ry="8" transform="rotate(25 19 14)"/></> : <><ellipse cx="14" cy="15" rx="6" ry="8"/><path d="M11 9 6 3M17 9l5-6M13 22l-3 4"/><circle cx="14" cy="11" r="1"/></>}</svg>
          <span><strong>{library.name}</strong><span>{library.description}</span></span>
        </label>)}</div><p className="ai-library-note">Illustrative libraries · {libraries.length} attached</p></fieldset>
        <div className="ai-model-picker"><label htmlFor="ai-model">03 / AI model</label><p>Choose the model behind your workflow.</p><select id="ai-model" value={model} onChange={e => { setModel(e.target.value); setSaved(false) }}>{modelOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><div className="ai-model-context"><span className="ai-context-dot"/><p>Your prompt<br />+ attached image references<br />+ microscope tools</p></div><p className="ai-model-note">Model selection is a demo; no API is connected.</p></div>
      </div>
      <div className="ai-studio-footer"><span role="status">{saved ? 'Draft downloaded.' : 'Your method. Your references. Your choice of AI.'}</span><div><button type="button" className="ai-save-button" disabled={!intent.trim()} onClick={saveWorkflow}>Save draft ↓</button>{intent.trim() ? <a className="ai-button ai-button-primary" href={shareHref}>Share workflow <Arrow/></a> : <button type="button" className="ai-button ai-button-primary" disabled>Share workflow <Arrow/></button>}</div></div>
    </div>
  </section>
}

export default function AppAI() {
  const [selected, setSelected] = useState(0)
  // Automatic hero playback must not reset the editable workflow builder.
  const [heroSelected, setHeroSelected] = useState(0)
  const advanceHero = useCallback(() => setHeroSelected(index => (index + 1) % templates.length), [])
  const selectWorkflow = (index: number) => { setSelected(index); setHeroSelected(index) }
  const [menuOpen, setMenuOpen] = useState(false)
  const [motionEnabled, setMotionEnabled] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const current = templates[selected]
  const contactHref = `mailto:eureka@eurekamicroscope.com?subject=${encodeURIComponent('My custom microscopy workflow')}&body=${encodeURIComponent(`Hello Eureka team,\n\nI’d like to explore a custom microscopy workflow.\n\nWhat I want the microscope to do:\nMy sample and preparation:\nMy current manual steps:\nThe results I need:\n\nStarting point: ${current.label}\n\nBest,\n`)}`

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setMotionEnabled(!preference.matches)
    preference.addEventListener('change', sync)
    return () => preference.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const root = document.querySelector('.ai-page')
    if (!root || !motionEnabled) return
    const elements = root.querySelectorAll('.ai-section-intro, .ai-idea-steps article')
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } })
    }, { root, threshold: .08 })
    elements.forEach(element => { element.classList.add('ai-reveal'); observer.observe(element) })
    return () => { observer.disconnect(); elements.forEach(element => { element.classList.remove('ai-reveal', 'is-visible') }) }
  }, [motionEnabled])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  return <div className="ai-page" data-motion={motionEnabled ? 'running' : 'paused'}>
    <div className="ai-ambient-layer"><AIParticles variant="ambient" animate={motionEnabled}/></div>
    <Helmet><title>Eureka AI | Create and automate your own microscopy workflow</title><meta name="description" content="A portable, AI-native microscope for custom workflows in the lab and in the field. Shape acquisition, analysis and outputs into a reusable method. In development."/><meta name="robots" content="noindex, nofollow"/><link rel="canonical" href="https://eurekamicroscope.com/"/><meta property="og:title" content="Eureka AI | Create and automate your own microscopy workflow"/><meta property="og:description" content="Describe it. Teach it. Make it repeatable. Explore a new way to customize microscopy."/><meta property="og:url" content="https://eurekamicroscope.com/"/></Helmet>
    <a className="ai-skip-link" href="#ai-main">Skip to content</a>
    <header className="ai-header"><Link to="/" className="ai-brand" aria-label="Eureka home"><EurekaLogo style={{ height: 27 }}/><span>AI</span></Link><nav className={menuOpen ? 'ai-nav is-open' : 'ai-nav'} id="ai-navigation" aria-label="AI page navigation"><Link to="/leisure" onClick={() => setMenuOpen(false)}>Nature</Link><a href="#how-it-works" onClick={() => setMenuOpen(false)}>The idea</a><a href="#builder" onClick={() => setMenuOpen(false)}>Make it yours</a><a href="#lab-to-field" onClick={() => setMenuOpen(false)}>Lab & field</a></nav><a href="#contact" className="ai-nav-cta" onClick={() => setMenuOpen(false)}>Build with us <Arrow diagonal/></a><button type="button" className="ai-motion-toggle" aria-label={motionEnabled ? 'Pause particle effects' : 'Enable particle effects'} aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}><span aria-hidden="true">{motionEnabled ? 'Ⅱ' : '▷'}</span></button><button type="button" className="ai-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="ai-navigation" onClick={() => setMenuOpen(!menuOpen)}><span/><span/></button></header>
    <main id="ai-main">
      <section className="ai-hero ai-section"><div className="ai-hero-copy"><h1><span className="ai-title-line">Create and automate</span>{' '}<span className="ai-title-line"><em>your own</em></span>{' '}<span className="ai-title-line"><em>microscopy workflow</em></span></h1><p className="ai-hero-description">From scanning and focusing to analysis and review. Start your new microscopy experience with our compact, AI-native microscope</p><div className="ai-hero-actions"><a href="#builder" className="ai-button ai-button-primary">Shape your workflow <Arrow/></a><a href="#how-it-works" className="ai-text-link">See how it works <span>↓</span></a></div></div><HeroCanvas selected={heroSelected} onSelect={selectWorkflow} animate={motionEnabled} onCycleComplete={advanceHero}/></section>

      <DesignPartners/>

      <section id="lab-to-field" className="ai-section ai-portability" aria-label="Portable microscopy">
        <PortableMicroscopeStory animate={motionEnabled}/>
      </section>

      <section id="how-it-works" className="ai-section ai-idea"><div className="ai-section-intro"><div><h2>You bring the know-how.<br /><em>The microscope follows through.</em></h2></div></div><div className="ai-idea-steps">
        <article><div className="ai-idea-visual ai-words-visual" aria-hidden="true"><span>“Look for these objects…”</span><span>“…at these locations…”</span><span>“…and compare their size.”</span></div><h3>Start with your question.</h3><p>Explain the task in your own words. Define the sample, the observation and the result you need.</p></article>
        <article><div className="ai-idea-visual ai-teaching-visual" aria-hidden="true"><div><span className="ai-teach-object"/><small>Count this</small></div><div><span className="ai-teach-object ai-teach-ignore"/><small>Ignore this</small></div><div><span className="ai-teach-object ai-teach-review"/><small>Ask me</small></div></div><h3>Make your expertise visible.</h3><p>Show examples. Set the rules. Review a small trial and adjust the method around your sample.</p></article>
        <article><div className="ai-idea-visual ai-repeat-visual" aria-hidden="true"><div><span>Saved workflow</span><span>✓</span></div><span className="ai-repeat-line"/><div className="ai-repeat-samples"><span>Sample A</span><span>Sample B</span><span>Sample C</span></div></div><h3>Keep the method. Run it again.</h3><p>Validate it, save a version, and reuse it. The instrument handles the sequence; you review what needs judgment.</p></article>
      </div></section>

      <WorkflowBuilder key={current.kind} selected={selected} onSelect={selectWorkflow}/>









      <section id="contact" className="ai-section ai-contact"><div className="ai-contact-particles"><AIParticles variant="stream" mode={1} animate={motionEnabled}/></div><div className="ai-contact-content"><h2>What would you<br /><em>teach your microscope?</em></h2><div><p>In the lab or out in the field.<br />Bring your sample. Let’s shape your workflow.</p><a className="ai-button ai-button-primary" href={contactHref}>Build your workflow with us <Arrow diagonal/></a><a className="ai-email" href="mailto:eureka@eurekamicroscope.com">eureka@eurekamicroscope.com</a></div></div></section>
    </main>
    <footer className="ai-footer"><Link to="/" aria-label="Eureka homepage"><EurekaLogo style={{ height: 24 }}/></Link><span>A new way to work with the microscopic world.</span><Link to="/about">About Eureka <Arrow diagonal/></Link><small>© {new Date().getFullYear()} Eureka Microscope</small></footer>
  </div>
}
