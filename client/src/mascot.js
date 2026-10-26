// Perspective-projected particle surfaces. No images or animation dependencies.
export function initMascot() {
  const host = document.querySelector('[data-mascot]');
  const canvas = host?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let density = lowPower || host.clientWidth < 340 ? 1.6 : 1;
  let frame, last = 0, time = 0, visible = true, disposed = false, resetTimer;
  let emotion = 'neutral', emotionStart = 0, taps = [], nextGaze = 0, nextBlink = 0, blinkUntil = 0, wink = false;
  let slowFrames = 0, samples = 0;
  const gaze = {x:0,y:0}, target = {x:0,y:0};
  const pointer = {x:0,y:0,active:false,touchUntil:0};
  const still = () => reduced.matches || document.body.dataset.animations === 'off';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  // Broad, short rounded arms follow the supplied baby-octopus silhouette.
  const arms = [
    [[-105,88,-12],[-156,163,-12],[-233,160,0],[-214,88,8]],
    [[105,88,-12],[156,163,-12],[233,160,0],[214,88,8]],
    [[-75,115,5],[-112,200,8],[-176,228,12],[-191,208,15]],
    [[75,115,5],[112,200,8],[176,228,12],[191,208,15]],
    [[-34,124,24],[-36,206,28],[-70,273,30],[-91,267,30]],
    [[34,124,24],[36,206,28],[70,273,30],[91,267,30]],
  ];
  function curve(c,t) { const u=1-t; return [0,1,2].map(k=>u*u*u*c[0][k]+3*u*u*t*c[1][k]+3*u*t*t*c[2][k]+t*t*t*c[3][k]); }
  let head = [];
  function buildHead() {
    head=[];
    const step=.054*density;
    for(let lat=-Math.PI/2+.03;lat<Math.PI/2;lat+=step) {
      const n=Math.max(8,Math.round(Math.cos(lat)*125/density));
      for(let i=0;i<n;i++) {
        const a=i/n*Math.PI*2;
        head.push({x:Math.cos(lat)*Math.cos(a),y:Math.sin(lat),z:Math.cos(lat)*Math.sin(a)});
      }
    }
  }
  function setEmotion(value) {
    emotion=value; emotionStart=performance.now(); host.dataset.expression=value;
    clearTimeout(resetTimer);
    if(value!=='neutral') resetTimer=setTimeout(()=>{taps=[];setEmotion('neutral');},value==='angry'?3000:2000);
    restart();
  }
  function click() {
    const now=performance.now();
    if(emotion==='angry') return;
    taps=taps.filter(t=>now-t<3000); taps.push(now);
    setEmotion(taps.length>=3?'angry':taps.length>=2?'playful':'happy');
  }
  function render(now) {
    const quiet=still(), dt=last?Math.min((now-last)/1000,.04):0;
    last=now; if(!quiet) time+=dt;
    const age=(now-emotionStart)/1000;
    if(pointer.touchUntil && now>pointer.touchUntil) pointer.active=false;
    if(!quiet && now>nextGaze && !pointer.active) {
      const direct=Math.random()<.25;
      target.x=direct?0:(Math.random()*2-1)*.65;
      target.y=direct?0:(Math.random()*2-1)*.45;
      nextGaze=now+1400+Math.random()*2400;
    }
    if(!quiet && now>nextBlink) {
      wink=Math.random()<.2; blinkUntil=now+130+Math.random()*90; nextBlink=now+2600+Math.random()*4800;
    }
    const tx=quiet?0:pointer.active?pointer.x:target.x, ty=quiet?0:pointer.active?pointer.y:target.y;
    const ease=1-Math.exp(-dt*5);
    gaze.x=quiet?0:gaze.x+(tx-gaze.x)*ease; gaze.y=quiet?0:gaze.y+(ty-gaze.y)*ease;
    const angry=emotion==='angry', happy=emotion==='happy', playful=emotion==='playful';
    const settle=angry?Math.min(1,(3-age)/.7):1;
    const bob=quiet?0:Math.sin(time*1.1)*5-(happy?Math.sin(Math.min(age,1)*Math.PI)*13:0);
    const tilt=quiet?0:Math.sin(time*.65)*.025+(playful?Math.sin(age*3)*.09:0)+(angry?Math.sin(age*32)*.018*settle:0);
    const yaw=gaze.x*.20+(angry?-.25*settle:0), pitch=gaze.y*.08;
    const squash=quiet?1:1+(happy?Math.sin(age*9)*.025*Math.exp(-age*2):0);
    const project=(x,y,z)=>{
      const rx=x*Math.cos(yaw)+z*Math.sin(yaw), rz=z*Math.cos(yaw)-x*Math.sin(yaw);
      const ry=y*Math.cos(pitch)-rz*Math.sin(pitch), zz=rz*Math.cos(pitch)+y*Math.sin(pitch);
      const scale=680/(680-zz);
      return {x:300+(rx*Math.cos(tilt)-ry*Math.sin(tilt))*scale*squash,y:190+(rx*Math.sin(tilt)+ry*Math.cos(tilt))*scale/squash+bob,z:zz,scale};
    };
    ctx.clearRect(0,0,600,600);
    const light=document.documentElement.dataset.theme==='light';
    const shadow=ctx.createRadialGradient(300,537,3,300,537,145);
    shadow.addColorStop(0,light?'rgba(45,12,90,.24)':'rgba(0,0,0,.55)');shadow.addColorStop(1,'rgba(20,0,45,0)');
    ctx.save();ctx.translate(0,405);ctx.scale(1,.25);ctx.fillStyle=shadow;ctx.fillRect(100,350,400,350);ctx.restore();
    const halo=ctx.createRadialGradient(290,240,65,300,270,260);
    halo.addColorStop(0,`rgba(130,45,255,${angry?.16:.07})`);halo.addColorStop(1,'rgba(100,30,210,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,600,600);
    const dots=[];
    function surface(x,y,z,nx,ny,nz,r,opacity=1) {
      const p=project(x,y,z);
      const illumination=clamp(-nx*.4-ny*.65+nz*.65,0,1);
      dots.push({...p,r:r*p.scale,bright:light?26+illumination*38:23+illumination*65,alpha:opacity*(.45+illumination*.55)});
    }
    for(let arm=0;arm<arms.length;arm++) {
      const c=arms[arm], step=.021*density;
      for(let t=0;t<1;t+=step) {
        const p=curve(c,t), next=curve(c,Math.min(1,t+.005));
        const dx=next[0]-p[0],dy=next[1]-p[1],len=Math.hypot(dx,dy)||1;
        const wave=quiet?0:Math.sin(time*(1.1+arm*.065)-t*5+arm)*t*5;
        p[0]+=wave; p[1]+=quiet?0:Math.cos(time*1.3+arm+t*4)*t*5;
        if(angry){p[0]*=1-.17*t*settle;p[1]-=t*24*settle;}
        if(!quiet&&(happy||playful))p[0]+=Math.sin(age*9+arm+t*4)*t*7*Math.exp(-age*.6);
        const cap=t<.84?1:Math.sqrt(Math.max(0,1-((t-.84)/.16)**2));
        const radius=(38-12*t)*cap;
        for(let a=-Math.PI/2;a<=Math.PI/2;a+=.27*density) {
          const side=Math.sin(a),front=Math.cos(a);
          surface(p[0]-dy/len*side*radius,p[1]+dx/len*side*radius,p[2]+front*radius,-dy/len*side,dx/len*side,front,1.45+(1-t)*.4);
        }
      }
    }
    for(const p of head) {
      if(p.z<-.12)continue;
      // Large eye sockets are negative space in the curved surface.
      const socket=p.z>.68 && [ -1,1 ].some(side=>((p.x-side*.43)/.13)**2+((p.y-.20)/.145)**2<1);
      if(socket)continue;
      surface(p.x*163,p.y*147,p.z*112,p.x,p.y,p.z,1.3+Math.max(0,p.z)*.55);
    }
    dots.sort((a,b)=>a.z-b.z);
    for(const p of dots){ctx.fillStyle=`hsla(270,90%,${p.bright}%,${p.alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
    function faceDot(x,y,r=2.3,alpha=1) {
      const p=project(x,y,112);ctx.fillStyle=`hsla(278,100%,${light?56:88}%,${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,r*p.scale,0,Math.PI*2);ctx.fill();
    }
    // Dense luminous dotted eyes; expression geometry is independent of head geometry.
    for(const side of [-1,1]) {
      const ex=side*67+gaze.x*7, ey=29+gaze.y*6;
      const blink=!quiet && now<blinkUntil && (!wink||side===1);
      const closed=blink || (playful&&side===1&&age<.9);
      if(happy||closed) {
        for(let i=0;i<=12;i++){const u=i/12;faceDot(ex-12+u*24,ey+(happy?-Math.sin(u*Math.PI)*10:0),2.2);}
      } else {
        const height=angry?5:17;
        for(let y=-height;y<=height;y+=3.2)for(let x=-17;x<=17;x+=3.2){
          if((x/18)**2+(y/(height+1))**2<=1) {
            const p=project(ex+x,ey+y+(angry?side*x*.3:0),114);
            ctx.fillStyle=light?'#31114e':'#18082e';ctx.beginPath();ctx.arc(p.x,p.y,2.1*p.scale,0,Math.PI*2);ctx.fill();
          }
        }
        if(!angry){faceDot(ex-5,ey-7,2.6,.95);faceDot(ex-2,ey-4,1.5,.6);}
      }
      if(angry)for(let i=0;i<9;i++)faceDot(ex-14+i*3.5,ey-18+side*(i-4)*1.6,2);
    }
    if(!quiet && emotion!=='neutral' && age<1.2) {
      for(let i=0;i<36;i++){const a=i/36*Math.PI*2,rad=150+age*110;ctx.fillStyle=`rgba(185,112,255,${(1-age/1.2)*.5})`;ctx.beginPath();ctx.arc(300+Math.cos(a)*rad,270+Math.sin(a)*rad*.85,1.8,0,Math.PI*2);ctx.fill();}
    }
    if(angry&&!quiet)for(let i=0;i<7;i++)faceDot(90+i*5,-98-Math.sin(age*5+i)*8,1.7,.6*settle);
  }
  function animate(now) {
    frame=undefined;if(disposed||!visible||document.hidden)return;
    const start=performance.now();render(now);
    if(++samples<90 && performance.now()-start>20)slowFrames++;
    if(samples===90 && slowFrames>25 && density<1.8){density=1.9;buildHead();}
    if(!still())frame=requestAnimationFrame(animate);
  }
  function restart(){cancelAnimationFrame(frame);last=0;if(!disposed)frame=requestAnimationFrame(animate);}
  function move(e) {
    if(still())return;
    const r=host.getBoundingClientRect(),near=e.clientX>r.left-100&&e.clientX<r.right+100&&e.clientY>r.top-100&&e.clientY<r.bottom+100;
    pointer.active=near;pointer.x=clamp((e.clientX-r.left-r.width/2)/(r.width/2),-1,1);pointer.y=clamp((e.clientY-r.top-r.height*.4)/(r.height/2),-1,1);
    pointer.touchUntil=e.pointerType==='touch'?performance.now()+1800:0;
  }
  function leave(){pointer.active=false;nextGaze=0;}
  function resize(){const size=Math.max(1,host.clientWidth),dpr=Math.min(devicePixelRatio||1,2);canvas.width=canvas.height=Math.round(size*dpr);ctx.setTransform(canvas.width/600,0,0,canvas.height/600,0,0);render(performance.now());restart();}
  const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;restart();});observer.observe(host);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const settingsObserver=new MutationObserver(restart);settingsObserver.observe(document.body,{attributes:true,attributeFilter:['data-animations']});settingsObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerdown',move,{passive:true});document.addEventListener('pointerleave',leave);
  host.addEventListener('click',click);document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);
  host.dataset.expression='neutral';buildHead();resize();
  return()=>{disposed=true;cancelAnimationFrame(frame);clearTimeout(resetTimer);observer.disconnect();resizeObserver.disconnect();settingsObserver.disconnect();document.removeEventListener('pointermove',move);document.removeEventListener('pointerdown',move);document.removeEventListener('pointerleave',leave);host.removeEventListener('click',click);document.removeEventListener('visibilitychange',restart);reduced.removeEventListener('change',restart);};
}
