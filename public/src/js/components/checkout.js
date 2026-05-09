// ============================================================
//  ARCTIC SHOP BD — Checkout Component
//  Handles: checkout modal, promo, payment, order submission
// ============================================================

var placingOrder = false;

// ── Open / Close ─────────────────────────────────────────
function openCheckout() {
  if (!State.getCart().length) { toast("Your cart is empty!", "error"); return; }
  closeCart();
  renderOrdMini();
  updatePaymentPanels();
  document.getElementById("co-modal").classList.add("open");
}

function closeCheckout() {
  document.getElementById("co-modal").classList.remove("open");
}

// ── Order summary mini ────────────────────────────────────
function renderOrdMini() {
  var el   = document.getElementById("ord-mini");
  if (!el) return;
  var cart = State.getCart();
  var h    = "";

  cart.forEach(function (it) {
    h += "<div class='ord-item'>" +
         "<span class='ord-name'>" + esc(it.name) + " (" + esc(it.sz) + ") x" + it.qty + "</span>" +
         "<span class='ord-price'>" + (it.price ? "৳" + (it.price * it.qty).toLocaleString() : "Quote") + "</span>" +
         "</div>";
  });

  var del   = State.getDeliveryFee();
  var disc  = State.getDiscount();
  var promo = State.getPromo();

  h += "<div class='ord-item'><span class='ord-name'>Delivery</span><span class='ord-price' style='color:var(--green)'>" + (del === 0 ? "FREE" : "৳" + del) + "</span></div>";
  if (disc > 0) {
    h += "<div class='ord-discount'><span class='ord-discount-label'>✓ Promo (" + promo.pct + "% off)</span><span class='ord-discount-val'>−৳" + disc.toLocaleString() + "</span></div>";
  }
  h += "<div class='ord-tot'><span class='ord-tot-label'>Grand Total</span><span class='ord-tot-val'>৳" + State.getGrandTotal().toLocaleString() + "</span></div>";
  el.innerHTML = h;
}

// ── Payment method selection ──────────────────────────────
function selPay(el, method) {
  State.setPayMethod(method);
  document.querySelectorAll(".pay-opt").forEach(function (o) { o.classList.remove("sel"); });
  el.classList.add("sel");
  updatePaymentPanels();
}

function updatePaymentPanels() {
  var method = State.getPayMethod();
  var grand  = State.getGrandTotal();

  var panels = { bkash: "bkash-details", nagad: "nagad-details", cod: "cod-details" };
  Object.values(panels).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("show");
  });

  if (method === "bKash") {
    var bd = document.getElementById("bkash-details");
    if (bd) bd.classList.add("show");
    var bAmt = document.getElementById("bkash-amt");
    var bNum = document.getElementById("bkash-num-val");
    if (bAmt) bAmt.textContent = "৳" + grand.toLocaleString();
    if (bNum) bNum.textContent = BKASH_MERCHANT;
  } else if (method === "Nagad") {
    var nd = document.getElementById("nagad-details");
    if (nd) nd.classList.add("show");
    var nAmt = document.getElementById("nagad-amt");
    var nNum = document.getElementById("nagad-num-val");
    if (nAmt) nAmt.textContent = "৳" + grand.toLocaleString();
    if (nNum) nNum.textContent = NAGAD_MERCHANT;
  } else if (method === "Cash on Delivery") {
    var cd = document.getElementById("cod-details");
    if (cd) cd.classList.add("show");
  }
}

// ── Copy bKash / Nagad number ─────────────────────────────
function copyBkash() {
  var num = BKASH_MERCHANT.replace(/\D/g, "");
  var btn = document.getElementById("bkash-copy-btn");
  _copyToClipboard(num, btn, "bKash number copied to clipboard");
}

function copyNagad() {
  var num = NAGAD_MERCHANT.replace(/\D/g, "");
  var btn = document.getElementById("nagad-copy-btn");
  _copyToClipboard(num, btn, "Nagad number copied to clipboard");
}

function _copyToClipboard(text, btn, successMsg) {
  function ok() {
    if (btn) { btn.textContent = "Copied"; btn.classList.add("copied"); setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1600); }
    toast(successMsg, "success");
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok).catch(function () { window.prompt("Copy:", text); });
  } else {
    window.prompt("Copy:", text);
  }
}

// ── Promo code ────────────────────────────────────────────
function applyPromo() {
  var input = document.getElementById("promo-input");
  var msg   = document.getElementById("promo-msg");
  var code  = (input.value || "").trim().toUpperCase();

  if (!code) {
    input.classList.add("err"); input.classList.remove("ok");
    msg.className = "promo-msg err"; msg.textContent = "Please enter a promo code.";
    return;
  }

  if (State.applyPromo(code)) {
    input.classList.remove("err"); input.classList.add("ok");
    msg.className = "promo-msg ok"; msg.textContent = "✓ Code applied — " + State.getPromo().pct + "% off!";
  } else {
    input.classList.add("err"); input.classList.remove("ok");
    msg.className = "promo-msg err"; msg.textContent = "✗ Invalid promo code.";
  }
  renderOrdMini();
  updatePaymentPanels();
}

