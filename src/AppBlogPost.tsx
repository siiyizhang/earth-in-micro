import { useNavigate, useParams } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { POSTS } from "./AppBlog";

const FONTS = {
  serif: "'Yaroop', serif",
  sans: "'Inter', sans-serif",
};

const C = {
  navy: "#1A3A5C",
  teal: "#0ABFBC",
};

const WIX = "https://static.wixstatic.com/media/";

function useIsMobile(bp = 640) {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < bp,
    () => false,
  );
}

function BlogImage({ src, caption }: { src: string; caption?: string }) {
  return (
    <figure className="blog-figure">
      <img src={src} alt={caption ?? ""} className="blog-img" />
      {caption && <figcaption className="blog-caption">{caption}</figcaption>}
    </figure>
  );
}

// ── Post content ──────────────────────────────────────────────────────────────

function PostWhyMicroscopy() {
  return (
    <>
      <p>To me, microscopy is mostly about microorganisms. So to talk about microscopy, I have to talk about them first.</p>

      <p>When I was an undergraduate studying Environmental Science in China, one of my favourite courses was Environmental Microbiology. I still remember the afternoon we sampled water from a pond on a bridge, and explored the sludge under a microscope. I still have a photo of a rotifer on my phone — back then I didn't know its name, but I thought it was impossibly cool. I was, overall, a little disappointed by the course: it was mostly about using microorganisms as indicators of water quality, not about the organisms themselves. Water quality is <em>meaningful</em>, but microorganisms are <em>interesting</em>.</p>

      <BlogImage
        src={`${WIX}995e16_92b690daa058463d81acbc5fdefae0ed~mv2.png`}
        caption="Michael Shribak and Kristin Gribble / Marine Biological Laboratory"
      />

      <h2>Why interesting?</h2>

      <p><strong>First, they are extraordinarily diverse.</strong> Birds and zoo animals are popular things to watch, but from a taxonomical perspective, they occupy only a few phyla. In the microbial world, the organisms you can see contain <em>all other forms of life</em>. There are plant-like organisms that move, and animal-like organisms that photosynthesize. If there were real Pokémon in the world, I'd say they are microorganisms: copepods, tintinnids, vorticellas, paramecia, dinoflagellates... They show you what life could look like before it settled on two eyes and a mouth. Before that familiar form emerged in evolution, many strange and wonderful forms once dominated this planet. I feel something like tenderness toward their ancient history. Maybe in another universe, life evolved in a completely different direction, and these tiny creatures are what give me that imagination.</p>

      <p><strong>Second, they are hidden.</strong> They exist actively in the world, but on another dimension — most people simply aren't aware of them. It's a little like wondering whether aliens exist somewhere, except these ones are real, and a drop of pond water is enough to find them. There's a particular joy in discovering something that was always there.</p>

      <p><strong>Third,</strong> they represent the <strong>simplicity</strong> and foundation of existence. Simple enough to become the model organisms through which we understand the very foundations of life. Take the paramecium: a single cell with no brain, no eyes, no nervous system, yet it hunts, it escapes predators, it learns to ignore repeated harmless stimuli. We call this habituation, and it is the simplest known form of memory. Through creatures like this, we started asking genuinely uncomfortable questions: what <em>is</em> memory? Does something so simple experience anything at all? Then there is <em>Lacrymaria olor</em>, the "swan of tears," a single-celled predator that extends a neck up to seven times its body length to hunt prey, then retracts it completely, all within seconds, with no muscles and no brain to speak of. Or consider the graceful geometry of diatoms, whose glass shells follow mathematical rules so precise that engineers study them for structural design. These organisms are where physics meets life, where mechanics brushes against meaning. Nature, that blind watchmaker, turns out to be most profound in its smallest work.</p>

      <div className="blog-gallery">
        {[
          "995e16_bb9685cdab914cbd8b54091d52327a32~mv2.png",
          "995e16_59f0e3b0374c4a929b84dfde60d10254~mv2.png",
          "995e16_c86c668761c340feb17781a3c861acf9~mv2.png",
          "995e16_783922dbbdde4b5098766f1a64e5ce3c~mv2.png",
          "995e16_8c369bef7230458a81b286f9fb873f7f~mv2.png",
        ].map((id) => (
          <img key={id} src={`${WIX}${id}`} alt="" className="blog-gallery-img" />
        ))}
      </div>

      <p>Of course, microscopy isn't just about microorganisms as a static concept. If microbes are already interesting, finding and observing them adds another layer of wonder. The fun starts the moment I pass a pond or a stream and think: <em>what's in there?</em> The world suddenly has an extra dimension of existence.</p>

      <p>When I'm doing microscopy, I experience something close to flow. Observing an aquatic sample from the field feels like playing a slot machine. You place a slide under the microscope and see nothing, just some sediment. Move the slide a little and find a diatom. Move again, nothing. Move again and suddenly there is a mysterious moving thing. <em>What is that?</em> I don't know its name, and the name isn't the point. What thrills me is that this unexpected form of life is moving in a way I couldn't have imagined. I can only be awed by this miracle of evolution. Then I move the slide again and it's gone. But maybe something more interesting is waiting just around the corner?</p>

      <p>This randomness, this excitement of discovery, can keep me hunched over a microscope for hours, asking <em>what's next</em>. It probably triggers the same ancient part of the brain that evolved from hunting and gathering. The prey is just much, much smaller now.</p>

      <p>The idea for Eureka actually started from wanting to build something like Pokémon Go. Every distinct group of microorganisms would be like a Pokémon. Players could unlock new species as they explored new places, or as seasonal changes shifted the microbial community in a familiar spot. To play, to <em>collect</em>, you'd need a special console: a microscope. Which is why it needed to be portable. You should be able to play it everywhere.</p>

      <p>I pitched this idea to my cofounder Yu, and he joined. But we quickly realized that before we could build the game, we had to build the microscope, one simple enough for anyone to use, while still producing images beautiful enough to make you stop and stare. It turned out to be much harder than we expected.</p>

      <p>But that's another story.</p>
    </>
  );
}

