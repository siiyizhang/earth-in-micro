import type { DaphniaPose } from './daphniaMotion'
type V3 = [number, number, number]
type Dot = { p: V3; light: number }
// Lateral breadth and dorsoventral thickness are different: turning changes
// the silhouette and internal parallax, rather than flattening a 2D sprite.
// Anatomy references (geometry is an original stylized reconstruction):
// Fox, D. magna: rounded head, paired biramous A2 with 4/3 articles, plumose setae.
// https://lanwebs.lander.edu/faculty/rsfox/invertebrates/daphnia.html
// Ngu et al., Fig. 2A–C: coronal/sagittal/transverse female proportions.
// https://pmc.ncbi.nlm.nih.gov/articles/PMC11736674/
// Schumpert et al., Fig. 1: terminal and lateral swimming-seta arrangement.
// https://doi.org/10.1007/s10750-025-06077-9 (D. pulex / D. pulicaria).
// Antenna attachment and 3D branching studied in the user's Sketchfab reference:
// https://sketchfab.com/3d-models/wasserfloh-daphnia-beschriftet-c33d129d88a74b2c90be99030ac4e9a5
// Visual reconstruction, not an imported mesh. Reference credits anne.goehre;
// underlying model: Museo Nacional de Historia Natural de Chile (CC0).
// Silhouette study from the user's lateral and oblique/front photographs.
// x is the dorsoventral direction, y runs head-to-tail, z is left-to-right.
// The dorsal head shield flows into the valves; only the ventral side has a
// notch. Lateral compression makes the front view narrower than the side view.
// These are authored visual proportions, not calibrated specimen dimensions.
const sections = [[-49,-9,0,0],[-47,-7,7,5],[-43,-4,15,9],[-36,0,21,10],[-31,5,22,10],[-27,7,20,9],[-18,3,28,13],[-6,2,31,14],[9,4,30,13],[24,7,23,10],[36,8,12,5],[43,8,1,.5]]
function section(y: number) {
  let i = 0
  while (i < sections.length - 2 && y > sections[i + 1][0]) i++
  const a = sections[i], b = sections[i + 1], t = (y - a[0]) / (b[0] - a[0]), q = t * t * (3 - 2 * t)
  return a.map((v, k) => v + (b[k] - v) * q)
}
export function projectDaphnia([x,y,z]: V3, pose: DaphniaPose): V3 {
  const xx = x * Math.cos(pose.yaw) + z * Math.sin(pose.yaw)
  const zz = -x * Math.sin(pose.yaw) + z * Math.cos(pose.yaw)
  return [xx, y * Math.cos(pose.pitch) - zz * Math.sin(pose.pitch), y * Math.sin(pose.pitch) + zz * Math.cos(pose.pitch)]
}
export function makeDaphniaRenderer() {
  const layer = document.createElement('canvas'); layer.width = 384; layer.height = 384
  const ctx = layer.getContext('2d')!
  let seed = 4515252
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const dots: Dot[] = []
  for (let i = 0; i < 3300; i++) {
    const y = -49 + random() * 92, [,centre,rx,rz] = section(y), angle = random() * Math.PI * 2
    const radius = i % 3 === 0 ? Math.sqrt(random()) : .92 + random() * .08
    dots.push({ p: [centre + Math.cos(angle) * rx * radius, y, Math.sin(angle) * rz * radius], light: random() })
  }
  // Brood-pouch contents lie dorsal to the intestine, not across its lumen.
  const eggs: V3[] = [[24,-10,-2],[26,1,2],[23,12,-2],[19,23,2],[14,30,0],[21,-20,2]]
  // Fox, Digestive System / Fig. 1: C-shaped intestine, from ventral mouth
  // through dorsal thorax into the recurved abdomen. It does not enter the
  // carapace's tail spine. Keep it in the sagittal midplane so it stays internal
  // when the specimen turns; positive x is dorsal, z=0 is the left/right centre.
  const gut: V3[] = []
  const gutBends: V3[][] = [
    [[-17,-28,0],[-12,-19,0],[-1,-20,0],[10,-25,0]],
    [[10,-25,0],[19,-28,0],[13,3,0],[11,22,0]],
    [[11,22,0],[10,35,0],[-12,35,0],[-9,28,0]],
  ]
  for (const [a,b,c,d] of gutBends) {
    for (let i=0;i<24;i++) {
      const t=i/24, u=1-t
      gut.push(a.map((v,k)=>u*u*u*v+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k]) as V3)
    }
  }
  gut.push(gutBends[2][3])
  return (pose: DaphniaPose) => {
    ctx.setTransform(2,0,0,2,192,192); ctx.clearRect(-96,-96,192,192)
    const project = (p: V3) => projectDaphnia(p, pose)
    // Local antenna geometry is authored from the reference's side and ventral
    // views. A common transform preserves the peduncle/ramus articulation.
    const antennaScale = .85
    let antennaRoot: V3 | null = null
    const shapePoint = (p: V3): V3 => {
      if (!antennaRoot) return p
      // Sweep the whole antenna about its attachment. A shared transform keeps
      // both rami joined at the distal peduncle, without stretching that fork.
      const [rx,ry,rz]=antennaRoot, angle=.06-pose.stroke*.2
      const dx=p[0]-rx, dy=p[1]-ry
      return [rx+antennaScale*(dx*Math.cos(angle)-dy*Math.sin(angle)),
        ry+antennaScale*(dx*Math.sin(angle)+dy*Math.cos(angle)), rz+antennaScale*(p[2]-rz)]
    }
    // A volume of individual grains, never a stroked path. The deterministic
    // offsets move with the specimen, so they do not flicker between frames.
    function particlePath(path: V3[], color: string, width = .6, density = 1.5, taper = false) {
      const points=path.map(shapePoint), spread=width*.5*(antennaRoot ? antennaScale : 1)
      ctx.fillStyle=color
      for(let segment=1;segment<points.length;segment++) {
        const a=points[segment-1], b=points[segment]
        const distance=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])
        const count=Math.max(2,Math.ceil(distance*density))
        for(let j=0;j<count;j++) {
          const hash=(n:number)=>{const v=Math.sin(n*127.1+segment*311.7)*43758.5453;return v-Math.floor(v)}
          const t=(j+.18+hash(j+17)*.64)/count
          const progress=(segment-1+t)/(points.length-1), radius=spread*(taper ? 1-.86*progress : 1)
          const p=a.map((v,k)=>v+(b[k]-v)*t+(hash(j*3+k+41)-.5)*2*radius) as V3
          const [x,y]=project(p)
          ctx.globalAlpha=.5+hash(j+91)*.48
          ctx.beginPath();ctx.arc(x,y,.19+hash(j+73)*.24,0,Math.PI*2);ctx.fill()
        }
      }
      ctx.globalAlpha=1
    }
    // No shell outline or seam strokes: only the projected particle field
    // defines the body boundary in every orientation.
    for (const dot of dots) {
      const [x,y,z] = project(dot.p)
      ctx.fillStyle = `rgba(10,191,188,${(.13+dot.light*.52)*(z>0?1:.55)})`
      ctx.beginPath(); ctx.arc(x,y,.25+dot.light*.38,0,Math.PI*2);ctx.fill()
    }
    particlePath(gut,'#b9e9a7d0',4.4,11)
    for (const [eggIndex, egg] of eggs.entries()) {
      for (let j=0;j<80;j++) {
        const u=1-2*(j+.5)/80, a=j*2.39996, radial=Math.sqrt(1-u*u)
        const [x,y,z]=project([egg[0]+4*radial*Math.cos(a),egg[1]+5*u,egg[2]+3.5*radial*Math.sin(a)])
        ctx.fillStyle=`rgba(169,239,238,${.2+.23*(.5+.5*Math.sin(j+eggIndex+z*.1))})`
        ctx.beginPath();ctx.arc(x,y,.38,0,Math.PI*2);ctx.fill()
      }
    }
    // Thoracic filtering limbs have subtle local motion, not whole-body wobble.
    for(let i=0;i<5;i++) {
      const y=-14+i*8, flutter=Math.sin(pose.time*12+i)*1.1
      particlePath([[-17,y,1],[-22,y+5+flutter,2],[-12,y+8,3]],'#8ce9e770',.55)
    }
    particlePath([[8,43,0],[13,55,.3],[18,69,0]],'#a0efeeba',2.4,4,true)
    // Antenna II: one stout peduncle on each side of the head, each
    // bifurcating into a four-article exopod and a three-article endopod.
    // Long terminal/lateral natatory setae carry fine bilateral setules.
    function seta(start: V3, end: V3, side: number, strength: number) {
      const control: V3=[(start[0]+end[0])/2+3,(start[1]+end[1])/2+4+pose.stroke*2,(start[2]+end[2])/2]
      const curve: V3[]=[]
      for(let k=0;k<=12;k++) {
        const t=k/12, u=1-t
        curve.push(start.map((v,i)=>u*u*v+2*u*t*control[i]+t*t*end[i]) as V3)
      }
      particlePath(curve,`rgba(142,228,227,${strength})`,.45)
      // Fine hairs form a feather, not a row of equal rigid teeth.
      for(let k=2;k<11;k++) {
        const a=curve[k], hair=(1.8+1.8*Math.sin(k/12*Math.PI))*(.65+.35*pose.stroke)
        for(const direction of [-1,1]) {
          particlePath([a,[a[0]+direction*hair*.6,a[1]+direction*hair,a[2]+side*hair*.45]],`rgba(121,210,209,${strength*.42})`,.23)
        }
      }
    }
    for(const side of [-1,1]) {
      // Each A2 attaches behind the eye on the lateral head shield, not at
      // the ventral mouth/rostrum. A thick peduncle rises before its elbow;
      // two narrower, gently bent rami then extend forward and laterally.
      const root: V3=[9,-35,side*9]
      const middle: V3=[7,-50,side*18]
      const fork: V3=[-3,-65,side*30]
      antennaRoot=root
      particlePath([root,middle,fork],side>0?'#a0e7e6b8':'#6bc8c68c',5.2,10)
      const rami: V3[][] = [
        [fork,[-12,-71,side*37],[-22,-74,side*44],[-31,-74,side*50],[-39,-72,side*55]],
        [fork,[-13,-64,side*41],[-24,-59,side*51],[-34,-56,side*59]],
      ]
      for(let branch=0;branch<2;branch++) {
        const nodes=rami[branch], segments=nodes.length-1, end=nodes[segments]
        for(let j=1;j<=segments;j++) {
          const node=nodes[j]
          particlePath([nodes[j-1],node],side>0?'#a7ecebb0':'#7bbfbe80',3-j*.35,6)
          particlePath([[node[0]-.4,node[1],node[2]],[node[0]+.4,node[1],node[2]]],'#bcefee90',2,6)
        }
        // Three terminal setae on each ramus, with unequal angles/lengths.
        const previous=nodes[segments-1]
        const dx=end[0]-previous[0], dy=end[1]-previous[1], length=Math.hypot(dx,dy)
        for(let k=-1;k<=1;k++) {
          const fan=(.6+.4*pose.stroke)*k*5, reach=18-Math.abs(k)*2
          seta(end,[end[0]+dx/length*reach-dy/length*fan,
            end[1]+dy/length*reach+dx/length*fan,
            end[2]+side*(10-Math.abs(k)*2)],side,.48)
        }
        // One lateral seta on the four-article ramus; two on the three-article.
        for(const joint of branch===0?[3]:[1,2]) {
          const start=nodes[joint]
          seta(start,[start[0]-12,start[1]+10+joint*2,start[2]+side*9],side,.42)
        }
      }
    }
    antennaRoot=null
    // Female antenna I is tiny and lies near the rostrum, unlike the large A2.
    particlePath([[-17,-36,0],[-22,-32,0],[-23,-28,0]],'#75d9d79c',3.2,5,true)
    for(const side of [-1,1]) particlePath([[-22,-29,side*2],[-24,-26,side*3]],'#a0d9d866',.65)
    // Compound eye as a dense particle cluster, without a ring outline.
    for(let i=0;i<150;i++) {
      const a=i*2.39996, radius=3.5*Math.sqrt((i+.5)/150)
      const [x,y]=project([-9+Math.cos(a)*radius,-42+Math.sin(a)*radius,Math.sin(i)*.6])
      ctx.fillStyle=i%5===0?'#d9fffe':'#93d5d4bd'
      ctx.beginPath();ctx.arc(x,y,.22+(i%4)*.035,0,Math.PI*2);ctx.fill()
    }
    return layer
  }
}
