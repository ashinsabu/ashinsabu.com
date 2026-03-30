// Studio auth — PBKDF2-based password hashing, session + rate-limit management.
// Nothing from this file is imported by the main site.

const SALT = 'ashinsabu_studio_v1';
const ITERATIONS = 100_000;
const HASH_BITS = 256;

const SESSION_KEY = 'studio_session';
const LOCKOUT_KEY = 'studio_lockout';
const ATTEMPTS_KEY = 'studio_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function hashPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  );
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isLockedOut() {
  const until = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || '0', 10);
  return Date.now() < until;
}

export function getLockoutRemaining() {
  const until = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || '0', 10);
  return Math.max(0, until - Date.now());
}

// Returns how many attempts have been recorded (before lockout triggers)
export function recordFailedAttempt() {
  const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    sessionStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    sessionStorage.removeItem(ATTEMPTS_KEY);
  } else {
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
  }
  return attempts;
}

export function clearAttempts() {
  sessionStorage.removeItem(ATTEMPTS_KEY);
  sessionStorage.removeItem(LOCKOUT_KEY);
}

export function saveSession(hash) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ hash, expires: Date.now() + SESSION_MS }),
  );
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { hash, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return hash;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
