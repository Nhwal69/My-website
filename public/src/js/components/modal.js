// ============================================================
//  ARCTIC SHOP BD — Product Modal Component
// ============================================================

function openModal(pid) {
  var p = State.getProduct(pid);
  if (!p) return;

  State.setModalProduct(pid);
  var src  = getImg(p);
  var imgs = (p.images && p.images.length) ? p.images : (src ? [src] : []);

  // ── Art panel ────────────────────────────────────────────
  var ah = "<button class='m-close' onclick='closeModal()'>✕</button>";
  if (imgs.length > 1) {
    ah += "<div class='modal-gallery'>";
    ah += "<img class='modal-main-img' id='modal-main-img' src='" + esc(imgs[0]) + "' alt='" + esc(p.name) + "' loading='lazy' onclick='openZoom(\"" + esc(imgs[0]) + "\",\"" + esc(p.name) + "\")'  />";
    ah += "<div class='modal-thumbs'>";
    imgs.forEach(function (imgSrc, gi) {
      ah += "<img class='modal-thumb" + (gi === 0 ? " active" : "") + "' src='" + esc(imgSrc) + "' alt='" + esc(p.name) + " view " + (gi + 1) + "' loading='lazy' onclick='switchModalImg(this,\"" + esc(imgSrc) + "\")'  />";
    });
    ah += "</div></div>";
    ah += "<button class='zoom-btn' onclick='openZoom(document.getElementById(\"modal-main-img\").src,\"" + esc(p.name) + "\")' title='Zoom'>🔍 Zoom</button>";
  } else if (src) {
    ah += "<img src='" + esc(src) + "' alt='" + esc(p.name) + "' loading='lazy' decoding='async' onclick='openZoom(\"" + esc(src) + "\",\"" + esc(p.name) + "\")'/>";
    ah += "<button class='zoom-btn' onclick='openZoom(\"" + esc(src) + "\",\"" + esc(p.name) + "\")' title='Zoom image'>🔍 Zoom</button>";
  } else {
    ah += "<div style='padding:40px;text-align:center;font-size:70px;opacity:.4'>🛻</div>";
  }
  document.getElementById("modal-art").innerHTML = ah;

  // ── Body panel ───────────────────────────────────────────
  var sl = stockLabel(p.stock);
  var st = stockText(p.stock);
  var sc = stockBadgeClass(p.stock);

  // Stock count line
  var stockCountH = "";
  if (p.stock > 3)      stockCountH = "<div class='m-stock-count'>" + p.stock + " units available</div>";
  else if (p.stock > 0) stockCountH = "<div class='m-stock-count low'>Only " + p.stock + " left — order soon</div>";
  else                  stockCountH = "<div class='m-stock-count out'>Currently out of stock</div>";

  var bh = "";
  bh += "<div class='m-edition'>" + esc(p.ed) + "</div>";
  bh += "<div class='m-name'>" + esc(p.name) + "</div>";
  bh += "<div class='m-price'>" + (p.price ? "৳" + p.price.toLocaleString() : "Price on Request") + "</div>";
  bh += "<div><span class='stock-badge " + sc + "'><span style='width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block'></span> " + st + "</span></div>";
  bh += stockCountH;
  bh += "<div class='m-desc'>" + esc(p.desc) + "</div>";

  // Description details grid
  if (p.descDetails) {
    var dd   = p.descDetails;
    var keys = Object.keys(dd);
    var labels = { fabric: "Fabric", fit: "Fit", print: "Print", wash: "Wash", origin: "Origin" };
    var rows = "";
    keys.forEach(function (k) {
      rows += "<div class='m-dd-row'><div class='m-dd-label'>" + (labels[k] || k) + "</div><div class='m-dd-val'>" + esc(dd[k]) + "</div></div>";
    });
    bh += "<div class='m-desc-details'>" + rows + "</div>";
  }

  // Size selector
  if (!isCustom(p)) {
    var state = State.getModalState();
    bh += "<div><div class='m-sec' style='display:flex;align-items:center;justify-content:space-between;'>Select Size " +
          "<button onclick='openSizeGuide()' style='background:none;border:none;color:var(--glow);font-family:\"DM Mono\",monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:0;'>📏 Size Guide</button></div>" +
          "<div class='size-grid' id='szg'>";
    ["S", "M", "L", "XL", "XXL"].forEach(function (sz) {
      bh += "<button class='sz" + (sz === state.size ? " sel" : "") + "' onclick='selModalSize(\"" + sz + "\",this)'>" + sz + "</button>";
    });
    bh += "</div></div>";

    // Quantity row
    bh += "<div><div class='m-sec'>Quantity</div>" +
          "<div class='qty-row'>" +
            "<button class='mqb' onclick='changeModalQty(-1)'>−</button>" +
            "<span class='mqn' id='mqn'>" + state.qty + "</span>" +
            "<button class='mqb' onclick='changeModalQty(1)'>+</button>" +
          "</div></div>";

    // Add to cart / out of stock
    if (p.stock > 0) {
      bh += "<button class='m-add' id='madd' onclick='addFromModal()'>⚡ Order Now — ৳" + (p.price * state.qty).toLocaleString() + "</button>";
    } else {
      bh += "<button class='m-add' disabled style='background:rgba(17,17,17,0.2);cursor:not-allowed'>Out of Stock</button>";
    }
  } else {
    bh += "<button class='m-add' onclick='closeModal();openCustom()' style='background:var(--gold);color:var(--ink)'>Request Custom Quote ✦</button>";
  }

  bh += "<button class='m-wish' onclick='addToWishlist(" + p.id + ")'>♡ Save to Wishlist</button>";

  // Mobile sticky add button
  if (!isCustom(p) && p.stock > 0) {
    bh += "<div class='m-sticky-add'><button class='m-sticky-add-btn' onclick='addFromModal()'>⚡ Order Now — ৳" + p.price.toLocaleString() + "</button></div>";
  } else if (isCustom(p)) {
    bh += "<div class='m-sticky-add'><button class='m-sticky-add-btn' style='background:var(--gold)' onclick='closeModal();openCustom()'>Request Quote ✦</button></div>";
  }

  // Features checklist
  bh += "<div class='m-feats'>" +
        "<div class='m-feat'><span class='m-feat-ic'>✓</span><span>180gsm Premium Ring-Spun Cotton</span></div>" +
        "<div class='m-feat'><span class='m-feat-ic'>✓</span><span>Oversized Fit — size down for regular</span></div>" +
        "<div class='m-feat'><span class='m-feat-ic'>✓</span><span>Free delivery on orders ৳1000+</span></div>" +
        "<div class='m-feat'><span class='m-feat-ic'>✓</span><span>WhatsApp order confirmation & updates</span></div>" +
        "</div>";

  document.getElementById("modal-body").innerHTML = bh;
  document.getElementById("modal-bg").classList.add("open");

  // Push product URL into browser history
  if (history.pushState) history.pushState(null, "", "#product-" + pid);
}

