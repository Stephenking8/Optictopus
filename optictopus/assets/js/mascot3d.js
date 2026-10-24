/* OPTICTOPUS 5.0 | Standalone WebGL2 baby-octopus renderer.
   Uses a more realistic procedural GLB and octopus-like motion.
   Pointer information is never stored or transmitted. */
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

 // Cursor glow removed by user request.

 if(!mascot||!canvas)return;
 const fallback=mascot.querySelector('[data-octo-fallback]');
 // Interactive fallback (PNG) still works with site.js when WebGL is unavailable.
 const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'default'});
 if(!gl)return;
 const vert=`#version 300 es
 precision highp float;
 in vec3 a_pos;
 in vec3 a_normal;
 uniform float u_time;
 uniform float u_swim;
 uniform float u_arm;
 uniform float u_eyeKind;
 uniform vec2 u_look;
 uniform vec3 u_pivot;
 uniform mat3 u_rot;
 uniform float u_aspect;
 out vec3 v_normal;
 out vec3 v_world;
 void main(){
   vec3 p=a_pos;
   float pulse=sin(u_time*(1.35+u_swim*2.25));
   if(u_arm>=0.){
     float t=clamp(length(p-u_pivot)/2.25,0.,1.);
     float phase=u_time*(1.55+u_swim*4.1)+u_arm*0.82;
     float flex=(0.014+u_swim*0.082)*(0.16+t*t*0.84);
     p.x+=sin(phase*1.03-t*7.4)*flex;
     p.y+=cos(phase*.91-t*5.9)*flex*.62;
     p.z+=sin(phase*.77+t*9.6)*flex*(0.34+t*0.74);
   } else {
     float upper=clamp((p.y+0.35)/1.65,0.,1.);
     float squash=pulse*0.022*upper;
     p.y+=pulse*0.012;
     p.x*=1.0+squash;
     p.z*=1.0+squash*.82;
     p.z+=pulse*0.018*upper;
   }
   if(u_eyeKind>0.5){p.x+=u_look.x*.028;p.y+=u_look.y*.020;}
   p=u_rot*p;
   v_normal=normalize(u_rot*a_normal);
   v_world=p;
   vec3 view=p-vec3(0.,.11,0.);
   gl_Position=vec4(view.x/(2.15*u_aspect),view.y/2.15,-view.z/3.2,1.0);
 }
 `;
 const frag=`#version 300 es
 precision highp float;
 in vec3 v_normal;
 in vec3 v_world;
 uniform vec3 u_color;
 uniform float u_rough;
 out vec4 outColor;
 void main(){
  vec3 N=normalize(v_normal), V=vec3(0.,.13,1.);
  vec3 L1=normalize(vec3(-.58,1.20,1.55));
  vec3 L2=normalize(vec3(.62,.36,1.05));
  float d1=max(dot(N,L1),0.), d2=max(dot(N,L2),0.);
  vec3 col=u_color*(.35+.56*d1+.17*d2);
  float softSpec=pow(max(dot(N,normalize(L1+V)),0.),mix(85.,22.,u_rough));
  float spec2=pow(max(dot(N,normalize(L2+V)),0.),mix(64.,16.,u_rough));
  float rim=pow(1.-max(dot(N,V),0.),2.4);
  col+=vec3(.95,.86,1.)*softSpec*(.52-u_rough*.18);
  col+=vec3(.52,.40,.78)*spec2*.10;
  col+=vec3(.47,.30,.76)*rim*.11;
  col=pow(max(col,vec3(0.)),vec3(.92));
  outColor=vec4(clamp(col,0.,1.),1.);
 }
 `;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
 let program;
 try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program))}
 catch(e){console.warn('OPTICTOPUS 3D shader unavailable:',e);return}
 const U={};for(const name of ['u_time','u_swim','u_arm','u_eyeKind','u_look','u_pivot','u_rot','u_aspect','u_color','u_rough'])U[name]=gl.getUniformLocation(program,name);
 const A={pos:gl.getAttribLocation(program,'a_pos'),normal:gl.getAttribLocation(program,'a_normal')};
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 const meshes=[];
 function accessorInfo(json,buf,id){const a=json.accessors[id],v=json.bufferViews[a.bufferView];
   const offset=(v.byteOffset||0)+(a.byteOffset||0),count=a.count;
   const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
   if(a.componentType===5126)return new Float32Array(buf,offset,count*components);
   if(a.componentType===5125)return new Uint32Array(buf,offset,count*components);
   if(a.componentType===5123)return new Uint16Array(buf,offset,count*components);
   throw new Error('Unsupported glTF accessor');
 }
 async function load(){
  const response=await fetch(canvas.dataset.model,{credentials:'same-origin'});
  if(!response.ok)throw new Error('3D model request failed '+response.status);
  const array=await response.arrayBuffer(),view=new DataView(array);
  if(view.getUint32(0,true)!==0x46546c67)throw new Error('Not a GLB file');
  const jsonLen=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(array,20,jsonLen)));
  const binOffset=20+jsonLen+8;
  // Copy to an aligned buffer so TypedArray views are safe on every engine.
  const binary=array.slice(binOffset);
  for(const node of json.nodes){
    if(node.mesh===undefined)continue;
    const kind=node.extras?.kind||'',armIndex=node.extras?.armIndex??-1;
    for(const primitive of json.meshes[node.mesh].primitives){
      const pos=accessorInfo(json,binary,primitive.attributes.POSITION),normal=accessorInfo(json,binary,primitive.attributes.NORMAL),indices=accessorInfo(json,binary,primitive.indices);
      const create=(target,payload)=>{const buffer=gl.createBuffer();gl.bindBuffer(target,buffer);gl.bufferData(target,payload,gl.STATIC_DRAW);return buffer};
      const pbuf=create(gl.ARRAY_BUFFER,pos),nbuf=create(gl.ARRAY_BUFFER,normal),ibuf=create(gl.ELEMENT_ARRAY_BUFFER,indices);
      const m=json.materials[primitive.material].pbrMetallicRoughness;
      const rgba=m.baseColorFactor;
      meshes.push({pbuf,nbuf,ibuf,count:indices.length,indexType:indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,kind,armIndex,
        pivot:node.extras?.pivot||[0,0,0],color:rgba.slice(0,3),rough:m.roughnessFactor||.35});
    }
  }
  if(meshes.length===0)throw new Error('GLB contained no drawable meshes');
  fallback?.classList.add('is-model-ready');
  canvas.classList.add('is-model-ready');
  start();
 }
 let lookX=0,lookY=0,targetX=0,targetY=0,rotationX=0,rotationY=0,live=false;
 let lastTap=0,raf=0,frame=0,visible=true;
 const time0=performance.now();
 const easing=.075;
 function pointAt(x,y){
  const r=canvas.getBoundingClientRect();const centerX=r.left+r.width*.5, centerY=r.top+r.height*.48;
  targetX=clamp((x-centerX)/Math.max(160,r.width*.88),-1,1);
  targetY=clamp((centerY-y)/Math.max(160,r.height*.88),-1,1);
 }
 document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')pointAt(e.clientX,e.clientY)},{passive:true});
 document.addEventListener('touchstart',e=>{const t=e.touches[0];if(t){pointAt(t.clientX,t.clientY);lastTap=performance.now()}},{passive:true});
 document.addEventListener('touchmove',e=>{const t=e.touches[0];if(t){pointAt(t.clientX,t.clientY);lastTap=performance.now()}},{passive:true});
 mascot.addEventListener('click',e=>{if(e.detail===0){targetX=0;targetY=0}});
 function size(){
   const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,1.7);
   const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
   if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 }
 let last=0;
 function render(now){
  raf=0;
  if(!visible)return;
  // Limit draw calls on low-power mobile without affecting click responsiveness.
  if(now-last<25&&frame%2===1){frame++;raf=requestAnimationFrame(render);return}
  last=now;frame++;
  size();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const time=(now-time0)*.001;
  const swim=mascot.classList.contains('is-swimming')?1:mascot.classList.contains('is-tickled')?.4:0;
  if(lastTap&&now-lastTap>2200){targetX*=.99;targetY*=.99}
  lookX+=(targetX-lookX)*.14;lookY+=(targetY-lookY)*.14;
  rotationY+=(lookX*.12-rotationY)*easing;rotationX+=(lookY*.06-rotationX)*easing;
  const cy=Math.cos(rotationY),sy=Math.sin(rotationY),cx=Math.cos(rotationX),sx=Math.sin(rotationX);
  const matrix=new Float32Array([cy,0,-sy,sy*sx,cx,cy*sx,sy*cx,-sx,cy*cx]);
  gl.useProgram(program);
  gl.uniform1f(U.u_time,motion?time:0);gl.uniform1f(U.u_swim,swim);
  gl.uniform2f(U.u_look,lookX,lookY);gl.uniformMatrix3fv(U.u_rot,false,matrix);
  gl.uniform1f(U.u_aspect,canvas.width/canvas.height);
  for(const m of meshes){
    gl.uniform1f(U.u_arm,m.kind==='arm'?m.armIndex:-1);
    gl.uniform1f(U.u_eyeKind,m.kind==='eye'||m.kind==='iris'?1:0);
    gl.uniform3fv(U.u_pivot,m.pivot);gl.uniform3fv(U.u_color,m.color);gl.uniform1f(U.u_rough,m.rough);
    gl.bindBuffer(gl.ARRAY_BUFFER,m.pbuf);gl.enableVertexAttribArray(A.pos);gl.vertexAttribPointer(A.pos,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,m.nbuf);gl.enableVertexAttribArray(A.normal);gl.vertexAttribPointer(A.normal,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ibuf);gl.drawElements(gl.TRIANGLES,m.count,m.indexType,0);
  }
  if(motion)raf=requestAnimationFrame(render);
 }
 function start(){
   const observer=window.IntersectionObserver?new IntersectionObserver(entries=>{
     visible=entries[0].isIntersecting&&!document.hidden;
     if(visible&&!raf)raf=requestAnimationFrame(render)
   },{threshold:0}):null;
   if(observer)observer.observe(mascot);
   document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible&&!raf)raf=requestAnimationFrame(render)});
   raf=requestAnimationFrame(render);
 }
 load().catch(e=>{console.warn('OPTICTOPUS: using mascot image fallback.',e);canvas.hidden=true});
})();
