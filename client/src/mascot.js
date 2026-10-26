// A dotted octopus: perspective shading, pointer-following eyes and springy particles.
export function initMascot() {
  const host = document.querySelector('[data-mascot]');
  const canvas = host?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return () => {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame, visible = true, time = 0, last = 0, pulse = 0;
  const pointer = { x: 250, y: 190, active: false };
  const gaze = { x: 0, y: 0 };
  const points = [];
  // An ellipsoid with a quiet central face, entirely built from purple dots.
  for (let y = -1; y <= 1; y += .055) {
    const radius = Math.sqrt(1 - y * y);
    const n = Math.max(8, Math.round(radius * 100));
    for (let j = 0; j < n; j++) {
      const a = j / n * Math.PI * 2;
      points.push({ x: radius * Math.cos(a), y, z: radius * Math.sin(a), dx: 0, dy: 0, vx: 0, vy: 0 });
    }
  }
  const still = () => media.matches || document.body.dataset.animations === 'off';
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = Math.max(1, host.clientWidth);
    canvas.width = canvas.height = Math.round(size * dpr);
    ctx.setTransform(canvas.width / 500, 0, 0, canvas.height / 500, 0, 0);
    draw(0);
  }
  function dot(x, y, r, alpha, light = 72) {
    ctx.fillStyle = `hsla(270, 85%, ${light}%, ${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function draw(dt) {
    const reduced = still();
    if (!reduced) time += dt;
    const bob = reduced ? 0 : Math.sin(time * .9) * 5;
    const gx = pointer.active && !reduced ? Math.max(-1, Math.min(1, (pointer.x - 250) / 180)) : 0;
    const gy = pointer.active && !reduced ? Math.max(-1, Math.min(1, (pointer.y - 190) / 180)) : 0;
    gaze.x += (gx - gaze.x) * .09; gaze.y += (gy - gaze.y) * .09;
    ctx.clearRect(0, 0, 500, 500);
    // Eight tapered, curling arms, each formed from rows of individual dots.
    for (let arm = 0; arm < 8; arm++) {
      const side = arm < 4 ? -1 : 1, lane = arm < 4 ? 3 - arm : arm - 4;
      for (let step = 0; step < 35; step++) {
        const t = step / 34, wave = reduced ? 0 : Math.sin(time * 1.6 - t * 5 + arm * .7) * t * 9;
        const x = 250 + side * (18 + lane * 26 + t * (26 + lane * 15) + Math.sin(t * 5) * 17) + wave;
        const y = 274 + bob + t * (153 - lane * 20) - Math.pow(t, 4) * (35 + lane * 6);
        for (let row = -2; row <= 2; row++) dot(x + row * (4.4 - t * 2.8), y, 1.7 - t * .65, .85 - Math.abs(row) * .12);
      }
    }
    for (const p of points) {
      const angle = gaze.x * .15 + (reduced ? 0 : Math.sin(time * .4) * .04);
      const x = p.x * Math.cos(angle) + p.z * Math.sin(angle);
      const z = p.z * Math.cos(angle) - p.x * Math.sin(angle);
      if (z < -.2) continue;
      const bx = 250 + x * 126, by = 184 + p.y * 124 + bob;
      const face = z > .6 && (x / .64) ** 2 + ((p.y - .22) / .58) ** 2 < 1;
      let fx = 0, fy = 0;
      if (!reduced && pointer.active) {
        const dx = bx - pointer.x, dy = by - pointer.y, d = Math.hypot(dx, dy);
        if (d < 60 && d > .1) { fx = dx / d * (60 - d) * .13; fy = dy / d * (60 - d) * .13; }
      }
      p.vx = (p.vx + (fx + p.x * pulse - p.dx) * .08) * .78;
      p.vy = (p.vy + (fy + p.y * pulse - p.dy) * .08) * .78;
      p.dx = reduced ? 0 : p.dx + p.vx; p.dy = reduced ? 0 : p.dy + p.vy;
      const alpha = face ? .045 : .2 + Math.max(0, z) * .65;
      dot(bx + p.dx, by + p.dy, 1.3 + Math.max(0, z) * .65, alpha, 58 + (1 - p.y) * 11);
    }
    const blink = !reduced && time % 6.4 > 6.22;
    for (const side of [-1, 1]) for (let i = 0; i < (blink ? 1 : 3); i++) {
      dot(250 + side * 30 + gaze.x * 12, 198 + gaze.y * 9 + bob + i * 5, 2.9, 1, 87);
    }
    pulse *= .91;
  }
  function animate(now) {
    frame = undefined;
    if (!visible || document.hidden || still()) { draw(0); return; }
    draw(Math.min((now - (last || now)) / 1000, .04)); last = now;
    frame = requestAnimationFrame(animate);
  }
  function restart() { cancelAnimationFrame(frame); last = 0; frame = requestAnimationFrame(animate); }
  function move(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width * 500;
    pointer.y = (e.clientY - r.top) / r.height * 500;
    pointer.active = true;
  }
  function leave() { pointer.active = false; }
  function pop() { if (!still()) pulse = 32; }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
  observer.observe(host);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const settingsObserver = new MutationObserver(restart); settingsObserver.observe(document.body, { attributes: true, attributeFilter: ['data-animations'] });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  host.addEventListener('pointerdown', move, { passive: true });
  host.addEventListener('click', pop);
  document.addEventListener('visibilitychange', restart);
  media.addEventListener('change', restart);
  resize(); restart();
  return () => {
    cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); settingsObserver.disconnect();
    document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave);
    host.removeEventListener('pointerdown', move); host.removeEventListener('click', pop);
    document.removeEventListener('visibilitychange', restart); media.removeEventListener('change', restart);
  };
}
