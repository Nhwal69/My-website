// ============================================================
//  ARCTIC SHOP BD — Performance & UX  (Steps 5, 6, 7)
//  1. Image lazy-load fade-in (IntersectionObserver)
//  2. Skeleton product grid while API loads
//  3. Button guard — prevents double-clicks
//  4. Offline / online detection
//  5. Error banner (global fetch failures)
//  6. Products cache (sessionStorage, 5-minute TTL)
//  7. Field error shake + clear on input
// ============================================================

// ── 1. Image lazy-load fade-in ────────────────────────────
(function initImageFadeIn() {
  // Add .loaded class once the image is actually in the viewport
  // and the browser has decoded it.
  function markLoaded(img) {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add("loaded");
      return;
    }
    img.addEventListener("load",  function () { img.classList.add("loaded"); }, { once: true });
    img.addEventListener("error", function () { img.classList.add("loaded"); }, { once: true }); // fade in even on error
  }

  // Observe all lazy images already in the DOM
  function attachAll() {
    document.querySelectorAll("img[loading='lazy']").forEach(markLoaded);
    // Also handle non-lazy images (hero etc.)
    document.querySelectorAll("img:not([loading='lazy'])").forEach(function (img) {
      img.classList.add("loaded");
    });
  }

  document.addEventListener("DOMContentLoaded", attachAll);

  // MutationObserver: catch images injected dynamically (product cards, cart items)
  var imgObs = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        var imgs = node.tagName === "IMG" ? [node] : Array.from(node.querySelectorAll("img"));
        imgs.forEach(markLoaded);
      });
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    imgObs.observe(document.body, { childList: true, subtree: true });
  });
})();

// ── 2. Skeleton product grid ──────────────────────────────
function showProductSkeleton(count) {
  var grid = document.getElementById("pg");
  if (!grid) return;
  count = count || 6;
  var h = "";
  for (var i = 0; i < count; i++) {
    h += "<div class='pc-skeleton'>" +
           "<div class='sk-img skeleton'></div>" +
           "<div class='sk-body'>" +
             "<div class='sk-line wide skeleton'></div>" +
             "<div class='sk-line med skeleton'></div>" +
             "<div class='sk-line narrow skeleton'></div>" +
             "<div class='sk-btn skeleton'></div>" +
           "</div>" +
         "</div>";
  }
  grid.innerHTML = h;
}

function hideProductSkeleton() {
  // Actual renderProds() replaces the skeleton — nothing extra needed.
  // This is a hook in case you need to do cleanup.
}

// ── 3. Button guard: prevent double-clicks ────────────────
// Usage: wrap any async handler: guardBtn(el, asyncFn)
function guardBtn(btn, fn) {
  if (!btn || btn.disabled || btn.dataset.busy === "1") return;
  btn.dataset.busy = "1";
  btn.disabled = true;
  var prev = btn.innerHTML;

  var p = fn();
  if (p && typeof p.finally === "function") {
    p.finally(function () {
      btn.disabled = false;
      btn.dataset.busy = "0";
    });
  } else {
    // Sync fallback
    btn.disabled = false;
    btn.dataset.busy = "0";
  }
}

// ── 4. Offline / online detection ─────────────────────────
(function initOfflineBar() {
  var bar = null;

  function getBar() {
    if (!bar) {
      bar = document.getElementById("offline-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "offline-bar";
        bar.innerHTML = "<div class='offline-dot'></div> You're offline — orders cannot be placed until you reconnect.";
        document.body.appendChild(bar);
      }
    }
    return bar;
  }

  function check() {
    getBar().classList.toggle("show", !navigator.onLine);
  }

  window.addEventListener("online",  check);
  window.addEventListener("offline", check);
  document.addEventListener("DOMContentLoaded", check);
})();

// ── 5. Global error banner ────────────────────────────────
var _errorBannerTimer = null;

function showErrorBanner(msg) {
  var b = document.getElementById("error-banner");
  if (!b) {
    b = document.createElement("div");
    b.id = "error-banner";
    b.innerHTML = "<span id='error-banner-msg'></span>" +
      "<button id='error-banner-close' onclick='hideErrorBanner()' aria-label='Close'>✕</button>";
    document.body.appendChild(b);
  }
  var m = document.getElementById("error-banner-msg");
  if (m) m.textContent = msg;
  b.classList.add("show");
  clearTimeout(_errorBannerTimer);
  _errorBannerTimer = setTimeout(hideErrorBanner, 7000);
}

function hideErrorBanner() {
  var b = document.getElementById("error-banner");
  if (b) b.classList.remove("show");
}

// ── 6. Products cache (sessionStorage, 5-minute TTL) ──────
var CACHE_KEY = "arcbd_products_cache_v2";
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProducts() {
  try {
    var raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return obj.products;
  } catch (e) { return null; }
}

function setCachedProducts(products) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products: products }));
  } catch (e) {}
}

function bustProductCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
}

// ── 7. Field error helpers ────────────────────────────────
// Shake an input and show inline error message below it
function showFieldError(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add("err");

  // Create or find error text node
  var errEl = document.getElementById(id + "-err");
  if (!errEl) {
    errEl = document.createElement("div");
    errEl.id = id + "-err";
    errEl.className = "field-err";
    el.parentNode.insertBefore(errEl, el.nextSibling);
  }
  errEl.textContent = msg;
  errEl.classList.add("show");
}

function clearFieldError(id) {
  var el    = document.getElementById(id);
  var errEl = document.getElementById(id + "-err");
  if (el)    el.classList.remove("err");
  if (errEl) errEl.classList.remove("show");
}

// Auto-clear field errors on input
document.addEventListener("DOMContentLoaded", function () {
  ["cn","cp","ce","ca","cc","cdi","cn2","bkash-trx","nagad-trx"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", function () {
        clearFieldError(id);
      });
    }
  });
});

// ── 8. Passive fetch error handler ────────────────────────
// Wraps window.fetch to catch network-level failures globally
// and show the offline banner / error banner.
(function patchFetch() {
  var origFetch = window.fetch;
  window.fetch = function () {
    return origFetch.apply(this, arguments).catch(function (err) {
      if (!navigator.onLine) {
        // Already shown by offline bar — no extra banner needed
      } else {
        console.warn("[Arctic] Fetch failed:", err.message);
      }
      throw err; // re-throw so callers can handle
    });
  };
})();

// ── 9. IntersectionObserver for cart drawer images ────────
// Cart items are added dynamically — run observer on open
function observeCartImages() {
  var drawer = document.getElementById("cart-body");
  if (!drawer) return;
  drawer.querySelectorAll("img[loading='lazy']").forEach(function (img) {
    if (img.complete) { img.classList.add("loaded"); return; }
    img.addEventListener("load",  function () { img.classList.add("loaded"); }, { once: true });
    img.addEventListener("error", function () { img.classList.add("loaded"); }, { once: true });
  });
}
