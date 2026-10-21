export function launchFireworks(canvas:HTMLCanvasElement,duration=4800){
 const context=canvas.getContext('2d');if(!context)return()=>{};
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return()=>{};
 const colors=['#b590ff','#e0ff8d','#ffd579','#69d8ff','#f0c6ff'];
 type Spark={x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;size:number};
 let sparks:Spark[]=[],frame=0,stopped=false,lastBurst=-1000,last=performance.now(),start=last;
 const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;context.setTransform(dpr,0,0,dpr,0,0)};
 resize();window.addEventListener('resize',resize);
 function burst(){const x=innerWidth*(.15+Math.random()*.7),y=innerHeight*(.15+Math.random()*.4);for(let i=0;i<66;i++){const a=i/66*Math.PI*2,speed=2+Math.random()*4,life=50+Math.random()*38;sparks.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,color:colors[Math.floor(Math.random()*colors.length)],size:1+Math.random()*1.3})}}
 function draw(time:number){if(stopped)return;const step=Math.min((time-last)/16.67,2);last=time;context!.clearRect(0,0,innerWidth,innerHeight);if(time-start<duration-1600&&time-lastBurst>420){burst();lastBurst=time}context!.globalCompositeOperation='lighter';for(const s of sparks){const px=s.x,py=s.y;s.life-=step;s.vx*=Math.pow(.985,step);s.vy+=.045*step;s.x+=s.vx*step;s.y+=s.vy*step;context!.globalAlpha=Math.max(0,s.life/s.max);context!.strokeStyle=s.color;context!.lineWidth=s.size;context!.beginPath();context!.moveTo(px,py);context!.lineTo(s.x,s.y);context!.stroke();context!.fillStyle=s.color;context!.beginPath();context!.arc(s.x,s.y,s.size*.7,0,Math.PI*2);context!.fill()}context!.globalAlpha=1;sparks=sparks.filter(s=>s.life>0);if(time-start<duration||sparks.length)frame=requestAnimationFrame(draw);else context!.clearRect(0,0,innerWidth,innerHeight)}
 frame=requestAnimationFrame(draw);
 return()=>{stopped=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);context.clearRect(0,0,innerWidth,innerHeight)}
}
