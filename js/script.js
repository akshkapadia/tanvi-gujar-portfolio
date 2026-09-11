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

// A CSS custom property's url() resolves against the stylesheet that
// reads it, not the page — so a path relative to index.html (which
// is what every data-cover holds) would resolve against css/ instead
// once it's substituted into a --cover custom property. Resolving it
// against the document here first sidesteps that everywhere this
// site is hosted, GitHub Pages' own subpath included. Shared by both
// the project wheel and the showcase coverflow below.
const coverUrl = (path) => "url('" + new URL(path, document.baseURI).href + "')";

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

   Above 900px the services heading is pinned, so the cards have
   to stop below it. Its height depends on the type size and how
   the title wraps, so measure it rather than guess — the CSS
   carries a per-breakpoint default for the first paint and for
   the phone layout.
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
  if (headSticky.addEventListener) headSticky.addEventListener("change", syncStackTop);

  // Watching the heading itself catches every way its height can
  // change — the webfont swapping in, the title rewrapping, the
  // breakpoint resizing the type — where a resize listener alone
  // left the cards parked against a stale measurement.
  if ("ResizeObserver" in window) new ResizeObserver(syncStackTop).observe(stackHead);
  else window.addEventListener("resize", syncStackTop, { passive: true });
}

/* ---------------------------------------------------------
   Project wheel

   The ring turns slowly and forever, hover included — it does not
   pause the way it used to; only keyboard focus or a touch still
   holds it still, since those need the extra time to read or tap a
   target rather than just glancing at one. Clicking a project eases
   it round to the top rather than snapping.
   --------------------------------------------------------- */
const dial = document.getElementById("dial");
const carousel = document.getElementById("carousel");

if (dial && carousel) {
  const spokes = [...dial.querySelectorAll(".spoke")];
  const STEP = 360 / spokes.length;
  const hubShot = document.getElementById("hubShot");
  const projectName = document.getElementById("projectName");
  const projectLink = document.getElementById("projectLink");

  const HOLD = 2400; // a project sits at the top for this long
  const TURN = 820; // and takes this long to hand over to the next

  let index = 0;
  let angle = 0;
  let from = 0;
  let to = 0;
  let turning = false;
  let mark = 0;
  let held = false;

  // Ease-in-out so the dial gathers and sheds speed rather than
  // starting and stopping dead.
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function paintSpokes() {
    spokes.forEach((s, i) => {
      // How far this project is from the top of the dial, 0-180.
      let d = Math.abs((((i * STEP + angle + 180) % 360) + 360) % 360 - 180);

      // It fades out as it arrives at the top, because that is where
      // the card takes over showing it — otherwise the tile and the
      // card would sit on top of one another.
      const o = Math.min(Math.max((d - 22) / 24, 0), 1);
      s.style.opacity = o.toFixed(3);
      s.style.pointerEvents = o < 0.15 ? "none" : "";
    });
  }

  function showCard() {
    const s = spokes[((index % spokes.length) + spokes.length) % spokes.length];
    hubShot.style.setProperty("--tint", s.dataset.tint);
    hubShot.style.setProperty("--cover", coverUrl(s.dataset.cover));
    projectName.textContent = s.dataset.name;
    projectLink.href = s.dataset.behance;
  }

  function goTo(next) {
    if (turning) return;
    // Always turn by the shortest run of whole segments.
    let delta = next - index;
    while (delta > spokes.length / 2) delta -= spokes.length;
    while (delta < -spokes.length / 2) delta += spokes.length;
    if (!delta) return;

    index = next;
    from = angle;
    to = angle - delta * STEP;

    if (reduceMotion) {
      // No frame loop is running, so arrows and clicks jump.
      angle = to;
      dial.style.transform = "rotate(" + angle + "deg)";
      showCard();
      paintSpokes();
      return;
    }

    turning = true;
    mark = performance.now();
    carousel.setAttribute("data-turning", "");
  }

  function frame(now) {
    if (turning) {
      const p = Math.min((now - mark) / TURN, 1);
      angle = from + (to - from) * ease(p);

      if (p === 1) {
        angle = to;
        turning = false;
        mark = now;
        // The card changes on the beat the step lands.
        showCard();
        carousel.removeAttribute("data-turning");
      }
    } else if (!held && now - mark >= HOLD) {
      goTo(index + 1);
    }

    dial.style.transform = "rotate(" + angle.toFixed(3) + "deg)";
    paintSpokes();
    requestAnimationFrame(frame);
  }

  const hold = () => {
    held = true;
  };
  const release = () => {
    // Restart the beat from now, so leaving does not trigger an
    // immediate jump because the clock ran on while paused.
    if (held && !turning) mark = performance.now();
    held = false;
  };

  // No pointerenter/pointerleave here on purpose — the wheel keeps
  // turning under a mouse hover now. Keyboard focus still holds it,
  // since a keyboard user can't "glance" at a target the way a mouse
  // hover implies; a touch still holds it too, for the same reason.
  carousel.addEventListener("focusin", hold);
  carousel.addEventListener("focusout", release);
  carousel.addEventListener("touchstart", hold, { passive: true });
  carousel.addEventListener("touchend", release, { passive: true });

  // Frames stop while the tab is in the background. Land the turn
  // straight away rather than leaving the dial halfway round with
  // its card faded out, waiting for a frame that will not come.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || !turning) return;
    angle = to;
    turning = false;
    mark = performance.now();
    dial.style.transform = "rotate(" + angle + "deg)";
    showCard();
    paintSpokes();
    carousel.removeAttribute("data-turning");
  });

  spokes.forEach((s, i) => {
    s.style.setProperty("--tint", s.dataset.tint);
    s.style.setProperty("--cover", coverUrl(s.dataset.cover));
    s.setAttribute("aria-label", s.dataset.name);
    s.addEventListener("click", () => goTo(i));
  });

  const prev = document.getElementById("dialPrev");
  const next = document.getElementById("dialNext");
  if (prev) prev.addEventListener("click", () => goTo(index - 1));
  if (next) next.addEventListener("click", () => goTo(index + 1));

  showCard();
  paintSpokes();

  if (!reduceMotion) {
    mark = performance.now();
    requestAnimationFrame(frame);
  }
}

