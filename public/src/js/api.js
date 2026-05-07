// ============================================================
//  ARCTIC SHOP BD — API Service  (Step 4 — auth-hardened)
//  All fetch() calls go through here.
//  Token is read from State on every call — never passed manually.
// ============================================================

var API = (function () {

  var BASE = "";  // same-origin Cloudflare Pages Functions

  // ── Internal helpers ──────────────────────────────────────

  function _headers(extra) {
    var h = Object.assign({ "Content-Type": "application/json" }, extra || {});
    var token = State.getToken();
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
  }

  function _handle(r) {
    if (r.status === 401) {
      State.clearSession();
      window.dispatchEvent(new CustomEvent("arctic:session-expired"));
      return r.json().then(function (b) { throw new Error(b.error || "Session expired"); });
    }
    if (r.status === 429) {
      return r.json().then(function (b) { throw new Error(b.error || "Too many requests. Please wait a moment."); });
    }
    if (!r.ok) {
      return r.json().then(function (b) { throw new Error(b.error || ("Request failed: " + r.status)); });
    }
    return r.json();
  }

  function _get(url) {
    return fetch(BASE + url, { headers: _headers() }).then(_handle);
  }

  function _post(url, body) {
    return fetch(BASE + url, {
      method: "POST", headers: _headers(), body: JSON.stringify(body),
    }).then(_handle);
  }

  function _put(url, body) {
    return fetch(BASE + url, {
      method: "PUT", headers: _headers(), body: JSON.stringify(body),
    }).then(_handle);
  }

  function _patch(url, body) {
    return fetch(BASE + url, {
      method: "PATCH", headers: _headers(), body: JSON.stringify(body),
    }).then(_handle);
  }

  function _delete(url) {
    return fetch(BASE + url, { method: "DELETE", headers: _headers() }).then(_handle);
  }

  // ── Public API ────────────────────────────────────────────

  return {

    // ── Products (public) ─────────────────────────────────────

    fetchProducts: function () { return _get("/api/products"); },

    fetchProduct: function (id) { return _get("/api/products/" + id); },

    // ── Orders ───────────────────────────────────────────────

    createOrder: function (orderData) { return _post("/api/orders", orderData); },

    // ── Email ────────────────────────────────────────────────

    sendEmail: function (params) { return _post("/api/send-email", { templateParams: params }); },

    // ── Auth ─────────────────────────────────────────────────

    register: function (name, email, password) {
      return _post("/api/auth/register", { name: name, email: email, password: password })
        .then(function (d) { if (d.token && d.user) State.setSession(d.token, d.user); return d; });
    },

    login: function (email, password) {
      return _post("/api/auth/login", { email: email, password: password })
        .then(function (d) { if (d.token && d.user) State.setSession(d.token, d.user); return d; });
    },

    logout: function () {
      fetch(BASE + "/api/auth/logout", { method: "POST", headers: _headers() }).catch(function () {});
      State.clearSession();
    },

    adminLogin: function (password) { return _post("/api/auth/admin-login", { password: password }); },

    // ── AI Chat ──────────────────────────────────────────────

    chat: function (message, history, context) {
      return fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, history: history, context: context }),
      }).then(function (r) { if (!r.ok) throw new Error("Chat error: " + r.status); return r.json(); });
    },

    // ── Admin ─────────────────────────────────────────────────

    fetchOrders:       function ()       { return _get("/api/orders"); },
    createProduct:     function (data)   { return _post("/api/products", data); },
    updateProduct:     function (id, d)  { return _put("/api/products/" + id, d); },
    deleteProduct:     function (id)     { return _delete("/api/products/" + id); },
    updateOrderStatus: function (id, st) { return _patch("/api/orders/" + id, { status: st }); },
    fetchAnalytics:    function ()       { return _get("/api/admin/analytics"); },

  };

})();
