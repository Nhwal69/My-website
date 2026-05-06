// ============================================================
//  ARCTIC SHOP BD — Main Entry Point
//  Boots the app: loads products from API, wires all events,
//  starts optional features in correct order.
// ============================================================

// ── 1. Load products — cache-first, then API ─────────────
function loadProducts() {
  // Try cache first (5-min TTL)
  var cached = getCachedProducts();
  if (cached && cached.length) {
    State.setProducts(cached);
    return Promise.resolve();
  }

  return API.fetchProducts()
    .then(function (data) {
      if (!data || !data.products || !data.products.length) {
        State.setProducts(SITE_CONFIG.products.slice());
        return;
      }

      var apiMap = {};
      data.products.forEach(function (p) { apiMap[p.id] = p; });

      var merged = SITE_CONFIG.products.map(function (local) {
        var api = apiMap[local.id];
        if (!api) return local;
        return Object.assign({}, local, {
          price:     api.price     !== undefined ? api.price     : local.price,
          stock:     api.stock     !== undefined ? api.stock     : local.stock,
          name:      api.name      || local.name,
          image_url: api.image_url || local.img  || null,
          img:       api.image_url || local.img  || null,
        });
      });

      // Append API-only products not in local config
      data.products.forEach(function (ap) {
        var found = merged.find(function (m) { return m.id === ap.id; });
        if (!found) {
          merged.push({
            id: ap.id, name: ap.name,
            ed: "Arctic Drop", price: ap.price, stock: ap.stock,
            badge: null, bl: "", tags: ["black"],
            desc: ap.description || "", descDetails: {},
            img: ap.image_url || null, image_url: ap.image_url || null,
            images: ap.image_url ? [ap.image_url] : [],
            type: "regular", aboutImg: false,
          });
        }
      });

      State.setProducts(merged);
      setCachedProducts(merged);
    })
    .catch(function (err) {
      console.warn("API unavailable — using local config products.", err);
      State.setProducts(SITE_CONFIG.products.slice());
    });
}

// ── 2. Social proof notifications ─────────────────────────
(function initSocialProof() {
  var sp       = SITE_CONFIG.socialProof;
  var lastProd = null;
  var queue    = [];
  var running  = false;
  var products = SITE_CONFIG.products.filter(function (p) { return !isCustom(p); });

  function pickProd() {
    if (products.length < 2) return products[0] || null;
    var p;
    do { p = products[Math.floor(Math.random() * products.length)]; } while (p === lastProd);
    lastProd = p;
    return p;
  }

  function showNext() {
    if (!queue.length) { running = false; return; }
    running = true;
    var data = queue.shift();
    var w    = document.getElementById("sp-wrap");
    if (!w) return;

    var el = document.createElement("div");
    el.className = "sp-notif";
    el.innerHTML =
      "<div class='sp-av'>" + data.initials + "</div>" +
      "<div class='sp-txt'>" +
        "<div class='sp-txt-main'>" + esc(data.action) + " <strong>" + esc(data.product) + "</strong></div>" +
        "<div class='sp-txt-meta'>" + esc(data.city) + " — Just now</div>" +
      "</div>" +
      "<div class='sp-dot'></div>";
    w.appendChild(el);

    setTimeout(function () { el.classList.add("show"); }, 50);
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); showNext(); }, 500);
    }, 4200);
  }

  function trigger() {
    var prod = pickProd();
    if (!prod) return;
    var name    = sp.names[Math.floor(Math.random() * sp.names.length)];
    var city    = sp.cities[Math.floor(Math.random() * sp.cities.length)];
    var action  = sp.actions[Math.floor(Math.random() * sp.actions.length)];
    var init    = name.charAt(0).toUpperCase();

    queue.push({ initials: init, action: action, product: prod.name, city: city });
    if (!running) showNext();
  }

  // Show notifications only after visitor enters the site (like og)
  window.addEventListener('arctic:entered', function () {
    var delays = [8000, 25000, 44000, 68000, 95000, 130000];
    delays.forEach(function (d) { setTimeout(trigger, d); });
  }, { once: true });
})();

