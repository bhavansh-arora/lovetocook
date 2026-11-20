/* ==========================================================================
   Love to Cook: motion & 3D
   Preloader, page transitions, smooth scroll, 3D split text, 3D reveals,
   bake carousel, flour particles, the craft in four folds, curved gallery,
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
      if (!cw) return; // hidden while off screen: keep the last radius
      spin.style.setProperty("--r", (cw / (2 * Math.tan(Math.PI / N))) * 1.14 + "px");
      spin.style.setProperty("--step", step + "deg");
    };
    layout();
    window.addEventListener("resize", layout);

    root.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; root.classList.add("is-dragging"); });
    window.addEventListener("pointermove", (e) => {
      if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); vel = dx * 0.22; rot += dx * 0.22; }
      if (e.pointerType === "mouse" && visible) {
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
    // a dark sheet over each photo that deepens as it turns away; its own layer, so only opacity changes
    const shades = cards.map((c) => { const f = $(".ring3d__face--front", c); const s = document.createElement("i"); s.className = "ring3d__shade"; s.setAttribute("aria-hidden", "true"); f.prepend(s); return s; });
    let covered = false;
    const wake = () => { if (!raf && visible && !covered && !document.hidden) raf = requestAnimationFrame(frame); };
    onScreen(root, (v) => { visible = v; root.classList.toggle("is-offscreen", !v); if (v) layout(); wake(); });
    window.addEventListener("ltc:covered", () => { covered = true; });
    window.addEventListener("ltc:uncovered", () => { covered = false; wake(); });
    document.addEventListener("visibilitychange", wake);

    const frame = () => {
      raf = 0;
      if (!visible || covered || document.hidden) return;
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
          const sh = Math.round(((1 - cs) / 2) * 33) / 50;
          if (sh !== lastShade[i]) { lastShade[i] = sh; shades[i].style.opacity = sh; }
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
    if (!cv) return;
    if (reduce || !finePointer) { cv.style.display = "none"; return; }
    const ctx = cv.getContext("2d");
    const host = cv.parentElement;
    const P = [];
    let w = 0, h = 0, mx = -999, my = -999, visible = true;
    const size = () => {
      const nw = host.offsetWidth, nh = host.offsetHeight;
      if (nw === w && Math.abs(nh - h) < 120) return; // mobile toolbars resize the window as you scroll
      w = nw; h = nh;
      cv.width = w; cv.height = h;
    };
    size();
    window.addEventListener("resize", size);
    const n = window.innerWidth < 700 ? 18 : 40;
    for (let i = 0; i < n; i++) {
      P.push({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 0.14, vy: 0.06 + Math.random() * 0.22, ph: Math.random() * 6.28, a: 0.12 + Math.random() * 0.34, c: Math.random() < 0.72 ? "196,122,44" : "71,31,0" });
    }
    host.addEventListener("pointermove", (e) => { const r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener("pointerleave", () => { mx = my = -999; });
    let raf = 0;
    let covered = false;
    const wake = () => { if (!raf && visible && !covered && !document.hidden) raf = requestAnimationFrame(tick); };
    window.addEventListener("ltc:covered", () => { covered = true; });
    window.addEventListener("ltc:uncovered", () => { covered = false; wake(); });
    onScreen(host, (v) => { visible = v; wake(); });
    document.addEventListener("visibilitychange", wake);
    let odd = false;
    const tick = () => {
      raf = 0;
      if (!visible || covered || document.hidden) return;
      odd = !odd;
      if (odd) {
        ctx.clearRect(0, 0, w, h);
        for (const p of P) {
          p.ph += 0.02;
          p.x += (p.vx + Math.sin(p.ph) * 0.16) * 2;
          p.y += p.vy * 2;
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
  // no automatic re-measure on "load": it would land in the middle of the page-change lift (see boot)
  ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true, autoRefreshEvents: "visibilitychange,DOMContentLoaded,resize" });
  html.classList.add("motion-ok");
  const ease = "expo.out";

  /* ---------- Smooth scroll ---------- */
  // Native scrolling (smoothest and most responsive on every device); scroll-linked
  // animations smooth themselves with scrub. In-page links glide to their section.
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const t = $(id);
    if (t) { e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); }
  }));

  // Fades and wipes on scroll are Web Animations: the browser runs opacity on its compositor thread, so a
  // fade never repaints what it fades and keeps going even if the page is busy. Each element is left with
  // its final style set inline, so it can never end up hidden.
  const EASE_OUT = "cubic-bezier(.33, 1, .68, 1)";
  const hide = (els) => els.forEach((el) => (el.style.opacity = "0"));
  const fadeIn = (els, { stagger = 0.08, duration = 0.9, delay = 0 } = {}) => els.forEach((el, i) => {
    if (el.animate) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration * 1000, delay: (delay + i * stagger) * 1000, easing: EASE_OUT, fill: "backwards" });
    el.style.opacity = "1";
  });
  const wipeIn = (el, r = "0px") => {
    const from = `inset(0% 0% 100% 0% round ${r})`, to = `inset(0% 0% 0% 0% round ${r})`;
    if (el.animate) el.animate([{ clipPath: from }, { clipPath: to }], { duration: 1100, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "backwards" });
    el.style.clipPath = "";
  };
  const once = (trigger, start, fn) => ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
  // A photo that scales as it arrives is held on its own layer for the move, so it is drawn once, not every frame
  const willOn = function () { this.targets().forEach((t) => (t.style.willChange = "transform")); };
  // Tidy up after an entrance without GSAP's clearProps, which re-reads the computed transform
  // straight away and forces the whole page to lay out again mid-scroll. Removing the inline
  // styles is enough; GSAP re-reads lazily if the element is ever tweened again.
  const unset = (props) => {
    const list = props.split(",").flatMap((p) => (p === "transform" ? ["transform", "translate", "rotate", "scale"] : [p.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())]));
    return function () { this.targets().forEach((t) => { list.forEach((p) => t.style.removeProperty(p)); if (t._gsap) t._gsap.uncache = 1; }); };
  };

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

  /* ---------- Intro / preloader ---------- */
  const loader = $(".loader");
  const firstVisit = (() => { try { return !sessionStorage.getItem("ltc:seen"); } catch (e) { return true; } })();
  const curtain = $(".curtain");

  function heroIn() {
    const tl = gsap.timeline({ defaults: { ease } });
    $$("[data-hero-split]").forEach((el, k) => {
      splitLines(el);
      const chars = splitChars(el);
      tl.from(chars, { yPercent: 115, rotation: 6, opacity: 0, duration: 1.15, stagger: 0.022, ease: "expo.out", onComplete: unset("transform,opacity") }, k * 0.12);
    });
    const has = (s) => document.querySelector(s);
    if (has("[data-hero-fade]")) tl.fromTo("[data-hero-fade]", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08, onComplete: unset("transform") }, 0.35);
    if (has("[data-ring]")) {
      tl.add(() => window.dispatchEvent(new Event("ltc:hero")), 0.1);
      tl.fromTo("[data-ring]", { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 1.6, ease: "expo.out", onComplete: unset("transform") }, 0.15);
    }
    if (has("[data-deck]")) {
      tl.fromTo("[data-deck] .deck__face", { y: -160, rotationX: -40, rotationZ: (i) => [-14, 12, 0][i % 3], opacity: 0 }, { y: 0, rotationX: 0, rotationZ: 0, opacity: 1, duration: 1.9, stagger: 0.12, ease: "expo.out" }, 0.2);
      if (has("[data-deck] .deck__chip")) tl.fromTo("[data-deck] .deck__chip", { y: -30, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "power3.out" }, 0.9);
    }
    $$("[data-hero-media]:not([data-ring])").forEach((m, k) => tl.fromTo(m, { clipPath: "inset(0% 0% 100% 0% round 32px)", y: -40, opacity: 0 }, { clipPath: "inset(0% 0% 0% 0% round 32px)", y: 0, opacity: 1, duration: 1.6, ease: "expo.inOut", onComplete: unset("clipPath,transform") }, 0.15 + k * 0.1));
    if (has("[data-hero-pop]")) tl.from("[data-hero-pop]", { scale: 0, rotate: -40, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.9);
    return tl;
  }

  // the sheets glide: a soft start and a long, gentle landing (no sudden snap in the middle)
  const SHEET = "power3.inOut";
  const cLead = curtain && $(".curtain__lead", curtain);
  const cMain = curtain && $(".curtain__main", curtain);
  const cTitle = curtain && $(".curtain__title", curtain);
  const cLabel = curtain && $(".curtain__label", curtain);
  const cCards = curtain ? $$(".curtain__card", curtain) : [];
  const cImgs = curtain ? $$("[data-curtain-img]", curtain) : [];
  const cap = (host, cls) => { const c = document.createElement("span"); c.className = "cap " + cls; c.setAttribute("aria-hidden", "true"); host.appendChild(c); return c; };
  // only the rising edge gets a dome; a lifting sheet leaves with a straight edge, so no semicircle is left on screen
  const cTop = cMain && cap(cMain, "cap--top");

  // The sheets wait off screen with CSS translateY(100%). GSAP reads that back as a fixed pixel offset and
  // adds it to every yPercent move, so the sheets started a full screen too low and never covered the page.
  // Tell GSAP where they really are.
  if (curtain) gsap.set([cLead, cMain], { y: 0, yPercent: html.classList.contains("ltc-seen") ? 0 : 100 });
  // the sheets answer a click at once: full speed from the first frame, slowing as they cover the page
  const COVER = "power3.out";

  function runIntro() {
    if (loader && firstVisit) {
      try { sessionStorage.setItem("ltc:seen", "1"); } catch (e) { /* ignore */ }
      const count = $(".loader__count b", loader);
      const cardsEl = $$(".loader__card", loader);
      const o = { v: 0 };
      const tl = gsap.timeline({ paused: true });
      // the logo and line arrive, then Sam's bakes are dealt out around them as the count climbs
      tl.fromTo(".loader__logo", { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease })
        .fromTo(".loader__line", { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease }, 0.15)
        .fromTo(".loader__row", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease }, 0.2)
        .fromTo(cardsEl, { opacity: 0, scale: 0.7, y: -120, rotation: (i) => (i % 2 ? 16 : -16) }, {
          opacity: 1, scale: 1, y: 0, rotation: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--r")), duration: 0.95, stagger: 0.2, ease: "power3.out",
        }, 0.35)
        .to(o, { v: 100, duration: 2.1, ease: "power2.inOut", onUpdate: () => (count.textContent = Math.round(o.v)) }, 0.25)
        .to(".loader__bar span", { scaleX: 1, duration: 2.1, ease: "power2.inOut" }, 0.25)
        // at 100 the cards fly out to the edges and the cream screen lifts away
        .to(cardsEl, {
          x: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--x")) * window.innerWidth * 0.012,
          y: (i) => parseFloat(cardsEl[i].style.getPropertyValue("--y")) * window.innerHeight * 0.016,
          rotation: (i) => (i % 2 ? 24 : -24), opacity: 0, duration: 0.8, stagger: 0.03, ease: "power3.in",
        }, "+=0.15")
        .to([".loader__center", ".loader__row", ".loader__bar"], { y: -24, opacity: 0, duration: 0.5, ease: "power2.in" }, "<0.2")
        .to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.25")
        .add(() => { loader.classList.add("is-done"); }, ">")
        .add(heroIn(), "-=0.7");
      return () => tl.play();
    } else {
      if (loader) loader.classList.add("is-done");
      if (curtain) {
        // arriving: the name lifts out, the chocolate curtain rises off the page, then the butter sheet
        const tl = gsap.timeline({ paused: true, onComplete: () => { gsap.set(curtain, { visibility: "hidden" }); gsap.set([cLead, cMain], { yPercent: 100 }); gsap.set(cTop, { scaleY: 0 }); gsap.set(cCards, { clearProps: "transform,opacity" }); } });
        tl.set(curtain, { visibility: "visible" })
          .to(cCards, { y: () => -window.innerHeight * 0.5, rotation: (i) => [-22, 20, -6][i % 3], opacity: 0, duration: 0.8, ease: "power2.in", stagger: 0.06 }, 0)
          .to([cLabel, cTitle], { yPercent: -110, opacity: 0, duration: 0.6, ease: "power2.in", stagger: 0.05 }, 0.1)
          .to(cMain, { yPercent: -100, duration: 1.2, ease: SHEET }, 0.42)
          .to(cLead, { yPercent: -100, duration: 1.2, ease: SHEET }, 0.56);
        const hero = heroIn().pause();
        return () => { tl.play(); hero.delay(0.8).restart(true); };
      }
      const hero = heroIn().pause();
      return () => hero.play();
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
  const pageImgs = {
    "": ["croissants", "fig-pastry", "sourdough"], "index.html": ["croissants", "fig-pastry", "sourdough"],
    "classes.html": ["crumb", "croissants", "sam"], "private.html": ["chocolate-tart", "croissants", "sam"],
    "bakery.html": ["almond-croissant", "plum-danish", "sourdough"], "gift.html": ["chocolate-tart", "croissants", "fruit-danish"],
    "about.html": ["fig-pastry", "crumb", "sam"], "contact.html": ["sourdough", "croissants", "focaccia"], "for-sam.html": ["croissants", "sam", "fig-pastry"],
  };
  const imgsFor = (url) => {
    const file = url.pathname.split("/").pop();
    let list = pageImgs[file] || pageImgs[""];
    if (file === "class.html") {
      const c = window.LTC_DATA && window.LTC_DATA.courses.find((x) => x.id === url.searchParams.get("c"));
      const front = c && /assets\/img\/([a-z-]+)\.jpg/.exec(c.image);
      list = ["fig-pastry", "sourdough", front ? front[1] : "croissants"];
    }
    return list.map((n) => "assets/img/m/" + n + ".jpg");
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
    const imgs = imgsFor(url);
    try { sessionStorage.setItem("ltc:imgs", JSON.stringify(imgs)); } catch (err) { /* ignore */ }
    cImgs.forEach((im, i) => { if (imgs[i]) { im.src = imgs[i]; if (im.decode) im.decode().catch(() => {}); } });
    prefetch(url);
    gsap.timeline({ onComplete: () => (location.href = url.href) })
      .set(curtain, { visibility: "visible" })
      .set(cLabel, { yPercent: 110, opacity: 1 })
      // the title's mask leaves room below for descenders, so it waits further down to stay out of sight
      .set(cTitle, { yPercent: 150, opacity: 1 })
      .fromTo(cLead, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: COVER }, 0)
      .fromTo(cMain, { yPercent: 100 }, { yPercent: 0, duration: 0.85, ease: COVER }, 0.06)
      .fromTo(cTop, { scaleY: 1 }, { scaleY: 0, duration: 0.85, ease: COVER }, 0.06)
      // once the page is covered, its own animations rest so the curtain has the frame to itself
      .add(() => window.dispatchEvent(new Event("ltc:covered")), 0.8)
      .fromTo(cCards, { y: () => -window.innerHeight * 0.4, rotation: (i) => [-20, 18, 8][i % 3], opacity: 0 }, { y: 0, rotation: (i) => [-10, 9, -2][i % 3], opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.08 }, 0.3)
      .to([cLabel, cTitle], { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.07 }, 0.42);
  });
  // fetch the next page while the pointer is on its link, so it is ready when the curtain closes
  const fetched = new Set();
  function prefetch(url) {
    const k = url.pathname + url.search;
    if (fetched.has(k)) return;
    fetched.add(k);
    const l = document.createElement("link");
    l.rel = "prefetch"; l.href = url.href;
    document.head.appendChild(l);
  }
  const intent = (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname !== location.pathname) prefetch(url);
  };
  document.addEventListener("mouseover", intent, { passive: true });
  document.addEventListener("touchstart", intent, { passive: true });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) { leaving = false; gsap.set(curtain, { visibility: "hidden" }); gsap.set([cLead, cMain], { yPercent: 100 }); gsap.set(cTop, { scaleY: 0 }); window.dispatchEvent(new Event("ltc:uncovered")); }
  });

  /* ---------- Reveals ---------- */
  function reveals() {
    // headings: each line fades in where it stands
    $$("[data-split]").forEach((el) => {
      const lines = splitLines(el);
      hide(lines);
      once(el, "top 90%", () => fadeIn(lines));
    });
    // blocks: fade in where they stand (hidden by CSS until then)
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 94%",
      once: true,
      onEnter: (els) => { fadeIn(els, { stagger: 0.06 }); els.forEach((e) => e.classList.add("is-lit")); },
    });
    // photos are unveiled top to bottom (a wipe: the photo itself never moves)
    $$("[data-reveal-img]").forEach((el) => {
      el.style.clipPath = "inset(0% 0% 100% 0% round 32px)";
      once(el, "top 90%", () => wipeIn(el, "32px"));
    });
    $$("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%", once: true }, onUpdate: () => (el.textContent = Math.round(o.v) + (el.dataset.suffix || "")) });
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
      gsap.to($$(".w", el), { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.5 } });
    });
  }

  /* ---------- Marquee: speeds up with scroll velocity ---------- */
  function marquees() {
    $$("[data-marquee]").forEach((m) => {
      const track = $(".marquee__track", m);
      const group = $(".marquee__group", track);
      track.appendChild(group.cloneNode(true)).setAttribute("aria-hidden", "true");
      const dir = m.dataset.marquee === "right" ? 1 : -1;
      let x = 0, speed = 1, target = 1, w = group.offsetWidth, on = true;
      onScreen(m, (v) => (on = v));
      window.addEventListener("resize", () => (w = group.offsetWidth));
      ScrollTrigger.create({
        trigger: m, start: "top bottom", end: "bottom top",
        onUpdate: (self) => { target = 1 + Math.min(4, Math.abs(self.getVelocity() / 400)); },
      });
      gsap.ticker.add((t, dt) => {
        if (!on) return;
        x += dir * 0.06 * speed * dt;
        speed += (target - speed) * 0.08;
        target += (1 - target) * 0.06;
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      });
    });
  }

  /* ---------- The craft: four polaroids dealt in order, each stamped with its layer count ---------- */
  function foldSteps() {
    const list = $("[data-fold]");
    if (!list) return;
    const steps = $$(".j-fold__step", list);
    const all = [];
    steps.forEach((st) => all.push([$(".j-fold__media", st), $(".j-fold__txt", st), $(".j-fold__stamp", st), $(".j-fold__op", st)].filter(Boolean)));
    all.forEach(hide);
    once(list, "top 85%", () => steps.forEach((st, i) => {
      const num = $(".j-fold__stamp b", st), n = parseInt(num.dataset.n, 10) || 0, o = { v: 0 }, at = i * 0.18;
      num.textContent = "0";
      fadeIn(all[i], { delay: at });
      gsap.to(o, { v: n, duration: 0.9, delay: at + 0.25, ease: "power2.out", onUpdate: () => { num.textContent = Math.round(o.v); } });
    }));
  }

  /* ---------- Class day: a caramel line runs down the day as you read it ---------- */
  function dayRail() {
    const wrap = $(".j-day");
    if (!wrap) return;
    const items = $$(".j-day__item", wrap);
    if (items.length < 2) return;
    const fill = document.createElement("span");
    fill.className = "j-day__fill";
    fill.setAttribute("aria-hidden", "true");
    wrap.appendChild(fill);
    let ys = [];
    // layout offsets, not screen rects, so a block still mid-reveal (tilted in 3D) measures true
    const measure = () => {
      const pts = items.map((it) => { const d = $(".j-day__dot", it); return { x: it.offsetLeft + d.offsetLeft + d.offsetWidth / 2, y: it.offsetTop + d.offsetTop + d.offsetHeight / 2 }; });
      ys = pts.map((p) => p.y - pts[0].y);
      fill.style.left = `${pts[0].x - 1}px`;
      fill.style.top = `${pts[0].y}px`;
      fill.style.height = `${ys[ys.length - 1]}px`;
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: {
        trigger: wrap, start: "top 72%", end: "bottom 58%", scrub: 0.4, onRefresh: measure,
        onUpdate: (self) => {
          const h = self.progress * ys[ys.length - 1] + 2;
          items.forEach((it, i) => { const on = ys[i] <= h; if (it.classList.contains("is-past") !== on) it.classList.toggle("is-past", on); });
        },
      },
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
    let near = true;
    const curve = (scrollLeft = 0) => {
      if (!near) return;
      const vw = window.innerWidth, left = baseLeft + (gsap.getProperty(track, "x") || 0);
      items.forEach((it, k) => {
        const cx = left + geo[k] - scrollLeft;
        const d = clamp((cx - vw / 2) / (vw / 2), -1.4, 1.4);
        it.style.transform = `translateZ(${(-Math.abs(d) * 70).toFixed(1)}px) rotateY(${(-d * 13).toFixed(2)}deg)`;
      });
    };
    // far from view the photos lie flat, so they don't hold GPU layers for the rest of the page
    onScreen(sec, (v) => { near = v; if (v) curve(track.scrollLeft); else items.forEach((it) => (it.style.transform = "")); });
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1001px) and (hover: hover)", () => {
      const dist = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: sec, start: "top top", end: () => "+=" + dist(), pin: true, scrub: 0.4, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => { if (bar) bar.style.transform = `scaleX(${s.progress.toFixed(4)})`; curve(); },
          onRefresh: () => { measure(); curve(); },
        },
      });
      curve();
      return () => { gsap.set(track, { clearProps: "transform" }); items.forEach((it) => (it.style.transform = "")); };
    });
    mm.add("(max-width: 1000px), (hover: none)", () => {
      const onS = () => { if (bar) bar.style.transform = `scaleX(${(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)).toFixed(4)})`; curve(track.scrollLeft); };
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
    gsap.to(line, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 60%", end: "bottom 60%", scrub: 0.5 } });
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
    new MutationObserver((recs) => {
      if (pending || !recs.some((r) => Array.prototype.some.call(r.addedNodes, (n) => n.nodeType === 1))) return;
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
    // (removed: buttons that follow the pointer and spring back read as a bounce)
  }

  /* ---------- While the page scrolls, hover effects wait: cards sliding under a still pointer
     would otherwise start shadow and tilt animations on every one they pass ---------- */
  // (a clear sheet over the page takes the pointer for that moment; switching one empty element is
  // nearly free, where switching pointer-events on the whole page would restyle every element)
  function hoverPause() {
    if (!finePointer) return;
    const shield = document.createElement("div");
    shield.className = "scroll-shield";
    shield.setAttribute("aria-hidden", "true");
    document.body.appendChild(shield);
    let t = 0, on = false;
    window.addEventListener("scroll", () => {
      if (!on) { on = true; shield.classList.add("is-on"); }
      clearTimeout(t);
      t = setTimeout(() => { on = false; shield.classList.remove("is-on"); }, 180);
    }, { passive: true });
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
      wrap.addEventListener("mouseleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.9, ease: "power3.out" }));
    });
  }

  /* ---------- Footer mega type ---------- */
  function footerMega() {
    const m = $(".footer__mega");
    if (!m) return;
    hide([m]);
    once(m, "top 98%", () => fadeIn([m], { duration: 1.1 }));
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

  /* ---------- Polaroids are dealt in from above and land at their own tilt ---------- */
  function deal() {
    // polaroids (hidden by CSS until then) fade in at their own tilt
    $$("[data-deal]").forEach((group) => once(group, "top 88%", () => fadeIn(Array.from(group.children), { stagger: 0.1 })));
  }

  /* ---------- Hand-drawn flourish under each heading's italic word ---------- */
  function swashes() {
    const paths = ["M3 13 C 42 5, 92 3, 132 8 S 184 15, 197 6", "M2 9 C 50 15, 104 4, 150 9 S 190 12, 198 7", "M4 12 C 36 7, 70 13, 112 8 S 176 4, 196 10"];
    const lastEm = $$(".h1, .h2, .display, .j-title, .j-note__text").map((h) => { const ems = $$("em", h); return ems[ems.length - 1]; }).filter(Boolean);
    lastEm.forEach((em, i) => {
      if ($(".swash", em)) return;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "swash");
      svg.setAttribute("viewBox", "0 0 200 20");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", paths[i % paths.length]);
      svg.appendChild(path);
      em.appendChild(svg);
      const inHero = em.closest(".hero, .page-hero, .loader");
      const from = { clipPath: "inset(-50% 100% -50% 0%)" }, to = { clipPath: "inset(-50% 0% -50% 0%)", ease: "power2.inOut" };
      const tw = gsap.fromTo(svg, from, inHero
        ? { ...to, duration: 1.1, delay: firstVisit ? 4.9 : 2, paused: true }
        : { ...to, duration: 1, delay: 0.5, scrollTrigger: { trigger: em, start: "top 85%", once: true } });
      if (inHero) heroLate.push(tw);
    });
  }

  /* ---------- Photos unveil with a soft wipe, settle from a slight zoom, then drift ---------- */
  function photos() {
    $$(".path__media, .ig-grid a").forEach((wrap) => {
      if (!$("img", wrap)) return;
      const r = getComputedStyle(wrap).borderTopLeftRadius || "0px";
      wrap.style.clipPath = `inset(0% 0% 100% 0% round ${r})`;
      once(wrap, "top 90%", () => wipeIn(wrap, r));
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
  const heroLate = [];
  let calmAt = Infinity;
  const boot = () => {
    // a late re-measure (after images load) waits until the intro has finished moving
    calmAt = performance.now() + (loader && firstVisit ? 6500 : curtain ? 3400 : 2000);
    reveals();
    scrubWords();
    marquees();
    foldSteps();
    dayRail();
    hgallery();
    steps();
    tilt3d();
    decks();
    magnetic();
    cursor();
    hoverPause();
    voucher();
    footerMega();
    photos();
    deal();
    const start = runIntro();
    swashes();
    heroGlow();
    ScrollTrigger.refresh();
    // the setup above is heavy; begin moving only once it is behind us (the curtain or loader covers
    // the page until then), so the first frames of the intro are never held up
    requestAnimationFrame(() => requestAnimationFrame(() => { start(); heroLate.forEach((t) => t.restart(true)); }));
  };
  if (document.fonts && document.fonts.load) {
    // split headlines only once the real display faces are in, so lines are measured in the final font
    let done = false;
    const go = () => { if (!done) { done = true; boot(); } };
    Promise.all([document.fonts.load('360 1em "Fraunces"'), document.fonts.load('italic 360 1em "Fraunces"'), document.fonts.ready]).then(go, go);
    setTimeout(go, 3000);
  } else boot();
  window.addEventListener("load", () => {
    if (calmAt === Infinity) return; // boot has not run yet; it measures after load anyway
    setTimeout(() => ScrollTrigger.refresh(), Math.max(0, calmAt - performance.now()));
  });
})();
