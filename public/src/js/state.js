// ============================================================
//  ARCTIC SHOP BD — Global State Store
//  Single source of truth for all runtime data.
//  Never access localStorage/sessionStorage directly elsewhere.
// ============================================================

var State = (function () {

  // ── Private storage ──────────────────────────────────────

  // Products: starts as config fallback, overwritten by API
  var _products = SITE_CONFIG.products.slice();

  // Cart: persisted in sessionStorage
  var _cart = [];
  try { _cart = JSON.parse(sessionStorage.getItem("arcbd_cart") || "[]"); } catch (e) { _cart = []; }

  // Wishlist: persisted in localStorage
  var _wishlist = [];
  try { _wishlist = JSON.parse(localStorage.getItem("arcbd_wishlist") || "[]"); } catch (e) { _wishlist = []; }

  // Session: token + user stored in sessionStorage (cleared on tab close)
  var _session = null;
  try {
    var _raw = sessionStorage.getItem("arcbd_session");
    if (_raw) _session = JSON.parse(_raw);
  } catch (e) { _session = null; }

  // UI state
  var _selectedPayMethod = "bKash";
  var _activePromo       = null;   // { code, pct } or null
  var _modalProductId    = null;
  var _modalSize         = "L";
  var _modalQty          = 1;

  // ── Persist helpers ───────────────────────────────────────

  function _saveCart() {
    try { sessionStorage.setItem("arcbd_cart", JSON.stringify(_cart)); } catch (e) {}
  }

  function _saveWishlist() {
    try { localStorage.setItem("arcbd_wishlist", JSON.stringify(_wishlist)); } catch (e) {}
  }

  function _saveSession() {
    try {
      if (_session) sessionStorage.setItem("arcbd_session", JSON.stringify(_session));
      else sessionStorage.removeItem("arcbd_session");
    } catch (e) {}
  }

  // ── Public API ────────────────────────────────────────────

  return {

    // ── Products ────────────────────────────────────────────

    getProducts: function () { return _products; },

    setProducts: function (list) { _products = list; },

    getProduct: function (id) {
      return _products.find(function (p) { return p.id === id; }) || null;
    },

    // ── Cart ────────────────────────────────────────────────

    getCart: function () { return _cart; },

    getCartTotal: function () {
      return _cart.reduce(function (s, i) { return s + (i.price * i.qty); }, 0);
    },

    getCartCount: function () {
      return _cart.reduce(function (s, i) { return s + i.qty; }, 0);
    },

    getDeliveryFee: function () {
      var total = this.getCartTotal();
      if (total === 0) return 0;
      return total >= SITE_CONFIG.delivery.freeThreshold ? 0 : SITE_CONFIG.delivery.flatFee;
    },

    getDiscount: function () {
      if (!_activePromo) return 0;
      return Math.round(this.getCartTotal() * _activePromo.pct / 100);
    },

    getGrandTotal: function () {
      return this.getCartTotal() + this.getDeliveryFee() - this.getDiscount();
    },

    addToCart: function (pid, size, qty) {
      var p = this.getProduct(pid);
      if (!p) return false;
      if (p.stock <= 0 && p.type !== "custom") return "out_of_stock";

      var existing = _cart.find(function (i) { return i.pid === pid && i.sz === size; });
      if (existing) {
        existing.qty += qty;
      } else {
        _cart.push({
          cid:   Date.now(),
          pid:   p.id,
          name:  p.name,
          price: p.price,
          sz:    size,
          qty:   qty,
          img:   p.img || null,
        });
      }
      _saveCart();
      return true;
    },

    removeFromCart: function (cid) {
      _cart = _cart.filter(function (i) { return i.cid !== cid; });
      _saveCart();
    },

    updateCartQty: function (cid, delta) {
      var item = _cart.find(function (i) { return i.cid === cid; });
      if (!item) return false;

      if (delta > 0 && item.pid !== 6) {
        var prod = this.getProduct(item.pid);
        if (prod && (item.qty + delta) > prod.stock) return "exceeds_stock";
      }
      item.qty = Math.max(1, item.qty + delta);
      _saveCart();
      return true;
    },

    clearCart: function () {
      _cart = [];
      _saveCart();
    },

    setCart: function (items) {
      _cart = items;
      _saveCart();
    },

    // ── Wishlist ─────────────────────────────────────────────

    getWishlist: function () { return _wishlist; },

    addToWishlist: function (pid) {
      var p = this.getProduct(pid);
      if (!p) return false;
      if (_wishlist.find(function (w) { return w.pid === pid; })) return "already_in";
      _wishlist.push({ pid: p.id, name: p.name, price: p.price, img: p.img });
      _saveWishlist();
      return true;
    },

    removeFromWishlist: function (pid) {
      _wishlist = _wishlist.filter(function (w) { return w.pid !== pid; });
      _saveWishlist();
    },

    // ── Session / Auth ───────────────────────────────────────

    getSession: function () { return _session; },

    getToken: function () { return _session ? _session.token : null; },

    getUser: function () { return _session ? _session.user : null; },

    isLoggedIn: function () { return !!(_session && _session.token); },

    setSession: function (token, user) {
      _session = { token: token, user: user, at: Date.now() };
      _saveSession();
    },

    clearSession: function () {
      _session = null;
      _saveSession();
    },

    // ── Promo ────────────────────────────────────────────────

    getPromo: function () { return _activePromo; },

    applyPromo: function (code) {
      var pct = PROMO_CODES[code.trim().toUpperCase()];
      if (pct !== undefined) {
        _activePromo = { code: code.toUpperCase(), pct: pct };
        return true;
      }
      _activePromo = null;
      return false;
    },

    clearPromo: function () { _activePromo = null; },

    // ── Payment Method ───────────────────────────────────────

    getPayMethod: function ()        { return _selectedPayMethod; },
    setPayMethod: function (method)  { _selectedPayMethod = method; },

    // ── Modal Product State ──────────────────────────────────

    getModalState: function () {
      return { pid: _modalProductId, size: _modalSize, qty: _modalQty };
    },

    setModalProduct: function (pid) {
      _modalProductId = pid;
      _modalSize = "L";
      _modalQty  = 1;
    },

    setModalSize: function (s)  { _modalSize = s; },
    setModalQty:  function (q)  { _modalQty  = Math.max(1, q); },
    changeModalQty: function (delta) { _modalQty = Math.max(1, _modalQty + delta); },

  };

})();