// ── 3. Sticky announcement bar ────────────────────────────
(function initStickyBar() {
  var bar = document.getElementById("sticky-bar");
  if (!bar) return;

  // Countdown: 24 hours from now, or restore from storage
  var KEY  = "arcbd_bar_end";
  var end  = parseInt(localStorage.getItem(KEY) || "0", 10);
  var now  = Date.now();
  if (!end || end < now) {
    end = now + 24 * 60 * 60 * 1000;
    localStorage.setItem(KEY, end);
  }

  var cdEl = document.getElementById("sb-countdown");
  function tickCountdown() {
    var diff = Math.max(0, end - Date.now());
    var h    = Math.floor(diff / 3600000);
    var m    = Math.floor((diff % 3600000) / 60000);
    var s    = Math.floor((diff % 60000)   / 1000);
    if (cdEl) cdEl.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
    if (diff <= 0) {
      localStorage.removeItem(KEY);
      document.body.classList.remove("bar-visible");
      bar.style.transform = "translateY(-100%)";
      document.getElementById("nav").style.top = "0";
    }
  }
  function pad(n) { return n < 10 ? "0" + n : n; }

  // Show bar only after the visitor dismisses the intro splash
  function showBar() {
    setTimeout(function () {
      bar.style.transform = "translateY(0)";
      document.body.classList.add("bar-visible");
      var nav = document.getElementById("nav");
      if (nav) nav.style.top = bar.offsetHeight + "px";
      setInterval(tickCountdown, 1000);
      tickCountdown();
    }, 800);
  }
  if (document.documentElement.classList.contains("entered")) {
    showBar();
  } else {
    window.addEventListener("arctic:entered", showBar, { once: true });
  }

  // Dismiss button
  var closeBtn = document.getElementById("sticky-bar-close");
  if (closeBtn) closeBtn.addEventListener("click", function () {
    bar.style.transform = "translateY(-100%)";
    document.body.classList.remove("bar-visible");
    document.getElementById("nav").style.top = "0";
  });
})();

// ── 4. Exit-intent popup ──────────────────────────────────
(function initExitIntent() {
  var shown  = false;
  var DELAY  = 8000;  // minimum time on page before showing
  var ready  = false;
  setTimeout(function () { ready = true; }, DELAY);

  // Desktop: mouse leaves viewport through top edge
  document.addEventListener("mouseleave", function (e) {
    if (!shown && ready && e.clientY < 5) {
      shown = true;
      document.getElementById("exit-overlay").classList.add("open");
    }
  });

  // Mobile: scroll down then back up quickly
  var lastSY  = 0, lastTime = 0;
  window.addEventListener("scroll", function () {
    var sy  = window.scrollY;
    var now = Date.now();
    if (now - lastTime > 200) {
      var delta = sy - lastSY;
      if (ready && !shown && sy > 300 && delta < -60) {
        shown = true;
        document.getElementById("exit-overlay").classList.add("open");
      }
      lastSY   = sy;
      lastTime = now;
    }
  }, { passive: true });
})();

function closeExit() {
  document.getElementById("exit-overlay").classList.remove("open");
}

