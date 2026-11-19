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
        if (!dragging) { vel += (auto - vel) * 0.035; rot += vel; }
        cur.x += (target.x - cur.x) * 0.06;
        cur.y += (target.y - cur.y) * 0.06;
        tilt.style.transform = `rotateX(${-15 - cur.y * 10}deg) rotateY(${cur.x * 16}deg)`;
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
    $$("[data-hero-split]").forEach((el, k) => tl.from(splitLines(el), lineIn, k * 0.08));
    const has = (s) => document.querySelector(s);
    if (has("[data-hero-fade]")) tl.from("[data-hero-fade]", { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.35);
    if (has("[data-ring]")) tl.from("[data-ring] .ring3d__tilt", { rotationX: -70, y: 120, scale: 0.6, opacity: 0, duration: 2.2, ease: "expo.out" }, 0.15);
    if (has("[data-deck]")) {
      tl.from("[data-deck] .deck__face", { y: 180, rotationX: 55, rotationZ: (i) => [-14, 12, 0][i % 3], opacity: 0, duration: 1.9, stagger: 0.12, ease: "expo.out" }, 0.2);
      if (has("[data-deck] .deck__chip")) tl.from("[data-deck] .deck__chip", { y: 40, scale: 0.85, opacity: 0, duration: 1.2, ease: "back.out(1.4)" }, 0.9);
    }
    $$("[data-hero-media]:not([data-ring])").forEach((m, k) => tl.from(m, { rotationX: 38, y: 90, opacity: 0, transformPerspective: 1200, transformOrigin: "50% 100%", duration: 1.8, clearProps: "opacity,rotationX,y,transformPerspective" }, 0.15 + k * 0.1));
    if (has("[data-hero-pop]")) tl.from("[data-hero-pop]", { scale: 0, rotate: -40, duration: 1.2, stagger: 0.1, ease: "back.out(1.6)" }, 0.9);
    return tl;
  }

  function runIntro() {
    if (loader && firstVisit) {
      try { sessionStorage.setItem("ltc:seen", "1"); } catch (e) { /* ignore */ }
      const count = $(".loader__count", loader);
      const o = { v: 0 };
      const tl = gsap.timeline();
      tl.to(".loader__logo", { opacity: 1, y: 0, duration: 1, ease })
        .to(o, { v: 100, duration: 1.1, ease: "power2.inOut", onUpdate: () => (count.textContent = String(Math.round(o.v)).padStart(3, "0")) }, 0.1)
        .to(".loader__bar span", { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0.1)
        .to(".loader__inner", { opacity: 0, y: -20, duration: 0.6, ease: "power2.in" }, "+=0.1")
        .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, "-=0.2")
        .add(() => { loader.classList.add("is-done"); }, ">")
        .add(heroIn(), "-=0.75");
    } else {
      if (loader) loader.classList.add("is-done");
      if (curtain) gsap.fromTo(curtain, { yPercent: 0, visibility: "visible" }, { yPercent: -100, duration: 0.8, ease: "expo.inOut", onComplete: () => gsap.set(curtain, { visibility: "hidden" }) });
      heroIn().delay(curtain ? 0.25 : 0);
    }
  }

  /* ---------- Page transitions ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !curtain || e.defaultPrevented) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    gsap.set(curtain, { yPercent: 100, visibility: "visible" });
    gsap.to(curtain, { yPercent: 0, duration: 0.45, ease: "power3.in", onComplete: () => (location.href = url.href) });
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted && curtain) gsap.set(curtain, { yPercent: 100, visibility: "hidden" }); });

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
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, rotationX: 0, duration: 1.3, ease, stagger: 0.08, overwrite: "auto", clearProps: "transform" }),
    });
    $$("[data-reveal-img]").forEach((el) => {
      const img = $("img", el);
      gsap.fromTo(el, { clipPath: "inset(14% 8% 14% 8% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 32px)", duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true }, clearProps: "clipPath" });
      if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
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

  /* ---------- Lamination: butter lock-in, roll, letter fold ×2 → 27 layers, scrubbed in 3D ---------- */
  function lamination() {
    const sec = $("[data-lam]");
    if (!sec) return;
    const stage = $(".lam__stage", sec);
    const scene = $("[data-l3]", sec);
    const B = {};
    $$("[data-b]", scene).forEach((el) => (B[el.dataset.b] = { el, c: {} }));
    const pin = $("[data-l3-pin]", scene), roll = $("[data-l3-roll]", scene), shadow = $("[data-l3-shadow]", scene);
    const count = $("[data-lam-count]", sec);
    const steps = $$(".lam__step", sec);
    const dots = $$(".lam__dots i", sec);
    const bar = $(".lam__progress span", sec);
    const photo = $(".lam__photo", sec);
    onScreen(sec, (v) => sec.classList.toggle("is-offscreen", !v));

    let W = 400, T = 28, D = 220, PR = 18;
    const G = 0.8; // hairline gap so folded layers never z-fight
    const size = () => {
      const sw = stage.clientWidth;
      if (!sw) return;
      W = clamp(sw * 0.58, 190, 470); T = W * 0.072; D = W * 0.56; PR = W * 0.045;
      scene.style.setProperty("--W", W + "px");
      scene.style.setProperty("--D", D + "px");
    };
    size();

    // write a style only when it changes
    const put = (o, k, v, fn) => { if (o.c[k] !== v) { o.c[k] = v; fn(v); } };
    const setBox = (key, vis, w, h, n, x, y, a = 0, d = D, o = 1) => {
      const b = B[key], el = b.el;
      put(b, "vis", vis ? "visible" : "hidden", (v) => (el.style.visibility = v));
      if (!vis) return;
      put(b, "w", w.toFixed(1), (v) => el.style.setProperty("--w", v + "px"));
      put(b, "h", h.toFixed(2), (v) => el.style.setProperty("--h", v + "px"));
      put(b, "d", d.toFixed(1), (v) => el.style.setProperty("--d", v + "px"));
      put(b, "sh", (h / n).toFixed(3), (v) => el.style.setProperty("--sh", v + "px"));
      put(b, "o", o.toFixed(2), (v) => el.style.setProperty("--o", v));
      put(b, "t", `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotateZ(${a.toFixed(2)}deg)`, (v) => (el.style.transform = v));
    };
    const rot = (P, c, deg) => {
      const r = (deg * Math.PI) / 180, dx = c[0] - P[0], dy = c[1] - P[1];
      return [P[0] + dx * Math.cos(r) - dy * Math.sin(r), P[1] + dx * Math.sin(r) + dy * Math.cos(r)];
    };

    const st = {};
    const reset = () => Object.assign(st, {
      mode: 0, drop: 0, lid: 0, tags: 0,
      pw: (W * 0.82) / 3, h: T * 1.25, n: 3, fl: 0, fr: 0,
      sw: W / 3, sh: 3 * T + 2 * G, N: 9,
      px: -W * 0.82, py: -PR,
      rx: -22, ry: -34, cs: 1, cy: 0, count: 3,
    });
    reset();
    const misc = { c: {} };
    let lastStep = -1;

    const render = () => {
      const hI = T * 1.25, lift = W * 0.75;
      setBox("board", true, W * 2.1, 14, 1, W * 0.02, 7, 0, D * 1.75);
      // 1. lock-in: butter drops onto the dough, the dough lid closes over it
      const intro = st.mode === 0;
      setBox("base", intro, W * 0.82, hI / 3, 1, 0, -hI / 6);
      setBox("butter", intro && st.drop > 0.02, W * 0.62, hI / 3, 1, 0, -hI / 2 - (1 - st.drop) * lift, 0, D * 0.78, clamp(st.drop * 4, 0, 1));
      setBox("lid", intro && st.lid > 0.02, W * 0.82, hI / 3, 1, 0, -hI * 5 / 6 - (1 - st.lid) * lift, 0, D, clamp(st.lid * 4, 0, 1));
      // 2. three panels, letter-folded: left over the middle, then right over the top
      const panels = st.mode === 1, pw = st.pw, h = st.h;
      setBox("M", panels, pw, h, st.n, 0, -h / 2);
      const aL = 180 * st.fl, cL = rot([-pw / 2, -h - G / 2], [-pw, -h / 2], aL);
      setBox("L", panels, pw, h, st.n, cL[0], cL[1], aL);
      const aR = -180 * st.fr, cR = rot([pw / 2, -1.5 * h - G], [pw, -h / 2], aR);
      setBox("R", panels, pw, h, st.n, cR[0], cR[1], aR);
      put(B.R, "tags", st.tags.toFixed(2), (v) => B.R.el.style.setProperty("--tags", v));
      // 3. the folded block rolled back out into one long, thinner sheet
      setBox("S", st.mode === 2, st.sw, st.sh, st.N, 0, -st.sh / 2);
      // rolling pin turns as it travels
      put(misc, "pin", `translate3d(${st.px.toFixed(1)}px,${st.py.toFixed(1)}px,0)`, (v) => (pin.style.transform = v));
      put(misc, "roll", `rotateZ(${((st.px / PR) * 57.2958).toFixed(1)}deg)`, (v) => (roll.style.transform = v));
      // soft shadow under whatever is on the board
      let l, r;
      if (st.mode === 0) { l = -W * 0.41; r = W * 0.41; }
      else if (st.mode === 1) { l = -pw / 2 - pw * (1 - st.fl); r = pw / 2 + pw * (1 - st.fr); }
      else { l = -st.sw / 2; r = st.sw / 2; }
      const fw = (r - l) * 1.3;
      put(misc, "sh", `translate3d(${((l + r) / 2).toFixed(1)}px,-1px,0) rotateX(90deg) scaleX(${(fw / 100).toFixed(3)})`, (v) => (shadow.style.transform = v));
      put(misc, "cam", `translateY(${st.cy.toFixed(1)}px) rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg) scale3d(${st.cs.toFixed(3)},${st.cs.toFixed(3)},${st.cs.toFixed(3)})`, (v) => (scene.style.transform = v));
      put(misc, "count", String(Math.round(st.count)), (v) => (count.textContent = v));
    };
    render();

    const Dur = 10;
    let tl;
    const build = () => {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
      size(); reset(); misc.c = {}; Object.values(B).forEach((b) => (b.c = {}));
      const pe = { ease: "power2.inOut" };
      tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: render,
        scrollTrigger: {
          trigger: sec, start: "top top", end: () => "+=" + window.innerHeight * 2.8, pin: true, scrub: 0.4, anticipatePin: 1,
          onUpdate: (self) => {
            if (bar) gsap.set(bar, { scaleX: self.progress });
            const t = self.progress * Dur;
            const k = t < 1.15 ? 0 : t < 3.65 ? 1 : t < 5.4 ? 2 : 3;
            if (k !== lastStep) {
              lastStep = k;
              steps.forEach((s, i) => s.classList.toggle("is-active", i === k));
              dots.forEach((d, i) => d.classList.toggle("is-on", i <= k));
            }
          },
        },
      });
      const rollY = (top) => top - PR;
      tl
        // lock-in
        .to(st, { drop: 1, duration: 0.6, ease: "power2.in" }, 0.05)
        .to(st, { lid: 1, duration: 0.55, ease: "power2.in" }, 0.55)
        .set(st, { mode: 1 }, 1.12)
        .to(st, { tags: 1, duration: 0.2 }, 1.12)
        // first roll: the pin hops on and rolls left to right
        .to(st, { px: -W * 0.41 - PR, py: rollY(-T * 1.25), duration: 0.18, ...pe }, 1.14)
        .to(st, { px: W / 2 + PR, py: rollY(-T), pw: W / 3, h: T, duration: 0.7, ease: "power1.inOut" }, 1.32)
        .to(st, { tags: 0, duration: 0.15 }, 1.95)
        .to(st, { px: W * 0.82, py: -PR, duration: 0.18, ...pe }, 2.02)
        // first letter fold: ×3
        .to(st, { fl: 1, duration: 0.7, ease: "power2.inOut" }, 2.2)
        .to(st, { fr: 1, duration: 0.7, ease: "power2.inOut" }, 2.9)
        .to(st, { count: 9, duration: 1.1, ease: "power1.inOut" }, 2.5)
        // rest & roll out the folded block, right to left
        .set(st, { mode: 2, sw: W / 3, sh: 3 * T + 2 * G, N: 9 }, 3.65)
        .to(st, { px: W / 6 + PR, py: rollY(-(3 * T + 2 * G)), duration: 0.16, ...pe }, 3.66)
        .to(st, { px: -W / 2 - PR, py: rollY(-T), sw: W, sh: T, duration: 1.35, ease: "power1.inOut" }, 3.84)
        .to(st, { px: -W * 0.82, py: -PR, duration: 0.18, ...pe }, 5.2)
        // second letter fold: ×3 again
        .set(st, { mode: 1, pw: W / 3, h: T, n: 9, fl: 0, fr: 0 }, 5.4)
        .to(st, { fl: 1, duration: 0.7, ease: "power2.inOut" }, 5.45)
        .to(st, { fr: 1, duration: 0.7, ease: "power2.inOut" }, 6.15)
        .to(st, { count: 27, duration: 1.2, ease: "power1.inOut" }, 5.65)
        // move in on the 27-layer cut edge
        .to(st, { rx: -10, ry: -16, cs: 1.4, cy: T * 1.6, duration: 1.8, ease: "power2.inOut" }, 7.0)
        .to(photo, { opacity: 1, rotationY: 0, x: 0, duration: 1.2, ease: "power3.out" }, 8.2)
        .set({}, {}, Dur);
    };
    build();
    let rw = window.innerWidth;
    window.addEventListener("resize", () => {
      if (Math.abs(window.innerWidth - rw) < 2) return;
      rw = window.innerWidth;
      const p = tl.scrollTrigger ? tl.scrollTrigger.progress : 0;
      build();
      ScrollTrigger.refresh();
      render();
    });
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
        it.style.transform = `translateZ(${(-Math.abs(d) * 150).toFixed(1)}px) rotateY(${(-d * 24).toFixed(2)}deg)`;
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
    gsap.from(m, { yPercent: 50, rotationX: -60, transformPerspective: 1200, transformOrigin: "50% 100%", opacity: 0, duration: 1.8, ease, scrollTrigger: { trigger: m, start: "top 98%", once: true } });
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
    runIntro();
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
