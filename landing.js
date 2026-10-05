// Landing page — cursor reveal.
// The dark cover (#base) is the real page. A copy of it in the paper theme (#reveal)
// sits on top, masked to a circle that follows the cursor / finger.
(() => {
  "use strict";

  const world  = document.getElementById("world");
  const base   = document.getElementById("base");
  const reveal = document.getElementById("reveal");
  const ring   = document.getElementById("ring");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  /* ---- tune here ---- */
  const RADIUS_MIN   = 110;   // px, smallest ring
  const RADIUS_MAX   = 190;   // px, largest ring
  const RADIUS_VW    = 0.15;  // ring radius as a fraction of window width (clamped by min/max)
  const HOVER_GROW   = 1.3;   // ring grows by this factor over buttons/links
  const FOLLOW_SPEED = 0.2;   // 0–1, higher = ring sticks closer to the cursor
  const GROW_SPEED   = 0.12;  // 0–1, how fast the ring opens/closes
  /* ------------------- */

  // Touch devices get a different hint
  const hint = base.querySelector("[data-hint]");
  if (hint && coarse) hint.textContent = "Touch and drag — the ring uncovers the page.";

  // Build the paper copy from the dark layer's content
  const clone = base.querySelector(".content").cloneNode(true);
  clone.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
  clone.querySelectorAll("a, button").forEach(n => n.setAttribute("tabindex", "-1"));
  reveal.appendChild(clone);

  // Shared state
  let tx = innerWidth / 2, ty = innerHeight * 0.45;   // target (client coords)
  let x = tx, y = ty, r = 0;                           // current, smoothed
  let away = false, overInteractive = false, raf = 0;

  const radiusBase = () => Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, innerWidth * RADIUS_VW));

  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

  // The copy can't be hovered (it ignores the pointer), so mirror hover/focus onto it
  const origEls  = base.querySelectorAll("[data-mirror]");
  const cloneEls = reveal.querySelectorAll("[data-mirror]");
  origEls.forEach((el, i) => {
    const twin = cloneEls[i];
    el.addEventListener("pointerenter", () => { twin.classList.add("hover"); overInteractive = true; kick(); });
    el.addEventListener("pointerleave", () => { twin.classList.remove("hover"); overInteractive = false; kick(); });
    el.addEventListener("focus", () => twin.classList.add("focus"));
    el.addEventListener("blur",  () => twin.classList.remove("focus"));
  });

  if (reduce) {            // no animation: show the paper theme everywhere
    world.classList.add("static");
    ring.hidden = true;
    return;
  }

  function frame() {
    raf = 0;
    const target = away ? 0 : radiusBase() * (overInteractive ? HOVER_GROW : 1);
    const dx = tx - x, dy = ty - y, dr = target - r;
    x += dx * FOLLOW_SPEED;
    y += dy * FOLLOW_SPEED;
    r += dr * GROW_SPEED;

    // mask lives in page coordinates, so add the scroll offset to Y
    reveal.style.setProperty("--x", x.toFixed(1) + "px");
    reveal.style.setProperty("--y", (y + scrollY).toFixed(1) + "px");
    reveal.style.setProperty("--r", Math.max(r, 1).toFixed(1) + "px");

    // ring sits just inside the soft edge of the mask
    const d = (r * 1.84).toFixed(1) + "px";
    ring.style.width = d;
    ring.style.height = d;
    ring.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3 || Math.abs(dr) > 0.3) raf = requestAnimationFrame(frame);
  }

  function move(cx, cy) {
    tx = cx; ty = cy;
    away = false;
    ring.classList.remove("away");
    kick();
  }

  addEventListener("pointermove", e => move(e.clientX, e.clientY), { passive: true });
  const touch = e => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); };
  addEventListener("touchstart", touch, { passive: true });
  addEventListener("touchmove", touch, { passive: true });
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);

  // Mouse left the window: close the ring
  document.documentElement.addEventListener("mouseleave", () => {
    away = true;
    ring.classList.add("away");
    kick();
  });

  kick(); // opening animation: ring grows from the middle of the screen
})();