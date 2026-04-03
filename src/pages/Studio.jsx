import { useState, useEffect, useCallback } from 'react';
import {
  hashPassword,
  isLockedOut,
  getLockoutRemaining,
  recordFailedAttempt,
  clearAttempts,
  saveSession,
  loadSession,
  clearSession,
  deriveDeleteToken,
  saveDeleteToken,
  clearDeleteToken,
} from '../utils/studioAuth';
import {
  deriveWrappingKey,
  exportWrappingKeyJwk,
  importWrappingKeyJwk,
  generateAnalyticsKeyPair,
  exportPublicKeyJwk,
  wrapPrivateKey,
  unwrapPrivateKey,
} from '../utils/analyticsEncrypt';
import AnalyticsPanel from '../components/studio/AnalyticsPanel';
import '../styles/Studio.css';


const RTDB_RULES = `{
  "rules": {
    "s": {
      "h":      { ".read": true,  ".write": "!data.exists()" },
      "d":      { ".read": false, ".write": "!data.exists()" },
      "pubkey": { ".read": true,  ".write": "!data.exists()" },
      "pk":     { ".read": true,  ".write": "!data.exists()" }
    },
    "ov": {
      ".read": true,
      ".write": "newData.hasChild('_a') && newData.child('_a').val() === root.child('s/h').val()"
    },
    "an": {
      ".read": true,
      "_a": { ".write": true },
      "s": {
        "$uid": {
          ".write": "!data.exists() || root.child('an/_a').val() === root.child('s/d').val()",
          ".validate": "newData.hasChildren(['pub','ct','iv','v']) && newData.child('ct').isString() && newData.child('ct').val().length < 4096 && newData.child('v').isNumber()"
        }
      }
    }
  }
}`;

// Restores the analytics private key using the wrapping key cached in sessionStorage.
// Called on session-resume (tab reload while session is still valid) so the user
// doesn't need to re-enter their password.
async function loadPrivateKeyFromSession(database) {
  try {
    const stored = sessionStorage.getItem('studio_wrap_key');
    if (!stored) return null;
    const wrappingKey = await importWrappingKeyJwk(JSON.parse(stored));
    const { ref, get } = await import('firebase/database');
    const snap = await get(ref(database, 's/pk'));
    if (!snap.exists()) return null;
    return await unwrapPrivateKey(snap.val(), wrappingKey);
  } catch {
    return null;
  }
}

