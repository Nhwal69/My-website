// ============================================================
//  ARCTIC SHOP BD — UI Utilities
//  Shared helpers used by all components.
// ============================================================

// ── HTML escape (prevents XSS in innerHTML) ───────────────
function esc(s) {
  return String(s)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ── Toast notifications ───────────────────────────────────
function toast(msg, type) {
  var w = document.getElementById("toast-wrap");
  if (!w) return;
  var t = document.createElement("div");
  t.className = "toast " + (type || "");
  t.innerHTML = msg;
  w.appendChild(t);
  setTimeout(function () { t.classList.add("show"); }, 10);
  setTimeout(function () {
    t.classList.remove("show");
    setTimeout(function () { t.remove(); }, 400);
  }, 4000);
}

// ── Stock label helpers ───────────────────────────────────
function stockLabel(s) {
  if (s <= 0) return "out";
  if (s <= 3) return "low";
  return "in";
}

function stockText(s) {
  if (s <= 0) return "Out of Stock";
  if (s <= 3) return "Only " + s + " left!";
  return "In Stock";
}

function stockBadgeClass(s) {
  if (s <= 0) return "stock-out";
  if (s <= 3) return "stock-low";
  return "stock-in";
}

// ── Product type helpers ──────────────────────────────────
function isCustom(p) { return p.type === "custom"; }

function getImg(p) { return (p && p.img) ? p.img : null; }

// ── Cart badge bump animation ─────────────────────────────
function updBadge() {
  var count = State.getCartCount();
  var el = document.getElementById("cart-count");
  if (!el) return;
  el.textContent = count;
  el.classList.remove("bump");
  void el.offsetWidth;
  if (count > 0) el.classList.add("bump");
  setTimeout(function () { el.classList.remove("bump"); }, 400);
}

// ── Wishlist badge ────────────────────────────────────────
function updWLBadge() {
  var cnt = State.getWishlist().length;
  var el  = document.getElementById("wl-count");
  if (!el) return;
  el.textContent = cnt;
  el.classList.toggle("show", cnt > 0);
}

// ── Rate limit: max 3 orders per 60-minute window ─────────
function checkOrderRateLimit() {
  var KEY    = "arcbd_order_times";
  var WINDOW = 60 * 60 * 1000;
  var MAX    = 3;
  var now    = Date.now();
  var times  = [];
  try { times = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
  times = times.filter(function (t) { return now - t < WINDOW; });
  if (times.length >= MAX) return false;
  times.push(now);
  try { localStorage.setItem(KEY, JSON.stringify(times)); } catch (e) {}
  return true;
}

// ── Nav: solid background on scroll ──────────────────────
function initNavScroll() {
  var nav    = document.getElementById("nav");
  var solid  = false;
  var pending = false;
  function tick() {
    pending = false;
    var want = window.scrollY > 60;
    if (want !== solid) { solid = want; nav.classList.toggle("solid", want); }
  }
  window.addEventListener("scroll", function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(tick);
  }, { passive: true });
}

// ── Mobile menu ───────────────────────────────────────────
function togMob() {
  var m  = document.getElementById("mob-menu");
  var h  = document.getElementById("ham");
  var op = m.classList.toggle("open");
  var sp = h.querySelectorAll("span");
  if (op) {
    sp[0].style.transform = "rotate(45deg) translate(5px,5px)";
    sp[1].style.opacity   = "0";
    sp[2].style.transform = "rotate(-45deg) translate(5px,-5px)";
  } else {
    sp.forEach(function (s) { s.style.transform = ""; s.style.opacity = ""; });
  }
}

function closeMob() {
  document.getElementById("mob-menu").classList.remove("open");
  document.getElementById("ham").querySelectorAll("span").forEach(function (s) {
    s.style.transform = ""; s.style.opacity = "";
  });
}

// ── FAQ accordion ─────────────────────────────────────────
function tFaq(el) { el.closest(".faq-item").classList.toggle("open"); }

// ── Scroll reveal (IntersectionObserver) ─────────────────
function initScrollReveal() {
  var obs = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("vis"); });
  }, { threshold: 0.08 });
  document.querySelectorAll(".rv").forEach(function (el) { obs.observe(el); });
}

