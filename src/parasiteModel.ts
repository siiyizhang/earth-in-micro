export const CLASSIFICATION_CYCLE_SECONDS = 16
// Original particle illustrations, informed by UF/IFAS pictorial guides:
// https://ask.ifas.ufl.edu/publication/FA108 (motile ciliates)
// https://ask.ifas.ufl.edu/publication/FA109 (flagellates)
// https://ask.ifas.ufl.edu/publication/FA111 (monogeneans)
// Authored specimens and simulated classifications; illustrative sizes, not a
// common calibrated magnification or a diagnostic classifier.
export const parasiteTypes = ['Gyrodactylus', 'Ichthyobodo', 'Trichodina', 'Chilodonella', 'Ichthyophthirius'] as const
export type ParasiteType = 0 | 1 | 2 | 3 | 4
export type Grain = { x: number; y: number; a: number; feature: boolean }
export type Parasite = { id: number; type: ParasiteType; x: number; y: number; radius: number; angle: number; review: boolean; detectedAt: number; grains: Grain[] }
const smooth = (x: number) => { const t=Math.max(0,Math.min(1,x)); return t*t*(3-2*t) }
export function parasiteGrains(type: ParasiteType): Grain[] {
  let seed=5317+type*53
  const random=()=>{ seed=(seed*1664525+1013904223)>>>0;return seed/4294967296 }
  const grains: Grain[]=[]
  const dot=(x:number,y:number,feature=false)=>grains.push({x,y,a:.35+random()*.65,feature})
  const curve=(fn:(t:number)=>[number,number],n=100,width=1,feature=true)=>{
    for(let i=0;i<n;i++){const [x,y]=fn(i/(n-1));dot(x+(random()-.5)*width,y+(random()-.5)*width,feature)}
  }
  if(type===0){
    // Elongate monogenean with a bilobed anterior and posterior haptor.
    for(let i=0;i<1200;i++) {const y=-66+random()*118,w=13+9*Math.sin((y+66)/118*Math.PI);dot((random()*2-1)*w+Math.sin(y*.035)*6,y)}
    for(const side of [-1,1]) curve(t=>[side*(6+6*Math.sin(t*Math.PI)), -64-7*Math.sin(t*Math.PI)],55,2)
    curve(t=>[Math.cos(t*Math.PI*2)*20,55+Math.sin(t*Math.PI*2)*13],200,3)
    for(const side of [-1,1]) curve(t=>[side*(3+9*Math.sin(t*Math.PI)),47+19*t],65,2)
    for(let h=0;h<16;h++)curve(t=>{const a=h/16*Math.PI*2;return [Math.cos(a)*(15+8*t),55+Math.sin(a)*(9+7*t)]},12,1)
    // Curled embryo inside the adult, including its small attachment hooks.
    curve(t=>[8*Math.sin(t*Math.PI*2),-20+43*t],160,4)
    curve(t=>[7*Math.cos(t*Math.PI*2),23+5*Math.sin(t*Math.PI*2)],70,1)
  }else{
    const rx=[0,10,33,25,53][type],ry=[0,16,33,39,49][type]
    for(let i=0;i<(type===1?220:1000);i++){
      const a=random()*Math.PI*2,r=Math.sqrt(random()),y=Math.sin(a)*ry*r;let x=Math.cos(a)*rx*r
      if(type===1)x*=.72+.28*(y/ry+1)/2
      if(type===3)x+=9*(y/ry)**2-5
      dot(x,y)
    }
    if(type===1){
      curve(t=>[3+14*Math.sin(t*4),-9-36*t],65,.7)
      curve(t=>[5+9*Math.sin(t*5),-6+45*t],75,.7)
    }
    if(type===2){
      for(const radius of [22,29])curve(t=>[radius*Math.cos(t*Math.PI*2),radius*Math.sin(t*Math.PI*2)],180,1.6)
      for(let n=0;n<22;n++)curve(t=>{const a=n/22*Math.PI*2+t*.15;const r=15+8*t;return [r*Math.cos(a),r*Math.sin(a)]},14,1)
    }
    if(type===3){
      for(let band=-3;band<=3;band++)curve(t=>[band*6+5*Math.sin(t*Math.PI),-29+58*t],55,1.2)
    }
    if(type===4)curve(t=>{const a=.35+t*(Math.PI*2-.7);return [19*Math.cos(a),22*Math.sin(a)]},240,6)
    if(type!==1)for(let n=0;n<65;n++)curve(t=>{const a=n/65*Math.PI*2;return [(rx+5*t)*Math.cos(a)+(type===3?9*Math.sin(a)**2-5:0),(ry+5*t)*Math.sin(a)]},6,.4,false)
  }
  return grains
}
// Unresolved debris: broad torn fragments, with mottled density and no anatomy.
function debrisGrains(id: number): Grain[] {
  let seed=9173+id*137
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const phase=random()*Math.PI*2,grains:Grain[]=[]
  for(let i=0;i<2600;i++){
    const angle=random()*Math.PI*2,r=Math.sqrt(random())
    const edge=57+12*Math.sin(angle*3+phase)+8*Math.sin(angle*5-phase)+5*Math.cos(angle*9+phase)
    const x=Math.cos(angle)*edge*r,y=Math.sin(angle)*edge*r*.82
    const density=(Math.sin(x*.12+phase)+Math.cos(y*.15)+2)/4
    if(random()<.18*(1-density))continue
    grains.push({x,y,a:.2+random()*.35+density*.35,feature:density>.8&&random()>.45})
  }
  return grains
}
// Normal mucus is sample texture, separate from all detected objects and counts.
export const mucusGrains = (() => {
  let seed=28491
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const grains:{x:number;y:number;radius:number;alpha:number}[]=[]
  // Loose, wispy folds with ragged edges rather than solid outlined shapes.
  for(let strand=0;strand<42;strand++){
    const cx=random()*1000,cy=random()*1280,angle=random()*Math.PI*2
    const length=140+random()*260,width=8+random()*22,phase=random()*Math.PI*2
    for(let i=0;i<220;i++){
      const t=random(),u=(t-.5)*length
      const v=Math.sin(t*7+phase)*26+(random()+random()-1)*width
      grains.push({x:cx+u*Math.cos(angle)-v*Math.sin(angle),y:cy+u*Math.sin(angle)+v*Math.cos(angle),radius:.8+random()*1.8,alpha:.09+random()*.16})
    }
  }
  // Soft granular patches interrupt the filaments, leaving clear gaps between.
  for(let patch=0;patch<32;patch++){
    const cx=random()*1000,cy=random()*1280,rx=35+random()*95,ry=25+random()*65
    for(let i=0;i<120;i++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())
      grains.push({x:cx+Math.cos(angle)*rx*r,y:cy+Math.sin(angle)*ry*r,radius:.8+random()*2,alpha:(.06+random()*.17)*(1-r*.5)})
    }
  }
  return grains
})()
// Three overlapping acquisitions, seven parasites and two review candidates.
const layout: [ParasiteType,number,number,0|1|2,boolean?][] = [
  [0,190,115,0],[2,600,300,0],[1,880,425,0,true],
  [1,250,570,1],[3,520,700,1],[4,830,785,1],
  [2,230,960,2],[4,600,1140,2],[3,885,1170,2,true],
]
export const parasites: Parasite[]=layout.map(([type,x,y,field,review],id)=>({
  id,type,x,y,review:!!review,radius:review?86:[77,48,42,48,60][type],angle:(id*1.31)%6.28,
  detectedAt:[.95,5.25,9.55][field],grains:review?debrisGrains(id):parasiteGrains(type),
}))
export function parasiteScanState(seconds:number,moving=true){
  const t=moving?Math.max(0,seconds)% CLASSIFICATION_CYCLE_SECONDS:14
  const offset=t<3.7?0:t<5?380*smooth((t-3.7)/1.3):t<8?380:t<9.3?380+380*smooth((t-8)/1.3):760
  const found=parasites.filter(p=>t>=p.detectedAt)
  const counts=parasiteTypes.map((_,i)=>found.filter(p=>p.type===i&&!p.review).length)
  const review=found.filter(p=>p.review).length
  return {t,offset,found,counts,review,opacity:t>15?1-smooth(t-15):smooth(t/.45),
    phase:t>=12?'Scan complete':(t>=3.7&&t<5)||(t>=8&&t<9.3)?'Moving sample':'Classifying suspects',
    field:offset<380?1:offset<760?2:3}
}