/* ---------------------------------------------------------
   Showcase — a second, differently-shaped browser for the same
   five projects: a coverflow instead of the wheel above. Held
   noticeably longer per card (4.2s) than the wheel's own 2.4s —
   this is the section meant to actually be read (a name and a
   case-study link both live right on the card, not below it), so
   it needs to sit still long enough for that, not just glanced at
   mid-turn.
   --------------------------------------------------------- */
const showcaseTrack = document.getElementById("showcaseTrack");
const showcaseStage = document.getElementById("showcaseStage");

if (showcaseTrack && showcaseStage) {
  const scCards = [...showcaseTrack.querySelectorAll(".showcase-card")];
  scCards.forEach((card) => {
    card.style.setProperty("--cover", coverUrl(card.dataset.cover));
  });
  const SC_HOLD = 4200;
  const n = scCards.length;
  // A slight lean toward the centre card, not a full carousel spin —
  // .showcase-track's own perspective is what makes this read as a
  // 3D tilt rather than a flat skew.
  const SC_TILT = 8;

  let scIndex = 0;
  let scHeld = false;
  let scTimer = null;

  function scLayout() {
    // The shift is a fraction of however wide the active card is
    // actually rendering right now, not a fixed px value — so the
    // stacked spacing stays proportional whatever --r-less, vh-only
    // sizing this section lands on at any given viewport.
    const shift = scCards[scIndex].offsetWidth * 0.42;

    scCards.forEach((card, i) => {
      let offset = i - scIndex;
      if (offset > n / 2) offset -= n;
      if (offset < -n / 2) offset += n;
      const abs = Math.abs(offset);
      const scale = abs === 0 ? 1 : abs === 1 ? 0.78 : 0.58;
      const opacity = abs === 0 ? 1 : abs === 1 ? 0.5 : 0;
      // Leans in toward the centre card — positive offset (to the
      // right) rotates its left edge toward the viewer, and vice
      // versa, so both sides visually angle in rather than away.
      const rotate = offset === 0 ? 0 : offset < 0 ? SC_TILT : -SC_TILT;

      card.style.transform =
        "translate(-50%, -50%) translateX(" + offset * shift + "px) rotateY(" + rotate + "deg) scale(" + scale + ")";
      card.style.opacity = String(opacity);
      card.style.zIndex = String(10 - abs);
      card.style.pointerEvents = abs > 1 ? "none" : "";
      card.classList.toggle("is-active", offset === 0);
      card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
      const link = card.querySelector(".showcase-link");
      if (link) link.tabIndex = offset === 0 ? 0 : -1;
    });
  }

  function scGoTo(next) {
    scIndex = ((next % n) + n) % n;
    scLayout();
  }

  function scRestart() {
    clearInterval(scTimer);
    if (reduceMotion) return;
    scTimer = setInterval(() => {
      if (!scHeld) scGoTo(scIndex + 1);
    }, SC_HOLD);
  }

  scCards.forEach((card, i) => {
    card.addEventListener("click", (e) => {
      // A click on the active card's own link should follow the
      // link, not just re-centre a card that's already centred.
      if (i === scIndex) return;
      scGoTo(i);
      scRestart();
    });
  });

  const scPrev = document.getElementById("showcasePrev");
  const scNext = document.getElementById("showcaseNext");
  if (scPrev) scPrev.addEventListener("click", () => { scGoTo(scIndex - 1); scRestart(); });
  if (scNext) scNext.addEventListener("click", () => { scGoTo(scIndex + 1); scRestart(); });

  // No hover-pause here either, to match the wheel above — focus
  // and touch still hold it, same reasoning as there.
  showcaseStage.addEventListener("focusin", () => { scHeld = true; });
  showcaseStage.addEventListener("focusout", () => { scHeld = false; });
  showcaseStage.addEventListener("touchstart", () => { scHeld = true; }, { passive: true });
  showcaseStage.addEventListener("touchend", () => { scHeld = false; }, { passive: true });

  window.addEventListener("resize", scLayout);

  scLayout();
  scRestart();
}

/* ---------------------------------------------------------
   Footer year
   --------------------------------------------------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
