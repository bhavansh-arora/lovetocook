/* ==========================================================================
   Love to Cook: motion
   Subtle by design: content fades up as it arrives, a slow ticker,
   a short bold loader on the first visit and a quick wipe between pages.
   No libraries. Built by Code Bunny
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = "cubic-bezier(.22,1,.36,1)";
  const easeIO = "cubic-bezier(.76,0,.24,1)";

  html.classList.add("motion-ok");
  if (reduce) html.classList.add("reduce-motion");

  /* ---------- Reveal on arrival ---------- */
  const REVEAL = "[data-reveal], [data-split], [data-hero-split], [data-hero-fade], [data-reveal-img]";
  const reveal = () => {
    const els = $$(REVEAL).filter((el) => !el.classList.contains("is-in"));
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      // stagger siblings that arrive together
      let k = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = Math.min(k++ * 70, 350) + "ms";
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  };

  /* ---------- Count up ---------- */
  const counts = () => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, end = parseFloat(el.dataset.count), suf = el.dataset.suffix || "";
      if (reduce || isNaN(end)) return;
      const t0 = performance.now(), dur = 1200;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  };

  /* ---------- Ticker ---------- */
  const tickers = () => $$("[data-marquee]").forEach((m) => {
    const track = $(".marquee__track", m), group = $(".marquee__group", track);
    if (!track || !group || track.children.length > 1) return;
    track.appendChild(group.cloneNode(true)).setAttribute("aria-hidden", "true");
    m.classList.add("is-running");
  });

  /* ---------- Steps light up as you read them ---------- */
  const steps = () => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-active")), { rootMargin: "0px 0px -35% 0px" });
    $$(".step").forEach((s) => io.observe(s));
  };

  /* ---------- First visit loader ---------- */
  const loader = $(".loader");
  const curtain = $(".curtain");
  const firstVisit = (() => { try { return !sessionStorage.getItem("ltc:seen"); } catch (e) { return true; } })();

  function intro() {
    if (!loader || !firstVisit || reduce) { if (loader) loader.classList.add("is-done"); return Promise.resolve(); }
    try { sessionStorage.setItem("ltc:seen", "1"); } catch (e) { /* ignore */ }
    return new Promise((done) => {
      const words = $$(".loader__words span", loader), count = $(".loader__count", loader);
      words.forEach((w, i) => w.animate([{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 800, delay: 80 + i * 90, easing: ease, fill: "both" }));
      const t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        count.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2)));
        if (p < 1) return requestAnimationFrame(tick);
        const out = loader.animate([{ transform: "none" }, { transform: "translateY(-100%)" }], { duration: 750, delay: 120, easing: easeIO, fill: "forwards" });
        setTimeout(done, 380);
        out.onfinish = () => loader.classList.add("is-done");
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Between pages: a coloured wipe carrying the next page's name ---------- */
  const names = { "": "Home", "index.html": "Home", "classes.html": "Classes & Events", "private.html": "Private Lessons", "bakery.html": "Bakery", "gift.html": "Gift Vouchers", "about.html": "About Sam", "contact.html": "Contact", "for-sam.html": "For Sam" };
  const nameFor = (url) => {
    const file = url.pathname.split("/").pop();
    if (file === "class.html") {
      const c = window.LTC_DATA && window.LTC_DATA.courses.find((x) => x.id === url.searchParams.get("c"));
      return c ? c.title : "The class";
    }
    return names[file] || "Love to Cook";
  };
  const panels = curtain ? [$(".curtain__lead", curtain), $(".curtain__main", curtain)] : [];
  const title = curtain && $(".curtain__title", curtain);

  function arrive() {
    if (!curtain || !html.classList.contains("ltc-seen") || reduce) { if (curtain) curtain.style.visibility = "hidden"; return Promise.resolve(); }
    return new Promise((done) => {
      title.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-60%)", opacity: 0 }], { duration: 320, easing: "ease-in", fill: "forwards" });
      panels[1].animate([{ transform: "none" }, { transform: "translateY(-100%)" }], { duration: 650, delay: 120, easing: easeIO, fill: "forwards" });
      const last = panels[0].animate([{ transform: "none" }, { transform: "translateY(-100%)" }], { duration: 650, delay: 200, easing: easeIO, fill: "forwards" });
      setTimeout(done, 320);
      last.onfinish = () => { curtain.style.visibility = "hidden"; };
    });
  }

  let leaving = false;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !curtain || reduce || leaving || e.defaultPrevented) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    leaving = true;
    const name = nameFor(url);
    try { sessionStorage.setItem("ltc:to", name); } catch (err) { /* ignore */ }
    title.textContent = name;
    curtain.style.visibility = "visible";
    panels[0].animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 520, easing: easeIO, fill: "forwards" });
    panels[1].animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 520, delay: 70, easing: easeIO, fill: "forwards" });
    title.animate([{ transform: "translateY(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, delay: 330, easing: ease, fill: "both" })
      .onfinish = () => (location.href = url.href);
  });
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted || !curtain) return;
    leaving = false;
    curtain.style.visibility = "hidden";
    panels.concat(title).forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
  });

  /* ---------- Boot ---------- */
  const start = () => {
    tickers();
    counts();
    steps();
    Promise.all([intro(), arrive()]).then(() => {
      html.classList.add("is-ready");
      reveal();
    });
    // content rendered later by site.js (classes, bakes, reviews) fades in too
    let queued = false;
    new MutationObserver(() => {
      if (queued || !html.classList.contains("is-ready")) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; reveal(); });
    }).observe($("main") || document.body, { childList: true, subtree: true });
  };
  if (document.fonts && document.fonts.load) {
    let done = false;
    const go = () => { if (!done) { done = true; start(); } };
    document.fonts.load('800 1em "Bricolage Grotesque"').then(go, go);
    setTimeout(go, 1500);
  } else start();
})();
