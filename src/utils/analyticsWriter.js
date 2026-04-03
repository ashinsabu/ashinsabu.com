// Analytics RTDB write path — fire-and-forget, lazy-loaded, never blocks the page.
//
// Public key (ov/pubkey) is fetched from RTDB once and cached in module scope.
// Each event is encrypted with ECDH+AES-GCM before writing to an/s/<uuid>.
// The private key never touches this module — only Studio can read the data back.
//
// Session UUID is generated once per page load (not persisted — reloads start
// a new session, which is intentional for behavior tracking accuracy).

import { encryptPayload, importPublicKeyJwk } from './analyticsEncrypt.js';

let _db = null;
let _pubKey = null;
let _initPromise = null;

// One UUID per page load. Not in sessionStorage — a reload is a new session.
const SESSION_ID = crypto.randomUUID();
let _sessionContextSent = false;

async function init() {
  try {
    const [fireMod, dbMod] = await Promise.all([
      import('../firebase'),
      import('firebase/database'),
    ]);
    _db = dbMod.getDatabase(fireMod.app);
    const snap = await dbMod.get(dbMod.ref(_db, 's/pubkey'));
    if (!snap.exists()) return false;
    _pubKey = await importPublicKeyJwk(snap.val());
    return true;
  } catch {
    return false;
  }
}

function getSessionContext() {
  const ua = navigator.userAgent;

  const dev =
    window.innerWidth < 768 ? 'mobile' :
    window.innerWidth < 1024 ? 'tablet' : 'desktop';

  const br =
    /edg\//i.test(ua)     ? 'edge' :
    /chrome\//i.test(ua)  ? 'chrome' :
    /firefox\//i.test(ua) ? 'firefox' :
    /safari\//i.test(ua)  ? 'safari' : 'other';

  const os =
    /android/i.test(ua)       ? 'android' :
    /iphone|ipad|ipod/i.test(ua) ? 'ios' :
    /macintosh/i.test(ua)     ? 'mac' :
    /windows/i.test(ua)       ? 'windows' :
    /linux/i.test(ua)         ? 'linux' : 'other';

  const rawRef = document.referrer;
  const ref =
    !rawRef ? 'direct' :
    /google\./i.test(rawRef)              ? 'google' :
    /bing\./i.test(rawRef)                ? 'bing' :
    /duckduckgo\.com/i.test(rawRef)       ? 'duckduckgo' :
    /instagram\.com|l\.instagram\.com/i.test(rawRef) ? 'instagram' :
    /twitter\.com|x\.com|t\.co/i.test(rawRef)        ? 'twitter' :
    /linkedin\.com|lnkd\.in/i.test(rawRef)           ? 'linkedin' :
    /github\.com/i.test(rawRef)           ? 'github' :
    /medium\.com/i.test(rawRef)           ? 'medium' :
    (() => {
      try { return `o:${new URL(rawRef).hostname}`; } catch { return 'other'; }
    })();

  const params = new URLSearchParams(window.location.search);
  const utm = params.get('utm_source');

  return {
    dev, br, os, ref,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
    entry: window.location.pathname,
    ...(utm ? { utm } : {}),
  };
}

export async function writeAnalyticsEvent(eventCode, eventData = {}) {
  // Never track Studio activity — keep analytics clean
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/studio')) return;

  try {
    // Lazily initialise once; subsequent calls reuse the cached promise result
    const ready = await (_initPromise ??= init());
    if (!ready) return;

    const payload = {
      v: 1,
      sid: SESSION_ID,
      ts: Date.now(),
      e: eventCode,
      ...(!_sessionContextSent ? getSessionContext() : {}),
      ...eventData,
    };
    _sessionContextSent = true;

    const blob = await encryptPayload(payload, _pubKey);

    const { ref, push } = await import('firebase/database');
    // Intentionally not awaited — fire and forget
    push(ref(_db, 'an/s'), blob).catch(() => {});
  } catch {
    // Silent fail — analytics must never surface errors to the user
  }
}