function closeModal() {
  document.getElementById("modal-bg").classList.remove("open");
  if (history.pushState) history.pushState(null, "", window.location.pathname);
}

function handleMBG(e) {
  if (e.target === document.getElementById("modal-bg")) closeModal();
}

function switchModalImg(thumb, src) {
  var main = document.getElementById("modal-main-img");
  if (main) {
    main.src     = src;
    main.onclick = function () { openZoom(src, "Product image"); };
  }
  document.querySelectorAll(".modal-thumb").forEach(function (t) { t.classList.remove("active"); });
  thumb.classList.add("active");
}

function selModalSize(s, el) {
  State.setModalSize(s);
  document.querySelectorAll(".sz").forEach(function (b) { b.classList.remove("sel"); });
  el.classList.add("sel");
}

function changeModalQty(delta) {
  State.changeModalQty(delta);
  var state = State.getModalState();
  var el    = document.getElementById("mqn");
  if (el) el.textContent = state.qty;
  var p   = State.getProduct(state.pid);
  var btn = document.getElementById("madd");
  if (btn && p) btn.innerHTML = "⚡ Order Now — ৳" + (p.price * state.qty).toLocaleString();
}

function addFromModal() {
  var state  = State.getModalState();
  var result = State.addToCart(state.pid, state.size, state.qty);
  var p      = State.getProduct(state.pid);
  if (!p) return;

  if (result === "out_of_stock") { toast("Sorry, this item is out of stock!", "error"); return; }

  updBadge();
  renderCart();
  toast("✓ " + p.name + " (" + state.size + ") added to cart", "success");
  closeModal();
  setTimeout(openCart, 300);
}

// ── Deep-link: open modal from URL hash #product-N ────────
function openModalBySlug() {
  var hash = window.location.hash;
  if (!hash) return;
  var m = hash.match(/^#product-(\d+)$/);
  if (m) { var pid = parseInt(m[1], 10); if (pid) openModal(pid); }
}

window.addEventListener("popstate", function () {
  var hash = window.location.hash;
  if (!hash || !hash.match(/^#product-\d+$/)) {
    var mb = document.getElementById("modal-bg");
    if (mb) mb.classList.remove("open");
  } else {
    openModalBySlug();
  }
});

// ── Wishlist Drawer ───────────────────────────────────────
function openWishlist() {
  renderWishlist();
  document.getElementById("wishlist-overlay").classList.add("open");
  document.getElementById("wishlist-drawer").classList.add("open");
}

function closeWishlist() {
  document.getElementById("wishlist-overlay").classList.remove("open");
  document.getElementById("wishlist-drawer").classList.remove("open");
}

function renderWishlist() {
  var b        = document.getElementById("wl-body");
  if (!b) return;
  var wishlist = State.getWishlist();

  if (!wishlist.length) {
    b.innerHTML = "<div class='wl-empty'><div class='wl-empty-icon'>♡</div><div class='wl-empty-txt'>Your wishlist is empty</div></div>";
    return;
  }

  var h = "";
  wishlist.forEach(function (it) {
    var src = it.img;
    var th  = src ? "<img src='" + esc(src) + "'/>" : "";
    h += "<div class='wl-item'>" +
           "<div class='wl-thumb'>" + th + "</div>" +
           "<div class='wl-info'>" +
             "<div class='wl-name'>" + esc(it.name) + "</div>" +
             "<div class='wl-price'>৳" + (it.price ? it.price.toLocaleString() : "Quote") + "</div>" +
             "<div class='wl-acts'>" +
               "<button class='wl-add' onclick='addToCartFromGrid(" + it.pid + ");renderWishlist()'>⚡ Add to Cart</button>" +
               "<button class='wl-rm'  onclick='rmFromWishlist(" + it.pid + ")'>✕</button>" +
             "</div>" +
           "</div>" +
         "</div>";
  });
  b.innerHTML = h;
}

function addToWishlist(pid) {
  var result = State.addToWishlist(pid);
  if (result === "already_in") { toast("Already in your wishlist ♥", "warn"); return; }
  updWLBadge();
  toast("♥ " + (State.getProduct(pid) || {}).name + " saved to wishlist", "success");
  closeModal();
}

function rmFromWishlist(pid) {
  State.removeFromWishlist(pid);
  updWLBadge();
  renderWishlist();
}