// States: checking → needs-rules | init | login | locked → dashboard
function Studio() {
  const [state, setState] = useState('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockoutMs, setLockoutMs] = useState(0);
  const [overrides, setOverrides] = useState({});
  const [resumeB64, setResumeB64] = useState(null);
  const [savedHash, setSavedHash] = useState(null);
  const [status, setStatus] = useState('');
  const [db, setDb] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  // privateKey lives in memory only — never persisted directly
  const [privateKey, setPrivateKey] = useState(null);

  // loadOverrides is used both from the init effect and from handleLogin/handleSetPassword.
  // The `cancelled` guard only applies in the effect context — callers outside the effect
  // (user-triggered handlers) run while the component is definitely mounted.
  const loadOverrides = useCallback(async (database) => {
    const { ref, get } = await import('firebase/database');
    const [dataSnap, b64Snap] = await Promise.all([
      get(ref(database, 'ov/data')),
      get(ref(database, 'ov/resume_b64')),
    ]);
    if (dataSnap.exists()) setOverrides(dataSnap.val());
    if (b64Snap.exists()) setResumeB64(b64Snap.val());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('checking');

    async function init() {
      try {
        const mod = await import('../firebase');
        if (cancelled) return;
        const { getDatabase } = await import('firebase/database');
        const database = getDatabase(mod.app);
        if (cancelled) return;

        // Store db/app refs — safe to call even if cancelled right after,
        // since setDb/setApp don't trigger re-renders that matter post-unmount.
        setDb(database);

        if (isLockedOut()) {
          if (!cancelled) { setLockoutMs(getLockoutRemaining()); setState('locked'); }
          return;
        }

        const sessionHash = loadSession();
        if (sessionHash) {
          const { ref, get } = await import('firebase/database');
          if (cancelled) return;
          const snap = await get(ref(database, 's/h'));
          if (cancelled) return;
          if (snap.exists() && snap.val() === sessionHash) {
            setSavedHash(sessionHash);
            await loadOverrides(database);
            // Restore private key from sessionStorage-cached wrapping key
            const pk = await loadPrivateKeyFromSession(database);
            if (!cancelled && pk) setPrivateKey(pk);
            if (!cancelled) setState('dashboard');
            return;
          }
          clearSession();
        }

        const { ref, get } = await import('firebase/database');
        if (cancelled) return;
        const snap = await get(ref(database, 's/h'));
        if (cancelled) return;

        if (snap.exists()) {
          setSavedHash(snap.val());
          setState('login');
        } else {
          setState('init');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = String(err?.message || err).toLowerCase();
        if (msg.includes('permission') || msg.includes('denied') || msg.includes('unauthorized')) {
          setState('needs-rules');
        } else {
          setError(`Init failed: ${err?.message || err}`);
          setState('login');
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [loadOverrides, retryCount]);

  // Lockout countdown
  useEffect(() => {
    if (state !== 'locked') return;
    const interval = setInterval(() => {
      const remaining = getLockoutRemaining();
      setLockoutMs(remaining);
      if (remaining <= 0) setState('login');
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  async function handleSetPassword(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Minimum 8 characters.'); return; }
    setError('');
    const hash = await hashPassword(password);
    try {
      const { ref, set } = await import('firebase/database');
      await set(ref(db, 's/h'), hash);
      setSavedHash(hash);
      saveSession(hash);

      // Generate ECDH keypair + delete token — all write-once at s/
      // s/pubkey — public key (readable, safe to expose)
      // s/pk     — wrapped private key (readable, AES-wrapped with password-derived key)
      // s/d      — delete token (NOT readable, separate PBKDF2 derivation from auth hash)
      try {
        const [keyPair, deleteToken] = await Promise.all([
          generateAnalyticsKeyPair(),
          deriveDeleteToken(password),
        ]);
        const pubJwk = await exportPublicKeyJwk(keyPair.publicKey);
        const wrappingKey = await deriveWrappingKey(password, true);
        const wrapped = await wrapPrivateKey(keyPair.privateKey, wrappingKey);
        await Promise.all([
          set(ref(db, 's/pubkey'), pubJwk),
          set(ref(db, 's/pk'), wrapped),
          set(ref(db, 's/d'), deleteToken),
        ]);
        const wrappingKeyJwk = await exportWrappingKeyJwk(wrappingKey);
        sessionStorage.setItem('studio_wrap_key', JSON.stringify(wrappingKeyJwk));
        saveDeleteToken(deleteToken);
        setPrivateKey(keyPair.privateKey);
      } catch {
        // Key generation failure is non-fatal — analytics just won't work yet
      }

      setState('dashboard');
    } catch (err) {
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes('permission') || msg.includes('denied')) {
        setState('needs-rules');
      } else {
        setError('Failed to save. Check Firebase config.');
      }
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (isLockedOut()) { setLockoutMs(getLockoutRemaining()); setState('locked'); return; }
    setError('');
    const hash = await hashPassword(password);
    if (hash === savedHash) {
      clearAttempts();
      saveSession(hash);
      await loadOverrides(db);

      // Derive wrapping key + delete token, cache both in sessionStorage, unwrap private key.
      // Also writes s/d if missing — migration for anyone who ran the old code before
      // s/d existed (s/d was previously not derived or stored).
      try {
        const [wrappingKey, deleteToken] = await Promise.all([
          deriveWrappingKey(password, true),
          deriveDeleteToken(password),
        ]);
        const { ref, get, set } = await import('firebase/database');
        const [pkSnap, dtSnap] = await Promise.all([
          get(ref(db, 's/pk')),
          get(ref(db, 's/d')),
        ]);
        if (pkSnap.exists()) {
          const pk = await unwrapPrivateKey(pkSnap.val(), wrappingKey);
          setPrivateKey(pk);
          const wrappingKeyJwk = await exportWrappingKeyJwk(wrappingKey);
          sessionStorage.setItem('studio_wrap_key', JSON.stringify(wrappingKeyJwk));
        }
        // Migration: store s/d if it wasn't set during first-run
        if (!dtSnap.exists()) await set(ref(db, 's/d'), deleteToken);
        saveDeleteToken(deleteToken);
      } catch {
        // Wrong wrapping key or no key stored yet — analytics panel will show no data
      }

      setState('dashboard');
    } else {
      const attempts = recordFailedAttempt();
      if (isLockedOut()) { setLockoutMs(getLockoutRemaining()); setState('locked'); }
      else {
        const remaining = 5 - attempts;
        setError(`Wrong password. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`);
      }
    }
  }

  async function handleSave() {
    setStatus('Saving...');
    try {
      const { ref, set } = await import('firebase/database');
      const payload = { _a: savedHash, data: overrides };
      if (resumeB64) payload.resume_b64 = resumeB64;
      await set(ref(db, 'ov'), payload);
      setStatus('Saved.');
      setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setStatus(`Save failed: ${err?.message || err}`);
    }
  }

  function handleResumeFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setStatus('Must be a PDF.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setResumeB64(reader.result);
      const year = new Date().getFullYear();
      setOverrides(prev => ({ ...prev, resume_label: `PDF · Updated ${year}` }));
      setStatus('PDF ready. Click Save to apply.');
    };
    reader.readAsDataURL(file);
  }


  function handleLogout() {
    clearSession();
    clearDeleteToken();
    sessionStorage.removeItem('studio_wrap_key');
    setPassword('');
    setOverrides({});
    setSavedHash(null);
    setPrivateKey(null);
    setState('login');
  }

  // ── Render ──────────────────────────────────────────────────────

  if (state === 'checking') {
    return <div className="studio"><p className="studio-init">Initializing...</p></div>;
  }


  if (state === 'needs-rules') {
    return (
      <div className="studio">
        <div className="studio-box">
          <p className="studio-label">studio — action required</p>
          <p className="studio-hint">
            Firebase RTDB rules are blocking access. Go to{' '}
            <strong style={{ color: 'var(--ink)' }}>Firebase Console → Realtime Database → Rules</strong>,
            paste the following, and click Publish:
          </p>
          <pre className="studio-rules-block">{RTDB_RULES}</pre>
          <button className="studio-btn" onClick={() => setRetryCount(c => c + 1)}>
            Re-check
          </button>
        </div>
      </div>
    );
  }

  if (state === 'locked') {
    const mins = Math.ceil(lockoutMs / 60000);
    return (
      <div className="studio">
        <div className="studio-box">
          <p className="studio-label">studio</p>
          <p className="studio-error">
            Too many failed attempts. Try again in {mins} minute{mins !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'init') {
    return (
      <div className="studio">
        <div className="studio-box">
          <p className="studio-label">studio — first run</p>
          <p className="studio-hint">
            Set a password. It is hashed with PBKDF2 (SHA-256, 100k iterations) before storage.
            The plain text password never leaves your browser.
          </p>
          <form onSubmit={handleSetPassword} className="studio-form">
            <input
              type="password"
              className="studio-input"
              placeholder="Choose a password (min 8 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="studio-error">{error}</p>}
            <button type="submit" className="studio-btn">Set Password</button>
          </form>
        </div>
      </div>
    );
  }

  if (state === 'login') {
    return (
      <div className="studio">
        <div className="studio-box">
          <p className="studio-label">studio</p>
          <form onSubmit={handleLogin} className="studio-form">
            <input
              type="password"
              className="studio-input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="studio-error">{error}</p>}
            <button type="submit" className="studio-btn">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  // dashboard
  return (
    <div className="studio">
      <div className="studio-dashboard">
        <div className="studio-top">
          <p className="studio-label">studio</p>
          <button className="studio-logout-btn" onClick={handleLogout}>Sign out</button>
        </div>

        {privateKey && <AnalyticsPanel db={db} privateKey={privateKey} />}

        <section className="studio-section">
          <label className="studio-section-title">About — paragraph 1</label>
          <p className="studio-hint">The technical intro paragraph in the Who section.</p>
          <textarea
            className="studio-textarea"
            rows={5}
            value={overrides.about_p1 || ''}
            onChange={e => setOverrides(prev => ({ ...prev, about_p1: e.target.value }))}
            placeholder="I'm a software engineer at Harness.io..."
          />
        </section>

        <section className="studio-section">
          <label className="studio-section-title">About — paragraph 2</label>
          <p className="studio-hint">The personal paragraph in the Who section.</p>
          <textarea
            className="studio-textarea"
            rows={4}
            value={overrides.about_p2 || ''}
            onChange={e => setOverrides(prev => ({ ...prev, about_p2: e.target.value }))}
            placeholder="Outside of engineering, I make music and visual art..."
          />
        </section>

        <section className="studio-section">
          <label className="studio-section-title">Role label</label>
          <p className="studio-hint">Above your name in the hero. Update when title or company changes.</p>
          <input
            type="text"
            className="studio-input"
            value={overrides.hero_role || ''}
            onChange={e => setOverrides(prev => ({ ...prev, hero_role: e.target.value }))}
            placeholder="Software Engineer · Harness.io"
          />
        </section>

        <section className="studio-section">
          <label className="studio-section-title">Hero bio</label>
          <p className="studio-hint">Two-liner under your name. Use \n for a line break.</p>
          <textarea
            className="studio-textarea"
            rows={3}
            value={overrides.hero_bio || ''}
            onChange={e => setOverrides(prev => ({ ...prev, hero_bio: e.target.value }))}
            placeholder={'Distributed systems\nat production scale.'}
          />
        </section>

        <section className="studio-section">
          <label className="studio-section-title">Creative bio</label>
          <textarea
            className="studio-textarea"
            rows={4}
            value={overrides.creative_bio || ''}
            onChange={e => setOverrides(prev => ({ ...prev, creative_bio: e.target.value }))}
            placeholder="Outside of distributed systems, I make music and visual art..."
          />
        </section>

        <section className="studio-section">
          <label className="studio-section-title">Resume</label>
          <p className="studio-hint">Upload a PDF. Stored in RTDB, decoded in-browser on download. Falls back to /resume.pdf in the repo.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleResumeFile}
            className="studio-file"
          />
          {resumeB64 && (
            <p className="studio-hint" style={{ marginTop: '0.5rem' }}>
              {status.startsWith('PDF ready') ? 'Loaded — not saved yet.' : 'Resume stored.'}
            </p>
          )}
        </section>

        <section className="studio-section">
          <label className="studio-section-title">Resume label</label>
          <p className="studio-hint">Small text under the download button (auto-set on upload).</p>
          <input
            type="text"
            className="studio-input"
            value={overrides.resume_label || ''}
            onChange={e => setOverrides(prev => ({ ...prev, resume_label: e.target.value }))}
            placeholder="PDF · Updated 2025"
          />
        </section>

        <div className="studio-actions">
          {status && <span className="studio-status">{status}</span>}
          <button className="studio-btn" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default Studio;