function PostDiatomMotility() {
  return (
    <>
      <p>This piece draws inspiration from <em>"Functional morphology of gliding motility in benthic diatoms,"</em> published in the <em>Proceedings of the National Academy of Sciences</em>. It is the first article I've written in this format — feedback is welcome.</p>

      <p>Imagine a microscopic glass (silica) box in the water. It has no wheels, no legs, no jet engines, and no cilia. Yet the moment it touches a surface, it moves — gliding, turning, reversing — as if guided by invisible hands. This seems impossible, yet it perfectly describes diatoms, single-celled organisms encased in intricate silica shells (frustules), responsible for about 20% of the oxygen in our atmosphere. Microscopists have long admired them, but the mechanism behind their locomotion has only recently been explained. And beyond the biophysics, the way their trajectory is described leads us straight into the existential crisis triggered by 19th-century Laplacian Determinism.</p>

      <BlogImage
        src={`${WIX}995e16_e3322a565e604f38aa274fd8f23d9d04~mv2.png`}
        caption="Diatom and Pierre-Simon Laplace, a French polymath"
      />

      <p>A diatom can be viewed as a microscopic tank with an internal tread system. It uses protein motors (myosins) to pull against a specialised adhesive material secreted through a slit in the shell called the raphe. Their paths are not random at all. They are pre-determined by the curvature, length, and position of that raphe slit. Curved raphes produce circular trajectories; straight raphes allow linear back-and-forth shuttling. The motion itself consists of distinct behavioural states — gliding, pivoting, state-switching, and stopping — transitions between which can be modelled probabilistically.</p>

      <BlogImage
        src={`${WIX}995e16_7c21a04717da41339a3368bd1e62a730~mv2.png`}
        caption="Bondoc-Naumovitz et al. (2025), Proceedings of the National Academy of Sciences"
      />

      <p>Diatom motility is essentially a rigid-body motion geometrically constrained. Given the raphe parameters and state-transition probabilities as Markov chains, the movement of a diatom becomes mathematically calculable. Simulated trajectories closely match experimental observations. This is biology as deterministic as physics. Diatoms occupy a fascinating middle ground — a Goldilocks zone. Smaller organisms are tossed around by Brownian motion; larger animals are governed by unpredictable neural decisions. At tens of microns, the diatom is a precision mechanism: hardware-encoded, physically obedient.</p>

      <BlogImage
        src={`${WIX}995e16_785366aeb815416db511c75b8cf97cd5~mv2.png`}
        caption="Bondoc-Naumovitz et al. (2025), Proceedings of the National Academy of Sciences"
      />

      <p>This orderliness connects to a long tradition of <strong>Biological Mechanism</strong>. Descartes proposed that animals were complex automata; Laplace imagined an intellect that could calculate the universe's entire future simply by knowing all particle positions and momenta at one instant. This <strong>determinism</strong> sparked existential concerns about free will. If everything follows from prior states and physical laws, then every action — including reading this text — was predetermined at the Big Bang 13.8 billion years ago. Humanity becomes puppetry rather than agency.</p>

      <p>Within diatom physics, we become that omniscient intellect. The diatom explores freely yet remains fate-locked the moment its shell is synthesised. This deterministic universe appears less spontaneous than imagined. One cannot help but contemplate whether human choices similarly emerge as inevitable outputs from hidden environmental parameters — undiscovered forces shaping our trajectories just as the raphe shapes the diatom's.</p>

      <p>Twentieth-century physics provided an escape: Heisenberg's Uncertainty Principle demolished Laplace's Demon, introducing genuine cosmic randomness rather than total determinacy. While this does not directly grant us free will, it prevents the universe from being completely mechanically fated. The determinism only truly haunts the few seconds a diatom spends gliding across a chamber slide.</p>

      <p>Ultimately, our choices may be neither pure mechanical fate nor chaotic drift — but a dance of life that leaps from unpredictability atop a rigid physical skeleton.</p>
    </>
  );
}

