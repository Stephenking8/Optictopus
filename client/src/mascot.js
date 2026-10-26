/* OPTICTOPUS V7 — smiling 2D SVG octopus animation controller.
   Pointer coordinates remain local to the page; no tracking or third-party services. */
export function initMascot() {
  const removers = [];
  const on = (el, event, fn, options) => {
    el.addEventListener(event, fn, options);
    removers.push(() => el.removeEventListener(event, fn, options));
  };
  const mascot = document.querySelector("[data-mascot]");
  if (!mascot) return;
  const flight = mascot.querySelector("[data-octo-flight]");
  const motion =
    document.body.dataset.animations !== "off" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let count = 0,
    lastClick = -1,
    swimDirection = "left",
    swimming = false;
  let faceTimeout = 0,
    tickleTimeout = 0,
    eyeTimeout = 0,
    idleMoodTimer = 0,
    currentFlight = null;
  const idleExpressions = motion && mascot.dataset.autoExpressions !== "off";

  function setMouth(value) {
    mascot.dataset.mouth =
      value === true || value === "with" ? "with" : "without";
    return mascot.dataset.mouth;
  }
  function expression(name, duration = 0) {
    if (!["normal", "smile", "wink", "confused", "mad"].includes(name))
      name = "normal";
    clearTimeout(faceTimeout);
    mascot.dataset.expression = name;
    if (duration)
      faceTimeout = setTimeout(() => {
        mascot.dataset.expression = "normal";
      }, duration);
  }
  function lookAt(x, y) {
    const r = mascot.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = r.left + r.width * 0.5,
      cy = r.top + r.height * 0.52;
    mascot.style.setProperty(
      "--eye-x",
      `${(clamp((x - cx) / (r.width * 0.52), -1, 1) * 4.5).toFixed(2)}px`,
    );
    mascot.style.setProperty(
      "--eye-y",
      `${(clamp((y - cy) / (r.height * 0.55), -1, 1) * 3.5).toFixed(2)}px`,
    );
  }
  function eyesCenter() {
    mascot.style.setProperty("--eye-x", "0px");
    mascot.style.setProperty("--eye-y", "0px");
  }
  function tickle() {
    if (swimming) return;
    if (!motion) {
      expression("smile", 450);
      return;
    }
    clearTimeout(tickleTimeout);
    mascot.classList.add("is-tickled");
    expression("smile", 650);
    tickleTimeout = setTimeout(
      () => mascot.classList.remove("is-tickled"),
      650,
    );
  }
  function bubbles() {
    const host = mascot.parentElement;
    if (!host || !motion) return;
    for (let i = 0; i < 6; i++) {
      const bubble = document.createElement("span");
      bubble.className = "octo-bubble";
      bubble.style.setProperty("--dx", `${Math.round((i - 2.5) * 16)}px`);
      bubble.style.setProperty("--delay", `${i * 68}ms`);
      host.appendChild(bubble);
      setTimeout(() => bubble.remove(), 1750);
    }
  }
  function swim(requestedDirection) {
    if (swimming) return Promise.resolve(false);
    const direction =
      requestedDirection === "left" || requestedDirection === "right"
        ? requestedDirection
        : swimDirection;
    swimDirection = direction === "left" ? "right" : "left";
    count = 0;
    lastClick = -1;
    swimming = true;
    clearTimeout(tickleTimeout);
    clearTimeout(faceTimeout);
    mascot.classList.remove("is-tickled");
    mascot.classList.add("is-swimming");
    mascot.dataset.direction = direction;
    expression("wink");
    bubbles();
    const r = mascot.getBoundingClientRect();
    const sign = direction === "right" ? 1 : -1;
    // Enough travel to be fully outside the viewport on screens of any width.
    const distance =
      direction === "right"
        ? innerWidth - r.left + r.width + 80
        : r.right + r.width + 80;
    const x = sign * distance;
    if (!motion || !flight || !flight.animate) {
      mascot.classList.remove("is-swimming");
      swimming = false;
      expression("normal");
      return Promise.resolve(true);
    }
    if (currentFlight) currentFlight.cancel();
    currentFlight = flight.animate(
      [
        {
          offset: 0,
          transform: "translate3d(0px,0px,0) rotate(0deg) scale(1)",
          opacity: 1,
        },
        {
          offset: 0.12,
          transform: `translate3d(${-sign * 10}px,18px,0) rotate(${-sign * 10}deg) scale(.98)`,
          opacity: 1,
        },
        {
          offset: 0.31,
          transform: `translate3d(${x * 0.43}px,-34px,0) rotate(${sign * 18}deg) scale(.93)`,
          opacity: 1,
        },
        {
          offset: 0.48,
          transform: `translate3d(${x}px,-85px,0) rotate(${sign * 28}deg) scale(.80)`,
          opacity: 1,
        },
        {
          offset: 0.52,
          transform: `translate3d(${x * 1.04}px,-95px,0) rotate(${sign * 25}deg) scale(.80)`,
          opacity: 0,
        },
        {
          offset: 0.59,
          transform: `translate3d(${x * 1.04}px,-95px,0) rotate(${sign * 25}deg) scale(.80)`,
          opacity: 0,
        },
        {
          offset: 0.76,
          transform: `translate3d(${x * 0.39}px,-42px,0) rotate(${-sign * 16}deg) scale(.91)`,
          opacity: 1,
        },
        {
          offset: 0.91,
          transform: `translate3d(${-sign * 15}px,8px,0) rotate(${sign * 6}deg) scale(1.03)`,
          opacity: 1,
        },
        {
          offset: 1,
          transform: "translate3d(0px,0px,0) rotate(0deg) scale(1)",
          opacity: 1,
        },
      ],
      { duration: 2850, easing: "cubic-bezier(.3,.05,.18,1)", fill: "both" },
    );
    return currentFlight.finished
      .catch(() => {})
      .then(() => {
        currentFlight?.cancel();
        currentFlight = null;
        swimming = false;
        mascot.classList.remove("is-swimming");
        expression("smile", 750);
        return true;
      });
  }

  on(
    document,
    "pointermove",
    (event) => {
      if (event.pointerType !== "touch") lookAt(event.clientX, event.clientY);
    },
    { passive: true },
  );
  on(document, "pointerout", (e) => {
    if (!e.relatedTarget) eyesCenter();
  });
  on(
    document,
    "pointerdown",
    (event) => {
      if (event.pointerType === "touch") {
        lookAt(event.clientX, event.clientY);
        clearTimeout(eyeTimeout);
        eyeTimeout = setTimeout(eyesCenter, 1650);
      }
    },
    { passive: true },
  );
  on(
    document,
    "touchmove",
    (event) => {
      const t = event.touches[0];
      if (t) {
        lookAt(t.clientX, t.clientY);
        clearTimeout(eyeTimeout);
        eyeTimeout = setTimeout(eyesCenter, 1650);
      }
    },
    { passive: true },
  );
  on(mascot, "pointerenter", (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") tickle();
  });
  on(mascot, "click", () => {
    if (swimming) return;
    const now = performance.now();
    count = now - lastClick <= 2500 ? count + 1 : 1;
    lastClick = now;
    if (count >= 3) swim();
    else tickle();
  });
  on(mascot, "keydown", (e) => {
    if (e.key === "Escape") eyesCenter();
  });
  on(document, "visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(tickleTimeout);
      mascot.classList.remove("is-tickled");
      eyesCenter();
    }
  });
  // Normal means an open-mouth HAPPY expression. Occasionally blink-smile or wink
  // while hovering at rest; never interrupt a tickle or a swim-away.
  function scheduleIdleMood() {
    clearTimeout(idleMoodTimer);
    if (!idleExpressions || document.hidden) return;
    idleMoodTimer = setTimeout(
      () => {
        if (!swimming && !mascot.classList.contains("is-tickled")) {
          // Mostly a closed-eye happy smile; occasionally a playful wink.
          expression(Math.random() < 0.78 ? "smile" : "wink", 850);
        }
        scheduleIdleMood();
      },
      5600 + Math.random() * 3500,
    );
  }
  on(document, "visibilitychange", () => {
    if (document.hidden) clearTimeout(idleMoodTimer);
    else scheduleIdleMood();
  });
  setMouth(mascot.dataset.mouth || "with");
  expression("normal");
  scheduleIdleMood();
  window.OptictopusMascot = {
    setMouth,
    expression,
    tickle,
    swim,
    getState: () => ({
      mouth: mascot.dataset.mouth,
      expression: mascot.dataset.expression,
      swimming,
    }),
  };
  return () => {
    removers.forEach((fn) => fn());
    [faceTimeout, tickleTimeout, eyeTimeout, idleMoodTimer].forEach(
      clearTimeout,
    );
    currentFlight?.cancel();
    delete window.OptictopusMascot;
  };
}
