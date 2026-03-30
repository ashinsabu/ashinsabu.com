import { useState, useEffect } from 'react';

// Fetches content overrides from Firebase RTDB (/ov/data).
// Returns {} if RTDB is not configured or the path is empty.
// Used by Home.jsx to apply studio edits over content.js defaults.
export function useOverrides() {
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const mod = await import('../firebase');
        const { getDatabase, ref, get } = await import('firebase/database');
        const db = getDatabase(mod.app);
        const snap = await get(ref(db, 'ov/data'));
        if (!cancelled && snap.exists()) {
          setOverrides(snap.val());
        }
      } catch {
        // Firebase not configured or RTDB unavailable — use content.js defaults
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return overrides;
}