function exitToShop() {
  closeExit();
  var el = document.getElementById("products");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function copyExitCode() {
  var code = document.getElementById("exit-code-text");
  if (!code) return;
  _copyToClipboard(code.textContent, document.querySelector(".exit-copy-btn"), "Promo code copied!");
}

// ── 5. AI Chat widget ─────────────────────────────────────
var chatHistory = [];

function togChat() {
  var btn = document.getElementById("arctic-chat-btn");
  var win = document.getElementById("arctic-chat-window");
  var dot = btn.querySelector(".chat-notif-dot");
  if (!btn || !win) return;

  var isOpen = win.classList.toggle("open");
  btn.classList.toggle("open", isOpen);
  if (dot) dot.style.display = "none";

  // Auto-close SVG swap handled via CSS
  if (isOpen) {
    var inp = win.querySelector(".ac-input");
    if (inp) setTimeout(function () { inp.focus(); }, 350);
    // Show greeting if first open
    var messages = win.querySelector(".ac-messages");
    if (messages && !messages.children.length) {
      appendChatMsg("bot", "Hi! I'm Arctic's AI assistant 🧊 Ask me anything about our products, sizing, delivery, or orders.");
      renderQuickReplies(["Sizing help", "Delivery info", "Products", "Custom order"]);
    }
  }
}

function closeChatWindow() {
  document.getElementById("arctic-chat-window").classList.remove("open");
  document.getElementById("arctic-chat-btn").classList.remove("open");
}

function appendChatMsg(role, text) {
  var msgs = document.getElementById("chat-messages");
  if (!msgs) return;

  var d    = document.createElement("div");
  d.className = "ac-msg " + role;
  var now  = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  d.innerHTML =
    "<div class='ac-bubble'>" + text.replace(/\n/g, "<br>") + "</div>" +
    "<div class='ac-time'>" + now + "</div>";
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showChatTyping() {
  var msgs = document.getElementById("chat-messages");
  if (!msgs) return;
  var d = document.createElement("div");
  d.className = "ac-msg bot ac-typing";
  d.id = "chat-typing";
  d.innerHTML = "<div class='ac-bubble'><div class='ac-dot'></div><div class='ac-dot'></div><div class='ac-dot'></div></div>";
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideChatTyping() {
  var d = document.getElementById("chat-typing");
  if (d) d.remove();
}

function renderQuickReplies(replies) {
  var wrap = document.getElementById("chat-quick-wrap");
  if (!wrap) return;
  var h = "";
  replies.forEach(function (r) {
    h += "<button class='ac-quick' onclick='sendChatQuick(\"" + esc(r) + "\")'>" + esc(r) + "</button>";
  });
  wrap.innerHTML = h;
}

function sendChatQuick(text) {
  document.getElementById("chat-quick-wrap").innerHTML = "";
  sendChat(text);
}

function sendChat(msgOverride) {
  var inp = document.getElementById("chat-input");
  if (!inp) return;
  var msg = (msgOverride || inp.value.trim());
  if (!msg) return;
  inp.value = "";
  inp.style.height = "auto";

  appendChatMsg("user", esc(msg));
  chatHistory.push({ role: "user", content: msg });
  showChatTyping();

  // Build full AI context — matches og system prompt
  var prods = State.getProducts().filter(function (p) { return !isCustom(p); });
  var lines = prods.map(function (p) {
    var s = p.stock <= 0 ? "out of stock" : p.stock <= 3 ? "low stock (" + p.stock + " left)" : "in stock (" + p.stock + " units)";
    var tags = Array.isArray(p.tags) ? p.tags.join("/") : (p.tags || "");
    return p.name + " [৳" + p.price + ", " + s + ", tags: " + tags + "]";
  });
  var context = "You are Arctic AI, the friendly assistant for Arctic Shop BD — a premium streetwear brand based in Dhaka, Bangladesh. "
    + "You help customers with product info, sizing, delivery, and payments. Be concise, warm, and on-brand (cool/streetwear tone). "
    + "Current products: " + lines.join("; ") + ". "
    + "Sizes: S, M, L, XL, XXL — all oversized fit (size down for regular look). "
    + "Prices: ৳650-700. Free delivery inside Dhaka on orders ৳1000+. Outside Dhaka ৳80 delivery fee. "
    + "Payment: bKash, Nagad, Rocket, Cash on Delivery. COD advance of ৳200-300 required for orders above ৳2000. "
    + "Promo codes: WELCOME10 and ARCTIC10 (10% off). "
    + "Exchange policy: 7-day hassle-free exchange (unused, unwashed). "
    + "Contact: Facebook /ArcticShopBD, email " + OWNER_EMAIL + ". Response time 2-4 hours. "
    + "For custom tees: minimum 1 piece, 5-7 day turnaround, send design to Facebook or email. "
    + "DO NOT make up information. If unsure, direct to Facebook or email.";

  API.chat(msg, chatHistory, context)
    .then(function (res) {
      hideChatTyping();
      var reply = (res && res.reply) ? res.reply : "Sorry, I couldn't process that. Try again!";
      appendChatMsg("bot", reply);
      chatHistory.push({ role: "assistant", content: reply });
    })
    .catch(function () {
      hideChatTyping();
      appendChatMsg("bot", "I'm having trouble connecting. Please message us on <a href='https://wa.me/" + SITE_CONFIG.store.whatsapp + "' target='_blank' style='color:var(--glow)'>WhatsApp</a> for instant help!");
    });
}

function chatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

// ── 6. Language toggle (EN / BN) — full translation system ──
(function () {
  var T = [
    ['#nav-products-link', 'Products', 'পণ্যসমূহ'],
    ['#nav-about-link',    'About',    'আমাদের সম্পর্কে'],
    ['#nav-reviews-link',  'Reviews',  'রিভিউ'],
    ['#nav-faq-link',      'FAQ',      'জিজ্ঞাসা'],
    ['.hero-sub',   'WEAR THE FROST. RULE THE NIGHT.', 'হিমের পোশাকে রাতকে জয় করুন।'],
    ['.hero-cta',   '⚡ Shop the Drop', '⚡ এখনই কিনুন'],
    ['.mob-link[href="#products"]', 'Products', 'পণ্যসমূহ'],
    ['.mob-link[href="#about"]',    'About',    'আমাদের সম্পর্কে'],
    ['.mob-link[href="#reviews"]',  'Reviews',  'রিভিউ'],
    ['.mob-link[href="#faq"]',      'FAQ',      'জিজ্ঞাসা'],
    ['.mob-link[href="#footer"]',   'Contact',  'যোগাযোগ'],
    ['.exit-tag',      'Wait — Before You Go', 'যাওয়ার আগে দেখুন!'],
    ['#exit-headline', "Don't Freeze<br>On This <em>Deal.</em>", 'এই সুযোগ<br>মিস <em>করবেন না!</em>'],
    ['#exit-copy-btn',    'Copy',                'কপি'],
    ['#exit-cta-btn',     'Shop the Drop →', 'এখনই অর্ডার করুন →'],
    ['#exit-dismiss-btn', "No thanks, I'll pay full price", 'ধন্যবাদ, পরে কিনর'],
    ['.wl-head-title', '♥ Wishlist', '♥ ওয়িশলিস্ট'],
    ['.search-hint', 'Type to search products', 'পণ্য খুঁজতে টাইপ করুন'],
  ];

  var currentLang = localStorage.getItem('asbd_lang') || 'en';

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('asbd_lang', lang);
    var isBn = lang === 'bn';
    document.documentElement.classList.toggle('lang-bn', isBn);
    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = isBn ? 'EN' : 'বাং';
    T.forEach(function (item) {
      document.querySelectorAll(item[0]).forEach(function (el) {
        el.innerHTML = isBn ? item[2] : item[1];
      });
    });
    document.querySelectorAll('[data-bn]').forEach(function (el) {
      var orig = el.getAttribute('data-en') || el.textContent;
      if (!el.getAttribute('data-en')) el.setAttribute('data-en', orig);
      el.textContent = isBn ? el.getAttribute('data-bn') : el.getAttribute('data-en');
    });
  }

  window.toggleLang = function () { applyLang(currentLang === 'en' ? 'bn' : 'en'); };

  document.addEventListener('DOMContentLoaded', function () {
    if (currentLang === 'bn') applyLang('bn');
  });
})();

// ── 7. Intro animation replay ─────────────────────────────
function replayIntro() {
  document.documentElement.classList.remove("entered");
  window.scrollTo(0, 0);
  document.body.style.overflow = "hidden";
}

// ── 8. Boot sequence ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

  // Core UI init
  initLoader();
  initNavScroll();
  buildTicker();
  initScrollReveal();
  initEscKey();
  initLang && initLang();

  // Render config products immediately so grid is never blank
  State.setProducts(SITE_CONFIG.products.slice());
  buildFilters();
  renderProds("all");
  buildCountLabel();

  // Load products then update grid from API
  loadProducts().then(function () {
    buildFilters();
    renderProds("all");
    buildCountLabel();
    initAboutImgs();
    openModalBySlug();    // handle ?#product-N deep links
    initTilt();
    initMagnetic();
    initGSAP();
    initLenis();
  });

  // Wishlist badge on boot
  updWLBadge();

  // Copy-year
  initCopyYear();

  // Videos (load after entered)
  initVideos();

  // Checkout progress wiring
  initCheckoutProgress();

  // ── Close overlays by clicking backdrop ─────────────────
  document.getElementById("cart-overlay").addEventListener("click", closeCart);
  document.getElementById("wishlist-overlay").addEventListener("click", closeWishlist);
  document.getElementById("modal-bg").addEventListener("click", handleMBG);
  document.getElementById("search-overlay").addEventListener("click", function (e) {
    if (e.target === this) closeSearch();
  });
  document.getElementById("co-modal").addEventListener("click", function (e) {
    if (e.target === this) closeCheckout();
  });
  document.getElementById("ok-modal").addEventListener("click", function (e) {
    if (e.target === this) closeOK();
  });
  document.getElementById("exit-overlay").addEventListener("click", function (e) {
    if (e.target === this) closeExit();
  });
  document.getElementById("zoom-overlay").addEventListener("click", closeZoom);
  document.getElementById("zoom-close").addEventListener("click", closeZoom);
  document.getElementById("size-guide-modal").addEventListener("click", function (e) {
    if (e.target === this) closeSizeGuide();
  });

  // ── Search input ─────────────────────────────────────────
  var si = document.getElementById("search-input");
  if (si) si.addEventListener("input", function () { doSearch(this.value); });

  // ── Chat textarea auto-resize ─────────────────────────────
  var ci = document.getElementById("chat-input");
  if (ci) ci.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 80) + "px";
  });

  // ── FAQ ────────────────────────────────────────────────────
  document.querySelectorAll(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () { tFaq(q); });
  });

  // ── Mobile menu ───────────────────────────────────────────
  var ham = document.getElementById("ham");
  if (ham) ham.addEventListener("click", togMob);
  var mcb = document.getElementById("mob-menu-close");
  if (mcb) mcb.addEventListener("click", closeMob);

  // ── Intro layer CTA ───────────────────────────────────────
  var cta = document.getElementById("cta");
  if (cta) cta.addEventListener("click", function () {
    document.documentElement.classList.add("entered");
    window.dispatchEvent(new Event("arctic:entered"));
    document.body.style.overflow = "";
  });

  // ── Sticky bar nav anchor ──────────────────────────────────
  document.querySelectorAll('[data-scroll-to]').forEach(function (el) {
    el.addEventListener("click", function (e) {
      var target = document.getElementById(el.dataset.scrollTo);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  });

  console.log("%c🧊 Arctic Shop BD — Production Build", "color:#111;font-size:14px;font-weight:bold");
});
