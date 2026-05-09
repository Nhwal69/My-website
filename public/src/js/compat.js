// ============================================================
//  ARCTIC SHOP BD — Compatibility Shims
//  Maps og HTML onclick= names → refactored function names.
//  Keeps index.html untouched while JS is split into modules.
// ============================================================

// ── Cart ─────────────────────────────────────────────────────
function addToCart(pid, sz, qty) {
  var result = State.addToCart(pid, sz || 'L', qty || 1);
  var p = State.getProduct(pid);
  if (!p) return;
  if (result === 'out_of_stock') { toast('Sorry, this item is out of stock!', 'error'); return; }
  updBadge();
  renderCart();
  toast('\u2713 ' + p.name + ' (' + (sz || 'L') + ') added to cart', 'success');
}
function rmItem(cid)    { removeCartItem(cid); }
function updQty(cid, d) { changeCartQty(cid, d); }

// ── Modal ─────────────────────────────────────────────────────
function selSz(s, el)   { selModalSize(s, el); }
function addFrMod()     { addFromModal(); }
function chQty(d)       { changeModalQty(d); }

// ── Product filters ───────────────────────────────────────────
function fp(f, btn)     { filterProducts(f, btn); }

// ── Chat ──────────────────────────────────────────────────────
function toggleChat()   { togChat(); }
function sendQuick(t)   { sendChatQuick(t); }
