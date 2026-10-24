(() => {
  'use strict';
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.querySelector('.nav-open');
  if (sidebar && openBtn) {
    openBtn.addEventListener('click', () => {
      const open=sidebar.classList.toggle('open'); openBtn.setAttribute('aria-expanded',String(open));
    });
    document.addEventListener('click',e=> {
      if(sidebar.classList.contains('open') && !sidebar.contains(e.target) && !openBtn.contains(e.target)) {
        sidebar.classList.remove('open'); openBtn.setAttribute('aria-expanded','false');
      }
    });
  }
  document.querySelector('.small-theme-toggle')?.addEventListener('click', () => {
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try { localStorage.setItem('portfolio_theme',next); }catch(e){}
  });
  document.querySelectorAll('form[data-confirm]').forEach(form=>form.addEventListener('submit',e=> {
    if(!window.confirm(form.dataset.confirm)) e.preventDefault();
  }));
  function draw(canvas){
    let points=[];
    try{points=JSON.parse(canvas.dataset.chart||'[]')}catch(e){}
    const box=canvas.getBoundingClientRect();
    if(!box.width) return;
    const dpr=Math.min(window.devicePixelRatio||1,2), width=box.width, height=240;
    canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.scale(dpr,dpr);
    const color=getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#fafafa';
    const subtle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#444';
    const violet=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#8b7cff';
    const pad={left:30,right:14,top:22,bottom:30};
    const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
    ctx.font='11px DM Sans, sans-serif';ctx.textAlign='right';
    const max=Math.max(1,...points.map(p=>Math.max(Number(p.views)||0,Number(p.visitors)||0)));
    for(let i=0;i<=4;i++){
      const y=pad.top+h*i/4;
      ctx.strokeStyle=subtle;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();
      ctx.fillStyle=color;ctx.globalAlpha=.6;ctx.fillText(String(Math.round(max*(4-i)/4)),pad.left-9,y+4);ctx.globalAlpha=1;
    }
    if(!points.length){ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText('No traffic data in this period',width/2,height/2);return;}
    const x=i=>pad.left+(points.length===1?.5:i/(points.length-1))*w;
    const y=v=>pad.top+h-(Number(v)||0)/max*h;
    const series=[['views',violet],['visitors','#65c9bc']];
    series.forEach(([key,stroke])=>{
      ctx.beginPath();ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.lineJoin='round';
      points.forEach((p,i)=> i?ctx.lineTo(x(i),y(p[key])):ctx.moveTo(x(i),y(p[key])));ctx.stroke();
      if(points.length<=14)points.forEach((p,i)=>{ctx.beginPath();ctx.fillStyle=stroke;ctx.arc(x(i),y(p[key]),3,0,Math.PI*2);ctx.fill();});
    });
    ctx.fillStyle=color;ctx.globalAlpha=.7;ctx.textAlign='center';
    const step=Math.max(1,Math.ceil(points.length/6));
    points.forEach((p,i)=>{if(i%step===0 || i===points.length-1){let label=String(p.day||'').slice(5);ctx.fillText(label,x(i),height-10);}});
    ctx.globalAlpha=1;
  }
  const charts=[...document.querySelectorAll('canvas[data-chart]')];
  if(charts.length){
    charts.forEach(draw);
    let debounce;window.addEventListener('resize',()=>{clearTimeout(debounce);debounce=setTimeout(()=>charts.forEach(draw),160);});
    document.querySelector('.small-theme-toggle')?.addEventListener('click',()=>charts.forEach(draw));
  }
})();
