import { useState, useEffect } from 'react';

// Fetches content overrides from Firebase RTDB (/ov/data).
// Returns {} if RTDB is not configured or the path is empty.
// Used by Home.jsx to apply studio edits over content.js defaults.
export function useOverrides() {
  const [overrides, setOverrides] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;

    // After 5s, give up and show defaults — any late RTDB response is ignored
    const timeout = setTimeout(() => {
      if (!cancelled) { timedOut = true; setReady(true); }
    }, 5000);

    async function load() {
      try {
        const mod = await import('../firebase');
        const { getDatabase, ref, get } = await import('firebase/database');
        const db = getDatabase(mod.app);
        const snap = await get(ref(db, 'ov/data'));
        // Discard result if timeout already fired — prevents late flash
        if (!cancelled && !timedOut && snap.exists()) {
          setOverrides(snap.val());
        }
      } catch {
        // Firebase not configured or RTDB unavailable — fall through to finally
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return { overrides, ready };
}