// ── Place order ───────────────────────────────────────────
function placeOrder() {
  if (placingOrder) return;
  var cart = State.getCart();
  if (!cart.length) { toast("Your cart is empty.", "error"); closeCheckout(); return; }

  // Honeypot check
  var hp = document.getElementById("hp-website");
  if (hp && hp.value.trim() !== "") {
    // Bot detected — fake success
    console.warn("Order blocked: honeypot triggered");
    setTimeout(function () { onOrderSuccess("BOT-" + Date.now().toString().slice(-7)); }, 1200);
    return;
  }

  // Rate limit
  if (!checkOrderRateLimit()) {
    toast("Too many orders submitted. Please wait a while and try again.", "error");
    return;
  }

  // ── Live stock re-validation ──────────────────────────
  var outOfStock = [];
  cart.forEach(function (it) {
    if (it.pid === 6) return;
    var p = State.getProduct(it.pid);
    if (p && p.stock <= 0) outOfStock.push(it.name);
    else if (p && it.qty > p.stock) it.qty = p.stock;
  });
  if (outOfStock.length) {
    toast("Sold out: " + outOfStock.join(", ") + ". Removed from cart.", "error");
    State.setCart(cart.filter(function (i) {
      if (i.pid === 6) return true;
      var p = State.getProduct(i.pid);
      return p && p.stock > 0;
    }));
    updBadge(); renderCart();
    if (!State.getCart().length) closeCheckout();
    return;
  }

  // ── Collect form fields ───────────────────────────────
  var n  = document.getElementById("cn").value.trim();
  var p  = document.getElementById("cp").value.trim();
  var e  = document.getElementById("ce").value.trim();
  var a  = document.getElementById("ca").value.trim();
  var c  = document.getElementById("cc").value.trim();
  var di = document.getElementById("cdi") ? document.getElementById("cdi").value.trim() : "";
  var notes = document.getElementById("cn2") ? document.getElementById("cn2").value.trim() : "";

  // ── Required fields ───────────────────────────────────
  var ok = true, firstBad = null;
  ["cn", "cp", "ce", "ca", "cc"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el.value.trim()) { el.classList.add("err"); if (!firstBad) firstBad = el; ok = false; }
    else el.classList.remove("err");
  });
  if (!ok) { toast("Please fill all required fields (*)", "error"); if (firstBad) firstBad.focus(); return; }

  // ── Validate name ─────────────────────────────────────
  if (n.length < 2 || n.length > 80 || /<[^>]*>/.test(n)) {
    var ne = document.getElementById("cn"); ne.classList.add("err"); ne.focus();
    toast("Please enter a valid full name (2–80 characters)", "error"); return;
  }

  // ── Validate email ────────────────────────────────────
  var emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRe.test(e) || e.length > 120) {
    var ee = document.getElementById("ce"); ee.classList.add("err"); ee.focus();
    toast("Please enter a valid email address", "error"); return;
  }

  // ── Validate phone ────────────────────────────────────
  var digits = p.replace(/[\s\-()]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(digits)) {
    var pe = document.getElementById("cp"); pe.classList.add("err"); pe.focus();
    toast("Please enter a valid phone number (7–15 digits)", "error"); return;
  }

  // ── Validate address ──────────────────────────────────
  if (a.length < 5 || a.length > 200) {
    var ae = document.getElementById("ca"); ae.classList.add("err"); ae.focus();
    toast("Please enter a complete delivery address (at least 5 characters)", "error"); return;
  }

  // ── bKash / Nagad TrxID ───────────────────────────────
  var method    = State.getPayMethod();
  var bkashTrx  = "";
  var nagadTrx  = "";

  if (method === "bKash") {
    var trxEl = document.getElementById("bkash-trx");
    bkashTrx  = trxEl ? trxEl.value.trim().toUpperCase() : "";
    if (bkashTrx.length < 6 || bkashTrx.length > 20 || !/^[A-Z0-9]+$/.test(bkashTrx)) {
      if (trxEl) { trxEl.classList.add("err"); trxEl.focus(); }
      toast("Please enter your bKash Transaction ID", "error"); return;
    }
    if (trxEl) trxEl.classList.remove("err");
  }

  if (method === "Nagad") {
    var ntrxEl = document.getElementById("nagad-trx");
    nagadTrx   = ntrxEl ? ntrxEl.value.trim().toUpperCase() : "";
    if (nagadTrx.length < 6 || nagadTrx.length > 20 || !/^[A-Z0-9]+$/.test(nagadTrx)) {
      if (ntrxEl) { ntrxEl.classList.add("err"); ntrxEl.focus(); }
      toast("Please enter your Nagad Transaction ID", "error"); return;
    }
    if (ntrxEl) ntrxEl.classList.remove("err");
  }

  // ── Build order ID and date ───────────────────────────
  var oid       = "ASB-" + Date.now().toString().slice(-7);
  var orderDate = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka", dateStyle: "full", timeStyle: "short" });

  // ── Build items summary ───────────────────────────────
  var itemsList = "";
  cart.forEach(function (it) {
    itemsList += it.name + " (Size: " + it.sz + ") x" + it.qty + " = " +
                 (it.price ? "৳" + (it.price * it.qty).toLocaleString() : "Custom Quote") + "\n";
  });
  var del = State.getDeliveryFee(), disc = State.getDiscount(), promo = State.getPromo();
  itemsList += "—\nDelivery: " + (del === 0 ? "FREE" : "৳" + del) + "\n";
  if (disc > 0) itemsList += "Promo (" + promo.code + " " + promo.pct + "% off): −৳" + disc.toLocaleString() + "\n";
  itemsList += "GRAND TOTAL: ৳" + State.getGrandTotal().toLocaleString();

  // ── Template params for email ─────────────────────────
  var fullAddress = a + ", " + c + (di ? ", " + di : "");
  var payDesc = method +
    (bkashTrx ? " (TrxID: " + bkashTrx + ", sent to " + BKASH_MERCHANT + ")" : "") +
    (nagadTrx ? " (TrxID: " + nagadTrx + ", sent to " + NAGAD_MERCHANT + ")" : "");

  var templateParams = {
    order_id:         oid,
    customer_name:    n,
    customer_phone:   p,
    customer_email:   e,
    delivery_address: fullAddress,
    delivery_notes:   notes.slice(0, 500) || "None",
    items_list:       itemsList,
    total_amount:     "৳" + State.getGrandTotal().toLocaleString(),
    payment_method:   payDesc,
    bkash_trx_id:     bkashTrx || "N/A",
    bkash_merchant:   method === "bKash" ? BKASH_MERCHANT : "N/A",
    nagad_trx_id:     nagadTrx || "N/A",
    nagad_merchant:   method === "Nagad" ? NAGAD_MERCHANT : "N/A",
    order_date:       orderDate,
    to_email:         OWNER_EMAIL,
    reply_to:         e,
  };

  // ── Disable button + spinner ──────────────────────────
  placingOrder = true;
  var btn = document.getElementById("place-btn");
  btn.classList.add("loading");
  btn.disabled = true;

  function finishFail(msg) {
    placingOrder = false;
    btn.classList.remove("loading");
    btn.disabled = false;
    toast(msg || "Could not place order. Please try again.", "error");
  }

  // ── Send email then save order ────────────────────────
  API.sendEmail(templateParams)
    .then(function (result) {
      if (result.success) {
        // Save order to D1 (non-blocking — email is the primary confirmation)
        var apiItems = cart.map(function (it) {
          return { pid: it.pid, name: it.name, sz: it.sz, qty: it.qty, price: it.price };
        });
        API.createOrder({
          id:             oid,
          name:           n,
          phone:          p,
          email:          e,
          address:        fullAddress,
          items:          apiItems,
          total:          State.getGrandTotal(),
          payment_method: method,
          status:         "pending",
        }).catch(function (err) {
          console.warn("Order DB save failed (email still sent):", err);
        });
        onOrderSuccess(oid);
      } else {
        finishFail("Order could not be submitted. Please check your connection and try again.");
      }
    })
    .catch(function (err) {
      console.error("Email error:", err);
      finishFail("Order could not be submitted. Please check your connection and try again.");
    });
}

