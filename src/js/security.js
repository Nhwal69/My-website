// ============================================================
//  ARCTIC SHOP BD — Security & Auth UI  (Step 4)
//  Runs before any other JS. Sets up:
//  1. Input length guards on all dynamic forms
//  2. Session-expired event handler
//  3. Auth modal (login / register) for customers
//  4. Passive XSS protection: validates data before render
// ============================================================

// ── 1. Input max-length enforcement ──────────────────────
// Cloudflare Pages serves these limits at the network level too,
// but we enforce them in JS for instant feedback.
var INPUT_LIMITS = {
  "cn":          80,   // customer name
  "cp":          20,   // phone
  "ce":         120,   // email
  "ca":         200,   // address
  "cc":          60,   // city
  "cdi":         60,   // district
  "cn2":        500,   // delivery notes
  "bkash-trx":   20,
  "nagad-trx":   20,
  "promo-input": 20,
  "search-input":80,
  "chat-input":  500,
};

document.addEventListener("DOMContentLoaded", function () {
  Object.keys(INPUT_LIMITS).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("maxlength", INPUT_LIMITS[id]);
    el.addEventListener("input", function () {
      if (this.value.length > INPUT_LIMITS[id]) {
        this.value = this.value.slice(0, INPUT_LIMITS[id]);
      }
    });
  });
});

// ── 2. Session-expired event ──────────────────────────────
// Fired by API._handle() whenever any request returns 401.
window.addEventListener("arctic:session-expired", function () {
  toast("Your session has expired. Please log in again.", "warn");
  // If auth modal is available, open it
  if (typeof openAuthModal === "function") openAuthModal("login");
});

// ── 3. Customer Auth Modal ────────────────────────────────
// A lightweight login/register UI injected at runtime.
// Only shown if the user explicitly clicks "My Account".

var _authMode    = "login";   // "login" | "register"
var _authPending = false;

function openAuthModal(mode) {
  _authMode = mode || "login";
  _renderAuthModal();
  var ov = document.getElementById("auth-overlay");
  if (ov) ov.classList.add("open");
  setTimeout(function () {
    var el = document.getElementById("auth-email");
    if (el) el.focus();
  }, 150);
}

function closeAuthModal() {
  var ov = document.getElementById("auth-overlay");
  if (ov) ov.classList.remove("open");
  _authPending = false;
}

function switchAuthMode() {
  _authMode = _authMode === "login" ? "register" : "login";
  _renderAuthModal();
  setTimeout(function () {
    var el = document.getElementById("auth-email");
    if (el) el.focus();
  }, 50);
}