// ── Zoom overlay ─────────────────────────────────────────
function openZoom(src, alt) {
  if (!src) return;
  var img = document.getElementById("zoom-img");
  var ov  = document.getElementById("zoom-overlay");
  img.src = src; img.alt = alt || "Product image";
  ov.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeZoom() {
  document.getElementById("zoom-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ── Search overlay ────────────────────────────────────────
function openSearch() {
  document.getElementById("search-overlay").classList.add("open");
  setTimeout(function () { document.getElementById("search-input").focus(); }, 200);
}

function closeSearch() {
  document.getElementById("search-overlay").classList.remove("open");
}

function doSearch(q) {
  var r = document.getElementById("search-results");
  if (!q.trim()) { r.innerHTML = ""; return; }
  var products = State.getProducts();
  var matches = products.filter(function (p) {
    return p.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 ||
           (p.ed  && p.ed.toLowerCase().indexOf(q.toLowerCase()) >= 0);
  });
  var h = "";
  for (var i = 0; i < matches.length; i++) {
    var p = matches[i];
    h += "<div class='sr-item' onclick='closeSearch();openModal(" + p.id + ")'>" +
         esc(p.name) + (p.price ? " — ৳" + p.price : " — Custom") + "</div>";
  }
  r.innerHTML = h || "<div class='sr-item' style='opacity:.5;cursor:default'>No results found</div>";
}

// ── Size guide ────────────────────────────────────────────
function openSizeGuide() {
  document.getElementById("size-guide-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSizeGuide() {
  document.getElementById("size-guide-modal").classList.remove("open");
  document.body.style.overflow = "";
}

// ── Global ESC key handler ────────────────────────────────
function initEscKey() {
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeZoom();
      closeSearch();
      if (typeof closeModal    === "function") closeModal();
      if (typeof closeCart     === "function") closeCart();
      if (typeof closeCheckout === "function") closeCheckout();
      closeSizeGuide();
      if (typeof closeWishlist === "function") closeWishlist();
    }
  });
}

// ── Page loader dismiss ───────────────────────────────────
function initLoader() {
  function dismissLoader() {
    var ld = document.getElementById("loader");
    if (!ld || ld.classList.contains("gone")) return;
    ld.classList.add("gone");

    function animateHero() {
      if (window.gsap) {
        gsap.to(
          ".hero-content .a1, .hero-content .a2, .hero-content .a3, .hero-content .a4, .hero-stats.a5",
          { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.15, delay: 0.2 }
        );
      } else {
        var els = document.querySelectorAll(
          ".hero-content .a1,.hero-content .a2,.hero-content .a3,.hero-content .a4,.hero-stats.a5"
        );
        els.forEach(function (el, i) {
          el.style.transition = "opacity 0.8s ease " + (i * 0.15) + "s, transform 0.8s ease " + (i * 0.15) + "s";
          el.style.opacity    = "1";
          el.style.transform  = "translateY(0)";
        });
      }
    }

    if (window.gsap) {
      animateHero();
    } else {
      var waited = 0;
      var check  = setInterval(function () {
        waited += 50;
        if (window.gsap || waited >= 1000) { clearInterval(check); animateHero(); }
      }, 50);
    }
  }

  var isMobile = window.matchMedia("(max-width:768px)").matches;
  var delay    = isMobile ? 800 : 1600;
  setTimeout(dismissLoader, delay);
  window.addEventListener("load", function () { setTimeout(dismissLoader, isMobile ? 300 : 600); });
}

// ── About section images ──────────────────────────────────
function initAboutImgs() {
  var products    = State.getProducts();
  var imgProducts = products.filter(function (p) { return p.aboutImg && p.img; });
  var slots       = ["ai1", "ai2", "ai3"];
  for (var i = 0; i < slots.length; i++) {
    var el = document.getElementById(slots[i]);
    if (el && imgProducts[i]) el.src = imgProducts[i].img;
  }
}

// ── Copyright year ────────────────────────────────────────
function initCopyYear() {
  var el = document.getElementById("copy-year");
  if (el) el.textContent = new Date().getFullYear();
}

// ── Ticker ────────────────────────────────────────────────
function buildTicker() {
  var words = [
    "WE MAKE PERFECT", "ARCTIC SHOP BD", "GRAPHIC TEES", "STREETWEAR BD",
    "BOLD DESIGNS", "FREE DELIVERY", "PREMIUM COTTON", "INSTANT EMAIL ORDERS",
  ];
  var el  = document.getElementById("ticker");
  if (!el) return;
  var all = words.concat(words);
  var h   = "";
  for (var i = 0; i < all.length; i++) { h += "<span class='tk-item'>" + all[i] + " ✦</span>"; }
  el.innerHTML = h;
}

// ── GSAP: scroll reveal + product cards ──────────────────
function initGSAP() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // Text scramble for .sl labels
  var scrambleChars = "!<>-_/[]{}=+*^?#ABCXYZ01234";
  function scrambleEl(el) {
    var original = el.textContent;
    var len      = original.length;
    var steps    = Math.min(26, Math.max(14, len + 6));
    var stepMs   = 620 / steps;
    var progress = 0;
    el.style.opacity = "1";
    var timer = setInterval(function () {
      progress++;
      var reveal = Math.floor((progress / steps) * len);
      var out    = "";
      for (var i = 0; i < len; i++) {
        var c = original.charAt(i);
        if (i < reveal || c === " " || c.charCodeAt(0) > 127) { out += c; }
        else { out += scrambleChars.charAt(Math.floor(Math.random() * scrambleChars.length)); }
      }
      el.textContent = out;
      if (progress >= steps) { clearInterval(timer); el.textContent = original; }
    }, stepMs);
  }

  var labels = document.querySelectorAll(".sl");
  if (labels.length) {
    gsap.set(labels, { opacity: 0, y: 20 });
    labels.forEach(function (lbl) {
      ScrollTrigger.create({
        trigger: lbl, start: "top 92%", once: true,
        onEnter: function () {
          gsap.to(lbl, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
          scrambleEl(lbl);
        },
      });
    });
  }

  // Letter-by-letter .sh2 headings
  document.querySelectorAll(".sh2").forEach(function (h) {
    if (h.__splitDone) return;
    h.__splitDone = true;
    function splitNode(node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.nodeValue.split("").forEach(function (ch) {
          if (ch === " ") { frag.appendChild(document.createTextNode(" ")); return; }
          var s       = document.createElement("span");
          s.className = "letter";
          s.textContent = ch;
          s.style.display    = "inline-block";
          s.style.willChange = "transform,opacity,filter";
          frag.appendChild(s);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.from(node.childNodes).forEach(splitNode);
      }
    }
    Array.from(h.childNodes).forEach(splitNode);
    var letters = h.querySelectorAll(".letter");
    if (!letters.length) return;
    gsap.set(letters, { opacity: 0, y: 18, filter: "blur(6px)" });
    ScrollTrigger.create({
      trigger: h, start: "top 88%", once: true,
      onEnter: function () {
        gsap.to(letters, {
          opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55,
          stagger: 0.035, ease: "power2.out",
          onComplete: function () {
            letters.forEach(function (l) { l.style.willChange = "auto"; });
          },
        });
      },
    });
  });

  // Product card staggered entrance
  applyCardAnimations();

  var grid = document.getElementById("pg");
  if (grid) {
    var mo = new MutationObserver(function () {
      ScrollTrigger.getAll().forEach(function (st) {
        if (st.trigger && !document.body.contains(st.trigger)) st.kill();
      });
      applyCardAnimations();
    });
    mo.observe(grid, { childList: true });
  }
}

function applyCardAnimations() {
  var grid  = document.getElementById("pg");
  if (!grid || !window.gsap) return;
  var cards = grid.querySelectorAll(".pc");
  if (!cards.length) return;
  gsap.set(cards, { opacity: 0, y: 48, scale: 0.94 });
  ScrollTrigger.batch(cards, {
    start: "top 90%",
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.85, stagger: { each: 0.09, from: "start" }, ease: "power3.out", overwrite: true });
    },
  });
  ScrollTrigger.refresh();
}

