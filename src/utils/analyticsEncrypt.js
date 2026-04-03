// ECDH (P-256) + AES-GCM hybrid encryption for analytics events.
//
// Write path (public site):
//   encryptPayload(payload, recipientPublicKey) → opaque blob written to RTDB
//
// Read path (Studio only):
//   decryptPayload(blob, privateKey) → { ok, payload } or { ok: false, reason }
//
// reason: 'crypto'  → AES-GCM auth tag failed = was NOT encrypted with our key
//                      = safe to delete (fake/garbage blob)
// reason: 'schema'  → decrypted fine but payload structure unexpected
//                      = DO NOT delete (could be version mismatch or bug)
//
// Private key wrapping:
//   A separate AES-256-GCM key is derived from the Studio password (different
//   PBKDF2 salt from the auth hash — key separation). This wrapping key encrypts
//   the ECDH private key. Both the wrapped key and the public key JWK are stored
//   in RTDB ov/pk and ov/pubkey respectively.

const SCHEMA_VERSION = 1;

// Different salt from studioAuth.js ('ashinsabu_studio_v1') — must never be the same
const WRAP_SALT = 'ashinsabu_analytics_wrap_v1';

// ── Wrapping key (AES-GCM, derived from Studio password) ────────────────────

export async function deriveWrappingKey(password, extractable = false) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(WRAP_SALT), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    extractable, // extractable=true when we need to cache in sessionStorage
    ['encrypt', 'decrypt'],
  );
}

export async function exportWrappingKeyJwk(wrappingKey) {
  return crypto.subtle.exportKey('jwk', wrappingKey);
}

export async function importWrappingKeyJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk', jwk, { name: 'AES-GCM' }, false, ['decrypt'],
  );
}

// ── ECDH keypair ─────────────────────────────────────────────────────────────

export async function generateAnalyticsKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'],
  );
}

export async function exportPublicKeyJwk(publicKey) {
  return crypto.subtle.exportKey('jwk', publicKey);
}

export async function importPublicKeyJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
}

// ── Private key wrap / unwrap ────────────────────────────────────────────────

export async function wrapPrivateKey(privateKey, wrappingKey) {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, pkcs8);
  return { data: u8ToB64(new Uint8Array(wrapped)), iv: u8ToB64(iv) };
}

export async function unwrapPrivateKey(wrappedObj, wrappingKey) {
  // Throws if wrappingKey is wrong — caller handles this gracefully
  const iv = b64ToU8(wrappedObj.iv);
  const wrapped = b64ToU8(wrappedObj.data);
  const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, wrapped);
  return crypto.subtle.importKey(
    'pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'],
  );
}

// ── Encrypt (used in analytics writer on public site) ───────────────────────

export async function encryptPayload(payload, recipientPublicKey) {
  // Ephemeral keypair — new one per event, never reused
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'],
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
  const ephPubJwk = await crypto.subtle.exportKey('jwk', ephemeral.publicKey);
  return {
    pub: ephPubJwk,
    ct: u8ToB64(new Uint8Array(ciphertext)),
    iv: u8ToB64(iv),
    v: SCHEMA_VERSION,
  };
}

// ── Decrypt (used in Studio only) ────────────────────────────────────────────
//
// Returns one of:
//   { ok: true,  payload: object }
//   { ok: false, reason: 'crypto' }   ← blob is fake / garbage → safe to delete
//   { ok: false, reason: 'schema' }   ← blob decrypted but unexpected structure
//                                        → DO NOT delete (may be future/past version)

export async function decryptPayload(blob, privateKey) {
  // Structural pre-check (fast, no crypto)
  if (
    !blob ||
    typeof blob !== 'object' ||
    typeof blob.pub !== 'object' ||
    typeof blob.ct !== 'string' ||
    typeof blob.iv !== 'string' ||
    typeof blob.v !== 'number'
  ) {
    return { ok: false, reason: 'crypto' };
  }

  // Stage 1: AES-GCM decrypt — failure here means NOT encrypted with our key
  let plaintext;
  try {
    const ephPub = await crypto.subtle.importKey(
      'jwk', blob.pub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
    );
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: ephPub },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToU8(blob.iv) },
      aesKey,
      b64ToU8(blob.ct),
    );
  } catch {
    // AES-GCM authentication tag failed = garbage ciphertext
    return { ok: false, reason: 'crypto' };
  }

  // Stage 2: JSON parse + schema validation — failure here means real data, wrong shape
  // NEVER delete on schema failure — could be a version mismatch or encoding bug
  try {
    const payload = JSON.parse(new TextDecoder().decode(plaintext));
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.ts !== 'number' ||
      typeof payload.e !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      return { ok: false, reason: 'schema' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'schema' };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function u8ToB64(u8) {
  return btoa(String.fromCharCode(...u8));
}

function b64ToU8(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