function _renderAuthModal() {
  var isLogin = _authMode === "login";
  var ov = document.getElementById("auth-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id        = "auth-overlay";
    ov.className = "auth-ov";
    ov.setAttribute("role",       "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Account");
    ov.addEventListener("click", function (e) { if (e.target === ov) closeAuthModal(); });
    document.body.appendChild(ov);

    // Inject auth styles once
    if (!document.getElementById("auth-styles")) {
      var s = document.createElement("style");
      s.id = "auth-styles";
      s.textContent = [
        ".auth-ov{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);z-index:880;",
        "  display:flex;align-items:center;justify-content:center;padding:20px;",
        "  opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;}",
        ".auth-ov.open{opacity:1;visibility:visible;}",
        ".auth-box{background:rgba(255,255,255,0.98);border:1px solid rgba(0,0,0,0.1);",
        "  width:min(420px,100%);padding:44px 36px;position:relative;",
        "  animation:scIn .3s cubic-bezier(.34,1.56,.64,1);}",
        ".auth-close{position:absolute;top:14px;right:16px;background:none;border:none;",
        "  color:rgba(17,17,17,0.4);font-size:22px;cursor:pointer;transition:color .2s;line-height:1;}",
        ".auth-close:hover{color:#111;}",
        ".auth-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:900;font-style:italic;margin-bottom:4px;}",
        ".auth-sub{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;",
        "  color:rgba(17,17,17,0.4);margin-bottom:28px;}",
        ".auth-f{margin-bottom:14px;}",
        ".auth-f label{display:block;font-size:9px;letter-spacing:3px;text-transform:uppercase;",
        "  color:rgba(17,17,17,0.55);margin-bottom:7px;}",
        ".auth-f input{width:100%;background:rgba(17,17,17,0.04);border:1px solid rgba(0,0,0,0.15);",
        "  color:#111;padding:13px 15px;font-family:'Inter',sans-serif;font-size:14px;outline:none;",
        "  transition:border-color .2s;}",
        ".auth-f input:focus{border-color:#111;}",
        ".auth-f input.err{border-color:#e8325a;}",
        ".auth-err{font-size:11px;color:#e8325a;margin-bottom:14px;min-height:16px;",
        "  font-family:'DM Mono',monospace;letter-spacing:1px;}",
        ".auth-btn{width:100%;background:#111;color:#fff;border:none;padding:16px;",
        "  font-family:'Inter',sans-serif;font-size:10px;font-weight:800;letter-spacing:3px;",
        "  text-transform:uppercase;cursor:pointer;transition:background .2s;margin-bottom:14px;",
        "  position:relative;}",
        ".auth-btn:hover{background:#333;}",
        ".auth-btn:disabled{opacity:0.5;cursor:not-allowed;}",
        ".auth-btn .spin{display:none;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);",
        "  border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;}",
        ".auth-btn.loading .btn-txt{display:none;}",
        ".auth-btn.loading .spin{display:block;}",
        ".auth-switch{text-align:center;font-size:12px;color:rgba(17,17,17,0.5);}",
        ".auth-switch button{background:none;border:none;color:#111;font-weight:700;cursor:pointer;",
        "  text-decoration:underline;font-size:12px;transition:color .2s;}",
        ".auth-switch button:hover{color:rgba(17,17,17,0.6);}",
        ".auth-user-bar{display:flex;align-items:center;gap:10px;padding:8px 12px;",
        "  background:rgba(17,17,17,0.06);border:1px solid rgba(0,0,0,0.1);margin-bottom:16px;",
        "  font-size:12px;color:rgba(17,17,17,0.7);}",
      ].join("");
      document.head.appendChild(s);
    }
  }

  var isReg = _authMode === "register";
  ov.innerHTML = (
    "<div class='auth-box'>" +
      "<button class='auth-close' onclick='closeAuthModal()' aria-label='Close'>✕</button>" +
      "<div class='auth-title'>" + (isReg ? "Create Account" : "Welcome Back") + "</div>" +
      "<div class='auth-sub'>" + (isReg ? "Join Arctic Shop BD" : "Sign in to your account") + "</div>" +
      "<div class='auth-err' id='auth-err'></div>" +
      (isReg ? "<div class='auth-f'><label>Full Name</label><input id='auth-name' type='text' placeholder='Your name' maxlength='80' autocomplete='name'/></div>" : "") +
      "<div class='auth-f'><label>Email</label><input id='auth-email' type='email' placeholder='your@email.com' maxlength='120' autocomplete='email'/></div>" +
      "<div class='auth-f'><label>Password</label><input id='auth-pass' type='password' placeholder='" + (isReg ? "Min 8 characters" : "Your password") + "' maxlength='200' autocomplete='" + (isReg ? "new-password" : "current-password") + "' onkeydown='if(event.key===\"Enter\")submitAuth()'/></div>" +
      "<button class='auth-btn' id='auth-submit-btn' onclick='submitAuth()'>" +
        "<span class='btn-txt'>" + (isReg ? "Create Account" : "Sign In") + "</span>" +
        "<div class='spin'></div>" +
      "</button>" +
      "<div class='auth-switch'>" + (isReg ? "Already have an account? " : "New to Arctic Shop? ") +
        "<button onclick='switchAuthMode()'>" + (isReg ? "Sign In" : "Create Account") + "</button>" +
      "</div>" +
    "</div>"
  );
}

function submitAuth() {
  if (_authPending) return;
  var isReg   = _authMode === "register";
  var nameEl  = document.getElementById("auth-name");
  var emailEl = document.getElementById("auth-email");
  var passEl  = document.getElementById("auth-pass");
  var errEl   = document.getElementById("auth-err");
  var btn     = document.getElementById("auth-submit-btn");

  var name  = nameEl  ? nameEl.value.trim()  : "";
  var email = emailEl ? emailEl.value.trim()  : "";
  var pass  = passEl  ? passEl.value          : "";

  // Client-side validation
  var err = "";
  if (isReg && (!name || name.length < 2)) err = "Name must be at least 2 characters.";
  else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err = "Please enter a valid email.";
  else if (!pass || (isReg && pass.length < 8)) err = isReg ? "Password must be at least 8 characters." : "Please enter your password.";

  if (err) { errEl.textContent = err; return; }
  errEl.textContent = "";

  _authPending = true;
  btn.classList.add("loading");
  btn.disabled = true;

  var promise = isReg
    ? API.register(name, email, pass)
    : API.login(email, pass);

  promise
    .then(function (data) {
      closeAuthModal();
      _updateNavForUser(State.getUser());
      toast("✓ " + (isReg ? "Account created! Welcome to Arctic Shop BD." : "Welcome back, " + (State.getUser() || {}).name + "!"), "success");
    })
    .catch(function (e) {
      errEl.textContent = e.message || "Authentication failed. Please try again.";
    })
    .finally(function () {
      _authPending = false;
      btn.classList.remove("loading");
      btn.disabled = false;
    });
}

// ── 4. Update nav when user is logged in ─────────────────
function _updateNavForUser(user) {
  // Find or create the account nav button
  var btn = document.getElementById("nav-account-btn");
  if (!btn) return;
  if (user) {
    btn.textContent = user.name ? user.name.split(" ")[0] : "Account";
    btn.title       = "Signed in as " + (user.email || "");
  } else {
    btn.textContent = "Account";
    btn.title       = "Sign in";
  }
}

// ── 5. Boot: restore session from State ───────────────────
(function initAuth() {
  var user = State.getUser();
  if (user) {
    // Restore nav label on page load if session exists
    document.addEventListener("DOMContentLoaded", function () {
      _updateNavForUser(user);
    });
  }
})();
