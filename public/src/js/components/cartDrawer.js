// ============================================================
//  ARCTIC SHOP BD — Cart Drawer Component
// ============================================================

function openCart() {
  document.getElementById("cart-overlay").classList.add("open");
  document.getElementById("cart-drawer").classList.add("open");
  renderCart();
}

function closeCart() {
  document.getElementById("cart-overlay").classList.remove("open");
  document.getElementById("cart-drawer").classList.remove("open");
}

function renderCart() {
  var b    = document.getElementById("cart-body");
  var f    = document.getElementById("cart-foot");
  var cart = State.getCart();

  if (!cart.length) {
    b.innerHTML = "<div class='cart-empty'><div class='cart-empty-icon'>🛍</div><div class='cart-empty-txt'>Your cart is empty</div></div>";
    f.style.display = "none";
    return;
  }

  f.style.display = "block";
  var h = "";
  cart.forEach(function (it) {
    var src = it.img;
    var th  = src
      ? "<img src='" + esc(src) + "' alt='" + esc(it.name) + "' loading='lazy' decoding='async'/>"
      : "<div class='ci-thumb-icon'>🛋</div>";
    h += "<div class='ci'>" +
           "<div class='ci-thumb'>" + th + "</div>" +
           "<div class='ci-info'>" +
             "<div class='ci-name'>" + esc(it.name) + "</div>" +
             "<div class='ci-meta'>Size: " + esc(it.sz) + "</div>" +
             "<div class='ci-price'>" + (it.price ? "৳" + (it.price * it.qty).toLocaleString() : "Quote") + "</div>" +
             "<div class='ci-qty'>" +
               "<button class='qb' onclick='changeCartQty(" + it.cid + ",-1)'>−</button>" +
               "<span class='qn'>" + it.qty + "</span>" +
               "<button class='qb' onclick='changeCartQty(" + it.cid + ",1)'>+</button>" +
             "</div>" +
           "</div>" +
           "<button class='ci-rm' onclick='removeCartItem(" + it.cid + ")'>✕</button>" +
         "</div>";
  });
  b.innerHTML = h;

  // Subtotal
  var del    = State.getDeliveryFee();
  var total  = State.getCartTotal();
  var totEl  = document.getElementById("cart-total");
  if (totEl) {
    totEl.innerHTML = "৳" + total.toLocaleString() +
      (del > 0 ? " <span style='font-size:11px;color:var(--muted)'>(+৳" + del + " delivery)</span>" : "");
  }

  // Free shipping progress bar
  var thr    = SITE_CONFIG.delivery.freeThreshold;
  var rem    = Math.max(0, thr - total);
  var pct    = Math.min(100, Math.round(total / thr * 100));
  var ship   = document.getElementById("cart-ship");
  var msg    = document.getElementById("cart-ship-msg");
  var fill   = document.getElementById("cart-ship-fill");
  if (ship && msg && fill) {
    if (total >= thr) {
      ship.classList.add("unlocked");
      msg.innerHTML = "🎉 You've unlocked <b>FREE shipping</b>!";
    } else {
      ship.classList.remove("unlocked");
      msg.innerHTML = "🚚 Add <span class='cart-ship-amt'>৳" + rem.toLocaleString() + "</span> more for FREE shipping";
    }
    fill.style.width = pct + "%";
  }

  renderXsell();
}

function removeCartItem(cid) {
  State.removeFromCart(cid);
  updBadge();
  renderCart();
}

function changeCartQty(cid, delta) {
  var result = State.updateCartQty(cid, delta);
  if (result === "exceeds_stock") {
    var item = State.getCart().find(function (i) { return i.cid === cid; });
    var p    = item ? State.getProduct(item.pid) : null;
    if (p) toast("Only " + p.stock + " units available for " + p.name, "warn");
    return;
  }
  renderCart();
}

// ── Cross-sell strip ──────────────────────────────────────
function renderXsell() {
  var strip   = document.getElementById("xsell-strip");
  var itemsEl = document.getElementById("xsell-items");
  if (!strip || !itemsEl) return;

  var cart       = State.getCart();
  var inCartIds  = cart.map(function (c) { return c.pid; });
  var candidates = State.getProducts().filter(function (p) {
    return !isCustom(p) && inCartIds.indexOf(p.id) < 0 && p.stock > 0;
  });

  if (!candidates.length) { strip.style.display = "none"; return; }

  var show = candidates.slice(0, 4);
  var h    = "";
  show.forEach(function (p) {
    var src = getImg(p);
    var th  = src
      ? "<img src='" + esc(src) + "' alt='" + esc(p.name) + "' loading='lazy'/>"
      : "<div style='font-size:22px;display:flex;align-items:center;justify-content:center;height:100%'>🛋</div>";
    h += "<div class='xsell-item' onclick='addToCartFromGrid(" + p.id + ");renderCart()'>" +
           "<div class='xsell-thumb'>" + th + "</div>" +
           "<div class='xsell-info'><div class='xsell-name'>" + esc(p.name) + "</div><div class='xsell-price'>৳" + p.price.toLocaleString() + "</div></div>" +
         "</div>";
  });
  itemsEl.innerHTML = h;
  strip.style.display = "block";
}
