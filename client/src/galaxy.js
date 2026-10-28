/**
 * OPTICTOPUS depth field.
 * Three perspective layers, atmospheric light, drifting dust and slow orbital arcs.
 * All motion is canvas-only; no DOM elements cover navigation or buttons.
 */
export function initGalaxy() {
  const canvas = document.querySelector("[data-galaxy-sky]");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = matchMedia("(pointer: coarse)");
  const target = { x: 0, y: 0, scroll: 0 };
  const camera = { x: 0, y: 0, scroll: 0 };
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (value, size) => ((value % size) + size) % size;

  let width = 1;
  let height = 1;
  let stars = [];
  let motes = [];
  let clouds = [];
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let disposed = false;
  let hero = null;
  let tick = 0;
  let running = false;

  function animateEnabled() {
    return !reducedMotion.matches &&
      document.body.dataset.animations !== "off" &&
      document.body.dataset.background !== "clean";
  }

  // Repeatable stars prevent a visible jump when the window is resized.
  function generator() {
    let seed = 672813;
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function makeScene() {
    const random = generator();
    const area = width * height;
    const lowPower = coarsePointer.matches || (navigator.hardwareConcurrency || 8) <= 4;
    const budget = Math.min(lowPower ? 145 : 240, Math.max(80, Math.round(area / (lowPower ? 10500 : 7500))));
    stars = Array.from({ length: budget }, (_, i) => {
      const depth = i < budget * 0.42 ? 0.18 + random() * 0.18 :
        i < budget * 0.77 ? 0.48 + random() * 0.18 : 0.79 + random() * 0.21;
      return {
        x: random() * width,
        y: random() * height,
        depth,
        size: (0.35 + random() * 1.55) * (0.55 + depth * 0.8),
        alpha: 0.18 + depth * 0.42 + random() * 0.12,
        phase: random() * TAU,
        speed: 0.3 + random() * 0.75,
      };
    });
    motes = Array.from({ length: lowPower ? 8 : 15 }, () => ({
      x: random() * width,
      y: random() * height,
      radius: 3 + random() * 10,
      depth: 0.5 + random() * 0.5,
      phase: random() * TAU,
      alpha: 0.035 + random() * 0.045,
    }));
    clouds = Array.from({ length: 5 }, (_, i) => ({
      x: width * (0.1 + random() * 0.8),
      y: height * (0.1 + random() * 0.8),
      radius: (125 + random() * 180) * Math.min(1.6, width / 1000 + 0.4),
      phase: random() * TAU,
      depth: 0.12 + i * 0.16,
      alpha: 0.065 + random() * 0.035,
    }));
  }

  function resize() {
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    makeScene();
    render();
    restart();
  }

  function atmosphericLight(isLight, moving) {
    for (const cloud of clouds) {
      const dx = moving ? Math.sin(elapsed * 0.10 + cloud.phase) * 25 : 0;
      const dy = moving ? Math.cos(elapsed * 0.08 + cloud.phase) * 18 : 0;
      const x = cloud.x + dx + camera.x * cloud.depth * 0.5;
      const y = cloud.y + dy + camera.y * cloud.depth * 0.5 - camera.scroll * cloud.depth * 0.06;
      const r = cloud.radius;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = cloud.alpha * (isLight ? 0.40 : 1);
      gradient.addColorStop(0, isLight ? "rgba(134,92,194," + a + ")" : "rgba(147,89,252," + a + ")");
      gradient.addColorStop(0.42, isLight ? "rgba(160,132,225," + a * 0.4 + ")" : "rgba(87,71,189," + a * 0.46 + ")");
      gradient.addColorStop(1, "rgba(96,55,165,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function starfield(isLight, moving) {
    for (const star of stars) {
      const d = star.depth;
      const x = wrap(star.x + camera.x * (0.16 + d * 1.7) + (moving ? Math.sin(elapsed * 0.16 + star.phase) * d * 5 : 0) + 16, width + 32) - 16;
      const y = wrap(star.y + camera.y * (0.12 + d * 1.2) - camera.scroll * d * 0.11 - (moving ? elapsed * (1.5 + d * 7) : 0) + 16, height + 32) - 16;
      const flicker = moving ? 0.84 + 0.16 * Math.sin(elapsed * star.speed * 1.7 + star.phase) : 1;
      const alpha = star.alpha * flicker * (isLight ? 0.48 : 1);
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, TAU);
      ctx.fillStyle = isLight ? "rgba(91,60,145," + alpha + ")" : "rgba(213,185,255," + alpha + ")";
      ctx.fill();
      // Only the brightest foreground stars receive a subtle glow.
      if (d > 0.94 && star.size > 1.45 && !isLight) {
        ctx.strokeStyle = "rgba(191,154,255," + alpha * 0.23 + ")";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
      }
    }
  }

  function orbitLines(isLight, moving) {
    ctx.save();
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const phase = elapsed * (0.07 + i * 0.011) + i * 1.7;
      const y = height * (0.16 + i * 0.24) - camera.scroll * (0.016 + i * 0.01) +
        camera.y * (0.25 + i * 0.13) + (moving ? Math.sin(phase) * 12 : 0);
      ctx.beginPath();
      ctx.moveTo(-40, y + 20);
      ctx.bezierCurveTo(width * 0.24, y - 70, width * 0.61, y + 85, width + 40, y - 24);
      ctx.strokeStyle = isLight ? "rgba(91,65,158,0.045)" : "rgba(159,112,235," + (0.035 + i * 0.012) + ")";
      ctx.stroke();
    }
    ctx.restore();
  }

  function foregroundDust(isLight, moving) {
    for (const mote of motes) {
      const x = wrap(mote.x + camera.x * mote.depth * 1.5 + 25, width + 50) - 25;
      const y = wrap(mote.y + camera.y * mote.depth - camera.scroll * mote.depth * 0.16 -
        (moving ? elapsed * (3 + mote.depth * 8) : 0) + 25, height + 50) - 25;
      const r = mote.radius;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, isLight ? "rgba(132,85,201," + mote.alpha * 0.35 + ")" : "rgba(205,160,255," + mote.alpha + ")");
      gradient.addColorStop(1, "rgba(161,110,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function updateHero(moving) {
    if ((tick++ % 24) === 0 || !hero?.isConnected) hero = document.querySelector(".hero-art");
    if (!hero) return;
    const x = moving ? camera.x : 0;
    const y = moving ? camera.y : 0;
    hero.style.setProperty("--depth-far-x", (x * 0.17).toFixed(2) + "px");
    hero.style.setProperty("--depth-far-y", (y * 0.17).toFixed(2) + "px");
    hero.style.setProperty("--depth-near-x", (x * 0.55).toFixed(2) + "px");
    hero.style.setProperty("--depth-near-y", (y * 0.55).toFixed(2) + "px");
  }

  function render() {
    const moving = animateEnabled();
    const isLight = document.documentElement.dataset.theme === "light";
    ctx.clearRect(0, 0, width, height);
    if (document.body.dataset.background === "clean") {
      updateHero(false);
      return;
    }
    atmosphericLight(isLight, moving);
    starfield(isLight, moving);
    orbitLines(isLight, moving);
    foregroundDust(isLight, moving);
    updateHero(moving);
  }

  function draw(now) {
    frame = 0;
    if (disposed || document.hidden) { running = false; return; }
    const moving = animateEnabled();
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
    last = now;
    if (moving) {
      elapsed += dt;
      const ease = 1 - Math.exp(-dt * 4);
      camera.x += (target.x - camera.x) * ease;
      camera.y += (target.y - camera.y) * ease;
      camera.scroll += (target.scroll - camera.scroll) * (1 - Math.exp(-dt * 3));
    } else {
      camera.x = 0;
      camera.y = 0;
      camera.scroll = 0;
    }
    render();
    if (moving) frame = requestAnimationFrame(draw);
    else running = false;
  }

  function restart() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (!disposed && !document.hidden) {
      running = true;
      frame = requestAnimationFrame(draw);
    }
  }

  function onPointerMove(event) {
    if (!animateEnabled() || coarsePointer.matches) return;
    target.x = clamp(event.clientX / width - 0.5, -0.5, 0.5) * 48;
    target.y = clamp(event.clientY / height - 0.5, -0.5, 0.5) * 34;
  }
  function onPointerLeave() {
    target.x = 0;
    target.y = 0;
  }
  function onScroll() {
    target.scroll = scrollY || 0;
  }
  function onVisibility() {
    if (!document.hidden) restart();
    else { cancelAnimationFrame(frame); frame = 0; running = false; }
  }

  const observer = new MutationObserver(restart);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-animations", "data-background"] });
  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", onPointerMove, { passive: true });
  addEventListener("pointerleave", onPointerLeave);
  addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", restart);
  coarsePointer.addEventListener("change", resize);

  onScroll();
  resize();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    removeEventListener("resize", resize);
    removeEventListener("pointermove", onPointerMove);
    removeEventListener("pointerleave", onPointerLeave);
    removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", restart);
    coarsePointer.removeEventListener("change", resize);
    if (hero?.isConnected) {
      for (const name of ["--depth-far-x", "--depth-far-y", "--depth-near-x", "--depth-near-y"]) hero.style.removeProperty(name);
    }
  };
}