// ── Magnetic buttons (GSAP) ───────────────────────────────
function initMagnetic() {
  if (!window.gsap || (window.matchMedia && window.matchMedia("(hover:none)").matches)) return;
  var RADIUS = 50, STRENGTH = 0.45;
  document.querySelectorAll(".btn-gl").forEach(function (btn) {
    var qx   = gsap.quickTo(btn, "x", { duration: 0.45, ease: "power3.out" });
    var qy   = gsap.quickTo(btn, "y", { duration: 0.45, ease: "power3.out" });
    var rect = null;
    function readRect() { rect = btn.getBoundingClientRect(); }
    btn.addEventListener("mouseenter", readRect);
    window.addEventListener("resize", function () { rect = null; }, { passive: true });
    btn.addEventListener("mousemove", function (e) {
      if (!rect) readRect();
      var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      var dx = e.clientX - cx,            dy = e.clientY - cy;
      var dist  = Math.hypot(dx, dy);
      var reach = Math.max(rect.width, rect.height) / 2 + RADIUS;
      if (dist < reach) { qx(dx * STRENGTH); qy(dy * STRENGTH); } else { qx(0); qy(0); }
    });
    btn.addEventListener("mouseleave", function () { qx(0); qy(0); });
  });
}

// ── 3D tilt on product cards (GSAP) ──────────────────────
function initTilt() {
  if (!window.gsap || (window.matchMedia && window.matchMedia("(hover:none)").matches)) return;
  var MAX = 8;
  function attach(card) {
    if (card.__tiltBound) return;
    card.__tiltBound = true;
    var qx   = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2.out" });
    var qy   = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2.out" });
    var qs   = gsap.quickTo(card, "scale",     { duration: 0.5, ease: "power2.out" });
    var rect = null;
    function readRect() { rect = card.getBoundingClientRect(); }
    card.addEventListener("mouseenter", readRect);
    card.addEventListener("mousemove", function (e) {
      if (!rect) readRect();
      var px = (e.clientX - rect.left) / rect.width  - 0.5;
      var py = (e.clientY - rect.top)  / rect.height - 0.5;
      qy(px * MAX * 2); qx(-py * MAX * 2); qs(1.02);
    });
    card.addEventListener("mouseleave", function () { rect = null; qx(0); qy(0); qs(1); });
  }
  document.querySelectorAll(".pc").forEach(attach);
  var grid = document.querySelector(".pg");
  if (grid) {
    var mo = new MutationObserver(function () { grid.querySelectorAll(".pc").forEach(attach); });
    mo.observe(grid, { childList: true });
  }
}