// ── Post-success cleanup ──────────────────────────────────
function onOrderSuccess(oid) {
  placingOrder = false;
  var btn = document.getElementById("place-btn");
  if (btn) { btn.classList.remove("loading"); btn.disabled = false; }

  closeCheckout();
  document.getElementById("ok-id").textContent = "Order ID: " + oid;
  document.getElementById("ok-modal").classList.add("open");

  // Clear cart + form
  State.clearCart();
  State.clearPromo();
  updBadge();
  renderCart();

  ["cn", "cp", "ce", "ca", "cc", "cdi", "cn2", "bkash-trx", "nagad-trx", "promo-input"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { el.value = ""; el.classList.remove("err", "ok"); }
  });
  var pm = document.getElementById("promo-msg");
  if (pm) { pm.textContent = ""; pm.className = "promo-msg"; }

  // Refresh stock from API
  API.fetchProducts()
    .then(function (data) {
      if (data && data.products) {
        data.products.forEach(function (ap) {
          var p = State.getProduct(ap.id);
          if (p && ap.stock !== undefined) p.stock = ap.stock;
        });
        refreshProductGrid();
      }
    })
    .catch(function () {});
}

function closeOK() {
  document.getElementById("ok-modal").classList.remove("open");
}

// ── Custom order shortcut ─────────────────────────────────
function openCustom() {
  State.setCart([{ cid: Date.now(), pid: 6, name: "Custom Design Order", price: 0, sz: "TBD", qty: 1, img: null }]);
  updBadge();
  openCheckout();
}

// ── Wire form submit ──────────────────────────────────────
(function () {
  var f = document.getElementById("co-form");
  if (f) f.addEventListener("submit", function (ev) { ev.preventDefault(); placeOrder(); });
})();

// ── Live clear error on input ─────────────────────────────
["cn", "cp", "ce", "ca", "cc", "bkash-trx", "nagad-trx"].forEach(function (id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener("input", function () { this.classList.remove("err"); });
});
