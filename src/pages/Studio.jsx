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
} from '../utils/studioAuth';
import '../styles/Studio.css';

const RTDB_RULES = `{
  "rules": {
    "s": {
      "h": { ".read": true, ".write": "!data.exists()" }
    },
    "ov": {
      ".read": true,
      ".write": "newData.hasChild('_a') && newData.child('_a').val() === root.child('s/h').val()"
    }
  }
}`;

// States: checking → needs-rules | init | login | locked → dashboard
function Studio() {
  const [state, setState] = useState('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockoutMs, setLockoutMs] = useState(0);
  const [overrides, setOverrides] = useState({});
  const [savedHash, setSavedHash] = useState(null);
  const [status, setStatus] = useState('');
  const [db, setDb] = useState(null);
  const [app, setApp] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // loadOverrides is used both from the init effect and from handleLogin/handleSetPassword.
  // The `cancelled` guard only applies in the effect context — callers outside the effect
  // (user-triggered handlers) run while the component is definitely mounted.
  const loadOverrides = useCallback(async (database) => {
    const { ref, get } = await import('firebase/database');
    const snap = await get(ref(database, 'ov/data'));
    if (snap.exists()) setOverrides(snap.val());
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
        setApp(mod.app);

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
      await set(ref(db, 'ov'), { _a: savedHash, data: overrides });
      setStatus('Saved.');
      setTimeout(() => setStatus(''), 2500);
    } catch {
      setStatus('Save failed. Check RTDB write rules.');
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setStatus('Must be a PDF.'); return; }
    setStatus('Uploading...');
    try {
      const { getStorage, ref: sref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage(app);
      const fileRef = sref(storage, 'resume/resume.pdf');
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const year = new Date().getFullYear();
      setOverrides(prev => ({ ...prev, resume_url: url, resume_label: `PDF · Updated ${year}` }));
      setStatus('Uploaded. Click Save to apply.');
    } catch {
      setStatus('Upload failed. Check Firebase Storage config.');
    }
  }

  function handleLogout() {
    clearSession();
    setPassword('');
    setOverrides({});
    setSavedHash(null);
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
          <p className="studio-hint">Upload a PDF — replaces the download URL and auto-sets the label.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleResumeUpload}
            className="studio-file"
          />
          {overrides.resume_url && (
            <p className="studio-hint" style={{ marginTop: '0.5rem' }}>
              Current: <a href={overrides.resume_url} target="_blank" rel="noopener noreferrer" className="studio-link">view ↗</a>
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
