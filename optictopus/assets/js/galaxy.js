/* OPTICTOPUS 2D — galaxy-only decoration; no cursor light, no WebGL. */
(()=>{
 'use strict';
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const body=document.body;
 const motion=body.dataset.animations!=='off'&&!reduce;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const galaxy=document.querySelector('[data-galaxy-sky]');
 const mascot=document.querySelector('[data-mascot]');
 const canvas=mascot?.querySelector('[data-octo-canvas]');

 // Galaxy-style constellation field. One paint per viewport size, never intercepts taps/clicks.
 if(galaxy){
  const ctx=galaxy.getContext('2d',{alpha:true});
  function drawSky(){
   const w=window.innerWidth,h=window.innerHeight;
   const dpr=Math.min(window.devicePixelRatio||1,1.5);
   galaxy.width=Math.round(w*dpr);galaxy.height=Math.round(h*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   let seed=51987;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
   const stars=[];const count=Math.round(clamp(w*h/13000,35,105));
   for(let i=0;i<count;i++){
     const x=random()*w, y=random()*h, radius=random()>.95?1.65:random()*.9+.28;
     stars.push({x,y,radius});
     ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
     ctx.fillStyle=`rgba(179,142,251,${(.10+random()*.42).toFixed(3)})`;ctx.fill();
   }
   // Uneven, sweeping galactic paths, not a repeating grid or dot matrix.
   const contours=Math.max(2,Math.min(5,Math.round(w/390)));
   for(let i=0;i<contours;i++){
      const y=h*(.25+i*.16), amp=25+i*13;
      ctx.beginPath();ctx.moveTo(-60,y);
      ctx.bezierCurveTo(w*.21,y+amp*1.5,w*.36,y-amp*1.5,w*.52,y-amp*.7);
      ctx.bezierCurveTo(w*.70,y+amp*1.7,w*.80,y-amp*1.2,w+60,y-amp*.45);
      ctx.strokeStyle=`rgba(146,98,236,${(i%2?.065:.12).toFixed(3)})`;
      ctx.lineWidth=i===2?1.15:.75;ctx.stroke();
   }
   // A handful of faint constellation connectors and orbital node-rings.
   for(let i=0;i<stars.length;i++){
     if(i%8!==0)continue;
     let closest=null,dist=200;
     for(let j=i+1;j<stars.length;j++){
       const d=Math.hypot(stars[i].x-stars[j].x,stars[i].y-stars[j].y);
       if(d<dist){dist=d;closest=stars[j];}
     }
     if(closest){ctx.beginPath();ctx.moveTo(stars[i].x,stars[i].y);ctx.lineTo(closest.x,closest.y);ctx.strokeStyle='rgba(171,127,244,.12)';ctx.lineWidth=.6;ctx.stroke()}
     ctx.beginPath();ctx.arc(stars[i].x,stars[i].y,stars[i].radius+5,0,Math.PI*2);
     ctx.strokeStyle='rgba(182,145,250,.22)';ctx.lineWidth=.8;ctx.stroke();
   }
  }
  let refresh=0;window.addEventListener('resize',()=>{clearTimeout(refresh);refresh=setTimeout(drawSky,150)},{passive:true});
  drawSky();
 }


})();
