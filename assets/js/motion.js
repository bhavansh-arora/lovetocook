/* ==========================================================================
   Love to Cook: motion & 3D
   Preloader, page transitions, smooth scroll, 3D split text, 3D reveals,
   bake carousel, flour particles, lamination story, curved gallery,
   velocity marquee, pointer tilt, depth parallax, magnetic UI, cursor.
   Built by Code Bunny
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const onScreen = (el, cb) => {
    if (!("IntersectionObserver" in window)) return cb(true);
    new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: "300px 0px" }).observe(el);
  };

  /* ---------- 3D bake carousel (plain JS: works with or without GSAP) ---------- */
  function ring3d() {
    const root = $("[data-ring]");
    if (!root) return;
    const tilt = $(".ring3d__tilt", root);
    const spin = $(".ring3d__spin", root);
    const cards = $$(".ring3d__card", root);
    const N = cards.length, step = 360 / N;
    const cap = $("[data-ring-cap]"), idx = $("[data-ring-idx]");
    const auto = reduce ? 0 : -0.11;
    let rot = 0, vel = auto, front = -1, visible = true;
    let dragging = false, lastX = 0, moved = 0, lastScroll = window.scrollY;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    // intro: the ring starts tipped towards you and spinning, then settles (driven here, not by GSAP,
    // so nothing else writes the same transform)
    const waitHero = hasGSAP && !reduce;
    let introAt = waitHero ? null : -1e9;
    window.addEventListener("ltc:hero", () => { introAt = performance.now(); rot = -150; vel = -3.4; });

    const layout = () => {
      const cw = cards[0].offsetWidth;
      spin.style.setProperty("--r", (cw / (2 * Math.tan(Math.PI / N))) * 1.14 + "px");
      spin.style.setProperty("--step", step + "deg");
    };
    layout();
    window.addEventListener("resize", layout);

    root.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; root.classList.add("is-dragging"); });
    window.addEventListener("pointermove", (e) => {
      if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); vel = dx * 0.22; rot += dx * 0.22; }
      if (e.pointerType === "mouse") {
        const r = root.getBoundingClientRect();
        target.x = clamp((e.clientX - r.left) / r.width - 0.5, -0.8, 0.8);
        target.y = clamp((e.clientY - r.top) / r.height - 0.5, -0.8, 0.8);
      }
    }, { passive: true });
    const end = () => { if (dragging) { dragging = false; root.classList.remove("is-dragging"); } };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    // a drag is not a click
    root.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    window.addEventListener("scroll", () => { if (!visible) { lastScroll = window.scrollY; return; } const d = window.scrollY - lastScroll; lastScroll = window.scrollY; if (!reduce) vel += clamp(d, -60, 60) * -0.012; }, { passive: true });
    let raf = 0;
    const lastShade = new Array(N).fill(-1);
    const wake = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    onScreen(root, (v) => { visible = v; root.classList.toggle("is-offscreen", !v); wake(); });
    document.addEventListener("visibilitychange", wake);

    const frame = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      {
        if (!dragging && introAt !== null) { vel += (auto - vel) * 0.035; rot += vel; }
        cur.x += (target.x - cur.x) * 0.06;
        cur.y += (target.y - cur.y) * 0.06;
        const k = introAt === null ? 1 : Math.max(0, 1 - (performance.now() - introAt) / 1900);
        const ik = k * k * k;
        tilt.style.transform = `translateY(${(ik * 36).toFixed(1)}px) rotateX(${(-15 - cur.y * 10).toFixed(2)}deg) rotateY(${cur.x * 16}deg)`;
        spin.style.transform = `rotateY(${rot}deg)`;
        let best = 0, bestCos = -2;
        for (let i = 0; i < N; i++) {
          const cs = Math.cos(((i * step + rot) * Math.PI) / 180);
          const sh = Math.round(((1 - cs) / 2) * 66) / 100;
          if (sh !== lastShade[i]) { lastShade[i] = sh; cards[i].style.setProperty("--shade", sh); }
          if (cs > bestCos) { bestCos = cs; best = i; }
        }
        if (best !== front) {
          front = best;
          if (cap) cap.textContent = cards[best].dataset.cap;
          if (idx) idx.textContent = String(best + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0");
        }
      }
      wake();
    };
    wake();
  }

  /* ---------- Flour dust: drifting particles that part around the pointer ---------- */
  function flour() {
    const cv = $("[data-flour]");
    if (!cv || reduce) return;
    const ctx = cv.getContext("2d");
    const host = cv.parentElement;
    const P = [];
    let w = 0, h = 0, mx = -999, my = -999, visible = true;
    const size = () => {
      const dpr = 1;
      w = host.offsetWidth; h = host.offsetHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);
    const n = window.innerWidth < 700 ? 28 : 64;
    for (let i = 0; i < n; i++) {
      P.push({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.14, vy: 0.06 + Math.random() * 0.22, ph: Math.random() * 6.28, a: 0.12 + Math.random() * 0.34, c: Math.random() < 0.72 ? "196,122,44" : "71,31,0" });
    }
    host.addEventListener("pointermove", (e) => { const r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener("pointerleave", () => { mx = my = -999; });
    let raf = 0;
    const wake = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick); };
    onScreen(host, (v) => { visible = v; wake(); });
    document.addEventListener("visibilitychange", wake);
    const tick = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      {
        ctx.clearRect(0, 0, w, h);
        for (const p of P) {
          p.ph += 0.01;
          p.x += p.vx + Math.sin(p.ph) * 0.16;
          p.y += p.vy;
          const dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          if (d < 130) { const f = (1 - d / 130) * 2.2; p.x += (dx / d) * f; p.y += (dy / d) * f; }
          if (p.y > h + 6) { p.y = -6; p.x = Math.random() * w; }
          if (p.x < -6) p.x = w + 6;
          if (p.x > w + 6) p.x = -6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fillStyle = `rgba(${p.c},${p.a})`;
          ctx.fill();
        }
      }
      wake();
    };
    wake();
  }

  ring3d();
  flour();

  if (!hasGSAP || reduce) {
    html.classList.add("no-motion");
    if (reduce) html.classList.add("reduce-motion");
    const l = $(".loader"); if (l) l.classList.add("is-done");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  html.classList.add("motion-ok");
  const ease = "expo.out";

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && finePointer) {
    lenis = new Lenis({ lerp: 0.14, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = $(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90, duration: 1.4 }); }
    }));
  }

  /* ---------- Split text into lines ---------- */
  function splitLines(el) {
    // Tokenise into words. Pieces with no whitespace between them (e.g. <em>best</em>.)
    // share one inline-block group, so punctuation never wraps away from its word.
    const walk = (node) => {
      const out = [];
      let grp = null;
      const close = () => { grp = null; };
      const ensure = () => {
        if (!grp) { grp = document.createElement("span"); grp.className = "w"; grp.style.display = "inline-block"; out.push(grp); }
        return grp;
      };
      const space = () => { close(); out.push(document.createTextNode(" ")); };
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) space(); else ensure().appendChild(document.createTextNode(part));
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === "BR") { close(); out.push(n.cloneNode()); return; }
          const txt = n.textContent;
          if (!n.children.length && /\S\s+\S/.test(txt)) {
            txt.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) space();
              else { const c = n.cloneNode(false); c.textContent = part; ensure().appendChild(c); }
            });
          } else ensure().appendChild(n.cloneNode(true));
        }
      });
      return out;
    };
    const parts = walk(el);
    el.innerHTML = "";
    parts.forEach((p) => el.appendChild(p));
    // group into visual lines by vertical centre (robust to inline images)
    const lines = [];
    let line = null, cy0 = null, half = 0;
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 1 && n.tagName === "BR") { cy0 = null; return; }
      if (n.nodeType === 3) { if (line) line.push(n); return; }
      const cy = n.offsetTop + n.offsetHeight / 2;
      if (cy0 === null || Math.abs(cy - cy0) > half) { line = []; lines.push(line); cy0 = cy; half = Math.max(8, n.offsetHeight * 0.45); }
      line.push(n);
    });
    el.innerHTML = "";
    lines.forEach((ns) => {
      const l = document.createElement("span"); l.className = "split-line";
      const inner = document.createElement("span");
      ns.forEach((n) => inner.appendChild(n));
      l.appendChild(inner); el.appendChild(l);
    });
    el.classList.add("is-split");
    return $$(".split-line > span", el);
  }
  // lines rise out of their mask (flat: a 3D flip distorts very wide display type)
  const lineIn = { yPercent: 118, rotation: 2.5, transformOrigin: "0% 100%", duration: 1.25, stagger: 0.08, clearProps: "transform" };

  /* ---------- Intro / preloader ---------- */
  const loader = $(".loader");
  const firstVisit = (() => { try { return !sessionStorage.getItem("ltc:seen"); } catch (e) { return true; } })();
  const curtain = $(".curtain");

  function heroIn() {
    const tl = gsap.timeline({ defaults: { ease } });
    $$("[data-hero-split]").forEach((el, k) => {
      splitLines(el);
      const chars = splitChars(el);
      tl.from(chars, { yPercent: 115, rotation: 6, opacity: 0, filter: "blur(12px)", duration: 1.15, stagger: 0.022, ease: "expo.out", clearProps: "transform,opacity,filter" }, k * 0.12);
    });
    const has = (s) => document.querySelector(s);
    if (has("[data-hero-fade]")) tl.fromTo("[data-hero-fade]", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, clearProps: "transform" }, 0.35);
    if (has("[data-ring]")) {
      tl.add(() => window.dispatchEvent(new Event("ltc:hero")), 0.1);
      tl.fromTo("[data-ring]", { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 1.6, ease: "expo.out", clearProps: "transform" }, 0.15);
    }
    if (has("[data-deck]")) {
      tl.fromTo("[data-deck] .deck__face", { y: -160, rotationX: -40, rotationZ: (i) => [-14, 12, 0][i % 3], opacity: 0 }, { y: 0, rotationX: 0, rotationZ: 0, opacity: 1, duration: 1.9, stagger: 0.12, ease: "expo.out" }, 0.2);
      if (has("[data-deck] .deck__chip")) tl.fromTo("[data-deck] .deck__chip", { y: -30, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "back.out(1.4)" }, 0.9);
    }
    $$("[data-hero-media]:not([data-ring])").forEach((m, k) => tl.fromTo(m, { clipPath: "inset(0% 0% 100% 0% round 32px)", y: -40, opacity: 0 }, { clipPath: "inset(0% 0% 0% 0% round 32px)", y: 0, opacity: 1, duration: 1.6, ease: "expo.inOut", clearProps: "clipPath,transform" }, 0.15 + k * 0.1));
    if (has("[data-hero-pop]")) tl.from("[data-hero-pop]", { scale: 0, rotate: -40, duration: 1.2, stagger: 0.1, ease: "back.out(1.6)" }, 0.9);
    return tl;
  }

  const cLead = curtain && $(".curtain__lead", curtain);
  const cMain = curtain && $(".curtain__main", curtain);
  const cTitle = curtain && $(".curtain__title", curtain);
  const cLabel = curtain && $(".curtain__label", curtain);

  function runIntro() {
    if (loader && firstVisit) {
      try { sessionStorage.setItem("ltc:seen", "1"); } catch (e) { /* ignore */ }
      const count = $(".loader__count b", loader);
      const cardsEl = $$(".loader__card", loader);
      const o = { v: 0 };
      const tl = gsap.timeline();
      // the logo and line arrive, then Sam's bakes are dealt out around them as the count climbs
      tl.fromTo(".loader__logo", { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease })
        .fromTo(".loader__line", { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease }, 0.15)
        .fromTo(".loader__row", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease }, 0.2)
        .fromTo(cardsEl, { opacity: 0, scale: 0.7, y: -120, rotation: (i) => (i % 2 ? 16 : -16) }, {
          opacity: 1, scale: 1, y: 0, rotation: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--r")), duration: 0.95, stagger: 0.2, ease: "back.out(1.4)",
        }, 0.35)
        .to(o, { v: 100, duration: 2.1, ease: "power2.inOut", onUpdate: () => (count.textContent = Math.round(o.v)) }, 0.25)
        .to(".loader__bar span", { scaleX: 1, duration: 2.1, ease: "power2.inOut" }, 0.25)
        // at 100 the cards fly out to the edges and the cream screen lifts away
        .to(cardsEl, {
          x: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--x")) * window.innerWidth * 0.012,
          y: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--y")) * window.innerHeight * 0.016,
          rotation: (i) => (i % 2 ? 24 : -24), opacity: 0, duration: 0.8, stagger: 0.03, ease: "power3.in",
        }, "+=0.15")
        .to([".loader__center", ".loader__row"], { y: -24, opacity: 0, duration: 0.5, ease: "power2.in" }, "<0.2")
        .to(loader, { yPercent: -100, "--cb": "18vh", duration: 1.1, ease: "expo.inOut" }, "-=0.25")
        .add(() => { loader.classList.add("is-done"); }, ">")
        .add(heroIn(), "-=0.7");
    } else {
      if (loader) loader.classList.add("is-done");
      if (curtain) {
        // arriving: the name lifts out, the chocolate curtain rises off the page, then the butter sheet
        const tl = gsap.timeline({ onComplete: () => { gsap.set(curtain, { visibility: "hidden" }); gsap.set([cLead, cMain], { yPercent: 100, "--ct": "0px", "--cb": "0px" }); } });
        tl.set(curtain, { visibility: "visible" })
          .to([cLabel, cTitle], { yPercent: -110, opacity: 0, duration: 0.45, ease: "power3.in", stagger: 0.04 }, 0.05)
          .to(cMain, { yPercent: -100, "--cb": "16vh", duration: 0.95, ease: "expo.inOut" }, 0.25)
          .to(cLead, { yPercent: -100, duration: 0.95, ease: "expo.inOut" }, 0.36);
        heroIn().delay(0.55);
      } else heroIn();
    }
  }

  /* ---------- Page transitions ---------- */
  const pageNames = { "": "Home", "index.html": "Home", "classes.html": "Classes & Events", "private.html": "Private Lessons", "bakery.html": "Bakery", "gift.html": "Gift Vouchers", "about.html": "About Sam", "contact.html": "Contact", "for-sam.html": "For Sam" };
  const nameFor = (url) => {
    const file = url.pathname.split("/").pop();
    if (file === "class.html") {
      const id = url.searchParams.get("c");
      const c = window.LTC_DATA && window.LTC_DATA.courses.find((x) => x.id === id);
      return c ? c.title : "The class";
    }
    return pageNames[file] || "Love to Cook";
  };
  let leaving = false;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !curtain || e.defaultPrevented || leaving) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    leaving = true;
    const name = nameFor(url);
    try { sessionStorage.setItem("ltc:to", name); } catch (err) { /* ignore */ }
    cTitle.textContent = name;
    gsap.timeline({ onComplete: () => (location.href = url.href) })
      .set(curtain, { visibility: "visible" })
      .set([cLabel, cTitle], { yPercent: 110, opacity: 1 })
      .fromTo(cLead, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "expo.inOut" }, 0)
      .fromTo(cMain, { yPercent: 100, "--ct": "16vh" }, { yPercent: 0, "--ct": "0vh", duration: 0.7, ease: "expo.inOut" }, 0.08)
      .to([cLabel, cTitle], { yPercent: 0, duration: 0.5, ease: "expo.out", stagger: 0.05 }, 0.42)
      .to({}, { duration: 0.12 });
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) { leaving = false; gsap.set(curtain, { visibility: "hidden" }); gsap.set([cLead, cMain], { yPercent: 100 }); }
  });

  /* ---------- Reveals ---------- */
  function reveals() {
    $$("[data-split]").forEach((el) => {
      gsap.from(splitLines(el), { ...lineIn, duration: 1.3, ease, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    // content rises and tips forward into place
    gsap.set("[data-reveal]", { y: 56, rotationX: 14, transformPerspective: 1200, transformOrigin: "50% 0%" });
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 92%",
      once: true,
      onEnter: (els) => { gsap.to(els, { opacity: 1, y: 0, rotationX: 0, duration: 1.3, ease, stagger: 0.08, overwrite: "auto", clearProps: "transform" }); els.forEach((e) => e.classList.add("is-lit")); },
    });
    $$("[data-reveal-img]").forEach((el) => {
      const img = $("img", el);
      gsap.fromTo(el, { clipPath: "inset(0% 0% 100% 0% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 32px)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 88%", once: true }, clearProps: "clipPath" });
      if (img) gsap.fromTo(img, { scale: 1.25, yPercent: -10 }, { scale: 1, yPercent: 0, duration: 1.8, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    $$("[data-parallax]").forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 12;
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    $$("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onUpdate: () => (el.textContent = Math.round(o.v) + (el.dataset.suffix || "")) });
    });
    $$("[data-float]").forEach((el, k) => {
      gsap.to(el, { y: k % 2 ? -60 : 60, rotate: k % 2 ? 6 : -6, rotationY: k % 2 ? 18 : -18, ease: "none", scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: true } });
    });
    // the quote band image sinks back in depth as you pass
    $$(".quote-band").forEach((q) => {
      const bg = $(".quote-band__bg", q);
      gsap.fromTo(bg, { scale: 1.18, rotationX: 8, transformPerspective: 1400 }, { scale: 1, rotationX: -4, ease: "none", scrollTrigger: { trigger: q, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* Word-by-word scrub highlight */
  function scrubWords() {
    $$("[data-scrub-words]").forEach((el) => {
      const walk = (node) => {
        Array.from(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((p) => {
              if (!p) return;
              if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
              else { const s = document.createElement("span"); s.className = "w"; s.textContent = p; frag.appendChild(s); }
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && !n.classList.contains("pill-img")) walk(n);
          else if (n.nodeType === 1) n.classList.add("w");
        });
      };
      walk(el);
      gsap.to($$(".w", el), { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
    });
  }

  /* ---------- Marquee: speeds up with scroll velocity ---------- */
  function marquees() {
    $$("[data-marquee]").forEach((m) => {
      const track = $(".marquee__track", m);
      const group = $(".marquee__group", track);
      track.appendChild(group.cloneNode(true)).setAttribute("aria-hidden", "true");
      const dir = m.dataset.marquee === "right" ? 1 : -1;
      let x = 0, speed = 1, w = group.offsetWidth, on = true;
      onScreen(m, (v) => (on = v));
      window.addEventListener("resize", () => (w = group.offsetWidth));
      ScrollTrigger.create({
        trigger: m, start: "top bottom", end: "bottom top",
        onUpdate: (self) => { const v = self.getVelocity(); speed = 1 + Math.min(6, Math.abs(v / 300)); },
      });
      gsap.ticker.add((t, dt) => {
        if (!on) return;
        x += dir * 0.06 * speed * dt;
        speed += (1 - speed) * 0.05;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      });
    });
  }

  /* ---------- Lamination: Sam's photos laid one over another like sheets of pastry, 3 → 9 → 27 ---------- */
  function lamination() {
    const sec = $("[data-lam]");
    if (!sec) return;
    const layers = $$("[data-lx-layer]", sec);
    const imgs = layers.map((l) => $("img", l));
    const notes = layers.map((l) => $(".lp__note", l));
    const count = $("[data-lam-count]", sec);
    const steps = $$(".lam__step", sec);
    const dots = $$(".lam__dots i", sec);
    const bar = $(".lam__progress span", sec);
    let shown = -1, lastStep = -1;
    const setCount = (v) => {
      const n = Math.round(v);
      if (n === shown) return;
      shown = n;
      count.textContent = n;
    };
    setCount(3);
    gsap.set(notes[0], { opacity: 1 });
    const cnt = { v: 3 };
    const Dur = 10;
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: sec, start: "top top", end: () => "+=" + window.innerHeight * 2.6, pin: true, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (bar) gsap.set(bar, { scaleX: self.progress });
          const t = self.progress * Dur;
          const k = t < 1.4 ? 0 : t < 4.6 ? 1 : t < 6.6 ? 2 : 3;
          if (k !== lastStep) {
            lastStep = k;
            steps.forEach((s, i) => s.classList.toggle("is-active", i === k));
            dots.forEach((d, i) => d.classList.toggle("is-on", i <= k));
          }
        },
      },
    });
    // a new sheet is laid over the last: it wipes down from the top while the one beneath settles back
    const edge = $(".lx__edge", sec);
    // a new sheet is laid down over the last: a straight edge travels top to bottom with a butter rim
    // and a soft shadow on the photo beneath, which sinks back and dims
    const lay = (i, at) => {
      tl.to(notes[i - 1], { opacity: 0, duration: 0.25 }, at)
        .fromTo(layers[i], { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power3.inOut", immediateRender: i === 1 }, at + 0.1)
        .set(edge, { top: "0%", opacity: 1 }, at + 0.1)
        .to(edge, { top: "100%", duration: 1.1, ease: "power3.inOut" }, at + 0.1)
        .to(edge, { opacity: 0, duration: 0.2 }, at + 1.05)
        .fromTo(imgs[i], { scale: 1.25, yPercent: -8 }, { scale: 1, yPercent: 0, duration: 1.3, ease: "power3.out", immediateRender: i === 1 }, at + 0.1)
        .to(imgs[i - 1], { scale: 1.08, yPercent: 4, duration: 1.1 }, at + 0.1)
        .to(layers[i - 1], { "--dim": 0.6, duration: 1.1 }, at + 0.1)
        .to(notes[i], { opacity: 1, duration: 0.3 }, at + 1.2);
    };
    // the frame leans gently towards the pointer
    const frame = $("[data-lx-frame]", sec);
    if (finePointer && frame) {
      gsap.set(frame, { transformPerspective: 1400 });
      const rx = gsap.quickTo(frame, "rotationX", { duration: 1, ease: "power3" }), ry = gsap.quickTo(frame, "rotationY", { duration: 1, ease: "power3" });
      sec.addEventListener("mousemove", (e) => { ry((e.clientX / innerWidth - 0.5) * 9); rx(-(e.clientY / innerHeight - 0.5) * 7); });
      sec.addEventListener("mouseleave", () => { rx(0); ry(0); });
    }
    lay(1, 1.45);
    tl.to(cnt, { v: 9, duration: 0.9, onUpdate: () => setCount(cnt.v) }, 1.7);
    lay(2, 4.65);
    lay(3, 6.65);
    tl.to(cnt, { v: 27, duration: 1.0, onUpdate: () => setCount(cnt.v) }, 6.9)
      .set({}, {}, Dur);
  }

  /* ---------- Gallery: pinned on desktop, bends around you in 3D ---------- */
  function hgallery() {
    const sec = $("[data-hscroll]");
    if (!sec) return;
    const track = $(".hgal__track", sec);
    const bar = $(".hgal__progress span", sec);
    const items = $$(".hgal__item", sec);
    let geo = [], baseLeft = 0;
    const measure = () => {
      const tx = gsap.getProperty(track, "x") || 0;
      baseLeft = track.getBoundingClientRect().left - tx;
      geo = items.map((it) => it.offsetLeft + it.offsetWidth / 2);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const curve = (scrollLeft = 0) => {
      const vw = window.innerWidth, left = baseLeft + (gsap.getProperty(track, "x") || 0);
      items.forEach((it, k) => {
        const cx = left + geo[k] - scrollLeft;
        const d = clamp((cx - vw / 2) / (vw / 2), -1.4, 1.4);
        it.style.transform = `translateZ(${(-Math.abs(d) * 70).toFixed(1)}px) rotateY(${(-d * 13).toFixed(2)}deg)`;
      });
    };
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1001px) and (hover: hover)", () => {
      const dist = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: sec, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.4, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => { if (bar) gsap.set(bar, { scaleX: s.progress }); curve(); },
          onRefresh: () => { measure(); curve(); },
        },
      });
      curve();
      return () => { gsap.set(track, { clearProps: "transform" }); items.forEach((it) => (it.style.transform = "")); };
    });
    mm.add("(max-width: 1000px), (hover: none)", () => {
      const onS = () => { if (bar) gsap.set(bar, { scaleX: track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) }); curve(track.scrollLeft); };
      track.addEventListener("scroll", onS, { passive: true });
      onS();
      return () => track.removeEventListener("scroll", onS);
    });
  }

  /* ---------- Steps progress ---------- */
  function steps() {
    const list = $("[data-steps]");
    if (!list) return;
    const line = $(".steps-line span", list);
    gsap.to(line, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 60%", end: "bottom 60%", scrub: true } });
    $$(".step", list).forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 62%", end: "bottom 62%", toggleClass: { targets: s, className: "is-active" }, onLeave: () => s.classList.add("is-active") }));
  }

  /* ---------- Pointer tilt with glare (cards & photos) ---------- */
  const TILT = "[data-tilt3d], .ccard__media, .bake__media, .format, .value, .win, .ccard-contact, .teacher, .detail-gallery .media, .about-hero__img .media, .split__media .media, .hgal__item .media";
  function tilt3d() {
    if (!finePointer) return;
    const bind = (el) => {
      if (el.__tilt) return;
      el.__tilt = true;
      el.setAttribute("data-tilt3d", "");
      const g = document.createElement("span");
      g.className = "glare";
      el.appendChild(g);
      let r = null, off = 0;
      el.addEventListener("mouseenter", () => { r = el.getBoundingClientRect(); clearTimeout(off); el.classList.add("is-tilting"); });
      el.addEventListener("mousemove", (e) => {
        if (!r) r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((px - 0.5) * 11).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-(py - 0.5) * 11).toFixed(2) + "deg");
        el.style.setProperty("--gx", px * 100 + "%");
        el.style.setProperty("--gy", py * 100 + "%");
      });
      el.addEventListener("mouseleave", () => {
        r = null;
        el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
        off = setTimeout(() => el.classList.remove("is-tilting"), 750);
      });
    };
    $$(TILT).forEach(bind);
    // classes, bakes and related cards are rendered later (batched to one scan per frame)
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; $$(TILT).forEach(bind); });
    }).observe($("main") || document.body, { childList: true, subtree: true });
  }

  /* ---------- Inner page heroes: the photo deck turns with the pointer and fans open ---------- */
  function decks() {
    $$("[data-deck]").forEach((deck) => {
      const inner = $(".deck__inner", deck);
      const chip = $(".deck__chip", deck);
      if (!finePointer) return;
      const host = deck.closest("section");
      const q = { duration: 1.2, ease: "power3" };
      const ry = gsap.quickTo(inner, "rotationY", q), rx = gsap.quickTo(inner, "rotationX", q);
      const cx = chip && gsap.quickTo(chip, "x", q), cy = chip && gsap.quickTo(chip, "y", q);
      host.addEventListener("mousemove", (e) => {
        const px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
        ry(px * 18); rx(-py * 12);
        if (chip) { cx(px * -26); cy(py * -18); }
      });
      host.addEventListener("mouseleave", () => { ry(0); rx(0); if (chip) { cx(0); cy(0); } });
      deck.addEventListener("mouseenter", () => deck.classList.add("is-open"));
      deck.addEventListener("mouseleave", () => deck.classList.remove("is-open"));
    });
  }

  /* ---------- Magnetic ---------- */
  function magnetic() {
    if (!finePointer) return;
    $$("[data-magnetic], .btn:not(.btn--block), .icon-btn, .bag-btn, .next-card__go").forEach((el) => {
      const s = el.matches(".btn") ? 0.25 : 0.4;
      const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      let r = null;
      el.addEventListener("mouseenter", () => (r = null));
      el.addEventListener("mousemove", (e) => { if (!r) r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * s); yTo((e.clientY - r.top - r.height / 2) * s); });
      el.addEventListener("mouseleave", () => { r = null; xTo(0); yTo(0); });
    });
  }

  /* ---------- Cursor ---------- */
  function cursor() {
    const c = $(".cursor");
    if (!c || !finePointer) return;
    html.classList.add("has-cursor");
    const label = $(".cursor__label", c);
    const xTo = gsap.quickTo(c, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(c, "y", { duration: 0.45, ease: "power3" });
    window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); c.classList.add("is-live"); });
    document.addEventListener("mouseleave", () => c.classList.remove("is-live"));
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t) { label.textContent = t.dataset.cursor; c.classList.add("has-label"); } else c.classList.remove("has-label");
    });
  }

  /* ---------- Voucher tilt ---------- */
  function voucher() {
    if (!finePointer) return;
    $$("[data-tilt]").forEach((el) => {
      const wrap = el.parentElement;
      wrap.addEventListener("mousemove", (e) => {
        const r = wrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: px * 18, rotateX: -py * 18, duration: 0.6, ease: "power3" });
        el.style.setProperty("--shine", `${(1 - (px + 0.5)) * 100}%`);
      });
      wrap.addEventListener("mouseleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1, ease: "elastic.out(1,0.5)" }));
    });
  }

  /* ---------- Footer mega type ---------- */
  function footerMega() {
    const m = $(".footer__mega");
    if (!m) return;
    const chars = splitChars(m);
    gsap.from(chars, { yPercent: 105, rotation: 8, opacity: 0, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: m, start: "top bottom", end: "bottom bottom", scrub: 0.8 } });
  }

  /* ---------- Letters: wrap each character (inside any line or em) so it can move on its own ---------- */
  function splitChars(root) {
    const out = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent) {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = ch;
            frag.appendChild(s);
            out.push(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "SVG" && n.tagName !== "IMG" && !n.classList.contains("swash")) walk(n);
      });
    };
    walk(root);
    return out;
  }

  /* ---------- Hand-drawn flourish under each heading's italic word ---------- */
  function swashes() {
    const paths = ["M3 13 C 42 5, 92 3, 132 8 S 184 15, 197 6", "M2 9 C 50 15, 104 4, 150 9 S 190 12, 198 7", "M4 12 C 36 7, 70 13, 112 8 S 176 4, 196 10"];
    $$(".h1 em, .h2 em, .display em").forEach((em, i) => {
      if ($(".swash", em)) return;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "swash");
      svg.setAttribute("viewBox", "0 0 200 20");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", paths[i % paths.length]);
      path.setAttribute("pathLength", "1");
      svg.appendChild(path);
      em.appendChild(svg);
      const inHero = em.closest(".hero, .page-hero");
      gsap.fromTo(path, { strokeDashoffset: 1 }, inHero
        ? { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", delay: firstVisit ? 4.9 : 1.5 }
        : { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", delay: 0.5, scrollTrigger: { trigger: em, start: "top 85%", once: true } });
    });
  }

  /* ---------- Dark sections open from a rounded inset panel to full bleed ---------- */
  function sectionsOpen() {
    const inset = window.innerWidth < 760 ? 3 : 4.5;
    $$(".lam, .hgal, .quote-band, .footer, main > .section.theme-dark").forEach((el) => {
      gsap.fromTo(el, { clipPath: `inset(0% ${inset}% 0% ${inset}% round 44px)` }, {
        clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "top 25%", scrub: true },
      });
    });
  }

  /* ---------- Photos unveil with a soft wipe, settle from a slight zoom, then drift ---------- */
  function photos() {
    $$(".path__media, .split__media .media, .about-hero__img .media, .ig-grid a").forEach((wrap) => {
      const img = $("img", wrap);
      if (!img) return;
      const r = getComputedStyle(wrap).borderTopLeftRadius || "0px";
      gsap.fromTo(wrap, { clipPath: `inset(0% 0% 100% 0% round ${r})` }, { clipPath: `inset(0% 0% 0% 0% round ${r})`, duration: 1.3, ease: "expo.inOut", scrollTrigger: { trigger: wrap, start: "top 88%", once: true } });
      gsap.fromTo(img, { scale: 1.35, y: -40 }, { scale: 1.12, y: 0, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: wrap, start: "top 88%", once: true } });
      if (!wrap.closest(".ig-grid")) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ---------- A warm glow follows the pointer behind the hero ---------- */
  function heroGlow() {
    if (!finePointer) return;
    $$(".hero, .page-hero").forEach((hero) => {
      const g = document.createElement("div");
      g.className = "hero-glow";
      g.setAttribute("aria-hidden", "true");
      hero.prepend(g);
      const xTo = gsap.quickTo(g, "x", { duration: 1.4, ease: "power3" }), yTo = gsap.quickTo(g, "y", { duration: 1.4, ease: "power3" });
      gsap.set(g, { x: hero.offsetWidth * 0.66, y: hero.offsetHeight * 0.55 });
      hero.addEventListener("mousemove", (e) => { const r = hero.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
    });
  }

  /* ---------- Boot ---------- */
  const boot = () => {
    reveals();
    scrubWords();
    marquees();
    lamination();
    hgallery();
    steps();
    tilt3d();
    decks();
    magnetic();
    cursor();
    voucher();
    footerMega();
    sectionsOpen();
    photos();
    runIntro();
    swashes();
    heroGlow();
    ScrollTrigger.refresh();
  };
  if (document.fonts && document.fonts.load) {
    // split headlines only once the real display faces are in, so lines are measured in the final font
    let done = false;
    const go = () => { if (!done) { done = true; boot(); } };
    Promise.all([document.fonts.load('360 1em "Fraunces"'), document.fonts.load('italic 360 1em "Fraunces"'), document.fonts.ready]).then(go, go);
    setTimeout(go, 3000);
  } else boot();
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
