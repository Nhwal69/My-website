// ============================================================
//  ARCTIC SHOP BD — Site Configuration
//  All store settings live here. Edit this file only.
// ============================================================

var SITE_CONFIG = {

  // ── Store Info ────────────────────────────────────────────
  store: {
    name:     "Arctic Shop BD",
    tagline:  "We Make Perfect",
    currency: "৳",
    whatsapp: "8801925838830",
    facebook: "https://facebook.com/ArcticShopBD",
    instagram: "https://instagram.com/arcticshopbd",
  },

  // ── Email (server-side via /api/send-email) ───────────────
  emailjs: {
    ownerEmail: "obbhack6@gmail.com",
  },

  // ── Payment Numbers ───────────────────────────────────────
  payment: {
    bkash: {
      number:      "01712-345678",
      accountType: "Personal",
    },
    nagad: {
      number:      "01925-838830",
      accountType: "Personal",
    },
  },

  // ── Delivery Rules ────────────────────────────────────────
  delivery: {
    freeThreshold: 1000,   // free delivery above this subtotal
    flatFee:       80,     // fee when below threshold
  },

  // ── Promo Codes ───────────────────────────────────────────
  // key: code string, value: discount percentage
  promoCodes: {
    "WELCOME10": 10,
    "ARCTIC10":  10,
  },

  // ── Social Proof Notifications ────────────────────────────
  socialProof: {
    names:   ["Tanzil", "Ashik", "Jidan", "Farhan", "Nafi", "Rafi", "Siam", "Zara", "Mitu", "Rana"],
    cities:  ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Comilla", "Mymensingh"],
    actions: ["just ordered", "just bought", "purchased", "added to cart"],
  },

  // ── Products (fallback if API fails) ─────────────────────
  // These are the rich display fields. Stock & price are always
  // overwritten from the live /api/products response.
  products: [
    {
      id: 1,
      name: "Losted Tee",
      ed:   "Arctic Drop // Season 01",
      price: 650,
      badge: "new", bl: "NEW",
      tags:  ["black"],
      stock: 10,
      desc:  "Astronaut drifting through a cosmic purple nebula with gothic Losted typography. Oversized unisex cut on 180gsm ring-spun cotton, high-opacity DTG print. Made in Dhaka.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Oversized unisex cut",
        print:  "High-opacity DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      "/images/losted.jpg",
      images:   ["/images/losted.jpg"],
      type:     "regular",
      aboutImg: true,
    },
    {
      id: 2,
      name: "Sweet Venom Tee",
      ed:   "Arctic Drop // Season 01",
      price: 650,
      badge: null, bl: "",
      tags:  ["white"],
      stock: 8,
      desc:  "Dark butterfly on crisp white cotton — deceptive beauty rendered with precision DTG. Oversized unisex cut, 180gsm ring-spun cotton. Made in Dhaka.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Oversized unisex cut",
        print:  "High-opacity DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      "/images/sweetvenom.jpg",
      images:   ["/images/sweetvenom.jpg"],
      type:     "regular",
      aboutImg: true,
    },
    {
      id: 3,
      name: "Wave Tee",
      ed:   "Arctic Drop // Season 01",
      price: 650,
      badge: null, bl: "",
      tags:  ["black"],
      stock: 6,
      desc:  "Hokusai's Great Wave reimagined for Dhaka streets, bold Japanese kanji beneath the crest. Full-chest DTG print on 180gsm ring-spun cotton, oversized unisex cut.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Oversized unisex cut",
        print:  "High-opacity DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      "/images/wave.jpg",
      images:   ["/images/wave.jpg"],
      type:     "regular",
      aboutImg: false,
    },
    {
      id: 4,
      name: "Pretty Tee",
      ed:   "Arctic Drop // Limited Edition",
      price: 700,
      badge: "ltd", bl: "LIMITED",
      tags:  ["black", "limited"],
      stock: 3,
      desc:  "Limited-edition dual-sided print: blood-red PRETTY on the front, distressed dripping text over a cinematic eye on the back. 180gsm ring-spun cotton, oversized unisex cut.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Oversized unisex cut",
        print:  "Dual-sided DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      "/images/pretty.jpg",
      images:   ["/images/pretty.jpg"],
      type:     "regular",
      aboutImg: false,
    },
    {
      id: 5,
      name: "Paranoia Tee",
      ed:   "Arctic Drop // Season 01",
      price: 700,
      badge: "hot", bl: "HOT",
      tags:  ["black"],
      stock: 5,
      desc:  "Cinematic vintage photograph printed large-format on premium black cotton — aged, grainy, unforgettable. 180gsm ring-spun cotton, oversized unisex cut. Made in Dhaka.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Oversized unisex cut",
        print:  "Large-format DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      "/images/paranoia.jpg",
      images:   ["/images/paranoia.jpg"],
      type:     "regular",
      aboutImg: false,
    },
    {
      id: 6,
      name: "Custom Design Order",
      ed:   "Made to Order",
      price: 0,
      badge: null, bl: "",
      tags:  ["custom"],
      stock: 999,
      desc:  "Your idea, our craft. Send us your design concept — we handle the rest. Minimum 1 piece, 5–7 day turnaround. No setup fee.",
      descDetails: {
        fabric: "180gsm ring-spun cotton",
        fit:    "Your choice",
        print:  "High-opacity DTG print",
        wash:   "Machine wash cold, inside out",
        origin: "Made in Dhaka, Bangladesh",
      },
      img:      null,
      images:   [],
      type:     "custom",
      aboutImg: false,
    },
  ],
};

// ── AI Chat Worker URL ────────────────────────────────────
// Replace with your deployed Cloudflare Worker URL
var CLOUDFLARE_WORKER_URL = "https://arctic-chat.mehedinihal89.workers.dev";

// ── Shorthand aliases used throughout the codebase ────────
var PROMO_CODES     = SITE_CONFIG.promoCodes;
var OWNER_EMAIL     = SITE_CONFIG.emailjs.ownerEmail;
var BKASH_MERCHANT  = SITE_CONFIG.payment.bkash.number;
var NAGAD_MERCHANT  = SITE_CONFIG.payment.nagad.number;

// ── Filter label map ──────────────────────────────────────
var FILTER_LABELS = {
  "all":     "All",
  "black":   "Black Tees",
  "white":   "White Tees",
  "limited": "Limited",
  "custom":  "Custom",
};
