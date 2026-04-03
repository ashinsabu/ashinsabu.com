// ── RTDB structure ────────────────────────────────────────────────────────────
//
// Auth / crypto  (path: s/)
//   s/h        string          password hash (write-once)
//   s/d        string          delete token hash (write-once, NOT readable)
//   s/pk       { data, iv }    ECDH private key wrapped with PBKDF2-AES-GCM (write-once)
//   s/pubkey   JWK             ECDH P-256 public key (write-once)
//
// Overrides  (path: ov/)
//   ov/_a          string   password hash (write auth guard)
//   ov/data        object   { hero_role, hero_bio, about_p1, about_p2, creative_bio, resume_label }
//   ov/resume_b64  string   base64-encoded PDF (fetched on demand, never on page load)
//
// Analytics  (path: an/)
//   an/_a          string   ephemeral delete auth token (written + immediately cleared)
//   an/s/<uuid>    object   encrypted blob: { pub: JWK, ct: string, iv: string, v: number }
//
// Decrypted blob payload — base fields (always present):
//   v:     number   schema version (currently 1)
//   sid:   string   session UUID — new per page load, never persisted
//   ts:    number   unix ms timestamp
//   e:     string   event code (see EV below)
//
// Session context — only on the first event per sid:
//   dev:   'mobile' | 'tablet' | 'desktop'
//   br:    'chrome' | 'firefox' | 'safari' | 'edge' | 'other'
//   os:    'android' | 'ios' | 'mac' | 'windows' | 'linux' | 'other'
//   ref:   string   referrer — named value ('google', 'linkedin', 'twitter'…) or 'o:hostname'
//   tz:    string   IANA timezone e.g. 'America/New_York'
//   lang:  string   browser language e.g. 'en-US'
//   entry: string   entry pathname e.g. '/'
//   utm?:  string   utm_source query param if present
//
// Per-event fields — see ev builders below for the canonical field list per code.

// ── Event codes ───────────────────────────────────────────────────────────────
// Keep 2 chars to minimise encrypted payload size.

export const EV = {
  LINK_CLICK:     'lc',
  SECTION_VIEW:   'sv',
  SECTION_DWELL:  'sd',
  PROJECT_EXPAND: 'pe',
  RESUME_VIEW:    'rv',
  THEME_TOGGLE:   'tt',
  EXIT:           'ex',
};

// ── Payload builders ──────────────────────────────────────────────────────────
// Single source of truth for per-event field names.
// Pass the return value directly to writeAnalyticsEvent(EV.X, ev.x(...)).
//
// Adding a new event:
//   1. Add a key to EV above
//   2. Add a builder here
//   3. Add a trackXxx export in analytics.js
//   4. Add aggregation + render in AnalyticsPanel.jsx aggregate()

export const ev = {
  linkClick:     (lt, dst, ctx)  => ({ lt, dst, ...(ctx ? { ctx } : {}) }),
  sectionView:   (sec)           => ({ sec }),
  sectionDwell:  (sec, dwell)    => ({ sec, dwell }),
  projectExpand: (pid)           => ({ pid }),
  resumeView:    (ctx)           => ({ ...(ctx ? { ctx } : {}) }),
  themeToggle:   (to)            => ({ to }),
  exit:          (scroll, dur)   => ({ scroll, dur }),
};
