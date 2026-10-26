// Layered stars respond gently to scrolling and pointer movement.
export function initGalaxy() {
  const canvas = document.querySelector('[data-galaxy-sky]');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return () => {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame, w=0, h=0, stars=[], last=0, elapsed=0, x=0, y=0;
  const target={x:0,y:0};
  const motion=()=>!media.matches && document.body.dataset.animations!=='off';
  function resize(){
    w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    let seed=51987;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
    stars=Array.from({length:Math.min(100,Math.max(40,Math.round(w*h/12000)))},()=>({x:random()*w,y:random()*h,z:.3+random()*.7,r:.4+random()*1.3,phase:random()*6.28}));restart();
  }
  function draw(now){
    frame=undefined;if(document.hidden)return;
    const active=motion(),dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(active)elapsed+=dt;
    x+=(target.x-x)*.06;y+=(target.y-y)*.06;
    ctx.clearRect(0,0,w,h);
    const wrap=(v,max)=>(v%max+max)%max;
    for(const s of stars){
      const px=wrap(s.x+(active?x*s.z+Math.sin(elapsed*.22+s.phase)*8:0)+20,w+40)-20;
      const py=wrap(s.y-(active?elapsed*(3+s.z*7)+scrollY*.055*s.z-y*s.z:0)+20,h+40)-20;
      ctx.beginPath();ctx.arc(px,py,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(190,150,255,${.15+s.z*.45})`;ctx.fill();
    }
    for(let i=0;i<4;i++){
      const py=h*(.2+i*.2)+(active?Math.sin(elapsed*.15+i)*10+y*.2-Math.sin(scrollY*.0005)*35:0);
      ctx.beginPath();ctx.moveTo(-50,py);ctx.bezierCurveTo(w*.3,py-70,w*.55,py+70,w+50,py-25);
      ctx.strokeStyle='rgba(160,110,240,.09)';ctx.lineWidth=.8;ctx.stroke();
    }
    if(active)frame=requestAnimationFrame(draw);
  }
  function restart(){cancelAnimationFrame(frame);last=0;frame=requestAnimationFrame(draw);}
  function pointer(e){target.x=(e.clientX/Math.max(1,w)-.5)*24;target.y=(e.clientY/Math.max(1,h)-.5)*18;}
  const observer=new MutationObserver(restart);observer.observe(document.body,{attributes:true,attributeFilter:['data-animations','data-background']});
  window.addEventListener('resize',resize);window.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('visibilitychange',restart);media.addEventListener('change',restart);resize();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('pointermove',pointer);document.removeEventListener('visibilitychange',restart);media.removeEventListener('change',restart);};
}
