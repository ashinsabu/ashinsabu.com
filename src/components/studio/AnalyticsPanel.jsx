import { useState, useCallback } from 'react';
import { decryptPayload } from '../../utils/analyticsEncrypt.js';

// ── Aggregation helpers ───────────────────────────────────────────────────────

function increment(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function topN(obj, n = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function fmtDur(secs) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function fmtTs(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// SECTION_ORDER defines the funnel display order
const SECTION_ORDER = ['hero', 'work', 'opensource', 'thinking', 'creative', 'contact'];

function aggregate(payloads) {
  const sessions = {}; // sid → { context, events, scroll, dur }

  for (const p of payloads) {
    if (!sessions[p.sid]) sessions[p.sid] = { events: [], ts: p.ts };
    const s = sessions[p.sid];

    // Session context fields only appear on the first event
    if (p.dev) { s.dev = p.dev; s.br = p.br; s.os = p.os; s.ref = p.ref; s.tz = p.tz; s.lang = p.lang; s.entry = p.entry; s.utm = p.utm; }
    if (p.ts < s.ts) s.ts = p.ts; // earliest timestamp = session start

    s.events.push(p.e);
    if (p.e === 'ex') { s.scroll = p.scroll; s.dur = p.dur; }
  }

  const sessionList = Object.values(sessions).sort((a, b) => b.ts - a.ts);
  const total = sessionList.length;

  const referrers = {}, devices = {}, browsers = {}, timezones = {}, projects = {};
  let totalScroll = 0, scrollCount = 0, totalDur = 0, durCount = 0;

  for (const s of sessionList) {
    if (s.ref) increment(referrers, s.ref);
    if (s.dev) increment(devices, s.dev);
    if (s.br)  increment(browsers, s.br);
    if (s.tz)  increment(timezones, s.tz);
    if (s.scroll != null) { totalScroll += s.scroll; scrollCount++; }
    if (s.dur   != null) { totalDur += s.dur; durCount++; }
  }

  // Section views and project opens are per-event (not per-session)
  const sectionCounts = {};
  for (const p of payloads) {
    if (p.e === 'sv' && p.sec) increment(sectionCounts, p.sec);
    if (p.e === 'pe' && p.pid) increment(projects, p.pid);
  }

  const avgScroll = scrollCount ? Math.round(totalScroll / scrollCount) : null;
  const avgDur    = durCount    ? Math.round(totalDur / durCount)        : null;

  return {
    total, avgScroll, avgDur,
    referrers: topN(referrers, 7),
    devices:   topN(devices),
    browsers:  topN(browsers),
    timezones: topN(timezones, 5),
    sectionCounts,
    projects:  topN(projects, 5),
    recent:    sessionList.slice(0, 10),
  };
}

// ── Bar chart primitive ───────────────────────────────────────────────────────

function BarChart({ rows, maxVal }) {
  const max = maxVal ?? Math.max(...rows.map(r => r[1]), 1);
  return (
    <div className="an-chart">
      {rows.map(([label, count]) => (
        <div key={label} className="an-bar-row">
          <span className="an-bar-label">{label}</span>
          <div className="an-bar-track">
            <div className="an-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
          </div>
          <span className="an-bar-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsPanel({ db, privateKey }) {
  const [loadState, setLoadState] = useState('idle'); // idle | loading | loaded | error
  const [stats, setStats]         = useState(null);
  const [garbage, setGarbage]     = useState([]); // [{ id, ts }]
  const [schemaUnknown, setSchemaUnknown] = useState(0);
  const [cleanupState, setCleanupState]   = useState('idle'); // idle | deleting | done

  const loadAnalytics = useCallback(async () => {
    setLoadState('loading');
    try {
      const { ref, get } = await import('firebase/database');
      const snap = await get(ref(db, 'an/s'));

      if (!snap.exists()) {
        setStats(aggregate([]));
        setLoadState('loaded');
        return;
      }

      const raw = snap.val(); // { uuid: blob, ... }
      const entries = Object.entries(raw);
      const now = Date.now();
      const GRACE_MS = 2 * 60 * 1000; // 2-minute grace period for in-flight writes

      // Decrypt all in parallel — errors are caught inside decryptPayload, never throw here
      const results = await Promise.all(
        entries.map(([id, blob]) =>
          decryptPayload(blob, privateKey).then(r => ({ id, blob, ...r }))
        )
      );

      const good    = results.filter(r => r.ok);
      const cryptoFail = results.filter(
        r => !r.ok && r.reason === 'crypto' && (!raw[r.id]?.ts || now - (raw[r.id]?.ts ?? 0) > GRACE_MS)
      );
      const schemaFail = results.filter(r => !r.ok && r.reason === 'schema');

      setStats(aggregate(good.map(r => r.payload)));
      setSchemaUnknown(schemaFail.length);

      // Only surface garbage for deletion if at least one blob decrypted successfully.
      // If zero succeeded, the private key may be wrong — warn rather than delete.
      if (good.length > 0 && cryptoFail.length > 0) {
        setGarbage(cryptoFail.map(r => r.id));
      }

      setLoadState('loaded');
    } catch (err) {
      setLoadState('error');
      console.error('[analytics] load failed', err);
    }
  }, [db, privateKey]);

  async function deleteGarbage() {
    if (garbage.length === 0) return;
    setCleanupState('deleting');
    try {
      const { ref, set, remove } = await import('firebase/database');

      // Write auth token so RTDB rules allow deletes
      const sessionRaw = sessionStorage.getItem('studio_session');
      const hash = sessionRaw ? JSON.parse(sessionRaw).hash : null;
      if (hash) await set(ref(db, 'an/_a'), hash);

      // Delete in parallel — individual failures are non-fatal
      await Promise.allSettled(
        garbage.map(id => remove(ref(db, `an/s/${id}`)))
      );

      // Clear auth token
      if (hash) await remove(ref(db, 'an/_a'));

      setGarbage([]);
      setCleanupState('done');
      setTimeout(() => setCleanupState('idle'), 3000);
    } catch {
      setCleanupState('idle');
    }
  }

  // ── Render: idle ──────────────────────────────────────────────────────────
  if (loadState === 'idle') {
    return (
      <section className="studio-section">
        <label className="studio-section-title">Analytics</label>
        <button className="studio-btn" onClick={loadAnalytics}>Load Analytics</button>
      </section>
    );
  }

  if (loadState === 'loading') {
    return (
      <section className="studio-section">
        <label className="studio-section-title">Analytics</label>
        <p className="studio-hint">Decrypting session data...</p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="studio-section">
        <label className="studio-section-title">Analytics</label>
        <p className="studio-error">Failed to load. Check console.</p>
        <button className="studio-btn" style={{ marginTop: '0.5rem' }} onClick={loadAnalytics}>Retry</button>
      </section>
    );
  }

  // ── Render: loaded ────────────────────────────────────────────────────────
  const s = stats;
  const sectionRows = SECTION_ORDER
    .filter(k => s.sectionCounts[k])
    .map(k => [k, s.sectionCounts[k]]);

  return (
    <section className="studio-section an-panel">
      <div className="studio-section-title an-title-row">
        <span>Analytics</span>
        <button className="studio-logout-btn" onClick={loadAnalytics}>Refresh</button>
      </div>

      {/* Summary strip */}
      <div className="an-stat-strip">
        <div className="an-stat">
          <span className="an-stat-val">{s.total}</span>
          <span className="an-stat-label">sessions</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-val">{s.avgDur != null ? fmtDur(s.avgDur) : '—'}</span>
          <span className="an-stat-label">avg time</span>
        </div>
        <div className="an-stat">
          <span className="an-stat-val">{s.avgScroll != null ? `${s.avgScroll}%` : '—'}</span>
          <span className="an-stat-label">avg scroll</span>
        </div>
      </div>

      {/* Referrer */}
      {s.referrers.length > 0 && (
        <div className="an-section">
          <p className="an-section-label">Where they came from</p>
          <BarChart rows={s.referrers} />
        </div>
      )}

      {/* Section funnel */}
      {sectionRows.length > 0 && (
        <div className="an-section">
          <p className="an-section-label">Section reach</p>
          <BarChart rows={sectionRows} />
        </div>
      )}

      {/* Projects */}
      {s.projects.length > 0 && (
        <div className="an-section">
          <p className="an-section-label">Project opens</p>
          <BarChart rows={s.projects} />
        </div>
      )}

      {/* Device + browser */}
      <div className="an-section an-pills-row">
        <div>
          <p className="an-section-label">Device</p>
          <div className="an-pills">
            {s.devices.map(([k, v]) => (
              <span key={k} className="an-pill">{k} <strong>{v}</strong></span>
            ))}
          </div>
        </div>
        <div>
          <p className="an-section-label">Browser</p>
          <div className="an-pills">
            {s.browsers.map(([k, v]) => (
              <span key={k} className="an-pill">{k} <strong>{v}</strong></span>
            ))}
          </div>
        </div>
      </div>

      {/* Timezones */}
      {s.timezones.length > 0 && (
        <div className="an-section">
          <p className="an-section-label">Where in the world</p>
          <BarChart rows={s.timezones} />
        </div>
      )}

      {/* Recent sessions */}
      {s.recent.length > 0 && (
        <div className="an-section">
          <p className="an-section-label">Recent sessions</p>
          <div className="an-session-feed">
            {s.recent.map((sess, i) => (
              <div key={i} className="an-session-row">
                <span className="an-session-ts">{fmtTs(sess.ts)}</span>
                <span className="an-session-ref">{sess.ref || 'direct'}</span>
                <span className="an-session-dev">{sess.dev || '?'}</span>
                <span className="an-session-dur">{fmtDur(sess.dur)}</span>
                <span className="an-session-scroll">{sess.scroll != null ? `${sess.scroll}%` : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cleanup notice — only shown when garbage exists and key seems valid */}
      {garbage.length > 0 && (
        <div className="an-cleanup">
          <span className="studio-hint">
            {garbage.length} blob{garbage.length !== 1 ? 's' : ''} failed decryption (fake writes).
          </span>
          <button
            className="studio-logout-btn"
            onClick={deleteGarbage}
            disabled={cleanupState === 'deleting'}
          >
            {cleanupState === 'deleting' ? 'Deleting...' : cleanupState === 'done' ? 'Deleted.' : 'Delete garbage'}
          </button>
        </div>
      )}

      {/* Schema mismatch warning — never offer to delete these */}
      {schemaUnknown > 0 && (
        <p className="studio-hint" style={{ marginTop: '0.25rem' }}>
          {schemaUnknown} blob{schemaUnknown !== 1 ? 's' : ''} decrypted but had unexpected schema (kept, not deleted).
        </p>
      )}
    </section>
  );
}
