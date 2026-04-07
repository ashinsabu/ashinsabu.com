import { useState, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { decryptPayload } from '../../utils/analyticsEncrypt.js';
import { EV } from '../../utils/analyticsSchema.js';
import { loadDeleteToken } from '../../utils/studioAuth.js';

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

const SECTION_ORDER = ['hero', 'work', 'opensource', 'thinking', 'music', 'contact'];

// Display-layer mapping for referrer strings — covers both current named values and
// legacy `o:hostname` blobs written before the writer knew about these domains.
// Never mutates stored data — purely for rendering.
const REF_DISPLAY = {
  google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo',
  instagram: 'Instagram', twitter: 'Twitter', linkedin: 'LinkedIn',
  github: 'GitHub', medium: 'Medium', direct: 'Direct',
  'o:t.co': 'Twitter', 'o:lnkd.in': 'LinkedIn',
  'o:l.instagram.com': 'Instagram', 'o:medium.com': 'Medium',
  'o:duckduckgo.com': 'DuckDuckGo',
};

function formatRef(ref) {
  if (!ref) return 'Direct';
  if (REF_DISPLAY[ref]) return REF_DISPLAY[ref];
  if (ref.startsWith('o:')) return ref.slice(2); // unknown hostname — strip prefix
  return ref;
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function matchSource(ref, bucket) {
  if (!ref || ref === 'direct') return bucket === 'direct';
  if (ref === 'google' || ref === 'bing' || ref === 'duckduckgo') return bucket === 'search';
  if (['instagram', 'twitter', 'linkedin', 'github', 'medium'].includes(ref)) return bucket === 'social';
  return bucket === 'other';
}

// Returns a subset of payloads whose sessions pass the filter.
// Two-pass: build per-session index (minTs + context), filter sessions, return matching payloads.
function applyFilters(payloads, filter) {
  if (filter.range === 'all' && filter.device === 'all' && filter.source === 'all') return payloads;

  const cutoff = filter.range !== 'all'
    ? Date.now() - { '7d': 7, '30d': 30, '90d': 90 }[filter.range] * 86400000
    : 0;

  const sInfo = {}; // sid → { minTs, dev, ref }
  for (const p of payloads) {
    if (!sInfo[p.sid]) sInfo[p.sid] = { minTs: p.ts };
    else if (p.ts < sInfo[p.sid].minTs) sInfo[p.sid].minTs = p.ts;
    if (p.dev) sInfo[p.sid].dev = p.dev;
    if (p.ref) sInfo[p.sid].ref = p.ref;
  }

  const goodSids = new Set(
    Object.entries(sInfo)
      .filter(([, s]) => {
        if (cutoff && s.minTs < cutoff) return false;
        if (filter.device !== 'all' && s.dev !== filter.device) return false;
        if (filter.source !== 'all' && !matchSource(s.ref, filter.source)) return false;
        return true;
      })
      .map(([sid]) => sid)
  );

  return payloads.filter(p => goodSids.has(p.sid));
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

function aggregate(payloads) {
  const sessions = {}; // sid → { context, events, scroll, dur }

  for (const p of payloads) {
    if (!sessions[p.sid]) sessions[p.sid] = { events: [], ts: p.ts };
    const s = sessions[p.sid];

    if (p.dev) { s.dev = p.dev; s.br = p.br; s.os = p.os; s.ref = p.ref; s.tz = p.tz; s.lang = p.lang; s.entry = p.entry; s.utm = p.utm; }
    if (p.ts < s.ts) s.ts = p.ts;

    s.events.push(p.e);
    if (p.e === EV.EXIT) { s.scroll = p.scroll; s.dur = p.dur; }
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

  const sectionCounts = {};
  const sectionDwellTotal = {};
  const sectionDwellCount = {};
  const resumeCtx = {};
  const linkTypes = {}; // lc: by link type (lt)
  const linkCtx = {};   // lc: by originating section (ctx)

  for (const p of payloads) {
    if (p.e === EV.SECTION_VIEW && p.sec) {
      // Normalize legacy 'creative' blobs into 'music' bucket
      const secKey = p.sec === 'creative' ? 'music' : p.sec;
      increment(sectionCounts, secKey);
    }
    if (p.e === EV.SECTION_DWELL && p.sec && typeof p.dwell === 'number') {
      const secKey = p.sec === 'creative' ? 'music' : p.sec;
      sectionDwellTotal[secKey] = (sectionDwellTotal[secKey] || 0) + p.dwell;
      sectionDwellCount[secKey] = (sectionDwellCount[secKey] || 0) + 1;
    }
    if (p.e === EV.PROJECT_EXPAND && p.pid) increment(projects, p.pid);
    if (p.e === EV.RESUME_VIEW) increment(resumeCtx, p.ctx || 'unknown');
    if (p.e === EV.LINK_CLICK) {
      if (p.lt)  increment(linkTypes, p.lt);
      // Normalize legacy 'creative' ctx into 'music'
      if (p.ctx) increment(linkCtx, p.ctx === 'creative' ? 'music' : p.ctx);
    }
  }

  const sectionAvgDwell = {};
  for (const sec of Object.keys(sectionDwellTotal)) {
    sectionAvgDwell[sec] = Math.round(sectionDwellTotal[sec] / sectionDwellCount[sec] / 1000);
  }

  return {
    total,
    allSessions: sessionList,
    avgScroll: scrollCount ? Math.round(totalScroll / scrollCount) : null,
    avgDur:    durCount    ? Math.round(totalDur / durCount)        : null,
    referrers:     topN(referrers, 7),
    devices:       topN(devices),
    browsers:      topN(browsers),
    timezones:     topN(timezones, 5),
    sectionCounts,
    sectionAvgDwell,
    projects:      topN(projects, 5),
    resumeCtx:     topN(resumeCtx),
    linkTypes:     topN(linkTypes, 8),
    linkCtx:       topN(linkCtx),
    recent:        sessionList.slice(0, 10),
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

// ── Visit density (time-series histogram) ────────────────────────────────────

function buildDensity(sessions, range) {
  if (!sessions.length) return [];
  const now = Date.now();

  let bucketMs, start;
  if (range === '7d') {
    bucketMs = 6 * 3600_000;          // 6-hour buckets → 28 bars
    start = now - 7 * 86400_000;
  } else if (range === '30d') {
    bucketMs = 86400_000;             // daily → 30 bars
    start = now - 30 * 86400_000;
  } else if (range === '90d') {
    bucketMs = 7 * 86400_000;         // weekly → ~13 bars
    start = now - 90 * 86400_000;
  } else {
    const earliest = Math.min(...sessions.map(s => s.ts));
    const spanMs = now - earliest;
    // Pick bucket size so we get a useful number of bars regardless of data age
    bucketMs =
      spanMs > 365 * 86400_000 ? 30 * 86400_000 :  // > 1 year   → monthly
      spanMs > 14  * 86400_000 ?  7 * 86400_000 :  // > 2 weeks  → weekly
      spanMs >  2  * 86400_000 ?     86400_000  :  // > 2 days   → daily
                                  6 * 3600_000;     // ≤ 2 days   → 6-hour
    start = earliest;
  }

  const numBuckets = Math.max(1, Math.ceil((now - start) / bucketMs));
  const counts = new Array(numBuckets).fill(0);

  for (const s of sessions) {
    const idx = Math.floor((s.ts - start) / bucketMs);
    if (idx >= 0 && idx < numBuckets) counts[idx]++;
  }

  // Use hour-level labels when bucket is sub-day
  const useHourLabel = bucketMs < 86400_000;
  return counts.map((count, i) => {
    const t = start + i * bucketMs;
    const d = new Date(t);
    const label = useHourLabel
      ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', hour12: false })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label, count };
  });
}

function DensityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  return (
    <div className="an-density-tooltip">
      <span className="an-density-tooltip-label">{label}</span>
      <span className="an-density-tooltip-val">{count} session{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

function DensityChart({ buckets }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={buckets} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--ink-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--ink-muted)' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<DensityTooltip />} cursor={{ stroke: 'var(--rule)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="url(#densityGrad)"
          dot={false}
          activeDot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Collapsible section wrapper ───────────────────────────────────────────────

function CollapsibleSection({ id, label, collapsed, onToggle, children }) {
  return (
    <div className="an-section">
      <div className="an-section-header" onClick={() => onToggle(id)}>
        <span className="an-section-label">{label}</span>
        <ChevronDown
          size={11}
          className={`an-chevron${collapsed ? ' an-chevron--collapsed' : ''}`}
        />
      </div>
      {!collapsed && children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const INIT_FILTER = { range: 'all', device: 'all', source: 'all' };

export default function AnalyticsPanel({ db, privateKey }) {
  const [loadState, setLoadState] = useState('idle'); // idle | loading | loaded | error
  const [allPayloads, setAllPayloads] = useState([]);
  const [garbage, setGarbage]         = useState([]);
  const [schemaUnknown, setSchemaUnknown] = useState(0);
  const [cleanupState, setCleanupState]   = useState('idle');
  const [filter, setFilter]               = useState(INIT_FILTER);
  const [collapsed, setCollapsed]         = useState(
    () => new Set(['density', 'referrers', 'sections', 'resume', 'projects', 'links', 'device', 'timezones', 'recent'])
  );

  // Recomputed in-memory whenever payloads or filter changes — no re-fetch needed
  const stats = useMemo(
    () => loadState === 'loaded' ? aggregate(applyFilters(allPayloads, filter)) : null,
    [allPayloads, filter, loadState]
  );

  const densityBuckets = useMemo(
    () => stats ? buildDensity(stats.allSessions, filter.range) : [],
    [stats, filter.range]
  );

  function toggleSection(id) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const loadAnalytics = useCallback(async () => {
    setLoadState('loading');
    try {
      const { ref, get } = await import('firebase/database');
      const snap = await get(ref(db, 'an/s'));

      if (!snap.exists()) {
        setAllPayloads([]);
        setLoadState('loaded');
        return;
      }

      const raw = snap.val();
      const entries = Object.entries(raw);

      const results = await Promise.all(
        entries.map(([id, blob]) =>
          decryptPayload(blob, privateKey).then(r => ({ id, blob, ...r }))
        )
      );

      const good       = results.filter(r => r.ok);
      const cryptoFail = results.filter(r => !r.ok && r.reason === 'crypto');
      const schemaFail = results.filter(r => !r.ok && r.reason === 'schema');

      setAllPayloads(good.map(r => r.payload));
      setSchemaUnknown(schemaFail.length);

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
    const deleteToken = loadDeleteToken();
    if (!deleteToken) return;
    setCleanupState('deleting');
    try {
      const { ref, set, update: rtdbUpdate, remove } = await import('firebase/database');
      await set(ref(db, 'an/_a'), deleteToken);
      const deletePayload = {};
      for (const id of garbage) deletePayload[`an/s/${id}`] = null;
      await rtdbUpdate(ref(db, '/'), deletePayload);
      await remove(ref(db, 'an/_a'));
      setGarbage([]);
      setCleanupState('done');
      setTimeout(() => setCleanupState('idle'), 3000);
    } catch {
      setCleanupState('idle');
    }
  }

  function setRange(r) { setFilter(f => ({ ...f, range: r })); }

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

      {/* Filters */}
      <div className="an-filters">
        <div className="an-filter-group">
          {['7d', '30d', '90d', 'all'].map(r => (
            <button
              key={r}
              className={`an-filter-pill${filter.range === r ? ' an-filter-pill--active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
        <select
          className="an-filter-select"
          value={filter.device}
          onChange={e => setFilter(f => ({ ...f, device: e.target.value }))}
        >
          <option value="all">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <select
          className="an-filter-select"
          value={filter.source}
          onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
        >
          <option value="all">All sources</option>
          <option value="direct">Direct</option>
          <option value="search">Search</option>
          <option value="social">Social</option>
          <option value="other">Other</option>
        </select>
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

      {/* Traffic over time */}
      <CollapsibleSection id="density" label="Traffic over time" collapsed={collapsed.has('density')} onToggle={toggleSection}>
        {densityBuckets.length > 0
          ? <DensityChart buckets={densityBuckets} />
          : <p className="studio-hint">No sessions in this range.</p>
        }
      </CollapsibleSection>

      {/* Referrer */}
      {s.referrers.length > 0 && (
        <CollapsibleSection id="referrers" label="Where they came from" collapsed={collapsed.has('referrers')} onToggle={toggleSection}>
          <BarChart rows={s.referrers.map(([ref, count]) => [formatRef(ref), count])} />
        </CollapsibleSection>
      )}

      {/* Section funnel */}
      {sectionRows.length > 0 && (
        <CollapsibleSection id="sections" label="Section reach" collapsed={collapsed.has('sections')} onToggle={toggleSection}>
          <div className="an-chart">
            {sectionRows.map(([sec, count]) => {
              const max = Math.max(...sectionRows.map(r => r[1]), 1);
              const avgDwell = s.sectionAvgDwell[sec];
              return (
                <div key={sec} className="an-bar-row an-bar-row--dwell">
                  <span className="an-bar-label">{sec}</span>
                  <div className="an-bar-track">
                    <div className="an-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                  </div>
                  <span className="an-bar-count">{count}</span>
                  <span className="an-bar-dwell">{avgDwell != null ? `${avgDwell}s` : '—'}</span>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Resume click sources */}
      {s.resumeCtx.length > 0 && (
        <CollapsibleSection id="resume" label="Resume — where they clicked" collapsed={collapsed.has('resume')} onToggle={toggleSection}>
          <BarChart rows={s.resumeCtx} />
        </CollapsibleSection>
      )}

      {/* Projects */}
      {s.projects.length > 0 && (
        <CollapsibleSection id="projects" label="Project opens" collapsed={collapsed.has('projects')} onToggle={toggleSection}>
          <BarChart rows={s.projects} />
        </CollapsibleSection>
      )}

      {/* Link clicks */}
      {s.linkTypes.length > 0 && (
        <CollapsibleSection id="links" label="Link clicks" collapsed={collapsed.has('links')} onToggle={toggleSection}>
          <BarChart rows={s.linkTypes} />
          {s.linkCtx.length > 0 && (
            <div className="an-link-ctx">
              {s.linkCtx.map(([ctx, count]) => (
                <span key={ctx} className="an-pill">{ctx} <strong>{count}</strong></span>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Device + browser */}
      <CollapsibleSection id="device" label="Device & browser" collapsed={collapsed.has('device')} onToggle={toggleSection}>
        <div className="an-pills-row">
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
      </CollapsibleSection>

      {/* Timezones */}
      {s.timezones.length > 0 && (
        <CollapsibleSection id="timezones" label="Where in the world" collapsed={collapsed.has('timezones')} onToggle={toggleSection}>
          <BarChart rows={s.timezones} />
        </CollapsibleSection>
      )}

      {/* Recent sessions */}
      {s.recent.length > 0 && (
        <CollapsibleSection id="recent" label="Recent sessions" collapsed={collapsed.has('recent')} onToggle={toggleSection}>
          <div className="an-session-feed">
            {s.recent.map((sess, i) => (
              <div key={i} className="an-session-row">
                <span className="an-session-ts">{fmtTs(sess.ts)}</span>
                <span className="an-session-ref">{formatRef(sess.ref)}</span>
                <span className="an-session-dev">{sess.dev || '?'}</span>
                <span className="an-session-dur">{fmtDur(sess.dur)}</span>
                <span className="an-session-scroll">{sess.scroll != null ? `${sess.scroll}%` : '—'}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Cleanup notice */}
      {garbage.length > 0 && (
        <div className="an-cleanup">
          <span className="studio-hint">
            {garbage.length} blob{garbage.length !== 1 ? 's' : ''} failed decryption (fake writes).
          </span>
          {loadDeleteToken() ? (
            <button
              className="studio-logout-btn"
              onClick={deleteGarbage}
              disabled={cleanupState === 'deleting'}
            >
              {cleanupState === 'deleting' ? 'Deleting...' : cleanupState === 'done' ? 'Deleted.' : 'Delete garbage'}
            </button>
          ) : (
            <span className="studio-hint">Re-login to enable cleanup.</span>
          )}
        </div>
      )}

      {schemaUnknown > 0 && (
        <p className="studio-hint" style={{ marginTop: '0.25rem' }}>
          {schemaUnknown} blob{schemaUnknown !== 1 ? 's' : ''} decrypted but had unexpected schema (kept, not deleted).
        </p>
      )}
    </section>
  );
}