// ── Lenis smooth scroll ───────────────────────────────────
function initLenis() {
  if (!window.Lenis) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  var lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4, syncTouch: false });
  if (window.ScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id && id.length > 1) {
        var t = document.querySelector(id);
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -60, duration: 1.0 }); }
      }
    });
  });
  window.__lenis = lenis;
}

// ── Video lazy load after intro ───────────────────────────
function initVideos() {
  var videos = document.querySelectorAll(".hero-bg-desktop, .hero-bg-mobile");
  videos.forEach(function (vid) {
    vid.setAttribute("preload", "none");
    function tryPlay() {
      var p = vid.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }
    setTimeout(tryPlay, 500);
    window.addEventListener("arctic:entered", tryPlay, { once: true });
  });
}

// ── Checkout progress bar ─────────────────────────────────
function initCheckoutProgress() {
  var stepFields = [
    ["cn", "cp", "ce"],
    ["ca", "cc"],
    [],
    [],
  ];

  function getStepDone(idx) {
    if (idx >= 2) return true;
    return stepFields[idx].every(function (id) {
      var el = document.getElementById(id);
      return el && el.value.trim().length > 0;
    });
  }

  function updateProgress() {
    var steps = ["step-1", "step-2", "step-3", "step-4"].map(function (id) {
      return document.getElementById(id);
    });
    var fill = document.getElementById("co-prog-fill");
    if (!steps[0] || !fill) return;
    var done = 0;
    for (var i = 0; i < 3; i++) {
      if (getStepDone(i)) done = i + 1; else break;
    }
    var current = Math.min(done, steps.length - 1);
    steps.forEach(function (s, j) {
      if (!s) return;
      s.classList.remove("active", "done");
      if (j < current)       s.classList.add("done");
      else if (j === current) s.classList.add("active");
    });
    fill.style.width = [0, 33, 66, 100][current] + "%";
  }

  ["cn", "cp", "ce", "ca", "cc"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", updateProgress);
  });

  var origOpen = window.openCheckout;
  window.openCheckout = function () {
    if (origOpen) origOpen();
    setTimeout(updateProgress, 50);
  };
  updateProgress();
}