function PostLifeFindsItsWay() {
  return (
    <>
      <BlogImage
        src={`${WIX}995e16_fd07d4b6633b4e5296e8536ede4a8878~mv2.png`}
        caption="Middle: Living Room of Casa Batlló, Barcelona, designed by Antoni Gaudí. Top & Bottom Left: Coloured windows in the living room. Top Right: Erachnodiscus sp. photograph by © Jan Michels. Bottom Right: Arachnodiscus (Arachnoidiscus) ornatus."
      />

      <p>When I was visiting Barcelona and saw the windows of Casa Batlló designed by Antoni Gaudí, I found myself thinking: <em>don't they look like centric diatoms?</em></p>

      <p>Gaudí himself left almost no official explanation of Casa Batlló. What we do know is that the building as a whole was inspired by the ocean. He lived from 1852 to 1926, and in the late 19th to early 20th century, diatoms were once a popular subject of microscopic photography, so popular that they were even displayed at social gatherings. Around the same time, the German zoologist Ernst Haeckel published <em>Art Forms in Nature</em>, which included detailed plates of diatoms and influenced the aesthetics of many Art Nouveau creators, including Gaudí.</p>

      <BlogImage
        src={`${WIX}995e16_d8fe8e7e6cea4bf5a39494ac1186020f~mv2.png`}
        caption="Diatoms from Ernst Haeckel's Art Forms in Nature"
      />

      <p>So perhaps those windows in the living room of Casa Batlló are not entirely unrelated to diatoms after all.</p>

      <p>These geometrically striking structures we see under the microscope come from the diatom's silica shell, its frustule. This is what fascinates engineers the most: using nothing more than biochemical processes, diatoms fabricate highly complex, multifunctional nanostructures.</p>

      <BlogImage
        src={`${WIX}995e16_92e298decd9340699496b67209dedb3f~mv2.png`}
        caption="Strength vs. density for naturally occurring biological materials. Z.H. Aitken, S. Luo, S.N. Reynolds, C. Thaulow, & J.R. Greer, Microstructure provides insights into evolutionary design and resilience of Coscinodiscus sp. frustule, Proc. Natl. Acad. Sci. U.S.A. 113 (8) 2017–2022"
      />

      <p>Their shells are not only beautiful; their strength approaches the theoretical limits of strength-to-density ratios found in natural materials.</p>

      <p>So why are diatom shells so complex and diverse? How can they be both light and strong? And what can human engineers learn from them?</p>

      <hr />

      <p>Any species that has survived to the present with such diversity is, in a sense, an expert in multi-objective optimisation. To understand diatoms, we can ask a simple question: what does a single algal cell floating in seawater need to optimise in order to survive?</p>

      <ol>
        <li>Avoid being eaten</li>
        <li>Manage energy efficiently</li>
        <li>Capture sufficient light</li>
      </ol>

      <BlogImage
        src={`${WIX}995e16_b039a908de7e4b7b82de831e75605a8f~mv2.png`}
        caption="(A) Mixed diatoms. (B) Copepod Calanus glacialis. (Courtesy of Erik Selander.) (C) Base of a feeding appendage with 'teeth' of the copepod Temora longicornis. Scale bars are 20 μm (A), 1.5 mm (B), and 10 μm (C). Kiørboe, T., & Ryderheim, F. (2025). The diatom–copepod arms race. Current Biology, 35(8), R277–R278."
      />

      <p>Diatoms' primary defense strategy is to build a silica shell, one that is strong enough to withstand predators. In the ocean, their main predators are copepods with sharp feeding teeth. These predators can apply static and impact loads when biting, and may also subject the diatom to repeated mechanical actions — almost like a tiny jackhammer — introducing vibrational loads that can fracture the shell.</p>

      <p>So diatoms are engaged in an arms race with copepods.</p>

      <p>At the same time, they must conserve energy. The resources used to build the shell should be minimised, while nutrient uptake efficiency should be maximised. The shell cannot be too thick or heavy, otherwise the cell will sink too quickly and lose access to light. Ideally, the shell should even help optimise how light reaches the cell.</p>

      <p>How do you build a shell that is strong, light, and optically functional at the same time? This is essentially a topology optimisation problem.</p>

      <BlogImage
        src={`${WIX}995e16_765fc0c1b377452dbf2e5874f0ed1a82~mv2.png`}
        caption="Andresen, S.; Linnemann, S.K.; Ahmad Basri, A.B.; Savysko, O.; Hamm, C. Natural Frequencies of Diatom Shells: Alteration of Eigenfrequencies Using Structural Patterns Inspired by Diatoms. Biomimetics 2024, 9, 85."
      />

      <p>Diatoms have spent around 200 million years evolving into tens of thousands of species, each offering its own solution. The result is an astonishing diversity of geometric forms.</p>

      <p>This is their kind of engineering mindset: solving real-world constraints creatively under limited resources.</p>

      <hr />

      <BlogImage
        src={`${WIX}995e16_8776b9d1b4064d33a4d7b167c0219878~mv2.png`}
        caption="Biomimetic material model based on the diatom Coscinodiscus species's frustule. Musenich, L., Origo, D., Gallina, F., Buehler, M. J., & Libonati, F. (2025). Revealing Diatom-Inspired Materials Multifunctionality. Advanced Functional Materials, 35(8), 2407148."
      />

      <p>For example, the shell of many centric diatoms exhibits a sandwich structure.</p>

      <p>The outermost layer is the Cribrum, a sieve-like plate with nanoscale pores. Because its feature size is comparable to the wavelength of light, it does not simply allow light to pass through. Instead, it scatters and diffracts incoming light, increasing the optical path length and redistributing light in ways that enhance wavelengths more suitable for photosynthesis. It effectively redirects light that would otherwise be lost, improving light capture efficiency in real aquatic environments. It may also attenuate harmful ultraviolet radiation, and potentially shift part of it into wavelengths usable for photosynthesis.</p>

      <p>The middle layer consists of honeycomb-like chambers called Areolae.</p>

      <BlogImage
        src={`${WIX}995e16_6fdec1d504334e4e83c9e4c5af17dddc~mv2.png`}
        caption="I-beam"
      />

      <p>If we take a vertical cross-section of a centric diatom, the walls of these chambers, together with the top and bottom layers, form a structure reminiscent of an I-beam. When resources are limited, the most effective way to increase strength is not to add more material in one structural unit, but to place it strategically. One key measure of strength is stiffness — the resistance to deformation. Engineers discovered that distributing material away from the neutral axis maximises bending stiffness, leading to the invention of the I-beam. Interestingly, diatoms converged on a similar solution.</p>

      <BlogImage
        src={`${WIX}995e16_ac0c7b9818c54f70abc3d101b54b97a0~mv2.png`}
        caption="(A) Schematic of the diatom frustule shell. (B) Cross-section of shell demonstrating the honeycomb sandwich plate configuration of the silica shell. Z.H. Aitken, S. Luo, S.N. Reynolds, C. Thaulow, & J.R. Greer, Microstructure provides insights into evolutionary design and resilience of Coscinodiscus sp. frustule, Proc. Natl. Acad. Sci. U.S.A. 113 (8) 2017–2022"
      />

      <hr />

      <p>What about the horizontal cross-section?</p>

      <BlogImage
        src={`${WIX}995e16_c4cce98b86614752a7a9923255909c80~mv2.png`}
        caption="Pores of (b) Thalassiosira sp., and (c) likely Porosira sp., partly dissolved. (b) is a 3D model made using Confocal Laser Scanning Microscopy (CLSM). (c) is an Scanning Electron Microscopy (SEM) image. Linnemann, S.K.; Friedrichs, L.; Niebuhr, N.M. Stress-Adaptive Stiffening Structures Inspired by Diatoms: A Parametric Solution for Lightweight Surfaces. Biomimetics 2024, 9, 46."
      />

      <p>Some diatoms exhibit hexagonal patterns. Why hexagons? As early as 36 BCE, the Roman scholar Marcus Terentius Varro proposed what is now known as the honeycomb conjecture, proven in 1999: regular hexagons partition a plane into equal areas with minimal total perimeter. Under physical constraints, diatoms naturally form similarly sized units, and hexagonal tilings correspond to configurations that minimise boundary length for equal area divisions. Other diatoms exhibit irregular polygons with a gradient in size, denser near the edges and sparser toward the centre.</p>

      <p>Both structures help distribute stress. Hexagonal networks spread stress across the entire structure, while gradient structures act as a stress management strategy. When a predator bites down, the outer regions bear higher loads. By increasing structural density in these regions, diatoms enhance local stiffness and distribute forces across more microstructures, reducing peak stress.</p>

      <p>The innermost layer of the sandwich contains reinforced openings known as Foramina.</p>

      <BlogImage
        src={`${WIX}995e16_5189aef2d30b4465badf412aab9edec3~mv2.png`}
        caption="Visualization of flow patterns (c) and axial force distribution (d) with (left) and without (right) foramen reinforcement rings. Musenich, Ludovico, et al. 'Revealing Diatom-Inspired Materials Multifunctionality.' Advanced Functional Materials 35.8 (2025): 2407148."
      />

      <p>Computational fluid dynamics simulations show that reinforcement rings around these openings alter flow patterns. Without reinforcement, fluid tends to accumulate near the edges. With reinforcement, recirculation occurs, allowing fluid that initially fails to enter the pore to return in a second pulse. Researchers therefore hypothesise that this structure may improve nutrient capture and retention in environments where nutrient distribution is heterogeneous. When fluid flows outward, these structures increase the tortuosity of flow paths, reduce flow velocity, and promote a more uniform internal pressure distribution.</p>

      <p>In addition to resisting static and impact loads, diatoms may also use structural features to cope with vibrational loads.</p>

      <p>If the frequency of periodic disturbances generated by predators approaches one of the shell's natural frequencies, resonance may occur, leading to amplified deformation and an increased risk of structural failure. The stability of a diatom shell under vibration depends both on whether its natural frequencies align with external excitation and on the stiffness that determines its deformation amplitude. Higher stiffness generally leads to higher natural frequencies and smaller deformation, thereby reducing the likelihood of damaging resonance. For example, the bulging structure of <em>Actinoptychus sp.</em> may increase stiffness and disrupt continuous vibration modes, making it harder for large-amplitude resonance to develop.</p>

      <BlogImage
        src={`${WIX}995e16_6eae5bb5b32a44ec82b1506c1ce4be81~mv2.png`}
        caption="SEM image of Actinoptychus senarius (e) and its FEM model. Gutiérrez, A.; Gordon, R.; Dávila, L.P. Deformation modes and structural response of diatom frustules. J. Mater. Sci. Eng. Adv. Technol. 2017, 15, 105–134."
      />

      <hr />

      <p>The most fascinating aspect of diatom engineering lies in the fact that it is not designed, but emerges. As single-celled organisms, diatoms do not possess the capacity to compute moments of inertia or optimise topological functions. They follow what Richard Dawkins described as the logic of the blind watchmaker.</p>

      <p>Over hundreds of millions of years, evolution continuously filters the rules governing silica deposition. Structures that fail to develop efficient load-bearing pathways, or whose natural frequencies coincide with predators' disturbances, are more likely to break and disappear under external pressures. Through this process of blind selection, highly effective engineering solutions are gradually embedded into material form.</p>

      <p>Perhaps life is not searching for a destined answer, but instead exploring through continuous trial and error, retaining only what happens to work. What remains is not an intentionally derived optimum, but one repeatedly validated by time.</p>

      <BlogImage
        src={`${WIX}995e16_01c0dfb2e872442b897ac0dd4770faf9~mv2.png`}
        caption=""
      />

      <hr />

      <BlogImage
        src={`${WIX}995e16_19025b9b657048c4938a889df5d11a0f~mv2.png`}
        caption="3D-printed architectural material inspired by diatom. Buehler, Markus J. 'Diatom-inspired architected materials using language-based deep learning: Perception, transformation and manufacturing.' arXiv preprint arXiv:2301.05875 (2023)."
      />

      <p>Diatoms arrive at their solutions through unconscious intelligence; today, human engineers are attempting to translate these solutions into design rules. Rather than imitating specific shapes as in the era of Gaudí, engineers input material properties, boundary conditions, loading scenarios, performance objectives, and geometric design variables into parametric models, optimisation algorithms, and even generative AI systems. These systems simulate a selection process similar to that of diatoms, automatically generating new material architectures. Materials inspired by diatoms may one day combine the organic aesthetics seen in Gaudí's work with the logic of algorithms, redefining the boundaries of human manufacturing.</p>

      <p>I hope that one day I can sit by the sea with a microscope, observe diatoms of different shapes, and witness the ingenuity of nature firsthand. If this sparked your curiosity as well, feel free to check out the portable microscope project I am working on: eurekamicroscope.com</p>
    </>
  );
}

