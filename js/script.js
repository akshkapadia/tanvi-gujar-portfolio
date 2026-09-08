/* =========================================================
   Tanvi Gujar — portfolio interactions
   Everything here is progressive: with JS off the page still
   renders in full, just without reveal, spy and parallax.
   ========================================================= */
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/* ---------------------------------------------------------
   Damped scrolling

   The wheel drives a target position and the page eases
   towards it, which slows the whole site down and takes the
   step out of a trackpad flick. Only on fine pointers —
   touch already has native momentum, and hijacking it there
   makes a page feel broken.
   --------------------------------------------------------- */
const smooth = {
  active: !reduceMotion && !coarse,
  target: window.scrollY,
  running: false,
  last: window.scrollY
};

function smoothTick() {
  // Anything else that moved the page mid-ease — find-in-page,
  // tabbing to an off-screen link, the browser restoring a
  // position — wins. Without this the loop would drag the
  // reader straight back to where it was heading.
  if (Math.abs(window.scrollY - smooth.last) > 2) {
    smooth.target = window.scrollY;
    smooth.running = false;
    return;
  }

  const diff = smooth.target - window.scrollY;
  const next = Math.abs(diff) < 0.4 ? smooth.target : window.scrollY + diff * 0.088;

  window.scrollTo(0, next);
  smooth.last = window.scrollY;

  if (next === smooth.target) {
    smooth.running = false;
    return;
  }

  requestAnimationFrame(smoothTick);
}

function startSmooth() {
  if (smooth.running) return;
  smooth.running = true;
  requestAnimationFrame(smoothTick);
}

function scrollToY(y) {
  if (!smooth.active) {
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    return;
  }
  smooth.target = clamp(y, 0, maxScroll());
  smooth.last = window.scrollY;
  startSmooth();
}

if (smooth.active) {
  // The CSS smooth-scroll would fight the easing below.
  document.documentElement.style.scrollBehavior = "auto";

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return; // pinch-zoom
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (!smooth.running) {
        smooth.target = window.scrollY;
        smooth.last = window.scrollY;
      }
      smooth.target = clamp(smooth.target + step * 0.78, 0, maxScroll());
      startSmooth();
    },
    { passive: false }
  );

  // Anything that moves the page by other means — keyboard,
  // the scrollbar, a browser restore — re-seeds the target so
  // the next wheel tick does not yank us back.
  window.addEventListener(
    "scroll",
    () => {
      if (!smooth.running) smooth.target = window.scrollY;
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    smooth.target = clamp(smooth.target, 0, maxScroll());
  });
}

/* ---------------------------------------------------------
   Nav — mobile dropdown + anchor navigation
   --------------------------------------------------------- */
const navLinks = [...document.querySelectorAll("[data-nav]")];
const navToggle = document.getElementById("navToggle");
const navPill = document.getElementById("navPill");

function closeMenu() {
  navPill.classList.remove("open");
  navToggle.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

function setActive(id) {
  navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + id));
}

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    setActive(id);
    closeMenu();
    scrollToY(target.getBoundingClientRect().top + window.scrollY);
    history.replaceState(null, "", "#" + id);
  });
});

if (navToggle && navPill) {
  navToggle.addEventListener("click", () => {
    const isOpen = navPill.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!navPill.contains(e.target) && !navToggle.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* Any other in-page link (the service CTAs, the project
   cards) goes through the same easing. */
document.querySelectorAll('a[href^="#"]:not([data-nav])').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    scrollToY(target.getBoundingClientRect().top + window.scrollY);
  });
});

/* ---------------------------------------------------------
   Scroll spy

   Measured against a line a third of the way down the
   viewport rather than by observer ratios: the services
   stack is four viewports tall and the hero is short, so
   ratio-based spying picked the wrong section constantly.
   --------------------------------------------------------- */
const sections = [...document.querySelectorAll("main section[id]")];

function updateSpy() {
  if (!sections.length) return;

  const line = window.scrollY + window.innerHeight * 0.34;
  let current = sections[0].id;

  sections.forEach((s) => {
    if (s.getBoundingClientRect().top + window.scrollY <= line) current = s.id;
  });

  // The last section is often shorter than the fold, so it
  // would never cross the line on its own.
  if (window.scrollY >= maxScroll() - 4) current = sections[sections.length - 1].id;

  setActive(current);
}

/* ---------------------------------------------------------
   Scroll reveal
   --------------------------------------------------------- */
const revealables = document.querySelectorAll(".reveal");

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealables.forEach((el) => el.classList.add("in"));
} else {
  const revealer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );
  revealables.forEach((el) => revealer.observe(el));
}

/* ---------------------------------------------------------
   Scroll parallax — background orbs drift, and the hero
   separates into depth planes as it leaves: the giant word
   lags behind, the portrait holds, the foreground copy and
   the CTA pull away faster.

   Hero layers are moved with the `translate` property, not
   `transform`, so the drift composes with the entrance and
   float animations already on those elements instead of
   replacing them.
   --------------------------------------------------------- */
const orbs = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
  el,
  depth: parseFloat(el.dataset.parallax) || 0
}));

const heroLayers = [...document.querySelectorAll(".hero [data-depth]")].map((el) => ({
  el,
  depth: parseFloat(el.dataset.depth) || 0
}));

const hero = document.querySelector(".hero");
const stacked = window.matchMedia("(max-width: 760px)");
let ticking = false;

function paint() {
  ticking = false;
  updateSpy();

  if (reduceMotion) return;

  const y = window.scrollY;

  orbs.forEach(({ el, depth }) => {
    el.style.transform = "translate3d(0," + (y * depth).toFixed(2) + "px,0)";
  });

  if (hero && !stacked.matches) {
    // Only while the hero is still on screen — past that the
    // planes are parked so nothing keeps drifting off-layout.
    const p = Math.min(y / (hero.offsetHeight || 1), 1);
    heroLayers.forEach(({ el, depth }) => {
      el.style.translate = "0 " + (y * depth).toFixed(2) + "px";
    });
    hero.style.opacity = String(1 - p * 0.55);
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(paint);
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

if (stacked.addEventListener) {
  stacked.addEventListener("change", () => {
    heroLayers.forEach(({ el }) => {
      el.style.translate = "";
    });
    if (hero) hero.style.opacity = "";
    paint();
  });
}

paint();

/* ---------------------------------------------------------
   Where the service cards park

   Above 900px the services heading is sticky, so the cards
   have to stop below it. Its height depends on how the title
   wraps, so measure it rather than guessing — the CSS keeps
   its own fallback for the phone layout.
   --------------------------------------------------------- */
const stackHead = document.querySelector(".section-head-only");
const headSticky = window.matchMedia("(min-width: 901px)");

function syncStackTop() {
  if (!stackHead) return;

  if (!headSticky.matches) {
    document.documentElement.style.removeProperty("--stack-top");
    return;
  }

  const h = Math.round(stackHead.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--stack-top", h + 16 + "px");
}

if (stackHead) {
  syncStackTop();
  window.addEventListener("resize", syncStackTop, { passive: true });
  if (headSticky.addEventListener) headSticky.addEventListener("change", syncStackTop);

  // Watching the heading itself catches every way its height can
  // change — the webfont swapping in, the title rewrapping, the
  // breakpoint resizing the type — where a resize listener alone
  // left the cards parked against a stale measurement.
  if ("ResizeObserver" in window) new ResizeObserver(syncStackTop).observe(stackHead);
  else if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncStackTop);
}

/* ---------------------------------------------------------
   Footer year
   --------------------------------------------------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
