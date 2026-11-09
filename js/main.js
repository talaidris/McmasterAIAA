/* McMaster AIAA — site behaviour
   Smooth scroll (Lenis), page curtain, altimeter, sky colour, stars, scroll reveals (GSAP). */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // If the animation library didn't load, show everything instead of leaving content hidden.
  if (!window.gsap) { root.classList.remove("js"); }
  const canAnimate = !!window.gsap && !reduce;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Smooth scrolling ---------------- */
  let lenis = null;
  if (canAnimate && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    window.aiaaLenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- Sky colour, stars, altimeter ---------------- */
  const NAVY = [11, 42, 91];
  const NIGHT = [3, 10, 26];
  const altStops = [[0, 0], [0.15, 12], [0.5, 100], [1, 400]]; // [scroll progress, km]
  const altToKm = (p) => {
    for (let i = 1; i < altStops.length; i++) {
      if (p <= altStops[i][0]) {
        const [p0, k0] = altStops[i - 1], [p1, k1] = altStops[i];
        return lerp(k0, k1, (p - p0) / (p1 - p0));
      }
    }
    return 400;
  };

  const stars = document.getElementById("stars");
  const ctx = stars ? stars.getContext("2d") : null;
  let starList = [];
  function drawStars() {
    if (!stars) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = stars.parentElement.clientWidth, H = stars.parentElement.clientHeight;
    stars.width = W * dpr; stars.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const count = Math.round((W * H) / 7000);
    starList = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.7 + 0.3 }));
    starList.forEach((s) => { ctx.globalAlpha = s.a; ctx.fillStyle = "#f5f8ff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill(); });
  }

  const altimeter = document.querySelector(".altimeter");
  const marker = document.querySelector(".alt-marker");
  const fill = document.querySelector(".alt-fill");
  const readout = document.querySelector("[data-alt]");
  const header = document.querySelector(".site-header");
  let lastY = 0;

  function onScroll() {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(y / max, 0, 1);

    if (altimeter) {
      marker.style.bottom = `${p * 100}%`;
      fill.style.height = `${p * 100}%`;
      readout.textContent = Math.round(altToKm(p));
      // White over navy sections (hero, footer), navy over white ones.
      const r = altimeter.getBoundingClientRect(), cy = r.top + r.height / 2;
      let dark = false;
      document.querySelectorAll(".on-dark").forEach((el) => { const b = el.getBoundingClientRect(); if (b.top <= cy && b.bottom >= cy) dark = true; });
      altimeter.classList.toggle("over-dark", dark);
    }

    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
      const goingDown = y > lastY && y > 160;
      const menuOpen = document.querySelector(".nav.is-open");
      header.classList.toggle("is-hidden", goingDown && !menuOpen);
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { drawStars(); onScroll(); });
  drawStars();
  onScroll();

  /* ---------------- Mobile menu ---------------- */
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      header.classList.toggle("menu-open", open);
      if (lenis) open ? lenis.stop() : lenis.start();
      header.classList.remove("is-hidden");
    });
  }

  /* ---------------- Page transitions (curtain) ---------------- */
  const curtain = document.querySelector(".curtain");
  let leaving = false;

  if (canAnimate && curtain) {
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page or #hash
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      try { sessionStorage.setItem("aiaa-t", "1"); } catch (_) {}
      if (lenis) lenis.stop();
      gsap.fromTo(curtain, { yPercent: 100 }, {
        yPercent: 0, duration: 0.75, ease: "power4.inOut",
        onComplete: () => { location.href = url.href; },
      });
    });

    // Back/forward cache: make sure the curtain isn't left covering the page.
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) { leaving = false; gsap.set(curtain, { yPercent: 100 }); if (lenis) lenis.start(); }
    });
  }

  /* ---------------- Intro + scroll reveals ---------------- */
  function revealLines(els, opts = {}) {
    gsap.fromTo(els, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, ease: "power4.out", stagger: 0.12, ...opts });
  }

  function intro() {
    const tl = gsap.timeline();
    const entering = root.classList.contains("is-entering");
    if (entering && curtain) {
      gsap.set(curtain, { yPercent: 0 });
      tl.to(curtain, {
        yPercent: -100, duration: 0.9, ease: "power4.inOut", delay: 0.08,
        onComplete: () => { root.classList.remove("is-entering"); gsap.set(curtain, { yPercent: 100 }); },
      });
    }
    const start = entering ? 0.55 : 0.1;

    const heroLines = document.querySelectorAll(".hero .line > span, .page-head .line > span");
    if (heroLines.length) tl.fromTo(heroLines, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, ease: "power4.out", stagger: 0.12 }, start);

    const fades = document.querySelectorAll(".hero .fade-in, .page-head .fade-in");
    if (fades.length) tl.fromTo(fades, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, start + 0.6);

    // Flight path: draws itself, with a dot riding the head of the line.
    const trail = document.querySelector(".hero-path .trail");
    const dot = document.querySelector(".hero-path .dot");
    if (trail && dot) {
      const L = trail.getTotalLength();
      trail.style.strokeDasharray = L;
      trail.style.strokeDashoffset = L;
      const o = { p: 0 };
      dot.style.opacity = 0;
      tl.to(o, {
        p: 1, duration: 2.6, ease: "power2.inOut",
        onUpdate() {
          trail.style.strokeDashoffset = L * (1 - o.p);
          const pt = trail.getPointAtLength(L * o.p);
          dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
          dot.style.opacity = o.p > 0.005 ? 1 : 0;
        },
      }, start);
    }
  }

  function scrollEffects() {
    // Section titles: slide up out of a mask when they enter the viewport.
    document.querySelectorAll(".line").forEach((line) => {
      if (line.closest(".hero, .page-head")) return;
      const inner = line.querySelectorAll("span");
      ScrollTrigger.create({ trigger: line, start: "top 92%", once: true, onEnter: () => revealLines(inner, { stagger: 0 }) });
    });

    // Statement: words brighten as you scroll through it.
    document.querySelectorAll("[data-scrub]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      const spans = words.map((w, i) => {
        const s = document.createElement("span");
        s.className = "w"; s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
        return s;
      });
      gsap.to(spans, {
        opacity: 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 50%", scrub: true },
      });
    });

    // Mission orbits: each ring turns with your scroll, at its own speed (like real orbital periods).
    const fig = document.querySelector(".orbit-fig");
    if (fig) {
      [[".o1", 360], [".o2", -260], [".o3", 180], [".o4", -120]].forEach(([sel, deg]) => {
        gsap.to(fig.querySelector(sel), {
          rotation: deg, svgOrigin: "300 300", ease: "none",
          scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      });
      gsap.from(fig.querySelector(".orbit-svg"), { scale: 0.86, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: fig, start: "top 85%", once: true } });
    }

    // Flight plan: the line fills as you scroll, stops light up when reached.
    const plan = document.querySelector(".plan");
    if (plan) {
      gsap.to(plan.querySelector(".plan-line i"), {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: plan, start: "top 62%", end: "bottom 62%", scrub: true },
      });
      plan.querySelectorAll(".stop").forEach((stop) => {
        ScrollTrigger.create({
          trigger: stop, start: "top 64%",
          onEnter: () => stop.classList.add("is-reached"),
          onLeaveBack: () => stop.classList.remove("is-reached"),
        });
      });
    }

    // Generic fade-ins below the fold (used sparingly).
    document.querySelectorAll(".fade-in").forEach((el) => {
      if (el.closest(".hero, .page-head")) return;
      gsap.fromTo(el, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });
  }

  if (canAnimate) {
    intro();
    scrollEffects();
    window.addEventListener("load", () => ScrollTrigger.refresh());
  } else {
    document.querySelectorAll(".stop").forEach((s) => s.classList.add("is-reached"));
  }
})();