const CONTENT: Record<string, React.ReactNode> = {
  "why-i-like-microscopy": <PostWhyMicroscopy />,
  "diatom-motility-and-laplacian-determinism": <PostDiatomMotility />,
  "life-finds-its-way": <PostLifeFindsItsWay />,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AppBlogPost() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();

  const post = POSTS.find(p => p.slug === slug);
  const content = slug ? CONTENT[slug] : null;

  if (!post || !content) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.sans, color: C.navy }}>
        Post not found.
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      height: "100dvh",
      overflowY: "auto",
      background: "#ffffff",
      fontFamily: FONTS.sans,
      color: C.navy,
    }}>

      {/* ── Navbar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? "12px 20px" : "14px clamp(24px,4vw,48px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(26,42,60,0.06)",
      }}>
        <button
          type="button"
          onClick={() => navigate("/blog")}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", gap: 6,
            color: "rgba(26,42,60,0.55)", fontFamily: FONTS.sans,
            fontSize: 14, letterSpacing: "0.01em",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Blog
        </button>
        <img
          src="/Black text.png"
          alt="Eureka! Microscope"
          style={{ height: isMobile ? 22 : 26, display: "block" }}
        />
        <div style={{ width: 56 }} />
      </div>

      {/* ── Article ── */}
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: isMobile ? "100px 24px 80px" : "120px clamp(24px,6vw,80px) 80px",
      }}>

        {/* Meta */}
        <div style={{
          fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "rgba(26,42,60,0.4)", marginBottom: 16,
        }}>
          {post.date} · {post.readTime}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: FONTS.serif, fontWeight: 100,
          fontSize: isMobile ? "clamp(26px,8vw,40px)" : "clamp(32px,4vw,48px)",
          letterSpacing: "-0.01em", color: C.navy,
          margin: "0 0 48px", lineHeight: 1.2,
        }}>
          {post.title}
        </h1>

        {/* Body */}
        <div
          style={{
            fontSize: isMobile ? 15 : 16.5,
            lineHeight: 1.8,
            color: "rgba(26,42,60,0.78)",
            letterSpacing: "0.01em",
          }}
          className="blog-body"
        >
          {content}
        </div>

      </div>
    </div>
  );
}
