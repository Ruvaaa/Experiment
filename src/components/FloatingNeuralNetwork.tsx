import { useEffect, useRef } from 'react'
interface Props { density?: 'landing' | 'app' | 'auth'; className?: string }
interface Node { x:number; y:number; vx:number; vy:number; radius:number; opacity:number }
function rgba(hex:string, alpha:number) { const value=hex.replace('#',''); const red=parseInt(value.slice(0,2),16)||0; const green=parseInt(value.slice(2,4),16)||0; const blue=parseInt(value.slice(4,6),16)||0; return `rgba(${red},${green},${blue},${alpha})` }
export function FloatingNeuralNetwork({ density = 'app', className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let width=0,height=0,frame=0,previous=performance.now()
    let nodes:Node[]=[]
    const landing=density==='landing'
    const authentication=density==='auth'
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root=document.documentElement
    let accent=getComputedStyle(root).getPropertyValue('--accent').trim() || '#F5F5F5'
    if (authentication && (accent.toUpperCase()==='#F5F5F5' || accent.toUpperCase()==='#FFFFFF')) accent='#737373'
    const accentObserver=new MutationObserver(() => {
      let next=getComputedStyle(root).getPropertyValue('--accent').trim() || '#F5F5F5'
      if (authentication && (next.toUpperCase()==='#F5F5F5' || next.toUpperCase()==='#FFFFFF')) next='#737373'
      accent=next
    })
    accentObserver.observe(root,{attributes:true,attributeFilter:['style','data-theme']})
    const resize=()=>{
      const rect=canvas.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2)
      width=Math.max(1,rect.width); height=Math.max(1,rect.height)
      canvas.width=Math.floor(width*ratio); canvas.height=Math.floor(height*ratio)
      context.setTransform(ratio,0,0,ratio,0,0)
      const count=Math.min(landing?120:authentication?52:36,Math.max(28,Math.floor(width*height/(landing?15000:authentication?30000:52000))))
      nodes=Array.from({length:count},(_,i)=>nodes[i]??{x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*(landing?.16:authentication?.10:.08),vy:(Math.random()-.5)*(landing?.16:authentication?.10:.08),radius:1+Math.random()*(landing?1.7:authentication?1.35:1.1),opacity:.25+Math.random()*.45})
      nodes.forEach(n=>{n.x=Math.min(width,Math.max(0,n.x));n.y=Math.min(height,Math.max(0,n.y))})
    }
    const draw=(time:number)=>{
      const delta=Math.min(32,time-previous); previous=time
      context.clearRect(0,0,width,height)
      if(!reduced) nodes.forEach(n=>{n.x+=n.vx*delta;n.y+=n.vy*delta;if(n.x<0||n.x>width)n.vx*=-1;if(n.y<0||n.y>height)n.vy*=-1})
      const reach=landing?155:authentication?140:125
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
        const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=dx*dx+dy*dy
        if(d<reach*reach){context.strokeStyle=rgba(landing?'#FFFFFF':accent,(1-Math.sqrt(d)/reach)*(landing?.16:.055));context.beginPath();context.moveTo(nodes[i].x,nodes[i].y);context.lineTo(nodes[j].x,nodes[j].y);context.stroke()}
      }
      nodes.forEach(n=>{context.fillStyle=rgba(landing?'#FFFFFF':accent,n.opacity*(landing?.8:.22));context.beginPath();context.arc(n.x,n.y,n.radius,0,Math.PI*2);context.fill()})
      if(!reduced && nodes.length>1) for(let i=0;i<(landing?9:2);i++) {
        const from=nodes[(i*7)%nodes.length], to=nodes[(i*11+3)%nodes.length]
        const progress=(time*.00012*(i%2?-.7:1)+i*.19)%1
        if(progress<0 || progress>1) continue
        context.fillStyle=rgba(landing?'#FFFFFF':accent,landing?.75:.6);context.beginPath()
        context.arc(from.x+(to.x-from.x)*progress,from.y+(to.y-from.y)*progress,1.25,0,Math.PI*2);context.fill()
      }
      if(!reduced) frame=requestAnimationFrame(draw)
    }
    resize(); draw(performance.now()); window.addEventListener('resize',resize)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);accentObserver.disconnect()}
  },[density])
  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
