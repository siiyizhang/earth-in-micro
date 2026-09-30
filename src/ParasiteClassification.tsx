import { useEffect, useRef, useState } from 'react'
import { CLASSIFICATION_CYCLE_SECONDS, mucusGrains, parasites, parasiteScanState, parasiteTypes } from './parasiteModel'
import type { Parasite } from './parasiteModel'

function paintSpecimen(ctx:CanvasRenderingContext2D,p:Parasite,x:number,y:number,scale:number,time:number,review=false){
  ctx.save();ctx.translate(x,y)
  ctx.rotate(p.angle+(p.review?Math.sin(time*.25+p.id)*.025:p.type===2?time*.35:Math.sin(time*.8+p.id)*.09))
  for(const g of p.grains){
    const bend=!p.review&&p.type===0?Math.sin(g.y*.05+time*2)*3:0
    ctx.fillStyle=review?`rgba(239,190,114,${g.a})`:g.feature?`rgba(167,236,233,${g.a})`:`rgba(10,191,188,${g.a*.85})`
    ctx.beginPath();ctx.arc((g.x+bend)*scale,g.y*scale,Math.max(.35,scale*(g.feature?1.15:.95)),0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
}

export default function ParasiteClassification({animate=true,compact=false,onCycleComplete}:{animate?:boolean;compact?:boolean;onCycleComplete?:()=>void}){
  const ref=useRef<HTMLCanvasElement>(null),elapsed=useRef(0)
  const [readout,setReadout]=useState(()=>parasiteScanState(0))
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    const mucus=document.createElement('canvas'),mucusCtx=mucus.getContext('2d')
    let mucusScale=0
    let moving=animate&&!media.matches,frame=0,last=0,visible=false,disposed=false,w=1,h=1,top=20,key=''
    function draw(){
      if(!ctx)return
      const s=parasiteScanState(elapsed.current,moving)
      const next=`${s.found.length}:${s.phase}:${s.field}`
      if(key!==next){key=next;setReadout(s)}
      ctx.clearRect(0,0,w,h)
      const bottom=w<400?225:180,available=Math.max(100,h-top-bottom)
      const scale=Math.min(w*.86/1000,available/690),fw=1000*scale,fh=520*scale
      const left=(w-fw)/2,fy=top+(available-fh)/2,sy=fy-s.offset*scale
      const found=new Set(s.found.map(p=>p.id))
      ctx.save();ctx.beginPath();ctx.rect(left-4,fy-4,fw+8,fh+8);ctx.clip();ctx.globalAlpha=s.opacity
      // Cache the translucent particle texture; it travels with the slide and
      // shares the objective clip, but never receives a detection box or count.
      if(mucusCtx&&mucusScale!==scale){
        mucusScale=scale
        const dpr=Math.min(window.devicePixelRatio||1,2)
        mucus.width=Math.ceil(1000*scale*dpr);mucus.height=Math.ceil(1280*scale*dpr)
        mucusCtx.setTransform(dpr,0,0,dpr,0,0)
        for(const g of mucusGrains){
          mucusCtx.fillStyle=`rgba(139,194,192,${g.alpha})`
          mucusCtx.beginPath();mucusCtx.arc(g.x*scale,g.y*scale,Math.max(.35,g.radius*scale),0,Math.PI*2);mucusCtx.fill()
        }
      }
      if(mucusCtx)ctx.drawImage(mucus,left,sy,1000*scale,1280*scale)
      for(const p of parasites){
        const local=moving?elapsed.current:0,dx=Math.sin(local*(p.review?.3:p.type===1?3:.8)+p.id)*5,dy=Math.cos(local*(p.review?.25:1.1)+p.id)*4
        const x=left+(p.x+dx)*scale,y=sy+(p.y+dy)*scale
        if(y+p.radius*scale<fy-4||y-p.radius*scale>fy+fh+4)continue
        const seen=found.has(p.id)
        paintSpecimen(ctx,p,x,y,scale,local,seen&&p.review)
        if(seen){
          const r=p.radius*scale+5
          ctx.strokeStyle=p.review?'#efbe72':'#60d8d4';ctx.lineWidth=.85
          for(const a of [-1,1])for(const b of [-1,1]){ctx.beginPath();ctx.moveTo(x+a*(r-5),y+b*r);ctx.lineTo(x+a*r,y+b*r);ctx.lineTo(x+a*r,y+b*(r-5));ctx.stroke()}
          if(p.review){ctx.fillStyle='#efbe72';ctx.font='14px "DM Sans", sans-serif';ctx.fillText('?',x+r+3,y-r+8)}
          const pulse=1-Math.min(1,(s.t-p.detectedAt)/.35)
          if(pulse>0){ctx.fillStyle=`rgba(186,250,247,${pulse*.12})`;ctx.fillRect(x-r,y-r,r*2,r*2)}
        }
      }
      ctx.restore()
      // The objective remains stationary while the wet mount translates.
      ctx.strokeStyle='#0abfbc66';ctx.lineWidth=1;ctx.strokeRect(left-4,fy-4,fw+8,fh+8)
      ctx.strokeStyle='#a5eeeb';ctx.lineWidth=1.5
      for(const a of [0,1])for(const b of [0,1]){const x=left-4+a*(fw+8),y=fy-4+b*(fh+8),dx=a?-1:1,dy=b?-1:1;ctx.beginPath();ctx.moveTo(x+dx*10,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*10);ctx.stroke()}

    }
    function tick(now:number){frame=0;if(disposed||!visible||document.hidden||!moving)return;if(now-last>=33){elapsed.current+=Math.min((now-last)/1000,.1)*2;last=now;if(onCycleComplete&&elapsed.current>=CLASSIFICATION_CYCLE_SECONDS){onCycleComplete();return}draw()}frame=requestAnimationFrame(tick)}
    function resume(){if(!frame&&visible&&!document.hidden&&moving&&!disposed){last=performance.now();frame=requestAnimationFrame(tick)}}
    const prompt=canvas.parentElement?.parentElement?.querySelector<HTMLElement>('.ai-floating-prompt')
    function resize(){const r=canvas!.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);top=compact?12:prompt?Math.max(150,prompt.offsetTop+prompt.offsetHeight+24):220;const dpr=Math.min(window.devicePixelRatio||1,2);canvas!.width=Math.round(w*dpr);canvas!.height=Math.round(h*dpr);ctx!.setTransform(dpr,0,0,dpr,0,0);draw()}
    const ro=new ResizeObserver(resize);ro.observe(canvas);if(prompt)ro.observe(prompt)
    const io=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(visible)resume();else{cancelAnimationFrame(frame);frame=0}});io.observe(canvas)
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;resume()}
    const motionChange=()=>{moving=animate&&!media.matches;cancelAnimationFrame(frame);frame=0;draw();resume()}
    document.addEventListener('visibilitychange',visibility);media.addEventListener('change',motionChange);resize()
    return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motionChange)}
  },[animate,compact,onCycleComplete])
  return <div className={`ai-paper-visual ai-parasite-visual${compact?' ai-paper-compact':''}`} data-phase={readout.phase}>
    <canvas ref={ref} role="img" aria-label="Illustrative fish skin-mucus wet-mount scan. A fixed field of view and translating sample reveal particle representations of Gyrodactylus, Ichthyobodo, Trichodina, Chilodonella and Ichthyophthirius. Faint particle wisps represent normal mucus moving with the sample, excluded from detection and counts. Counts derive from unique simulated detections; amber irregular debris-like fragments await review and are excluded from class totals. Organism sizes are adjusted for visibility, not a calibrated common magnification."/>
    <div className="ai-parasite-readout">
      <div className="ai-parasite-counts">{parasiteTypes.map((name,i)=><div key={name}><span>{name}</span><strong>{readout.counts[i].toString().padStart(2,'0')}</strong></div>)}<div className="is-review"><span>To review</span><strong>{readout.review.toString().padStart(2,'0')}</strong></div></div>
    </div>
  </div>
}
