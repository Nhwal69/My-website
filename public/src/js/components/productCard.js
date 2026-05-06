// ============================================================
//  ARCTIC SHOP BD — Product Card Component
//  Renders the product grid and filter buttons.
// ============================================================

// ── Render all product cards into #pg ────────────────────
function renderProds(filter) {
  filter = filter || "all";
  var grid     = document.getElementById("pg");
  if (!grid) return;

  var products = State.getProducts();
  // Hard fallback: if state is empty, use config directly
  if (!products || !products.length) {
    products = SITE_CONFIG.products.slice();
    State.setProducts(products);
  }
  var list     = filter === "all"
    ? products
    : products.filter(function (p) {
        var tags = Array.isArray(p.tags) ? p.tags : (p.tags || "").split(",").map(function (t) { return t.trim(); });
        return tags.indexOf(filter) >= 0;
      });

  var h = "";
  for (var i = 0; i < list.length; i++) {
    try { h += renderProductCard(list[i]); } catch(e) {}
  }
  if (h) grid.innerHTML = h;

  // Re-apply GSAP tilt after grid re-render
  if (window.initTilt) initTilt();
  if (window.applyCardAnimations) applyCardAnimations();
}

// ── Build HTML for a single product card ─────────────────
function renderProductCard(p) {
  var src  = getImg(p);
  var isC  = isCustom(p);
  var sl   = stockLabel(p.stock);
  var sc   = stockBadgeClass(p.stock);
  var st   = stockText(p.stock);

  // Image or placeholder
  var imgH = src
    ? "<img class='pc-img' src='" + src + "' alt='" + esc(p.name) + "' loading='lazy' decoding='async'/>"
    : "<div class='pc-art'>🛋</div>";

  // Out-of-stock overlay
  var outOverlay = (p.stock <= 0 && !isC)
    ? "<div class='pc-out-overlay'><div class='pc-out-txt'>Out of Stock</div></div>"
    : "";

  // Badge
  var bdg = p.badge
    ? "<div class='pc-badge b-" + p.badge + "'>" + esc(p.bl) + "</div>"
    : "";

  // Primary action button
  var addB = "";
  if (isC) {
    addB = "<button class='pc-btn' style='background:var(--gold)' onclick='openCustom()'>Get Quote</button>";
  } else if (p.stock > 0) {
    addB = "<button class='pc-btn' onclick='addToCartFromGrid(" + p.id + ")'>⚡ Order Now</button>";
  } else {
    addB = "<button class='pc-btn' disabled>Out of Stock</button>";
  }

  // Stock badge
  var stockH = "<div class='pc-stock'><span class='stock-badge " + sc + "'>" +
    "<span style='width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;vertical-align:middle;margin-right:4px'></span>" +
    st + "</span></div>";

  // Exact count line
  var countLine = "";
  if (p.stock > 3)      countLine = "<div class='pc-stock-count'>" + p.stock + " in stock</div>";
  else if (p.stock > 0) countLine = "<div class='pc-stock-count low-count'>Only " + p.stock + " left</div>";
  else                  countLine = "<div class='pc-stock-count out-count'>Out of stock</div>";

  return (
    "<div class='pc'>" +
      imgH +
      "<div class='pc-shade'></div>" +
      outOverlay +
      bdg +
      "<div class='pc-body'>" +
        "<div class='pc-ed'>" + esc(p.ed) + "</div>" +
        "<div class='pc-name'>" + esc(p.name) + "</div>" +
        "<div class='pc-price'>" + (p.price ? "৳" + p.price.toLocaleString() : "Price on Request") + "</div>" +
        stockH +
        countLine +
        "<div class='pc-acts'>" +
          addB +
          "<button class='pc-qv' onclick='openModal(" + p.id + ")'>👁</button>" +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

// ── Add to cart from grid card (default size L) ───────────
function addToCartFromGrid(pid) {
  var result = State.addToCart(pid, "L", 1);
  var p = State.getProduct(pid);
  if (!p) return;

  if (result === "out_of_stock") {
    toast("Sorry, this item is out of stock!", "error");
    return;
  }
  updBadge();
  renderCart();
  toast("✓ " + p.name + " (L) added to cart", "success");
}

// ── Build filter buttons ──────────────────────────────────
function buildFilters() {
  var wrap = document.getElementById("filters");
  if (!wrap) return;

  var products = State.getProducts();

  // Count products per tag
  var tagCounts = {};
  products.forEach(function (p) {
    var tags = Array.isArray(p.tags) ? p.tags : (p.tags || "").split(",").map(function (t) { return t.trim(); });
    tags.forEach(function (t) { if (t) tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });

  // Collect unique tags in order of first appearance
  var seen = {}, tags = [];
  products.forEach(function (p) {
    var ptags = Array.isArray(p.tags) ? p.tags : (p.tags || "").split(",").map(function (t) { return t.trim(); });
    ptags.forEach(function (t) { if (t && !seen[t]) { seen[t] = true; tags.push(t); } });
  });

  var h = "<button class='fb act' onclick='filterProducts(\"all\",this)'>All<span class='fb-count'>" + products.length + "</span></button>";
  tags.forEach(function (slug) {
    var label = FILTER_LABELS[slug] || (slug.charAt(0).toUpperCase() + slug.slice(1));
    var cnt   = tagCounts[slug] || 0;
    h += "<button class='fb' onclick='filterProducts(\"" + slug + "\",this)'>" + label + "<span class='fb-count'>" + cnt + "</span></button>";
  });
  wrap.innerHTML = h;
}

// ── Filter handler (called from inline onclick) ───────────
function filterProducts(filter, btn) {
  document.querySelectorAll(".fb").forEach(function (b) { b.classList.remove("act"); });
  btn.classList.add("act");
  renderProds(filter);
}

// ── Product count label ───────────────────────────────────
function buildCountLabel() {
  var el = document.getElementById("prod-count-label");
  if (!el) return;
  var products = State.getProducts();
  var regular  = products.filter(function (p) { return !isCustom(p); }).length;
  var hasCustom = products.some(function (p) { return isCustom(p); });
  el.textContent = regular + " piece" + (regular !== 1 ? "s" : "") + (hasCustom ? " + Custom" : "");
}

// ── Re-render products after stock refresh ────────────────
function refreshProductGrid() {
  renderProds("all");
  buildFilters();
  buildCountLabel();
}
