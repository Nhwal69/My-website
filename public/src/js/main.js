// ============================================================
//  ARCTIC SHOP BD — Main Entry Point
//  Boots the app: loads products from API, wires all events,
//  starts optional features in correct order.
// ============================================================

// ── 1. Load products — cache-first, then API ─────────────
function loadProducts() {
  // Show skeleton while loading
  showProductSkeleton(6);

  // Try cache first (5-min TTL)
  var cached = getCachedProducts();
  if (cached && cached.length) {
    State.setProducts(cached);
    return Promise.resolve();
  }

  return API.fetchProducts()
    .then(function (data) {
      if (!data || !data.products || !data.products.length) return;

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
      // State already has SITE_CONFIG.products from initialization
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
    // ── Nav ──
    ['#nav-products-link', 'Products', 'পণ্যসমূহ'],
    ['#nav-about-link',    'About',    'আমাদের সম্পর্কে'],
    ['#nav-reviews-link',  'Reviews',  'রিভিউ'],
    ['#nav-faq-link',      'FAQ',      'জিজ্ঞাসা'],
    // ── Mobile nav ──
    ['.mob-link[href="#products"]', 'Products', 'পণ্যসমূহ'],
    ['.mob-link[href="#about"]',    'About',    'আমাদের সম্পর্কে'],
    ['.mob-link[href="#reviews"]',  'Reviews',  'রিভিউ'],
    ['.mob-link[href="#faq"]',      'FAQ',      'জিজ্ঞাসা'],
    ['.mob-link[href="#footer"]',   'Contact',  'যোগাযোগ'],
    // ── Hero ──
    ['.hero-sub',   'WEAR THE FROST. RULE THE NIGHT.', 'হিমের পোশাকে রাতকে জয় করুন।'],
    ['.hero-cta',   '⚡ Shop the Drop', '⚡ এখনই কিনুন'],
    // ── Stats ──
    ['.stat-item:nth-child(1) .stat-label', 'Happy Customers', 'সন্তুষ্ট গ্রাহক'],
    ['.stat-item:nth-child(2) .stat-label', 'Bold Designs',    'অনন্য ডিজাইন'],
    ['.stat-item:nth-child(3) .stat-label', 'Avg. Rating',     'গড় রেটিং'],
    // ── About section ──
    ['.about-txt .sl',  'Our Story',   'আমাদের গল্প'],
    ['.about-txt .sh2', 'We <em>Make</em><br>Perfect.', 'আমরা <em>তৈরি করি</em><br>নিখুঁতভাবে।'],
    ['.af:nth-child(1) .af-title', 'Premium Fabric',  'প্রিমিয়াম কাপড়'],
    ['.af:nth-child(1) .af-desc',  '180gsm ring-spun cotton every time.', '১৮০gsm রিং-স্পান কটন, প্রতিবার।'],
    ['.af:nth-child(2) .af-title', 'DTG Printing',    'DTG প্রিন্টিং'],
    ['.af:nth-child(2) .af-desc',  'Colours that last — wash after wash.', 'রঙ টেকে — ধোয়ার পরও।'],
    ['.af:nth-child(3) .af-title', 'Fast Dispatch',   'দ্রুত ডেলিভারি'],
    ['.af:nth-child(3) .af-desc',  'Shipped within 24h of payment.', 'পেমেন্টের ২৪ ঘণ্টার মধ্যে শিপমেন্ট।'],
    ['.af:nth-child(4) .af-title', 'Made in Dhaka',   'ঢাকায় তৈরি'],
    ['.af:nth-child(4) .af-desc',  'Proudly local. Globally standard.', 'গর্বিতভাবে দেশীয়। বৈশ্বিক মানের।'],
    // ── Reviews section ──
    ['#reviews .sl',  'Social Proof',         'সামাজিক প্রমাণ'],
    ['#reviews .sh2', 'What They <em>Say.</em>', 'তারা কী <em>বলেন।</em>'],
    ['.rev-card:nth-child(1) .rev-text', '“Quality is insane for the price. The Losted Tee fits perfectly oversized — exactly what I wanted. Delivery was super fast too.”', '“দামের তুলনায় মান অসাধারণ। লস্টেড টি একদম পারফেক্ট ওভারসাইজড ফিট। ডেলিভারিও অনেক দ্রুত ছিল।”'],
    ['.rev-card:nth-child(2) .rev-text', '“Sweet Venom is everything. The print quality is unreal — crisp and bold. Arctic Shop BD is the real deal for streetwear in Bangladesh.”', '“সুইট ভেনম সেরা। প্রিন্টের মান অবিশ্বাস্য — স্পষ্ট ও গাঢ়। বাংলাদেশে স্ট্রিটওয়্যারে Arctic Shop BD সত্যিই অনন্য।”'],
    ['.rev-card:nth-child(3) .rev-text', '“Got the Pretty Tee limited edition. Ordered at night, shipped next morning. The dual-sided print is insane quality. Will definitely order again!”', '“প্রিটি টি লিমিটেড এডিশন পেয়েছি। রাতে অর্ডার দিলাম, পরের সকালে শিপ। ডুয়েল সাইড প্রিন্ট অসাধারণ। আবার অর্ডার করব!”'],
    // ── FAQ section ──
    ['#faq .sl',  'Support',            'সাপোর্ট'],
    ['#faq .sh2', 'Got <em>Questions?</em>', 'কোনো <em>প্রশ্ন আছে?</em>'],
    ['.faq-item:nth-child(1) .faq-q', 'How do I pay? <span class="faq-chv">▼</span>', 'কিভাবে পেমেন্ট করব? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(1) .faq-a', 'We accept bKash, Nagad, and Cash on Delivery (Dhaka only). After placing your order, send the amount to our number and enter the Transaction ID. Your order is confirmed once we verify payment.', 'আমরা bKash, Nagad এবং Cash on Delivery (শুধু ঢাকায়) গ্রহণ করি। অর্ডার দেওয়ার পর নির্দিষ্ট নম্বরে টাকা পাঠান ও ট্রানজেকশন আইডি দিন। পেমেন্ট যাচাই হলে অর্ডার নিশ্চিত হবে।'],
    ['.faq-item:nth-child(2) .faq-q', 'How long does delivery take? <span class="faq-chv">▼</span>', 'ডেলিভারি কতদিন লাগে? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(2) .faq-a', "Orders are dispatched within 24 hours. Delivery within Dhaka takes 1–2 working days. Outside Dhaka: 3–5 working days. You'll receive a WhatsApp update when your order ships.", 'অর্ডার ২৪ ঘণ্টার মধ্যে পাঠানো হয়। ঢাকায় ১–2 কার্যদিবস। ঢাকার বাইরে ৩–5 কার্যদিবস। শিপমেন্টের সময় WhatsApp-এ আপডেট পাবেন।'],
    ['.faq-item:nth-child(3) .faq-q', 'What sizes do you offer? <span class="faq-chv">▼</span>', 'কোন কোন সাইজ পাওয়া যায়? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(3) .faq-a', 'We offer S, M, L, XL, and XXL. All our tees are oversized cut — if you prefer a regular fit, size down one. Check the Size Guide in any product modal for exact measurements.', 'S, M, L, XL ও XXL পাওয়া যায়। সব টি-শার্ট ওভারসাইজড কাট — রেগুলার ফিট চাইলে এক সাইজ ছোট নিন। সঠিক মাপের জন্য পণ্যের মডালে সাইজ গাইড দেখুন।'],
    ['.faq-item:nth-child(4) .faq-q', 'Can I return or exchange? <span class="faq-chv">▼</span>', 'রিটার্ন বা এক্সচেঞ্জ করা যাবে? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(4) .faq-a', 'We accept exchanges within 7 days for manufacturing defects or wrong items. Custom orders and used tees cannot be returned. Contact us on WhatsApp with your order ID and photos.', 'উৎপাদন ত্রুটি বা ভুল পণ্যের ক্ষেত্রে ৭ দিনের মধ্যে এক্সচেঞ্জ গ্রহণযোগ্য। কাস্টম ও ব্যবহৃত পণ্য ফেরত নেওয়া হয় না। অর্ডার আইডি ও ছবিসহ WhatsApp-এ যোগাযোগ করুন।'],
    ['.faq-item:nth-child(5) .faq-q', 'Do you do custom/bulk orders? <span class="faq-chv">▼</span>', 'কাস্টম বা বাল্ক অর্ডার করা যায়? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(5) .faq-a', 'Yes! We handle custom designs from 1 piece with a 5–7 day turnaround. For bulk orders (10+ pieces), message us on WhatsApp for a special rate.', 'হ্যাঁ! ১ পিস থেকে কাস্টম ডিজাইন করা যায়, ৫–7 দিনে ডেলিভারি। বাল্ক অর্ডারে (১০+ পিস) বিশেষ মূল্যের জন্য WhatsApp-এ মেসেজ করুন।'],
    ['.faq-item:nth-child(6) .faq-q', 'How do I care for my tee? <span class="faq-chv">▼</span>', 'টি-শার্টের যত্ন কিভাবে নেব? <span class="faq-chv">▼</span>'],
    ['.faq-item:nth-child(6) .faq-a', 'Machine wash cold (30°C max), inside out. Do not tumble dry or bleach. Hang dry for best results. This preserves the print and fabric for years.', 'উল্টো করে ঠান্ডা পানিতে (সর্বোচ্চ ৩০°C) মেশিনে ধুন। টাম্বল ড্রাই বা ব্লিচ করবেন না। ঝুলিয়ে শুকান — প্রিন্ট ও কাপড় বছরের পর বছর ভালো থাকবে।'],
    // ── Cart ──
    ['.cart-head-title', 'Cart 🛍', 'কার্ট 🛍'],
    ['.xsell-label',     'You might also like', 'আপনার পছন্দ হতে পারে'],
    ['.cart-sub-label',  'Subtotal', 'সাবটোটাল'],
    ['.co-btn',  'Proceed to Checkout →', 'চেকআউটে যান →'],
    ['.cont-btn', '← Continue Shopping', '← কেনাকাটা চালিয়ে যান'],
    // ── Checkout ──
    ['.co-title', 'Complete Your Order', 'অর্ডার সম্পন্ন করুন'],
    ['.place-btn .btn-txt', '✓ Place Order', '✓ অর্ডার দিন'],
    ['.back-btn', '← Back to Cart', '← কার্টে ফিরুন'],
    // ── Order success ──
    ['.ok-title', 'Order Placed!',     'অর্ডার হয়ে গেছে!'],
    ['.ok-close', 'Continue Shopping', 'কেনাকাটা চালিয়ে যান'],
    // ── Size guide ──
    ['.sg-title', 'Size Guide', 'সাইজ গাইড'],
    // ── Footer ──
    ['.foot-tag',  'We Make Perfect', 'আমরা তৈরি করি নিখুঁতভাবে'],
    ['.foot-desc', 'Premium oversized graphic tees, made in Dhaka. Bold designs. Premium cotton. Fast delivery across Bangladesh.', 'প্রিমিয়াম ওভারসাইজড গ্রাফিক টি-শার্ট, ঢাকায় তৈরি। সাহসী ডিজাইন। প্রিমিয়াম কটন। সারা বাংলাদেশে দ্রুত ডেলিভারি।'],
    ['.trust-b:nth-child(1)', 'Secure Checkout', 'নিরাপদ চেকআউট'],
    ['.trust-b:nth-child(2)', 'bKash Accepted',  'bKash গ্রহণযোগ্য'],
    ['.trust-b:nth-child(3)', 'Made in BD',      'বাংলাদেশে তৈরি'],
    // ── Exit popup ──
    ['.exit-tag',      'Wait — Before You Go', 'যাওয়ার আগে দেখুন!'],
    ['#exit-headline', "Don't Freeze<br>On This <em>Deal.</em>", 'এই সুযোগ<br>মিস <em>করবেন না!</em>'],
    ['#exit-copy-btn',    'Copy',              'কপি'],
    ['#exit-cta-btn',     'Shop the Drop →',  'এখনই অর্ডার করুন →'],
    ['#exit-dismiss-btn', "No thanks, I'll pay full price", 'ধন্যবাদ, পরে কিনব'],
    // ── FAQ contact box ──
    ['.fcp-t', 'Still need help?', 'এখনও সাহায্য দরকার?'],
    ['.fcp-d', 'We respond within minutes on WhatsApp. You can also reach us on Facebook or by email — whatever works for you.', 'আমরা WhatsApp-এ মিনিটের মধ্যে সাড়া দিই। Facebook বা ইমেইলেও যোগাযোগ করতে পারেন।'],
    // ── Footer links ──
    ['.foot-links li:nth-child(1) a', 'All Tees',       'সব টি-শার্ট'],
    ['.foot-links li:nth-child(2) a', 'Limited Edition','লিমিটেড এডিশন'],
    ['.foot-links li:nth-child(3) a', 'Custom Order',   'কাস্টম অর্ডার'],
    ['.foot-copy', '\u00a9 Arctic Shop BD. All rights reserved.', '\u00a9 Arctic Shop BD. সর্বস্বত্ব সংরক্ষিত।'],
    // ── How to Order section ──
    ['.how-sl', 'SIMPLE PROCESS', 'সহজ প্রক্রিয়া'],
    ['.how-title', 'How to <em>Order.</em>', 'কিভাবে <em>অর্ডার করবেন।</em>'],
    ['.how-sub', 'Order in under 2 minutes — no account needed, no waiting.', '২ মিনিটের কম সময়ে অর্ডার করুন — কোনো অ্যাকাউন্ট লাগবে না।'],
    ['.how-step:nth-child(1) .how-step-t', 'Pick Your Tee',   'আপনার টি-শার্ট বেছে নিন'],
    ['.how-step:nth-child(1) .how-step-d', 'Browse the collection, select your size, add to cart. No signup required.', 'কালেকশন দেখুন, সাইজ বেছে কার্টে যোগ করুন। রেজিস্ট্রেশন লাগবে না।'],
    ['.how-step:nth-child(2) .how-step-t', 'Pay with bKash',  'bKash-এ পেমেন্ট করুন'],
    ['.how-step:nth-child(2) .how-step-d', 'Send via bKash, Nagad, or choose Cash on Delivery. Enter your TrxID to confirm.', 'bKash, Nagad-এ পাঠান বা Cash on Delivery বেছে নিন। TrxID দিয়ে নিশ্চিত করুন।'],
    ['.how-step:nth-child(3) .how-step-t', 'We Deliver',      'আমরা পৌঁছে দিই'],
    ['.how-step:nth-child(3) .how-step-d', 'We dispatch within 24h. Delivery in 2–4 working days. You get an update at every step.', '২৪ ঘণ্টার মধ্যে পাঠানো হয়। ২–৪ কার্যদিবসে ডেলিভারি। প্রতিটি ধাপে আপডেট পাবেন।'],
    ['.wa-pref-txt strong', 'Prefer to order on WhatsApp?', 'WhatsApp-এ অর্ডার করতে চান?'],
    // ── Wishlist & search ──
    ['.wl-head-title', '♥ Wishlist', '♥ ওয়িশলিস্ট'],
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
  initLang && initLang();   // already IIFE but guard anyway

  // Load products then render grid (finally = runs on both success AND API failure)
  loadProducts().finally(function () {
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
